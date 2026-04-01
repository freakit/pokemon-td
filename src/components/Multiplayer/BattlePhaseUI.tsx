// src/components/Multiplayer/BattlePhaseUI.tsx
// 페이즈 전환 및 대전 시뮬레이션 담당

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { multiplayerService } from '../../services/MultiplayerService';
import { MultiplayerGameState, TowerDetail } from '../../types/multiplayer';
import { authService } from '../../services/AuthService';
import { pvpBattleService } from '../../services/PvPBattleService';
import { TFTBattleArena, TFTBattleResult } from './TFTBattleArena';

interface BattlePhaseUIProps {
  roomId: string;
}

// 배틀 페이즈가 이 시간(ms) 이상 지속되면 강제 전환
// [수정] 30초 준비 + 5초 공개 + 배틀 시간을 수용하도록 증가
const BATTLE_STUCK_TIMEOUT_MS = 180_000;

// ─── 스타일드 컴포넌트 ───────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;


const BattleOverlay = styled.div`
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
`;

const BattleContainer = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border: 2px solid rgba(255,255,255,0.15);
  border-radius: 20px;
  padding: 32px;
  min-width: 480px;
  text-align: center;
  animation: ${fadeIn} 0.4s ease;
  box-shadow: 0 0 60px rgba(0,100,255,0.3);
`;

const VSHeader = styled.div`margin-bottom: 24px;`;
const RoundText = styled.div`
  color: rgba(255,255,255,0.5); font-size: 12px;
  letter-spacing: 3px; text-transform: uppercase; margin-bottom: 4px;
`;
const BattleTitle = styled.div`
  color: #fff; font-size: 28px; font-weight: 900;
  letter-spacing: 4px; text-shadow: 0 0 20px rgba(0,150,255,0.8);
`;
const MatchupContainer = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 24px;
  margin: 24px 0;
`;
const PlayerCard = styled.div<{ $isMe?: boolean }>`
  flex: 1; padding: 16px;
  background: ${p => p.$isMe
    ? 'linear-gradient(135deg, rgba(0,100,255,0.2), rgba(0,50,150,0.1))'
    : 'linear-gradient(135deg, rgba(255,50,50,0.2), rgba(150,0,0,0.1))'};
  border: 1px solid ${p => p.$isMe ? 'rgba(0,150,255,0.4)' : 'rgba(255,50,50,0.4)'};
  border-radius: 12px;
`;
const PlayerAvatar = styled.div`
  width: 48px; height: 48px;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: bold; color: #fff;
  margin: 0 auto 8px;
`;
const PlayerName = styled.div`color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600;`;
const ResultText = styled.div<{ $win: boolean }>`
  font-size: 18px; font-weight: 900; margin-top: 8px;
  color: ${p => p.$win ? '#4ade80' : '#f87171'};
`;
const VSBadge = styled.div`
  font-size: 24px; font-weight: 900; color: #fbbf24;
  text-shadow: 0 0 10px rgba(251,191,36,0.5);
`;
const StatusMessage = styled.div`
  color: rgba(255,255,255,0.7); font-size: 14px; margin-top: 16px;
`;

const TFTArenaOverlay = styled.div`
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.95);
  display: flex; flex-direction: column;
`;
const ArenaFooter = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 24px;
  background: rgba(0,0,0,0.8);
  border-top: 1px solid rgba(255,255,255,0.1);
`;
const RoundInfo = styled.div`
  color: #fff; font-size: 16px; font-weight: 700;
  display: flex; align-items: center; gap: 12px;
