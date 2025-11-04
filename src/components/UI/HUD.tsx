// src/components/UI/HUD.tsx

import React from 'react';
import { useGameStore } from '../../store/gameStore';

interface Props {
  onStartWave: () => void;
  onOpenShop: () => void;
  onAddPokemon: () => void;
  onManagePokemon: () => void;
}

export const HUD: React.FC<Props> = ({ onStartWave, onOpenShop, onAddPokemon, onManagePokemon }) => {
  const { wave, money, lives, isWaveActive, gameSpeed, towers } = useGameStore();
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
        </div>
      </div>
      
      <div style={s.buttonSection}>
        <button onClick={onStartWave} disabled={isWaveActive} style={{...s.btn, ...s.btnWave}}>
          🎯 웨이브 시작
        </button>
        <button onClick={onOpenShop} style={{...s.btn, ...s.btnShop}}>
          🏪 상점
        </button>
        <button onClick={onAddPokemon} style={{...s.btn, ...s.btnPokemon}}>
          ➕ 포켓몬
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
    background: 'linear-gradient(135deg, rgba(26, 35, 50, 0.95), rgba(15, 20, 25, 0.95))',
    color: '#e8edf3',
    padding: '16px 24px',
    borderRadius: '16px',
    border: '2px solid rgba(76, 175, 255, 0.2)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '24px',
  },
  leftSection: {
    flex: '0 0 auto',
  },
  statGroup: {
    display: 'flex',
    gap: '24px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statIcon: {
    fontSize: '24px',
    filter: 'drop-shadow(0 0 8px rgba(76, 175, 255, 0.6))'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#4cafff',
    textShadow: '0 0 10px rgba(76, 175, 255, 0.6)',
    minWidth: '40px',
  },
  buttonSection: { 
    display: 'flex',
    gap: '12px',
    flex: 1,
    justifyContent: 'flex-end',
  },
  btn: { 
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: '2px solid',
    borderRadius: '12px',
    cursor: 'pointer',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    backdropFilter: 'blur(5px)',
    whiteSpace: 'nowrap' as 'nowrap',
  },
  btnWave: {
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    borderColor: 'rgba(231, 76, 60, 0.4)',
    color: '#fff'
  },
  btnShop: {
    background: 'linear-gradient(135deg, #f39c12 0%, #d68910 100%)',
    borderColor: 'rgba(243, 156, 18, 0.4)',
    color: '#fff'
  },
  btnPokemon: {
    background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
    borderColor: 'rgba(155, 89, 182, 0.4)',
    color: '#fff'
  },
  btnManage: {
    background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
    borderColor: 'rgba(46, 204, 113, 0.4)',
    color: '#fff'
  },
  btnSpeed: {
    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    borderColor: 'rgba(52, 152, 219, 0.4)',
    color: '#fff'
  }
};
