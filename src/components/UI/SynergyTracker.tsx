// src/components/UI/SynergyTracker.tsx
import React, { useState } from 'react';

import styled from 'styled-components';
import { media, isMobileOrTablet } from '../../utils/responsive.utils';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { SPECIAL_SYNERGY_DEFS } from '../../utils/synergyManager';

const TYPE_ICON_API_BASE = 'https://www.serebii.net/pokedex-bw/type/';

const getSynergyStyle = (id: string, t: (key: string, params?: { [key: string]: string | number }) => string) => {
  const [type, value] = id.split(':');

  if (type === 'type') {
    return {
      icon: null,
      imageUrl: `${TYPE_ICON_API_BASE}${value}.gif`,
      name: t(`types.${value}`)
    };
  }

  if (type === 'gen') {
    return {
      icon: 'G' + value,
      imageUrl: null,
      name: t('synergy.genName', { gen: value })
    };
  }

  // 특수 시너지
  if (type === 'special') {
    const def = SPECIAL_SYNERGY_DEFS.find(d => d.id === id);
    return {
      icon: def?.icon ?? '⭐',
      imageUrl: null,
      name: def?.name ?? id,
    };
  }

  return { icon: '?', imageUrl: null, name: id };
};

export const SynergyTracker: React.FC = () => {
  const { t } = useTranslation();
  const { activeSynergies, setHoveredSynergy } = useGameStore(state => ({
    activeSynergies: state.activeSynergies,
    setHoveredSynergy: state.setHoveredSynergy,
  }));

  const [isCollapsed, setIsCollapsed] = useState(() => isMobileOrTablet());

  if (!activeSynergies || activeSynergies.length === 0) {
    return null;
  }


  const sortedSynergies = [...activeSynergies].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.count - a.count;
  });

  return (
    <Container 
      $isCollapsed={isCollapsed}
      onMouseLeave={() => setHoveredSynergy(null)}
    >
      <Title onClick={() => setIsCollapsed(!isCollapsed)}>
        <span>💎 {t('synergy.title')}</span>
        <ToggleButton>{isCollapsed ? '➕' : '➖'}</ToggleButton>
      </Title>
      <CollapseContent $isCollapsed={isCollapsed}>
        <List>
          {sortedSynergies.map(syn => {
            const styleInfo = getSynergyStyle(syn.id, t);
            const isSpecial = syn.id.startsWith('special:');

            return (
              <SynergyItem
                key={syn.id}
                $level={syn.level}
                $isSpecial={isSpecial}
                onMouseEnter={() => setHoveredSynergy(syn)}
              >
                {styleInfo.imageUrl ? (
                  <SynergyImage src={styleInfo.imageUrl} alt={styleInfo.name} />
                ) : (
                  <SynergyIcon $isSpecial={isSpecial}>{styleInfo.icon}</SynergyIcon>
                )}

                <SynergyInfo>
                  <SynergyName>{styleInfo.name} ({syn.count})</SynergyName>
                  <SynergyDesc>{syn.description}</SynergyDesc>
                </SynergyInfo>
              </SynergyItem>
            );
          })}
        </List>
      </CollapseContent>
    </Container>

  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const Container = styled.div<{ $isCollapsed: boolean }>`
  position: fixed;
  left: 10px;
  top: 10px;
  width: 240px;
  max-height: ${props => props.$isCollapsed ? '46px' : '45vh'};
  overflow: hidden;
  background: linear-gradient(145deg, rgba(26, 31, 46, 0.95), rgba(15, 20, 25, 0.95));
  border: 3px solid rgba(76, 175, 255, 0.4);
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  z-index: 3000;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slideInLeft 0.3s ease-out;
  ${media.mobile} {
    width: 130px;
    left: 4px;
    top: 4px;
    padding: 6px;
    max-height: ${props => props.$isCollapsed ? '34px' : '40vh'};
    border-width: 2px;
    border-radius: 10px;
  }
`;

const Title = styled.h3`
  font-size: 16px;
  font-weight: bold;
  color: #4cafff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0;
  padding-bottom: 6px;
  border-bottom: 2px solid rgba(76, 175, 255, 0.2);
  cursor: pointer;
  user-select: none;
  
  @media (hover: hover) {
    &:hover { color: #8ccfff; }
  }

  ${media.mobile} {
    font-size: 11px;
    padding-bottom: 4px;
  }
`;

const ToggleButton = styled.span`
  font-size: 14px;
  opacity: 0.8;
  transition: transform 0.3s ease;
`;

const CollapseContent = styled.div<{ $isCollapsed: boolean }>`
  max-height: ${props => props.$isCollapsed ? '0' : '40vh'};
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  overflow-y: auto;
  margin-top: ${props => props.$isCollapsed ? '0' : '10px'};
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(76, 175, 255, 0.3);
    border-radius: 3px;
  }
`;


const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const getLevelStyles = (level: number, isSpecial: boolean) => {
  if (isSpecial) {
    // 특수 시너지: level 1~5
    if (level >= 4) return `
      background: linear-gradient(145deg, rgba(60, 20, 80, 0.9), rgba(40, 10, 60, 0.95));
      border: 1px solid rgba(255, 180, 50, 0.9);
      box-shadow: 0 0 18px rgba(255, 180, 50, 0.5);
    `;
    if (level >= 3) return `
      background: linear-gradient(145deg, rgba(50, 20, 70, 0.9), rgba(30, 10, 50, 0.95));
      border: 1px solid rgba(200, 100, 255, 0.8);
      box-shadow: 0 0 14px rgba(200, 100, 255, 0.4);
    `;
    if (level >= 2) return `
      background: linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95));
      border: 1px solid rgba(76, 175, 255, 0.7);
      box-shadow: 0 0 10px rgba(76, 175, 255, 0.2);
    `;
    // level 1
    return `
      background: rgba(30, 40, 60, 0.7);
      border: 1px solid rgba(205, 127, 50, 0.5);
      opacity: 0.85;
    `;
  }

  // 타입/세대 시너지
  switch (level) {
    case 1:
      return `
        background: rgba(30, 40, 60, 0.7);
        border: 1px solid rgba(205, 127, 50, 0.5);
        opacity: 0.8;
      `;
    case 2:
      return `
        background: linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95));
        border: 1px solid rgba(76, 175, 255, 0.7);
        box-shadow: 0 0 10px rgba(76, 175, 255, 0.2);
        opacity: 1.0;
      `;
    case 3:
      return `
        background: linear-gradient(145deg, rgba(40, 30, 60, 0.9), rgba(25, 15, 35, 0.95));
        border: 1px solid rgba(155, 89, 182, 0.8);
        box-shadow: 0 0 15px rgba(155, 89, 182, 0.4);
        opacity: 1.0;
      `;
    default:
      return '';
  }
};

const SynergyItem = styled.div<{ $level: number; $isSpecial: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.3s ease;
  ${props => getLevelStyles(props.$level, props.$isSpecial)}
`;

const SynergyIcon = styled.div<{ $isSpecial?: boolean }>`
  font-size: ${props => props.$isSpecial ? '18px' : '16px'};
  font-weight: bold;
  color: #4cafff;
  flex-shrink: 0;
  width: 50px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const SynergyImage = styled.img`
  width: 50px;
  height: 14px;
  flex-shrink: 0;
  object-fit: contain;
  align-self: center;
`;

const SynergyInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const SynergyName = styled.div`
  font-size: 12px;
  font-weight: bold;
  color: #e8edf3;
`;

const SynergyDesc = styled.div`
  font-size: 10px;
  color: #a8b8c8;
  line-height: 1.3;
`;