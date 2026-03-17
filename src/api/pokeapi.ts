// src/api/pokeapi.ts
import axios from 'axios';
import { EVOLUTION_CHAINS, getFinalEvolutionId, calculateRarity, RARITY_WEIGHTS, Rarity } from '../data/evolution';
import { GameMove, MoveEffect } from '../types/game';

const API_BASE = 'https://pokeapi.co/api/v2';

// ─── 로컬스토리지 캐시 키 ─────────────────────────────────────────
const LS_STAT_CACHE_KEY = 'pokeapi_stat_cache_v2';
const LS_WEIGHTED_LIST_KEY = 'pokeapi_weighted_list_v2';

const getCurrentLanguage = (): 'ko' | 'en' => {
  const lang = localStorage.getItem('language');
  return lang === 'en' ? 'en' : 'ko';
};

export interface PokemonAbilityData {
  name: string;
  displayName: string;
  description: string;
}

export interface PokemonData {
  id: number;
  name: string;
  displayName: string;
  types: string[];
  stats: { hp: number; attack: number; defense: number; specialAttack: number; specialDefense: number; speed: number };
  sprite: string;
  moves: string[];
  abilities: PokemonAbilityData[];
}

// 웨이브 스폰 전용 경량 캐시 (스탯만 저장, 빠른 조회용)
export interface StatOnlyData {
  id: number;
  statTotal: number;
  types: string[];
}

export interface MoveData {
  name: string;
  displayName: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  damageClass: 'physical' | 'special' | 'status';
  effectChance: number | null;
  target: string;
  effectEntries: string[];
}

const EVOLVED_POKEMON_IDS = new Set(EVOLUTION_CHAINS.map(e => e.to));

// 병렬 요청 최대 동시 수 (PokeAPI rate limit 방지)
const MAX_CONCURRENT = 20;

async function runWithConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const current = idx++;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

class PokeAPIService {
  private pokemonCache = new Map<number, PokemonData>();
  private statCache = new Map<number, StatOnlyData>();   // 경량 스탯 전용 캐시
  private moveCache = new Map<string, MoveData>();
  private rarityCache = new Map<number, Rarity>();
  private weightedPokemonList: Array<{ id: number; weight: number }> = [];
  private preloadPromise: Promise<void> | null = null;

  constructor() {
    // 앱 시작 시 로컬스토리지에서 스탯 캐시 복원 (가장 빠른 경로)
    this.restoreFromLocalStorage();
  }

  // ─── 로컬스토리지 캐시 복원 / 저장 ────────────────────────────────
  private restoreFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(LS_STAT_CACHE_KEY);
      if (raw) {
        const data: StatOnlyData[] = JSON.parse(raw);
        data.forEach(d => this.statCache.set(d.id, d));
        console.log(`[PokeAPI] 로컬캐시 복원: ${this.statCache.size}마리`);
      }

