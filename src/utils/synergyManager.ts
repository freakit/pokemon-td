// src/utils/synergyManager.ts
import { GamePokemon, Synergy } from '../types/game';

// [신규] 1세대 포켓몬의 특수폼 (메가진화, 거다이맥스) ID 목록
const GEN_1_SPECIAL_FORMS = new Set([
  10033, 10034, 10035, 10036, 10090, 10073, 10037, 10071, 10038,
  10039, 10040, 10041, 10042, 10043, 10044, 10195, 10196, 10197,
  10198, 10199, 10200, 10201, 10202, 10203, 10204, 10205, 10206,
]);

// [신규] 2세대 포켓몬의 특수폼 (메가진화) ID 목록
const GEN_2_SPECIAL_FORMS = new Set([
  10045, 10072, 10046, 10047, 10048, 10049,
]);

// [신규] 3세대 포켓몬의 특수폼 (메가진화) ID 목록
const GEN_3_SPECIAL_FORMS = new Set([
  10065, 10050, 10064, 10051, 10066, 10052, 10053, 10054, 10055,
  10070, 10087, 10067, 10056, 10057, 10074, 10089, 10076, 10062,
  10063, 10079,
]);

// [신규] 4세대 포켓몬의 특수폼 (메가진화) ID 목록
const GEN_4_SPECIAL_FORMS = new Set([
  10088, 10058, 10059, 10060, 10068,
]);

// [신규] 5세대 포켓몬의 특수폼 (메가진화, 거다이맥스, 합체폼) ID 목록
const GEN_5_SPECIAL_FORMS = new Set([
  10069, // 메가다부니
  10207, // 거다이더스트나
  10022, // 블랙큐레무
  10023, // 화이트큐레무
]);

// [신규] 6세대 포켓몬의 특수폼 (메가진화) ID 목록
const GEN_6_SPECIAL_FORMS = new Set([
  10075, // 메가디안시
]);

// [신규] 7세대 포켓몬의 특수폼 (거다이맥스, 합체폼) ID 목록
const GEN_7_SPECIAL_FORMS = new Set([
  10208, // 거다이멜메탈
  10155, // 황혼네크로즈마
  10156, // 새벽네크로즈마
]);

// [신규] 8세대 포켓몬의 특수폼 (거다이맥스, 합체폼) ID 목록
const GEN_8_SPECIAL_FORMS = new Set([
  10209, 10210, 10211, 10212, 10213, 10214, 10215, 10216, 10217,
  10218, 10219, 10220, 10221, 10222, 10223, 10224, 10225, // 8세대 거다이맥스
  10193, // 아이스라이더
  10194, // 쉐도우라이더
]);

// (9세대는 현재 특수폼 없음)

/**
 * 포켓몬 ID를 기반으로 세대를 반환합니다.
 * (pokeapi.ts의 세대별 ID 범위를 기반으로 함)
 */
export const getGenerationById = (id: number): number => {
  // [수정] 1. 기본 ID 범위로 먼저 확인 (가장 빠른 경로)
  if (id >= 1 && id <= 151) return 1;
  if (id >= 152 && id <= 251) return 2;
  if (id >= 252 && id <= 386) return 3;
  if (id >= 387 && id <= 493) return 4;
  if (id >= 494 && id <= 649) return 5;
  if (id >= 650 && id <= 721) return 6;
  if (id >= 722 && id <= 809) return 7;
  if (id >= 810 && id <= 905) return 8;
  if (id >= 906 && id <= 1025) return 9;

  // [수정] 2. 10000번대 이상 특수폼인지 Set에서 확인
  if (id > 10000) {
    if (GEN_1_SPECIAL_FORMS.has(id)) return 1;
    if (GEN_2_SPECIAL_FORMS.has(id)) return 2;
    if (GEN_3_SPECIAL_FORMS.has(id)) return 3;
    if (GEN_4_SPECIAL_FORMS.has(id)) return 4;
    if (GEN_5_SPECIAL_FORMS.has(id)) return 5;
    if (GEN_6_SPECIAL_FORMS.has(id)) return 6;
    if (GEN_7_SPECIAL_FORMS.has(id)) return 7;
    if (GEN_8_SPECIAL_FORMS.has(id)) return 8;
    // (9세대는 현재 특수폼 없음)
  }

  return 0; // 알 수 없는 범위
};

/**
 * UI 표시용 타입 한글 이름
 */
export const TYPE_NAMES: Record<string, string> = {
  normal: '노말', fire: '불꽃', water: '물', electric: '전기', grass: '풀',
  ice: '얼음', fighting: '격투', poison: '독', ground: '땅', flying: '비행',
  psychic: '에스퍼', bug: '벌레', rock: '바위', ghost: '고스트', dragon: '드래곤',
  dark: '악', steel: '강철', fairy: '페어리',
};

/**
 * 타입 시너지 레벨을 반환합니다.
 */
const getTypeSynergy = (type: string, count: number): Synergy | null => {
  const name = TYPE_NAMES[type] || type;
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

/**
 * 세대 시너지 레벨을 반환합니다.
 */
const getGenSynergy = (gen: number, count: number): Synergy | null => {
  if (gen === 0) return null;
  const name = `${gen}세대`;
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

/**
 * 현재 활성화된 모든 시너지를 계산합니다.
 */
export const calculateActiveSynergies = (towers: GamePokemon[]): Synergy[] => {
  const typeCounts = new Map<string, number>();
  const genCounts = new Map<number, number>();
  
  // 기절하지 않은 포켓몬만 계산에 포함
  const activePokemon = towers.filter(t => !t.isFainted);

  for (const tower of activePokemon) {
    // 세대 카운트
    const gen = getGenerationById(tower.pokemonId);
    genCounts.set(gen, (genCounts.get(gen) || 0) + 1);
    
    // 타입 카운트
    for (const type of tower.types) {
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
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

  return synergies;
};

/**
 * 특정 포켓몬의 시너지 적용 후 최종 스탯을 반환합니다.
 */
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

  // 1. 가장 높은 타입 시너지 적용
  for (const type of pokemon.types) {
    const matchingSynergies = activeSynergies
      .filter(s => s.id === `type:${type}`)
      .map(s => s.level);
    
    if (matchingSynergies.length > 0) {
      const bestLevel = Math.max(...matchingSynergies);
      let buff = 1.0;
      if (bestLevel === 1) buff = 1.1; // 2마리
      if (bestLevel === 2) buff = 1.3; // 4마리
      if (bestLevel === 3) buff = 1.3; // 6마리
      if (buff > typeBuff) typeBuff = buff;
    }
  }

  // 2. 가장 높은 세대 시너지 적용
  const gen = getGenerationById(pokemon.pokemonId);
  const matchingGenSynergies = activeSynergies
    .filter(s => s.id === `gen:${gen}`)
    .map(s => s.level);

  if (matchingGenSynergies.length > 0) {
    const bestLevel = Math.max(...matchingGenSynergies);
    if (bestLevel === 1) genBuff = 1.1; // 2마리
    if (bestLevel === 2) genBuff = 1.2; // 4마리
    if (bestLevel === 3) genBuff = 1.3; // 6마리
  }

  // 3. 타입 버프와 세대 버프를 곱연산으로 중첩
  const finalMultiplier = typeBuff * genBuff;

  stats.attack = Math.floor(stats.attack * finalMultiplier);
  stats.defense = Math.floor(stats.defense * finalMultiplier);
  stats.specialAttack = Math.floor(stats.specialAttack * finalMultiplier);
  stats.specialDefense = Math.floor(stats.specialDefense * finalMultiplier);

  return stats;
};