// src/components/Modals/WaveEndPicker.tsx

import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { Item } from '../../types/game';

export const WaveEndPicker: React.FC = () => {
  const { t } = useTranslation();
  const { waveEndItemPick, setWaveEndItemPick, useRewardItem, towers, wave } = useGameStore(state => ({
    waveEndItemPick: state.waveEndItemPick,
    setWaveEndItemPick: state.setWaveEndItemPick,
    useRewardItem: state.useRewardItem,
    towers: state.towers,
    wave: state.wave,
  }));
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  if (!waveEndItemPick) return null;

  const handleSelect = (item: Item) => {
    if ((item.type === 'mega-stone' || item.type === 'max-mushroom') && item.targetPokemonId) {
      const targetTower = towers.find(t => t.pokemonId === item.targetPokemonId);
      if (targetTower) {
        
        let evolutionItem: string;
        if (item.type === 'mega-stone') {
          evolutionItem = item.id; // 'mega_stone_venusaurite'와 같이 전체 ID를 전달
        } else { // item.type === 'max-mushroom'
          evolutionItem = 'max-mushroom'; // 이 부분은 기존 로직 유지
        }
            
        useGameStore.getState().evolvePokemon(targetTower.id, evolutionItem);
      }
      setWaveEndItemPick(null);
      useGameStore.setState({ isPaused: false });
      return;
    }
    
    setSelectedItem(item);
  };

  const handleTargetSelect = (towerId: string) => {
    if (!selectedItem) return;

    if (selectedItem.type === 'candy') {
      useRewardItem('candy', towerId);
    } else if (selectedItem.type === 'heal') {
      const tower = towers.find(t => t.id === towerId);
      if (tower && !tower.isFainted) {
        const newHp = Math.min(tower.maxHp, tower.currentHp + (selectedItem.value || 200));
        useGameStore.getState().updateTower(tower.id, { currentHp: newHp });
      }
    } else if (selectedItem.type === 'revive') {
      useRewardItem('revive', towerId);
    }
    
    setSelectedItem(null);
    setWaveEndItemPick(null);
    useGameStore.setState({ isPaused: false });
  };

  const handleCancelTarget = () => {
    setSelectedItem(null);
  };

  const handleSkip = () => {
    setSelectedItem(null);
    setWaveEndItemPick(null);
    useGameStore.setState({ isPaused: false });
  };

  const getItemName = (item: Item) => {
    // 메가스톤/다이버섯은 t() 번역을 거치지 않고 item.name (e.g., "이상해꽃의 메가스톤")을 그대로 사용
    if (item.type === 'mega-stone' || item.type === 'max-mushroom') {
      return item.name;
    }
    if ('params' in item && item.params) {
      // @ts-ignore
      return t(item.name, item.params);
    }
    return t(item.name);
  };

  const getItemEffect = (item: Item) => {
    // 메가스톤/다이버섯은 t() 번역을 거치지 않고 item.effect (e.g., "이상해꽃을 메가진화시킵니다")를 그대로 사용
    if (item.type === 'mega-stone' || item.type === 'max-mushroom') {
      return item.effect;
    }
    if ('params' in item && item.params) {
      // @ts-ignore
      return t(item.effect, item.params);
    }
    return t(item.effect);
  };


  if (selectedItem) {
    return (
      <Overlay>
        <Modal>
          <Header>
            <Title>🎯 {t('waveEnd.targetTitle', { name: getItemName(selectedItem) })}</Title>
          </Header>
          <Subtitle>
            {selectedItem.type === 'candy' && t('waveEnd.targetCandy')}
            {selectedItem.type === 'heal' && t('waveEnd.targetHeal')}
            {selectedItem.type === 'revive' && t('waveEnd.targetRevive')}
          </Subtitle>
          <TowerGrid>
            {towers.map(tower => {
              const isSelectable = selectedItem.type === 'revive' ? tower.isFainted : !tower.isFainted;
              
              return (
                <TowerCard 
                  key={tower.id} 
                  $isSelectable={isSelectable}
                  onClick={() => isSelectable && handleTargetSelect(tower.id)}
                >
                  <TowerImg src={tower.sprite} alt={tower.displayName} />
                  <TowerName>{tower.displayName}</TowerName>
                  <TowerInfo>Lv.{tower.level}</TowerInfo>
                  <TowerInfo>HP: {Math.floor(tower.currentHp)}/{tower.maxHp}</TowerInfo>
                  
                  {tower.isFainted && <FaintedLabel>{t('manager.fainted')}</FaintedLabel>}
                </TowerCard>
              );
            })}
          </TowerGrid>
          <CancelBtn onClick={handleCancelTarget}>← {t('common.back')}</CancelBtn>
        </Modal>
      </Overlay>
    );
  }

  return (
    <Overlay>
      <Modal>
        <Header>
          <Title>🎉 {t('waveEnd.clearTitle', { wave: wave })}</Title>
        </Header>
        <Subtitle>✨ {t('waveEnd.clearSubtitle')}</Subtitle>
        <Grid>
          {waveEndItemPick.map((item, idx) => {
            const isSpecial = (item.type === 'mega-stone' || item.type === 'max-mushroom');
            
            return (
              <Card 
                key={idx} 
                $isSpecial={isSpecial}
                onClick={() => handleSelect(item)}
              >
                <CardGlow />
                <ItemName $isSpecial={isSpecial}>
                  {isSpecial && '✨ '}
                  {getItemName(item)}
                </ItemName>
                <ItemEffect>{getItemEffect(item)}</ItemEffect>
              </Card>
            );
          })}
        </Grid>
        
        <CancelBtn onClick={handleSkip}>
          ❌ {t('waveEnd.skip')}
        </CancelBtn>

      </Modal>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(46, 204, 113, 0.3), rgba(0, 0, 0, 0.95));
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
  animation: fadeIn 0.3s ease-out;
`;

const Modal = styled.div`
  background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%);
  color: #e8edf3;
  border-radius: 24px;
  padding: 0;
  max-width: 1000px;
  width: 90%;
  box-shadow: 0 25px 80px rgba(46, 204, 113, 0.5), 0 0 1px 1px rgba(46, 204, 113, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(46, 204, 113, 0.3);
  animation: pulse 2s ease-in-out infinite;
`;

const Header = styled.div`
  padding: 32px;
  background: linear-gradient(90deg, rgba(46, 204, 113, 0.2), transparent);
  border-bottom: 2px solid rgba(46, 204, 113, 0.3);
  text-align: center;
`;

const Title = styled.h2`
  font-size: 36px;
  font-weight: 900;
  margin: 0;
  background: linear-gradient(135deg, #2ecc71, #a8ffb8);
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 30px rgba(46, 204, 113, 0.6);
  letter-spacing: 1px;
`;

const Subtitle = styled.p`
  font-size: 18px;
  margin: 24px 32px;
  text-align: center;
  color: #a8b8c8;
  font-weight: 600;
`;

const Grid = styled.div`
  display: flex;
  gap: 20px;
  padding: 0 32px 32px;
  justify-content: center;
  flex-wrap: wrap;
`;

const Card = styled.div<{ $isSpecial: boolean }>`
  flex: 1 1 200px;
  min-width: 180px;
  max-width: 220px;
  background: linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95));
  border: 2px solid ${props => props.$isSpecial ? '#e040fb' : 'rgba(46, 204, 113, 0.4)'};
  border-radius: 20px;
  padding: 28px 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isSpecial
    ? '0 0 30px rgba(224, 64, 251, 0.8), 0 8px 32px rgba(0,0,0,0.4)'
    : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'};
  position: relative;
  overflow: hidden;
  text-align: center;

  &:hover {
    transform: translateY(-4px);
  }
