// src/components/UI/Shop.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { media, isMobileOrTablet } from '../../utils/responsive.utils';
import styled, { css } from 'styled-components';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { canEvolveWithItem, getEvolvableWithItem } from '../../data/evolution';
import { EVOLUTION_ITEMS_BY_CATEGORY, EVOLUTION_ITEMS, EvolutionItem } from '../../data/evolutionItems';

type ItemMode = 'none' | 'potion' | 'potion_good' | 'potion_super' | 'candy' | 'revive' | 'exp_candy' | string;
type ShopTab = 'general' | 'evolution';

export const Shop: React.FC = () => {
  const { t } = useTranslation();
  const { money, useItem, towers, evolvePokemon, isWaveActive } = useGameStore(state => ({
    money: state.money,
    useItem: state.useItem,
    towers: state.towers,
    evolvePokemon: state.evolvePokemon,
    isWaveActive: state.isWaveActive,
  }));
  const [itemMode, setItemMode] = useState<ItemMode>('none');
  const [activeTab, setActiveTab] = useState<ShopTab>('general');
  const [isCollapsed, setIsCollapsed] = useState(() => isMobileOrTablet());


  useEffect(() => {
    if (isWaveActive) {
      setActiveTab('general');
    }
  }, [isWaveActive]);

  // ── 현재 필드 포켓몬에 바로 사용 가능한 아이템 ID 집합 ──────────────────
  const usableItemIds = useMemo(() => {
    const ids = new Set<string>();
    const aliveTowers = towers.filter(t => !t.isFainted);
    if (aliveTowers.length === 0) return ids;

    Object.values(EVOLUTION_ITEMS).forEach(item => {
      const evolvableIds = getEvolvableWithItem(item.id);
      const canUse = aliveTowers.some(t => evolvableIds.includes(t.pokemonId));
      if (canUse) ids.add(item.id);
    });

    return ids;
  }, [towers]);

  // ── 아이템 목록 정렬 헬퍼: 사용 가능 아이템 → 앞으로 ────────────────────
  const sortedItems = (items: EvolutionItem[]) =>
    [...items].sort((a, b) => {
      const aU = usableItemIds.has(a.id) ? 0 : 1;
      const bU = usableItemIds.has(b.id) ? 0 : 1;
      return aU - bU;
    });

  const handleBuyPotion = () => {
    if (money < 20) { alert(t('alerts.notEnoughMoney')); return; }
    setItemMode('potion');
  };
  const handleBuyPotionGood = () => {
    if (money < 100) { alert(t('alerts.notEnoughMoney')); return; }
    setItemMode('potion_good');
  };
  const handleBuyPotionSuper = () => {
    if (money < 500) { alert(t('alerts.notEnoughMoney')); return; }
    setItemMode('potion_super');
  };
  const handleBuyCandy = () => {
    setItemMode('candy');
  };
  const handleBuyRevive = () => {
    setItemMode('revive');
  };
  // [BUG-4 FIX] exp_candy 사용 가능 여부 사전 검사
  // 기존: 모든 포켓몬이 같은 레벨일 때도 버튼 클릭 가능 → 타겟 선택 후 "사용 불가" 알림
  // 수정: 버튼 클릭 시점에 사용 불가 조건 확인 → 즉시 안내 후 모드 진입 차단
  const handleBuyExpCandy = () => {
    const aliveTowers = towers.filter(t => !t.isFainted);
    if (aliveTowers.length < 2) {
      alert(t('alerts.cannotUseItem'));
      return;
    }
    const minLevel = Math.min(...aliveTowers.map(t => t.level));
    const hasHigher = aliveTowers.some(t => t.level > minLevel);
    if (!hasHigher) {
      alert(t('alerts.cannotUseItem'));
      return;
    }
    setItemMode('exp_candy');
  };

  const handleBuyEvolutionItem = (item: EvolutionItem) => {
    if (money < item.price) {
      alert(t('alerts.notEnoughMoney'));
      return;
    }
    // [FIX-1] 선택 즉시 비용 차감 (취소 시 handleCancel에서 환불)
    if (!useGameStore.getState().spendMoney(item.price)) {
      alert(t('alerts.notEnoughMoney'));
      return;
    }
    setItemMode(item.id);
  };

  const handleTargetSelect = async (towerId: string) => {
    let success = false;

    if (
      itemMode === 'potion' || itemMode === 'potion_good' || itemMode === 'potion_super' ||
      itemMode === 'revive' || itemMode === 'candy' || itemMode === 'exp_candy'
    ) {
      const tower = towers.find(t => t.id === towerId);
      if (tower) {
        let cost = 0;
        if (itemMode === 'potion') cost = 20;
        else if (itemMode === 'potion_good') cost = 100;
        else if (itemMode === 'potion_super') cost = 500;
        else if (itemMode === 'candy') cost = tower.level * 25;
        else if (itemMode === 'revive') cost = tower.level * 10;
        else if (itemMode === 'exp_candy') {
          // [FIX-3] store와 동일한 로직: 타겟 레벨보다 높은 첫 번째 레벨 기준
          const aliveTowers = towers.filter(t => !t.isFainted);
          const higherLevels = [...new Set(aliveTowers.map(t => t.level))]
            .filter(lvl => lvl > tower.level)
            .sort((a, b) => a - b);
          const nextTargetLevel = higherLevels[0];
          cost = nextTargetLevel !== undefined ? nextTargetLevel * 50 : 0;
        }

        if (money < cost) {
          alert(t('alerts.notEnoughMoney'));
          setItemMode('none');
          return;
        }
      }

      success = useItem(itemMode, towerId);
      if (!success) {
        alert(t('alerts.cannotUseItem'));
      }
    } else if (itemMode !== 'none') {
      success = await evolvePokemon(towerId, itemMode);
      if (success) {
        alert(t('alerts.evolutionSuccess'));
      } else {
        // [FIX-1] 진화 실패 시 미리 차감된 비용 환불
        const item = Object.values(EVOLUTION_ITEMS_BY_CATEGORY).flat().find(i => i.id === itemMode);
        if (item) useGameStore.getState().addMoney(item.price);
        alert(t('alerts.cannotEvolveWithItem'));
      }
    }

    setItemMode('none');
  };

  const handleCancel = () => {
    // [FIX-1] 진화 아이템 모드였다면 차감된 비용 환불
    if (itemMode !== 'none' &&
      itemMode !== 'potion' && itemMode !== 'potion_good' && itemMode !== 'potion_super' &&
      itemMode !== 'candy' && itemMode !== 'revive' && itemMode !== 'exp_candy') {
      const item = Object.values(EVOLUTION_ITEMS_BY_CATEGORY).flat().find(i => i.id === itemMode);
      if (item) useGameStore.getState().addMoney(item.price);
    }
    setItemMode('none');
  };

  const currentItem = Object.values(EVOLUTION_ITEMS_BY_CATEGORY)
    .flat()
    .find((i: EvolutionItem) => i.id === itemMode);

  // ── 타워 선택 모드 ───────────────────────────────────────────────────────
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
            {itemMode !== 'none' &&
              itemMode !== 'potion' && itemMode !== 'potion_good' && itemMode !== 'potion_super' &&
              itemMode !== 'candy' && itemMode !== 'revive' && itemMode !== 'exp_candy' &&
              t('shop.targetItem', { name: currentItem ? t(`items.${currentItem.id}.name`) : itemMode })
            }
          </TargetSubtitle>
          <TowerGrid>
            {towers.map(tower => {
              let isSelectable = false;
              let isEvolveTarget = false;

              if (itemMode === 'potion' || itemMode === 'potion_good' || itemMode === 'potion_super') {
                isSelectable = !tower.isFainted && tower.currentHp < tower.maxHp;
              } else if (itemMode === 'candy') {
                isSelectable = !tower.isFainted && tower.level < 100;
              } else if (itemMode === 'revive') {
                isSelectable = tower.isFainted;
              } else if (itemMode === 'exp_candy') {
                const aliveTowers = towers.filter(t => !t.isFainted);
                if (aliveTowers.length >= 2) {
                  const minLevel = Math.min(...aliveTowers.map(t => t.level));
                  const hasHigher = aliveTowers.some(t => t.level > minLevel);
                  isSelectable = !tower.isFainted && tower.level === minLevel && hasHigher;
                }

              } else if (currentItem) {
                const result = canEvolveWithItem(tower.pokemonId, itemMode);
                isSelectable = !!result && !tower.isFainted;
                isEvolveTarget = isSelectable;
              }

              return (
                <TowerCard
                  key={tower.id}
                  $isSelectable={isSelectable}
                  $isEvolveTarget={isEvolveTarget}
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
                    const higherLevels = [...new Set(aliveTowers.map(t => t.level))]
                      .filter(lvl => lvl > tower.level)
                      .sort((a, b) => a - b);
                    const nextTargetLevel = higherLevels[0] || tower.level;
                    return (
                      <PriceLabel $type="exp">
                        {t('shop.costLevelChange', { cost: nextTargetLevel * 50, from: tower.level, to: nextTargetLevel })}
                      </PriceLabel>
                    );

                  })()}
                  {isEvolveTarget && (
                    <PriceLabel $type="evolve">
                      ✨ {t('manager.canEvolve')}
                    </PriceLabel>
                  )}
                </TowerCard>
              );
            })}
          </TowerGrid>
          <CancelBtn onClick={handleCancel}>{t('common.cancel')}</CancelBtn>
        </TargetModal>
      </TargetOverlay>
    );
  }

  // ── 진화 아이템 렌더 헬퍼 ────────────────────────────────────────────────
  const renderEvoItems = (items: EvolutionItem[]) =>
    sortedItems(items).map(item => {
      const isUsable = usableItemIds.has(item.id);
      return (
        <EvoItemBtn
          key={item.id}
          $isUsable={isUsable}
          onClick={() => handleBuyEvolutionItem(item)}
        >
          {isUsable && <UsableBadge>{t('shop.badgeUsableNow')}</UsableBadge>}
          <EvoItemName $isUsable={isUsable}>{t(`items.${item.id}.name`)}</EvoItemName>
          <EvoItemPrice>{t('shop.itemCost', { cost: item.price })}</EvoItemPrice>
          <EvoItemDesc>{t(`items.${item.id}.description`)}</EvoItemDesc>
        </EvoItemBtn>
      );
    });

  // ── 메인 상점 UI ─────────────────────────────────────────────────────────
  return (
    <ShopOverlay>
      <ShopModal $isCollapsed={isCollapsed}>
        <ShopHeader onClick={() => setIsCollapsed(!isCollapsed)}>
          <ShopTitle>🏪 {t('shop.title')}</ShopTitle>
          <ToggleButton>{isCollapsed ? '➕' : '➖'}</ToggleButton>
        </ShopHeader>

        <CollapseContent $isCollapsed={isCollapsed}>
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
                {usableItemIds.size > 0 && <TabBadge>{usableItemIds.size}</TabBadge>}
              </TabButton>
            </TabContainer>
          )}

          {activeTab === 'general' && (
            <ItemsContainer>
              <Item>
                <ItemTitle>{t('shop.potionName')}</ItemTitle>
                <ItemDesc>{t('shop.potionDesc')}</ItemDesc>
                <BuyBtn onClick={(e) => { e.stopPropagation(); handleBuyPotion(); }}>{t('shop.potionCost')}</BuyBtn>
              </Item>
              <Item>
                <ItemTitle>{t('shop.potionGoodName')}</ItemTitle>
                <ItemDesc>{t('shop.potionGoodDesc')}</ItemDesc>
                <BuyBtn onClick={(e) => { e.stopPropagation(); handleBuyPotionGood(); }}>{t('shop.potionGoodCost')}</BuyBtn>
              </Item>
              <Item>
                <ItemTitle>{t('shop.potionSuperName')}</ItemTitle>
                <ItemDesc>{t('shop.potionSuperDesc')}</ItemDesc>
                <BuyBtn onClick={(e) => { e.stopPropagation(); handleBuyPotionSuper(); }}>{t('shop.potionSuperCost')}</BuyBtn>
              </Item>
              <Item>
                <ItemTitle>{t('shop.reviveName')}</ItemTitle>
                <ItemDesc>{t('shop.reviveDesc')}</ItemDesc>
                <BuyBtn onClick={(e) => { e.stopPropagation(); handleBuyRevive(); }}>{t('shop.reviveCost')}</BuyBtn>
              </Item>
              <Item>
                <ItemTitle>{t('shop.candyName')}</ItemTitle>
                <ItemDesc>{t('shop.candyDesc')}</ItemDesc>
                <BuyBtn onClick={(e) => { e.stopPropagation(); handleBuyCandy(); }}>{t('shop.candyCost')}</BuyBtn>
              </Item>
              <Item>
                <ItemTitle>{t('shop.expCandyName')}</ItemTitle>
                <ItemDesc>{t('shop.expCandyDesc')}</ItemDesc>
                <BuyBtn onClick={(e) => { e.stopPropagation(); handleBuyExpCandy(); }}>{t('shop.expCandyCost')}</BuyBtn>
              </Item>
            </ItemsContainer>
          )}

          {activeTab === 'evolution' && (
            <EvolutionTab>
              <CategorySection>
                <CategoryTitle>🔥 {t('shop.categoryStone')}</CategoryTitle>
                <ItemGrid>{renderEvoItems(EVOLUTION_ITEMS_BY_CATEGORY.stone)}</ItemGrid>
              </CategorySection>

              <CategorySection>
                <CategoryTitle>🔗 {t('shop.categoryTrade')}</CategoryTitle>
                <ItemGrid>{renderEvoItems(EVOLUTION_ITEMS_BY_CATEGORY.trade)}</ItemGrid>
              </CategorySection>

              <CategorySection>
                <CategoryTitle>💝 {t('shop.categoryFriendship')}</CategoryTitle>
                <ItemGrid>{renderEvoItems(EVOLUTION_ITEMS_BY_CATEGORY.friendship)}</ItemGrid>
              </CategorySection>

              <CategorySection>
                <CategoryTitle>⭐ {t('shop.categoryOthers')}</CategoryTitle>
                <ItemGrid>{renderEvoItems(EVOLUTION_ITEMS_BY_CATEGORY.others)}</ItemGrid>
              </CategorySection>

              <CategorySection>
                <CategoryTitle>✨ {t('shop.categorySpecial')}</CategoryTitle>
                <ItemGrid>{renderEvoItems(EVOLUTION_ITEMS_BY_CATEGORY.special)}</ItemGrid>
              </CategorySection>
            </EvolutionTab>
          )}
        </CollapseContent>
      </ShopModal>
    </ShopOverlay>

  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const TargetOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at center, rgba(0,0,0,0.85), rgba(0,0,0,0.95));
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
  box-shadow: 0 25px 80px rgba(0,0,0,0.6), 0 0 1px 1px rgba(76,175,255,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
  border: 2px solid rgba(76,175,255,0.2);
  animation: slideInUp 0.4s ease-out;
  ${media.mobile} {
    padding: 16px;
    width: 96%;
    border-radius: 16px;
    max-height: 92vh;
  }
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
  ${media.mobile} {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
    padding-bottom: 12px;
  }
`;

const TowerCard = styled.div<{ $isSelectable: boolean; $isEvolveTarget: boolean }>`
  background: linear-gradient(145deg, rgba(30,40,60,0.9), rgba(15,20,35,0.95));
  border: 2px solid ${props => props.$isEvolveTarget ? '#2ecc71' : 'rgba(52,152,219,0.4)'};
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
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
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.6));
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
  border: 2px solid rgba(231,76,60,0.4);
  border-radius: 14px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 6px 20px rgba(231,76,60,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  &:hover { background: linear-gradient(135deg, #c0392b 0%, #a93226 100%); }
`;

const ShopOverlay = styled.div`
  position: fixed;
  right: 10px;
  top: 10px;
  z-index: 999;
  pointer-events: auto;
  ${media.mobile} {
    right: 4px;
    top: 4px;
  }
`;

const ShopModal = styled.div<{ $isCollapsed: boolean }>`
  background: linear-gradient(145deg, rgba(26,31,46,0.98), rgba(15,20,25,0.98));
  color: #e8edf3;
  border-radius: 12px;
  padding: 0;
  width: 240px;
  max-height: ${props => props.$isCollapsed ? '46px' : '70vh'};
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(243,156,18,0.4), 0 0 2px 1px rgba(243,156,18,0.3);
  border: 3px solid rgba(243,156,18,0.4);
  backdrop-filter: blur(10px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideInRight 0.3s ease-out;
  ${media.mobile} {
    width: 150px;
    max-height: ${props => props.$isCollapsed ? '36px' : '60vh'};
    border-width: 2px;
    border-radius: 10px;
  }
`;

const ShopHeader = styled.div`
  padding: 12px;
  background: linear-gradient(90deg, rgba(243,156,18,0.2), transparent);
  border-bottom: 2px solid rgba(243,156,18,0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  min-height: 36px;

  @media (hover: hover) {
    &:hover {
      background: linear-gradient(90deg, rgba(243,156,18,0.3), transparent);
    }
  }
  ${media.mobile} {
    padding: 8px;
    min-height: 34px;
  }
`;

const ToggleButton = styled.span`
  font-size: 14px;
  opacity: 0.8;
  transition: transform 0.3s ease;
`;

const CollapseContent = styled.div<{ $isCollapsed: boolean }>`
  max-height: ${props => props.$isCollapsed ? '0' : '65vh'};
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  overflow-y: auto;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(243, 156, 18, 0.3);
    border-radius: 3px;
  }
`;


const ShopTitle = styled.h2`
  font-size: 16px;
  font-weight: bold;
  margin: 0;
  color: #f39c12;
  text-shadow: 0 0 10px rgba(243,156,18,0.6);
`;

const MoneyDisplay = styled.div`
  font-size: 13px;
  font-weight: bold;
  color: #ffd700;
  margin: 8px 12px;
  text-align: center;
  text-shadow: 0 0 10px rgba(255,215,0,0.7);
  padding: 6px;
  background: rgba(255,215,0,0.1);
  border-radius: 8px;
  ${media.mobile} {
    font-size: 11px;
    margin: 4px 8px;
    padding: 4px;
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 6px;
  padding: 0 12px 10px;
`;

const TabButton = styled.button<{ $isActive: boolean }>`
  flex: 1;
  position: relative;
  padding: 6px 10px;
  background: linear-gradient(145deg, rgba(30,40,60,0.6), rgba(15,20,35,0.6));
  color: #a0aec0;
  border: 2px solid rgba(243,156,18,0.2);
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 11px;
  transition: all 0.2s ease;

  ${props => props.$isActive && css`
    background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);
    color: #fff;
    border: 2px solid rgba(243,156,18,0.6);
    box-shadow: 0 4px 12px rgba(243,156,18,0.4);
  `}
`;

// 진화 탭에 사용 가능 아이템 개수 뱃지
const TabBadge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  background: #2ecc71;
  color: white;
  font-size: 10px;
  font-weight: bold;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(46,204,113,0.6);
`;

const ItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 12px 12px;
`;

const Item = styled.div`
  background: linear-gradient(145deg, rgba(30,40,60,0.9), rgba(15,20,35,0.95));
  border: 1px solid rgba(243,156,18,0.3);
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
`;

const ItemTitle = styled.h3`
  font-size: 12px;
  margin: 0 0 2px 0;
  font-weight: bold;
  color: #4cafff;
`;

const ItemDesc = styled.p`
  font-size: 9px;
  margin: 0 0 4px 0;
  color: #a0aec0;
`;

const BuyBtn = styled.button`
  padding: 4px 8px;
  background: linear-gradient(135deg, #f39c12 0%, #d68910 100%);
  color: #fff;
  border: 1px solid rgba(243,156,18,0.4);
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
  font-size: 10px;
  box-shadow: 0 2px 8px rgba(243,156,18,0.3);
  &:hover { background: linear-gradient(135deg, #d68910 0%, #b8730e 100%); }
`;

const EvolutionTab = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 12px 12px;
`;

const CategorySection = styled.div`
  margin: 0;
`;

const CategoryTitle = styled.h3`
  font-size: 12px;
  font-weight: bold;
  color: #f39c12;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(243,156,18,0.3);
`;

const ItemGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
`;

const EvoItemBtn = styled.button<{ $isUsable?: boolean }>`
  position: relative;
  padding: 8px;
  background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: white;
  text-align: left;

  &:hover {
    background: rgba(255,255,255,0.1);
    border-color: #f39c12;
  }

  ${props => props.$isUsable && css`
    border-color: #2ecc71;
    background: linear-gradient(145deg, rgba(46,204,113,0.12), rgba(30,40,60,0.9));
    box-shadow: 0 0 14px rgba(46,204,113,0.35), inset 0 1px 0 rgba(255,255,255,0.05);

    &:hover {
      border-color: #34f58b;
      background: linear-gradient(145deg, rgba(46,204,113,0.2), rgba(30,40,60,0.9));
      box-shadow: 0 0 20px rgba(46,204,113,0.5);
    }
  `}
`;

// 사용 가능 뱃지
const UsableBadge = styled.div`
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(46,204,113,0.5);
  pointer-events: none;
`;

const EvoItemName = styled.div<{ $isUsable?: boolean }>`
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 4px;
  color: ${props => props.$isUsable ? '#4fffaa' : '#fff'};
`;

const EvoItemPrice = styled.div`
  font-size: 11px;
  color: #FFD700;
  margin-bottom: 4px;
`;

const EvoItemDesc = styled.div`
  font-size: 10px;
  color: #999;
  line-height: 1.4;
`;