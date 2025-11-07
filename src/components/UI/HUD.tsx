// src/components/UI/HUD.tsx

import React from 'react';
import { useGameStore } from '../../store/gameStore';

interface Props {
  onStartWave: () => void;
  onAddPokemon: () => void;
  onManagePokemon: () => void;
}

export const HUD: React.FC<Props> = ({ onStartWave, onAddPokemon, onManagePokemon }) => {
  const { wave, money, lives, isWaveActive, gameSpeed, towers, timeOfDay } = useGameStore();
  const setSpeed = useGameStore(s => s.setGameSpeed);
  
  return (
    <div style={s.container}>
      <div style={s.leftSection}>
        <div style={s.statGroup}>
          <div style={s.statItem}>
            <span style={s.statIcon}>🌊</span>
            <span style={s.statValue}>{wave}</span>
          </div>
          <div style={s.statItem}>
            <span style={s.statIcon}>💰</span>
            <span style={s.statValue}>{money}</span>
          </div>
          <div style={s.statItem}>
            <span style={s.statIcon}>❤️</span>
            <span style={s.statValue}>{lives}</span>
          </div>
          <div style={s.statItem}>
            <span style={s.statIcon}>⚡</span>
            <span style={s.statValue}>{gameSpeed}x</span>
          </div>
          {/* 시간대 표시 추가 */}
          <div style={s.timeIndicator}>
            {timeOfDay === 'day' ? '☀️ 낮' : '🌙 밤'}
          </div>
        </div>
      </div>
      
      <div style={s.buttonSection}>
        <button onClick={onStartWave} disabled={isWaveActive} style={{...s.btn, ...s.btnWave}}>
          🎯 웨이브 시작
        </button>
        <button onClick={onAddPokemon} style={{...s.btn, ...s.btnPokemon}}>
          ➕ 포켓몬 (20원)
        </button>
        <button onClick={onManagePokemon} style={{...s.btn, ...s.btnManage}}>
          🎒 관리 ({towers.length}/6)
        </button>
        <button onClick={() => setSpeed(gameSpeed === 5 ? 1 : gameSpeed + 1)} style={{...s.btn, ...s.btnSpeed}}>
          ⏩ 속도
        </button>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  container: { 
    color: '#e8edf3',
    padding: '12px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: '8px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    backdropFilter: 'blur(10px)',
  },
  leftSection: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  statGroup: {
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  statIcon: {
    fontSize: '24px',
  },
  statValue: {
    fontSize: '20px',
    color: '#FFD700',
  },
  timeIndicator: {
    fontSize: '18px',
    fontWeight: 'bold',
    padding: '8px 16px',
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '10px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  buttonSection: {
    display: 'flex',
    gap: '12px',
  },
  btn: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    color: 'white',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  btnWave: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
  },
  btnPokemon: {
    background: 'linear-gradient(135deg, #f093fb, #f5576c)',
  },
  btnManage: {
    background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
  },
  btnSpeed: {
    background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
  },
};
