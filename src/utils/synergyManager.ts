// src/utils/synergyManager.ts
import { GamePokemon, Synergy } from '../types/game';

// ─── 특수폼 세대 매핑 ────────────────────────────────────────────────────────

const GEN_1_SPECIAL_FORMS = new Set([
  10033, 10034, 10035, 10036, 10090, 10073, 10037, 10071, 10038,
  10039, 10040, 10041, 10042, 10043, 10044, 10195, 10196, 10197,
  10198, 10199, 10200, 10201, 10202, 10203, 10204, 10205, 10206,
]);
const GEN_2_SPECIAL_FORMS = new Set([
  10045, 10072, 10046, 10047, 10048, 10049,
]);
const GEN_3_SPECIAL_FORMS = new Set([
  10065, 10050, 10064, 10051, 10066, 10052, 10053, 10054, 10055,
  10070, 10087, 10067, 10056, 10057, 10074, 10089, 10076, 10062,
  10063, 10079,
]);
const GEN_4_SPECIAL_FORMS = new Set([
  10088, 10058, 10059, 10060, 10068,
]);
const GEN_5_SPECIAL_FORMS = new Set([
  10069, 10207, 10022, 10023,
]);
const GEN_6_SPECIAL_FORMS = new Set([
  10075,
]);
const GEN_7_SPECIAL_FORMS = new Set([
  10208, 10155, 10156,
]);
const GEN_8_SPECIAL_FORMS = new Set([
  10209, 10210, 10211, 10212, 10213, 10214, 10215, 10216, 10217,
  10218, 10219, 10220, 10221, 10222, 10223, 10224, 10225,
  10193, 10194,
]);

// ─── 특수 시너지 정의 ────────────────────────────────────────────────────────

export interface SpecialSynergyDef {
  id: string;          // 고유 ID (예: 'special:baby')
  name: string;        // 한국어 시너지명
  icon: string;        // 이모지 아이콘
  pokemonIds: number[]; // 해당 포켓몬 ID 목록
}

