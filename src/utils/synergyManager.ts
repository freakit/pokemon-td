// src/utils/synergyManager.ts
import { GamePokemon, Synergy } from '../types/game';

// ─── 특수폼 세대 매핑 (Z-A 신규 메가 포함) ────────────────────────────────────────────────────────
const GEN_1_SPECIAL_FORMS = new Set([
  10033, 10034, 10035, 10036, 10090, 10073, 10037, 10071, 10038,
  10039, 10040, 10041, 10042, 10043, 10044, 10195, 10196, 10197,
  10198, 10199, 10200, 10201, 10202, 10203, 10204, 10205, 10206,
  10100, 10101, 10102, 10112, 10113, // Z-A Gen1 메가
]);

const GEN_2_SPECIAL_FORMS = new Set([
  10045, 10072, 10046, 10047, 10048, 10049,
  10103, 10104, // Z-A Gen2 메가
]);

const GEN_3_SPECIAL_FORMS = new Set([
  10065, 10050, 10064, 10051, 10066, 10052, 10053, 10054, 10055,
  10070, 10087, 10067, 10056, 10057, 10074, 10089, 10076, 10062,
  10063, 10079,
  10114, // Z-A Gen3 메가
]);

const GEN_4_SPECIAL_FORMS = new Set([
  10088, 10058, 10059, 10060, 10068,
  10105, 10115, 10116, // Z-A Gen4 메가
]);

const GEN_5_SPECIAL_FORMS = new Set([
  10069, 10207, 10022, 10023,
]);

const GEN_6_SPECIAL_FORMS = new Set([
  10075,
  10106, 10107, 10108, 10109, 10110, 10111, // Z-A Gen6 메가
]);

const GEN_7_SPECIAL_FORMS = new Set([
  10208, 10155, 10156,
  10117, 10118, 10119, // Z-A Gen7 메가
]);

const GEN_8_SPECIAL_FORMS = new Set([
  10209, 10210, 10211, 10212, 10213, 10214, 10215, 10216, 10217,
  10218, 10219, 10220, 10221, 10222, 10223, 10224, 10225,
  10193, 10194,
]);

const GEN_9_SPECIAL_FORMS = new Set([
  10120, 10121, 10122, // Z-A Gen9 메가
]);

// ─── 특수 시너지 정의 ────────────────────────────────────────────────────────
export interface SpecialSynergyDef {
  id: string;
  name: string;
  icon: string;
  pokemonIds: number[];
}

