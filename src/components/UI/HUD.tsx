// src/components/UI/HUD.tsx
import React from 'react';
import styled from 'styled-components';
import { useGameStore } from '../../store/gameStore';
import { useTranslation } from '../../i18n';

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

export const HUD: React.FC<Props> = ({ onStartWave, onAddPokemon, onManagePokemon }) => {
  const { t } = useTranslation();
  const { wave, money, lives, isWaveActive, gameSpeed, towers, timeOfDay, gameTime } = useGameStore();
  const setSpeed = useGameStore(s => s.setGameSpeed);

  return (
    <Container>
      <LeftSection>
        <StatGroup>
          <StatItem>
            <StatIcon>🌊</StatIcon>
            <StatValue>{wave}</StatValue>
          </StatItem>
          <StatItem>
            <StatIcon>💰</StatIcon>
            <StatValue>{money}</StatValue>
          </StatItem>
          <StatItem>
            <StatIcon>❤️</StatIcon>
            <StatValue>{lives}</StatValue>
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
        <TimerDisplay>⏰ {formatTime(gameTime)}</TimerDisplay>
      </CenterSection>
      
      <ButtonSection>
        <Btn $variant="wave" onClick={onStartWave} disabled={isWaveActive}>
          🎯 {t('hud.startWave')}
        </Btn>
        <Btn 
          $variant="pokemon" onClick={onAddPokemon}>
          ➕ {t('hud.addPokemon')}
        </Btn>
        <Btn $variant="manage" onClick={onManagePokemon}>
          🎒 {t('hud.managePokemon')} ({towers.length}/6)
        </Btn>
        <Btn $variant="speed" onClick={() => setSpeed(gameSpeed === 5 ? 1 : gameSpeed + 1)}>
          ⏩ {t('hud.speed')}
        </Btn>
      </ButtonSection>
    </Container>
  );
};

const Container = styled.div`
  color: #e8edf3;
  padding: 12px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  backdrop-filter: blur(10px);
  position: relative;
`;

const LeftSection = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`;

const StatGroup = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
`;

const StatIcon = styled.span`
  font-size: 24px;
`;

const StatValue = styled.span`
  font-size: 20px;
  color: #FFD700;
`;

const TimeIndicator = styled.div`
  font-size: 18px;
  font-weight: bold;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 5px;
`;

const CenterSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none; /* 타이머가 클릭 방해하지 않도록 함 */
`;

const TimerDisplay = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #FFD700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 16px;
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.2);
`;

const ButtonSection = styled.div`
  display: flex;
  gap: 12px;
`;

const Btn = styled.button<{ $variant: 'wave' | 'pokemon' | 'manage' | 'speed' }>`
  padding: 12px 24px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  
  ${props => {
    switch (props.$variant) {
      case 'wave':
        return 'background: #8755ba;';
      case 'pokemon':
        return 'background: #dc4b5e;';
      case 'manage':
        return 'background: #4facfe;';
      case 'speed':
        return 'background: #22c458;';
    }
  }}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      transform: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  }
`;