export const SPECIAL_SYNERGY_DEFS: SpecialSynergyDef[] = [
  {
    id: 'special:baby',
    name: '베이비 포켓몬',
    icon: '🍼',
    pokemonIds: [172, 173, 174, 175, 236, 238, 239, 240, 298, 360, 406, 433, 439, 440, 446, 447, 458],
    // Pichu, Cleffa, Igglybuff, Togepi, Tyrogue, Smoochum, Elekid, Magby,
    // Azurill, Wynaut, Budew, Chingling, Mime Jr., Happiny, Munchlax, Riolu, Mantyke
  },
  {
    id: 'special:yoonga',
    name: '윤가놈 파티',
    icon: '🎵',
    pokemonIds: [402, 225, 127, 214, 96, 254],
    // Kricketune, Delibird, Pinsir, Heracross, Drowzee, Sceptile
  },
  {
    id: 'special:nunparty',
    name: '눈파티 파티',
    icon: '❄️',
    pokemonIds: [678, 195, 980, 487, 473, 471],
    // Meowstic, Quagsire, Clodsire(토오), Giratina, Mamoswine, Glaceon
  },
  {
    id: 'special:sejun',
    name: '박세준 파티',
    icon: '⚡',
    pokemonIds: [417, 576, 130, 445, 282, 663],
    // Pachirisu, Gothitelle, Gyarados, Garchomp, Gardevoir, Talonflame
  },
  {
    id: 'special:etusha',
    name: '에투샤 파티',
    icon: '🎲',
    pokemonIds: [81, 276, 132, 224, 287, 446],
    // Magnemite, Taillow, Ditto, Octillery, Slakoth, Munchlax
  },
  {
    id: 'special:legendary_birds',
    name: '전설의 새',
    icon: '🦅',
    pokemonIds: [144, 145, 146],
    // Articuno, Zapdos, Moltres
  },
  {
    id: 'special:legendary_dogs',
    name: '전설의 개',
    icon: '🐕',
    pokemonIds: [243, 244, 245],
    // Raikou, Entei, Suicune
  },
  {
    id: 'special:baruki',
    name: '배루키 진화형',
    icon: '🪨',
    pokemonIds: [438, 185, 106, 237],
    // Bonsly, Sudowoodo, Hitmonlee, Hitmontop
  },
  {
    id: 'special:fossil',
    name: '화석',
    icon: '🦴',
    pokemonIds: [140, 138, 347, 345, 408, 410, 564, 566, 698, 696],
    // Kabuto, Omanyte, Anorith, Lileep, Cranidos, Shieldon,
    // Tirtouga, Archen, Amaura, Tyrunt
  },
  {
    id: 'special:legendary_jellyfish',
    name: '전설의 해파리',
    icon: '✨',
    pokemonIds: [480, 481, 482],
    // Uxie, Mesprit, Azelf
  },
  {
    id: 'special:three_monkeys',
    name: '3숭이',
    icon: '🐒',
    pokemonIds: [511, 513, 515],
    // Pansage, Pansear, Panpour
  },
  {
    id: 'special:lati',
    name: '라티아스, 라티오스',
    icon: '💙',
    pokemonIds: [380, 381],
    // Latias, Latios
  },
  {
    id: 'special:swords_of_justice',
    name: '성검사 4마리',
    icon: '⚔️',
    pokemonIds: [638, 639, 640, 647],
    // Cobalion, Terrakion, Virizion, Keldeo
  },
  {
    id: 'special:forces_of_nature',
    name: '로스 4형제',
    icon: '🌪️',
    pokemonIds: [641, 642, 645, 905],
    // Tornadus, Thundurus, Landorus, Enamorus
  },
  {
    id: 'special:ash_no_crown',
    name: '지우 무관 팀',  // Kalos League 준우승 (Lumiose Conference, 2위)
    icon: '🧢',
    pokemonIds: [25, 658, 663, 701, 706, 715],
    // Pikachu (25), Greninja (658), Talonflame (663), Hawlucha (701), Goodra (706), Noivern (715)
  },
  {
    id: 'special:ash_alola_champion',
    name: '지우 리그 우승 팀',  // Alola League 우승 (Manalo Conference, 첫 지역 챔피언)
    icon: '🏆',
    pokemonIds: [25, 722, 745, 727, 804, 809],
    // Pikachu (25), Rowlet (722), Lycanroc (Dusk Form, 745), Incineroar (727), Naganadel (804), Melmetal (809)
  },
  {
    id: 'special:ash_world_champion',
    name: '지우 월챔 우승 팀',  // World Coronation Series Masters Eight 우승 (세계 챔피언/Monarch)
    icon: '🌍🏆',
    pokemonIds: [25, 149, 94, 448, 865, 882],
    // Pikachu (25), Dragonite (149), Gengar (94), Lucario (448), Sirfetch'd (865), Dracovish (882)
  },
  {
    id: 'special:volcanion_magearna',
    name: '볼케니온, 마기아나',
    icon: '⚙️',
    pokemonIds: [721, 801],
    // Volcanion, Magearna
  },
  {
    id: 'special:tapu',
    name: '카푸 4형제',
    icon: '🌺',
    pokemonIds: [785, 786, 787, 788],
    // Tapu Koko, Tapu Lele, Tapu Bulu, Tapu Fini
  },
  {
    id: 'special:ultra_beast',
    name: '울트라비스트',
    icon: '🌀',
    pokemonIds: [793, 794, 795, 796, 797, 798, 799],
    // Nihilego, Buzzwole, Pheromosa, Xurkitree, Celesteela, Kartana, Guzzlord
  },
  {
    id: 'special:regi',
    name: '레지 시리즈',
    icon: '🗿',
    pokemonIds: [377, 378, 379, 486, 895, 894],
    // Regirock, Regice, Registeel, Regigigas, Regidrago, Regieleki
  },
  {
    id: 'special:accelgor_escavalier',
    name: '어써러셔 & 싸리용',
    icon: '🔄',
    pokemonIds: [617, 589],
    // Accelgor, Escavalier
  },
  {
    id: 'special:four_treasures',
    name: '사흉수',
    icon: '🌑',
    pokemonIds: [1001, 1002, 1003, 1004],
    // Wo-Chien(총지엔), Chien-Pao(파오젠), Ting-Lu(딩루), Chi-Yu(위유이)
  },
  {
    id: 'special:loyal_three',
    name: '개추 4형제',
    icon: '🍑',
    pokemonIds: [1014, 1015, 1016, 1025],
    // Okidogi, Munkidori, Fezandipiti, Pecharunt
  },
];

// 빠른 조회를 위한 포켓몬ID → 시너지 목록 역방향 맵
const POKEMON_TO_SPECIAL_SYNERGIES = new Map<number, string[]>();
for (const def of SPECIAL_SYNERGY_DEFS) {
  for (const id of def.pokemonIds) {
    if (!POKEMON_TO_SPECIAL_SYNERGIES.has(id)) {
      POKEMON_TO_SPECIAL_SYNERGIES.set(id, []);
    }
    POKEMON_TO_SPECIAL_SYNERGIES.get(id)!.push(def.id);
  }
}

