// src/components/UI/PokemonManager.tsx

import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { Gender } from '../../types/game';
import { FUSION_DATA } from '../../data/evolution';

const getGenderIcon = (gender: Gender) => {
  if (gender === 'male') return '♂';
  if (gender === 'female') return '♀';
  return '⚪';
};

const getGenderColor = (gender: Gender) => {
  if (gender === 'male') return '#4A90E2';
  if (gender === 'female') return '#E91E63';
  return '#999';
};

export const PokemonManager: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const { towers, sellTower, fusePokemon, spendMoney, money } = useGameStore(state => ({
    towers: state.towers,
    sellTower: state.sellTower,
    fusePokemon: state.fusePokemon,
    spendMoney: state.spendMoney,
    money: state.money,
  }));
  const [fusionMode, setFusionMode] = useState(false);
  const [selectedBase, setSelectedBase] = useState<string | null>(null);

  const handleSell = (towerId: string, towerDisplayName: string, level: number) => {
    const sellPrice = level * 20;
    const confirmed = window.confirm(
      t('manager.sellConfirm', { name: towerDisplayName, level: level, price: sellPrice })
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
      const canBeBase = FUSION_DATA.some(f => f.base === tower.pokemonId);
      if (!canBeBase) {
        alert(t('alerts.cannotFuseBase'));
        return;
      }
      setSelectedBase(towerId);
    } else {
      if (selectedBase === towerId) {
        alert(t('alerts.cannotSelectSamePokemon'));
        return;
      }

      const baseTower = towers.find(t => t.id === selectedBase);
      const materialTower = tower;
      
      if (!baseTower) {
        setSelectedBase(null);
        return;
      }

      const fusion = FUSION_DATA.find(f => 
        f.base === baseTower.pokemonId && 
        f.material === materialTower.pokemonId &&
        f.item === 'dna-splicers'
      );
      
      if (!fusion) {
        alert(t('alerts.cannotFusePokemon'));
        setSelectedBase(null);
        return;
      }

      const fusionCost = 500;
      const confirmed = window.confirm(
        t('manager.fusionConfirm', { base: baseTower.displayName, material: materialTower.displayName, cost: fusionCost })
      );
      
      if (confirmed) {
        if (!spendMoney(fusionCost)) {
          alert(t('alerts.notEnoughMoneyWithCost', { cost: fusionCost }));
          setSelectedBase(null);
          return;
        }

        fusePokemon(selectedBase, towerId, 'dna-splicers').then(success => {
          if (success) {
            alert(t('alerts.fusionSuccess'));
          } else {
            alert(t('alerts.fusionFailed'));
          }
          setFusionMode(false);
          setSelectedBase(null);
        });
      } else {
        setSelectedBase(null);
      }
    }
  };

  const getFusionHint = (towerId: string) => {
    const tower = towers.find(t => t.id === towerId);
    if (!tower) return null;

    const asBase = FUSION_DATA.filter(f => f.base === tower.pokemonId);
    if (asBase.length > 0) {
      const materialIds = asBase.map(f => f.material);
      const availableMaterials = towers.filter(t => materialIds.includes(t.pokemonId));
      if (availableMaterials.length > 0) {
        return '🧬';
      }
    }

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
    <Overlay>
      <Modal>
        <Header>
          <div>
            <Title>🎒 {t('manager.title', { towers: towers.length })}</Title>
            <MoneyDisplay>💰 {money}{t('common.money')}</MoneyDisplay>
          </div>
          <HeaderButtons>
            <FusionBtn 
              onClick={handleFusionClick} 
              $fusionMode={fusionMode}
            >
              {fusionMode ? `❌ ${t('common.cancel')}` : `🧬 ${t('manager.fusion')}`}
            </FusionBtn>
            <CloseBtn onClick={onClose}>✕</CloseBtn>
          </HeaderButtons>
        </Header>
        
        {fusionMode && (
          <FusionInfo>
            {!selectedBase ? (
              <p>{t('manager.fusionInfoBase', { cost: 500 })}</p>
            ) : (
              <p>{t('manager.fusionInfoMaterial', { cost: 500 })}</p>
            )}
          </FusionInfo>
        )}
        
        {towers.length === 0 ?
        (
          <EmptyMessage>{t('manager.empty')}</EmptyMessage>
        ) : (
          <Grid>
            {towers.map(tower => {
              const sellPrice = tower.level * 20;
              const hpPercent = Math.round((tower.currentHp / tower.maxHp) * 100);
              const fusionHint = getFusionHint(tower.id);
              const isSelected = selectedBase === tower.id;
              
              return (
                <Card 
                  key={tower.id} 
                  $isSelected={isSelected}
                  $fusionMode={fusionMode}
                  onClick={() => handlePokemonClick(tower.id)}
                >
                  <CardHeader>
                    <Sprite src={tower.sprite} alt={tower.displayName} />
                    {tower.isFainted && (
                      <FaintedBadge>{t('manager.fainted')}</FaintedBadge>
                    )}
                    {fusionHint && fusionMode && (
                      <FusionBadge>{fusionHint}</FusionBadge>
                    )}
                  </CardHeader>
                  
                  <CardBody>
                    <NameRow>
                      <PokeName>{tower.displayName}</PokeName>
                      <GenderIcon $gender={tower.gender}>
                         {getGenderIcon(tower.gender)}
                      </GenderIcon>
                    </NameRow>
                    <InfoRow>
                       <span>{t('common.level')}</span>
                      <InfoValue>{tower.level}</InfoValue>
                    </InfoRow>
                    <InfoRow>
                      <span>{t('picker.hp')}</span>
                       <InfoValue>
                        {Math.floor(tower.currentHp)}/{tower.maxHp} ({hpPercent}%)
                      </InfoValue>
                    </InfoRow>
                    
                    <InfoRow>
                      <span>{t('manager.kills')}</span>
                      <InfoValue>{tower.kills}</InfoValue>
                    </InfoRow>
                
                    <InfoRow>
                      <span>{t('picker.move')}</span>
                      <InfoValue>{tower.equippedMoves[0]?.displayName || 'N/A'}</InfoValue>
                    </InfoRow>
                  </CardBody>
                  
                  {!fusionMode && (
                    <SellBtn 
                       onClick={() => handleSell(tower.id, tower.displayName, tower.level)}
                    >
                      💰 {t('manager.sell', { price: sellPrice })}
                    </SellBtn>
                  )}
                </Card>
              );
            })}
          </Grid>
        )}
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
  background: radial-gradient(circle at center, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.95));
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  animation: fadeIn 0.3s ease-out;
`;

const Modal = styled.div`
  background: linear-gradient(145deg, #2a2d3a, #1f2029);
  border-radius: 20px;
  padding: 30px;
  max-width: 1000px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.1);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: bold;
  background: linear-gradient(135deg, #6666ff 0%, #3388ff 100%);
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 5px;
`;

const MoneyDisplay = styled.div`
  font-size: 16px;
  color: #FFD700;
  font-weight: bold;
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 10px;
`;

const FusionBtn = styled.button<{ $fusionMode: boolean }>`
  font-size: 16px;
  font-weight: bold;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.$fusionMode ? '#e74c3c' : 'linear-gradient(135deg, #1c3bb6 0%, #020842 100%)'};

  &:hover {
    filter: brightness(1.2);
  }
