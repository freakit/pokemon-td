// src/components/Multiplayer/BattlePhaseUI.tsx
// 페이즈 전환 및 대전 시뮬레이션 담당

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { multiplayerService } from '../../services/MultiplayerService';
import { MultiplayerGameState, TowerDetail } from '../../types/multiplayer';
import { authService } from '../../services/AuthService';
import { pvpBattleService } from '../../services/PvPBattleService';
import { TFTBattleArena } from './TFTBattleArena';

interface BattlePhaseUIProps {
  roomId: string;
}

// 배틀 페이즈가 이 시간(ms) 이상 지속되면 강제 전환
const BATTLE_STUCK_TIMEOUT_MS = 15_000;

export const BattlePhaseUI: React.FC<BattlePhaseUIProps> = ({ roomId }) => {
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const gameStateRef = useRef<MultiplayerGameState | null>(null);

  // 페이즈/타이밍 추적 ref
  const transitionTriggeredRef = useRef<boolean>(false);
  const lastPhaseEndTimeRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<string | null>(null);

  // 배틀 Stuck 감지용: 배틀 페이즈 진입 시각 기록
  const battlePhaseEnteredAtRef = useRef<number | null>(null);

  const user = authService.getCurrentUser();

  // 타워 정보(AI 포함) 저장
  const towerDetailsRef = useRef<Map<string, TowerDetail[]>>(new Map());

  // ─── 게임 상태 구독 ──────────────────────────────────────────────
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

        // 배틀 페이즈 진입 시각 기록 (stuck 감지용)
        if (state.currentPhase === 'battle') {
          battlePhaseEnteredAtRef.current = Date.now();
        } else {
          battlePhaseEnteredAtRef.current = null;
        }
      }

      // 같은 페이즈 내 phaseEndTime이 갱신되면 전환 플래그 리셋
      if (state.phaseEndTime && state.phaseEndTime !== lastPhaseEndTimeRef.current) {
        lastPhaseEndTimeRef.current = state.phaseEndTime;
        transitionTriggeredRef.current = false;
      }
    });

    return unsubscribe;
  }, [roomId]);

  // 모든 플레이어(AI 포함)의 타워 정보 구독
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = multiplayerService.onAllTowerDetailsUpdate(roomId, (allTowers) => {
      towerDetailsRef.current = allTowers;
    });

    return unsubscribe;
  }, [roomId]);

  // ─── 대전 실행 로직 ──────────────────────────────────────────────
  const executeBattles = async (state: MultiplayerGameState) => {
    if (!state.roundMatchups) {
      await multiplayerService.startWaitingWavePhase(roomId);
      return;
    }

    // 배틀 시작 전 타워 데이터가 로딩될 때까지 최대 3초 대기
    await new Promise<void>((resolve) => {
      let attempts = 0;
      const maxAttempts = 15; // 200ms × 15 = 3초

      const check = setInterval(() => {
        attempts++;
        const allLoaded = state.roundMatchups!.matches.every(
          (m) =>
            towerDetailsRef.current.has(m.player1Id) &&
            towerDetailsRef.current.has(m.player2Id)
        );
        if (allLoaded || attempts >= maxAttempts) {
          clearInterval(check);
          resolve();
        }
      }, 200);
    });

    const matchPromises = state.roundMatchups.matches.map(async (match) => {
      // 이미 결과가 처리된 매치는 스킵 (중복 실행 방지)
      const existingResult = (state.battleResults || []).find(
        r =>
          r.roundNumber === state.currentRound &&
          ((r.player1Id === match.player1Id && r.player2Id === match.player2Id) ||
            (r.player1Id === match.player2Id && r.player2Id === match.player1Id))
      );
      if (existingResult) return;

      const team1 = towerDetailsRef.current.get(match.player1Id) ?? [];
      const team2 = towerDetailsRef.current.get(match.player2Id) ?? [];

      if (team1.length === 0 && team2.length === 0) {
        console.warn('[BattlePhaseUI] Both teams empty, skipping match between',
          match.player1Id, 'vs', match.player2Id);
        return;
      }

      const result = pvpBattleService.simulateBattle(
        team1,
        team2,
        match.player1Id,
        match.player2Id,
        state.currentRound
      );

      await multiplayerService.submitBattleResult(roomId, result);
    });

    try {
      await Promise.all(matchPromises);
    } catch (err) {
      console.error('[BattlePhaseUI] executeBattles failed:', err);
    }

    // TFT 배틀 애니메이션을 위한 딜레이 (아레나 표시 시간) 후 다음 페이즈로
    // TFTBattleArena가 onBattleComplete 콜백으로 알려주지만,
    // 안전장치로 12초 후 강제 전환
    setTimeout(async () => {
      try {
        await multiplayerService.startWaitingWavePhase(roomId);
      } catch (err) {
        console.error('[BattlePhaseUI] startWaitingWavePhase failed:', err);
      }
    }, 12000);
  };

  // ─── 페이즈 전환 처리 (호스트만) ────────────────────────────────
  const handlePhaseTransition = async (currentState: MultiplayerGameState) => {
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
  };

  // ─── 서버 시간 기반 페이즈 전환 체크 (200ms마다) ────────────────
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

      // 2. 배틀 페이즈: 즉시 시뮬레이션 실행
      if (currentGameState.currentPhase === 'battle' && !transitionTriggeredRef.current) {
        transitionTriggeredRef.current = true;
        console.log('[BattlePhaseUI] Starting battle simulation...');
        executeBattles(currentGameState).catch(err => {
          console.error('[BattlePhaseUI] Battle simulation error:', err);
          setTimeout(() => {
            multiplayerService.startWaitingWavePhase(roomId);
          }, 5000);
        });
        return;
      }

      // 3. 배틀 Stuck 안전장치: 15초 이상 배틀 페이즈이면 강제 전환
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
  }, [roomId, user]);

  // ─── TFT Battle Arena UI ─────────────────────────────────────────
  const [showArena, setShowArena] = useState(false);
  const [arenaCompleted, setArenaCompleted] = useState(false);

  const myMatch = gameState?.roundMatchups?.matches.find(
    m => m.player1Id === user?.uid || m.player2Id === user?.uid
  );

  const battleResult = gameState?.battleResults?.find(
    r =>
      r.roundNumber === gameState?.currentRound &&
      (r.player1Id === user?.uid || r.player2Id === user?.uid)
  );

  // 배틀 페이즈 진입 즉시 아레나 표시
  useEffect(() => {
    if (gameState?.currentPhase === 'battle' && !arenaCompleted) {
      setShowArena(true);
    }
  }, [gameState?.currentPhase, arenaCompleted]);

  // 라운드가 바뀌면 아레나 상태 리셋
  useEffect(() => {
    setArenaCompleted(false);
    setShowArena(false);
  }, [gameState?.currentRound]);

  const handleArenaComplete = () => {
    setArenaCompleted(true);
    setShowArena(false);
  };

  if (gameState?.currentPhase !== 'battle' || !myMatch) return null;

  const opponentId = myMatch.player1Id === user?.uid
    ? myMatch.player2Id
    : myMatch.player1Id;
  const opponent = gameState.players.find(p => p.userId === opponentId);

  // ─── TFT 아레나 표시 ─────────────────────────────────────────────
  if (showArena) {
    const myTeam = towerDetailsRef.current.get(user?.uid || '') || [];
    const opponentTeam = towerDetailsRef.current.get(opponentId || '') || [];
    // 배틀 결과가 있으면 battle 페이즈, 아직 시뮬레이션 중이면 prep(준비) 표시
    const arenaPhase: 'prep' | 'battle' | 'result' = battleResult ? 'battle' : 'prep';

    return (
      <TFTArenaOverlay>
        <TFTBattleArena
          myTeam={myTeam}
          opponentTeam={opponentTeam}
          opponentName={opponent?.userName || 'Opponent'}
          phase={arenaPhase}
          battleResult={battleResult ?? null}
          onBattleComplete={(_winnerId) => {
            // 배틀 완료 후 3초 대기 후 아레나 닫기
            setTimeout(() => handleArenaComplete(), 3000);
          }}
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
          <SkipBtn onClick={handleArenaComplete}>건너뛰기 ⏩</SkipBtn>
        </ArenaFooter>
      </TFTArenaOverlay>
    );
  }

  // ─── 아레나 완료 후 대기 화면 ────────────────────────────────────
  return (
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
          <StatusMessage>전투 종료! 결과 처리 중...</StatusMessage>
        ) : (
          <StatusMessage>⚔️ 전투 시뮬레이션 중...</StatusMessage>
        )}

        {/* 아레나 다시 보기 버튼 */}
        {!showArena && (
          <ReplayBtn onClick={() => { setArenaCompleted(false); setShowArena(true); }}>
            🎬 배틀 다시 보기
          </ReplayBtn>
        )}
      </BattleContainer>
    </BattleOverlay>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const TFTArenaOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 16px;
  overflow-y: auto;