      const weightedRaw = localStorage.getItem(LS_WEIGHTED_LIST_KEY);
      if (weightedRaw) {
        this.weightedPokemonList = JSON.parse(weightedRaw);
        console.log(`[PokeAPI] 가중치 리스트 복원: ${this.weightedPokemonList.length}개`);
      }
    } catch {
      // 파싱 실패 시 무시하고 새로 로드
      localStorage.removeItem(LS_STAT_CACHE_KEY);
      localStorage.removeItem(LS_WEIGHTED_LIST_KEY);
    }
  }

  private saveStatCacheToLocalStorage(): void {
    try {
      const data = Array.from(this.statCache.values());
      localStorage.setItem(LS_STAT_CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(LS_WEIGHTED_LIST_KEY, JSON.stringify(this.weightedPokemonList));
    } catch (e) {
      console.warn('[PokeAPI] 로컬스토리지 저장 실패 (용량 초과 가능성)', e);
    }
  }

  // ─── 경량 스탯 전용 조회 (웨이브 스폰용) ──────────────────────────
  // 전체 PokemonData가 아닌 stat만 필요한 경우 API 호출 1회로 처리
  private async getStatOnly(id: number): Promise<StatOnlyData> {
    if (this.statCache.has(id)) return this.statCache.get(id)!;

    const res = await axios.get(`${API_BASE}/pokemon/${id}`);
    const d = res.data;
    const statTotal =
      (d.stats[0]?.base_stat ?? 0) +
      (d.stats[1]?.base_stat ?? 0) +
      (d.stats[2]?.base_stat ?? 0) +
      (d.stats[3]?.base_stat ?? 0) +
      (d.stats[4]?.base_stat ?? 0) +
      (d.stats[5]?.base_stat ?? 0);

    const entry: StatOnlyData = {
      id,
      statTotal,
      types: d.types.map((t: any) => t.type.name),
    };
    this.statCache.set(id, entry);
    return entry;
  }

  // ─── 전체 포켓몬 데이터 조회 (게임 배치용) ───────────────────────
  async getPokemon(id: number): Promise<PokemonData> {
    if (this.pokemonCache.has(id)) return this.pokemonCache.get(id)!;

    const lang = getCurrentLanguage();

    const res = await axios.get(`${API_BASE}/pokemon/${id}`);
    const d = res.data;

    const [speciesRes, ...abilityResponses] = await Promise.all([
      axios.get(d.species.url),
      ...d.abilities.map((a: any) =>
        axios.get(a.ability.url).catch(() => null)
      ),
    ]);

    const s = speciesRes.data;
    const nameEntry =
      s.names.find((n: any) => n.language.name === lang) ||
      s.names.find((n: any) => n.language.name === 'en');
    const displayName = nameEntry ? nameEntry.name : d.name;

    const abilities: PokemonAbilityData[] = abilityResponses
      .filter(Boolean)
      .map((abilityRes: any) => {
        const info = abilityRes.data;
        const nameE =
          info.names.find((n: any) => n.language.name === lang) ||
          info.names.find((n: any) => n.language.name === 'en');
        const descE =
          info.effect_entries.find((e: any) => e.language.name === lang) ||
          info.effect_entries.find((e: any) => e.language.name === 'en');
        return {
          name: info.name,
          displayName: nameE ? nameE.name : info.name,
          description: descE?.short_effect || descE?.effect || 'No description',
        };
      });

    // 스탯 캐시도 동시에 채움
    const statTotal =
      d.stats[0].base_stat + d.stats[1].base_stat + d.stats[2].base_stat +
      d.stats[3].base_stat + d.stats[4].base_stat + d.stats[5].base_stat;
    if (!this.statCache.has(id)) {
      this.statCache.set(id, {
        id,
        statTotal,
        types: d.types.map((t: any) => t.type.name),
      });
    }

    const pokemon: PokemonData = {
      id: d.id,
      name: d.name,
      displayName,
      types: d.types.map((t: any) => t.type.name),
      stats: {
        hp: d.stats[0].base_stat,
        attack: d.stats[1].base_stat,
        defense: d.stats[2].base_stat,
        specialAttack: d.stats[3].base_stat,
        specialDefense: d.stats[4].base_stat,
        speed: d.stats[5].base_stat,
      },
      sprite:
        d.sprites.front_default ||
        d.sprites.other?.['official-artwork']?.front_default ||
        '',
      moves: d.moves.map((m: any) => m.move.name).slice(0, 20),
      abilities,
    };

    this.pokemonCache.set(id, pokemon);
    return pokemon;
  }

  async getMove(name: string): Promise<MoveData> {
    if (this.moveCache.has(name)) return this.moveCache.get(name)!;

    const lang = getCurrentLanguage();
    const res = await axios.get(`${API_BASE}/move/${name}`);
    const d = res.data;

    const nameEntry =
      d.names.find((n: any) => n.language.name === lang) ||
      d.names.find((n: any) => n.language.name === 'en');
    const displayName = nameEntry ? nameEntry.name : d.name;

    const effectEntry =
      d.effect_entries.find((e: any) => e.language.name === lang) ||
      d.effect_entries.find((e: any) => e.language.name === 'en');
    const effectEntries = [
      effectEntry?.short_effect || effectEntry?.effect || 'No description',
    ];

    const move: MoveData = {
      name: d.name,
      displayName,
      type: d.type.name,
      power: d.power,
      accuracy: d.accuracy,
      damageClass: d.damage_class.name,
      effectChance: d.effect_chance,
      target: d.target.name,
      effectEntries,
    };
    this.moveCache.set(name, move);
    return move;
  }

  async getRarity(basePokemonId: number): Promise<Rarity> {
    if (this.rarityCache.has(basePokemonId))
      return this.rarityCache.get(basePokemonId)!;

    try {
      const finalEvolutionId = getFinalEvolutionId(basePokemonId);
      // 경량 스탯으로 레어도 계산 (PokemonData 전체 불필요)
      const stat = await this.getStatOnly(finalEvolutionId);
      const rarity = calculateRarity(stat.statTotal);
      this.rarityCache.set(basePokemonId, rarity);
      return rarity;
    } catch {
      return 'Bronze';
    }
  }

  /**
   * 프리로딩 개선:
   * 1. 로컬스토리지 캐시가 있으면 API 호출 없이 즉시 완료 (< 100ms)
   * 2. 없으면 경량 스탯만 가져옴 (API 호출 1개/포켓몬, 동시 20개 제한)
   * 3. 완료 후 로컬스토리지에 저장 (다음 실행부터 즉시 완료)
   */
  async preloadRarities(
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    // 이미 로딩 중이면 같은 Promise 반환 (중복 호출 방지)
    if (this.preloadPromise) return this.preloadPromise;

    this.preloadPromise = this._doPreload(onProgress);
    return this.preloadPromise;
  }

  private async _doPreload(
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    const MAX_ID = 1025;

    // 로컬 캐시가 충분하면 즉시 완료
    if (
      this.weightedPokemonList.length > 0 &&
      this.statCache.size >= MAX_ID * 0.95 // 95% 이상 캐시됨
    ) {
      console.log('[PokeAPI] 로컬캐시 사용 - 프리로드 즉시 완료');
      return;
    }

    console.log('[PokeAPI] 포켓몬 스탯 프리로딩 시작 (경량 모드)...');
    const allIds = Array.from({ length: MAX_ID }, (_, i) => i + 1);
    const total = allIds.length;
    let loaded = 0;

    const tasks = allIds.map(id => async () => {
      try {
        await this.getStatOnly(id);
      } catch {
        // 실패 무시
      }
      loaded++;
      onProgress?.(loaded, total);
    });

    await runWithConcurrencyLimit(tasks, MAX_CONCURRENT);

    // 가중치 리스트 재계산
    const tempWeightedList: Array<{ id: number; weight: number }> = [];
    for (const [id, stat] of this.statCache) {
      if (!EVOLVED_POKEMON_IDS.has(id)) {
        const rarity = calculateRarity(stat.statTotal);
        this.rarityCache.set(id, rarity);
        tempWeightedList.push({ id, weight: RARITY_WEIGHTS[rarity] });
      }
    }
    this.weightedPokemonList = tempWeightedList;

    // 로컬스토리지에 저장 (다음 실행 시 즉시 복원)
    this.saveStatCacheToLocalStorage();

    console.log(
      `[PokeAPI] 프리로딩 완료: ${this.statCache.size}마리 캐시, ${this.weightedPokemonList.length}개 가중치 리스트`
    );
  }

  async getRandomPokemonIdWithRarity(): Promise<number> {
    if (this.weightedPokemonList.length === 0) {
      await this.preloadRarities();
    }

    const totalWeight = this.weightedPokemonList.reduce(
      (sum, p) => sum + p.weight,
      0
    );
    let random = Math.random() * totalWeight;
    for (const pokemon of this.weightedPokemonList) {
      random -= pokemon.weight;
      if (random <= 0) return pokemon.id;
    }
    return this.weightedPokemonList[0]?.id || 1;
  }

  getRandomPokemonId(maxGen: number = 9): number {
    const max =
      maxGen === 1 ? 151 :
      maxGen === 2 ? 251 :
      maxGen === 3 ? 386 :
      maxGen === 4 ? 493 :
      maxGen === 5 ? 649 :
      maxGen === 6 ? 721 :
      maxGen === 7 ? 809 :
      maxGen === 8 ? 905 : 1025;

    let randomId = 0;
    do {
      randomId = Math.floor(Math.random() * max) + 1;
    } while (EVOLVED_POKEMON_IDS.has(randomId));
    return randomId;
  }

  /**
   * WaveSystem 전용: 경량 스탯 캐시로 포켓몬 ID 선택 (API 추가 호출 없음)
   */
  getEnemyPokemonIdByStatRange(minStat: number, maxStat: number): number {
    const suitable: number[] = [];
    for (const [id, stat] of this.statCache) {
      if (stat.statTotal >= minStat && stat.statTotal <= maxStat) {
        suitable.push(id);
      }
    }
    if (suitable.length > 0) {
      return suitable[Math.floor(Math.random() * suitable.length)];
    }
    return Math.floor(Math.random() * 1025) + 1;
  }

  async getLearnableMoves(pokemonId: number, level: number): Promise<GameMove[]> {
    try {
      // 캐시에 이미 있으면 재사용
      const cached = this.pokemonCache.get(pokemonId);
      let moveNames: string[];

      if (cached) {
        // 레벨업 기술은 캐시 없이 API 필요 (레벨 정보 포함)
        const res = await axios.get(`${API_BASE}/pokemon/${pokemonId}`);
        const d = res.data;
        moveNames = d.moves
          .filter((m: any) =>
            m.version_group_details.some(
              (vg: any) =>
                vg.move_learn_method.name === 'level-up' &&
                vg.level_learned_at === level
            )
          )
          .map((m: any) => m.move.name)
          .slice(0, 5);
      } else {
        const res = await axios.get(`${API_BASE}/pokemon/${pokemonId}`);
        const d = res.data;
        moveNames = d.moves
          .filter((m: any) =>
            m.version_group_details.some(
              (vg: any) =>
                vg.move_learn_method.name === 'level-up' &&
                vg.level_learned_at === level
            )
          )
          .map((m: any) => m.move.name)
          .slice(0, 5);
      }

      if (moveNames.length === 0) return [];

      const moves: MoveData[] = await Promise.all(
        moveNames.map((name: string) => this.getMove(name))
      );

      return moves
        .filter(m => m.damageClass !== 'status')
        .map(m => {
          const effect: MoveEffect = { type: 'damage' };
          const effectText = m.effectEntries[0]?.toLowerCase() || '';

          if (
            effectText.includes('drain') ||
            effectText.includes('recover') ||
            effectText.includes('restore')
          ) {
            effect.drainPercent = effectText.includes('75%') ? 0.75 : 0.5;
          }
          if (effectText.includes('burn')) {
            effect.statusInflict = 'burn';
            effect.statusChance = m.effectChance;
          } else if (
            effectText.includes('paralyze') ||
            effectText.includes('paralysis')
          ) {
            effect.statusInflict = 'paralysis';
            effect.statusChance = m.effectChance;
          } else if (effectText.includes('poison')) {
            effect.statusInflict = 'poison';
            effect.statusChance = m.effectChance;
          } else if (
            effectText.includes('freeze') ||
            effectText.includes('frozen')
          ) {
            effect.statusInflict = 'freeze';
            effect.statusChance = m.effectChance;
          } else if (effectText.includes('sleep')) {
            effect.statusInflict = 'sleep';
            effect.statusChance = m.effectChance;
          } else if (effectText.includes('confus')) {
            effect.statusInflict = 'confusion';
            effect.statusChance = m.effectChance;
          }

          if (effectText) effect.additionalEffects = effectText;

          const isAOE = [
            'all-opponents',
            'all-other-pokemon',
            'all-pokemon',
            'user-and-allies',
          ].includes(m.target);

          return {
            name: m.name,
            displayName: m.displayName,
            type: m.type,
            power: m.power || 40,
            accuracy: m.accuracy || 100,
            damageClass: m.damageClass,
            effect,
            cooldown: 2.0,
            currentCooldown: 0,
            isAOE,
            aoeRadius: isAOE ? 100 : undefined,
            manualCast: false,
          };
        });
    } catch (e) {
      console.error('Failed to fetch learnable moves:', e);
      return [];
    }
  }
}

export const pokeAPI = new PokeAPIService();