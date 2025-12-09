// src/components/UI/HUD.tsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGameStore } from '../../store/gameStore';
import { useTranslation } from '../../i18n';
import { media } from '../../utils/responsive.utils';
import { multiplayerService } from '../../services/MultiplayerService';
import { authService } from '../../services/AuthService';
import { GamePhase } from '../../types/multiplayer';

interface Props {
  onStartWave: () => void;
  onAddPokemon: () => void;
  onManagePokemon: () => void;
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getPhaseText = (phase: GamePhase, round: number, countdown: number | null): string => {
  switch (phase) {
    case 'shopping': return '🛒 쇼핑 중';
    case 'waiting_wave': 
      return round === 0 
        ? `⏳ 게임 시작: ${countdown || 0}초` 
        : `⏳ 다음 웨이브: ${countdown || 0}초`;
    case 'wave': return `🌊 웨이브 ${round} 진행 중`;
    case 'waiting_battle': return `⚔️ 대전 준비: ${countdown || 0}초`;
    case 'battle': return '🔥 대전 진행 중!';
    default: return '';
  }
};

export const HUD: React.FC<Props> = ({ onStartWave, onAddPokemon, onManagePokemon }) => {
  const { t } = useTranslation();
  const { wave, money, lives, isWaveActive, gameSpeed, towers, timeOfDay, gameTime } = useGameStore();
  const setSpeed = useGameStore(s => s.setGameSpeed);
  
  // 멀티플레이어 상태
  const multiRoomId = multiplayerService.getCurrentRoomId();
  const isMultiplayer = !!multiRoomId;
  
  const [multiPhase, setMultiPhase] = useState<GamePhase>('shopping');
  const [multiRound, setMultiRound] = useState(0);
  const [multiCountdown, setMultiCountdown] = useState<number | null>(null);
  const [multiMoney, setMultiMoney] = useState(500);
  const [multiLives, setMultiLives] = useState(100);
  const [phaseEndTime, setPhaseEndTime] = useState<number | null>(null);
  
  // 멀티플레이어 상태 구독 (페이즈 + 플레이어 상태)
  useEffect(() => {
    if (!multiRoomId) return;
    
    const unsubscribe = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, (state) => {
      if (state) {
        setMultiPhase(state.currentPhase);
        setMultiRound(state.currentRound);
        // 서버에서 페이즈 종료 시간 받기
        setPhaseEndTime(state.phaseEndTime ?? null);
        
        // 내 플레이어 상태 찾아서 돈/체력 업데이트
        const user = authService.getCurrentUser();
        if (user) {
          const myState = state.players.find(p => p.userId === user.uid);
          if (myState) {
            setMultiMoney(myState.money);
            setMultiLives(myState.lives);
          }
        }
      }
    });
    
    return unsubscribe;
  }, [multiRoomId]);

  // 서버 시간 기반 카운트다운 계산 (1초마다 갱신)
  useEffect(() => {
    if (!isMultiplayer) return;
    
    const timer = setInterval(() => {
      if (phaseEndTime) {
        const remaining = Math.max(0, Math.floor((phaseEndTime - Date.now()) / 1000));
        setMultiCountdown(remaining);
      } else {
        setMultiCountdown(null);
      }
    }, 200); // 200ms마다 갱신으로 더 정확한 동기화
    
    return () => clearInterval(timer);
  }, [isMultiplayer, phaseEndTime]);

  // 멀티플레이어일 때는 Firebase 값, 아니면 로컬 값
  const displayMoney = isMultiplayer ? multiMoney : money;
  const displayLives = isMultiplayer ? multiLives : lives;
  const displayWave = isMultiplayer ? multiRound : wave;