// ─── 특수 시너지 레벨 계산 ───────────────────────────────────────────────────

/**
 * 보유 수에 따른 특수 시너지 배율
 * 2마리: 1.1배 / 3마리: 1.2배 / 4마리: 1.3배 / 5마리: 1.4배 / 6마리+: 1.5배
 */
export const getSpecialSynergyMultiplier = (count: number): number => {
  if (count < 2) return 1.0;
  if (count === 2) return 1.1;
  if (count === 3) return 1.2;
  if (count === 4) return 1.3;
  if (count === 5) return 1.4;
  return 1.5; // 6마리 이상
};

/**
 * 특수 시너지의 레벨 (UI 표시용, 1~5)
 */
const getSpecialSynergyLevel = (count: number): number => {
  if (count >= 6) return 5;
  if (count >= 5) return 4;
  if (count >= 4) return 3;
  if (count >= 3) return 2;
  if (count >= 2) return 1;
  return 0;
};

/**
 * 특수 시너지 설명 텍스트 생성
 */
const getSpecialSynergyDescription = (count: number, maxCount: number): string => {
  const mult = getSpecialSynergyMultiplier(count);
  const nextThreshold = [2, 3, 4, 5, 6].find(t => t > count);
  const nextMult = nextThreshold ? getSpecialSynergyMultiplier(nextThreshold) : null;
  const base = `(${count}) 스탯 ${mult.toFixed(1)}배`;
  if (nextThreshold && nextMult && count < maxCount) {
    return `${base} → ${nextThreshold}마리: ${nextMult.toFixed(1)}배`;
  }
  return base;
};

// ─── 세대 유틸 ───────────────────────────────────────────────────────────────

export const getGenerationById = (id: number): number => {
  if (id >= 1 && id <= 151) return 1;
  if (id >= 152 && id <= 251) return 2;
  if (id >= 252 && id <= 386) return 3;
  if (id >= 387 && id <= 493) return 4;
  if (id >= 494 && id <= 649) return 5;
  if (id >= 650 && id <= 721) return 6;
  if (id >= 722 && id <= 809) return 7;
  if (id >= 810 && id <= 905) return 8;
  if (id >= 906 && id <= 1025) return 9;
  if (id > 10000) {
    if (GEN_1_SPECIAL_FORMS.has(id)) return 1;
    if (GEN_2_SPECIAL_FORMS.has(id)) return 2;
    if (GEN_3_SPECIAL_FORMS.has(id)) return 3;
    if (GEN_4_SPECIAL_FORMS.has(id)) return 4;
    if (GEN_5_SPECIAL_FORMS.has(id)) return 5;
    if (GEN_6_SPECIAL_FORMS.has(id)) return 6;
    if (GEN_7_SPECIAL_FORMS.has(id)) return 7;
    if (GEN_8_SPECIAL_FORMS.has(id)) return 8;
  }
  return 0;
};

// ─── 타입/세대 시너지 계산 ───────────────────────────────────────────────────

const getTypeSynergy = (type: string, count: number): Synergy | null => {
  const name = type;
  if (count >= 6) {
    return { id: `type:${type}`, name, count, level: 3, description: `(6) 스탯 1.3배, 해당 타입 약점 데미지 0.5배` };
  }
  if (count >= 4) {
    return { id: `type:${type}`, name, count, level: 2, description: `(4) 스탯 1.3배` };
  }
  if (count >= 2) {
    return { id: `type:${type}`, name, count, level: 1, description: `(2) 스탯 1.1배` };
  }
  return null;
};

const getGenSynergy = (gen: number, count: number): Synergy | null => {
  if (gen === 0) return null;
  const name = gen.toString();
  if (count >= 6) {
    return { id: `gen:${gen}`, name, count, level: 3, description: `(6) 스탯 1.3배` };
  }
  if (count >= 4) {
    return { id: `gen:${gen}`, name, count, level: 2, description: `(4) 스탯 1.2배` };
  }
  if (count >= 2) {
    return { id: `gen:${gen}`, name, count, level: 1, description: `(2) 스탯 1.1배` };
  }
  return null;
};

// ─── 전체 시너지 계산 ────────────────────────────────────────────────────────

