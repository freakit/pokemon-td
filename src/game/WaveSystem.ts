// src/game/WaveSystem.ts

import { useGameStore } from '../store/gameStore';
import { Enemy, Difficulty } from '../types/game';
import { getMapById } from '../data/maps';
import { pokeAPI } from '../api/pokeapi';

const DIFFICULTY_MULTIPLIERS: Record<Difficulty, { hp: number; attack: number; reward: number }> = {
  easy: { hp: 0.7, attack: 0.7, reward: 0.8 },
  normal: { hp: 1.0, attack: 1.0, reward: 1.0 },
  hard: { hp: 1.5, attack: 1.3, reward: 1.5 },
  expert: { hp: 2.0, attack: 1.7, reward: 2.0 },
};

export class WaveSystem {
  private static instance: WaveSystem;
  private enemyCounter = 0;
  
  static getInstance() {
    if (!WaveSystem.instance) {
      WaveSystem.instance = new WaveSystem();
    }
    return WaveSystem.instance;
  }
  
  startWave(wave: number) {
    const { currentMap, difficulty } = useGameStore.getState();
    const map = getMapById(currentMap);
    if (!map) return;
    
    const count = this.getEnemyCount(wave);
    const mult = DIFFICULTY_MULTIPLIERS[difficulty];
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.spawnEnemy(wave, map.path, false, mult);
      }, i * 800);
    }
    
    if (wave % 5 === 0) {
      setTimeout(() => {
        this.spawnBoss(wave, map.path, mult);
      }, count * 800 + 2000);
    }
  }
  
  private getEnemyCount(wave: number) {
    return Math.floor(5 + wave * 1.5);
  }
  
  private async spawnEnemy(wave: number, path: any[], isBoss: boolean, mult: any) {
    try {
      // Wave에 따라 더 강한 포켓몬 등장 (종족값이 높은 포켓몬)
      const pokemonId = this.getEnemyPokemonId(wave);
      const pokemonData = await pokeAPI.getPokemon(pokemonId);
      
      const { addEnemy } = useGameStore.getState();
      
      // 기하급수적 난이도 증가 (exponential scaling)
      const waveMultiplier = Math.pow(1.1, wave - 1); // 1.1^(wave-1)
      
      const baseHp = (pokemonData.stats.hp * waveMultiplier) * mult.hp;
      const baseAttack = (pokemonData.stats.attack * waveMultiplier) * mult.attack;
      const baseDefense = (pokemonData.stats.defense * waveMultiplier) * mult.attack;
      const baseSpecialAttack = (pokemonData.stats.specialAttack * waveMultiplier) * mult.attack;
      const baseSpecialDefense = (pokemonData.stats.specialDefense * waveMultiplier) * mult.attack;
      
      const enemy: Enemy = {
        id: `enemy-${this.enemyCounter++}`,
        name: pokemonData.name,
        pokemonId: pokemonData.id,
        hp: isBoss ? baseHp * 3 : baseHp,
        maxHp: isBoss ? baseHp * 3 : baseHp,
        baseAttack: isBoss ? baseAttack * 2 : baseAttack,
        attack: isBoss ? baseAttack * 2 : baseAttack,
        defense: baseDefense,
        specialAttack: isBoss ? baseSpecialAttack * 2 : baseSpecialAttack,
        specialDefense: baseSpecialDefense,
        speed: pokemonData.stats.speed,
        position: { ...path[0] },
        path: [...path],
        pathIndex: 0,
        isNamed: isBoss,
        isBoss,
        reward: 10, // 고정 보상 10원
        moveSpeed: 60,
        types: pokemonData.types,
        sprite: pokemonData.sprite,
        range: 80,
        attackCooldown: 0,
      };
      
      addEnemy(enemy);
    } catch (e) {
      console.error('Failed to spawn enemy pokemon:', e);
      // 실패 시 기본 적 생성
      this.spawnFallbackEnemy(wave, path, isBoss, mult);
    }
  }
  
  // Wave에 따라 적절한 포켓몬 ID 선택 (종족값 고려)
  private getEnemyPokemonId(wave: number): number {
    // Wave 1-10: Bronze/Silver 등급 (종족값 낮음)
    // Wave 11-20: Silver/Gold 등급
    // Wave 21-30: Gold/Diamond 등급
    // Wave 31-40: Diamond/Master 등급
    // Wave 41+: Master/Legend 등급 (종족값 높음)
    
    let minStatTotal = 1;
    let maxStatTotal = 350;
    
    if (wave <= 10) {
      minStatTotal = 1;
      maxStatTotal = 350;
    } else if (wave <= 20) {
      minStatTotal = 250;
      maxStatTotal = 400;
    } else if (wave <= 30) {
      minStatTotal = 300;
      maxStatTotal = 450;
    } else if (wave <= 40) {
      minStatTotal = 350;
      maxStatTotal = 500; 
    } else if (wave <= 50) {
      minStatTotal = 400;
      maxStatTotal = 550; 
    } else if (wave <= 60) {
      minStatTotal = 450;
      maxStatTotal = 600;
    } else if (wave <= 70) {
      minStatTotal = 500;
      maxStatTotal = 650;
    } else if (wave <= 80) {
      minStatTotal = 550;
      maxStatTotal = 700;
    }
    else {
      minStatTotal = 600;
      maxStatTotal = 800;
    }
    
    // 캐시된 포켓몬 중에서 종족값이 적절한 것을 찾기
    const cache = (pokeAPI as any).pokemonCache as Map<number, any>;
    const suitablePokemon: number[] = [];
    
    for (let i = 1; i <= 151; i++) {
      if (cache.has(i)) {
        const poke = cache.get(i)!;
        const statTotal = poke.stats.hp + poke.stats.attack + poke.stats.defense +
                         poke.stats.specialAttack + poke.stats.specialDefense + poke.stats.speed;
        
        if (statTotal >= minStatTotal && statTotal <= maxStatTotal) {
          suitablePokemon.push(i);
        }
      }
    }
    
    // 적절한 포켓몬이 있으면 그 중 랜덤 선택, 없으면 전체 범위에서 랜덤
    if (suitablePokemon.length > 0) {
      return suitablePokemon[Math.floor(Math.random() * suitablePokemon.length)];
    } else {
      return Math.floor(Math.random() * 151) + 1;
    }
  }
  
  private spawnFallbackEnemy(wave: number, path: any[], isBoss: boolean, mult: any) {
    const { addEnemy } = useGameStore.getState();
    const baseHp = (50 + wave * 12) * mult.hp;
    const baseAttack = (10 + wave * 2) * mult.attack;
    const baseDefense = 5 + wave;
    
    const enemy: Enemy = {
      id: `enemy-${this.enemyCounter++}`,
      name: isBoss ? `Boss ${wave}` : `Enemy ${wave}`,
      pokemonId: 0,
      hp: baseHp,
      maxHp: baseHp,
      baseAttack: baseAttack,
      attack: baseAttack,
      defense: baseDefense,
      specialAttack: baseAttack,
      specialDefense: baseDefense,
      speed: 50 + wave,
      position: { ...path[0] },
      path: [...path],
      pathIndex: 0,
      isNamed: isBoss,
      isBoss,
      reward: 10, // 고정 보상 10원
      moveSpeed: 60,
      types: ['normal'],
      sprite: '',
      range: 80,
      attackCooldown: 0,
    };
    
    addEnemy(enemy);
  }
  
  private spawnBoss(wave: number, path: any[], mult: any) {
    this.spawnEnemy(wave, path, true, mult);
  }
}