`;
const ResultBadge = styled.div<{ $win: boolean }>`
  padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700;
  background: ${p => p.$win ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'};
  color: ${p => p.$win ? '#4ade80' : '#f87171'};
  border: 1px solid ${p => p.$win ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'};
`;


// ─── 홀수 휴식 턴 모달 ───────────────────────────────────────────
const ByeOverlay = styled.div`
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: center; justify-content: center;
`;

const ByeContainer = styled.div`
  background: linear-gradient(135deg, #1a2a1a 0%, #0f2e0f 50%, #1a3a1a 100%);
  border: 2px solid rgba(74,222,128,0.3);
  border-radius: 20px;
  padding: 48px 56px;
  text-align: center;
  animation: ${fadeIn} 0.4s ease;
  box-shadow: 0 0 60px rgba(74,222,128,0.2);
  max-width: 460px;
`;

const ByeIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const ByeTitle = styled.div`
  color: #4ade80; font-size: 28px; font-weight: 900;
  letter-spacing: 3px; margin-bottom: 12px;
  text-shadow: 0 0 20px rgba(74,222,128,0.6);
`;

const ByeSubtitle = styled.div`
  color: rgba(255,255,255,0.8); font-size: 16px;
  line-height: 1.6; margin-bottom: 20px;
`;

const ByeBonusBox = styled.div`
  background: rgba(74,222,128,0.1);
  border: 1px solid rgba(74,222,128,0.3);
  border-radius: 12px;
  padding: 12px 20px;
  color: #4ade80; font-size: 14px; font-weight: 600;
`;

const ByeCountdown = styled.div`
  color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 16px;
`;

// ─── 라운드 결과 요약 모달 ───────────────────────────────────────
const SummaryOverlay = styled.div`
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.9);
  display: flex; align-items: center; justify-content: center;
  animation: ${fadeIn} 0.4s ease;
`;

const SummaryContainer = styled.div`
  background: linear-gradient(145deg, #0d0d1a 0%, #111827 100%);
  border: 2px solid rgba(255,255,255,0.12);
  border-radius: 24px;
  padding: 32px;
  width: 600px;
  max-width: 95vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 0 80px rgba(100,50,255,0.3);
`;

const SummaryHeader = styled.div`
  text-align: center;
  margin-bottom: 28px;
`;

const SummaryRound = styled.div`
  color: rgba(255,255,255,0.4); font-size: 11px;
  letter-spacing: 4px; text-transform: uppercase; margin-bottom: 4px;
`;

const SummaryTitle = styled.div`
  color: #fff; font-size: 26px; font-weight: 900;
  background: linear-gradient(135deg, #a78bfa, #60a5fa);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const SummaryMatchList = styled.div`
  display: flex; flex-direction: column; gap: 12px;
  margin-bottom: 24px;
`;

const SummaryMatchCard = styled.div<{ $isMyMatch?: boolean }>`
  background: ${p => p.$isMyMatch ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)'};
  border: 1px solid ${p => p.$isMyMatch ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'};
  border-radius: 12px;
  padding: 14px 18px;
  display: flex; align-items: center; gap: 12px;
`;

const MatchPlayerName = styled.div<{ $winner?: boolean }>`
  flex: 1; font-size: 14px; font-weight: 600;
  color: ${p => p.$winner ? '#fbbf24' : 'rgba(255,255,255,0.7)'};
  text-align: center;
`;

const MatchVS = styled.div`
  color: rgba(255,255,255,0.3); font-size: 12px; font-weight: 700;
  min-width: 28px; text-align: center;
`;

const MatchResult = styled.div<{ $winner?: boolean }>`
  font-size: 18px; min-width: 28px; text-align: center;
`;

const MatchStats = styled.div`
  flex: 1; text-align: center;
  color: rgba(255,255,255,0.4); font-size: 11px;
  line-height: 1.5;
`;

const ByeCard = styled.div`
  background: rgba(74,222,128,0.06);
  border: 1px solid rgba(74,222,128,0.2);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  color: #4ade80; font-size: 14px; font-weight: 600;
`;

const SummaryStandings = styled.div`
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
`;

const StandingsTitle = styled.div`
  color: rgba(255,255,255,0.4); font-size: 11px;
  letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px;
`;

const StandingRow = styled.div<{ $isMe?: boolean }>`
  display: flex; align-items: center; gap: 12px;
  padding: 8px 10px; border-radius: 8px;
  background: ${p => p.$isMe ? 'rgba(99,102,241,0.15)' : 'transparent'};
  margin-bottom: 4px;
`;

const StandingRank = styled.div`
  color: rgba(255,255,255,0.3); font-size: 13px; font-weight: 700;
  min-width: 24px;
`;

const StandingName = styled.div<{ $isMe?: boolean }>`
  flex: 1; font-size: 13px; font-weight: 600;
  color: ${p => p.$isMe ? '#a78bfa' : 'rgba(255,255,255,0.8)'};
`;

const StandingLives = styled.div`
  color: #f87171; font-size: 13px; font-weight: 600;
`;

const StandingGold = styled.div`
  color: #fbbf24; font-size: 13px; font-weight: 600;
`;

const SummaryCloseBtn = styled.button`
  width: 100%;
  padding: 14px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-size: 16px; font-weight: 700;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  transition: all 0.2s;
  &:hover {
    background: linear-gradient(135deg, #5a52f0, #8b47f8);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(79,70,229,0.4);
  }
`;

const MyResultBanner = styled.div<{ $win: boolean }>`
  text-align: center;
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 12px;
  background: ${p => p.$win
    ? 'linear-gradient(135deg, rgba(74,222,128,0.15), rgba(16,185,129,0.08))'
    : 'linear-gradient(135deg, rgba(248,113,113,0.15), rgba(239,68,68,0.08))'};
  border: 1px solid ${p => p.$win ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'};
`;

const MyResultIcon = styled.div`font-size: 36px; margin-bottom: 4px;`;
const MyResultText = styled.div<{ $win: boolean }>`
  font-size: 20px; font-weight: 900;
  color: ${p => p.$win ? '#4ade80' : '#f87171'};
`;
const MyResultSub = styled.div`
  color: rgba(255,255,255,0.5); font-size: 12px; margin-top: 4px;
`;

// ─── RoundSummaryModal 컴포넌트 ──────────────────────────────────
interface RoundSummaryModalProps {
  gameState: MultiplayerGameState;
  myUserId: string;
  roundNumber: number;
  onClose: () => void;
}

const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  gameState,
  myUserId,
  roundNumber,
  onClose,
}) => {
  const roundResults = (gameState.battleResults || []).filter(
    r => r.roundNumber === roundNumber
  );

  const myResult = roundResults.find(
    r => r.player1Id === myUserId || r.player2Id === myUserId
  );

  const skipPlayerId = gameState.roundMatchups?.skipPlayerId ?? null;
  const iAmSkipped = skipPlayerId === myUserId;

  // 순위표: 라이프 기준 정렬 (생존자 우선)
  const sortedPlayers = [...gameState.players].sort((a, b) => {
    if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
    return b.lives - a.lives;
  });

  const getPlayerName = (id: string) =>
    gameState.players.find(p => p.userId === id)?.userName ?? id;

  return (
    <SummaryOverlay onClick={onClose}>
      <SummaryContainer onClick={e => e.stopPropagation()}>
        <SummaryHeader>
          <SummaryRound>Round {roundNumber} · 전투 결과</SummaryRound>
          <SummaryTitle>⚔️ 배틀 요약</SummaryTitle>
        </SummaryHeader>

        {/* 내 결과 배너 */}
        {iAmSkipped ? (
          <MyResultBanner $win={true}>
            <MyResultIcon>😴</MyResultIcon>
            <MyResultText $win={true}>휴식 턴</MyResultText>
            <MyResultSub>이번 라운드 전투 없이 패스</MyResultSub>
          </MyResultBanner>
        ) : myResult ? (
          <MyResultBanner $win={myResult.winnerId === myUserId}>
            <MyResultIcon>
              {myResult.winnerId === myUserId ? '🏆' : '💀'}
            </MyResultIcon>
            <MyResultText $win={myResult.winnerId === myUserId}>
              {myResult.winnerId === myUserId ? '승리!' : '패배'}
            </MyResultText>
            <MyResultSub>
              {myResult.winnerId === myUserId
                ? `생존 포켓몬: ${myResult.winnerId === myResult.player1Id
                    ? myResult.player1RemainingPokemon
                    : myResult.player2RemainingPokemon}마리`
                : `라이프 ${myResult.lifeLost} 감소`}
            </MyResultSub>
          </MyResultBanner>
        ) : null}

        {/* 모든 매치 결과 */}
        <SummaryMatchList>
          {roundResults.map(result => {
            const isMyMatch = result.player1Id === myUserId || result.player2Id === myUserId;
            const p1Won = result.winnerId === result.player1Id;
            const p1Name = getPlayerName(result.player1Id);
            const p2Name = getPlayerName(result.player2Id);
            return (
              <SummaryMatchCard key={result.matchId} $isMyMatch={isMyMatch}>
                <MatchPlayerName $winner={p1Won}>{p1Name}</MatchPlayerName>
                <MatchResult>{p1Won ? '🏆' : '💀'}</MatchResult>
                <MatchVS>VS</MatchVS>
                <MatchResult>{!p1Won ? '🏆' : '💀'}</MatchResult>
                <MatchPlayerName $winner={!p1Won}>{p2Name}</MatchPlayerName>
                <MatchStats>
                  {result.player1RemainingPokemon} vs {result.player2RemainingPokemon}
                  {'\n'}생존
                </MatchStats>
              </SummaryMatchCard>
            );
          })}

          {/* 휴식 턴 플레이어 표시 */}
          {skipPlayerId && (
            <ByeCard>
              <span>😴</span>
              <span>{getPlayerName(skipPlayerId)}의 휴식 턴 (전투 없음)</span>
            </ByeCard>
          )}
        </SummaryMatchList>

        {/* 현재 순위표 */}
        <SummaryStandings>
          <StandingsTitle>📊 현재 순위</StandingsTitle>
          {sortedPlayers.map((player, idx) => (
            <StandingRow key={player.userId} $isMe={player.userId === myUserId}>
              <StandingRank>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </StandingRank>
              <StandingName $isMe={player.userId === myUserId}>
                {player.userName}
                {player.userId === myUserId ? ' (나)' : ''}
                {!player.isAlive ? ' 💀' : ''}
              </StandingName>
              <StandingLives>❤️ {player.lives}</StandingLives>
              <StandingGold>💰 {player.money}G</StandingGold>
            </StandingRow>
          ))}
        </SummaryStandings>

        <SummaryCloseBtn onClick={onClose}>
          다음 라운드로 →
        </SummaryCloseBtn>
      </SummaryContainer>
    </SummaryOverlay>
  );
};

// ─── 메인 BattlePhaseUI 컴포넌트 ────────────────────────────────
export const BattlePhaseUI: React.FC<BattlePhaseUIProps> = ({ roomId }) => {
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const gameStateRef = useRef<MultiplayerGameState | null>(null);

  // 페이즈/타이밍 추적 ref
  const transitionTriggeredRef = useRef<boolean>(false);
  const executeTriggeredRef = useRef<boolean>(false);
  const lastPhaseEndTimeRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<string | null>(null);

  // 배틀 Stuck 감지용
  const battlePhaseEnteredAtRef = useRef<number | null>(null);

  const user = authService.getCurrentUser();

  // 타워 정보(AI 포함) 저장
  const towerDetailsRef = useRef<Map<string, TowerDetail[]>>(new Map());

  // ─── 라운드 결과 모달 상태 ────────────────────────────────────
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

      // 페이즈가 바뀌면 전환 플래그 리셋
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

        // ── 배틀 → waiting_wave 전환 시 라운드 결과 모달 표시 ──
        // 이전 페이즈가 'battle'이었고 지금 'waiting_wave'로 바뀌면 결과를 보여준다
        if (
          lastPhaseRef.current === 'waiting_wave' &&
          (state.currentPhase === 'waiting_wave' || state.currentPhase === 'waiting_battle') &&
          state.currentRound > 0 &&
          state.currentRound !== summaryShownForRoundRef.current
        ) {
          // 결과가 존재하는 경우에만
          const hasResults = (state.battleResults || []).some(
            r => r.roundNumber === state.currentRound
          );
          if (hasResults) {
            summaryShownForRoundRef.current = state.currentRound;
            setSummaryRoundNumber(state.currentRound);
            setShowRoundSummary(true);
          }
        }
      }

      if (state.phaseEndTime && state.phaseEndTime !== lastPhaseEndTimeRef.current) {
        lastPhaseEndTimeRef.current = state.phaseEndTime;
        transitionTriggeredRef.current = false;
      }
    });

    return unsubscribe;
  }, [roomId]);

  // battle 페이즈 → waiting_wave 페이즈 전환을 별도로 감지하여 모달 표시
  // (위의 로직이 lastPhaseRef를 동시에 갱신하므로, 별도 effect로 처리)
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
      const hasResults = (gameState.battleResults || []).some(
        r => r.roundNumber === gameState.currentRound
      );
      if (hasResults) {
        summaryShownForRoundRef.current = gameState.currentRound;
        setSummaryRoundNumber(gameState.currentRound);
        setShowRoundSummary(true);
      }
    }
    prevPhaseRef.current = phase;
  }, [gameState?.currentPhase]);

  // 모든 플레이어(AI 포함)의 타워 정보 구독
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = multiplayerService.onAllTowerDetailsUpdate(roomId, (allTowers) => {
      // 새로운 데이터를 기존 Map에 병합 (기존 데이터 보존)
      allTowers.forEach((towers, userId) => {
        if (towers.length > 0) {
          towerDetailsRef.current.set(userId, towers);
        }
      });
    });

    return unsubscribe;
  }, [roomId]);

  // ─── 타워 데이터 강제 동기화 ────────────────────────────────────
  // get()은 Firebase Rules Permission 이슈 → onValue 단건 구독으로 처리
  const forceFetchTowerDetails = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      // let으로 선언해야 콜백 내부에서 TDZ 없이 참조 가능
      let unsub: (() => void) | null = null;
      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        unsub?.();
        resolve();
      };
      unsub = multiplayerService.onAllTowerDetailsUpdate(roomId, (allTowers) => {
        allTowers.forEach((towers, userId) => {
          if (towers.length > 0) {
            towerDetailsRef.current.set(userId, towers);
          }
        });
        console.log(`[BattlePhaseUI] Synced towers for ${towerDetailsRef.current.size} players`);
        done();
      });
      // 3초 타임아웃
      setTimeout(done, 3000);
    });
  }, [roomId]);

  // ─── 대전 실행 로직 ──────────────────────────────────────────
  const executeBattles = useCallback(async (state: MultiplayerGameState) => {
    if (!state.roundMatchups) {
      await multiplayerService.startWaitingWavePhase(roomId);
      return;
    }

    // [수정] 호스트 여부 판별 - 호스트만 AI 매치를 시뮬레이션해야 함
    // 여러 클라이언트가 동시에 같은 AI 매치를 시뮬레이션하는 중복 실행 방지
    const myUserId = user?.uid;
    const alivePlayers = state.players.filter(p => p.isAlive && !p.userId.startsWith('ai_'));
    const hostPlayer = alivePlayers[0] ?? state.players[0];
    const isHost = hostPlayer?.userId === myUserId;
 
    // 1차: Firebase에서 직접 강제 fetch
    await forceFetchTowerDetails();
 
    // 2차: 빈 팀 폴링 재시도
    await new Promise<void>((resolve) => {
      let attempts = 0;
      const maxAttempts = 30;
      const check = setInterval(async () => {
        attempts++;
        const allLoaded = state.roundMatchups!.matches.every((m) => {
          const t1 = towerDetailsRef.current.get(m.player1Id);
          const t2 = towerDetailsRef.current.get(m.player2Id);
          return (t1 && t1.length > 0) && (t2 && t2.length > 0);
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
 
    const myMatchInfo = state.roundMatchups.matches.find(
      m => m.player1Id === myUserId || m.player2Id === myUserId
    );
 
    // [수정] 호스트만 "내 매치 제외 나머지(AI vs AI 포함)"를 시뮬레이션
    // 비호스트 유저는 자신의 매치(아레나)만 처리하고 나머지는 호스트에 위임
    if (!isHost) {
      console.log('[BattlePhaseUI] Non-host: only handling own arena match, skipping AI simulations');
      return;
    }

    // 호스트: 내 매치를 제외한 모든 매치 시뮬레이션 (AI vs AI, 다른 유저 pair 등)
    const matchPromises = state.roundMatchups.matches.map(async (match) => {
      const existingResult = (state.battleResults || []).find(
        r =>
          r.roundNumber === state.currentRound &&
          ((r.player1Id === match.player1Id && r.player2Id === match.player2Id) ||
            (r.player1Id === match.player2Id && r.player2Id === match.player1Id))
      );
      if (existingResult) return;
 
      // 내 매치는 아레나에서 전투 후 결과 제출 → 여기서 스킵
      if (myMatchInfo && 
          match.player1Id === myMatchInfo.player1Id && 
          match.player2Id === myMatchInfo.player2Id) {
        console.log('[BattlePhaseUI] Skipping my match simulation - will be handled by arena');
        return;
      }
 
      // 그 외 매치 (AI vs AI, 다른 유저 pair 등) → 호스트가 즉시 시뮬레이션
      const team1 = towerDetailsRef.current.get(match.player1Id) ?? [];
      const team2 = towerDetailsRef.current.get(match.player2Id) ?? [];
 
      if (team1.length === 0 && team2.length === 0) {
        console.warn('[BattlePhaseUI] Both teams empty, skipping match');
        return;
      }
 
      console.log(`[BattlePhaseUI] Host simulating: ${match.player1Id} vs ${match.player2Id}`);
      const result = pvpBattleService.simulateBattle(
        team1, team2, match.player1Id, match.player2Id, state.currentRound
      );
      await multiplayerService.submitBattleResult(roomId, result);
    });
 
    try {
      await Promise.all(matchPromises);
    } catch (err) {
      console.error('[BattlePhaseUI] executeBattles failed:', err);
    }
  }, [roomId, forceFetchTowerDetails, user]);

  // ─── 페이즈 전환 처리 (호스트만) ────────────────────────────
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

  // ─── 서버 시간 기반 페이즈 전환 체크 (200ms마다) ────────────
  useEffect(() => {
    if (!roomId) return;

    const checkTimer = setInterval(() => {
      const currentGameState = gameStateRef.current;
      if (!currentGameState || !user) return;

      const alivePlayers = currentGameState.players.filter(p => p.isAlive && !p.userId.startsWith('ai_'));
      const hostPlayer = alivePlayers[0] ?? currentGameState.players[0];
      const isHost = hostPlayer?.userId === user.uid;

      if (!isHost) return;

      // 1. phaseEndTime 기반 전환
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

      // 2. 배틀 페이즈: 즉시 시뮬레이션 실행 (최초 1회만)
      if (currentGameState.currentPhase === 'battle' && !executeTriggeredRef.current) {
        executeTriggeredRef.current = true;
        console.log('[BattlePhaseUI] Starting battle simulation...');
        executeBattles(currentGameState).catch(err => {
          console.error('[BattlePhaseUI] Battle simulation error:', err);
        });
        // 결과 체킹 로직으로 바로 넘어감
      }

      // 3. 배틀 완료 대기: 모든 매치 결과가 Firebase에 제출되면 자동 전환
      // [수정] 호스트 아레나 포함 모든 결과가 Firebase에 올라올 때까지 기다림
      // executeBattles 완료와 무관하게 여기서 결과 수를 감시하므로
      // 아레나 결과(handleArenaBattleComplete → submitBattleResult)도 포함됨
      if (currentGameState.currentPhase === 'battle' && !transitionTriggeredRef.current) {
        const matches = currentGameState.roundMatchups?.matches || [];
        const results = currentGameState.battleResults || [];
        const currentRoundResults = results.filter(r => r.roundNumber === currentGameState.currentRound);

        if (matches.length > 0 && currentRoundResults.length >= matches.length) {
          console.log('[BattlePhaseUI] All battles finished, transitioning to waiting_wave...');
          transitionTriggeredRef.current = true;
          multiplayerService.startWaitingWavePhase(roomId).catch(console.error);
          return;
        }
      }

      // 3. 배틀 Stuck 안전장치
      if (
        currentGameState.currentPhase === 'battle' &&
        battlePhaseEnteredAtRef.current !== null &&
        Date.now() - battlePhaseEnteredAtRef.current > BATTLE_STUCK_TIMEOUT_MS
      ) {
        console.warn('[BattlePhaseUI] Battle phase stuck! Force transitioning...');
        battlePhaseEnteredAtRef.current = null;
        transitionTriggeredRef.current = true;
        multiplayerService.startWaitingWavePhase(roomId).catch(console.error);
      }
    }, 200);

    return () => clearInterval(checkTimer);
  }, [roomId, user, handlePhaseTransition, executeBattles]);

  // ─── TFT Battle Arena UI ─────────────────────────────────────
  const [showArena, setShowArena] = useState(false);
  const [arenaCompleted, setArenaCompleted] = useState(false);

  const myMatch = gameState?.roundMatchups?.matches.find(
    m => m.player1Id === user?.uid || m.player2Id === user?.uid
  );

  const skipPlayerId = gameState?.roundMatchups?.skipPlayerId ?? null;
  const iAmSkipped = skipPlayerId === user?.uid;

  const battleResult = gameState?.battleResults?.find(
    r =>
      r.roundNumber === gameState?.currentRound &&
      (r.player1Id === user?.uid || r.player2Id === user?.uid)
  );

  // 배틀 페이즈 진입 즉시 아레나 표시 (스킵된 플레이어 제외)
  useEffect(() => {
    if (gameState?.currentPhase === 'battle' && !arenaCompleted && !iAmSkipped) {
      setShowArena(true);
    }
  }, [gameState?.currentPhase, arenaCompleted, iAmSkipped]);

  // 라운드가 바뀌면 아레나 상태 리셋
  useEffect(() => {
    setArenaCompleted(false);
    setShowArena(false);
  }, [gameState?.currentRound]);

  const handleArenaComplete = useCallback(() => {
    setArenaCompleted(true);
    setShowArena(false);
  }, []);

  // ── 비호스트: Firebase battleResult 도착 시 자동으로 아레나 닫기 ──
  // 비호스트는 자체 루프 결과 대신 Firebase 결과를 source of truth로 사용하므로
  // TFTBattleArena 내부에서 onBattleComplete를 호출하지 않음.
  // 대신 battleResult가 Firebase에서 수신되면 여기서 아레나를 닫는다.
  const nonHostArenaClosedRef = useRef(false);
  useEffect(() => {
    if (!gameState || !user) return;
    const alivePlayers = gameState.players.filter(p => p.isAlive && !p.userId.startsWith('ai_'));
    const hostPlayer = alivePlayers[0] ?? gameState.players[0];
    const isHostNow = hostPlayer?.userId === user.uid;
    if (isHostNow) return; // 호스트는 자체 처리
    if (nonHostArenaClosedRef.current) return;
    if (!battleResult) return; // 아직 결과 없음
    if (!showArena) return; // 아레나가 이미 닫혀 있음
    // 비호스트: Firebase 결과 수신됨 → 3초 후 자동 닫기
    nonHostArenaClosedRef.current = true;
    console.log('[BattlePhaseUI] Non-host: Firebase result received, closing arena in 3s');
    setTimeout(() => handleArenaComplete(), 3000);
  }, [battleResult, gameState, user, showArena, handleArenaComplete]);

  // 라운드가 바뀌면 nonHostArenaClosedRef 리셋
  useEffect(() => {
    nonHostArenaClosedRef.current = false;
  }, [gameState?.currentRound]);

  // ─── 배틀 시드 계산 (양측 동일한 전투 재현용) ──────────────────
  // Hook은 조건부 return 이전에 반드시 선언되어야 함 (Rules of Hooks)
  const battleSeed = React.useMemo(() => {
    if (!myMatch || !gameState) return Date.now();
    return gameState.currentRound * 100000 + 
           myMatch.player1Id.charCodeAt(0) * 1000 + 
           myMatch.player2Id.charCodeAt(0);
  }, [myMatch, gameState?.currentRound]);

  // ─── 아레나 전투 완료 시 결과 제출 ────────────────────────────
  const handleArenaBattleComplete = useCallback(async (arenaResult: TFTBattleResult) => {
    if (!myMatch || !gameState || !user) return;

    // 호스트만 결과를 Firebase에 제출
    const alivePlayers = gameState.players.filter(p => p.isAlive && !p.userId.startsWith('ai_'));
    const hostPlayer = alivePlayers[0] ?? gameState.players[0];
    const isHost = hostPlayer?.userId === user.uid;

    if (!isHost) {
      console.log('[BattlePhaseUI] Non-host: arena battle complete, waiting for host result');
      setTimeout(() => handleArenaComplete(), 3000);
      return;
    }

    // 이미 결과가 있으면 중복 제출 방지
    const existingResult = (gameState.battleResults || []).find(
      r =>
        r.roundNumber === gameState.currentRound &&
        ((r.player1Id === myMatch.player1Id && r.player2Id === myMatch.player2Id) ||
          (r.player1Id === myMatch.player2Id && r.player2Id === myMatch.player1Id))
    );
    if (existingResult) {
      setTimeout(() => handleArenaComplete(), 3000);
      return;
    }

    const winnerId = arenaResult.winner === 'player1' ? myMatch.player1Id : myMatch.player2Id;
    // lifeLost = 승자 측 생존 포켓몬 수 (패배자가 잃는 라이프)
    const lifeLost = arenaResult.winner === 'player1' 
      ? arenaResult.player1Remaining 
      : arenaResult.player2Remaining;

    const result = {
      matchId: `${gameState.currentRound}-${myMatch.player1Id}-${myMatch.player2Id}-${Date.now()}`,
      roundNumber: gameState.currentRound,
      player1Id: myMatch.player1Id,
      player2Id: myMatch.player2Id,
      winnerId,
      player1RemainingPokemon: arenaResult.player1Remaining,
      player2RemainingPokemon: arenaResult.player2Remaining,
      lifeLost,
      battleLog: [],
      timestamp: Date.now(),
    };

    console.log('[BattlePhaseUI] Arena battle result:', result);
    await multiplayerService.submitBattleResult(roomId, result);
    setTimeout(() => handleArenaComplete(), 3000);
  }, [myMatch, gameState, user, roomId, handleArenaComplete]);

  // ─── 조건부 렌더링 (모든 Hook 선언 이후) ─────────────────────

  // 배틀 페이즈도 아니고 렌더링할 것 없으면 null
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

  // ─── 스킵 플레이어 (홀수 휴식 턴) ───────────────────────────
  if (iAmSkipped) {
    return (
      <>
        <ByeOverlay>
          <ByeContainer>
            <ByeIcon>😴</ByeIcon>
            <ByeTitle>휴식 턴!</ByeTitle>
            <ByeSubtitle>
              이번 라운드는 홀수 플레이어로 인해<br />
              전투 없이 패스됩니다.<br />
              다음 라운드를 준비하세요!
            </ByeSubtitle>
            <ByeBonusBox>
              💰 휴식 보너스 +50G 지급
            </ByeBonusBox>
            <ByeCountdown>
              배틀이 끝나면 자동으로 다음 페이즈로 넘어갑니다
            </ByeCountdown>
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

  const opponentId = myMatch.player1Id === user?.uid
    ? myMatch.player2Id
    : myMatch.player1Id;
  const opponent = gameState.players.find(p => p.userId === opponentId);

  // ─── TFT 아레나 표시 ─────────────────────────────────────────
  if (showArena) {
    const myTeam = towerDetailsRef.current.get(user?.uid || '') ?? [];
    const opponentTeam = towerDetailsRef.current.get(opponentId || '') ?? [];
 
    // 결과가 아직 없으면 prep부터 시작 (아레나가 전투를 결정)
    const arenaPhase: 'prep' | 'battle' | 'result' = battleResult ? 'result' : 'prep';
    const myArenaPosition: 'L' | 'R' = myMatch.player1Id === user?.uid ? 'L' : 'R';

    // 호스트 판별 (TFTBattleArena에 전달)
    const alivePlayers2 = gameState.players.filter(p => p.isAlive && !p.userId.startsWith('ai_'));
    const hostPlayer2 = alivePlayers2[0] ?? gameState.players[0];
    const isHostForArena = hostPlayer2?.userId === user?.uid;
 
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
            isHost={isHostForArena}
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

  // ─── 아레나 완료 후 대기 화면 ────────────────────────────────
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

          {battleResult ? (
            <StatusMessage>전투 종료! 다음 라운드 준비 중...</StatusMessage>
          ) : (
            <StatusMessage>⚔️ 전투 중...</StatusMessage>
          )}
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