// src/components/Modals/EvolutionConfirmModal.tsx

import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const EvolutionConfirmModal: React.FC = () => {
  const evolutionConfirmQueue = useGameStore(state => state.evolutionConfirmQueue || []);
  const towers = useGameStore(state => state.towers);
  const evolvePokemon = useGameStore(state => state.evolvePokemon);
  
  if (evolutionConfirmQueue.length === 0) return null;
  
  const current = evolutionConfirmQueue[0];
  const tower = towers.find(t => t.id === current.towerId);
  
  if (!tower) {
    // 타워가 없으면 다음 진화 확인으로
    return null;
  }
  
  const handleEvolve = async (targetId: number) => {
    await evolvePokemon(current.towerId, undefined, targetId);
    // 큐에서 제거는 evolvePokemon 내부에서 처리
  };
  
  const handleCancel = () => {
    // 진화 취소 - 큐에서 제거
    useGameStore.setState(state => ({
      evolutionConfirmQueue: state.evolutionConfirmQueue.slice(1)
    }));
  };
  
  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>✨ 진화 확인</h2>
        <img src={tower.sprite} alt={tower.name} style={styles.sprite} />
        <p style={styles.message}>
          <strong>{tower.name}</strong>(이)가 진화할 수 있습니다!
        </p>
        
        <div style={styles.options}>
          {current.evolutionOptions.map((option) => (
            <button
              key={option.targetId}
              style={styles.evolveBtn}
              onClick={() => handleEvolve(option.targetId)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
              }}
            >
              <div style={styles.evolveBtnContent}>
                <span style={styles.evolveBtnTitle}>✨ {option.targetName}</span>
                <span style={styles.evolveBtnMethod}>{option.method}</span>
              </div>
            </button>
          ))}
        </div>
        
        <button 
          style={styles.cancelBtn} 
          onClick={handleCancel}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#666';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#444';
          }}
        >
          ❌ 진화 취소
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease-out',
  },
  modal: {
    background: 'linear-gradient(145deg, #2a2d3a, #1f2029)',
    borderRadius: '20px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '2px solid rgba(255, 215, 0, 0.3)',
    animation: 'slideUp 0.3s ease-out',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '15px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #FFD700, #FFA500)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  sprite: {
    width: '120px',
    height: '120px',
    display: 'block',
    margin: '0 auto 15px',
    imageRendering: 'pixelated',
  },
  message: {
    fontSize: '18px',
    textAlign: 'center',
    marginBottom: '20px',
    color: '#e0e0e0',
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  evolveBtn: {
    padding: '15px',
    fontSize: '16px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  evolveBtnContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  evolveBtnTitle: {
    fontSize: '18px',
  },
  evolveBtnMethod: {
    fontSize: '14px',
    opacity: 0.8,
  },
  cancelBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    background: '#444',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};
