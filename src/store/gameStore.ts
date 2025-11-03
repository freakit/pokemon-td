// src/store/gameStore.ts

import { create } from 'zustand';
import { GameState, GamePokemon, Enemy, Projectile, DamageNumber, Difficulty, Item } from '../types/game';
import { EVOLUTION_STAT_BOOST, EVOLUTION_CHAINS } from '../data/evolution';
import { pokeAPI } from '../api/pokeapi';
import { soundService } from '../services/SoundService';
import { saveService } from '../services/SaveService';

interface GameStore extends GameState {
  addTower: (tower: GamePokemon) => void;
  updateTower: (id: string, updates: Partial<GamePokemon>) => void;
  removeTower: (id: string) => void;
  addEnemy: (enemy: Enemy) => void;
  updateEnemy: (id: string, updates: Partial<Enemy>) => void;
  removeEnemy: (id: string) => void;
  addProjectile: (projectile: Projectile) => void;
  removeProjectile: (id: string) => void;
  addDamageNumber: (dmg: DamageNumber) => void;
  removeDamageNumber: (id: string) => void;
  addMoney: (amount: number) => void;
  spendMoney: (amount: number) => boolean;
  setMap: (mapId: string) => void;
  setDifficulty: (difficulty: Difficulty) => void;
  setGameSpeed: (speed: number) => void;
  nextWave: () => void;
  reset: () => void;
  tick: () => void;
  setPokemonToPlace: (pokemon: any | null) => void;
  
  setSkillChoice: (choice: GameState['skillChoice']) => void;
  setWaveEndItemPick: (items: Item[] | null) => void;
  useItem: (itemType: string, targetTowerId?: string) => boolean; // 타겟 지원
  healAllTowers: () => void;
  addXpToTower: (towerId: string, xp: number) => void;
  evolvePokemon: (towerId: string, item?: string) => Promise<boolean>; // 진화의 돌 - 성공 여부 반환
}

