// src/components/UI/SynergyDetails.tsx
import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { getGenerationById } from '../../utils/synergyManager';
import { GamePokemon } from '../../types/game';

export const SynergyDetails: React.FC = () => {
  const { hoveredSynergy, towers } = useGameStore(state => ({
    hoveredSynergy: state.hoveredSynergy,
    towers: state.towers,
  }));

  // 마우스를 올린 시너지가 없으면 툴팁을 렌더링하지 않습니다.
  if (!hoveredSynergy) {
    return null;
  }

  // 시너지 ID를 분석 (e.g., 'type:fire' -> ['type', 'fire'])
  const [type, value] = hoveredSynergy.id.split(':');
  
  // 기절하지 않은 포켓몬만 필터링
  const activeTowers = towers.filter(t => !t.isFainted);
  let matchingPokemon: GamePokemon[] = [];

  // 시너지 타입에 따라 포켓몬 필터링
  if (type === 'type') {
    matchingPokemon = activeTowers.filter(t => t.types.includes(value));
  } else if (type === 'gen') {
    matchingPokemon = activeTowers.filter(t => getGenerationById(t.pokemonId) === Number(value));
  }

  return (
    <div style={s.container}>
      <h4 style={s.title}>{hoveredSynergy.name} ({hoveredSynergy.count})</h4>
      <div style={s.list}>
        {matchingPokemon.length > 0 ? (
          matchingPokemon.map(pokemon => (
            <div key={pokemon.id} style={s.pokemonItem}>
              <img src={pokemon.sprite} alt={pokemon.name} style={s.sprite} />
              <span style={s.name}>{pokemon.name} (Lv.{pokemon.level})</span>
            </div>
          ))
        ) : (
          // 이 경우는 거의 없어야 하지만 (시너지가 1 이상이므로) 예외 처리
          <p style={s.empty}>적용 중인 포켓몬이 없습니다.</p>
        )}
      </div>
    </div>
  );
};

// SynergyTracker 우측에 표시되도록 스타일 설정
const s: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed' as 'fixed',
    left: '304px', // 16px (tracker left) + 280px (tracker width) + 8px (gap)
    top: '16px',
    width: '240px',
    maxHeight: '45vh',
    overflowY: 'auto' as 'auto',
    background: 'linear-gradient(145deg, rgba(26, 31, 46, 0.98), rgba(15, 20, 25, 0.98))',
    border: '3px solid rgba(155, 89, 182, 0.5)', // 보라색 테두리
    borderRadius: '20px',
    padding: '16px',
    boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    zIndex: 998, // Tracker(999) 바로 아래
    animation: 'fadeIn 0.2s ease-out',
  },
  title: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#9b59b6', // 보라색
    textAlign: 'center' as 'center',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '2px solid rgba(155, 89, 182, 0.3)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '8px',
  },
  pokemonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0,0,0,0.2)',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  sprite: {
    width: '40px',
    height: '40px',
    imageRendering: 'pixelated' as 'pixelated',
  },
  name: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#e8edf3',
  },
  empty: {
    fontSize: '13px',
    color: '#a8b8c8',
    textAlign: 'center' as 'center',
    padding: '10px 0',
  },
};