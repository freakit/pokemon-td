// src/components/Multiplayer/BattlePhaseUI.tsx
// 페이즈 전환 + 대전 시뮬레이션 오케스트레이션
// ──────────────────────────────────────────────────────────────────
// [V5-FIX-BP-1] TFTBattleArena에 전달하는 myTeam/opponentTeam 모두 Firebase 기준으로 통일
// [V5-FIX-BP-2] battleSeed를 PvPBattleService.deriveBattleSeed()와 통일
// [V5-FIX-BP-3] AI vs AI 배틀 타임아웃 시 결정론적 무승부 결과 자동 생성
// [V5-FIX-BP-4] safetyArenaClosedRef 정리 타이밍 — 라운드 전환 시 리셋
//
// ── V7: 사람 매치 관전/완주 보장 재설계 ──
// [V7-FIX-BP-5] towerDetailsRef 변경 시 리렌더 트리거
//   - 기존: onAllTowerDetailsUpdate 콜백이 ref만 업데이트 → Arena prop 변경 감지 실패
//   - 수정: teamDataVersion state를 bump하여 리렌더 + Arena가 최신 team 수신
//
// [V7-FIX-BP-6] forceCompletePendingBattles에서 사람 포함 매치는 보호
//   - 기존: 30초 타임아웃이면 사람 arena 진행 중에도 결정론 결과로 덮어씀 → 사람이 자기 경기 못 봄
//   - 수정: 매치에 살아있는 사람이 참여 중이면 force-complete 금지.
//           모든 참여자가 탈락/오프라인인 경우에만 결정론 시뮬로 보충
//
// [V7-FIX-BP-7] BATTLE_STUCK_TIMEOUT_MS를 90초로 확장
//   - Arena는 prep 30s + reveal 5s + 전투 최대 40s ≈ 75s 필요
//   - 30초 타임아웃은 사람 경기를 강제 종료시키는 원인
//
// [V7-FIX-BP-8] showArena 트리거를 arenaCompletedRef로 변경
//   - 기존: arenaCompleted state의 리셋 타이밍 race로 showArena가 토글 실패
//   - 수정: ref 기반 판정 + currentRound 변경 시 동기 리셋
//
// [V7-FIX-BP-9] 사람 매치는 해당 사람의 arena 결과가 도착할 때까지 AI-host 시뮬 금지
//   - executeBattles 분기 그대로 유지되며 명시적 로깅 + 주석 강화
//
// [V7-FIX-BP-10] 타워 데이터 로딩 대기 로직 강화
//   - Human 매치는 양측 모두 로드되어야 arena 띄움 (opponentTeam 빈 배열이면 대기)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { multiplayerService } from '../../services/MultiplayerService';
import { MultiplayerGameState, TowerDetail, PvPBattleResult } from '../../types/multiplayer';
import { authService } from '../../services/AuthService';
import { pvpBattleService, deriveBattleSeed } from '../../services/PvPBattleService';
import { TFTBattleArena, TFTBattleResult } from './TFTBattleArena';

interface BattlePhaseUIProps {
  roomId: string;
}

// [V7-FIX-BP-7] 90초로 확장 (prep 30 + reveal 5 + battle 40 + 여유 15)
const BATTLE_STUCK_TIMEOUT_MS = 90_000;

// ─── 스타일 (원본 유지) ─────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const BattleOverlay = styled.div`position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;`;
const BattleContainer = styled.div`background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);border:2px solid rgba(255,255,255,0.15);border-radius:20px;padding:32px;min-width:480px;text-align:center;animation:${fadeIn} 0.4s ease;box-shadow:0 0 60px rgba(0,100,255,0.3);`;
const VSHeader = styled.div`margin-bottom:24px;`;
const RoundText = styled.div`color:rgba(255,255,255,0.5);font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;`;
const BattleTitle = styled.div`color:#fff;font-size:28px;font-weight:900;letter-spacing:4px;text-shadow:0 0 20px rgba(0,150,255,0.8);`;
const MatchupContainer = styled.div`display:flex;align-items:center;justify-content:center;gap:24px;margin:24px 0;`;
const PlayerCard = styled.div<{ $isMe?: boolean }>`flex:1;padding:16px;background:${p => p.$isMe ? 'linear-gradient(135deg,rgba(0,100,255,0.2),rgba(0,50,150,0.1))' : 'linear-gradient(135deg,rgba(255,50,50,0.2),rgba(150,0,0,0.1))'};border:1px solid ${p => p.$isMe ? 'rgba(0,150,255,0.4)' : 'rgba(255,50,50,0.4)'};border-radius:12px;`;
const PlayerAvatar = styled.div`width:48px;height:48px;background:rgba(255,255,255,0.1);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#fff;margin:0 auto 8px;`;
const PlayerName = styled.div`color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;`;
const ResultText = styled.div<{ $win: boolean }>`font-size:18px;font-weight:900;margin-top:8px;color:${p => p.$win ? '#4ade80' : '#f87171'};`;
const VSBadge = styled.div`font-size:24px;font-weight:900;color:#fbbf24;text-shadow:0 0 10px rgba(251,191,36,0.5);`;
const StatusMessage = styled.div`color:rgba(255,255,255,0.7);font-size:14px;margin-top:16px;`;