`;

const CloseBtn = styled.button`
  font-size: 24px;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 5px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const FusionInfo = styled.div`
  background: rgba(102, 126, 234, 0.2);
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
`;

const EmptyMessage = styled.p`
  font-size: 18px;
  color: #999;
  text-align: center;
  padding: 40px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const Card = styled.div<{ $isSelected: boolean, $fusionMode: boolean }>`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 15px;
  border: 2px solid ${props => props.$isSelected ? '#667eea' : 'rgba(255, 255, 255, 0.1)'};
  transition: all 0.3s ease;
  cursor: ${props => props.$fusionMode ? 'pointer' : 'default'};
  transform: ${props => props.$isSelected ? 'scale(1.05)' : 'scale(1)'};
`;

const CardHeader = styled.div`
  position: relative;
  text-align: center;
  margin-bottom: 15px;
`;

const Sprite = styled.img`
  width: 100px;
  height: 100px;
  image-rendering: pixelated;
`;

const FaintedBadge = styled.div`
  position: absolute;
  top: 5px;
  right: 5px;
  background: #e74c3c;
  color: white;
  font-size: 12px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 8px;
`;

const FusionBadge = styled.div`
  position: absolute;
  top: 5px;
  left: 5px;
  font-size: 24px;
`;

const CardBody = styled.div`
  margin-bottom: 15px;
`;

const NameRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
`;

const PokeName = styled.h3`
  font-size: 20px;
  font-weight: bold;
  margin: 0;
  color: #fff;
`;

const GenderIcon = styled.span<{ $gender: Gender }>`
  font-size: 18px;
  font-weight: bold;
  color: ${props => getGenderColor(props.$gender)};
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 14px;
  color: #ddd;
`;

const InfoValue = styled.span`
  font-weight: bold;
  color: #FFD700;
`;

const SellBtn = styled.button`
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, #c0392b, #a93226);
  }
`;