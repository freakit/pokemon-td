// src/components/UI/HUD.tsx
import React from 'react';
import styled from 'styled-components';
import { useGameStore } from '../../store/gameStore';
import { useTranslation } from '../../i18n';
import { media } from '../../utils/responsive.utils';

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