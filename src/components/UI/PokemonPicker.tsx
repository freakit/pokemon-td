import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { pokeAPI } from '../../api/pokeapi';
import { useGameStore } from '../../store/gameStore';
import { GameMove, MoveEffect, Gender } from '../../types/game';
import { Rarity, RARITY_COLORS } from '../../data/evolution';
import { mapAbilityToGameEffect } from '../../utils/abilities';

const REROLL_COST = 20;
const TYPE_ICON_API_BASE = 'https://www.serebii.net/pokedex-bw/type/';

interface PokemonChoice {
  data: any;
  cost: number;
  rarity: Rarity;
  gender: Gender;
}

const determineGender = (pokemonId: number): Gender => {
  const genderlessIds = [
    132, 137, 233, 474, 81, 82, 100, 101, 120, 121, 
    201, 292, 337, 338, 343, 344, 374, 375, 376, 
    436, 437, 462, 474, 486, 487, 488, 489, 490,
    599, 600, 601, 615, 622, 623, 638, 639, 640,
    649, 703, 716, 717, 718, 720, 721, 772, 773,
    774, 781, 789, 790, 791, 792, 793, 794, 795,
    796, 797, 798, 799, 
    800, 801, 
    802, 803, 804, 805, 806
  ];
  if (genderlessIds.includes(pokemonId)) {
    return 'genderless';
  }
  
  return Math.random() < 0.5 ? 'male' : 'female';
};

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