`;

const CardGlow = styled.div`
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(46, 204, 113, 0.1) 0%, transparent 70%);
  animation: pulse 3s ease-in-out infinite;
  pointer-events: none;
`;

const ItemName = styled.h3<{ $isSpecial: boolean }>`
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 12px;
  color: ${props => props.$isSpecial ? '#e040fb' : '#2ecc71'};
  text-shadow: ${props => props.$isSpecial
    ? '0 0 20px rgba(224, 64, 251, 0.8)'
    : '0 0 15px rgba(46, 204, 113, 0.6)'};
  position: relative;
  z-index: 1;
`;

const ItemEffect = styled.p`
  font-size: 14px;
  color: #a8b8c8;
  line-height: 1.6;
  position: relative;
  z-index: 1;
`;

const TowerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 20px;
  padding: 24px 32px;
`;

const TowerCard = styled.div<{ $isSelectable: boolean }>`
  background: linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95));
  border: 2px solid rgba(52, 152, 219, 0.4);
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
      border-color: #4cafff;
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
  margin: 8px 0;
  color: #4cafff;
  text-transform: capitalize;
`;

const TowerInfo = styled.p`
  font-size: 14px;
  margin: 4px 0;
  color: #a8b8c8;
`;

const FaintedLabel = styled.p`
  color: #e74c3c;
  font-weight: bold;
  font-size: 14px;
  margin-top: 8px;
`;

const CancelBtn = styled.button`
  width: calc(100% - 64px);
  margin: 24px 32px 32px;
  padding: 16px;
  font-size: 18px;
  background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
  color: #fff;
  border: 2px solid rgba(149, 165, 166, 0.4);
  border-radius: 14px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

  &:hover {
    background: linear-gradient(135deg, #7f8c8d 0%, #6d7b7c 100%);
  }
`;