  return (
    <Container>
      <LeftSection>
        <StatGroup>
          <StatItem>
            <StatIcon>🌊</StatIcon>
            <StatValue>{displayWave}</StatValue>
          </StatItem>
          <StatItem>
            <StatIcon>💰</StatIcon>
            <StatValue>{displayMoney}</StatValue>
          </StatItem>
          <StatItem>
            <StatIcon>❤️</StatIcon>
            <StatValue>{displayLives}</StatValue>
          </StatItem>
          <StatItem>
            <StatIcon>⚡</StatIcon>
            <StatValue>{gameSpeed}x</StatValue>
          </StatItem>
          <TimeIndicator>
            {timeOfDay === 'day' ? `☀️ ${t('common.day')}` : `🌙 ${t('common.night')}`}
          </TimeIndicator>
        </StatGroup>
      </LeftSection>

      <CenterSection>
        {isMultiplayer ? (
          <PhaseDisplay $phase={multiPhase}>
            {getPhaseText(multiPhase, multiRound, multiCountdown)}
          </PhaseDisplay>
        ) : (
          <TimerDisplay>⏰ {formatTime(gameTime)}</TimerDisplay>
        )}
      </CenterSection>
      
      <ButtonSection>
        {/* 멀티플레이어에서는 웨이브 시작 버튼 숨김 - 동기화된 카운트다운으로 자동 시작 */}
        {!isMultiplayer && (
          <Btn $variant="wave" onClick={onStartWave} disabled={isWaveActive}>
            🎯 {t('hud.startWave')}
          </Btn>
        )}
        <Btn 
          $variant="pokemon" onClick={onAddPokemon}>
          ➕ {t('hud.addPokemon')}
        </Btn>
        <Btn $variant="manage" onClick={onManagePokemon}>
          🎒 {t('hud.managePokemon')} ({towers.length}/6)
        </Btn>
        {/* 멀티플레이어에서는 속도 고정 (3x) */}
        {!isMultiplayer && (
          <Btn $variant="speed" onClick={() => setSpeed(gameSpeed === 5 ? 1 : gameSpeed + 1)}>
            ⏩ {t('hud.speed')}
          </Btn>
        )}
      </ButtonSection>
    </Container>
  );
};

const Container = styled.div`
  color: #e8edf3;
  padding: 6px;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  backdrop-filter: blur(10px);
  position: relative;

  ${media.tablet} {
    padding: 5px;
    margin-bottom: 5px;
    flex-wrap: wrap;
    gap: 5px;
  }

  ${media.mobile} {
    padding: 4px;
    margin-bottom: 4px;
    flex-direction: column;
    gap: 4px;
  }
`;

const LeftSection = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;

  ${media.tablet} {
    gap: 8px;
  }

  ${media.mobile} {
    width: 100%;
    justify-content: space-between;
    gap: 6px;
  }
`;

const StatGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;

  ${media.tablet} {
    gap: 8px;
  }

  ${media.mobile} {
    gap: 6px;
    flex-wrap: wrap;
    width: 100%;
    justify-content: space-around;
  }
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  ${media.tablet} {
    padding: 3px 6px;
    gap: 3px;
  }

  ${media.mobile} {
    padding: 2px 5px;
    font-size: 11px;
  }
`;

const StatIcon = styled.span`
  font-size: 16px;

  ${media.tablet} {
    font-size: 14px;
  }

  ${media.mobile} {
    font-size: 12px;
  }
`;

const StatValue = styled.span`
  font-size: 14px;
  font-weight: bold;
  color: #4cafff;

  ${media.tablet} {
    font-size: 12px;
  }

  ${media.mobile} {
    font-size: 10px;
  }
`;

const TimeIndicator = styled.div`
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  ${media.tablet} {
    font-size: 11px;
    padding: 3px 6px;
  }

  ${media.mobile} {
    font-size: 10px;
    padding: 2px 5px;
  }
`;

const CenterSection = styled.div`
  display: flex;
  align-items: center;

  ${media.mobile} {
    width: 100%;
    justify-content: center;
  }
`;