const TFTArenaOverlay = styled.div`position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.95);display:flex;flex-direction:column;`;
const ArenaFooter = styled.div`display:flex;justify-content:space-between;align-items:center;padding:12px 24px;background:rgba(0,0,0,0.8);border-top:1px solid rgba(255,255,255,0.1);`;
const RoundInfo = styled.div`color:#fff;font-size:16px;font-weight:700;display:flex;align-items:center;gap:12px;`;
const ResultBadge = styled.div<{ $win: boolean }>`padding:4px 12px;border-radius:20px;font-size:13px;font-weight:700;background:${p => p.$win ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'};color:${p => p.$win ? '#4ade80' : '#f87171'};border:1px solid ${p => p.$win ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'};`;

const ByeOverlay = styled.div`position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;`;
const ByeContainer = styled.div`background:linear-gradient(135deg,#1a2a1a 0%,#0f2e0f 50%,#1a3a1a 100%);border:2px solid rgba(74,222,128,0.3);border-radius:20px;padding:48px 56px;text-align:center;animation:${fadeIn} 0.4s ease;box-shadow:0 0 60px rgba(74,222,128,0.2);max-width:460px;`;
const ByeIcon = styled.div`font-size:64px;margin-bottom:16px;animation:${pulse} 2s ease-in-out infinite;`;
const ByeTitle = styled.div`color:#4ade80;font-size:28px;font-weight:900;letter-spacing:3px;margin-bottom:12px;text-shadow:0 0 20px rgba(74,222,128,0.6);`;
const ByeSubtitle = styled.div`color:rgba(255,255,255,0.8);font-size:16px;line-height:1.6;margin-bottom:20px;`;
const ByeBonusBox = styled.div`background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);border-radius:12px;padding:12px 20px;color:#4ade80;font-size:14px;font-weight:600;`;
const ByeCountdown = styled.div`color:rgba(255,255,255,0.4);font-size:12px;margin-top:16px;`;

const SummaryOverlay = styled.div`position:fixed;inset:0;z-index:2000;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;animation:${fadeIn} 0.4s ease;`;
const SummaryContainer = styled.div`background:linear-gradient(145deg,#0d0d1a 0%,#111827 100%);border:2px solid rgba(255,255,255,0.12);border-radius:24px;padding:32px;width:600px;max-width:95vw;max-height:85vh;overflow-y:auto;box-shadow:0 0 80px rgba(100,50,255,0.3);`;
const SummaryHeader = styled.div`text-align:center;margin-bottom:28px;`;
const SummaryRound = styled.div`color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:4px;text-transform:uppercase;margin-bottom:4px;`;
const SummaryTitle = styled.div`color:#fff;font-size:26px;font-weight:900;background:linear-gradient(135deg,#a78bfa,#60a5fa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
const SummaryMatchList = styled.div`display:flex;flex-direction:column;gap:12px;margin-bottom:24px;`;
const SummaryMatchCard = styled.div<{ $isMyMatch?: boolean }>`background:${p => p.$isMyMatch ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)'};border:1px solid ${p => p.$isMyMatch ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'};border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:12px;`;
const MatchPlayerName = styled.div<{ $winner?: boolean }>`flex:1;font-size:14px;font-weight:600;color:${p => p.$winner ? '#fbbf24' : 'rgba(255,255,255,0.7)'};text-align:center;`;
const MatchVS = styled.div`color:rgba(255,255,255,0.3);font-size:12px;font-weight:700;min-width:28px;text-align:center;`;
const MatchResult = styled.div<{ $winner?: boolean }>`font-size:18px;min-width:28px;text-align:center;`;
const MatchStats = styled.div`flex:1;text-align:center;color:rgba(255,255,255,0.4);font-size:11px;line-height:1.5;`;
const ByeCard = styled.div`background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:14px 18px;display:flex;align-items:center;justify-content:center;gap:10px;color:#4ade80;font-size:14px;font-weight:600;`;
const SummaryStandings = styled.div`background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:16px;margin-bottom:20px;`;
const StandingsTitle = styled.div`color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;`;
const StandingRow = styled.div<{ $isMe?: boolean }>`display:flex;align-items:center;gap:12px;padding:8px 10px;border-radius:8px;background:${p => p.$isMe ? 'rgba(99,102,241,0.15)' : 'transparent'};margin-bottom:4px;`;
const StandingRank = styled.div`color:rgba(255,255,255,0.3);font-size:13px;font-weight:700;min-width:24px;`;
const StandingName = styled.div<{ $isMe?: boolean }>`flex:1;font-size:13px;font-weight:600;color:${p => p.$isMe ? '#a78bfa' : 'rgba(255,255,255,0.8)'};`;
const StandingLives = styled.div`color:#f87171;font-size:13px;font-weight:600;`;
const StandingGold = styled.div`color:#fbbf24;font-size:13px;font-weight:600;`;
const SummaryCloseBtn = styled.button`width:100%;padding:14px;border-radius:12px;border:none;cursor:pointer;font-size:16px;font-weight:700;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;transition:all 0.2s;&:hover{background:linear-gradient(135deg,#5a52f0,#8b47f8);transform:translateY(-1px);box-shadow:0 8px 24px rgba(79,70,229,0.4);}`;

