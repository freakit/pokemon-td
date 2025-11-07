// src/components/UI/SynergyTracker.tsx
import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { TYPE_NAMES } from '../../utils/synergyManager';

/**
 * 타입 아이콘을 불러올 API (Serebii.net URL로 통일)
 */
const TYPE_ICON_API_BASE = 'https://www.serebii.net/pokedex-bw/type/';

/**
 * 시너지 ID를 기반으로 아이콘/이미지 URL과 이름을 반환
 */
const getSynergyStyle = (id: string) => {
  const [type, value] = id.split(':');
  
  if (type === 'type') {
    return { 
      icon: null, // 타입은 텍스트 아이콘 대신 이미지 사용
      imageUrl: `${TYPE_ICON_API_BASE}${value}.gif`, // API URL 및 .gif 확장자
      name: TYPE_NAMES[value] || value 
    };
  }
  
  if (type === 'gen') {
    return { 
      icon: 'G' + value, // 세대는 텍스트 아이콘 유지
      imageUrl: null, 
      name: `${value}세대` 
    };
  }
  
  return { icon: '?', imageUrl: null, name: id };
}

export const SynergyTracker: React.FC = () => {
  // 🆕 setHoveredSynergy 액션 가져오기
  const { activeSynergies, setHoveredSynergy } = useGameStore(state => ({
    activeSynergies: state.activeSynergies,
    setHoveredSynergy: state.setHoveredSynergy,
  }));

  if (!activeSynergies || activeSynergies.length === 0) {
    return null;
  }
  
  // 레벨(중요도)이 높은 순, 그다음 개수 순으로 정렬
  const sortedSynergies = [...activeSynergies].sort((a, b) => {
    if (b.level !== a.level) {
      return b.level - a.level;
    }
    return b.count - a.count;
  });

  return (
    // 🆕 메인 컨테이너에 onMouseLeave 이벤트 추가
    <div style={s.container} onMouseLeave={() => setHoveredSynergy(null)}>
      <h3 style={s.title}>💎 현재 시너지</h3>
      <div style={s.list}>
        {sortedSynergies.map(syn => {
          const styleInfo = getSynergyStyle(syn.id);
          const activeStyle = syn.level === 1 ? s.synergyLevel1 : (syn.level === 2 ? s.synergyLevel2 : s.synergyLevel3);
          
          return (
            // 🆕 시너지 아이템에 onMouseEnter 이벤트 추가
            <div 
              key={syn.id} 
              style={{...s.synergyItem, ...activeStyle}}
              onMouseEnter={() => setHoveredSynergy(syn)}
            >
              
              {/* 🆕 아이콘 렌더링 분기: imageUrl이 있으면 img, 없으면 div */}
              {styleInfo.imageUrl ? (
                <img 
                  src={styleInfo.imageUrl} 
                  alt={styleInfo.name} 
                  style={s.synergyImage}
                />
              ) : (
                <div style={s.synergyIcon}>{styleInfo.icon}</div>
              )}

              <div style={s.synergyInfo}>
                <div style={s.synergyName}>{styleInfo.name} ({syn.count})</div>
                <div style={s.synergyDesc}>{syn.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// SkillPicker와 유사한 스타일 사용
const s: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed' as 'fixed',
    left: '16px',
    top: '16px', // 화면 좌측 상단
    width: '280px',
    maxHeight: '45vh',
    overflowY: 'auto' as 'auto',
    background: 'linear-gradient(145deg, rgba(26, 31, 46, 0.95), rgba(15, 20, 25, 0.95))',
    border: '3px solid rgba(76, 175, 255, 0.4)',
    borderRadius: '20px',
    padding: '16px',
    boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    zIndex: 999,
    animation: 'slideInLeft 0.3s ease-out',
    transform: 'translateY(0)', // slideInLeft의 Y축 변환 무시
  },
  title: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4cafff',
    textAlign: 'center' as 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '2px solid rgba(76, 175, 255, 0.2)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '10px',
  },
  synergyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
  },
  synergyLevel1: { // 2-piece (Bronze)
    background: 'rgba(30, 40, 60, 0.7)',
    border: '1px solid rgba(205, 127, 50, 0.5)',
    opacity: 0.8,
  },
  synergyLevel2: { // 4-piece (Silver/Gold)
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95))',
    border: '1px solid rgba(76, 175, 255, 0.7)',
    boxShadow: '0 0 10px rgba(76, 175, 255, 0.2)',
    opacity: 1.0,
  },
  synergyLevel3: { // 6-piece (Prismatic)
    background: 'linear-gradient(145deg, rgba(40, 30, 60, 0.9), rgba(25, 15, 35, 0.95))',
    border: '1px solid rgba(155, 89, 182, 0.8)',
    boxShadow: '0 0 15px rgba(155, 89, 182, 0.4)',
    opacity: 1.0,
  },
  synergyIcon: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#4cafff',
    flexShrink: 0,
    width: '64px', // 크기 증가
    height: '14px', // 크기 증가
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as 'center',
  },
  synergyImage: {
    width: '64px', // 크기 증가
    height: '14px', // 크기 증가
    flexShrink: 0,
    objectFit: 'contain',
    alignSelf: 'center',
  },
  synergyInfo: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '2px',
  },
  synergyName: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#e8edf3',
  },
  synergyDesc: {
    fontSize: '11px',
    color: '#a8b8c8',
    lineHeight: 1.3,
  },
};