export const PokemonPicker: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const [choices, setChoices] = useState<PokemonChoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const setPokemonToPlace = useGameStore(state => state.setPokemonToPlace);
  const { money, spendMoney } = useGameStore(state => ({
    money: state.money,
    spendMoney: state.spendMoney,
  }));

  const loadChoices = async () => {
    setIsLoading(true);
    
    const id1 = await pokeAPI.getRandomPokemonIdWithRarity();
    const id2 = await pokeAPI.getRandomPokemonIdWithRarity();
    const id3 = await pokeAPI.getRandomPokemonIdWithRarity();

    const data = await Promise.all([
      pokeAPI.getPokemon(id1),
      pokeAPI.getPokemon(id2),
      pokeAPI.getPokemon(id3)
    ]);

    const withCostAndRarityAndGender = await Promise.all(data.map(async (p) => {
      const statTotal = p.stats.hp + p.stats.attack + p.stats.defense + 
                       p.stats.specialAttack + p.stats.specialDefense + p.stats.speed;
      const cost = Math.floor(25 + (statTotal / 600) * 200);
      const rarity = await pokeAPI.getRarity(p.id);
      const gender = determineGender(p.id);
      return { data: p, cost, rarity, gender };
    }));
    
    setChoices(withCostAndRarityAndGender);
    setIsLoading(false);
  };
  
  useEffect(() => {
    loadChoices();
  }, []);

  const handleSelect = async (choice: PokemonChoice) => {
    if (isLoading) return;
    
    setIsLoading(true);

    try {
      const poke = choice.data;
      const moveNames = poke.moves.slice(0, 10);
      let usableMove: any = null;
      
      for (const name of moveNames) {
        const move = await pokeAPI.getMove(name);
        if (move.damageClass !== 'status') {
          usableMove = move;
          break;
        }
      }
      
      if (!usableMove) {
        usableMove = {
          name: 'tackle',
          type: 'normal',
          power: 40,
          accuracy: 100,
          damageClass: 'physical',
          target: 'selected-pokemon',
          effectEntries: ['Inflicts regular damage with no additional effect.'],
          effectChance: null,
        };
      }
      
      const effect: MoveEffect = { type: 'damage' };
      const effectText = usableMove.effectEntries?.[0]?.toLowerCase() || '';

      if (effectText.includes('drain') || effectText.includes('recover') || effectText.includes('restore')) {
        if (effectText.includes('75%')) {
          effect.drainPercent = 0.75;
        } else {
          effect.drainPercent = 0.5;
        }
      }

      if (effectText.includes('burn')) {
        effect.statusInflict = 'burn';
        effect.statusChance = usableMove.effectChance;
      } else if (effectText.includes('paralyze') || effectText.includes('paralysis')) {
        effect.statusInflict = 'paralysis';
        effect.statusChance = usableMove.effectChance;
      } else if (effectText.includes('poison')) {
        effect.statusInflict = 'poison';
        effect.statusChance = usableMove.effectChance;
      } else if (effectText.includes('freeze') || effectText.includes('frozen')) {
        effect.statusInflict = 'freeze';
        effect.statusChance = usableMove.effectChance;
      } else if (effectText.includes('sleep')) {
        effect.statusInflict = 'sleep';
        effect.statusChance = usableMove.effectChance;
      } else if (effectText.includes('confus')) {
        effect.statusInflict = 'confusion';
        effect.statusChance = usableMove.effectChance;
      }
      
      if (effectText) {
        effect.additionalEffects = effectText;
      }

      const isAOE = [
        'all-opponents',
        'all-other-pokemon',
        'all-pokemon',
        'user-and-allies'
      ].includes(usableMove.target || '');

      const equippedMoves: GameMove[] = [{
        name: usableMove.name,
        type: usableMove.type,
        power: usableMove.power || 40,
        accuracy: usableMove.accuracy || 100,
        damageClass: usableMove.damageClass,
        effect: effect,
        cooldown: 2.0,
        currentCooldown: 0,
        isAOE: isAOE,
        aoeRadius: isAOE ? 100 : undefined,
        manualCast: false,
      }];

      let ability = undefined;
      if (poke.abilities && poke.abilities.length > 0) {
        const randomIndex = Math.floor(Math.random() * poke.abilities.length);
        const randomAbility = poke.abilities[randomIndex];
        ability = mapAbilityToGameEffect(randomAbility.name, randomAbility.description);
      }
      
      setPokemonToPlace({
        ...poke,
        equippedMoves: equippedMoves,
        ability: ability,
        cost: choice.cost,
        gender: choice.gender,
      });

    } catch (error) {
      console.error("Failed to fetch moves:", error);
      alert(t('alerts.skillLoadFailed'));
    }

    setIsLoading(false);
    onClose();
  };
  
  const handleReroll = () => {
    if (!spendMoney(REROLL_COST)) {
      alert(t('alerts.notEnoughMoneyWithCost', { cost: REROLL_COST }));
      return;
    }
    loadChoices();
  };
  
  return (
    <Overlay>
      <Modal>
        <Header>
          <div>
            <Title>{isLoading ? t('picker.loading') : t('picker.title')}</Title>
          </div>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </Header>

        <Subtitle>{t('picker.subtitle')}</Subtitle>

        <CardGrid>
          {choices.map((choice, i) => {
            const p = choice.data;
            const statTotal = p.stats.hp + p.stats.attack + p.stats.defense + 
                                p.stats.specialAttack + p.stats.specialDefense + p.stats.speed;
            
            return (
              <Card
                key={i}
                $rarityColor={RARITY_COLORS[choice.rarity] || '#888'}
                onClick={() => handleSelect(choice)}
              >
                <Sprite src={p.sprite} alt={p.name} />
                <Info>
                  <NameRow>
                    <Name>{p.name}</Name>
                    <GenderIcon $gender={choice.gender}>
                      {getGenderIcon(choice.gender)}
                    </GenderIcon>
                  </NameRow>
                  
                  <Types>
                     {p.types.map((type: string) => (
                      <TypeImage 
                        key={type} 
                        src={`${TYPE_ICON_API_BASE}${type}.gif`} 
                        alt={type} 
                      />
                    ))}
                  </Types>
                  
                  <Stats>
                    <div>{t('picker.hp')}: {p.stats.hp}</div>
                    <div>{t('picker.attack')}: {p.stats.attack}</div>
                    <div>{t('picker.defense')}: {p.stats.defense}</div>
                    <div>{t('picker.spAttack')}: {p.stats.specialAttack}</div>
                    <div>{t('picker.spDefense')}: {p.stats.specialDefense}</div>
                    <div>{t('picker.speed')}: {p.stats.speed}</div>
                     <TotalStats>{t('picker.total')}: {statTotal}</TotalStats>
                  </Stats>
                  <Cost>{t('picker.cost', { cost: choice.cost })}</Cost>
                </Info>
              </Card>
            );
          })}
        </CardGrid>

        <Actions>
          <MoneyDisplay>{t('picker.currentMoney', { money: money })}</MoneyDisplay>
          <RerollBtn onClick={handleReroll} disabled={isLoading}>
            🔄 {t('picker.reroll')}
          </RerollBtn>
        </Actions>
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
  max-width: 800px;
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
  margin-bottom: 15px;
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: bold;
  background: linear-gradient(135deg, #667eea, #764ba2);
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 5px;
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
  align-self: flex-start;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #aaa;
  margin-bottom: 20px;
  text-align: center;
`;

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const Card = styled.div<{ $rarityColor: string }>`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 4px solid ${props => props.$rarityColor};
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px ${props => props.$rarityColor}60;
  }
`;

const Sprite = styled.img`
  width: 120px;
  height: 120px;
  margin: 0 auto;
  display: block;
  image-rendering: pixelated;
`;

const Info = styled.div`
  margin-top: 10px;
`;

const NameRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`;

const Name = styled.h3`
  font-size: 20px;
  font-weight: bold;
  margin: 0;
  color: #fff;
`;

const GenderIcon = styled.span<{ $gender: Gender }>`
  font-size: 16px;
  font-weight: bold;
  color: ${props => getGenderColor(props.$gender)};
`;

const Types = styled.div`
  display: flex;
  gap: 5px;
  justify-content: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  height: 24px;
  align-items: center;
`;

const TypeImage = styled.img`
  height: 18px;
  object-fit: contain;
`;

const Stats = styled.div`
  font-size: 13px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 5px;
  margin-bottom: 10px;
  color: #ddd;
`;

const TotalStats = styled.div`
  font-weight: bold;
  color: #FFD700;
`;

const Cost = styled.div`
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  color: #FFD700;
`;

const Actions = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
`;

const MoneyDisplay = styled.div`
  font-size: 16px;
  color: #FFD700;
  font-weight: bold;
`;

const RerollBtn = styled.button`
  padding: 12px 30px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(135deg, #764ba2, #667eea);
  }
`;