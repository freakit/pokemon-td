// src/components/Modals/SkillPicker.tsx

import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { GameMove } from '../../types/game';

export const SkillPicker: React.FC = () => {
  const { skillChoice, setSkillChoice, updateTower } = useGameStore(state => ({
    skillChoice: state.skillChoice,
    setSkillChoice: state.setSkillChoice,
    updateTower: state.updateTower,
  }));

  const [selectedNewMove, setSelectedNewMove] = useState<GameMove | null>(null);

  if (!skillChoice) return null;

  const { towerId, newMoves } = skillChoice;
  const tower = useGameStore.getState().towers.find(t => t.id === towerId);
  if (!tower) return null;

  const handleSelectNewMove = (move: GameMove) => {
    setSelectedNewMove(move);
  };

  const handleReplaceMove = (index: number) => {
    if (!selectedNewMove) return;
    
    const newMoveList = [...tower.equippedMoves];
    newMoveList[index] = selectedNewMove;
    
    updateTower(towerId, { equippedMoves: newMoveList });
    
    // 모달 닫기 및 게임 재개
    setSkillChoice(null);
    setSelectedNewMove(null);
    useGameStore.setState({ isPaused: false });
  };

  const handleSkip = () => {
    // 기술 배우지 않고 스킵
    setSkillChoice(null);
    setSelectedNewMove(null);
    useGameStore.setState({ isPaused: false });
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>⭐ {tower.name} (Lv.{tower.level}) 레벨업!</h2>
        </div>
        
        {!selectedNewMove ? (
          <>
            <p style={s.subtitle}>✨ 새로 배울 기술을 선택하세요</p>
            <div style={s.grid}>
              {newMoves.map((move, idx) => (
                <div key={idx} style={s.card} onClick={() => handleSelectNewMove(move)}>
                  <div style={s.cardHeader}>
                    <h3 style={s.moveName}>{move.name}</h3>
                    <span style={s.moveType}>{move.type}</span>
                  </div>
                  <div style={s.cardContent}>
                    <div style={s.statRow}>
                      <span>⚔️ 위력</span>
                      <span style={s.statValue}>{move.power}</span>
                    </div>
                    <div style={s.statRow}>
                      <span>📊 분류</span>
                      <span style={s.statValue}>{move.damageClass === 'physical' ? '물리' : '특수'}</span>
                    </div>
                    {move.effect.statusInflict && (
                      <div style={s.effectBadge}>
                        💫 {move.effect.statusInflict} ({move.effect.statusChance}%)
                      </div>
                    )}
                    {move.isAOE && <div style={s.aoeBadge}>🌀 광역기</div>}
                  </div>
                </div>
              ))}
            </div>
            <button style={s.skipBtn} onClick={handleSkip}>⏭️ 기술 배우지 않기</button>
          </>
        ) : (
          <>
            <p style={s.subtitle}>🔄 "{selectedNewMove.name}" - 교체할 기존 기술을 선택하세요</p>
            <div style={s.grid}>
              {tower.equippedMoves.map((move, idx) => (
                <div key={idx} style={s.cardExisting} onClick={() => handleReplaceMove(idx)}>
                  <div style={s.cardHeader}>
                    <h3 style={s.moveName}>{move.name}</h3>
                    <span style={s.moveType}>{move.type}</span>
                  </div>
                  <div style={s.cardContent}>
                    <div style={s.statRow}>
                      <span>⚔️ 위력</span>
                      <span style={s.statValue}>{move.power}</span>
                    </div>
                    <div style={s.statRow}>
                      <span>📊 분류</span>
                      <span style={s.statValue}>{move.damageClass === 'physical' ? '물리' : '특수'}</span>
                    </div>
                    {move.effect.statusInflict && (
                      <div style={s.effectBadge}>
                        💫 {move.effect.statusInflict}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button style={s.backBtn} onClick={() => setSelectedNewMove(null)}>← 뒤로 가기</button>
          </>
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
    background: 'radial-gradient(circle at center, rgba(155, 89, 182, 0.3), rgba(0,0,0,0.95))',
    backdropFilter: 'blur(10px)',
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 1001,
    animation: 'fadeIn 0.3s ease-out'
  },
  modal: { 
    background: 'linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%)',
    color: '#e8edf3', 
    borderRadius: '24px', 
    padding: '0',
    maxWidth: '1200px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto' as 'auto',
    boxShadow: '0 25px 80px rgba(155, 89, 182, 0.5), 0 0 1px 1px rgba(155, 89, 182, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    border: '2px solid rgba(155, 89, 182, 0.3)',
    animation: 'pulse 2s ease-in-out infinite'
  },
  header: {
    padding: '32px',
    background: 'linear-gradient(90deg, rgba(155, 89, 182, 0.2), transparent)',
    borderBottom: '2px solid rgba(155, 89, 182, 0.3)',
    textAlign: 'center' as 'center'
  },
  title: {
    fontSize: '36px',
    fontWeight: '900',
    margin: 0,
    background: 'linear-gradient(135deg, #9b59b6, #e8b5ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 30px rgba(155, 89, 182, 0.6)',
    letterSpacing: '1px'
  },
  subtitle: {
    fontSize: '20px',
    margin: '24px 32px',
    textAlign: 'center' as 'center',
    color: '#a8b8c8',
    fontWeight: '600'
  },
  grid: { 
    display: 'flex', 
    gap: '24px', 
    padding: '0 32px 32px',
    flexWrap: 'wrap' as 'wrap',
    justifyContent: 'center'
  },
  card: { 
    flex: '0 0 220px',
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95))',
    border: '2px solid rgba(52, 152, 219, 0.4)',
    borderRadius: '18px', 
    padding: '0',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
    overflow: 'hidden'
  },
  cardExisting: { 
    flex: '0 0 220px',
    background: 'linear-gradient(145deg, rgba(60, 30, 40, 0.9), rgba(35, 15, 20, 0.95))',
    border: '2px solid rgba(231, 76, 60, 0.4)',
    borderRadius: '18px', 
    padding: '0',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 24px rgba(231, 76, 60, 0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
    overflow: 'hidden'
  },
  cardHeader: {
    padding: '16px',
    background: 'linear-gradient(135deg, rgba(76, 175, 255, 0.15), rgba(76, 175, 255, 0.05))',
    borderBottom: '1px solid rgba(76, 175, 255, 0.2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  moveName: {
    fontSize: '18px',
    fontWeight: '700',
    margin: 0,
    color: '#4cafff',
    textTransform: 'capitalize' as 'capitalize'
  },
  moveType: {
    fontSize: '12px',
    padding: '4px 10px',
    background: 'rgba(76, 175, 255, 0.2)',
    borderRadius: '8px',
    border: '1px solid rgba(76, 175, 255, 0.3)',
    textTransform: 'uppercase' as 'uppercase',
    fontWeight: '600'
  },
  cardContent: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '10px'
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#a8b8c8'
  },
  statValue: {
    fontWeight: '700',
    color: '#e8edf3'
  },
  effectBadge: {
    padding: '8px',
    background: 'linear-gradient(135deg, rgba(155, 89, 182, 0.2), rgba(155, 89, 182, 0.1))',
    borderRadius: '8px',
    border: '1px solid rgba(155, 89, 182, 0.3)',
    fontSize: '13px',
    textAlign: 'center' as 'center',
    fontWeight: '600'
  },
  aoeBadge: {
    padding: '8px',
    background: 'linear-gradient(135deg, rgba(243, 156, 18, 0.2), rgba(243, 156, 18, 0.1))',
    borderRadius: '8px',
    border: '1px solid rgba(243, 156, 18, 0.3)',
    fontSize: '13px',
    textAlign: 'center' as 'center',
    fontWeight: '600'
  },
  skipBtn: { 
    margin: '0 32px 32px',
    padding: '16px 32px',
    fontSize: '18px',
    background: 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
    color: '#fff',
    border: '2px solid rgba(149, 165, 166, 0.4)',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
  },
  backBtn: { 
    margin: '0 32px 32px',
    padding: '16px 32px',
    fontSize: '18px',
    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    color: '#fff',
    border: '2px solid rgba(52, 152, 219, 0.4)',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 6px 20px rgba(52, 152, 219, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
  },
};