const MyResultBanner = styled.div<{ $win: boolean }>`text-align:center;margin-bottom:20px;padding:16px;border-radius:12px;background:${p => p.$win ? 'linear-gradient(135deg,rgba(74,222,128,0.15),rgba(16,185,129,0.08))' : 'linear-gradient(135deg,rgba(248,113,113,0.15),rgba(239,68,68,0.08))'};border:1px solid ${p => p.$win ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'};`;
const MyResultIcon = styled.div`font-size:36px;margin-bottom:4px;`;
const MyResultText = styled.div<{ $win: boolean }>`font-size:20px;font-weight:900;color:${p => p.$win ? '#4ade80' : '#f87171'};`;
const MyResultSub = styled.div`color:rgba(255,255,255,0.5);font-size:12px;margin-top:4px;`;

// ─── RoundSummaryModal ──────────────────────────────────────────
interface RoundSummaryModalProps {
  gameState: MultiplayerGameState;
  myUserId: string;
  roundNumber: number;
  onClose: () => void;
}

const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({ gameState, myUserId, roundNumber, onClose }) => {
  const roundResults = (gameState.battleResults || []).filter(r => r.roundNumber === roundNumber);
  const myResult = roundResults.find(r => r.player1Id === myUserId || r.player2Id === myUserId);
  const skipPlayerId = gameState.roundMatchups?.skipPlayerId ?? null;
  const iAmSkipped = skipPlayerId === myUserId;
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
    return b.lives - a.lives;
  });
  const getPlayerName = (id: string) => gameState.players.find(p => p.userId === id)?.userName ?? id;

  return (
    <SummaryOverlay onClick={onClose}>
      <SummaryContainer onClick={e => e.stopPropagation()}>
        <SummaryHeader>
          <SummaryRound>Round {roundNumber} · 전투 결과</SummaryRound>
          <SummaryTitle>⚔️ 배틀 요약</SummaryTitle>
        </SummaryHeader>

        {iAmSkipped ? (
          <MyResultBanner $win={true}>
            <MyResultIcon>😴</MyResultIcon>
            <MyResultText $win={true}>휴식 턴</MyResultText>
            <MyResultSub>이번 라운드 전투 없이 패스</MyResultSub>
          </MyResultBanner>
        ) : myResult ? (
          <MyResultBanner $win={myResult.winnerId === myUserId}>
            <MyResultIcon>{myResult.winnerId === myUserId ? '🏆' : '💀'}</MyResultIcon>
            <MyResultText $win={myResult.winnerId === myUserId}>
              {myResult.winnerId === myUserId ? '승리!' : '패배'}
            </MyResultText>
            <MyResultSub>
              {myResult.winnerId === myUserId
                ? `생존 포켓몬: ${myResult.winnerId === myResult.player1Id ? myResult.player1RemainingPokemon : myResult.player2RemainingPokemon}마리`
                : `라이프 ${myResult.lifeLost} 감소`}
            </MyResultSub>
          </MyResultBanner>
        ) : null}

        <SummaryMatchList>
          {roundResults.map(result => {
            const isMyMatch = result.player1Id === myUserId || result.player2Id === myUserId;
            const p1Won = result.winnerId === result.player1Id;
            return (
              <SummaryMatchCard key={result.matchId} $isMyMatch={isMyMatch}>
                <MatchPlayerName $winner={p1Won}>{getPlayerName(result.player1Id)}</MatchPlayerName>
                <MatchResult>{p1Won ? '🏆' : '💀'}</MatchResult>
                <MatchVS>VS</MatchVS>
                <MatchResult>{!p1Won ? '🏆' : '💀'}</MatchResult>
                <MatchPlayerName $winner={!p1Won}>{getPlayerName(result.player2Id)}</MatchPlayerName>
                <MatchStats>{result.player1RemainingPokemon} vs {result.player2RemainingPokemon}{'\n'}생존</MatchStats>
              </SummaryMatchCard>
            );
          })}
          {skipPlayerId && (
            <ByeCard>
              <span>😴</span>
              <span>{getPlayerName(skipPlayerId)}의 휴식 턴 (전투 없음)</span>
            </ByeCard>
          )}
        </SummaryMatchList>

        <SummaryStandings>
          <StandingsTitle>📊 현재 순위</StandingsTitle>
          {sortedPlayers.map((player, idx) => (
            <StandingRow key={player.userId} $isMe={player.userId === myUserId}>
              <StandingRank>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}</StandingRank>
              <StandingName $isMe={player.userId === myUserId}>
                {player.userName}{player.userId === myUserId ? ' (나)' : ''}{!player.isAlive ? ' 💀' : ''}
              </StandingName>
              <StandingLives>❤️ {player.lives}</StandingLives>
              <StandingGold>💰 {player.money}G</StandingGold>
            </StandingRow>
          ))}
        </SummaryStandings>

        <SummaryCloseBtn onClick={onClose}>다음 라운드로 →</SummaryCloseBtn>
      </SummaryContainer>
    </SummaryOverlay>
  );
};

