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
      const pokemonId = pokeAPI.getRandomPokemonId(1); // 1세대만
      const pokemonData = await pokeAPI.getPokemon(pokemonId);
      
      const { addEnemy } = useGameStore.getState();
      const baseHp = (pokemonData.stats.hp * (1 + wave * 0.3)) * mult.hp;
      const baseAttack = (pokemonData.stats.attack * (1 + wave * 0.15)) * mult.attack; // 0.2 → 0.15로 감소
      const baseDefense = pokemonData.stats.defense * (1 + wave * 0.1);
      const baseSpecialAttack = (pokemonData.stats.specialAttack * (1 + wave * 0.15)) * mult.attack; // 0.2 → 0.15로 감소
      const baseSpecialDefense = pokemonData.stats.specialDefense * (1 + wave * 0.1);
      
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
        reward: Math.floor((isBoss ? wave * 50 : wave * 5) * mult.reward),
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
      reward: Math.floor((isBoss ? wave * 50 : wave * 5) * mult.reward),
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