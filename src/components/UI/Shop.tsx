// src/components/UI/Shop.tsx
import React, { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { canEvolveWithItem } from '../../data/evolution';
import { EVOLUTION_ITEMS_BY_CATEGORY, EvolutionItem } from '../../data/evolutionItems';

type ItemMode = 'none' | 'potion' | 'potion_good' | 'potion_super' | 'candy' | 'revive' | 'exp_candy' | string;
type ShopTab = 'general' | 'evolution';

export const Shop: React.FC = () => {
  const { t } = useTranslation();
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

  useEffect(() => {
    if (isWaveActive) {
      setActiveTab('general');
    }
  }, [isWaveActive]);

  const handleBuyPotion = () => {
    if (spendMoney(20)) {
      setItemMode('potion');
      setSelectedCost(20);
    } else {
      alert(t('alerts.notEnoughMoney'));
    }
  };

  const handleBuyPotionGood = () => {
    if (spendMoney(100)) {
      setItemMode('potion_good');
      setSelectedCost(100);
    } else {
      alert(t('alerts.notEnoughMoney'));
    }
  };

  const handleBuyPotionSuper = () => {
    if (spendMoney(500)) {
      setItemMode('potion_super');
      setSelectedCost(500);
    } else {
      alert(t('alerts.notEnoughMoney'));
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
      alert(t('alerts.notEnoughMoney'));
    }
  };

  const handleTargetSelect = async (towerId: string) => {
    if (itemMode === 'potion' || itemMode === 'potion_good' || itemMode === 'potion_super') {
      const success = useItem(itemMode, towerId);
      if (success) {
        setItemMode('none');
        setSelectedCost(0);
      } else {
        alert(t('alerts.cannotUseItem'));
        useGameStore.getState().addMoney(selectedCost);
        setItemMode('none');
        setSelectedCost(0);
      }
    } else if (itemMode === 'revive') {
      const tower = towers.find(t => t.id === towerId);
      if (!tower) {
        alert(t('alerts.targetNotFound'));
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
          alert(t('alerts.cannotUseItem'));
          useGameStore.getState().addMoney(reviveCost);
          setItemMode('none');
          setSelectedCost(0);
        }
      } else {
        alert(t('alerts.notEnoughMoneyWithCost', { cost: reviveCost }));
        setItemMode('none');
        setSelectedCost(0);
      }
    } else if (itemMode === 'candy') {
      const tower = towers.find(t => t.id === towerId);
      if (!tower) {
        alert(t('alerts.targetNotFound'));
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
          alert(t('alerts.cannotUseItem'));
          useGameStore.getState().addMoney(candyCost);
          setItemMode('none');
          setSelectedCost(0);
        }
      } else {
        alert(t('alerts.notEnoughMoneyWithCost', { cost: candyCost }));
        setItemMode('none');
        setSelectedCost(0);
      }
    } else if (itemMode === 'exp_candy') {
      const aliveTowers = towers.filter(t => !t.isFainted);
      if (aliveTowers.length < 2) {
        alert(t('alerts.notEnoughPokemon'));
        setItemMode('none');
        return;
      }
      
      const sortedTowers = [...aliveTowers].sort((a, b) => a.level - b.level);
      const lowestLevelTower = sortedTowers[0];
      const secondLowestLevel = sortedTowers[1].level;
      
      if (towerId !== lowestLevelTower.id) {
        alert(t('alerts.onlyLowestLevel'));
        setItemMode('none');
        return;
      }
      
      const expCandyCost = secondLowestLevel * 50;
      if (spendMoney(expCandyCost)) {
        const success = useItem('exp_candy', towerId);
        if (success) {
          alert(t('alerts.levelChanged', { from: lowestLevelTower.level, to: secondLowestLevel }));
          setItemMode('none');
          setSelectedCost(0);
        } else {
          alert(t('alerts.cannotUseItem'));
          useGameStore.getState().addMoney(expCandyCost);
          setItemMode('none');
          setSelectedCost(0);
        }
      } else {
        alert(t('alerts.notEnoughMoneyWithCost', { cost: expCandyCost }));
        setItemMode('none');
        setSelectedCost(0);
      }
    } else if (itemMode !== 'none') {
      const success = await evolvePokemon(towerId, itemMode);
      if (success) {
        alert(t('alerts.evolutionSuccess'));
        setItemMode('none');
        setSelectedCost(0);
      } else {
        alert(t('alerts.cannotEvolveWithItem'));
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

  const currentItem = Object.values(EVOLUTION_ITEMS_BY_CATEGORY)
    .flat()
    .find((i: EvolutionItem) => i.id === itemMode);

  if (itemMode !== 'none') {
    return (
      <TargetOverlay>
        <TargetModal>
          <TargetTitle>🎯 {t('shop.targetTitle')}</TargetTitle>
          <TargetSubtitle>
            {itemMode === 'potion' && t('shop.targetPotion')}
            {itemMode === 'potion_good' && t('shop.targetPotionGood')}
            {itemMode === 'potion_super' && t('shop.targetPotionSuper')}
            {itemMode === 'candy' && t('shop.targetCandy')}
            {itemMode === 'revive' && t('shop.targetRevive')}
            {itemMode === 'exp_candy' && t('shop.targetExpCandy')}
            {currentItem && t('shop.targetItem', { name: t(`items.${currentItem.id}.name`) })}
          </TargetSubtitle>
          <TowerGrid>
            {towers.map(tower => {
              let isSelectable = false;
              
              if (itemMode === 'revive') {
                isSelectable = tower.isFainted;
              } else if (itemMode === 'exp_candy') {
                const aliveTowers = towers.filter(t => !t.isFainted);
                if (aliveTowers.length < 2) {
                  isSelectable = false;
                } else {
                  const sortedTowers = [...aliveTowers].sort((a, b) => a.level - b.level);
                  const lowestLevelTowerId = sortedTowers[0].id;
                  isSelectable = !tower.isFainted && tower.id === lowestLevelTowerId;
                }
              } else if (currentItem) {
                isSelectable = !tower.isFainted && canEvolveWithItem(tower.pokemonId, itemMode) !== null;
              } else {
                if (itemMode === 'candy') {
                  isSelectable = !tower.isFainted && tower.level < 100;
                } else {
                  isSelectable = !tower.isFainted;
                }
              }
              
              return (
                <TowerCard 
                  key={tower.id} 
                  $isSelectable={isSelectable}
                  $isEvolveTarget={isSelectable && !!currentItem}
                  onClick={() => isSelectable && handleTargetSelect(tower.id)}
                >
                  <TowerImg src={tower.sprite} alt={tower.displayName} />
                  <TowerName>{tower.displayName}</TowerName>
                  <TowerInfo>Lv.{tower.level} | HP: {Math.floor(tower.currentHp)}/{tower.maxHp}</TowerInfo>
                  {tower.isFainted && <FaintedLabel>{t('manager.fainted')}</FaintedLabel>}
                  
                  {isSelectable && itemMode === 'candy' && (
                    <PriceLabel $type="candy">
                      {t('shop.cost', { cost: tower.level * 25 })}
                    </PriceLabel>
                  )}
                  {isSelectable && itemMode === 'revive' && (
                    <PriceLabel $type="revive">
                      {t('shop.cost', { cost: tower.level * 10 })}
                    </PriceLabel>
                  )}
                  {isSelectable && itemMode === 'exp_candy' && (() => {
                    const aliveTowers = towers.filter(t => !t.isFainted);
                    const sortedTowers = [...aliveTowers].sort((a, b) => a.level - b.level);
                    const secondLowestLevel = sortedTowers[1].level;
                    return (
                      <PriceLabel $type="exp">
                        {t('shop.costLevelChange', { cost: secondLowestLevel * 50, from: tower.level, to: secondLowestLevel })}
                      </PriceLabel>
                    );
                  })()}
                  {isSelectable && currentItem && (
                    <PriceLabel $type="evolve">
                      ✨ {t('manager.canEvolve')}
                    </PriceLabel>
                  )}
                </TowerCard>
              );
            })}
          </TowerGrid>
          <CancelBtn onClick={handleCancel}>{t('shop.cancelRefund')}</CancelBtn>
        </TargetModal>
      </TargetOverlay>
    );
  }

  return (
    <ShopOverlay>
      <ShopModal>
        <ShopHeader>
          <ShopTitle>🏪 {t('shop.title')}</ShopTitle>
        </ShopHeader>
        
        <MoneyDisplay>{t('shop.currentMoney', { money: money })}</MoneyDisplay>
        
        {!isWaveActive && (
          <TabContainer>
            <TabButton 
              $isActive={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
            >
              🛒 {t('shop.tabGeneral')}
            </TabButton>
            <TabButton 
              $isActive={activeTab === 'evolution'}
              onClick={() => setActiveTab('evolution')}
            >
              ✨ {t('shop.tabEvolution')}
            </TabButton>
          </TabContainer>
        )}

        {activeTab === 'general' && (
          <ItemsContainer>
            <Item>
              <ItemTitle>{t('shop.potionName')}</ItemTitle>
              <ItemDesc>{t('shop.potionDesc')}</ItemDesc>
              <BuyBtn onClick={handleBuyPotion}>{t('shop.potionCost')}</BuyBtn>
            </Item>
            <Item>
              <ItemTitle>{t('shop.potionGoodName')}</ItemTitle>
              <ItemDesc>{t('shop.potionGoodDesc')}</ItemDesc>
              <BuyBtn onClick={handleBuyPotionGood}>{t('shop.potionGoodCost')}</BuyBtn>
            </Item>
            <Item>
              <ItemTitle>{t('shop.potionSuperName')}</ItemTitle>
              <ItemDesc>{t('shop.potionSuperDesc')}</ItemDesc>
              <BuyBtn onClick={handleBuyPotionSuper}>{t('shop.potionSuperCost')}</BuyBtn>
            </Item>
            <Item>
              <ItemTitle>{t('shop.reviveName')}</ItemTitle>
              <ItemDesc>{t('shop.reviveDesc')}</ItemDesc>
              <BuyBtn onClick={handleBuyRevive}>{t('shop.reviveCost')}</BuyBtn>
            </Item>
            <Item>
              <ItemTitle>{t('shop.candyName')}</ItemTitle>
              <ItemDesc>{t('shop.candyDesc')}</ItemDesc>
              <BuyBtn onClick={handleBuyCandy}>{t('shop.candyCost')}</BuyBtn>
            </Item>
            <Item>
              <ItemTitle>{t('shop.expCandyName')}</ItemTitle>
              <ItemDesc>{t('shop.expCandyDesc')}</ItemDesc>
              <BuyBtn onClick={handleBuyExpCandy}>{t('shop.expCandyCost')}</BuyBtn>
            </Item>
          </ItemsContainer>
        )}

        {activeTab === 'evolution' && (
          <EvolutionTab>
            <CategorySection>
              <CategoryTitle>🔥 {t('shop.categoryStone')}</CategoryTitle>
              <ItemGrid>
                {EVOLUTION_ITEMS_BY_CATEGORY.stone.map(item => (
                  <EvoItemBtn
                    key={item.id}
                    onClick={() => handleBuyEvolutionItem(item)}
                  >
                    <EvoItemName>{t(`items.${item.id}.name`)}</EvoItemName>
                    <EvoItemPrice>{t('shop.itemCost', { cost: item.price })}</EvoItemPrice>
                    <EvoItemDesc>{t(`items.${item.id}.description`)}</EvoItemDesc>
                  </EvoItemBtn>
                ))}
              </ItemGrid>
            </CategorySection>
            
            <CategorySection>
              <CategoryTitle>🔗 {t('shop.categoryTrade')}</CategoryTitle>
              <ItemGrid>
                {EVOLUTION_ITEMS_BY_CATEGORY.trade.map(item => (
                  <EvoItemBtn
                    key={item.id}
                    onClick={() => handleBuyEvolutionItem(item)}
                  >
                    <EvoItemName>{t(`items.${item.id}.name`)}</EvoItemName>
                    <EvoItemPrice>{t('shop.itemCost', { cost: item.price })}</EvoItemPrice>
                    <EvoItemDesc>{t(`items.${item.id}.description`)}</EvoItemDesc>
                  </EvoItemBtn>
                ))}
              </ItemGrid>
            </CategorySection>

            <CategorySection>
              <CategoryTitle>💝 {t('shop.categoryFriendship')}</CategoryTitle>
              <ItemGrid>
                {EVOLUTION_ITEMS_BY_CATEGORY.friendship.map(item => (
                  <EvoItemBtn
                    key={item.id}
                    onClick={() => handleBuyEvolutionItem(item)}
                  >
                    <EvoItemName>{t(`items.${item.id}.name`)}</EvoItemName>
                    <EvoItemPrice>{t('shop.itemCost', { cost: item.price })}</EvoItemPrice>
                    <EvoItemDesc>{t(`items.${item.id}.description`)}</EvoItemDesc>
                  </EvoItemBtn>
                ))}
              </ItemGrid>
            </CategorySection>

            <CategorySection>
              <CategoryTitle>⭐ {t('shop.categoryOthers')}</CategoryTitle>
              <ItemGrid>
                {EVOLUTION_ITEMS_BY_CATEGORY.others.map(item => (
                  <EvoItemBtn
                    key={item.id}
                    onClick={() => handleBuyEvolutionItem(item)}
                  >
                    <EvoItemName>{t(`items.${item.id}.name`)}</EvoItemName>
                    <EvoItemPrice>{t('shop.itemCost', { cost: item.price })}</EvoItemPrice>
                    <EvoItemDesc>{t(`items.${item.id}.description`)}</EvoItemDesc>
                  </EvoItemBtn>
                ))}
              </ItemGrid>
            </CategorySection>
            
            <CategorySection>
              <CategoryTitle>✨ {t('shop.categorySpecial')}</CategoryTitle>
              <ItemGrid>
                {EVOLUTION_ITEMS_BY_CATEGORY.special.map(item => (
                  <EvoItemBtn
                    key={item.id}
                    onClick={() => handleBuyEvolutionItem(item)}
                  >
                    <EvoItemName>{t(`items.${item.id}.name`)}</EvoItemName>
                    <EvoItemPrice>{t('shop.itemCost', { cost: item.price })}</EvoItemPrice>
                    <EvoItemDesc>{t(`items.${item.id}.description`)}</EvoItemDesc>
                  </EvoItemBtn>
                ))}
              </ItemGrid>
            </CategorySection>
          </EvolutionTab>
        )}
      </ShopModal>
    </ShopOverlay>
  );
};

const TargetOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.95));
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  animation: fadeIn 0.3s ease-out;
`;

const TargetModal = styled.div`
  background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%);
  color: #e8edf3;
  border-radius: 24px;
  padding: 32px;
  max-width: 1000px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(76, 175, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(76, 175, 255, 0.2);
  animation: slideInUp 0.4s ease-out;
`;

const TargetTitle = styled.h2`
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  color: #4cafff;
  margin-bottom: 16px;
`;

const TargetSubtitle = styled.p`
  text-align: center;
  font-size: 16px;
  color: #a8b8c8;
  margin-bottom: 24px;
`;

const TowerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 20px;
  padding-bottom: 24px;
`;

const TowerCard = styled.div<{ $isSelectable: boolean, $isEvolveTarget: boolean }>`
  background: linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95));
  border: 2px solid ${props => props.$isEvolveTarget ? '#2ecc71' : 'rgba(52, 152, 219, 0.4)'};
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  opacity: ${props => props.$isSelectable ? 1 : 0.3};
  cursor: ${props => props.$isSelectable ? 'pointer' : 'not-allowed'};
  
  ${props => props.$isSelectable && css`
    &:hover {
      transform: translateY(-2px);
      border-color: ${props.$isEvolveTarget ? '#34f58b' : '#4cafff'};
    }
  `}
`;

const TowerImg = styled.img`
  width: 80px;
  height: 80px;
  image-rendering: pixelated;
  margin-bottom: 12px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
`;

const TowerName = styled.h4`
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #fff;
`;

const TowerInfo = styled.p`
  font-size: 12px;
  margin: 4px 0;
  color: #a8b8c8;
`;

const FaintedLabel = styled.p`
  color: #e74c3c;
  font-weight: bold;
  font-size: 12px;
  margin-top: 8px;
`;

const PriceLabel = styled.p<{ $type: 'candy' | 'revive' | 'exp' | 'evolve' }>`
  font-weight: bold;
  font-size: 12px;
  margin-top: 8px;
  color: ${props => {
    if (props.$type === 'candy') return '#f39c12';
    if (props.$type === 'revive') return '#e74c3c';
    if (props.$type === 'exp') return '#9b59b6';
    if (props.$type === 'evolve') return '#2ecc71';
    return '#fff';
  }};
`;

const CancelBtn = styled.button`
  width: 100%;
  margin-top: 24px;
  padding: 16px;
  font-size: 18px;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: #fff;
  border: 2px solid rgba(231, 76, 60, 0.4);
  border-radius: 14px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

  &:hover {
    background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
  }
`;

const ShopOverlay = styled.div`
  position: fixed;
  right: 16px;
  top: 16px;
  z-index: 999;
  pointer-events: auto;
`;

const ShopModal = styled.div`
  background: linear-gradient(145deg, rgba(26, 31, 46, 0.98), rgba(15, 20, 25, 0.98));
  color: #e8edf3;
  border-radius: 16px;
  padding: 0;
  width: 280px;
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(243, 156, 18, 0.4), 0 0 2px 1px rgba(243, 156, 18, 0.3);
  border: 3px solid rgba(243, 156, 18, 0.4);
  backdrop-filter: blur(10px);
  animation: slideInRight 0.3s ease-out;
`;

const ShopHeader = styled.div`
  padding: 16px;
  background: linear-gradient(90deg, rgba(243, 156, 18, 0.2), transparent);
  border-bottom: 2px solid rgba(243, 156, 18, 0.3);
  text-align: center;
`;

const ShopTitle = styled.h2`
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  color: #f39c12;
  text-shadow: 0 0 10px rgba(243, 156, 18, 0.6);
`;

const MoneyDisplay = styled.div`
  font-size: 14px;
  font-weight: bold;
  color: #ffd700;
  margin: 12px 16px;
  text-align: center;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
  padding: 8px;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 8px;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 8px;
  padding: 0 16px 12px;
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  flex: 1;
  padding: 8px 12px;
  background: linear-gradient(145deg, rgba(30, 40, 60, 0.6), rgba(15, 20, 35, 0.6));
  color: #a0aec0;
  border: 2px solid rgba(243, 156, 18, 0.2);
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 12px;
  transition: all 0.2s ease;

  ${props => props.$isActive && css`
    background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);
    color: #fff;
    border: 2px solid rgba(243, 156, 18, 0.6);
    box-shadow: 0 4px 12px rgba(243, 156, 18, 0.4);
  `}
`;

const ItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 16px 16px;
`;

const Item = styled.div`
  background: linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95));
  border: 1px solid rgba(243, 156, 18, 0.3);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const ItemTitle = styled.h3`
  font-size: 13px;
  margin: 0 0 4px 0;
  font-weight: bold;
  color: #4cafff;
`;

const ItemDesc = styled.p`
  font-size: 10px;
  margin: 0 0 6px 0;
  color: #a0aec0;
`;

const BuyBtn = styled.button`
  padding: 6px 10px;
  background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);
  color: #fff;
  border: 1px solid rgba(243, 156, 18, 0.4);
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 11px;
  box-shadow: 0 2px 8px rgba(243, 156, 18, 0.3);
  
  &:hover {
    background: linear-gradient(135deg, #d68910 0%, #b8730e 100%);
  }
`;

const EvolutionTab = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 16px 16px;
`;

const CategorySection = styled.div`
  margin: 0;
`;

const CategoryTitle = styled.h3`
  font-size: 13px;
  font-weight: bold;
  color: #f39c12;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(243, 156, 18, 0.3);
`;

const ItemGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
`;

const EvoItemBtn = styled.button`
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
  text-align: left;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #f39c12;
  }
`;

const EvoItemName = styled.div`
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 5px;
  color: #fff;
`;

const EvoItemPrice = styled.div`
  font-size: 12px;
  color: #FFD700;
  margin-bottom: 5px;
`;

const EvoItemDesc = styled.div`
  font-size: 11px;
  color: #999;
  line-height: 1.4;
`;