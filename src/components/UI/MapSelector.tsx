// src/components/UI/MapSelector.tsx

import React, { useState } from 'react';
import { MAPS, MapData } from '../../data/maps';
import { useGameStore } from '../../store/gameStore';
import { Difficulty } from '../../types/game';

type DifficultyFilter = 'easy' | 'medium' | 'hard' | 'expert';

export const MapSelector: React.FC<{ onSelect: () => void }> = ({ onSelect }) => {
  const setMap = useGameStore(s => s.setMap);
  const setDifficulty = useGameStore(s => s.setDifficulty);
  const [selectedFilter, setSelectedFilter] = useState<DifficultyFilter | null>(null);
  
  const handleDifficultyFilter = (difficulty: DifficultyFilter) => {
    setSelectedFilter(difficulty);
    // Difficulty 타입 매핑 ('medium' -> 'normal')
    const gameDifficulty: Difficulty = difficulty === 'medium' ? 'normal' : difficulty as Difficulty;
    setDifficulty(gameDifficulty);
  };
  
  const handleSelect = (map: MapData) => {
    setMap(map.id);
    // Difficulty 타입 매핑
    const gameDifficulty: Difficulty = map.difficulty === 'medium' ? 'normal' : map.difficulty as Difficulty;
    setDifficulty(gameDifficulty);
    onSelect();
  };
  
  // 필터링된 맵
  const filteredMaps = selectedFilter 
    ? MAPS.filter(map => map.difficulty === selectedFilter)
    : MAPS;
  
  // 난이도 배지 색상
  const getDifficultyColor = (diff: string) => {
    switch(diff) {
      case 'easy': return { bg: 'rgba(46, 204, 113, 0.2)', border: '#2ecc71', color: '#2ecc71', glow: 'rgba(46, 204, 113, 0.4)' };
      case 'medium': return { bg: 'rgba(52, 152, 219, 0.2)', border: '#3498db', color: '#3498db', glow: 'rgba(52, 152, 219, 0.4)' };
      case 'hard': return { bg: 'rgba(243, 156, 18, 0.2)', border: '#f39c12', color: '#f39c12', glow: 'rgba(243, 156, 18, 0.4)' };
      case 'expert': return { bg: 'rgba(231, 76, 60, 0.2)', border: '#e74c3c', color: '#e74c3c', glow: 'rgba(231, 76, 60, 0.4)' };
      default: return { bg: 'rgba(149, 165, 166, 0.2)', border: '#95a5a6', color: '#95a5a6', glow: 'rgba(149, 165, 166, 0.4)' };
    }
  };

  // 배경 타입 이모지
  const getBackgroundEmoji = (bgType: string) => {
    switch(bgType) {
      case 'grass': return '🌿';
      case 'desert': return '🏜️';
      case 'snow': return '❄️';
      case 'cave': return '🌋';
      case 'water': return '🌊';
      default: return '🗺️';
    }
  };
  
  return (
    <div style={s.fullscreen}>
      <div style={s.container}>
        {/* 타이틀 */}
        <div style={s.titleSection}>
          <h1 style={s.mainTitle}>🎮 포켓몬 타워 디펜스</h1>
          <p style={s.subtitle}>맵을 선택하여 모험을 시작하세요!</p>
        </div>
        
        {/* 난이도 필터 */}
        <div style={s.difficultySelector}>
          <button 
            onClick={() => setSelectedFilter(null)} 
            style={{
              ...s.diffBtn,
              ...(selectedFilter === null ? s.diffBtnActive : {}),
            }}
          >
            전체
          </button>
          <button 
            onClick={() => handleDifficultyFilter('easy')} 
            style={{
              ...s.diffBtn,
              ...s.diffBtnEasy,
              ...(selectedFilter === 'easy' ? s.diffBtnActive : {}),
            }}
          >
            🟢 쉬움
          </button>
          <button 
            onClick={() => handleDifficultyFilter('medium')} 
            style={{
              ...s.diffBtn,
              ...s.diffBtnMedium,
              ...(selectedFilter === 'medium' ? s.diffBtnActive : {}),
            }}
          >
            🔵 보통
          </button>
          <button 
            onClick={() => handleDifficultyFilter('hard')} 
            style={{
              ...s.diffBtn,
              ...s.diffBtnHard,
              ...(selectedFilter === 'hard' ? s.diffBtnActive : {}),
            }}
          >
            🟠 어려움
          </button>
          <button 
            onClick={() => handleDifficultyFilter('expert')} 
            style={{
              ...s.diffBtn,
              ...s.diffBtnExpert,
              ...(selectedFilter === 'expert' ? s.diffBtnActive : {}),
            }}
          >
            🔴 전문가
          </button>
        </div>
        
        {/* 맵 그리드 */}
        <div style={s.grid}>
          {filteredMaps.map(map => {
            const diffColor = getDifficultyColor(map.difficulty);
            return (
              <div 
                key={map.id} 
                style={s.card} 
                onClick={() => handleSelect(map)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                  e.currentTarget.style.boxShadow = `0 20px 40px ${diffColor.glow}, 0 0 20px ${diffColor.glow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4)`;
                }}
              >
                <div style={s.cardGlow}></div>
                <div style={s.cardHeader}>
                  <span style={s.bgEmoji}>{getBackgroundEmoji(map.backgroundType)}</span>
                  <div 
                    style={{
                      ...s.difficultyBadge,
                      background: diffColor.bg,
                      border: `2px solid ${diffColor.border}`,
                      color: diffColor.color,
                      boxShadow: `0 0 10px ${diffColor.glow}`,
                    }}
                  >
                    {map.difficulty === 'easy' && '쉬움'}
                    {map.difficulty === 'medium' && '보통'}
                    {map.difficulty === 'hard' && '어려움'}
                    {map.difficulty === 'expert' && '전문가'}
                  </div>
                </div>
                <h3 style={s.mapName}>{map.name}</h3>
                <p style={s.mapDescription}>{map.description}</p>
                <div style={s.cardFooter}>
                  <span style={s.unlockText}>웨이브 {map.unlockWave}+ 필요</span>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredMaps.length === 0 && (
          <div style={s.emptyState}>
            <p style={s.emptyText}>해당 난이도의 맵이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 게임스러운 UI 스타일
const s: Record<string, React.CSSProperties> = {
  fullscreen: {
    position: 'fixed' as 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(ellipse at top, #1a2332 0%, #0f1419 50%, #000000 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'auto',
    padding: '40px 20px',
  },
  container: { 
    maxWidth: '1400px',
    width: '100%',
    animation: 'fadeIn 0.5s ease-out',
  },
  titleSection: {
    textAlign: 'center' as 'center',
    marginBottom: '48px',
  },
  mainTitle: { 
    fontSize: '56px',
    fontWeight: '900',
    margin: '0 0 16px 0',
    background: 'linear-gradient(135deg, #4cafff 0%, #00d4ff 50%, #4cafff 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 40px rgba(76, 175, 255, 0.6)',
    letterSpacing: '2px',
    animation: 'pulse 3s ease-in-out infinite',
  },
  subtitle: {
    fontSize: '20px',
    color: '#a8b8c8',
    fontWeight: '600',
    margin: 0,
  },
  difficultySelector: { 
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginBottom: '48px',
    flexWrap: 'wrap' as 'wrap',
  },
  diffBtn: { 
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: 'bold',
    border: '2px solid rgba(76, 175, 255, 0.3)',
    borderRadius: '16px',
    cursor: 'pointer',
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.8), rgba(15, 20, 35, 0.9))',
    color: '#e8edf3',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)',
  },
  diffBtnEasy: {
    border: '2px solid rgba(46, 204, 113, 0.4)',
  },
  diffBtnMedium: {
    border: '2px solid rgba(52, 152, 219, 0.4)',
  },
  diffBtnHard: {
    border: '2px solid rgba(243, 156, 18, 0.4)',
  },
  diffBtnExpert: {
    border: '2px solid rgba(231, 76, 60, 0.4)',
  },
  diffBtnActive: {
    transform: 'scale(1.05)',
    boxShadow: '0 8px 25px rgba(76, 175, 255, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
    background: 'linear-gradient(135deg, rgba(76, 175, 255, 0.3), rgba(76, 175, 255, 0.1))',
  },
  grid: { 
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '32px',
  },
  card: { 
    background: 'linear-gradient(145deg, rgba(26, 35, 50, 0.9), rgba(15, 20, 25, 0.95))',
    border: '2px solid rgba(76, 175, 255, 0.3)',
    borderRadius: '24px',
    padding: '32px',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    position: 'relative' as 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
  },
  cardGlow: {
    position: 'absolute' as 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(76, 175, 255, 0.08) 0%, transparent 70%)',
    animation: 'pulse 4s ease-in-out infinite',
    pointerEvents: 'none' as 'none',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    position: 'relative' as 'relative',
    zIndex: 1,
  },
  bgEmoji: {
    fontSize: '48px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))',
  },
  difficultyBadge: {
    padding: '8px 16px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as 'uppercase',
    letterSpacing: '1px',
  },
  mapName: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#e8edf3',
    margin: '0 0 12px 0',
    position: 'relative' as 'relative',
    zIndex: 1,
    textShadow: '0 2px 4px rgba(0,0,0,0.6)',
  },
  mapDescription: {
    fontSize: '16px',
    color: '#a8b8c8',
    lineHeight: '1.6',
    margin: '0 0 20px 0',
    position: 'relative' as 'relative',
    zIndex: 1,
  },
  cardFooter: {
    borderTop: '1px solid rgba(76, 175, 255, 0.2)',
    paddingTop: '16px',
    position: 'relative' as 'relative',
    zIndex: 1,
  },
  unlockText: {
    fontSize: '14px',
    color: '#7f8c8d',
    fontWeight: '600',
  },
  emptyState: {
    textAlign: 'center' as 'center',
    padding: '60px 20px',
  },
  emptyText: {
    fontSize: '20px',
    color: '#7f8c8d',
    fontWeight: '600',
  },
};