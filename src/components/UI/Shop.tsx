// src/components/UI/Shop.tsx

import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { canEvolveWithItem } from '../../data/evolution';

type ItemMode = 'none' | 'potion' | 'potion_good' | 'potion_super' | 'candy' | 'revive' | 'fire-stone' | 'water-stone' | 'thunder-stone' | 'leaf-stone' | 'moon-stone' | 'linking-cord';

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
    // 사탕은 타겟 선택 후 가격 계산
    setItemMode('candy');
    setSelectedCost(0); // 초기 비용은 0, 타겟 선택 시 계산
  };

  const handleBuyRevive = () => {
    // 기력의 조각도 타겟 선택 후 가격 계산 (레벨 * 10원)
    setItemMode('revive');
    setSelectedCost(0); // 초기 비용은 0, 타겟 선택 시 계산
  };

  const handleBuyStone = (stone: 'fire-stone' | 'water-stone' | 'thunder-stone' | 'leaf-stone' | 'moon-stone' | 'linking-cord') => {
    const cost = 300;
    if (spendMoney(cost)) {
      setItemMode(stone);
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
        // 환불
        useGameStore.getState().addMoney(selectedCost);
        setItemMode('none');
        setSelectedCost(0);
      }
    } else if (itemMode === 'revive') {
      // 기력의 조각: 대상의 레벨 * 10원
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
          // 환불
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
      // 이상한 사탕: 대상의 레벨 * 50원
      const tower = towers.find(t => t.id === towerId);
      if (!tower) {
        alert('대상을 찾을 수 없습니다.');
        setItemMode('none');
        return;
      }
      
      const candyCost = tower.level * 50;
      if (spendMoney(candyCost)) {
        const success = useItem('candy', towerId);
        if (success) {
          setItemMode('none');
          setSelectedCost(0);
        } else {
          alert('해당 아이템을 사용할 수 없는 대상입니다.');
          // 환불
          useGameStore.getState().addMoney(candyCost);
          setItemMode('none');
          setSelectedCost(0);
        }
      } else {
        alert(`돈이 부족합니다! (필요: ${candyCost}원)`);
        setItemMode('none');
        setSelectedCost(0);
      }
    } else if (itemMode.endsWith('-stone') || itemMode === 'linking-cord') {
      // 진화 시도
      const success = await evolvePokemon(towerId, itemMode);
      if (success) {
        alert('진화 성공!');
        setItemMode('none');
        setSelectedCost(0);
      } else {
        alert('이 포켓몬은 해당 아이템으로 진화할 수 없습니다.');
        // 환불
        useGameStore.getState().addMoney(selectedCost);
        setItemMode('none');
        setSelectedCost(0);
      }
    }
  };

  const handleCancel = () => {
    // 환불
    useGameStore.getState().addMoney(selectedCost);
    setItemMode('none');
    setSelectedCost(0);
  };

  if (itemMode !== 'none') {
    return (
      <div style={s.overlay}>
        <div style={s.modal}>
          <h2>🎯 타겟 선택</h2>
          <p>
            {itemMode === 'potion' && '상처약을 사용할 아군을 클릭하세요.'}
            {itemMode === 'potion_good' && '좋은상처약을 사용할 아군을 클릭하세요.'}
            {itemMode === 'potion_super' && '고급상처약을 사용할 아군을 클릭하세요.'}
            {itemMode === 'candy' && '이상한사탕을 사용할 아군을 클릭하세요. (레벨 × 50원)'}
            {itemMode === 'revive' && '기력의 조각을 사용할 기절한 아군을 클릭하세요. (레벨 × 10원)'}
            {itemMode === 'linking-cord' && '연결의 끈을 사용할 아군을 클릭하세요. (통신 교환 진화)'}
            {itemMode.endsWith('-stone') && '진화의 돌을 사용할 아군을 클릭하세요.'}
          </p>
          <div style={s.towerGrid}>
            {towers.map(tower => {
              // 각 아이템 타입별로 사용 가능 여부 확인
              let isSelectable = false;
              
              if (itemMode === 'revive') {
                // 기력의 조각: 기절한 포켓몬만
                isSelectable = tower.isFainted;
              } else if (itemMode.endsWith('-stone') || itemMode === 'linking-cord') {
                // 진화의 돌: 해당 아이템으로 진화 가능한 포켓몬만
                isSelectable = !tower.isFainted && canEvolveWithItem(tower.pokemonId, itemMode) !== null;
              } else {
                // 상처약, 이상한사탕: 기절하지 않은 포켓몬만
                isSelectable = !tower.isFainted;
              }
              
              return (
                <div 
                  key={tower.id} 
                  style={{
                    ...s.towerCard,
                    opacity: isSelectable ? 1 : 0.3,
                    cursor: isSelectable ? 'pointer' : 'not-allowed',
                    border: isSelectable && itemMode.endsWith('-stone') || itemMode === 'linking-cord' 
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
                      💰 {tower.level * 50}원
                    </p>
                  )}
                  {isSelectable && itemMode === 'revive' && (
                    <p style={{color: '#e74c3c', fontWeight: 'bold', fontSize: '12px', marginTop: '8px'}}>
                      💰 {tower.level * 10}원
                    </p>
                  )}
                  {isSelectable && (itemMode.endsWith('-stone') || itemMode === 'linking-cord') && (
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
          <button style={s.closeBtnHeader} onClick={onClose}>×</button>
        </div>
        <p style={isWaveActive ? {...s.money, fontSize: '16px', padding: '8px', margin: '10px 16px'} : s.money}>
          보유 금액: 💰 {money}원
        </p>
        <div style={isWaveActive ? s.itemsCompact : s.items}>
          <div style={isWaveActive ? s.itemCompact : s.item}>
            <h3 style={isWaveActive ? {fontSize: '13px', margin: '0 0 4px 0'} : undefined}>상처약</h3>
            <p style={isWaveActive ? {fontSize: '10px', margin: '0 0 6px 0'} : undefined}>HP 30 회복</p>
            <button style={isWaveActive ? s.btnCompact : s.btn} onClick={handleBuyPotion}>20원</button>
          </div>
          <div style={isWaveActive ? s.itemCompact : s.item}>
            <h3 style={isWaveActive ? {fontSize: '13px', margin: '0 0 4px 0'} : undefined}>좋은상처약</h3>
            <p style={isWaveActive ? {fontSize: '10px', margin: '0 0 6px 0'} : undefined}>HP 150 or 10%</p>
            <button style={isWaveActive ? s.btnCompact : s.btn} onClick={handleBuyPotionGood}>100원</button>
          </div>
          <div style={isWaveActive ? s.itemCompact : s.item}>
            <h3 style={isWaveActive ? {fontSize: '13px', margin: '0 0 4px 0'} : undefined}>고급상처약</h3>
            <p style={isWaveActive ? {fontSize: '10px', margin: '0 0 6px 0'} : undefined}>HP 50% 회복</p>
            <button style={isWaveActive ? s.btnCompact : s.btn} onClick={handleBuyPotionSuper}>500원</button>
          </div>
          <div style={isWaveActive ? s.itemCompact : s.item}>
            <h3 style={isWaveActive ? {fontSize: '13px', margin: '0 0 4px 0'} : undefined}>이상한사탕</h3>
            <p style={isWaveActive ? {fontSize: '10px', margin: '0 0 6px 0'} : undefined}>레벨 1 상승</p>
            <button style={isWaveActive ? s.btnCompact : s.btn} onClick={handleBuyCandy}>레벨×50원</button>
          </div>
          <div style={isWaveActive ? s.itemCompact : s.item}>
            <h3 style={isWaveActive ? {fontSize: '13px', margin: '0 0 4px 0'} : undefined}>기력의 조각</h3>
            <p style={isWaveActive ? {fontSize: '10px', margin: '0 0 6px 0'} : undefined}>기절 부활</p>
            <button style={isWaveActive ? s.btnCompact : s.btn} onClick={handleBuyRevive}>레벨×10원</button>
          </div>
          {!isWaveActive && (
            <>
              <div style={s.item}>
                <h3>🔥 불의 돌</h3>
                <p>특정 포켓몬 진화</p>
                <button style={s.btn} onClick={() => handleBuyStone('fire-stone')}>구매 (300원)</button>
              </div>
              <div style={s.item}>
                <h3>💧 물의 돌</h3>
                <p>특정 포켓몬 진화</p>
                <button style={s.btn} onClick={() => handleBuyStone('water-stone')}>구매 (300원)</button>
              </div>
              <div style={s.item}>
                <h3>⚡ 천둥의 돌</h3>
                <p>특정 포켓몬 진화</p>
                <button style={s.btn} onClick={() => handleBuyStone('thunder-stone')}>구매 (300원)</button>
              </div>
              <div style={s.item}>
                <h3>🍃 리프의 돌</h3>
                <p>특정 포켓몬 진화</p>
                <button style={s.btn} onClick={() => handleBuyStone('leaf-stone')}>구매 (300원)</button>
              </div>
              <div style={s.item}>
                <h3>🌙 달의 돌</h3>
                <p>특정 포켓몬 진화</p>
                <button style={s.btn} onClick={() => handleBuyStone('moon-stone')}>구매 (300원)</button>
              </div>
              <div style={s.item}>
                <h3>🔗 연결의 끈</h3>
                <p>통신 교환 진화 (윤겔라, 근육몬, 고우스트)</p>
                <button style={s.btn} onClick={() => handleBuyStone('linking-cord')}>구매 (300원)</button>
              </div>
            </>
          )}
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
  items: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
    gap: '24px', 
    padding: '0 32px 32px'
  },
  itemsCompact: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '12px',
    padding: '0 16px 16px',
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
    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
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