const TimerDisplay = styled.div`
  font-size: 16px;
  font-weight: bold;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f39c12;

  ${media.tablet} {
    font-size: 14px;
    padding: 3px 10px;
  }

  ${media.mobile} {
    font-size: 12px;
    padding: 3px 8px;
  }
`;

const PhaseDisplay = styled.div<{ $phase: GamePhase }>`
  font-size: 14px;
  font-weight: bold;
  padding: 6px 14px;
  background: ${props => {
    switch (props.$phase) {
      case 'waiting_wave': return 'rgba(46, 204, 113, 0.3)';
      case 'wave': return 'rgba(52, 152, 219, 0.3)';
      case 'waiting_battle': return 'rgba(231, 76, 60, 0.3)';
      case 'battle': return 'rgba(231, 76, 60, 0.5)';
      default: return 'rgba(243, 156, 18, 0.3)';
    }
  }};
  border-radius: 10px;
  border: 2px solid ${props => {
    switch (props.$phase) {
      case 'waiting_wave': return 'rgba(46, 204, 113, 0.6)';
      case 'wave': return 'rgba(52, 152, 219, 0.6)';
      case 'waiting_battle': return 'rgba(231, 76, 60, 0.6)';
      case 'battle': return 'rgba(231, 76, 60, 0.8)';
      default: return 'rgba(243, 156, 18, 0.6)';
    }
  }};
  color: #fff;
  animation: ${props => props.$phase === 'battle' || props.$phase === 'waiting_battle' ? 'pulse 1s infinite' : 'none'};

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  ${media.tablet} {
    font-size: 12px;
    padding: 4px 10px;
  }

  ${media.mobile} {
    font-size: 11px;
    padding: 4px 8px;
  }
`;

const ButtonSection = styled.div`
  display: flex;
  gap: 6px;

  ${media.tablet} {
    gap: 5px;
    flex-wrap: wrap;
  }

  ${media.mobile} {
    width: 100%;
    justify-content: space-around;
    gap: 4px;
  }
`;

interface BtnProps {
  $variant: 'wave' | 'pokemon' | 'manage' | 'speed';
}

const Btn = styled.button<BtnProps>`
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 8px;
  border: 2px solid ${props => {
    switch(props.$variant) {
      case 'wave': return 'rgba(46, 204, 113, 0.5)';
      case 'pokemon': return 'rgba(52, 152, 219, 0.5)';
      case 'manage': return 'rgba(155, 89, 182, 0.5)';
      case 'speed': return 'rgba(243, 156, 18, 0.5)';
    }
  }};
  background: linear-gradient(135deg, ${props => {
    switch(props.$variant) {
      case 'wave': return 'rgba(46, 204, 113, 0.2), rgba(46, 204, 113, 0.1)';
      case 'pokemon': return 'rgba(52, 152, 219, 0.2), rgba(52, 152, 219, 0.1)';
      case 'manage': return 'rgba(155, 89, 182, 0.2), rgba(155, 89, 182, 0.1)';
      case 'speed': return 'rgba(243, 156, 18, 0.2), rgba(243, 156, 18, 0.1)';
    }
  }});
  color: ${props => {
    switch(props.$variant) {
      case 'wave': return '#2ecc71';
      case 'pokemon': return '#3498db';
      case 'manage': return '#9b59b6';
      case 'speed': return '#f39c12';
    }
  }};
  font-weight: bold;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => {
      switch(props.$variant) {
        case 'wave': return 'rgba(46, 204, 113, 0.3)';
        case 'pokemon': return 'rgba(52, 152, 219, 0.3)';
        case 'manage': return 'rgba(155, 89, 182, 0.3)';
        case 'speed': return 'rgba(243, 156, 18, 0.3)';
      }
    }};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${media.tablet} {
    padding: 6px 10px;
    font-size: 12px;
  }

  ${media.mobile} {
    padding: 5px 8px;
    font-size: 10px;
    flex: 1;
    min-width: 0;
  }
`;