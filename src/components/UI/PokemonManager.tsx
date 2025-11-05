// src/components/UI/PokemonManager.tsx

import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Gender } from '../../types/game';
import { FUSION_DATA } from '../../data/evolution';

// 성별 아이콘
const getGenderIcon = (gender: Gender) => {
  if (gender === 'male') return '♂';
  if (gender === 'female') return '♀';
  return '⚪';
};

// 성별 색상
const getGenderColor = (gender: Gender) => {
  if (gender === 'male') return '#4A90E2';
  if (gender === 'female') return '#E91E63';
  return '#999';
};

export const PokemonManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { towers, sellTower, fusePokemon, spendMoney, money } = useGameStore(state => ({
    towers: state.towers,
    sellTower: state.sellTower,
    fusePokemon: state.fusePokemon,
    spendMoney: state.spendMoney,
    money: state.money,
  }));

  const [fusionMode, setFusionMode] = useState(false);
  const [selectedBase, setSelectedBase] = useState<string | null>(null);

  const handleSell = (towerId: string, towerName: string, level: number) => {
    const sellPrice = level * 20;
    const confirmed = window.confirm(
      `${towerName} (Lv.${level})을(를) ${sellPrice}원에 판매하시겠습니까?`
    );
    
    if (confirmed) {
      sellTower(towerId);
    }
  };

  const handleFusionClick = () => {
    setFusionMode(!fusionMode);
    setSelectedBase(null);
  };

  const handlePokemonClick = (towerId: string) => {
    if (!fusionMode) return;

    const tower = towers.find(t => t.id === towerId);
    if (!tower) return;

    if (!selectedBase) {
      // 첫 번째 선택: 베이스 포켓몬
      const canBeBase = FUSION_DATA.some(f => f.base === tower.pokemonId);
      if (!canBeBase) {
        alert('이 포켓몬은 합체의 베이스가 될 수 없습니다.');
        return;
      }
      setSelectedBase(towerId);
    } else {
      // 두 번째 선택: 재료 포켓몬
      if (selectedBase === towerId) {
        alert('같은 포켓몬을 선택할 수 없습니다.');
        return;
      }

      const baseTower = towers.find(t => t.id === selectedBase);
      const materialTower = tower;

      if (!baseTower) {
        setSelectedBase(null);
        return;
      }

      // 합체 가능한지 확인
      const fusion = FUSION_DATA.find(f => 
        f.base === baseTower.pokemonId && 
        f.material === materialTower.pokemonId &&
        f.item === 'dna-splicers'
      );

      if (!fusion) {
        alert('이 두 포켓몬은 합체할 수 없습니다.');
        setSelectedBase(null);
        return;
      }

      // 합체 확인
      const fusionCost = 500; // 유전자 쐐기 비용
      const confirmed = window.confirm(
        `${baseTower.name}와 ${materialTower.name}를 합체하시겠습니까?\n비용: ${fusionCost}원\n(${materialTower.name}는 소멸됩니다)`
      );

      if (confirmed) {
        if (!spendMoney(fusionCost)) {
          alert(`돈이 부족합니다! (필요: ${fusionCost}원)`);
          setSelectedBase(null);
          return;
        }

        fusePokemon(selectedBase, towerId, 'dna-splicers').then(success => {
          if (success) {
            alert('합체 성공!');
          } else {
            alert('합체 실패!');
          }
          setFusionMode(false);
          setSelectedBase(null);
        });
      } else {
        setSelectedBase(null);
      }
    }
  };

  // 합체 가능한 포켓몬 쌍 찾기
  const getFusionHint = (towerId: string) => {
    const tower = towers.find(t => t.id === towerId);
    if (!tower) return null;

    // 이 포켓몬이 베이스가 될 수 있는 경우
    const asBase = FUSION_DATA.filter(f => f.base === tower.pokemonId);
    if (asBase.length > 0) {
      const materialIds = asBase.map(f => f.material);
      const availableMaterials = towers.filter(t => materialIds.includes(t.pokemonId));
      if (availableMaterials.length > 0) {
        return '🧬';
      }
    }

    // 이 포켓몬이 재료가 될 수 있는 경우
    const asMaterial = FUSION_DATA.filter(f => f.material === tower.pokemonId);
    if (asMaterial.length > 0) {
      const baseIds = asMaterial.map(f => f.base);
      const availableBases = towers.filter(t => baseIds.includes(t.pokemonId));
      if (availableBases.length > 0) {
        return '🧬';
      }
    }

    return null;
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <div>
            <h2 style={s.title}>🎒 포켓몬 관리 ({towers.length}/6)</h2>
            <div style={s.moneyDisplay}>💰 {money}원</div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={handleFusionClick} 
              style={{
                ...s.fusionBtn,
                background: fusionMode ? '#e74c3c' : 'linear-gradient(135deg, #667eea, #764ba2)'
              }}
            >
              {fusionMode ? '❌ 취소' : '🧬 합체'}
            </button>
            <button onClick={onClose} style={s.closeBtn}>✕</button>
          </div>
        </div>
        
        {fusionMode && (
          <div style={s.fusionInfo}>
            {!selectedBase ? (
              <p>🧬 합체할 베이스 포켓몬을 선택하세요 (큐레무, 네크로즈마, 버드렉스) | 비용: 500원</p>
            ) : (
              <p>🧬 합체할 재료 포켓몬을 선택하세요 | 비용: 500원</p>
            )}
          </div>
        )}
        
        {towers.length === 0 ? (
          <p style={s.emptyMessage}>보유 중인 포켓몬이 없습니다.</p>
        ) : (
          <div style={s.grid}>
            {towers.map(tower => {
              const sellPrice = tower.level * 20;
              const hpPercent = Math.round((tower.currentHp / tower.maxHp) * 100);
              const fusionHint = getFusionHint(tower.id);
              const isSelected = selectedBase === tower.id;
              
              return (
                <div 
                  key={tower.id} 
                  style={{
                    ...s.card,
                    border: isSelected ? '3px solid #667eea' : '2px solid rgba(255, 255, 255, 0.1)',
                    cursor: fusionMode ? 'pointer' : 'default',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                  }}
                  onClick={() => handlePokemonClick(tower.id)}
                >
                  <div style={s.cardHeader}>
                    <img src={tower.sprite} alt={tower.name} style={s.img} />
                    {tower.isFainted && (
                      <div style={s.faintedBadge}>기절</div>
                    )}
                    {fusionHint && fusionMode && (
                      <div style={s.fusionBadge}>{fusionHint}</div>
                    )}
                  </div>
                  
                  <div style={s.cardBody}>
                    <div style={s.nameRow}>
                      <h3 style={s.pokeName}>{tower.name}</h3>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: getGenderColor(tower.gender),
                      }}>
                        {getGenderIcon(tower.gender)}
                      </span>
                    </div>
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
                  
                  {!fusionMode && (
                    <button 
                      style={s.sellBtn} 
                      onClick={() => handleSell(tower.id, tower.name, tower.level)}
                    >
                      💰 판매 ({sellPrice}원)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

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
    background: 'linear-gradient(145deg, #2a2d3a, #1f2029)', 
    borderRadius: '20px', 
    padding: '30px',
    maxWidth: '1000px',
    width: '95%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '20px'
  },
  title: { 
    fontSize: '28px', 
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '5px',
  },
  moneyDisplay: {
    fontSize: '16px',
    color: '#FFD700',
    fontWeight: 'bold',
  },
  fusionBtn: {
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  closeBtn: { 
    fontSize: '24px', 
    background: 'none', 
    border: 'none', 
    color: '#fff', 
    cursor: 'pointer',
    padding: '5px 10px',
    borderRadius: '5px',
    transition: 'background 0.2s',
  },
  fusionInfo: {
    background: 'rgba(102, 126, 234, 0.2)',
    padding: '15px',
    borderRadius: '10px',
    marginBottom: '20px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyMessage: {
    fontSize: '18px',
    color: '#999',
    textAlign: 'center',
    padding: '40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '15px',
    padding: '15px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    transition: 'all 0.3s ease',
  },
  cardHeader: {
    position: 'relative',
    textAlign: 'center',
    marginBottom: '15px',
  },
  img: {
    width: '100px',
    height: '100px',
    imageRendering: 'pixelated',
  },
  faintedBadge: {
    position: 'absolute',
    top: '5px',
    right: '5px',
    background: '#e74c3c',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '4px 8px',
    borderRadius: '8px',
  },
  fusionBadge: {
    position: 'absolute',
    top: '5px',
    left: '5px',
    fontSize: '24px',
  },
  cardBody: {
    marginBottom: '15px',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  pokeName: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '14px',
  },
  infoValue: {
    fontWeight: 'bold',
    color: '#FFD700',
  },
  sellBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};