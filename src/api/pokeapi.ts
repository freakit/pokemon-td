import axios from 'axios';
import { EVOLUTION_CHAINS, getFinalEvolutionId, calculateRarity, RARITY_WEIGHTS, Rarity } from '../data/evolution';
import { GameMove, MoveEffect } from '../types/game';

const API_BASE = 'https://pokeapi.co/api/v2';

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

class PokeAPIService {
  private pokemonCache = new Map<number, PokemonData>();
  private moveCache = new Map<string, MoveData>();
  private rarityCache = new Map<number, Rarity>();

  // ⭐️ [수정] 레어도 가중치 리스트를 캐시할 변수 추가
  private weightedPokemonList: Array<{ id: number; weight: number }> = [];

  async getPokemon(id: number): Promise<PokemonData> {
    if (this.pokemonCache.has(id)) return this.pokemonCache.get(id)!;
    
    try {
      const lang = getCurrentLanguage();
      
      // 1. 기본 포켓몬 데이터를 먼저 가져옵니다.
      const res = await axios.get(`${API_BASE}/pokemon/${id}`);
      const d = res.data;

      // 2. 응답에서 올바른 species URL을 가져와서 호출합니다.
      const speciesRes = await axios.get(d.species.url);
      const s = speciesRes.data;

      const nameEntry = s.names.find((n: any) => n.language.name === lang) ||
                        s.names.find((n: any) => n.language.name === 'en');
      const displayName = nameEntry ? nameEntry.name : d.name;

      const abilities: PokemonAbilityData[] = [];
      for (const abilityData of d.abilities) {
        try {
          const abilityRes = await axios.get(abilityData.ability.url);
          const abilityInfo = abilityRes.data;
          
          const abilityNameEntry = abilityInfo.names.find((n: any) => n.language.name === lang) ||
                                   abilityInfo.names.find((n: any) => n.language.name === 'en');
          const abilityDisplayName = abilityNameEntry ? abilityNameEntry.name : abilityInfo.name;

          const descEntry = abilityInfo.effect_entries.find((e: any) => e.language.name === lang) ||
                            abilityInfo.effect_entries.find((e: any) => e.language.name === 'en');
          
          abilities.push({
            name: abilityInfo.name,
            displayName: abilityDisplayName,
            description: descEntry?.short_effect || descEntry?.effect || 'No description',
          });
        } catch {
          // 특성 가져오기 실패 시 계속 진행
        }
      }
      
      const pokemon: PokemonData = {
        id: d.id,
        name: d.name,
        displayName: displayName,
        types: d.types.map((t: any) => t.type.name),
        stats: {
          hp: d.stats[0].base_stat,
          attack: d.stats[1].base_stat,
          defense: d.stats[2].base_stat,
          specialAttack: d.stats[3].base_stat,
          specialDefense: d.stats[4].base_stat,
          speed: d.stats[5].base_stat,
        },
        sprite: d.sprites.front_default || d.sprites.other['official-artwork'].front_default,
        moves: d.moves.map((m: any) => m.move.name).slice(0, 20),
        abilities,
      };
      
      this.pokemonCache.set(id, pokemon);
      return pokemon;
    } catch {
      throw new Error(`Failed to fetch pokemon ${id}`);
    }
  }

