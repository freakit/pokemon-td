// src/components/Multiplayer/BattlePhaseUI.tsx
// 페이즈 전환 및 대전 시뮬레이션 담당

import React, { useState, useEffect, useRef } from 'react';
import { multiplayerService } from '../../services/MultiplayerService';
import { MultiplayerGameState, TowerDetail } from '../../types/multiplayer';
import { authService } from '../../services/AuthService';
import { pvpBattleService } from '../../services/PvPBattleService';
import styled from 'styled-components';
import { BattleVisualizer } from './BattleVisualizer';

interface BattlePhaseUIProps {
  roomId: string;
}

export const BattlePhaseUI: React.FC<BattlePhaseUIProps> = ({ roomId }) => {
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(null);
  const gameStateRef = useRef<MultiplayerGameState | null>(null);
  const transitionTriggeredRef = useRef<boolean>(false);
  const lastPhaseEndTimeRef = useRef<number | null>(null);
  const lastPhaseRef = useRef<string | null>(null);
  const user = authService.getCurrentUser();
  
  // 타워 정보(AI 포함) 저장
  const towerDetailsRef = useRef<Map<string, TowerDetail[]>>(new Map());

  // 게임 상태 구독
  useEffect(() => {
    if (!roomId) return;

    const unsubscribe = multiplayerService.onGameStateUpdateWithPhase(roomId, (state) => {
      setGameState(state);
      gameStateRef.current = state;
      
      // Phase가 바뀌면 전환 플래그 리셋
      if (state && state.currentPhase !== lastPhaseRef.current) {
        console.log(`[BattlePhaseUI] Phase changed: ${lastPhaseRef.current} -> ${state.currentPhase}`);
        lastPhaseRef.current = state.currentPhase;
        transitionTriggeredRef.current = false;
      }

      // 새로운 phaseEndTime이 설정되면 전환 플래그 리셋 (같은 페이즈 내 시간 연장 등)
      if (state?.phaseEndTime && state.phaseEndTime !== lastPhaseEndTimeRef.current) {
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

  // 대전 실행 로직
  const executeBattles = async (state: MultiplayerGameState) => {
    if (!state.roundMatchups) return;

    const matchPromises = state.roundMatchups.matches.map(async (match) => {
      // 이미 결과가 처리된 매치는 스킵 (중복 실행 방지)
      const existingResult = state.battleResults?.find(
        r => r.roundNumber === state.currentRound && 
        ((r.player1Id === match.player1Id && r.player2Id === match.player2Id) ||
         (r.player1Id === match.player2Id && r.player2Id === match.player1Id))
      );
      
      if (existingResult) return;

      const team1 = towerDetailsRef.current.get(match.player1Id) || [];
      const team2 = towerDetailsRef.current.get(match.player2Id) || [];

      // 대전 시뮬레이션
      const result = pvpBattleService.simulateBattle(
        team1,
        team2,
        match.player1Id,
        match.player2Id,
        state.currentRound
      );

      // 결과 전송
      await multiplayerService.submitBattleResult(roomId, result);
    });

    await Promise.all(matchPromises);

    // 대전 연출을 위한 딜레이 (5초) 후 다음 페이즈로
    setTimeout(async () => {
      await multiplayerService.startWaitingWavePhase(roomId);
    }, 5000);
  };

  // 서버 시간 기반으로 페이즈 전환 체크 (200ms마다)
  useEffect(() => {
    if (!roomId) return;

    const checkTimer = setInterval(() => {
      const currentGameState = gameStateRef.current;
      if (!currentGameState || !user) return;
      
      // 호스트만 실행
      const isHost = currentGameState.players[0]?.userId === user.uid;
      if (!isHost) return;

      // 1. phaseEndTime 체크
      if (currentGameState.phaseEndTime && Date.now() >= currentGameState.phaseEndTime) {
        if (!transitionTriggeredRef.current) {
          transitionTriggeredRef.current = true;
          handlePhaseTransition(currentGameState);
        }
      }

      // 2. Battle 페이즈 로직 (시간 제한 없이 즉시 실행하되, 완료 조건 체크는 별도)
      if (currentGameState.currentPhase === 'battle' && !transitionTriggeredRef.current) {
        // 배틀 페이즈인데 아직 처리가 안되었다면
        transitionTriggeredRef.current = true;
        console.log('Starting battle simulation...');
        
        // Wrap in try-catch to ensure we don't crash
        executeBattles(currentGameState).catch(err => {
            console.error('Failed to execute battles:', err);
            // Force recovery for Host
            setTimeout(() => {
                multiplayerService.startWaitingWavePhase(roomId);
            }, 5000);
        });
      }

      // Safety: If stuck in battle phase for more than 15 seconds, force transition
      // (Server time or local time safety check)
      if (currentGameState.currentPhase === 'battle' && transitionTriggeredRef.current) {
          // Check if results are missing for my match
          // If we've been here too long, force move on.
          // Rough check: phaseEndTime is null in battle phase.
          // Using a local timeout ref in useEffect would be better but this interval works too if we track start time.
          // For now, rely on executeBattles calling startWaitingWavePhase after logging.
      }

    }, 200);

    return () => clearInterval(checkTimer);
  }, [roomId, user]);

  // 페이즈 전환 처리 (호스트만)
  const handlePhaseTransition = async (currentState: MultiplayerGameState) => {
    console.log('Phase transition triggered:', currentState.currentPhase);

    switch (currentState.currentPhase) {
      case 'waiting_wave':
        // 웨이브 시작
        await multiplayerService.startSynchronizedWave(roomId);
        break;
      case 'waiting_battle':
        // 대전 시작 (매칭 생성 + 페이즈 변경)
        // phaseEndTime이 지나면 호출됨
        await multiplayerService.startBattlePhase(roomId);
        // startBattlePhase가 완료되면 currentPhase가 'battle'로 바뀌고
        // useEffect의 battle 페이즈 감지 로직이 executeBattles를 실행함
        break;
    }
  };


  // Battle UI Integration
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [visualizerCompleted, setVisualizerCompleted] = useState(false);

  // 현재 내 배틀 매치업 찾기
  const myMatch = gameState?.roundMatchups?.matches.find(m => 
    m.player1Id === user?.uid || m.player2Id === user?.uid
  );

  // 배틀 결과 찾기 (BattleLog 포함됨)
  const battleResult = gameState?.battleResults?.find(r => 
     r.roundNumber === gameState.currentRound && 
     (r.player1Id === user?.uid || r.player2Id === user?.uid)
  );

  // 배틀 결과가 나오면 Visualizer 활성화
  useEffect(() => {
    if (battleResult && !visualizerCompleted) {
      setShowVisualizer(true);
    }
  }, [battleResult, visualizerCompleted]);

  // Visualizer 완료 핸들러
  const handleVisualizerComplete = () => {
    setVisualizerCompleted(true);
    setShowVisualizer(false);
  };

  if (gameState?.currentPhase !== 'battle' || !myMatch) return null;

  const opponentId = myMatch.player1Id === user?.uid ? myMatch.player2Id : myMatch.player1Id;
  const opponent = gameState.players.find(p => p.userId === opponentId);
  
  if (showVisualizer && battleResult) {
    const myTeam = towerDetailsRef.current.get(user?.uid || '') || [];
    const opponentTeam = towerDetailsRef.current.get(opponentId || '') || [];
    
    // 만약 타워 정보가 아직 로드 안됐다면 (비동기 이슈), 일단 빈 배열로라도 렌더링하거나 로딩 처리
    // 여기서는 간단히 렌더링
    
    return (
      <BattleVisualizer 
        myTeam={myTeam}
        opponentTeam={opponentTeam}
        opponentName={opponent?.userName || 'Opponent'}
        battleResult={battleResult}
        onComplete={handleVisualizerComplete}
      />
    );
  }

  // Visualizer가 끝난 후 대기 화면 (결과만 간단히 보여주거나 대기 메시지)
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
            <PlayerAvatar>{opponent?.userName.slice(0, 1) || '?'}</PlayerAvatar>
            <PlayerName>{opponent?.userName}</PlayerName>
            {battleResult && (
               <ResultText $win={battleResult.winnerId === opponentId}>
                {battleResult.winnerId === opponentId ? 'WIN' : 'LOSE'}
              </ResultText>
            )}
          </PlayerCard>
        </MatchupContainer>

        {battleResult ? (
          <StatusMessage>
            전투 종료! 다음 웨이브 대기 중...
          </StatusMessage>
        ) : (
          <StatusMessage>
             상대방과 연결 중...
          </StatusMessage>
        )}
      </BattleContainer>
    </BattleOverlay>
  );
};

const BattleOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const BattleContainer = styled.div`
  width: 90%;
  max-width: 800px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 4px solid #f1c40f;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 0 50px rgba(241, 196, 15, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 100%;
    background: url('/assets/ui/vseffect.png') center/cover no-repeat;
    opacity: 0.1;
    pointer-events: none;
  }
`;

const VSHeader = styled.div`
  margin-bottom: 40px;
`;

const RoundText = styled.div`
  font-size: 24px;
  color: #f1c40f;
  font-weight: bold;
  letter-spacing: 4px;
  margin-bottom: 10px;
`;

const BattleTitle = styled.h2`
  font-size: 48px;
  color: #fff;
  margin: 0;
  text-shadow: 0 0 20px rgba(241, 196, 15, 0.5);
  font-style: italic;
`;

const MatchupContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 20px;
  }
`;

const PlayerCard = styled.div<{ $isMe: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: ${props => props.$isMe ? 'rgba(52, 152, 219, 0.1)' : 'rgba(231, 76, 60, 0.1)'};
  border-radius: 15px;
  border: 2px solid ${props => props.$isMe ? '#3498db' : '#e74c3c'};
  transform: ${props => props.$isMe ? 'translateX(0)' : 'translateX(0)'};
  transition: all 0.3s;
`;

const PlayerAvatar = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: #333;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 40px;
  font-weight: bold;
  color: #fff;
  border: 4px solid #fff;
  margin-bottom: 15px;
`;

const PlayerName = styled.div`
  font-size: 24px;
  color: #fff;
  font-weight: bold;
  margin-bottom: 10px;
`;

const VSBadge = styled.div`
  font-size: 60px;
  font-weight: 900;
  color: #f1c40f;
  margin: 0 40px;
  font-style: italic;
  text-shadow: 4px 4px 0px rgba(0,0,0,0.5);
  
  @media (max-width: 768px) {
    margin: 20px 0;
  }
`;

const ResultText = styled.div<{ $win: boolean }>`
  font-size: 32px;
  font-weight: bold;
  color: ${props => props.$win ? '#2ecc71' : '#e74c3c'};
  text-shadow: 0 0 10px ${props => props.$win ? 'rgba(46, 204, 113, 0.5)' : 'rgba(231, 76, 60, 0.5)'};
  margin-top: 10px;
  animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  @keyframes popIn {
    from { transform: scale(0); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
`;

const StatusMessage = styled.div`
  font-size: 20px;
  color: #bdc3c7;
  margin-top: 20px;
`;


