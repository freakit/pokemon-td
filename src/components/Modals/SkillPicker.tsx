// src/components/Modals/SkillPicker.tsx

import React from 'react';
import { useGameStore } from '../../store/gameStore';

export const SkillPicker: React.FC = () => {
  const { skillChoiceQueue, removeCurrentSkillChoice, updateTower } = useGameStore(state => ({
    skillChoiceQueue: state.skillChoiceQueue,
    removeCurrentSkillChoice: state.removeCurrentSkillChoice,
    updateTower: state.updateTower,
  }));

  // 큐의 첫 번째 항목 가져오기
  if (!skillChoiceQueue || skillChoiceQueue.length === 0) return null;
  
  const currentChoice = skillChoiceQueue[0];
  const { towerId, newMoves } = currentChoice;
  const tower = useGameStore.getState().towers.find(t => t.id === towerId);
  if (!tower || newMoves.length === 0) {
    // 유효하지 않은 경우 큐에서 제거
    removeCurrentSkillChoice();
    return null;
  }

  // 새로 배울 기술은 첫 번째 것만 사용
  const newMove = newMoves[0];
  const currentMove = tower.equippedMoves[0]; // 현재 기술

  const handleLearnNewMove = () => {
    // 새 기술 배우기
    updateTower(towerId, { equippedMoves: [newMove] });
    
    // 큐에서 현재 선택 제거 (큐가 비면 자동으로 게임 재개)
    removeCurrentSkillChoice();
  };

  const handleKeepCurrentMove = () => {
    // 새 기술을 거부한 목록에 추가
    const tower = useGameStore.getState().towers.find(t => t.id === towerId);
    if (tower) {
      const rejectedMoves = [...(tower.rejectedMoves || []), newMove.name];
      updateTower(towerId, { rejectedMoves });
    }
    
    // 기존 기술 유지하고 큐에서 제거 (큐가 비면 자동으로 게임 재개)
    removeCurrentSkillChoice();
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>⭐ {tower.name} (Lv.{tower.level}) 레벨업!</h2>
        </div>
        
        <p style={s.subtitle}>🔄 기술을 교체하시겠습니까?</p>
        
        <div style={s.compareContainer}>
          {/* 현재 기술 */}
          <div style={s.compareSection}>
            <h3 style={s.sectionTitle}>현재 기술</h3>
            <div style={s.cardCurrent}>
              <div style={s.cardHeader}>
                <h3 style={s.moveName}>{currentMove.name}</h3>
                <span style={s.moveType}>{currentMove.type}</span>
              </div>
              <div style={s.cardContent}>
                <div style={s.statRow}>
                  <span>⚔️ 위력</span>
                  <span style={s.statValue}>{currentMove.power}</span>
                </div>
                <div style={s.statRow}>
                  <span>📊 분류</span>
                  <span style={s.statValue}>{currentMove.damageClass === 'physical' ? '물리' : '특수'}</span>
                </div>
                {currentMove.effect.statusInflict && (
                  <div style={s.effectBadge}>
                    💫 {currentMove.effect.statusInflict} ({currentMove.effect.statusChance}%)
                  </div>
                )}
                {currentMove.isAOE && <div style={s.aoeBadge}>🌀 광역기</div>}
              </div>
            </div>
            <button style={s.keepBtn} onClick={handleKeepCurrentMove}>
              ✅ 현재 기술 유지
            </button>
          </div>

          {/* 화살표 */}
          <div style={s.arrowContainer}>
            <div style={s.arrow}>⇄</div>
          </div>

          {/* 새로운 기술 */}
          <div style={s.compareSection}>
            <h3 style={s.sectionTitle}>새로운 기술</h3>
            <div style={s.cardNew}>
              <div style={s.cardHeader}>
                <h3 style={s.moveName}>{newMove.name}</h3>
                <span style={s.moveType}>{newMove.type}</span>
              </div>
              <div style={s.cardContent}>
                <div style={s.statRow}>
                  <span>⚔️ 위력</span>
                  <span style={s.statValue}>{newMove.power}</span>
                </div>
                <div style={s.statRow}>
                  <span>📊 분류</span>
                  <span style={s.statValue}>{newMove.damageClass === 'physical' ? '물리' : '특수'}</span>
                </div>
                {newMove.effect.statusInflict && (
                  <div style={s.effectBadge}>
                    💫 {newMove.effect.statusInflict} ({newMove.effect.statusChance}%)
                  </div>
                )}
                {newMove.isAOE && <div style={s.aoeBadge}>🌀 광역기</div>}
              </div>
            </div>
            <button style={s.learnBtn} onClick={handleLearnNewMove}>
              ⭐ 새 기술 배우기
            </button>
          </div>
        </div>
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
    maxWidth: '1100px',
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
  compareContainer: {
    display: 'flex',
    gap: '32px',
    padding: '0 32px 32px',
    alignItems: 'stretch',
    justifyContent: 'center'
  },
  compareSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'center',
    gap: '16px',
    maxWidth: '400px'
  },
  sectionTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#4cafff',
    margin: 0,
    textAlign: 'center' as 'center'
  },
  arrowContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '60px'
  },
  arrow: {
    fontSize: '48px',
    color: '#9b59b6',
    textShadow: '0 0 20px rgba(155, 89, 182, 0.8)',
    animation: 'pulse 2s ease-in-out infinite'
  },
  cardCurrent: { 
    width: '100%',
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95))',
    border: '2px solid rgba(52, 152, 219, 0.4)',
    borderRadius: '18px', 
    padding: '0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
    overflow: 'hidden'
  },
  cardNew: { 
    width: '100%',
    background: 'linear-gradient(145deg, rgba(60, 40, 80, 0.9), rgba(35, 20, 45, 0.95))',
    border: '2px solid rgba(155, 89, 182, 0.5)',
    borderRadius: '18px', 
    padding: '0',
    boxShadow: '0 8px 24px rgba(155, 89, 182, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
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
  keepBtn: { 
    width: '100%',
    padding: '16px 32px',
    fontSize: '18px',
    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    color: '#fff',
    border: '2px solid rgba(52, 152, 219, 0.4)',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 6px 20px rgba(52, 152, 219, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease'
  },
  learnBtn: { 
    width: '100%',
    padding: '16px 32px',
    fontSize: '18px',
    background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
    color: '#fff',
    border: '2px solid rgba(155, 89, 182, 0.4)',
    borderRadius: '14px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 6px 20px rgba(155, 89, 182, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease'
  },
};