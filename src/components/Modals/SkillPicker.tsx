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
    
    // 큐에서 현재 선택 제거
    removeCurrentSkillChoice();
  };

  const handleKeepCurrentMove = () => {
    // 새 기술을 거부한 목록에 추가
    const tower = useGameStore.getState().towers.find(t => t.id === towerId);
    if (tower) {
      const rejectedMoves = [...(tower.rejectedMoves || []), newMove.name];
      updateTower(towerId, { rejectedMoves });
    }
    
    // 기존 기술 유지하고 큐에서 제거
    removeCurrentSkillChoice();
  };

  const translateDamageClass = (dc: string) => {
    switch (dc) {
      case 'physical': return '물리';
      case 'special': return '특수';
    }
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h3 style={s.title}>⭐ 레벨업!</h3>
        <div style={s.pokemonName}>{tower.name} (Lv.{tower.level})</div>
      </div>
      
      <div style={s.subtitle}>🔄 기술 교체</div>
      
      <div style={s.skillSection}>
        <div style={s.sectionLabel}>현재 기술</div>
        <div style={s.skillCard}>
          <div style={s.skillName}>{currentMove.name} | {translateDamageClass(currentMove.damageClass)}</div>
          <div style={s.skillStats}>
            <div style={s.statRow}>
              <span>⚔️</span>
              <span>{currentMove.power}</span>
            </div>
            <div style={s.statRow}>
              <span>🎯</span>
              <span>{currentMove.accuracy}%</span>
            </div>
          </div>
          <div style={s.skillType}>{currentMove.type}</div>
          {currentMove.effect.statusInflict && (
            <div style={s.effectBadge}>
              💫 {currentMove.effect.statusInflict}
            </div>
          )}
          {currentMove.isAOE && <div style={s.aoeBadge}>🌀 광역</div>}
        </div>
        <button style={s.keepBtn} onClick={handleKeepCurrentMove}>
          ✅ 유지
        </button>
      </div>

      <div style={s.arrow}>⇅</div>

      <div style={s.skillSection}>
        <div style={s.sectionLabel}>새 기술</div>
        <div style={{...s.skillCard, ...s.newSkillCard}}>
          <div style={s.skillName}>{newMove.name} | {translateDamageClass(newMove.damageClass)}</div>
          <div style={s.skillStats}>
            <div style={s.statRow}>
              <span>⚔️</span>
              <span>{newMove.power}</span>
            </div>
            <div style={s.statRow}>
              <span>🎯</span>
              <span>{newMove.accuracy}%</span>
            </div>
          </div>
          <div style={s.skillType}>{newMove.type}</div>
          {newMove.effect.statusInflict && (
            <div style={s.effectBadge}>
              💫 {newMove.effect.statusInflict}
            </div>
          )}
          {newMove.isAOE && <div style={s.aoeBadge}>🌀 광역</div>}
        </div>
        <button style={s.learnBtn} onClick={handleLearnNewMove}>
          ⭐ 배우기
        </button>
      </div>

      {skillChoiceQueue.length > 1 && (
        <div style={s.queueInfo}>
          대기 중: {skillChoiceQueue.length - 1}개
        </div>
      )}
    </div>
  );
};

// 좌측 사이드바 스타일
const s: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed' as 'fixed',
    left: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '280px',
    maxHeight: '80vh',
    overflowY: 'auto' as 'auto',
    background: 'linear-gradient(145deg, rgba(26, 31, 46, 0.98), rgba(15, 20, 25, 0.98))',
    border: '3px solid rgba(155, 89, 182, 0.5)',
    borderRadius: '20px',
    padding: '16px',
    boxShadow: '0 20px 60px rgba(155, 89, 182, 0.4), 0 0 2px 1px rgba(155, 89, 182, 0.3)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    animation: 'slideInLeft 0.3s ease-out',
  },
  header: {
    textAlign: 'center' as 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '2px solid rgba(155, 89, 182, 0.3)',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
    color: '#9b59b6',
    textShadow: '0 0 10px rgba(155, 89, 182, 0.6)',
  },
  pokemonName: {
    fontSize: '14px',
    color: '#a8b8c8',
    fontWeight: '600',
  },
  subtitle: {
    fontSize: '14px',
    textAlign: 'center' as 'center',
    color: '#4cafff',
    marginBottom: '12px',
    fontWeight: '600',
  },
  skillSection: {
    marginBottom: '12px',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#4cafff',
    marginBottom: '8px',
    textTransform: 'uppercase' as 'uppercase',
  },
  skillCard: {
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95))',
    border: '2px solid rgba(52, 152, 219, 0.4)',
    borderRadius: '12px',
    padding: '12px',
    marginBottom: '8px',
  },
  newSkillCard: {
    border: '2px solid rgba(155, 89, 182, 0.5)',
    boxShadow: '0 0 15px rgba(155, 89, 182, 0.3)',
  },
  skillName: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#4cafff',
    marginBottom: '8px',
    textTransform: 'capitalize' as 'capitalize',
  },
  skillStats: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#e8edf3',
    fontWeight: '600',
  },
  skillType: {
    display: 'inline-block',
    fontSize: '10px',
    padding: '3px 8px',
    background: 'rgba(76, 175, 255, 0.2)',
    borderRadius: '6px',
    border: '1px solid rgba(76, 175, 255, 0.3)',
    textTransform: 'uppercase' as 'uppercase',
    fontWeight: '600',
    marginBottom: '6px',
  },
  effectBadge: {
    padding: '4px 8px',
    background: 'rgba(155, 89, 182, 0.2)',
    borderRadius: '6px',
    border: '1px solid rgba(155, 89, 182, 0.3)',
    fontSize: '11px',
    marginTop: '4px',
    fontWeight: '600',
  },
  aoeBadge: {
    padding: '4px 8px',
    background: 'rgba(243, 156, 18, 0.2)',
    borderRadius: '6px',
    border: '1px solid rgba(243, 156, 18, 0.3)',
    fontSize: '11px',
    marginTop: '4px',
    fontWeight: '600',
  },
  keepBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    color: '#fff',
    border: '2px solid rgba(52, 152, 219, 0.4)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
    transition: 'all 0.2s ease',
  },
  learnBtn: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
    color: '#fff',
    border: '2px solid rgba(155, 89, 182, 0.4)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(155, 89, 182, 0.4)',
    transition: 'all 0.2s ease',
  },
  arrow: {
    textAlign: 'center' as 'center',
    fontSize: '24px',
    color: '#9b59b6',
    margin: '8px 0',
    textShadow: '0 0 10px rgba(155, 89, 182, 0.6)',
  },
  queueInfo: {
    textAlign: 'center' as 'center',
    fontSize: '11px',
    color: '#a8b8c8',
    marginTop: '12px',
    padding: '6px',
    background: 'rgba(155, 89, 182, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(155, 89, 182, 0.2)',
  },
};