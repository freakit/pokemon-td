// src/components/Modals/SkillPicker.tsx

import React from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';

const TYPE_ICON_API_BASE = 'https://www.serebii.net/pokedex-bw/type/';

export const SkillPicker: React.FC = () => {
  const { t } = useTranslation();
  const { skillChoiceQueue, removeCurrentSkillChoice, updateTower } = useGameStore(state => ({
    skillChoiceQueue: state.skillChoiceQueue,
    removeCurrentSkillChoice: state.removeCurrentSkillChoice,
    updateTower: state.updateTower,
  }));

  if (!skillChoiceQueue || skillChoiceQueue.length === 0) return null;
  
  const currentChoice = skillChoiceQueue[0];
  const { towerId, newMoves } = currentChoice;
  const tower = useGameStore.getState().towers.find(t => t.id === towerId);

  if (!tower || newMoves.length === 0) {
    removeCurrentSkillChoice();
    return null;
  }

  const newMove = newMoves[0];
  const currentMove = tower.equippedMoves[0];

  const handleLearnNewMove = () => {
    updateTower(towerId, { equippedMoves: [newMove] });
    removeCurrentSkillChoice();
  };

  const handleKeepCurrentMove = () => {
    const tower = useGameStore.getState().towers.find(t => t.id === towerId);
    if (tower) {
      const rejectedMoves = [...(tower.rejectedMoves || []), newMove.name];
      updateTower(towerId, { rejectedMoves });
    }
    removeCurrentSkillChoice();
  };

  const getDamageClass = (dc: string) => {
    return dc === 'physical' ? t('common.physical') : t('common.special');
  };

  return (
    <Container>
      <Header>
        <Title>⭐ {t('skillPicker.levelUpName', { name: tower.name })}</Title>
        <PokemonName>{t('skillPicker.pokemonLevel', { level: tower.level })}</PokemonName>
      </Header>
      
      <Subtitle>🔄 {t('skillPicker.selectSkill')}</Subtitle>
      
      <SkillSection>
        <SectionLabel>{t('skillPicker.current')}</SectionLabel>
        <SkillCard $isNew={false}>
          <SkillName>
            {currentMove.name} | {getDamageClass(currentMove.damageClass)}
            <TypeIcon 
              src={`${TYPE_ICON_API_BASE}${currentMove.type}.gif`} 
              alt={currentMove.type} 
            />
          </SkillName>
          <SkillStats>
            <StatRow>
              <span>⚔️</span>
              <span>{currentMove.power}</span>
            </StatRow>
            <StatRow>
              <span>🎯</span>
              <span>{currentMove.accuracy}%</span>
            </StatRow>
          </SkillStats>
          {currentMove.effect.statusInflict && currentMove.effect.statusChance != null && currentMove.effect.statusChance > 0 && (
            <EffectBadge $type="status">
              💫 {t('skillPicker.statusEffect', { status: currentMove.effect.statusInflict, chance: currentMove.effect.statusChance })}
            </EffectBadge>
          )}
          {currentMove.effect.drainPercent && (
            <EffectBadge $type="drain">
              🩸 {t('skillPicker.drain', { percent: currentMove.effect.drainPercent * 100 })}
            </EffectBadge>
          )}
          {currentMove.isAOE && <EffectBadge $type="aoe">🌀 {t('skillPicker.aoe')}</EffectBadge>}
        </SkillCard>
        <KeepBtn onClick={handleKeepCurrentMove}>
          ✅ {t('skillPicker.keep')}
        </KeepBtn>
      </SkillSection>

      <Arrow>⇅</Arrow>

      <SkillSection>
        <SectionLabel>{t('skillPicker.new')}</SectionLabel>
        <SkillCard $isNew={true}>
          <SkillName>
            {newMove.name} | {getDamageClass(newMove.damageClass)}
            <TypeIcon 
              src={`${TYPE_ICON_API_BASE}${newMove.type}.gif`} 
              alt={newMove.type} 
            />
          </SkillName>
          <SkillStats>
            <StatRow>
              <span>⚔️</span>
              <span>{newMove.power}</span>
            </StatRow>
            <StatRow>
              <span>🎯</span>
              <span>{newMove.accuracy}%</span>
            </StatRow>
          </SkillStats>
          {newMove.effect.statusInflict && newMove.effect.statusChance != null && newMove.effect.statusChance > 0 && (
            <EffectBadge $type="status">
              💫 {t('skillPicker.statusEffect', { status: newMove.effect.statusInflict, chance: newMove.effect.statusChance })}
            </EffectBadge>
          )}
          {newMove.effect.drainPercent && (
            <EffectBadge $type="drain">
              🩸 {t('skillPicker.drain', { percent: newMove.effect.drainPercent * 100 })}
            </EffectBadge>
          )}
          {newMove.isAOE && <EffectBadge $type="aoe">🌀 {t('skillPicker.aoe')}</EffectBadge>}
        </SkillCard>
        <LearnBtn onClick={handleLearnNewMove}>
          ⭐ {t('skillPicker.learn')}
        </LearnBtn>
      </SkillSection>

      {skillChoiceQueue.length > 1 && (
        <QueueInfo>
          {t('skillPicker.queue', { count: skillChoiceQueue.length - 1 })}
        </QueueInfo>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  position: fixed;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 280px;
  max-height: 80vh;
  overflow-y: auto;
  background: linear-gradient(145deg, rgba(26, 31, 46, 0.98), rgba(15, 20, 25, 0.98));
  border: 3px solid rgba(155, 89, 182, 0.5);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 20px 60px rgba(155, 89, 182, 0.4), 0 0 2px 1px rgba(155, 89, 182, 0.3);
  backdrop-filter: blur(10px);
  z-index: 1000;
  animation: slideInLeft 0.3s ease-out;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 2px solid rgba(155, 89, 182, 0.3);
`;

const Title = styled.h3`
  font-size: 20px;
  font-weight: bold;
  margin: 0 0 4px 0;
  color: #9b59b6;
  text-shadow: 0 0 10px rgba(155, 89, 182, 0.6);
`;

const PokemonName = styled.div`
  font-size: 14px;
  color: #a8b8c8;
  font-weight: 600;
`;

const Subtitle = styled.div`
  font-size: 14px;
  text-align: center;
  color: #4cafff;
  margin-bottom: 12px;
  font-weight: 600;
`;

const SkillSection = styled.div`
  margin-bottom: 12px;
`;

const SectionLabel = styled.div`
  font-size: 12px;
  font-weight: bold;
  color: #4cafff;
  margin-bottom: 8px;
  text-transform: uppercase;
`;

const SkillCard = styled.div<{ $isNew: boolean }>`
  background: linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95));
  border: 2px solid ${props => props.$isNew ? 'rgba(155, 89, 182, 0.5)' : 'rgba(52, 152, 219, 0.4)'};
  box-shadow: ${props => props.$isNew ? '0 0 15px rgba(155, 89, 182, 0.3)' : 'none'};
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 8px;
`;

const SkillName = styled.div`
  align-items: center;
  font-size: 15px;
  font-weight: bold;
  color: #4cafff;
  margin-bottom: 8px;
  text-transform: capitalize;
`;

const TypeIcon = styled.img`
  height: 14px;
  object-fit: contain;
  margin-left: 8px;
  margin-bottom: -2px;
`;

const SkillStats = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
`;

const StatRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #e8edf3;
  font-weight: 600;
`;

const EffectBadge = styled.div<{ $type: 'status' | 'drain' | 'aoe' }>`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  margin-top: 4px;
  font-weight: 600;

  ${props => props.$type === 'status' && `
    background: rgba(155, 89, 182, 0.2);
    border: 1px solid rgba(155, 89, 182, 0.3);
  `}
  
  ${props => props.$type === 'drain' && `
    background: rgba(46, 204, 113, 0.2);
    border: 1px solid rgba(46, 204, 113, 0.3);
  `}
  
  ${props => props.$type === 'aoe' && `
    background: rgba(243, 156, 18, 0.2);
    border: 1px solid rgba(243, 156, 18, 0.3);
  `}
`;

const KeepBtn = styled.button`
  width: 100%;
  padding: 10px;
  font-size: 14px;
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  color: #fff;
  border: 2px solid rgba(52, 152, 219, 0.4);
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #2980b9 0%, #2471a3 100%);
  }
`;

const LearnBtn = styled.button`
  width: 100%;
  padding: 10px;
  font-size: 14px;
  background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
  color: #fff;
  border: 2px solid rgba(155, 89, 182, 0.4);
  border-radius: 10px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(155, 89, 182, 0.4);
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%);
  }
`;

const Arrow = styled.div`
  text-align: center;
  font-size: 24px;
  color: #9b59b6;
  margin: 8px 0;
  text-shadow: 0 0 10px rgba(155, 89, 182, 0.6);
`;

const QueueInfo = styled.div`
  text-align: center;
  font-size: 11px;
  color: #a8b8c8;
  margin-top: 12px;
  padding: 6px;
  background: rgba(155, 89, 182, 0.1);
  border-radius: 8px;
  border: 1px solid rgba(155, 89, 182, 0.2);
`;