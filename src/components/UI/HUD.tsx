// src/components/UI/HUD.tsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useGameStore } from '../../store/gameStore';
import { useTranslation } from '../../i18n';
import { media } from '../../utils/responsive.utils';
import { multiplayerService } from '../../services/MultiplayerService';
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
        ? `⏳ 게임 시작: ${countdown ?? 0}초`
        : `⏳ 다음 웨이브: ${countdown ?? 0}초`;
    case 'wave': return `🌊 웨이브 ${round} 진행 중`;
    case 'waiting_battle': return `⚔️ 대전 준비: ${countdown ?? 0}초`;
    case 'battle': return '🔥 대전 진행 중!';
    default: return '';
  }
};

export const HUD: React.FC<Props> = ({ onStartWave, onAddPokemon, onManagePokemon }) => {
  const { t } = useTranslation();
  // [수정 1] authService 제거 — money/lives는 항상 로컬 store에서 직접 읽어 즉시 UI 반영
  const { wave, money, lives, isWaveActive, gameSpeed, towers, timeOfDay, gameTime } = useGameStore();
  const setSpeed = useGameStore(s => s.setGameSpeed);

  const multiRoomId = multiplayerService.getCurrentRoomId();
  const isMultiplayer = !!multiRoomId;

  const [multiPhase, setMultiPhase] = useState<GamePhase>('waiting_wave');
  const [multiRound, setMultiRound] = useState(0);
  const [multiCountdown, setMultiCountdown] = useState<number | null>(null);
  const [phaseEndTime, setPhaseEndTime] = useState<number | null>(null);

  // 멀티플레이어 페이즈/라운드만 구독
  // money/lives는 로컬 store를 직접 사용하므로 Firebase에서 읽지 않음
  useEffect(() => {
    if (!multiRoomId) return;

    const unsubscribe = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, (state) => {
      if (!state) return;
      setMultiPhase(state.currentPhase);
      setMultiRound(state.currentRound);
      setPhaseEndTime(state.phaseEndTime ?? null);
    });

    return unsubscribe;
  }, [multiRoomId]);

  // 서버 시간 오프셋 보정 카운트다운
  useEffect(() => {
    if (!isMultiplayer) return;

    const timer = setInterval(() => {
      if (phaseEndTime) {
        const serverNow = Date.now() + multiplayerService.getServerTimeOffset();
        const remaining = Math.max(0, Math.floor((phaseEndTime - serverNow) / 1000));
        setMultiCountdown(remaining);
      } else {
        setMultiCountdown(null);
      }
    }, 200);

    return () => clearInterval(timer);
  }, [isMultiplayer, phaseEndTime]);

  // 멀티/싱글 모두 로컬 store 값 사용 (즉시 반영)
  // wave만 멀티플레이 시 서버 라운드 기준
  const displayMoney = money;
  const displayLives = lives;
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
        {!isMultiplayer && (
          <Btn $variant="wave" onClick={onStartWave} disabled={isWaveActive}>
            🎯 {t('hud.startWave')}
          </Btn>
        )}
        <Btn $variant="pokemon" onClick={onAddPokemon}>
          ➕ {t('hud.addPokemon')}
        </Btn>
        <Btn $variant="manage" onClick={onManagePokemon}>
          🎒 {t('hud.managePokemon')} ({towers.length}/6)
        </Btn>
        {!isMultiplayer && (
          <Btn
            $variant="speed"
            onClick={() => setSpeed(gameSpeed === 5 ? 1 : gameSpeed === 1 ? 3 : gameSpeed === 3 ? 5 : 1)}
          >
            ⚡ {gameSpeed}x
          </Btn>
        )}
      </ButtonSection>
    </Container>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  margin-bottom: 6px;
  gap: 8px;

  ${media.mobile} {
    flex-wrap: wrap;
    padding: 4px 8px;
  }
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
`;

const StatGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  ${media.mobile} {
    gap: 8px;
  }
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const StatIcon = styled.span`
  font-size: 14px;
`;

const StatValue = styled.span`
  font-size: 15px;
  font-weight: bold;
  color: #e8edf3;

  ${media.mobile} {
    font-size: 13px;
  }
`;

const TimeIndicator = styled.div`
  font-size: 13px;
  padding: 2px 10px;
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

const CenterSection = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
`;

const PhaseDisplay = styled.div<{ $phase: GamePhase }>`
  font-size: 14px;
  font-weight: bold;
  padding: 6px 14px;
  background: ${p => {
    switch (p.$phase) {
      case 'waiting_wave': return 'rgba(46, 204, 113, 0.3)';
      case 'wave': return 'rgba(52, 152, 219, 0.3)';
      case 'waiting_battle': return 'rgba(231, 76, 60, 0.3)';
      case 'battle': return 'rgba(231, 76, 60, 0.5)';
      default: return 'rgba(243, 156, 18, 0.3)';
    }
  }};
  border-radius: 10px;
  border: 2px solid ${p => {
    switch (p.$phase) {
      case 'waiting_wave': return 'rgba(46, 204, 113, 0.6)';
      case 'wave': return 'rgba(52, 152, 219, 0.6)';
      case 'waiting_battle': return 'rgba(231, 76, 60, 0.6)';
      case 'battle': return 'rgba(231, 76, 60, 0.8)';
      default: return 'rgba(243, 156, 18, 0.6)';
    }
  }};
  color: #fff;
`;

const TimerDisplay = styled.div`
  font-size: 16px;
  font-weight: bold;
  color: #f39c12;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const ButtonSection = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;

  ${media.mobile} {
    gap: 4px;
  }
`;

const Btn = styled.button<{ $variant: 'wave' | 'pokemon' | 'manage' | 'speed' }>`
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  border-radius: 10px;
  font-weight: bold;
  transition: all 0.2s ease;
  white-space: nowrap;

  ${p => {
    switch (p.$variant) {
      case 'wave': return `
        border: 2px solid rgba(46, 204, 113, 0.5);
        background: rgba(46, 204, 113, 0.2);
        color: #2ecc71;
        &:hover:not(:disabled) { background: rgba(46, 204, 113, 0.35); transform: translateY(-1px); }
        &:disabled { opacity: 0.4; cursor: not-allowed; }
      `;
      case 'pokemon': return `
        border: 2px solid rgba(243, 156, 18, 0.5);
        background: rgba(243, 156, 18, 0.2);
        color: #f39c12;
        &:hover { background: rgba(243, 156, 18, 0.35); transform: translateY(-1px); }
      `;
      case 'manage': return `
        border: 2px solid rgba(155, 89, 182, 0.5);
        background: rgba(155, 89, 182, 0.2);
        color: #9b59b6;
        &:hover { background: rgba(155, 89, 182, 0.35); transform: translateY(-1px); }
      `;
      case 'speed': return `
        border: 2px solid rgba(52, 152, 219, 0.5);
        background: rgba(52, 152, 219, 0.2);
        color: #3498db;
        &:hover { background: rgba(52, 152, 219, 0.35); transform: translateY(-1px); }
      `;
    }
  }}

  ${media.mobile} {
    padding: 5px 10px;
    font-size: 11px;
  }
`;