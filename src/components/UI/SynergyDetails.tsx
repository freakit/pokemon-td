import React from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { getGenerationById } from '../../utils/synergyManager';
import { GamePokemon } from '../../types/game';

export const SynergyDetails: React.FC = () => {
  const { t } = useTranslation();
  const { hoveredSynergy, towers } = useGameStore(state => ({
    hoveredSynergy: state.hoveredSynergy,
    towers: state.towers,
  }));

  if (!hoveredSynergy) {
    return null;
  }

  const [type, value] = hoveredSynergy.id.split(':');
  
  const synergyName = type === 'type'
    ? t(`types.${value}`)
    : t('synergy.genName', { gen: value });

  const activeTowers = towers.filter(t => !t.isFainted);
  let matchingPokemon: GamePokemon[] = [];

  if (type === 'type') {
    matchingPokemon = activeTowers.filter(t => t.types.includes(value));
  } else if (type === 'gen') {
    matchingPokemon = activeTowers.filter(t => getGenerationById(t.pokemonId) === Number(value));
  }

  return (
    <Container>
      <Title>{synergyName} ({hoveredSynergy.count})</Title>
      <List>
        {matchingPokemon.length > 0 ? (
          matchingPokemon.map(pokemon => (
            <PokemonItem key={pokemon.id}>
              <Sprite src={pokemon.sprite} alt={pokemon.name} />
              <Name>{pokemon.name} ({t('common.levelShort')}.{pokemon.level})</Name>
            </PokemonItem>
          ))
        ) : (
          <Empty>{t('synergy.empty')}</Empty>
        )}
      </List>
    </Container>
  );
};

const Container = styled.div`
  position: fixed;
  left: 304px; 
  top: 16px;
  width: 240px;
  max-height: 45vh;
  overflow-y: auto;
  background: linear-gradient(145deg, rgba(26, 31, 46, 0.98), rgba(15, 20, 25, 0.98));
  border: 3px solid rgba(155, 89, 182, 0.5);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  z-index: 998;
  animation: fadeIn 0.2s ease-out;
`;

const Title = styled.h4`
  font-size: 16px;
  font-weight: bold;
  color: #9b59b6;
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(155, 89, 182, 0.3);
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PokemonItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.2);
  padding: 4px 8px;
  border-radius: 6px;
`;

const Sprite = styled.img`
  width: 40px;
  height: 40px;
  image-rendering: pixelated;
`;

const Name = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #e8edf3;
`;

const Empty = styled.p`
  font-size: 13px;
  color: #a8b8c8;
  text-align: center;
  padding: 10px 0;
`;