`;

const ArenaFooter = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
`;

const RoundInfo = styled.div`
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ResultBadge = styled.span<{ $win: boolean }>`
  color: ${p => p.$win ? '#ffd700' : '#e74c3c'};
  font-size: 18px;
  font-weight: bold;
  text-shadow: 0 0 8px ${p => p.$win ? 'rgba(255,215,0,0.6)' : 'rgba(231,76,60,0.6)'};
`;

const SkipBtn = styled.button`
  padding: 8px 20px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.2); }
`;

const BattleOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 500;
`;

const BattleContainer = styled.div`
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 2px solid rgba(231, 76, 60, 0.6);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  min-width: 400px;
  box-shadow: 0 0 40px rgba(231, 76, 60, 0.3);
`;

const VSHeader = styled.div`
  margin-bottom: 24px;
`;

const RoundText = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 2px;
  margin-bottom: 8px;
`;

const BattleTitle = styled.h2`
  font-size: 28px;
  color: #e74c3c;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(231, 76, 60, 0.8);
`;

const MatchupContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
`;

const PlayerCard = styled.div<{ $isMe: boolean }>`
  background: ${p => p.$isMe ? 'rgba(52, 152, 219, 0.2)' : 'rgba(231, 76, 60, 0.2)'};
  border: 1px solid ${p => p.$isMe ? 'rgba(52, 152, 219, 0.4)' : 'rgba(231, 76, 60, 0.4)'};
  border-radius: 12px;
  padding: 16px 20px;
  min-width: 120px;
`;

const PlayerAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  color: white;
  margin: 0 auto 8px;
`;

const PlayerName = styled.div`
  color: white;
  font-size: 14px;
  font-weight: bold;
`;

const ResultText = styled.div<{ $win: boolean }>`
  margin-top: 8px;
  font-size: 18px;
  font-weight: bold;
  color: ${p => p.$win ? '#2ecc71' : '#e74c3c'};
  text-shadow: 0 0 10px ${p => p.$win ? 'rgba(46, 204, 113, 0.8)' : 'rgba(231, 76, 60, 0.8)'};
`;

const VSBadge = styled.div`
  font-size: 32px;
  font-weight: bold;
  color: #f39c12;
  text-shadow: 0 0 20px rgba(243, 156, 18, 0.8);
`;

const StatusMessage = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  margin-bottom: 16px;
`;

const ReplayBtn = styled.button`
  margin-top: 8px;
  padding: 8px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 215, 0, 0.4);
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.2s;
  &:hover { background: rgba(255, 215, 0, 0.2); }
`;