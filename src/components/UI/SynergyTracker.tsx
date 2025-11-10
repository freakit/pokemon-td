// src/components/UI/SynergyTracker.tsx
import React from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';

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
  
  return { icon: '?', imageUrl: null, name: id };
}

export const SynergyTracker: React.FC = () => {
  const { t } = useTranslation();
  const { activeSynergies, setHoveredSynergy } = useGameStore(state => ({
    activeSynergies: state.activeSynergies,
    setHoveredSynergy: state.setHoveredSynergy,
  }));

  if (!activeSynergies || activeSynergies.length === 0) {
    return null;
  }
  
  const sortedSynergies = [...activeSynergies].sort((a, b) => {
    if (b.level !== a.level) {
      return b.level - a.level;
    }
    return b.count - a.count;
  });

  return (
    <Container onMouseLeave={() => setHoveredSynergy(null)}>
      <Title>💎 {t('synergy.title')}</Title>
      <List>
        {sortedSynergies.map(syn => {
          const styleInfo = getSynergyStyle(syn.id, t);
          
          return (
            <SynergyItem 
              key={syn.id} 
              $level={syn.level}
              onMouseEnter={() => setHoveredSynergy(syn)}
            >
              
              {styleInfo.imageUrl ? (
                <SynergyImage 
                  src={styleInfo.imageUrl} 
                  alt={styleInfo.name} 
                />
              ) : (
                <SynergyIcon>{styleInfo.icon}</SynergyIcon>
              )}

              <SynergyInfo>
                <SynergyName>{styleInfo.name} ({syn.count})</SynergyName>
                <SynergyDesc>{syn.description}</SynergyDesc>
              </SynergyInfo>
            </SynergyItem>
          );
        })}
      </List>
    </Container>
  );
};

const Container = styled.div`
  position: fixed;
  left: 16px;
  top: 16px;
  width: 280px;
  max-height: 45vh;
  overflow-y: auto;
  background: linear-gradient(145deg, rgba(26, 31, 46, 0.95), rgba(15, 20, 25, 0.95));
  border: 3px solid rgba(76, 175, 255, 0.4);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  z-index: 999;
  animation: slideInLeft 0.3s ease-out;
  transform: translateY(0);
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: bold;
  color: #4cafff;
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(76, 175, 255, 0.2);
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const getLevelStyles = (level: number) => {
  switch (level) {
    case 1: // 2-piece
      return `
        background: rgba(30, 40, 60, 0.7);
        border: 1px solid rgba(205, 127, 50, 0.5);
        opacity: 0.8;
      `;
    case 2: // 4-piece
      return `
        background: linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95));
        border: 1px solid rgba(76, 175, 255, 0.7);
        box-shadow: 0 0 10px rgba(76, 175, 255, 0.2);
        opacity: 1.0;
      `;
    case 3: // 6-piece
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

const SynergyItem = styled.div<{$level: number}>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
  ${props => getLevelStyles(props.$level)}
`;

const SynergyIcon = styled.div`
  font-size: 20px;
  font-weight: bold;
  color: #4cafff;
  flex-shrink: 0;
  width: 64px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
`;

const SynergyImage = styled.img`
  width: 64px;
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
  font-size: 14px;
  font-weight: bold;
  color: #e8edf3;
`;

const SynergyDesc = styled.div`
  font-size: 11px;
  color: #a8b8c8;
  line-height: 1.3;
`;