export const SPECIAL_SYNERGY_DEFS: SpecialSynergyDef[] = [
  {
    id: 'special:baby',
    name: '베이비 포켓몬',
    icon: '🍼',
    pokemonIds: [172, 173, 174, 175, 236, 238, 239, 240, 298, 360, 406, 433, 439, 440, 446, 447, 458],
  },
  {
    id: 'special:yoonga',
    name: '윤가놈 파티',
    icon: '🎵',
    pokemonIds: [
      96, 97,       // 슬리프 → 슬리퍼
      127,          // 쁘사이저
      214,          // 헤라크로스
      225,          // 딜리버드
      401, 402,     // 크리켓통 → 크리켓툰
      254,          // 나무킹
    ],
  },
  {
    id: 'special:nunparty',
    name: '눈파티 파티',
    icon: '❄️',
    pokemonIds: [
      195, 980,     // 누오 → 토오
      471,          // 글레이시아
      473,          // 맘모꾸리
      478, 10105,   // 눈여아 + Mega Froslass
      487,          // 기라티나
      678,          // 메오우스틱
    ],
  },
  {
    id: 'special:sejun',
    name: '박세준 파티',
    icon: '⚡',
    pokemonIds: [
      417,          // 파치리스
      130,          // 갸라도스
      282,          // 가디안
      445,          // 한카리아스
      575, 576,     // 고디탱 → 고디모아젤
      662, 663,     // 불화살빈 → 파이어로
    ],
  },
  {
    id: 'special:etusha',
    name: '에투샤 파티',
    icon: '🎲',
    pokemonIds: [
      81, 82, 462,  // 마그네미트 → 마그네톤 → 자포코일
      276, 277,     // 테일로 → 스왈로
      132,          // 메타몽
      224,          // 옥타리
      287, 289,     // 슬라크 → 슬라킹
      446, 143,     // 먹고자 → 잠만보
    ],
  },
  {
    id: 'special:legendary_birds',
    name: '전설의 새',
    icon: '🦅',
    pokemonIds: [144, 145, 146],
  },
  {
    id: 'special:legendary_dogs',
    name: '전설의 개',
    icon: '🐕',
    pokemonIds: [243, 244, 245],
  },
  {
    id: 'special:baruki',
    name: '배루키즈',
    icon: '🪨',
    pokemonIds: [438, 185, 106, 107, 237], // Bonsly, Sudowoodo, Hitmonlee, Hitmonchan, Hitmontop
  },
  {
    id: 'special:fossil',
    name: '화석',
    icon: '🦴',
    pokemonIds: [
      140, 141, 138, 139,     // Kabuto/Kabutops, Omanyte/Omastar
      347, 348, 345, 346,     // Anorith/Armaldo, Lileep/Cradily
      408, 409, 410, 411,     // Cranidos/Rampardos, Shieldon/Bastiodon
      564, 565, 566, 567,     // Tirtouga/Carracosta, Archen/Archeops
      698, 699, 696, 697,     // Amaura/Aurorus, Tyrunt/Tyrantrum
    ],
  },
  {
    id: 'special:legendary_jellyfish',
    name: '전설의 해파리',
    icon: '✨',
    pokemonIds: [480, 481, 482],
  },
  {
    id: 'special:three_monkeys',
    name: '3숭이',
    icon: '🐒',
    pokemonIds: [511, 512, 513, 514, 515, 516], // Pansage/Simisage, Pansear/Simisear, Panpour/Simipour
  },
  {
    id: 'special:lati',
    name: '라티아스, 라티오스',
    icon: '💙',
    pokemonIds: [380, 381],
  },
  {
    id: 'special:swords_of_justice',
    name: '성검사 4마리',
    icon: '⚔️',
    pokemonIds: [638, 639, 640, 647],
  },
  {
    id: 'special:forces_of_nature',
    name: '로스 4형제',
    icon: '🌪️',
    pokemonIds: [641, 642, 645, 905],
  },
  {
    id: 'special:ash_no_crown',
    name: '지우 무관 팀',
    icon: '🧢',
    pokemonIds: [
      25, 658, 663, 701, 706, 715,
      10199, 10108, 10111,
    ],
  },
  {
    id: 'special:ash_alola_champion',
    name: '지우 리그 우승 팀',
    icon: '🏆',
    pokemonIds: [
      25, 722, 745, 727, 804, 809,
      10199, 10208,
    ],
  },
  {
    id: 'special:ash_world_champion',
    name: '지우 월챔 우승 팀',
    icon: '🌍🏆',
    pokemonIds: [
      25, 149, 94, 448, 865, 882,
      10199, 10102, 10038, 10059,
    ],
  },
  {
    id: 'special:volcanion_magearna',
    name: '볼케니온, 마기아나',
    icon: '⚙️',
    pokemonIds: [721, 801],
  },
  {
    id: 'special:tapu',
    name: '카푸 4형제',
    icon: '🌺',
    pokemonIds: [785, 786, 787, 788],
  },
  {
    id: 'special:ultra_beast',
    name: '울트라비스트',
    icon: '🌀',
    pokemonIds: [793, 794, 795, 796, 797, 798, 799],
  },
  {
    id: 'special:regi',
    name: '레지 시리즈',
    icon: '🗿',
    pokemonIds: [377, 378, 379, 486, 895, 894],
  },
  {
    id: 'special:accelgor_escavalier',
    name: '어써러셔 & 싸리용',
    icon: '🔄',
    pokemonIds: [617, 589],
  },
  {
    id: 'special:four_treasures',
    name: '사흉수',
    icon: '🌑',
    pokemonIds: [1001, 1002, 1003, 1004],
  },
  {
    id: 'special:loyal_three',
    name: '개추 4형제',
    icon: '🍑',
    pokemonIds: [1014, 1015, 1016, 1025],
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
export const getSpecialSynergyMultiplier = (count: number): number => {
  if (count < 2) return 1.0;
  if (count === 2) return 1.1;
  if (count === 3) return 1.2;
  if (count === 4) return 1.3;
  if (count === 5) return 1.4;
  return 1.5;
};

const getSpecialSynergyLevel = (count: number): number => {
  if (count >= 6) return 5;
  if (count >= 5) return 4;
  if (count >= 4) return 3;
  if (count >= 3) return 2;
  if (count >= 2) return 1;
  return 0;
};

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
    if (GEN_9_SPECIAL_FORMS.has(id)) return 9;
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
    const gen = getGenerationById(tower.pokemonId);
    genCounts.set(gen, (genCounts.get(gen) || 0) + 1);

    for (const type of tower.types) {
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }

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

  const finalMultiplier = typeBuff * genBuff * specialBuff;

  stats.attack = Math.floor(stats.attack * finalMultiplier);
  stats.defense = Math.floor(stats.defense * finalMultiplier);
  stats.specialAttack = Math.floor(stats.specialAttack * finalMultiplier);
  stats.specialDefense = Math.floor(stats.specialDefense * finalMultiplier);

  return stats;
};