  async getMove(name: string): Promise<MoveData> {
    if (this.moveCache.has(name)) return this.moveCache.get(name)!;
    
    try {
      const lang = getCurrentLanguage();
      const res = await axios.get(`${API_BASE}/move/${name}`);
      const d = res.data;
      
      const nameEntry = d.names.find((n: any) => n.language.name === lang) ||
                        d.names.find((n: any) => n.language.name === 'en');
      const displayName = nameEntry ? nameEntry.name : d.name;

      const effectEntry = d.effect_entries.find((e: any) => e.language.name === lang) ||
                          d.effect_entries.find((e: any) => e.language.name === 'en');
      const effectEntries = [effectEntry?.short_effect || effectEntry?.effect || 'No description'];

      const move: MoveData = {
        name: d.name,
        displayName: displayName,
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
    } catch {
      throw new Error(`Failed to fetch move ${name}`);
    }
  }

  async getRarity(basePokemonId: number): Promise<Rarity> {
    if (this.rarityCache.has(basePokemonId)) {
      return this.rarityCache.get(basePokemonId)!;
    }
    
    try {
      const finalEvolutionId = getFinalEvolutionId(basePokemonId);
      const finalPokemon = await this.getPokemon(finalEvolutionId);
      const statTotal = finalPokemon.stats.hp + finalPokemon.stats.attack + 
                       finalPokemon.stats.defense + finalPokemon.stats.specialAttack +
                       finalPokemon.stats.specialDefense + finalPokemon.stats.speed;
      const rarity = calculateRarity(statTotal);
      this.rarityCache.set(basePokemonId, rarity);
      return rarity;
    } catch {
      return 'Bronze';
    }
  }

  // ⭐️ [추가] 게임 시작 시 호출할 사전 로딩 함수
  async preloadRarities(): Promise<void> {
    if (this.weightedPokemonList.length > 0) return; // 이미 로드됨

    console.log("Preloading Pokémon rarities... This may take a moment.");

    const max = 1025; // 9세대 기준
    const basePokemonIds: number[] = [];
    for (let i = 1; i <= max; i++) {
      if (!EVOLVED_POKEMON_IDS.has(i)) {
        basePokemonIds.push(i);
      }
    }
    
    const tempWeightedList: Array<{ id: number; weight: number }> = [];
    
    // 모든 기본 포켓몬의 레어도를 계산 (병렬 처리)
    await Promise.all(basePokemonIds.map(async (id) => {
      try {
        const rarity = await this.getRarity(id);
        const weight = RARITY_WEIGHTS[rarity];
        tempWeightedList.push({ id, weight });
      } catch (e) {
        // 일부 포켓몬 로드 실패 시 무시
      }
    }));

    this.weightedPokemonList = tempWeightedList;
    console.log(`Rarity preloading complete. ${this.weightedPokemonList.length} Pokémon weighted.`);
  }

  // ⭐️ [수정] 레어도 가중치 추첨 함수 (maxGen 파라미터 제거 및 캐시 사용)
  async getRandomPokemonIdWithRarity(): Promise<number> {
    
    // 1. 캐시된 리스트가 있는지 확인
    if (this.weightedPokemonList.length === 0) {
      console.warn("Rarities not preloaded. Loading on demand...");
      // 2. 캐시가 없다면(비정상) 지금이라도 로드 (느림)
      await this.preloadRarities();
    }

    // 3. 캐시된 리스트에서 가중치 추첨 (매우 빠름)
    const totalWeight = this.weightedPokemonList.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const pokemon of this.weightedPokemonList) {
      random -= pokemon.weight;
      if (random <= 0) {
        return pokemon.id;
      }
    }
    
    // (폴백) 오류 발생 시
    return this.weightedPokemonList[0]?.id || 1;
  }

  getRandomPokemonId(maxGen: number = 9): number {
    const max = maxGen === 1 ? 151 : 
                maxGen === 2 ? 251 : 
                maxGen === 3 ? 386 : 
                maxGen === 4 ? 493 :
                maxGen === 5 ? 649 :
                maxGen === 6 ? 721 :
                maxGen === 7 ? 809 :
                maxGen === 8 ? 905 :
                1025;
    let randomId = 0;
    
    do {
      randomId = Math.floor(Math.random() * max) + 1;
    } while (EVOLVED_POKEMON_IDS.has(randomId));
    
    return randomId;
  }

  async getLearnableMoves(pokemonId: number, level: number): Promise<GameMove[]> {
    try {
      const res = await axios.get(`${API_BASE}/pokemon/${pokemonId}`);
      const d = res.data;
      
      const levelMoves = d.moves
        .filter((m: any) => 
          m.version_group_details.some((vg: any) => 
            vg.move_learn_method.name === 'level-up' && vg.level_learned_at === level
          )
        )
        .map((m: any) => m.move.name)
        .slice(0, 5);
      
      if (levelMoves.length === 0) return [];

      const moves: MoveData[] = await Promise.all(levelMoves.map((name: string) => this.getMove(name)));

      return moves
        .filter(m => m.damageClass !== 'status')
        .map(m => {
          const effect: MoveEffect = { type: 'damage' };
          const effectText = m.effectEntries[0]?.toLowerCase() || '';
        
          if (effectText.includes('drain') || effectText.includes('recover') || effectText.includes('restore')) {
            if (effectText.includes('75%')) {
               effect.drainPercent = 0.75;
            } else {
               effect.drainPercent = 0.5;
            }
          }

          if (effectText.includes('burn')) {
            effect.statusInflict = 'burn';
            effect.statusChance = m.effectChance;
          } else if (effectText.includes('paralyze') || effectText.includes('paralysis')) {
            effect.statusInflict = 'paralysis';
            effect.statusChance = m.effectChance;
          } else if (effectText.includes('poison')) {
            effect.statusInflict = 'poison';
            effect.statusChance = m.effectChance;
          } else if (effectText.includes('freeze') || effectText.includes('frozen')) {
            effect.statusInflict = 'freeze';
            effect.statusChance = m.effectChance;
          } else if (effectText.includes('sleep')) {
            effect.statusInflict = 'sleep';
            effect.statusChance = m.effectChance;
          } else if (effectText.includes('confus')) {
            effect.statusInflict = 'confusion';
            effect.statusChance = m.effectChance;
          }
          
          if (effectText) {
            effect.additionalEffects = effectText;
          }
          
          const isAOE = [
            'all-opponents',
            'all-other-pokemon',
            'all-pokemon',
            'user-and-allies'
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