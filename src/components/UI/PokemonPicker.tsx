import React, { useState, useEffect } from 'react';
import { pokeAPI } from '../../api/pokeapi';
import { useGameStore } from '../../store/gameStore';
import { GameMove, MoveEffect, Gender } from '../../types/game';
import { Rarity, RARITY_COLORS } from '../../data/evolution';
import { mapAbilityToGameEffect } from '../../utils/abilities';

const REROLL_COST = 20;

interface PokemonChoice {
  data: any;
  cost: number;
  rarity: Rarity;
  gender: Gender;
}

// 성별 결정 함수
const determineGender = (pokemonId: number): Gender => {
  const genderlessIds = [
    132, 137, 233, 474, 81, 82, 100, 101, 120, 121, 
    201, 292, 337, 338, 343, 344, 374, 375, 376, 
    436, 437, 462, 474, 486, 487, 488, 489, 490,
    599, 600, 601, 615, 622, 623, 638, 639, 640,
    649, 703, 716, 717, 718, 720, 721, 772, 773,
    774, 781, 789, 790, 791, 792, 793, 794, 795,
    796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806
  ];
  
  if (genderlessIds.includes(pokemonId)) {
    return 'genderless';
  }
  
  return Math.random() < 0.5 ? 'male' : 'female';
};

// 성별 아이콘
const getGenderIcon = (gender: Gender) => {
  if (gender === 'male') return '♂';
  if (gender === 'female') return '♀';
  return '⚪';
};

// 성별 색상
const getGenderColor = (gender: Gender) => {
  if (gender === 'male') return '#4A90E2';
  if (gender === 'female') return '#E91E63';
  return '#999';
};

export const PokemonPicker: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [choices, setChoices] = useState<PokemonChoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const setPokemonToPlace = useGameStore(state => state.setPokemonToPlace);
  const { spendMoney } = useGameStore(state => ({
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
      
      // 실제 기술 효과 분석
      const effectText = usableMove.effectEntries?.[0]?.toLowerCase() || '';
      
      if (effectText.includes('burn')) {
        effect.statusInflict = 'burn';
        effect.statusChance = usableMove.effectChance || 10;
      } else if (effectText.includes('paralyze') || effectText.includes('paralysis')) {
        effect.statusInflict = 'paralysis';
        effect.statusChance = usableMove.effectChance || 10;
      } else if (effectText.includes('poison')) {
        effect.statusInflict = 'poison';
        effect.statusChance = usableMove.effectChance || 10;
      } else if (effectText.includes('freeze') || effectText.includes('frozen')) {
        effect.statusInflict = 'freeze';
        effect.statusChance = usableMove.effectChance || 10;
      } else if (effectText.includes('sleep')) {
        effect.statusInflict = 'sleep';
        effect.statusChance = usableMove.effectChance || 10;
      }
      
      if (effectText) {
        effect.additionalEffects = effectText;
      }

      // 광역 기술 판단 - target 기반
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
      
      // 특성 추가 - 랜덤 특성 사용
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
      alert("기술을 불러오는 데 실패했습니다.");
    }

    setIsLoading(false);
    onClose();
  };
  
  const handleReroll = () => {
    if (!spendMoney(REROLL_COST)) {
      alert(`돈이 부족합니다! (리롤: ${REROLL_COST}원)`);
      return;
    }
    loadChoices();
  };
  
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>{isLoading ? '⏳ 기술 정보 로딩 중...' : '🎲 포켓몬 선택'}</h2>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        <p style={s.subtitle}>3마리 중 1마리를 선택하세요.</p>

        <div style={s.cardGrid}>
          {choices.map((choice, i) => {
            const p = choice.data;
            const statTotal = p.stats.hp + p.stats.attack + p.stats.defense + 
                             p.stats.specialAttack + p.stats.specialDefense + p.stats.speed;
            
            const rarityBadge = (
              <span style={{
                ...s.rarityBadge,
                background: RARITY_COLORS[choice.rarity],
              }}>
                {choice.rarity}
              </span>
            );
            
            return (
              <div
                key={i}
                style={s.card}
                onClick={() => handleSelect(choice)}
              >
                <img src={p.sprite} alt={p.name} style={s.sprite} />
                <div style={s.info}>
                  <div style={s.nameRow}>
                    <h3 style={s.name}>{p.name}</h3>
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: getGenderColor(choice.gender),
                    }}>
                      {getGenderIcon(choice.gender)}
                    </span>
                  </div>
                  <div style={s.types}>
                    {p.types.map((type: string) => (
                      <span key={type} style={s.type}>{type}</span>
                    ))}
                    {rarityBadge}
                  </div>
                  <div style={s.stats}>
                    <div>HP: {p.stats.hp}</div>
                    <div>공격: {p.stats.attack}</div>
                    <div>방어: {p.stats.defense}</div>
                    <div>특공: {p.stats.specialAttack}</div>
                    <div>특방: {p.stats.specialDefense}</div>
                    <div>스핏: {p.stats.speed}</div>
                    <div style={{ fontWeight: 'bold', color: '#FFD700' }}>총합: {statTotal}</div>
                  </div>
                  <div style={s.cost}>💰 {choice.cost}원</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={s.actions}>
          <button style={s.rerollBtn} onClick={handleReroll} disabled={isLoading}>
            🔄 리롤 (20원)
          </button>
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  overlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: 'radial-gradient(circle at center, rgba(0,0,0,0.85), rgba(0,0,0,0.95))', 
    backdropFilter: 'blur(8px)',
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 999,
  },
  modal: { 
    background: 'linear-gradient(145deg, #2a2d3a, #1f2029)', 
    borderRadius: '20px', 
    padding: '30px', 
    maxWidth: '800px', 
    width: '95%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '15px',
  },
  title: { 
    fontSize: '28px', 
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  closeBtn: { 
    fontSize: '24px', 
    background: 'none', 
    border: 'none', 
    color: '#fff', 
    cursor: 'pointer',
    padding: '5px 10px',
    borderRadius: '5px',
    transition: 'background 0.2s',
  },
  subtitle: {
    fontSize: '16px',
    color: '#aaa',
    marginBottom: '20px',
    textAlign: 'center',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '15px',
    padding: '15px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid transparent',
  },
  sprite: {
    width: '120px',
    height: '120px',
    margin: '0 auto',
    display: 'block',
    imageRendering: 'pixelated',
  },
  info: {
    marginTop: '10px',
  },
  nameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  name: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
  },
  rarityBadge: {
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '3px 8px',
    borderRadius: '8px',
    color: '#fff',
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
  },
  types: {
    display: 'flex',
    gap: '5px',
    justifyContent: 'center',
    marginBottom: '10px',
    flexWrap: 'wrap',
  },
  type: {
    fontSize: '12px',
    padding: '4px 8px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    textTransform: 'uppercase',
  },
  stats: {
    fontSize: '13px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '5px',
    marginBottom: '10px',
  },
  cost: {
    fontSize: '18px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFD700',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
  },
  rerollBtn: {
    padding: '12px 30px',
    fontSize: '16px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};
