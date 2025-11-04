// src/components/UI/Shop.tsx

import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { canEvolveWithItem } from '../../data/evolution';
import { EVOLUTION_ITEMS, EVOLUTION_ITEMS_BY_CATEGORY, EvolutionItem } from '../../data/evolutionItems';

type ItemMode = 'none' | 'potion' | 'potion_good' | 'potion_super' | 'candy' | 'revive' | 'exp_candy' | string;
type ShopTab = 'general' | 'evolution';

export const Shop: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { money, spendMoney, useItem, towers, evolvePokemon, isWaveActive } = useGameStore(state => ({
    money: state.money,
    spendMoney: state.spendMoney,
    useItem: state.useItem,
    towers: state.towers,
    evolvePokemon: state.evolvePokemon,
    isWaveActive: state.isWaveActive,
  }));

  const [itemMode, setItemMode] = useState<ItemMode>('none');
  const [selectedCost, setSelectedCost] = useState(0);
  const [activeTab, setActiveTab] = useState<ShopTab>('general');

  const handleBuyPotion = () => {
    if (spendMoney(20)) {
      setItemMode('potion');
      setSelectedCost(20);
    } else {
      alert('돈이 부족합니다!');
    }
  };

  const handleBuyPotionGood = () => {
    if (spendMoney(100)) {
      setItemMode('potion_good');
      setSelectedCost(100);
    } else {
      alert('돈이 부족합니다!');
    }
  };

  const handleBuyPotionSuper = () => {
    if (spendMoney(500)) {
      setItemMode('potion_super');
      setSelectedCost(500);
    } else {
      alert('돈이 부족합니다!');
    }
  };

  const handleBuyCandy = () => {
    setItemMode('candy');
    setSelectedCost(0);
  };

  const handleBuyRevive = () => {
    setItemMode('revive');
    setSelectedCost(0);
  };

  const handleBuyExpCandy = () => {
    setItemMode('exp_candy');
    setSelectedCost(0);
  };

  const handleBuyEvolutionItem = (item: EvolutionItem) => {
    const cost = item.price;
    if (spendMoney(cost)) {
      setItemMode(item.id);
      setSelectedCost(cost);
    } else {
      alert('돈이 부족합니다!');
    }
  };

  const handleTargetSelect = async (towerId: string) => {
    if (itemMode === 'potion' || itemMode === 'potion_good' || itemMode === 'potion_super') {
      const success = useItem(itemMode, towerId);
      if (success) {
        setItemMode('none');
        setSelectedCost(0);
      } else {
        alert('해당 아이템을 사용할 수 없는 대상입니다.');
        useGameStore.getState().addMoney(selectedCost);
        setItemMode('none');
        setSelectedCost(0);
      }
    } else if (itemMode === 'revive') {
      const tower = towers.find(t => t.id === towerId);
      if (!tower) {
        alert('대상을 찾을 수 없습니다.');
        setItemMode('none');
        return;
      }
      
      const reviveCost = tower.level * 10;
      if (spendMoney(reviveCost)) {
        const success = useItem('revive', towerId);
        if (success) {
          setItemMode('none');
          setSelectedCost(0);
        } else {
          alert('해당 아이템을 사용할 수 없는 대상입니다.');
          useGameStore.getState().addMoney(reviveCost);
          setItemMode('none');
          setSelectedCost(0);
        }
      } else {
        alert(`돈이 부족합니다! (필요: ${reviveCost}원)`);
        setItemMode('none');
        setSelectedCost(0);
      }
    } else if (itemMode === 'candy') {
      const tower = towers.find(t => t.id === towerId);
      if (!tower) {
        alert('대상을 찾을 수 없습니다.');
        setItemMode('none');
        return;
      }
      
      const candyCost = tower.level * 25;
      if (spendMoney(candyCost)) {
        const success = useItem('candy', towerId);
        if (success) {
          setItemMode('none');
          setSelectedCost(0);
        } else {
          alert('해당 아이템을 사용할 수 없는 대상입니다.');
          useGameStore.getState().addMoney(candyCost);
          setItemMode('none');
          setSelectedCost(0);
        }
      } else {
        alert(`돈이 부족합니다! (필요: ${candyCost}원)`);
        setItemMode('none');
        setSelectedCost(0);
      }
    } else if (itemMode === 'exp_candy') {
      const tower = towers.find(t => t.id === towerId);
      if (!tower) {
        alert('대상을 찾을 수 없습니다.');
        setItemMode('none');
        return;
      }
      
      // 대상을 제외한 나머지 포켓몬 중 가장 낮은 레벨 찾기
      const otherTowers = towers.filter(t => t.id !== tower.id && !t.isFainted);
      if (otherTowers.length === 0) {
        alert('다른 포켓몬이 없어 사용할 수 없습니다.');
        setItemMode('none');
        return;
      }
      
      const lowestLevel = Math.min(...otherTowers.map(t => t.level));
      const expCandyCost = lowestLevel * 50;
      
      if (lowestLevel >= tower.level) {
        alert('이미 가장 낮은 레벨이거나 더 낮습니다.');
        setItemMode('none');
        return;
      }
      
      if (spendMoney(expCandyCost)) {
        const success = useItem('exp_candy', towerId);
        if (success) {
          alert(`레벨이 ${tower.level}에서 ${lowestLevel}로 변경되었습니다.`);
          setItemMode('none');
          setSelectedCost(0);
        } else {
          alert('해당 아이템을 사용할 수 없는 대상입니다.');
          useGameStore.getState().addMoney(expCandyCost);
          setItemMode('none');
          setSelectedCost(0);
        }
      } else {
        alert(`돈이 부족합니다! (필요: ${expCandyCost}원)`);
        setItemMode('none');
        setSelectedCost(0);
      }
    } else if (itemMode !== 'none') {
      const success = await evolvePokemon(towerId, itemMode);
      if (success) {
        alert('진화 성공!');
        setItemMode('none');
        setSelectedCost(0);
      } else {
        alert('이 포켓몬은 해당 아이템으로 진화할 수 없습니다.');
        useGameStore.getState().addMoney(selectedCost);
        setItemMode('none');
        setSelectedCost(0);
      }
    }
  };

  const handleCancel = () => {
    useGameStore.getState().addMoney(selectedCost);
    setItemMode('none');
    setSelectedCost(0);
  };

  const getItemIcon = (itemId: string): string => {
    const iconMap: Record<string, string> = {
      'fire-stone': '🔥',
      'water-stone': '💧',
      'thunder-stone': '⚡',
      'leaf-stone': '🍃',
      'moon-stone': '🌙',
      'sun-stone': '☀️',
      'shiny-stone': '✨',
      'dusk-stone': '🌑',
      'dawn-stone': '🌅',
      'ice-stone': '❄️',
      'linking-cord': '🔗',
      'kings-rock': '👑',
      'metal-coat': '⚙️',
      'dragon-scale': '🐉',
      'upgrade': '🔧',
      'protector': '🛡️',
      'electirizer': '⚡',
      'magmarizer': '🔥',
      'dubious-disc': '💿',
      'reaper-cloth': '👻',
      'razor-claw': '🗡️',
      'razor-fang': '🦷',
      'friendship-evolution': '💝',
      'special-evolution': '✨',
      'deep-sea-tooth': '🦈',
      'deep-sea-scale': '🐚',
      'sachet': '🌸',
      'whipped-dream': '🍰',
      'tart-apple': '🍎',
      'sweet-apple': '🍏',
      'galarica-cuff': '📿',
      'galarica-wreath': '🎀',
      'black-augurite': '⚫',
    };
    return iconMap[itemId] || '💎';
  };

  const getCategoryName = (category: string): string => {
    const names: Record<string, string> = {
      stone: '진화의 돌',
      special: '특수 아이템',
      friendship: '친밀도 아이템',
      trade: '통신교환 아이템',
    };
    return names[category] || category;
  };

  if (itemMode !== 'none') {
    const currentItem = EVOLUTION_ITEMS[itemMode];
    return (
      <div style={s.overlay}>
        <div style={s.modal}>
          <h2>🎯 타겟 선택</h2>
          <p>
            {itemMode === 'potion' && '상처약을 사용할 아군을 클릭하세요.'}
            {itemMode === 'potion_good' && '좋은상처약을 사용할 아군을 클릭하세요.'}
            {itemMode === 'potion_super' && '고급상처약을 사용할 아군을 클릭하세요.'}
            {itemMode === 'candy' && '이상한 사탕을 사용할 아군을 클릭하세요. (레벨 × 25원)'}
            {itemMode === 'revive' && '기력의 조각을 사용할 기절한 아군을 클릭하세요. (레벨 × 10원)'}
            {itemMode === 'exp_candy' && '경험 사탕을 사용할 아군을 클릭하세요. (가장 낮은 레벨 × 50원)'}
            {currentItem && `${currentItem.name}을(를) 사용할 아군을 클릭하세요.`}
          </p>
          <div style={s.towerGrid}>
            {towers.map(tower => {
              let isSelectable = false;
              
              if (itemMode === 'revive') {
                isSelectable = tower.isFainted;
              } else if (itemMode === 'exp_candy') {
                // 경험 사탕: 기절하지 않고, 다른 포켓몬보다 레벨이 높은 포켓몬만
                const otherTowers = towers.filter(t => t.id !== tower.id && !t.isFainted);
                const lowestLevel = otherTowers.length > 0 ? Math.min(...otherTowers.map(t => t.level)) : 999;
                isSelectable = !tower.isFainted && tower.level > lowestLevel;
              } else if (currentItem) {
                isSelectable = !tower.isFainted && canEvolveWithItem(tower.pokemonId, itemMode) !== null;
              } else {
                isSelectable = !tower.isFainted;
              }
              
              return (
                <div 
                  key={tower.id} 
                  style={{
                    ...s.towerCard,
                    opacity: isSelectable ? 1 : 0.3,
                    cursor: isSelectable ? 'pointer' : 'not-allowed',
                    border: isSelectable && currentItem
                      ? '3px solid #2ecc71' 
                      : '2px solid rgba(52, 152, 219, 0.4)',
                  }}
                  onClick={() => isSelectable && handleTargetSelect(tower.id)}
                >
                  <img src={tower.sprite} alt={tower.name} style={s.towerImg} />
                  <h4>{tower.name}</h4>
                  <p>Lv.{tower.level} | HP: {Math.floor(tower.currentHp)}/{tower.maxHp}</p>
                  {tower.isFainted && <p style={{color: '#e74c3c', fontWeight: 'bold'}}>기절</p>}
                  {isSelectable && itemMode === 'candy' && (
                    <p style={{color: '#f39c12', fontWeight: 'bold', fontSize: '12px', marginTop: '8px'}}>
                      💰 {tower.level * 25}원
                    </p>
                  )}
                  {isSelectable && itemMode === 'revive' && (
                    <p style={{color: '#e74c3c', fontWeight: 'bold', fontSize: '12px', marginTop: '8px'}}>
                      💰 {tower.level * 10}원
                    </p>
                  )}
                  {isSelectable && itemMode === 'exp_candy' && (() => {
                    const otherTowers = towers.filter(t => t.id !== tower.id && !t.isFainted);
                    const lowestLevel = Math.min(...otherTowers.map(t => t.level));
                    return (
                      <p style={{color: '#9b59b6', fontWeight: 'bold', fontSize: '12px', marginTop: '8px'}}>
                        💰 {lowestLevel * 50}원 (Lv.{tower.level}→{lowestLevel})
                      </p>
                    );
                  })()}
                  {isSelectable && currentItem && (
                    <p style={{color: '#2ecc71', fontWeight: 'bold', fontSize: '12px', marginTop: '8px'}}>
                      ✨ 진화 가능!
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <button style={s.cancelBtn} onClick={handleCancel}>취소 (환불)</button>
        </div>
      </div>
    );
  }

  return (
    <div style={isWaveActive ? s.overlayCompact : s.overlay}>
      <div style={isWaveActive ? s.modalCompact : s.modal}>
        <div style={s.header}>
          <h2 style={isWaveActive ? {fontSize: '18px', margin: 0} : undefined}>🏪 상점</h2>
          <button style={s.closeBtnHeader} onClick={onClose}>✕</button>
        </div>
        
        <div style={s.money}>💰 보유 골드: {money}원</div>
        
        {!isWaveActive && (
          <div style={s.tabContainer}>
            <button 
              style={{
                ...s.tabButton,
                ...(activeTab === 'general' ? s.tabButtonActive : {}),
              }}
              onClick={() => setActiveTab('general')}
            >
              🛒 일반 상점
            </button>
            <button 
              style={{
                ...s.tabButton,
                ...(activeTab === 'evolution' ? s.tabButtonActive : {}),
              }}
              onClick={() => setActiveTab('evolution')}
            >
              ✨ 진화 상점
            </button>
          </div>
        )}

        {activeTab === 'general' && (
          <div style={isWaveActive ? s.itemsCompact : s.items}>
            <div style={isWaveActive ? s.itemCompact : s.item}>
              <h3 style={isWaveActive ? {fontSize: '13px', margin: '0 0 4px 0'} : undefined}>상처약</h3>
              <p style={isWaveActive ? {fontSize: '10px', margin: '0 0 6px 0'} : undefined}>HP 30 회복</p>
              <button style={isWaveActive ? s.btnCompact : s.btn} onClick={handleBuyPotion}>구매 (20원)</button>
            </div>
            <div style={isWaveActive ? s.itemCompact : s.item}>
              <h3 style={isWaveActive ? {fontSize: '13px', margin: '0 0 4px 0'} : undefined}>좋은상처약</h3>
              <p style={isWaveActive ? {fontSize: '10px', margin: '0 0 6px 0'} : undefined}>HP 150 또는 10% 회복</p>
              <button style={isWaveActive ? s.btnCompact : s.btn} onClick={handleBuyPotionGood}>구매 (100원)</button>
            </div>
            <div style={isWaveActive ? s.itemCompact : s.item}>
              <h3 style={isWaveActive ? {fontSize: '13px', margin: '0 0 4px 0'} : undefined}>고급상처약</h3>
              <p style={isWaveActive ? {fontSize: '10px', margin: '0 0 6px 0'} : undefined}>최대 HP의 50% 회복</p>
              <button style={isWaveActive ? s.btnCompact : s.btn} onClick={handleBuyPotionSuper}>구매 (500원)</button>
            </div>
            <div style={isWaveActive ? s.itemCompact : s.item}>
              <h3 style={isWaveActive ? {fontSize: '13px', margin: '0 0 4px 0'} : undefined}>이상한사탕</h3>
              <p style={isWaveActive ? {fontSize: '10px', margin: '0 0 6px 0'} : undefined}>레벨 1 상승</p>
              <button style={isWaveActive ? s.btnCompact : s.btn} onClick={handleBuyCandy}>레벨×25원</button>
            </div>
            <div style={isWaveActive ? s.itemCompact : s.item}>
              <h3 style={isWaveActive ? {fontSize: '13px', margin: '0 0 4px 0'} : undefined}>기력의 조각</h3>
              <p style={isWaveActive ? {fontSize: '10px', margin: '0 0 6px 0'} : undefined}>기절 부활</p>
              <button style={isWaveActive ? s.btnCompact : s.btn} onClick={handleBuyRevive}>레벨×10원</button>
            </div>
            <div style={isWaveActive ? s.itemCompact : s.item}>
              <h3 style={isWaveActive ? {fontSize: '13px', margin: '0 0 4px 0'} : undefined}>경험 사탕</h3>
              <p style={isWaveActive ? {fontSize: '10px', margin: '0 0 6px 0'} : undefined}>레벨을 가장 낮은 레벨로 변경</p>
              <button style={isWaveActive ? s.btnCompact : s.btn} onClick={handleBuyExpCandy}>가장낮은레벨×50원</button>
            </div>
          </div>
        )}

        {activeTab === 'evolution' && !isWaveActive && (
          <div style={s.evolutionShopContainer}>
            {Object.entries(EVOLUTION_ITEMS_BY_CATEGORY).map(([category, items]) => (
              <div key={category} style={s.categorySection}>
                <h3 style={s.categoryTitle}>{getCategoryName(category)}</h3>
                <div style={s.items}>
                  {items.map(item => (
                    <div key={item.id} style={s.item}>
                      <h3>{getItemIcon(item.id)} {item.name}</h3>
                      <p style={{fontSize: '13px', color: '#a0aec0', marginTop: '8px'}}>{item.description}</p>
                      <button 
                        style={s.btn} 
                        onClick={() => handleBuyEvolutionItem(item)}
                      >
                        구매 ({item.price}원)
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
  overlayCompact: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'transparent',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    zIndex: 999,
    pointerEvents: 'none',
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
    animation: 'slideInUp 0.4s ease-out'
  },
  modalCompact: {
    background: 'linear-gradient(145deg, rgba(26, 31, 46, 0.98), rgba(15, 20, 25, 0.98))',
    color: '#e8edf3',
    borderRadius: '16px',
    padding: '0',
    maxWidth: '320px',
    width: '320px',
    maxHeight: '70vh',
    overflowY: 'auto' as 'auto',
    boxShadow: '0 15px 40px rgba(0,0,0,0.8), 0 0 1px 1px rgba(76, 175, 255, 0.3)',
    border: '2px solid rgba(76, 175, 255, 0.2)',
    margin: '20px',
    pointerEvents: 'auto',
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '24px 32px',
    background: 'linear-gradient(90deg, rgba(243, 156, 18, 0.15), transparent)',
    borderBottom: '2px solid rgba(243, 156, 18, 0.2)'
  },
  closeBtnHeader: { 
    width: '48px',
    height: '48px',
    fontSize: '28px',
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
  money: { 
    fontSize: '22px', 
    fontWeight: 'bold', 
    color: '#ffd700', 
    margin: '20px 32px',
    textAlign: 'center' as 'center',
    textShadow: '0 0 15px rgba(255, 215, 0, 0.7), 0 2px 4px rgba(0,0,0,0.8)',
    padding: '16px',
    background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent)',
    borderRadius: '12px'
  },
  tabContainer: {
    display: 'flex',
    gap: '16px',
    padding: '0 32px 24px',
    borderBottom: '2px solid rgba(76, 175, 255, 0.2)',
  },
  tabButton: {
    flex: 1,
    padding: '14px 20px',
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.5), rgba(15, 20, 35, 0.5))',
    color: '#a0aec0',
    border: '2px solid rgba(76, 175, 255, 0.2)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  tabButtonActive: {
    background: 'linear-gradient(135deg, #4ca7ff 0%, #3498db 100%)',
    color: '#fff',
    border: '2px solid rgba(76, 175, 255, 0.6)',
    boxShadow: '0 6px 20px rgba(76, 175, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  items: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
    gap: '24px', 
    padding: '32px'
  },
  itemsCompact: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '12px',
    padding: '0 16px 16px',
  },
  evolutionShopContainer: {
    padding: '24px 32px 32px',
  },
  categorySection: {
    marginBottom: '40px',
  },
  categoryTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#4ca7ff',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '2px solid rgba(76, 175, 255, 0.3)',
    textShadow: '0 0 10px rgba(76, 175, 255, 0.5)',
  },
  item: { 
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95))',
    border: '2px solid rgba(76, 175, 255, 0.3)',
    borderRadius: '20px', 
    padding: '24px', 
    display: 'flex', 
    flexDirection: 'column' as 'column',
    gap: '12px',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
    position: 'relative' as 'relative',
    overflow: 'hidden'
  },
  itemCompact: {
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95))',
    border: '1px solid rgba(76, 175, 255, 0.3)',
    borderRadius: '12px',
    padding: '10px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  btn: { 
    padding: '14px 20px', 
    background: 'linear-gradient(135deg, #f39c12 0%, #d68910 100%)',
    color: '#fff', 
    border: '2px solid rgba(243, 156, 18, 0.4)',
    borderRadius: '12px', 
    cursor: 'pointer', 
    marginTop: 'auto', 
    fontWeight: 'bold', 
    fontSize: '16px', 
    boxShadow: '0 4px 15px rgba(243, 156, 18, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'all 0.2s ease',
  },
  btnCompact: {
    padding: '8px 12px',
    background: 'linear-gradient(135deg, #f39c12 0%, #d68910 100%)',
    color: '#fff',
    border: '1px solid rgba(243, 156, 18, 0.4)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    boxShadow: '0 2px 8px rgba(243, 156, 18, 0.3)',
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
    cursor: 'pointer'
  },
  towerImg: { 
    width: '80px', 
    height: '80px', 
    imageRendering: 'pixelated' as 'pixelated',
    marginBottom: '12px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))'
  },
  cancelBtn: { 
    width: 'calc(100% - 64px)',
    margin: '24px 32px 32px',
    padding: '16px', 
    fontSize: '18px', 
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    color: '#fff', 
    border: '2px solid rgba(231, 76, 60, 0.4)',
    borderRadius: '14px', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    boxShadow: '0 6px 20px rgba(231, 76, 60, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
  },
};