export const calculateActiveSynergies = (towers: GamePokemon[]): Synergy[] => {
  const typeCounts = new Map<string, number>();
  const genCounts = new Map<number, number>();
  const specialCounts = new Map<string, number>();

  const activePokemon = towers.filter(t => !t.isFainted);

  for (const tower of activePokemon) {
    // 세대 카운트
    const gen = getGenerationById(tower.pokemonId);
    genCounts.set(gen, (genCounts.get(gen) || 0) + 1);

    // 타입 카운트
    for (const type of tower.types) {
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }

    // 특수 시너지 카운트
    const synergyIds = POKEMON_TO_SPECIAL_SYNERGIES.get(tower.pokemonId);
    if (synergyIds) {
      for (const sid of synergyIds) {
        specialCounts.set(sid, (specialCounts.get(sid) || 0) + 1);
      }
    }
  }

  const synergies: Synergy[] = [];

  typeCounts.forEach((count, type) => {
    const synergy = getTypeSynergy(type, count);
    if (synergy) synergies.push(synergy);
  });

  genCounts.forEach((count, gen) => {
    const synergy = getGenSynergy(gen, count);
    if (synergy) synergies.push(synergy);
  });

  // 특수 시너지: 2마리 이상일 때만 활성화
  specialCounts.forEach((count, synergyId) => {
    if (count < 2) return;
    const def = SPECIAL_SYNERGY_DEFS.find(d => d.id === synergyId);
    if (!def) return;
    const level = getSpecialSynergyLevel(count);
    synergies.push({
      id: synergyId,
      name: def.name,
      count,
      level,
      description: getSpecialSynergyDescription(count, def.pokemonIds.length),
    });
  });

  return synergies;
};

// ─── 스탯 버프 계산 ──────────────────────────────────────────────────────────

export const getBuffedStats = (pokemon: GamePokemon, activeSynergies: Synergy[]) => {
  let stats = {
    attack: pokemon.attack,
    defense: pokemon.defense,
    specialAttack: pokemon.specialAttack,
    specialDefense: pokemon.specialDefense,
  };

  if (pokemon.isFainted) return stats;

  let typeBuff = 1.0;
  let genBuff = 1.0;
  let specialBuff = 1.0;

  // 1. 타입 시너지
  for (const type of pokemon.types) {
    const matchingSynergies = activeSynergies
      .filter(s => s.id === `type:${type}`)
      .map(s => s.level);
    if (matchingSynergies.length > 0) {
      const bestLevel = Math.max(...matchingSynergies);
      let buff = 1.0;
      if (bestLevel === 1) buff = 1.1;
      if (bestLevel === 2) buff = 1.3;
      if (bestLevel === 3) buff = 1.3;
      if (buff > typeBuff) typeBuff = buff;
    }
  }

  // 2. 세대 시너지
  const gen = getGenerationById(pokemon.pokemonId);
  const matchingGenSynergies = activeSynergies
    .filter(s => s.id === `gen:${gen}`)
    .map(s => s.level);
  if (matchingGenSynergies.length > 0) {
    const bestLevel = Math.max(...matchingGenSynergies);
    if (bestLevel === 1) genBuff = 1.1;
    if (bestLevel === 2) genBuff = 1.2;
    if (bestLevel === 3) genBuff = 1.3;
  }

  // 3. 특수 시너지 (해당 포켓몬이 속한 특수 시너지 중 가장 높은 배율 적용)
  const synergyIds = POKEMON_TO_SPECIAL_SYNERGIES.get(pokemon.pokemonId);
  if (synergyIds) {
    for (const sid of synergyIds) {
      const activeSynergy = activeSynergies.find(s => s.id === sid);
      if (!activeSynergy) continue;
      const def = SPECIAL_SYNERGY_DEFS.find(d => d.id === sid);
      if (!def) continue;
      const mult = getSpecialSynergyMultiplier(activeSynergy.count);
      if (mult > specialBuff) specialBuff = mult;
    }
  }

  // 4. 타입 × 세대 × 특수 시너지 곱연산 중첩
  const finalMultiplier = typeBuff * genBuff * specialBuff;

  stats.attack = Math.floor(stats.attack * finalMultiplier);
  stats.defense = Math.floor(stats.defense * finalMultiplier);
  stats.specialAttack = Math.floor(stats.specialAttack * finalMultiplier);
  stats.specialDefense = Math.floor(stats.specialDefense * finalMultiplier);

  return stats;
};