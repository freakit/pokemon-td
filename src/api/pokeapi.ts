// src/api/pokeapi.ts

import axios from 'axios';
import { EVOLUTION_CHAINS, getFinalEvolutionId, calculateRarity, RARITY_WEIGHTS, Rarity } from '../data/evolution';
import { GameMove, MoveEffect } from '../types/game';

const API_BASE = 'https://pokeapi.co/api/v2';

export interface PokemonAbilityData {
  name: string;
  description: string;
}

export interface PokemonData {
  id: number;
  name: string;
  types: string[];
  stats: { hp: number; attack: number; defense: number; specialAttack: number; specialDefense: number; speed: number };
  sprite: string;
  moves: string[];
  abilities: PokemonAbilityData[];
}

export interface MoveData {
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  damageClass: 'physical' | 'special' | 'status';
  effectChance: number | null;
  target: string; // 'all-opponents', 'all-other-pokemon' 등
  effectEntries: string[]; // 기술 효과 설명
}

// 진화형 포켓몬 ID 목록 (기본형만 뽑기 위함)
const EVOLVED_POKEMON_IDS = new Set(EVOLUTION_CHAINS.map(e => e.to));

class PokeAPIService {
  private pokemonCache = new Map<number, PokemonData>();
  private moveCache = new Map<string, MoveData>();
  private rarityCache = new Map<number, Rarity>(); // 기본형 포켓몬의 레어도 캐시