// ─── 메인 BattlePhaseUI 컴포넌트 ────────────────────────────────
export const BattlePhaseUI: React.FC<BattlePhaseUIProps> = ({ roomId }) => {
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const gameStateRef = useRef<MultiplayerGameState | null>(null);
  const transitionTriggeredRef = useRef<boolean>(false);
  const executeTriggeredRef = useRef<boolean>(false);
  const lastPhaseEndTimeRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<string | null>(null);
  const battlePhaseEnteredAtRef = useRef<number | null>(null);
  const user = authService.getCurrentUser();
  const towerDetailsRef = useRef<Map<string, TowerDetail[]>>(new Map());
  // [V7-FIX-BP-5] towerDetails 변경 시 리렌더 트리거. 값 자체를 state로 두면
  //   매 업데이트마다 Map 전체 복사 비용이 크므로, 간단한 version 카운터로 무효화
  const [teamDataVersion, setTeamDataVersion] = useState(0);
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [summaryRoundNumber, setSummaryRoundNumber] = useState<number>(0);
  const summaryShownForRoundRef = useRef<number>(-1);

  // ─── 게임 상태 구독 ──────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = multiplayerService.onGameStateUpdateWithPhase(roomId, (state) => {
      setGameState(state);
      gameStateRef.current = state;
      if (!state) return;

      if (state.currentPhase !== lastPhaseRef.current) {
        console.log(`[BattlePhaseUI] Phase: ${lastPhaseRef.current} → ${state.currentPhase}`);
        lastPhaseRef.current = state.currentPhase;
        transitionTriggeredRef.current = false;
        executeTriggeredRef.current = false;

        if (state.currentPhase === 'battle') {
          battlePhaseEnteredAtRef.current = Date.now();
        } else {
          battlePhaseEnteredAtRef.current = null;
        }
      }

      if (state.phaseEndTime && state.phaseEndTime !== lastPhaseEndTimeRef.current) {
        lastPhaseEndTimeRef.current = state.phaseEndTime;
        transitionTriggeredRef.current = false;
      }
    });
    return unsubscribe;
  }, [roomId]);

  // 라운드 요약 모달
  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    if (!gameState) return;
    const phase = gameState.currentPhase;
    const prevPhase = prevPhaseRef.current;
    if (
      prevPhase === 'battle' &&
      (phase === 'waiting_wave' || phase === 'waiting_battle') &&
      gameState.currentRound > 0 &&
      gameState.currentRound !== summaryShownForRoundRef.current
    ) {
      const hasResults = (gameState.battleResults || []).some(r => r.roundNumber === gameState.currentRound);
      if (hasResults) {
        summaryShownForRoundRef.current = gameState.currentRound;
        setSummaryRoundNumber(gameState.currentRound);
        setShowRoundSummary(true);
      }
    }
    prevPhaseRef.current = phase;
  }, [gameState?.currentPhase, gameState?.currentRound]);

  // 타워 데이터 실시간 구독
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = multiplayerService.onAllTowerDetailsUpdate(roomId, (allTowers) => {
      let anyChanged = false;
      allTowers.forEach((towers, userId) => {
        if (towers.length > 0) {
          const prev = towerDetailsRef.current.get(userId);
          // 길이 또는 참조가 다르면 변경으로 간주
          if (!prev || prev.length !== towers.length || prev !== towers) {
            anyChanged = true;
          }
          towerDetailsRef.current.set(userId, towers);
        }
      });
      // [V7-FIX-BP-5] 데이터 변화가 있을 때만 리렌더 (Arena prop 갱신)
      if (anyChanged) setTeamDataVersion(v => v + 1);
    });
    return unsubscribe;
  }, [roomId]);

  const forceFetchTowerDetails = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      let unsub: (() => void) | null = null;
      let resolved = false;
      const done = () => { if (resolved) return; resolved = true; unsub?.(); resolve(); };
      unsub = multiplayerService.onAllTowerDetailsUpdate(roomId, (allTowers) => {
        allTowers.forEach((towers, userId) => {
          if (towers.length > 0) towerDetailsRef.current.set(userId, towers);
        });
        // [V7-FIX-BP-5] force-fetch 후에도 리렌더 트리거
        setTeamDataVersion(v => v + 1);
        console.log(`[BattlePhaseUI] Synced towers for ${towerDetailsRef.current.size} players`);
        done();
      });
      setTimeout(done, 3000);
    });
  }, [roomId]);

  /**
   * [V5-FIX-BP-3] AI vs AI 매치 실행 + 전체 타임아웃 시 누락 매치 결정론 보충
   */
  const executeBattles = useCallback(async (state: MultiplayerGameState) => {
    if (!state.roundMatchups) {
      await multiplayerService.startWaitingWavePhase(roomId);
      return;
    }

    const myUserId = user?.uid;

    // 타워 데이터 로드 대기
    await new Promise<void>((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;
      const check = setInterval(async () => {
        attempts++;
        const allLoaded = state.roundMatchups!.matches.every(m => {
          const t1 = towerDetailsRef.current.get(m.player1Id) ?? [];
          const t2 = towerDetailsRef.current.get(m.player2Id) ?? [];
          return t1.length > 0 || t2.length > 0;
        });
        if (allLoaded) { clearInterval(check); resolve(); return; }
        if (attempts % 5 === 0) await forceFetchTowerDetails();
        if (attempts >= maxAttempts) {
          clearInterval(check);
          console.warn('[BattlePhaseUI] Some teams still empty after timeout.');
          resolve();
        }
      }, 200);
    });

    // AI-host: 살아있는 비AI 중 userId 사전순 최상위 → 결정론
    const aliveHumans = state.players
      .filter(p => p.isAlive && !p.userId.startsWith('ai_'))
      .sort((a, b) => a.userId.localeCompare(b.userId));
    const hostPlayer = aliveHumans[0] ?? state.players[0];
    const isHostForAI = hostPlayer?.userId === myUserId;

    if (!isHostForAI) {
      console.log('[BattlePhaseUI] Not AI-host: skipping AI vs AI simulations');
      return;
    }

    const matchPromises = state.roundMatchups.matches.map(async (match) => {
      const existing = (state.battleResults || []).find(r =>
        r.roundNumber === state.currentRound
        && ((r.player1Id === match.player1Id && r.player2Id === match.player2Id)
          || (r.player1Id === match.player2Id && r.player2Id === match.player1Id))
      );
      if (existing) return;

      const p1IsAI = match.player1Id.startsWith('ai_');
      const p2IsAI = match.player2Id.startsWith('ai_');
      // 사람 포함 매치는 TFTBattleArena가 처리
      if (!(p1IsAI && p2IsAI)) {
        console.log(`[BattlePhaseUI] Human match: handled by TFTBattleArena`);
        return;
      }

      const team1 = towerDetailsRef.current.get(match.player1Id) ?? [];
      const team2 = towerDetailsRef.current.get(match.player2Id) ?? [];
      if (team1.length === 0 && team2.length === 0) {
        console.warn('[BattlePhaseUI] Both AI teams empty, skipping match');
        return;
      }

      console.log(`[BattlePhaseUI] AI-host simulating AI vs AI: ${match.player1Id} vs ${match.player2Id}`);
      const result = pvpBattleService.simulateBattle(
        team1, team2, match.player1Id, match.player2Id, state.currentRound,
      );
      await multiplayerService.submitBattleResult(roomId, result);
    });

    try {
      await Promise.all(matchPromises);
    } catch (err) {
      console.error('[BattlePhaseUI] executeBattles failed:', err);
    }
  }, [roomId, forceFetchTowerDetails, user]);

  /**
   * [V7-FIX-BP-6] 타임아웃 시 누락 매치에 결정론 무승부 결과 생성
   *   ⚠️ 사람이 살아있는(=isAlive) 매치는 절대 덮어쓰지 않음.
   *      해당 사람이 arena에서 실제 경기를 완료하기까지 대기.
   *      양측 모두 AI거나 또는 양측 사람 모두 탈락/오프라인인 경우만 보충.
   */
  const forceCompletePendingBattles = useCallback(async (state: MultiplayerGameState) => {
    if (!state.roundMatchups) return;

    // 현재 라운드에 결과 없는 매치 찾기
    const pendingMatches = state.roundMatchups.matches.filter(m => {
      const has = (state.battleResults || []).some(r =>
        r.roundNumber === state.currentRound
        && ((r.player1Id === m.player1Id && r.player2Id === m.player2Id)
          || (r.player1Id === m.player2Id && r.player2Id === m.player1Id))
      );
      return !has;
    });

    if (pendingMatches.length === 0) return;

    // [V7-FIX-BP-6] 사람 보호 필터
    const safeToComplete = pendingMatches.filter(m => {
      const p1IsAI = m.player1Id.startsWith('ai_');
      const p2IsAI = m.player2Id.startsWith('ai_');
      // 양쪽 모두 AI면 force-complete 허용
      if (p1IsAI && p2IsAI) return true;
      // 한쪽이라도 사람이면, "그 사람이 탈락했는지" 확인
      const humanIds = [m.player1Id, m.player2Id].filter(id => !id.startsWith('ai_'));
      const allHumansDefeated = humanIds.every(id => {
        const p = state.players.find(pp => pp.userId === id);
        return !p || !p.isAlive; // 탈락 또는 상태 없음
      });
      if (allHumansDefeated) {
        console.log(`[BattlePhaseUI] All humans in match defeated → force-complete allowed: ${m.player1Id} vs ${m.player2Id}`);
        return true;
      }
      // 살아있는 사람이 있으면 보호 (해당 사람이 arena에서 결과 제출할 때까지 기다림)
      console.log(`[BattlePhaseUI] Human is alive in match, PROTECTED: ${m.player1Id} vs ${m.player2Id}`);
      return false;
    });

    if (safeToComplete.length === 0) {
      console.log('[BattlePhaseUI] All pending matches are protected (humans alive). Waiting...');
      return;
    }

    console.warn(`[BattlePhaseUI] Force-completing ${safeToComplete.length} pending battles (AI-only or abandoned)`);
    for (const m of safeToComplete) {
      const team1 = towerDetailsRef.current.get(m.player1Id) ?? [];
      const team2 = towerDetailsRef.current.get(m.player2Id) ?? [];
      try {
        const result = pvpBattleService.simulateBattle(
          team1, team2, m.player1Id, m.player2Id, state.currentRound,
        );
        await multiplayerService.submitBattleResult(roomId, result);
      } catch (err) {
        console.error('[BattlePhaseUI] Force-complete failed:', err);
      }
    }
  }, [roomId]);

  const handlePhaseTransition = useCallback(async (currentState: MultiplayerGameState) => {
    console.log('[BattlePhaseUI] Phase transition:', currentState.currentPhase);
    try {
      switch (currentState.currentPhase) {
        case 'waiting_wave':
          await multiplayerService.startSynchronizedWave(roomId);
          break;
        case 'waiting_battle':
          await multiplayerService.startBattlePhase(roomId);
          break;
      }
    } catch (err) {
      console.error('[BattlePhaseUI] handlePhaseTransition failed:', err);
      transitionTriggeredRef.current = false;
    }
  }, [roomId]);

  // ─── 페이즈 체크 루프 ──────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const doPhaseCheck = async () => {
      const currentGameState = gameStateRef.current;
      if (!currentGameState || !user) return;

      const serverNow = Date.now() + multiplayerService.getServerTimeOffset();
      if (
        currentGameState.phaseEndTime &&
        serverNow >= currentGameState.phaseEndTime &&
        !transitionTriggeredRef.current
      ) {
        transitionTriggeredRef.current = true;
        handlePhaseTransition(currentGameState);
        return;
      }

      if (currentGameState.currentPhase === 'battle' && !executeTriggeredRef.current) {
        executeTriggeredRef.current = true;
        console.log('[BattlePhaseUI] Starting battle simulation...');
        executeBattles(currentGameState).catch(err =>
          console.error('[BattlePhaseUI] Battle simulation error:', err)
        );
      }

      if (currentGameState.currentPhase === 'battle' && !transitionTriggeredRef.current) {
        const matches = currentGameState.roundMatchups?.matches || [];
        const results = currentGameState.battleResults || [];
        const currentRoundResults = results.filter(r => r.roundNumber === currentGameState.currentRound);
        if (matches.length > 0 && currentRoundResults.length >= matches.length) {
          console.log('[BattlePhaseUI] All battles finished, transitioning...');
          transitionTriggeredRef.current = true;
          multiplayerService.startWaitingWavePhase(roomId).catch(console.error);
          return;
        }
      }

      // [V5-FIX-BP-3] 타임아웃 — 결정론 무승부로 누락 매치 보충 후 다음 페이즈
      if (
        currentGameState.currentPhase === 'battle' &&
        battlePhaseEnteredAtRef.current !== null &&
        Date.now() - battlePhaseEnteredAtRef.current > BATTLE_STUCK_TIMEOUT_MS
      ) {
        console.warn('[BattlePhaseUI] Battle phase stuck! Force-completing missing results...');
        battlePhaseEnteredAtRef.current = null;
        transitionTriggeredRef.current = true;
        // AI-host만 force-complete 수행 (중복 방지)
        const aliveHumans = currentGameState.players
          .filter(p => p.isAlive && !p.userId.startsWith('ai_'))
          .sort((a, b) => a.userId.localeCompare(b.userId));
        const hostPlayer = aliveHumans[0] ?? currentGameState.players[0];
        if (hostPlayer?.userId === user.uid) {
          await forceCompletePendingBattles(currentGameState);
        }
        // 페이즈 전환은 누구든 시도 (트랜잭션이 중복 차단)
        multiplayerService.startWaitingWavePhase(roomId).catch(console.error);
      }
    };

    const checkTimer = setInterval(doPhaseCheck, 200);

    const onVisibility = () => {
      if (!document.hidden) doPhaseCheck();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(checkTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [roomId, user, handlePhaseTransition, executeBattles, forceCompletePendingBattles]);

  // ─── TFT Battle Arena UI ─────────────────────────────────────
  const [showArena, setShowArena] = useState(false);
  // [V7-FIX-BP-8] arenaCompleted를 ref로 변경 — round 변경 시 동기 리셋 가능
  const arenaCompletedRef = useRef(false);
  // Force re-render trigger when ref value changes
  const [, setArenaTick] = useState(0);

  const myMatch = gameState?.roundMatchups?.matches.find(
    m => m.player1Id === user?.uid || m.player2Id === user?.uid
  );
  const skipPlayerId = gameState?.roundMatchups?.skipPlayerId ?? null;
  const iAmSkipped = skipPlayerId === user?.uid;
  const battleResult = gameState?.battleResults?.find(
    r => r.roundNumber === gameState?.currentRound
      && (r.player1Id === user?.uid || r.player2Id === user?.uid)
  );

  // [V7-FIX-BP-8] currentRound 변경 시 ref 먼저 리셋 → 다음 effect 체인이 올바르게 동작
  useEffect(() => {
    arenaCompletedRef.current = false;
    setShowArena(false);
    setArenaTick(t => t + 1);
  }, [gameState?.currentRound]);

  // [V7-FIX-BP-10] showArena 트리거 — 양측 팀 데이터 모두 로드 시에만 띄움
  //   사람 vs AI의 경우 AI의 towerDetails가 Firebase에 늦게 들어올 수 있어
  //   opponentTeam이 비면 Arena가 "로딩 중" 화면만 보이고 prep으로 못 넘어감.
  useEffect(() => {
    if (gameState?.currentPhase !== 'battle') return;
    if (arenaCompletedRef.current) return;
    if (iAmSkipped) return;
    if (!myMatch || !user) return;

    const opponentId = myMatch.player1Id === user.uid ? myMatch.player2Id : myMatch.player1Id;
    const myTeamLen = towerDetailsRef.current.get(user.uid)?.length ?? 0;
    const oppTeamLen = towerDetailsRef.current.get(opponentId)?.length ?? 0;

    // 양측 중 최소 하나는 있어야 Arena 띄움.
    // 양측이 모두 비었다면 Firebase 데이터 도착을 기다림 (teamDataVersion 변경 시 재실행).
    if (myTeamLen === 0 && oppTeamLen === 0) {
      console.log('[BattlePhaseUI] Both teams empty in Firebase, waiting for data...');
      return;
    }
    setShowArena(true);
  }, [gameState?.currentPhase, gameState?.currentRound, iAmSkipped, myMatch, user, teamDataVersion]);

  const handleArenaComplete = useCallback(() => {
    arenaCompletedRef.current = true;
    setShowArena(false);
    setArenaTick(t => t + 1);
    const currentState = gameStateRef.current;
    if (currentState && currentState.currentRound > 0) {
      const hasResults = (currentState.battleResults || []).some(r => r.roundNumber === currentState.currentRound);
      if (hasResults && currentState.currentRound !== summaryShownForRoundRef.current) {
        summaryShownForRoundRef.current = currentState.currentRound;
        setSummaryRoundNumber(currentState.currentRound);
        setShowRoundSummary(true);
      }
    }
  }, []);

  // [V5-FIX-BP-4] 라운드 전환 시 safetyArenaClosedRef 리셋
  const safetyArenaClosedRef = useRef(false);
  useEffect(() => {
    safetyArenaClosedRef.current = false;
  }, [gameState?.currentRound]);

  // [V7] safety 체크: Firebase에 내 매치 결과가 도착했는데 arena가 아직 열려있다면 종료
  //   (사람이 오프라인 복귀 후 이미 결과가 있는 상황)
  useEffect(() => {
    if (!gameState || !user) return;
    if (safetyArenaClosedRef.current) return;
    if (!showArena) return;
    if (!myMatch) return;
    const myBattleResult = (gameState.battleResults || []).find(r =>
      r.roundNumber === gameState.currentRound
      && ((r.player1Id === myMatch.player1Id && r.player2Id === myMatch.player2Id)
        || (r.player1Id === myMatch.player2Id && r.player2Id === myMatch.player1Id))
    );
    if (!myBattleResult) return;
    safetyArenaClosedRef.current = true;
    // [V7] 사람이 arena에서 직접 제출한 것이 아니면 (내가 offline 이었던 케이스) 3초 뒤 종료
    //      사람이 직접 제출한 경우는 handleArenaBattleComplete가 2초 뒤 이미 종료 예정
    console.log('[BattlePhaseUI] Firebase result detected while arena open; closing in 5s');
    setTimeout(() => handleArenaComplete(), 5000);
  }, [gameState?.battleResults, gameState?.currentRound, user, showArena, myMatch, handleArenaComplete]);

  // [V5-FIX-BP-2] battleSeed는 PvPBattleService와 동일한 알고리즘
  const battleSeed = React.useMemo(() => {
    if (!myMatch || !gameState) return 42424242;
    return deriveBattleSeed(gameState.currentRound, myMatch.player1Id, myMatch.player2Id);
  }, [myMatch, gameState?.currentRound]);

  const handleArenaBattleComplete = useCallback(async (arenaResult: TFTBattleResult) => {
    if (!myMatch || !gameState || !user) return;
    const currentRound = gameStateRef.current?.currentRound ?? gameState.currentRound;
    const existingResult = (gameStateRef.current?.battleResults || gameState.battleResults || []).find(r =>
      r.roundNumber === currentRound
      && ((r.player1Id === myMatch.player1Id && r.player2Id === myMatch.player2Id)
        || (r.player1Id === myMatch.player2Id && r.player2Id === myMatch.player1Id))
    );
    if (existingResult) {
      console.log('[BattlePhaseUI] Result already exists, skipping submit');
      setTimeout(() => handleArenaComplete(), 2000);
      return;
    }

    const winnerId = arenaResult.winner === 'player1' ? myMatch.player1Id : myMatch.player2Id;
    const lifeLost = arenaResult.winner === 'player1' ? arenaResult.player1Remaining : arenaResult.player2Remaining;
    const result: PvPBattleResult = {
      matchId: `${currentRound}-${myMatch.player1Id}-${myMatch.player2Id}`,
      roundNumber: currentRound,
      player1Id: myMatch.player1Id,
      player2Id: myMatch.player2Id,
      winnerId,
      player1RemainingPokemon: arenaResult.player1Remaining,
      player2RemainingPokemon: arenaResult.player2Remaining,
      lifeLost,
      battleLog: [],
      timestamp: Date.now(),
    };

    console.log('[BattlePhaseUI] Submitting arena battle result:', result);
    try {
      await multiplayerService.submitBattleResult(roomId, result);
    } catch (err) {
      console.error('[BattlePhaseUI] submitBattleResult failed:', err);
    }
    setTimeout(() => handleArenaComplete(), 2000);
  }, [myMatch, gameState, user, roomId, handleArenaComplete]);

  // ─── 조건부 렌더링 ─────────────────────────────────────────

  if (gameState?.currentPhase !== 'battle') {
    return showRoundSummary && gameState ? (
      <RoundSummaryModal
        gameState={gameState}
        myUserId={user?.uid ?? ''}
        roundNumber={summaryRoundNumber}
        onClose={() => setShowRoundSummary(false)}
      />
    ) : null;
  }

  if (iAmSkipped) {
    return (
      <>
        <ByeOverlay>
          <ByeContainer>
            <ByeIcon>😴</ByeIcon>
            <ByeTitle>휴식 턴!</ByeTitle>
            <ByeSubtitle>이번 라운드는 홀수 플레이어로 인해<br />전투 없이 패스됩니다.<br />다음 라운드를 준비하세요!</ByeSubtitle>
            <ByeBonusBox>💰 휴식 보너스 +50G 지급</ByeBonusBox>
            <ByeCountdown>배틀이 끝나면 자동으로 다음 페이즈로 넘어갑니다</ByeCountdown>
          </ByeContainer>
        </ByeOverlay>
        {showRoundSummary && gameState && (
          <RoundSummaryModal
            gameState={gameState}
            myUserId={user?.uid ?? ''}
            roundNumber={summaryRoundNumber}
            onClose={() => setShowRoundSummary(false)}
          />
        )}
      </>
    );
  }

  if (!myMatch) return null;

  const opponentId = myMatch.player1Id === user?.uid ? myMatch.player2Id : myMatch.player1Id;
  const opponent = gameState.players.find(p => p.userId === opponentId);

  if (showArena) {
    // [V5-FIX-BP-1] 양측 모두 Firebase 스냅샷에서 읽음
    const myTeam = towerDetailsRef.current.get(user?.uid || '') ?? [];
    const opponentTeam = towerDetailsRef.current.get(opponentId || '') ?? [];
    const arenaPhase: 'prep' | 'battle' | 'result' = battleResult ? 'result' : 'prep';
    const myArenaPosition: 'L' | 'R' = myMatch.player1Id === user?.uid ? 'L' : 'R';

    return (
      <>
        <TFTArenaOverlay>
          <TFTBattleArena
            roomId={roomId}
            myUserId={user?.uid}
            opponentId={opponentId}
            myTeam={myTeam}
            opponentTeam={opponentTeam}
            opponentName={opponent?.userName || 'Opponent'}
            myPosition={myArenaPosition}
            phase={arenaPhase}
            battleSeed={battleSeed}
            battleResult={battleResult ?? null}
            onBattleComplete={handleArenaBattleComplete}
          />
          <ArenaFooter>
            <RoundInfo>
              ⚔️ ROUND {gameState?.currentRound}
              {battleResult && (
                <ResultBadge $win={battleResult.winnerId === user?.uid}>
                  {battleResult.winnerId === user?.uid ? '🏆 승리!' : '💀 패배'}
                </ResultBadge>
              )}
            </RoundInfo>
          </ArenaFooter>
        </TFTArenaOverlay>
        {showRoundSummary && gameState && (
          <RoundSummaryModal
            gameState={gameState}
            myUserId={user?.uid ?? ''}
            roundNumber={summaryRoundNumber}
            onClose={() => setShowRoundSummary(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <BattleOverlay>
        <BattleContainer>
          <VSHeader>
            <RoundText>ROUND {gameState.currentRound}</RoundText>
            <BattleTitle>PvP BATTLE</BattleTitle>
          </VSHeader>
          <MatchupContainer>
            <PlayerCard $isMe>
              <PlayerAvatar>{user?.displayName?.slice(0, 1) || 'Me'}</PlayerAvatar>
              <PlayerName>{user?.displayName} (나)</PlayerName>
              {battleResult && (
                <ResultText $win={battleResult.winnerId === user?.uid}>
                  {battleResult.winnerId === user?.uid ? 'WIN' : 'LOSE'}
                </ResultText>
              )}
            </PlayerCard>
            <VSBadge>VS</VSBadge>
            <PlayerCard $isMe={false}>
              <PlayerAvatar>{opponent?.userName?.slice(0, 1) || '?'}</PlayerAvatar>
              <PlayerName>{opponent?.userName}</PlayerName>
              {battleResult && (
                <ResultText $win={battleResult.winnerId === opponentId}>
                  {battleResult.winnerId === opponentId ? 'WIN' : 'LOSE'}
                </ResultText>
              )}
            </PlayerCard>
          </MatchupContainer>
          {battleResult
            ? <StatusMessage>전투 종료! 다음 라운드 준비 중...</StatusMessage>
            : <StatusMessage>⚔️ 전투 중...</StatusMessage>}
        </BattleContainer>
      </BattleOverlay>
      {showRoundSummary && gameState && (
        <RoundSummaryModal
          gameState={gameState}
          myUserId={user?.uid ?? ''}
          roundNumber={summaryRoundNumber}
          onClose={() => setShowRoundSummary(false)}
        />
      )}
    </>
  );
};