// src/utils/typeEffectiveness.ts

// 최신 포켓몬 타입 상성표 (18개 타입 - 9세대 기준)
// 2배 효과: 2, 0.5배 효과: 0.5, 무효: 0
const TYPE_CHART: Record<string, Record<string, number>> = {
  normal: { 
    rock: 0.5, 
    ghost: 0,
    steel: 0.5
  },
  fire: { 
    fire: 0.5, 
    water: 0.5, 
    grass: 2, 
    ice: 2, 
    bug: 2, 
    rock: 0.5, 
    dragon: 0.5,
    steel: 2,
    fairy: 0.5
  },
  water: { 
    fire: 2, 
    water: 0.5, 
    grass: 0.5, 
    ground: 2, 
    rock: 2, 
    dragon: 0.5 
  },
  electric: { 
    water: 2, 
    electric: 0.5, 
    grass: 0.5, 
    ground: 0, 
    flying: 2, 
    dragon: 0.5 
  },
  grass: { 
    fire: 0.5, 
    water: 2, 
    grass: 0.5, 
    poison: 0.5, 
    ground: 2, 
    flying: 0.5, 
    bug: 0.5, 
    rock: 2, 
    dragon: 0.5,
    steel: 0.5
  },
  ice: { 
    fire: 0.5,
    water: 0.5, 
    grass: 2, 
    ice: 0.5, 
    ground: 2, 
    flying: 2, 
    dragon: 2,
    steel: 0.5
  },
  fighting: { 
    normal: 2, 
    ice: 2, 
    poison: 0.5, 
    flying: 0.5, 
    psychic: 0.5, 
    bug: 0.5, 
    rock: 2, 
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5
  },
  poison: { 
    grass: 2, 
    poison: 0.5, 
    ground: 0.5, 
    rock: 0.5, 
    ghost: 0.5,
    steel: 0,
    fairy: 2
  },
  ground: { 
    fire: 2, 
    electric: 2, 
    grass: 0.5, 
    poison: 2, 
    flying: 0, 
    bug: 0.5, 
    rock: 2,
    steel: 2
  },
  flying: { 
    electric: 0.5, 
    grass: 2, 
    fighting: 2, 
    bug: 2, 
    rock: 0.5,
    steel: 0.5
  },
  psychic: { 
    fighting: 2, 
    poison: 2, 
    psychic: 0.5,
    dark: 0,
    steel: 0.5
  },
  bug: { 
    fire: 0.5, 
    grass: 2, 
    fighting: 0.5, 
    poison: 0.5,
    flying: 0.5, 
    psychic: 2, 
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5
  },
  rock: { 
    fire: 2, 
    ice: 2, 
    fighting: 0.5, 
    ground: 0.5, 
    flying: 2, 
    bug: 2,
    steel: 0.5
  },
  ghost: { 
    normal: 0, 
    psychic: 2, 
    ghost: 2,
    dark: 0.5
  },
  dragon: { 
    dragon: 2,
    steel: 0.5,
    fairy: 0
  },
  dark: {
    fighting: 0.5,
    psychic: 2,
    ghost: 2,
    dark: 0.5,
    fairy: 0.5
  },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2,
    rock: 2,
    steel: 0.5,
    fairy: 2
  },
  fairy: {
    fire: 0.5,
    fighting: 2,
    poison: 0.5,
    dragon: 2,
    dark: 2,
    steel: 0.5
  }
};

export function getTypeEffectiveness(attackType: string, defenseTypes: string[]): number {
  let multiplier = 1;
  for (const defType of defenseTypes) {
    multiplier *= (TYPE_CHART[attackType]?.[defType] ?? 1);
  }
  return multiplier;
}

export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    normal: '#A8A878', 
    fire: '#F08030', 
    water: '#6890F0', 
    electric: '#F8D030',
    grass: '#78C850', 
    ice: '#98D8D8', 
    fighting: '#C03028', 
    poison: '#A040A0',
    ground: '#E0C068', 
    flying: '#A890F0', 
    psychic: '#F85888', 
    bug: '#A8B820',
    rock: '#B8A038', 
    ghost: '#705898', 
    dragon: '#7038F8',
    dark: '#705848',
    steel: '#B8B8D0',
    fairy: '#EE99AC',
  };
  return colors[type] || '#68A090';
}

export function calculateDamage(
  attackerAttack: number,
  defenderDefense: number,
  movePower: number,
  typeEffectiveness: number,
  isCrit: boolean = false
): number {
  const level = 50;
  const base = ((2 * level / 5 + 2) * movePower * attackerAttack / defenderDefense / 50 + 2);
  let damage = base * typeEffectiveness;
  if (isCrit) damage *= 1.5;
  return Math.max(1, Math.floor(damage));
}