  async getPokemon(id: number): Promise<PokemonData> {
    if (this.pokemonCache.has(id)) return this.pokemonCache.get(id)!;
    try {
      const res = await axios.get(`${API_BASE}/pokemon/${id}`);
      const d = res.data;
      
      // 특성 가져오기
      const abilities: PokemonAbilityData[] = [];
      for (const abilityData of d.abilities) {
        try {
          const abilityRes = await axios.get(abilityData.ability.url);
          const abilityInfo = abilityRes.data;
          const descEntry = abilityInfo.effect_entries.find((e: any) => e.language.name === 'en');
          abilities.push({
            name: abilityInfo.name,
            description: descEntry?.short_effect || descEntry?.effect || 'No description',
          });
        } catch {
          // 특성 가져오기 실패 시 계속 진행
        }
      }
      
      const pokemon: PokemonData = {
        id: d.id,
        name: d.name,
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
      const res = await axios.get(`${API_BASE}/move/${name}`);
      const d = res.data;
      
      // 기술 효과 설명 가져오기
      const effectEntries = d.effect_entries
        .filter((e: any) => e.language.name === 'en')
        .map((e: any) => e.short_effect || e.effect);
      
      const move: MoveData = {
        name: d.name,
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

  // 특정 포켓몬의 레어도 계산 (기본형만)
  async getRarity(basePokemonId: number): Promise<Rarity> {
    if (this.rarityCache.has(basePokemonId)) {
      return this.rarityCache.get(basePokemonId)!;
    }
    
    try {
      // 최종 진화체 ID 가져오기
      const finalEvolutionId = getFinalEvolutionId(basePokemonId);
      
      // 최종 진화체 데이터 가져오기
      const finalPokemon = await this.getPokemon(finalEvolutionId);
      const statTotal = finalPokemon.stats.hp + finalPokemon.stats.attack + 
                       finalPokemon.stats.defense + finalPokemon.stats.specialAttack +
                       finalPokemon.stats.specialDefense + finalPokemon.stats.speed;
      
      const rarity = calculateRarity(statTotal);
      this.rarityCache.set(basePokemonId, rarity);
      return rarity;
    } catch {
      return 'Bronze'; // 오류 시 기본값
    }
  }

  // 레어도 기반 가중치 랜덤 선택
  async getRandomPokemonIdWithRarity(maxGen: number = 9): Promise<number> {
    const max = maxGen === 1 ? 151 : 
                maxGen === 2 ? 251 : 
                maxGen === 3 ? 386 : 
                maxGen === 4 ? 493 :
                maxGen === 5 ? 649 :
                maxGen === 6 ? 721 :
                maxGen === 7 ? 809 :
                maxGen === 8 ? 905 :
                1025; // 9세대
    
    // 기본형 포켓몬 목록 생성
    const basePokemonIds: number[] = [];
    for (let i = 1; i <= max; i++) {
      if (!EVOLVED_POKEMON_IDS.has(i)) {
        basePokemonIds.push(i);
      }
    }
    
    // 각 포켓몬의 레어도와 가중치 계산
    const pokemonWithWeights: Array<{ id: number; weight: number }> = [];
    
    for (const id of basePokemonIds) {
      const rarity = await this.getRarity(id);
      const weight = RARITY_WEIGHTS[rarity];
      pokemonWithWeights.push({ id, weight });
    }
    
    // 가중치 기반 랜덤 선택
    const totalWeight = pokemonWithWeights.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const pokemon of pokemonWithWeights) {
      random -= pokemon.weight;
      if (random <= 0) {
        return pokemon.id;
      }
    }
    
    // 폴백: 첫 번째 포켓몬
    return basePokemonIds[0];
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
                1025; // 9세대
    let randomId = 0;
    
    // 기본형(진화형이 아닌) 포켓몬이 나올 때까지 반복
    do {
      randomId = Math.floor(Math.random() * max) + 1;
    } while (EVOLVED_POKEMON_IDS.has(randomId));
    
    return randomId;
  }

  // 레벨업 시 배울 수 있는 기술 가져오기
  async getLearnableMoves(pokemonId: number, level: number): Promise<GameMove[]> {
    try {
      const res = await axios.get(`${API_BASE}/pokemon/${pokemonId}`);
      const d = res.data;
      
      // 레벨업으로 배우는 기술만 필터링
      const levelMoves = d.moves
        .filter((m: any) => 
          m.version_group_details.some((vg: any) => 
            vg.move_learn_method.name === 'level-up' && vg.level_learned_at === level
          )
        )
        .map((m: any) => m.move.name)
        .slice(0, 5); // 최대 5개
      
      if (levelMoves.length === 0) return [];
      
      // 기술 데이터 가져오기
      const moves = await Promise.all(levelMoves.map((name: string) => this.getMove(name)));
      
      // status 기술 제외하고 GameMove로 변환
      return moves
        .filter(m => m.damageClass !== 'status')
        .map(m => {
          const effect: MoveEffect = { type: 'damage' };
          
          // 실제 기술 효과 분석하여 상태이상 부여
          const effectText = m.effectEntries[0]?.toLowerCase() || '';
          
          // 상태이상 효과 감지
          if (effectText.includes('burn') || effectText.includes('burn')) {
            effect.statusInflict = 'burn';
            effect.statusChance = m.effectChance || 10;
          } else if (effectText.includes('paralyze') || effectText.includes('paralysis')) {
            effect.statusInflict = 'paralysis';
            effect.statusChance = m.effectChance || 10;
          } else if (effectText.includes('poison')) {
            effect.statusInflict = 'poison';
            effect.statusChance = m.effectChance || 10;
          } else if (effectText.includes('freeze') || effectText.includes('frozen')) {
            effect.statusInflict = 'freeze';
            effect.statusChance = m.effectChance || 10;
          } else if (effectText.includes('sleep')) {
            effect.statusInflict = 'sleep';
            effect.statusChance = m.effectChance || 10;
          } else if (effectText.includes('confus')) {
            effect.statusInflict = 'confusion';
            effect.statusChance = m.effectChance || 10;
          }
          
          // 추가 효과 정보 저장
          if (effectText) {
            effect.additionalEffects = effectText;
          }
          
          // 광역 기술 판단 - target이 여러 적을 공격하는 경우
          const isAOE = [
            'all-opponents',
            'all-other-pokemon',
            'all-pokemon',
            'user-and-allies'
          ].includes(m.target);
          
          return {
            name: m.name,
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