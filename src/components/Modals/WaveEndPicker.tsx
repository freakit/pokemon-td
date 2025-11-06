// src/components/Modals/WaveEndPicker.tsx

import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { Item } from '../../types/game';
export const WaveEndPicker: React.FC = () => {
  const { waveEndItemPick, setWaveEndItemPick, useItem, towers } = useGameStore(state => ({
    waveEndItemPick: state.waveEndItemPick,
    setWaveEndItemPick: state.setWaveEndItemPick,
    useItem: state.useItem,
    towers: state.towers,
  }));
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  if (!waveEndItemPick) return null;
  const handleSelect = (item: Item) => {
    if ((item.type === 'mega-stone' || item.type === 'max-mushroom') && item.targetPokemonId) {
      const targetTower = towers.find(t => t.pokemonId === item.targetPokemonId);
      if (targetTower) {
        
        let evolutionItem: string;
        if (item.type === 'mega-stone') {
          // 메가스톤 아이템 이름에서 실제 아이템 ID 추출
          evolutionItem = item.id.replace('mega_stone_', '');
        } else {
          // evolvePokemon 함수는 'max-mushroom' 문자열을 기대합니다
          evolutionItem = 'max-mushroom';
        }
            
        useGameStore.getState().evolvePokemon(targetTower.id, evolutionItem);
      }
      setWaveEndItemPick(null);
      useGameStore.setState({ isPaused: false });
      return;
    }
    
    // 다른 아이템은 타겟 선택 모드로 전환
    setSelectedItem(item);
  };
  const handleTargetSelect = (towerId: string) => {
    if (!selectedItem) return;
    if (selectedItem.type === 'candy') {
      useItem('candy', towerId);
    } else if (selectedItem.type === 'heal') {
      const tower = towers.find(t => t.id === towerId);
      if (tower && !tower.isFainted) {
        const newHp = Math.min(tower.maxHp, tower.currentHp + (selectedItem.value || 200));
        useGameStore.getState().updateTower(tower.id, { currentHp: newHp });
      }
    } else if (selectedItem.type === 'revive') {
      useItem('revive', towerId);
    }
    
    // 모달 닫기 및 게임 재개
    setSelectedItem(null);
    setWaveEndItemPick(null);
    useGameStore.setState({ isPaused: false });
  };

  const handleCancel = () => {
    setSelectedItem(null);
  };
  // 타겟 선택 모드
  if (selectedItem) {
    return (
      <div style={s.overlay}>
        <div style={s.modal}>
          <div style={s.header}>
            <h2 style={s.title}>🎯 {selectedItem.name} 사용</h2>
          </div>
          <p style={s.subtitle}>
            {selectedItem.type === 'candy' && '레벨을 올릴 포켓몬을 선택하세요'}
            {selectedItem.type === 'heal' && '체력을 회복할 포켓몬을 선택하세요'}
            {selectedItem.type === 'revive' && '부활시킬 포켓몬을 선택하세요'}
          </p>
          <div style={s.towerGrid}>
            {towers.map(tower => {
              const isSelectable = selectedItem.type === 'revive' ? tower.isFainted : !tower.isFainted;
              return (
                <div 
                  key={tower.id} 
                  style={{
                    ...s.towerCard,
                    opacity: isSelectable ? 1 : 0.3,
                    cursor: isSelectable ? 'pointer' : 'not-allowed',
                  }}
                  onClick={() => isSelectable && handleTargetSelect(tower.id)}
                >
                  <img src={tower.sprite} alt={tower.name} style={s.towerImg} />
                  <h4 style={s.towerName}>{tower.name}</h4>
                  <p style={s.towerInfo}>Lv.{tower.level}</p>
                  <p style={s.towerInfo}>HP: {Math.floor(tower.currentHp)}/{tower.maxHp}</p>
                  {tower.isFainted && <p style={s.faintedLabel}>기절</p>}
                </div>
              );
            })}
          </div>
          <button style={s.cancelBtn} onClick={handleCancel}>← 뒤로 가기</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>🎉 웨이브 {useGameStore.getState().wave - 1} 클리어!</h2>
        </div>
        <p style={s.subtitle}>✨ 보상을 선택하세요 (모든 포켓몬의 체력이 회복되었습니다)</p>
        <div style={s.grid}>
          {waveEndItemPick.map((item, idx) => (
            <div 
              key={idx} 
              style={{
                ...s.card,
                border: (item.type === 'mega-stone' || item.type === 'max-mushroom') ? '3px solid #e040fb' : '2px solid rgba(46, 204, 113, 0.4)',
                boxShadow: (item.type === 'mega-stone' || item.type === 'max-mushroom') 
                   ? '0 0 30px rgba(224, 64, 251, 0.8), 0 8px 32px rgba(0,0,0,0.4)' 
                   : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
              onClick={() => handleSelect(item)}
            >
              <div style={s.cardGlow}></div>
              <h3 style={{
                ...s.itemName,
                color: (item.type === 'mega-stone' || item.type === 'max-mushroom') ? '#e040fb' : '#2ecc71',
                textShadow: (item.type === 'mega-stone' || item.type === 'max-mushroom') 
                  ? '0 0 20px rgba(224, 64, 251, 0.8)' 
                  : '0 0 15px rgba(46, 204, 113, 0.6)',
              }}>
                {/* FIX: 다이버섯('max-mushroom')도 '✨' 아이콘 추가 */}
                {(item.type === 'mega-stone' || item.type === 'max-mushroom') && '✨ '}
                {item.name}
              </h3>
              <p style={s.itemEffect}>{item.effect}</p>
            </div>
          ))}
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
    background: 'radial-gradient(circle at center, rgba(46, 204, 113, 0.3), rgba(0,0,0,0.95))',
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
    maxWidth: '1000px', // 🔴 수정: 4개 카드를 위해 넓이 증가
    width: '90%',
    boxShadow: '0 25px 80px rgba(46, 204, 113, 0.5), 0 0 1px 1px rgba(46, 204, 113, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    border: '2px solid rgba(46, 204, 113, 0.3)',
    animation: 'pulse 2s ease-in-out infinite'
  },
  header: {
    padding: '32px',
    background: 'linear-gradient(90deg, rgba(46, 204, 113, 0.2), transparent)',
    borderBottom: '2px solid rgba(46, 204, 113, 0.3)',
    textAlign: 'center' as 'center'
  },
  title: {
    fontSize: '36px',
    fontWeight: '900',
    margin: 0,
    background: 'linear-gradient(135deg, #2ecc71, #a8ffb8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 30px rgba(46, 204, 113, 0.6)',
    letterSpacing: '1px'
  },
  subtitle: {
    fontSize: '18px',
    margin: '24px 32px',
    textAlign: 'center' as 'center',
    color: '#a8b8c8',
    fontWeight: '600'
  },
  grid: { 
    display: 'flex', 
    gap: '20px', // 🔴 수정: 간격 조정
    padding: '0 32px 32px',
    justifyContent: 'center',
    flexWrap: 'wrap' as 'wrap' // 🔴 추가: 반응형 지원
  },
  card: { 
    flex: '1 1 200px', // 🔴 수정: 유연한 크기
    minWidth: '180px',
    maxWidth: '220px',
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95))',
    border: '2px solid rgba(46, 204, 113, 0.4)',
    borderRadius: '20px', 
    padding: '28px 20px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
    position: 'relative' as 'relative',
    overflow: 'hidden',
    textAlign: 'center' as 'center'
  },
  cardGlow: {
    position: 'absolute' as 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background: 'radial-gradient(circle, rgba(46, 204, 113, 0.1) 0%, transparent 70%)',
    animation: 'pulse 3s ease-in-out infinite',
    pointerEvents: 'none' as 'none'
  },
  itemName: {
    fontSize: '22px', // 🔴 수정: 크기 조정
    fontWeight: '700',
    marginBottom: '12px',
    color: '#2ecc71',
    textShadow: '0 0 15px rgba(46, 204, 113, 0.6)',
    position: 'relative' as 'relative',
    zIndex: 1
  },
  itemEffect: {
    fontSize: '14px', // 🔴 수정: 크기 조정
    color: '#a8b8c8',
    lineHeight: '1.6',
    position: 'relative' as 'relative',
    zIndex: 1
  },
  towerGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
    gap: '20px', 
    padding: '24px 32px'
  },
  towerCard: { 
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95))',
    border: '2px solid rgba(52, 152, 219, 0.4)',
    borderRadius: '16px', 
    padding: '20px', 
    textAlign: 'center' as 'center',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
  },
  towerImg: { 
    width: '80px', 
    height: '80px', 
    imageRendering: 'pixelated' as 'pixelated',
    marginBottom: '12px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))'
  },
  towerName: {
    fontSize: '16px',
    fontWeight: '700',
    margin: '8px 0',
    color: '#4cafff',
    textTransform: 'capitalize' as 'capitalize'
  },
  towerInfo: {
    fontSize: '14px',
    margin: '4px 0',
    color: '#a8b8c8'
  },
  faintedLabel: {
    color: '#e74c3c', 
    fontWeight: 'bold' as 'bold',
    fontSize: '14px',
    marginTop: '8px'
  },
  cancelBtn: { 
    width: 'calc(100% - 64px)',
    margin: '24px 32px 32px',
    padding: '16px', 
    fontSize: '18px', 
    background: 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)',
    color: '#fff', 
    border: '2px solid rgba(149, 165, 166, 0.4)',
    borderRadius: '14px', 
    cursor: 'pointer', 
    fontWeight: 'bold' as 'bold',
    boxShadow: '0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
  }
};