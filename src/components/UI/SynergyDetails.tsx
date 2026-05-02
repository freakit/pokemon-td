// src/components/UI/SynergyDetails.tsx
import React from 'react';
import styled from 'styled-components';
import { lMedia } from '../../utils/responsive.utils';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { getGenerationById, SPECIAL_SYNERGY_DEFS } from '../../utils/synergyManager';
import { GamePokemon } from '../../types/game';

export const SynergyDetails: React.FC = () => {
  const { t } = useTranslation();
  const { hoveredSynergy, towers } = useGameStore(state => ({
    hoveredSynergy: state.hoveredSynergy,
    towers: state.towers,
  }));

  if (!hoveredSynergy) return null;

  const [type, value] = hoveredSynergy.id.split(':');

  let synergyName = '';
  const activeTowers = towers.filter(t => !t.isFainted);
  let matchingPokemon: GamePokemon[] = [];

  if (type === 'type') {
    synergyName = t(`types.${value}`);
    matchingPokemon = activeTowers.filter(t => t.types.includes(value));
  } else if (type === 'gen') {
    synergyName = t('synergy.genName', { gen: value });
    matchingPokemon = activeTowers.filter(t => getGenerationById(t.pokemonId) === Number(value));
  } else if (type === 'special') {
    const def = SPECIAL_SYNERGY_DEFS.find(d => d.id === hoveredSynergy.id);
    synergyName = def ? `${def.icon} ${def.name}` : hoveredSynergy.name;
    const idSet = new Set(def?.pokemonIds ?? []);
    matchingPokemon = activeTowers.filter(t => idSet.has(t.pokemonId));
  }

  return (
    <Container>
      <Title>{synergyName} ({hoveredSynergy.count})</Title>
      <List>
        {matchingPokemon.length > 0 ? (
          matchingPokemon.map(pokemon => (
            <PokemonItem key={pokemon.id}>
              <Sprite src={pokemon.sprite} alt={pokemon.displayName} />
              <Name>{pokemon.displayName} ({t('common.levelShort')}.{pokemon.level})</Name>
            </PokemonItem>
          ))
        ) : (
          <Empty>{t('synergy.empty')}</Empty>
        )}
      </List>
    </Container>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

// GameLayout LeftPanel 패널 너비와 동기화:
//   Desktop  (>1024px landscape) : LeftPanel = 210px  →  left: 224px (210 + 14)
//   L1024    (≤1024px landscape) : LeftPanel = 172px  →  left: 186px (172 + 14)
//   L768     (≤768px  landscape) : LeftPanel = 128px  →  left: 142px (128 + 14)
//   phoneSm  (landscape h≤520px) : LeftPanel = 128px  →  left: 136px (축소 패딩)

const Container = styled.div`
  position: fixed;
  left: 224px;
  top: 10px;
  width: 240px;
  max-height: 45vh;
  overflow-y: auto;
  background: linear-gradient(145deg, rgba(26, 31, 46, 0.98), rgba(15, 20, 25, 0.98));
  border: 3px solid rgba(155, 89, 182, 0.5);
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.5);
  backdrop-filter: blur(10px);
  z-index: 2999;
  animation: fadeIn 0.2s ease-out;

  /* 태블릿 가로 (≤1024px landscape) — LeftPanel = 172px */
  ${lMedia.tablet} {
    left: 186px;
    width: 220px;
    padding: 12px;
    border-radius: 14px;
    border-width: 2px;
  }

  /* 폰 가로 (≤768px landscape) — LeftPanel = 128px */
  ${lMedia.phone} {
    left: 142px;
    width: calc(100vw - 146px);
    max-width: 190px;
    max-height: 42vh;
    padding: 10px;
    border-radius: 12px;
    border-width: 2px;
  }

  /* 소형 폰 가로 (landscape + max-height ≤520px) — LeftPanel = 128px */
  ${lMedia.phoneSm} {
    left: 136px;
    top: 4px;
    width: calc(100vw - 140px);
    max-width: 180px;
    max-height: 40vh;
    padding: 8px;
    border-radius: 10px;
    border-width: 2px;
  }
`;

const Title = styled.h4`
  font-size: 16px;
  font-weight: bold;
  color: #9b59b6;
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(155, 89, 182, 0.3);

  ${lMedia.tablet} { font-size: 14px; margin-bottom: 9px; padding-bottom: 6px; }
  ${lMedia.phone}  { font-size: 13px; margin-bottom: 7px; padding-bottom: 5px; }
  ${lMedia.phoneSm}{ font-size: 12px; margin-bottom: 6px; padding-bottom: 4px; }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  ${lMedia.phone}  { gap: 6px; }
  ${lMedia.phoneSm}{ gap: 5px; }
`;

const PokemonItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.2);
  padding: 4px 8px;
  border-radius: 6px;

  ${lMedia.phone}  { padding: 3px 6px; gap: 6px; }
  ${lMedia.phoneSm}{ padding: 3px 5px; gap: 5px; }
`;

const Sprite = styled.img`
  width: 40px;
  height: 40px;
  image-rendering: pixelated;
  flex-shrink: 0;

  ${lMedia.tablet} { width: 34px; height: 34px; }
  ${lMedia.phone}  { width: 30px; height: 30px; }
  ${lMedia.phoneSm}{ width: 26px; height: 26px; }
`;

const Name = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #e8edf3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${lMedia.tablet} { font-size: 12px; }
  ${lMedia.phone}  { font-size: 11px; }
  ${lMedia.phoneSm}{ font-size: 10px; }
`;

const Empty = styled.p`
  font-size: 13px;
  color: #a8b8c8;
  text-align: center;
  padding: 10px 0;

  ${lMedia.phone}  { font-size: 11px; padding: 6px 0; }
  ${lMedia.phoneSm}{ font-size: 10px; padding: 4px 0; }
`;