export const useGameStore = create<GameStore>((set, get) => ({
  wave: 1,
  money: 200,
  lives: 20,
  towers: [],
  enemies: [],
  projectiles: [],
  damageNumbers: [],
  isWaveActive: false,
  isPaused: false,
  gameOver: false,
  victory: false,
  selectedTowerSlot: null,
  availableItems: [],
  currentMap: 'beginner',
  difficulty: 'normal',
  gameSpeed: 1,
  combo: 0,
  gameTick: 0,
  pokemonToPlace: null,
  skillChoice: null,
  waveEndItemPick: null,
  
  addTower: (tower) => set((state) => ({ towers: [...state.towers, tower] })),
  updateTower: (id, updates) => set((state) => ({
    towers: state.towers.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  removeTower: (id) => set((state) => ({ towers: state.towers.filter(t => t.id !== id) })),
  
  addEnemy: (enemy) => set((state) => ({ enemies: [...state.enemies, enemy] })),
  updateEnemy: (id, updates) => set((state) => ({
    enemies: state.enemies.map(e => e.id === id ? { ...e, ...updates } : e)
  })),
  removeEnemy: (id) => set((state) => ({ enemies: state.enemies.filter(e => e.id !== id) })),
  
  addProjectile: (p) => set((state) => ({ projectiles: [...state.projectiles, p] })),
  removeProjectile: (id) => set((state) => ({ projectiles: state.projectiles.filter(p => p.id !== id) })),
  
  addDamageNumber: (dmg) => set((state) => ({ damageNumbers: [...state.damageNumbers, dmg] })),
  removeDamageNumber: (id) => set((state) => ({ damageNumbers: state.damageNumbers.filter(d => d.id !== id) })),
  
  addMoney: (amount) => set((state) => ({ money: state.money + amount })),
  spendMoney: (amount) => {
    if (get().money >= amount) {
      set((state) => ({ money: state.money - amount }));
      return true;
    }
    return false;
  },
  
  setMap: (mapId) => set({ currentMap: mapId }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setGameSpeed: (speed) => set({ gameSpeed: speed }),
  
  nextWave: () => set((state) => ({ wave: state.wave + 1, isWaveActive: true })),
  
  reset: () => set({
    wave: 0,
    money: 200,
    lives: 20,
    towers: [],
    enemies: [],
    projectiles: [],
    damageNumbers: [],
    isWaveActive: false,
    gameOver: false,
    victory: false,
    combo: 0,
    gameTick: 0,
    pokemonToPlace: null,
    skillChoice: null,
    waveEndItemPick: null,
  }),
  
  tick: () => set((state) => ({ gameTick: state.gameTick + 1 })),
  setPokemonToPlace: (pokemon) => set({ pokemonToPlace: pokemon }),

  setSkillChoice: (choice) => set({ skillChoice: choice }),
  
  setWaveEndItemPick: (items) => set({ waveEndItemPick: items }),

  // 상처약/사탕/기력의조각 사용 (타겟팅 지원)
  useItem: (itemType, targetTowerId) => {
    const towers = get().towers;
    if (towers.length === 0) return false;

    if (itemType === 'potion') {
      const target = targetTowerId 
        ? towers.find(t => t.id === targetTowerId && !t.isFainted)
        : towers.filter(t => !t.isFainted).sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0];
      
      if (target) {
        const newHp = Math.min(target.maxHp, target.currentHp + 50);
        get().updateTower(target.id, { currentHp: newHp });
        return true;
      }
    }
    if (itemType === 'potion_full') {
      const target = targetTowerId 
        ? towers.find(t => t.id === targetTowerId && !t.isFainted)
        : towers.filter(t => !t.isFainted).sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0];
      
      if (target) {
        const newHp = Math.min(target.maxHp, target.currentHp + 200);
        get().updateTower(target.id, { currentHp: newHp });
        return true;
      }
    }
    if (itemType === 'candy') {
      const target = targetTowerId 
        ? towers.find(t => t.id === targetTowerId)
        : towers.sort((a, b) => a.level - b.level)[0];
        
      if (target) {
        get().addXpToTower(target.id, 100); // 100 XP = 1 레벨
        return true;
      }
    }
    if (itemType === 'revive') {
      const target = targetTowerId 
        ? towers.find(t => t.id === targetTowerId && t.isFainted)
        : towers.find(t => t.isFainted);
        
      if (target) {
        // 50% HP로 부활
        get().updateTower(target.id, { isFainted: false, currentHp: target.maxHp * 0.5 });
        return true;
      }
    }
    return false; // 해당 아이템을 사용할 대상이 없음
  },

  // 모든 타워 회복
  healAllTowers: () => {
    set((state) => ({
      towers: state.towers.map(t => ({
        ...t,
        currentHp: t.isFainted ? t.currentHp : t.maxHp, // 기절한 타워는 회복 안됨
      }))
    }));
  },

  // 경험치 추가 및 레벨업 처리
  addXpToTower: (towerId, xp) => {
    const tower = get().towers.find(t => t.id === towerId);
    if (!tower || tower.isFainted) return;

    const oldLevel = tower.level;
    const newExperience = tower.experience + xp;
    const newLevel = Math.floor(newExperience / 100) + 1; // 100 XP당 1레벨

    if (newLevel > oldLevel) {
      set({ isPaused: true }); // 게임 일시정지
      get().updateTower(tower.id, {
        level: newLevel,
        experience: newExperience,
        maxHp: Math.floor(tower.maxHp * 1.05),
        currentHp: Math.floor(tower.currentHp * 1.05),
        attack: Math.floor(tower.attack * 1.05),
        baseAttack: Math.floor(tower.baseAttack * 1.05),
        defense: Math.floor(tower.defense * 1.05),
        specialAttack: Math.floor(tower.specialAttack * 1.05),
        specialDefense: Math.floor(tower.specialDefense * 1.05),
      });

      // 실제 레벨업 기술 가져오기
      pokeAPI.getLearnableMoves(tower.pokemonId, newLevel).then(moves => {
        if (moves.length > 0) {
          get().setSkillChoice({ towerId: tower.id, newMoves: moves });
        } else {
          set({ isPaused: false }); // 기술이 없으면 바로 재개
        }
      }).catch(() => {
        set({ isPaused: false }); // 오류 시 재개
      });
      
    } else {
      tower.experience = newExperience;
    }
  },

  // 진화의 돌을 사용한 진화
  evolvePokemon: async (towerId, item) => {
    const tower = get().towers.find(t => t.id === towerId);
    if (!tower) return false;

    const evolution = EVOLUTION_CHAINS.find(e => e.from === tower.pokemonId && e.item === item);
    if (!evolution) {
      console.log(`진화 불가: ${tower.name} (ID: ${tower.pokemonId})는 ${item}으로 진화할 수 없습니다.`);
      return false;
    }

    try {
      const newData = await pokeAPI.getPokemon(evolution.to);
      get().updateTower(tower.id, {
        pokemonId: evolution.to,
        name: newData.name,
        sprite: newData.sprite,
        types: newData.types,
        maxHp: Math.floor(tower.maxHp * EVOLUTION_STAT_BOOST.hp),
        currentHp: Math.floor(tower.currentHp * EVOLUTION_STAT_BOOST.hp),
        baseAttack: Math.floor(tower.baseAttack * EVOLUTION_STAT_BOOST.attack),
        attack: Math.floor(tower.attack * EVOLUTION_STAT_BOOST.attack),
        defense: Math.floor(tower.defense * EVOLUTION_STAT_BOOST.defense),
        specialAttack: Math.floor(tower.specialAttack * EVOLUTION_STAT_BOOST.specialAttack),
        specialDefense: Math.floor(tower.specialDefense * EVOLUTION_STAT_BOOST.specialDefense),
      });
      soundService.playEvolutionSound();
      saveService.updateStats({
        evolutionsAchieved: saveService.load().stats.evolutionsAchieved + 1,
      });
      return true;
    } catch (e) {
      console.error('Evolution failed:', e);
      return false;
    }
  },
}));