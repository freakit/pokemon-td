// src/components/UI/PokemonManager.tsx

import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const PokemonManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { towers, sellTower } = useGameStore(state => ({
    towers: state.towers,
    sellTower: state.sellTower,
  }));

  const handleSell = (towerId: string, towerName: string, level: number) => {
    const sellPrice = level * 20;
    const confirmed = window.confirm(
      `${towerName} (Lv.${level})을(를) ${sellPrice}원에 판매하시겠습니까?`
    );
    
    if (confirmed) {
      sellTower(towerId);
    }
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>🎒 포켓몬 관리 ({towers.length}/6)</h2>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        
        {towers.length === 0 ? (
          <p style={s.emptyMessage}>보유 중인 포켓몬이 없습니다.</p>
        ) : (
          <div style={s.grid}>
            {towers.map(tower => {
              const sellPrice = tower.level * 20;
              const hpPercent = Math.round((tower.currentHp / tower.maxHp) * 100);
              
              return (
                <div key={tower.id} style={s.card}>
                  <div style={s.cardHeader}>
                    <img src={tower.sprite} alt={tower.name} style={s.img} />
                    {tower.isFainted && (
                      <div style={s.faintedBadge}>기절</div>
                    )}
                  </div>
                  
                  <div style={s.cardBody}>
                    <h3 style={s.pokeName}>{tower.name}</h3>
                    <div style={s.infoRow}>
                      <span>레벨</span>
                      <span style={s.infoValue}>{tower.level}</span>
                    </div>
                    <div style={s.infoRow}>
                      <span>HP</span>
                      <span style={s.infoValue}>
                        {Math.floor(tower.currentHp)}/{tower.maxHp} ({hpPercent}%)
                      </span>
                    </div>
                    <div style={s.infoRow}>
                      <span>처치</span>
                      <span style={s.infoValue}>{tower.kills}</span>
                    </div>
                    <div style={s.infoRow}>
                      <span>기술</span>
                      <span style={s.infoValue}>{tower.equippedMoves[0]?.name || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <button 
                    style={s.sellBtn} 
                    onClick={() => handleSell(tower.id, tower.name, tower.level)}
                  >
                    💰 판매 ({sellPrice}원)
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// 고급 게임 UI 스타일
const s: Record<string, React.CSSProperties> = {
  overlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: 'radial-gradient(circle at center, rgba(0,0,0,0.85), rgba(0,0,0,0.95))', 
    backdropFilter: 'blur(8px)',
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 999,
    animation: 'fadeIn 0.3s ease-out'
  },
  modal: { 
    background: 'linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%)',
    color: '#e8edf3', 
    borderRadius: '24px', 
    padding: '0',
    maxWidth: '1000px', 
    width: '90%', 
    maxHeight: '90vh', 
    overflowY: 'auto' as 'auto',
    boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 1px 1px rgba(76, 175, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)', 
    border: '2px solid rgba(76, 175, 255, 0.2)',
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '24px 32px',
    background: 'linear-gradient(90deg, rgba(76, 175, 255, 0.15), transparent)',
    borderBottom: '2px solid rgba(76, 175, 255, 0.2)'
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    margin: 0,
    textShadow: '0 0 20px rgba(76, 175, 255, 0.6), 0 2px 4px rgba(0,0,0,0.8)',
    background: 'linear-gradient(135deg, #4cafff, #00d4ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '1px'
  },
  closeBtn: { 
    width: '48px',
    height: '48px',
    fontSize: '24px',
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    color: '#ff6b6b',
    border: '2px solid rgba(231, 76, 60, 0.4)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)'
  },
  emptyMessage: {
    textAlign: 'center' as 'center',
    padding: '64px 32px',
    fontSize: '20px',
    color: '#a8b8c8',
    fontWeight: '600'
  },
  grid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
    gap: '24px', 
    padding: '32px'
  },
  card: { 
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95))',
    border: '2px solid rgba(76, 175, 255, 0.3)',
    borderRadius: '20px', 
    padding: '0',
    display: 'flex', 
    flexDirection: 'column' as 'column',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    overflow: 'hidden'
  },
  cardHeader: {
    position: 'relative' as 'relative',
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(76, 175, 255, 0.1), rgba(76, 175, 255, 0.05))',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  img: { 
    width: '120px', 
    height: '120px', 
    imageRendering: 'pixelated' as 'pixelated',
    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))',
  },
  faintedBadge: {
    position: 'absolute' as 'absolute',
    top: '16px',
    right: '16px',
    padding: '4px 12px',
    background: 'rgba(231, 76, 60, 0.9)',
    color: '#fff',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: '0 2px 8px rgba(231, 76, 60, 0.5)'
  },
  cardBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '8px'
  },
  pokeName: {
    fontSize: '22px',
    fontWeight: '700',
    marginBottom: '8px',
    textTransform: 'capitalize' as 'capitalize',
    color: '#4cafff',
    textAlign: 'center' as 'center'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#a8b8c8',
    padding: '4px 0',
    borderBottom: '1px solid rgba(76, 175, 255, 0.1)'
  },
  infoValue: {
    fontWeight: '700',
    color: '#e8edf3',
    textTransform: 'capitalize' as 'capitalize'
  },
  sellBtn: { 
    margin: '16px',
    padding: '14px 20px', 
    background: 'linear-gradient(135deg, #f39c12 0%, #d68910 100%)',
    color: '#fff', 
    border: '2px solid rgba(243, 156, 18, 0.4)',
    borderRadius: '12px', 
    cursor: 'pointer', 
    fontWeight: 'bold', 
    fontSize: '16px', 
    boxShadow: '0 4px 15px rgba(243, 156, 18, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease'
  },
};
