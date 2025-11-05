// src/store/gameStore.ts

import { create } from 'zustand';
import { GameState, GamePokemon, Enemy, Projectile, DamageNumber, Difficulty, Item, GameMove } from '../types/game';
import { EVOLUTION_CHAINS, canMegaEvolve } from '../data/evolution';
import { pokeAPI } from '../api/pokeapi';
import { soundService } from '../services/SoundService';
import { saveService } from '../services/SaveService';

interface GameStore extends GameState {
  addTower: (tower: GamePokemon) => void;
  updateTower: (id: string, updates: Partial<GamePokemon>) => void;
  removeTower: (id: string) => void;
  sellTower: (id: string) => boolean; // 포켓몬 판매 기능 추가
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
  
  addSkillChoice: (choice: { towerId: string; newMoves: GameMove[] }) => void;
  removeCurrentSkillChoice: () => void;
  setWaveEndItemPick: (items: Item[] | null) => void;
  useItem: (itemType: string, targetTowerId?: string) => boolean; // 타겟 지원
  healAllTowers: () => void;
  addXpToTower: (towerId: string, xp: number) => void;
  evolvePokemon: (towerId: string, item?: string) => Promise<boolean>; // 진화의 돌 - 성공 여부 반환
  setSpawning: (isSpawning: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  wave: 0,
  money: 500,
  lives: 50,
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
  isSpawning: false,
  pokemonToPlace: null,
  skillChoiceQueue: [],
  waveEndItemPick: null,
  evolutionToast: null,
  wave50Clear: false,
  
  addTower: (tower) => set((state) => ({ towers: [...state.towers, tower] })),
  updateTower: (id, updates) => set((state) => ({
    towers: state.towers.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  removeTower: (id) => set((state) => ({ towers: state.towers.filter(t => t.id !== id) })),
  
  // 포켓몬 판매 (레벨 * 20원)
  sellTower: (id) => {
    const tower = get().towers.find(t => t.id === id);
    if (!tower) return false;
    
    const sellPrice = tower.level * 20;
    get().addMoney(sellPrice);
    get().removeTower(id);
    return true;
  },
  
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
    money: 500,
    lives: 50,
    towers: [],
    enemies: [],
    projectiles: [],
    damageNumbers: [],
    isWaveActive: false,
    gameOver: false,
    victory: false,
    combo: 0,
    gameTick: 0,
    isSpawning: false,
    pokemonToPlace: null,
    skillChoiceQueue: [],
    waveEndItemPick: null,
    evolutionToast: null,
    wave50Clear: false,
  }),
  
  tick: () => set((state) => ({ gameTick: state.gameTick + 1 })),
  setSpawning: (isSpawning) => set({ isSpawning }),
  setPokemonToPlace: (pokemon) => set({ pokemonToPlace: pokemon }),

  // 스킬 선택 큐 관리 - 게임을 멈추지 않음
  addSkillChoice: (choice) => set((state) => {
    const newQueue = [...state.skillChoiceQueue, choice];
    return { skillChoiceQueue: newQueue };
  }),
  
  removeCurrentSkillChoice: () => set((state) => {
    const newQueue = state.skillChoiceQueue.slice(1);
    return { skillChoiceQueue: newQueue };
  }),
  
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
        const newHp = Math.min(target.maxHp, target.currentHp + 30);
        get().updateTower(target.id, { currentHp: newHp });
        return true;
      }
    }
    if (itemType === 'potion_good') {
      const target = targetTowerId 
        ? towers.find(t => t.id === targetTowerId && !t.isFainted)
        : towers.filter(t => !t.isFainted).sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0];
      
      if (target) {
        // max(150, maxHP * 0.1) 회복
        const healAmount = Math.max(150, Math.floor(target.maxHp * 0.1));
        const newHp = Math.min(target.maxHp, target.currentHp + healAmount);
        get().updateTower(target.id, { currentHp: newHp });
        return true;
      }
    }
    if (itemType === 'potion_super') {
      const target = targetTowerId 
        ? towers.find(t => t.id === targetTowerId && !t.isFainted)
        : towers.filter(t => !t.isFainted).sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0];
      
      if (target) {
        // maxHP * 0.5 회복
        const healAmount = Math.floor(target.maxHp * 0.5);
        const newHp = Math.min(target.maxHp, target.currentHp + healAmount);
        get().updateTower(target.id, { currentHp: newHp });
        return true;
      }
    }
    if (itemType === 'candy') {
      const target = targetTowerId 
        ? towers.find(t => t.id === targetTowerId)
        : towers.sort((a, b) => a.level - b.level)[0];
        
      if (target) {
        if (target.level >= 100) {
          // 100레벨이면 사용 실패
          return false; 
        }
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
    if (itemType === 'exp_candy') {
      const target = targetTowerId 
        ? towers.find(t => t.id === targetTowerId && !t.isFainted)
        : null;
        
      if (target) {
        // 대상을 제외한 나머지 포켓몬 중 가장 낮은 레벨 찾기
        const otherTowers = towers.filter(t => t.id !== target.id && !t.isFainted);
        if (otherTowers.length === 0) return false; // 다른 포켓몬이 없으면 사용 불가
        
        const lowestLevel = Math.min(...otherTowers.map(t => t.level));
        
        // 대상 포켓몬의 레벨을 가장 낮은 레벨로 변경
        if (lowestLevel < target.level) {
          const xpNeeded = (lowestLevel - 1) * 100; // 목표 레벨에 필요한 경험치
          const currentXp = (target.level - 1) * 100 + target.experience;
          const xpToAdd = xpNeeded - currentXp;
          if (xpToAdd < 0) {
            // 이미 더 낮은 레벨이거나 같음
            return false;
          }
          
          // 레벨을 직접 설정
          get().updateTower(target.id, {
            level: lowestLevel,
            experience: 0,
          });
          
          // 스탯 재계산 (레벨 차이만큼 5%씩 감소)
          const levelDiff = target.level - lowestLevel;
          const statMultiplier = Math.pow(0.95, levelDiff);
          
          get().updateTower(target.id, {
            maxHp: Math.floor(target.maxHp * statMultiplier),
            currentHp: Math.floor(target.currentHp * statMultiplier),
            attack: Math.floor(target.attack * statMultiplier),
            baseAttack: Math.floor(target.baseAttack * statMultiplier),
            defense: Math.floor(target.defense * statMultiplier),
            specialAttack: Math.floor(target.specialAttack * statMultiplier),
            specialDefense: Math.floor(target.specialDefense * statMultiplier),
          });
          
          return true;
        }
        return false; // 이미 가장 낮은 레벨이거나 더 낮음
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
    if (!tower || tower.isFainted || tower.level >= 100) {
      return;
    }

    const oldLevel = tower.level;
    const newExperience = tower.experience + xp;
    let newLevel = Math.floor(newExperience / 100) + 1; // 100 XP당 1레벨

    let finalExperience = newExperience;
    if (newLevel > 100) {
      newLevel = 100;
      finalExperience = 9900; // 100레벨에 필요한 최대 경험치
    }

    if (newLevel > oldLevel) {
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
          // 거부한 기술 + 현재 장착된 기술 필터링
          const rejectedMoves = tower.rejectedMoves || [];
          const equippedMoveNames = tower.equippedMoves.map(m => m.name);
          const availableMoves = moves.filter(move => 
            !rejectedMoves.includes(move.name) && 
            !equippedMoveNames.includes(move.name)
          );
          
          if (availableMoves.length > 0) {
            get().addSkillChoice({ towerId: tower.id, newMoves: availableMoves });
          }
        }
      }).catch(() => {
        // 오류 시 무시
      });
      
    } else {
      get().updateTower(tower.id, { experience: finalExperience });
    }
  },

  // 진화의 돌을 사용한 진화 (일반 진화 + 메가진화)
  evolvePokemon: async (towerId, item) => {
    const tower = get().towers.find(t => t.id === towerId);
    if (!tower) return false;
    
    // item이 없으면 진화 불가
    if (!item) {
      console.log('진화 아이템이 필요합니다.');
      return false;
    }

    // 🔴 메가진화 체크 먼저
    const megaEvolution = canMegaEvolve(tower.pokemonId, item);
    if (megaEvolution) {
      try {
        const oldName = tower.name;
        const newData = await pokeAPI.getPokemon(megaEvolution.to);
        const levelMultiplier = Math.pow(1.05, tower.level - 1);
        
        get().updateTower(tower.id, {
          pokemonId: megaEvolution.to,
          name: newData.name,
          sprite: newData.sprite,
          types: newData.types,
          maxHp: Math.floor(newData.stats.hp * levelMultiplier),
          currentHp: Math.floor(newData.stats.hp * levelMultiplier),
          baseAttack: Math.floor(newData.stats.attack * levelMultiplier),
          attack: Math.floor(newData.stats.attack * levelMultiplier),
          defense: Math.floor(newData.stats.defense * levelMultiplier),
          specialAttack: Math.floor(newData.stats.specialAttack * levelMultiplier),
          specialDefense: Math.floor(newData.stats.specialDefense * levelMultiplier),
        });
        soundService.playEvolutionSound();
        
        // 진화 토스트 표시
        set({
          evolutionToast: {
            fromName: oldName,
            toName: `메가${newData.name}`,
            timestamp: Date.now()
          }
        });
        
        // 3초 후 토스트 제거
        setTimeout(() => {
          const current = useGameStore.getState().evolutionToast;
          if (current && Date.now() - current.timestamp >= 3000) {
            set({ evolutionToast: null });
          }
        }, 3000);
        
        saveService.updateStats({
          evolutionsAchieved: saveService.load().stats.evolutionsAchieved + 1,
        });
        return true;
      } catch (e) {
        console.error('Mega Evolution failed:', e);
        return false;
      }
    }

    // 🔴 일반 진화 체크
    const evolution = EVOLUTION_CHAINS.find(e => e.from === tower.pokemonId && e.item === item);
    if (!evolution) {
      console.log(`진화 불가: ${tower.name} (ID: ${tower.pokemonId})는 ${item}으로 진화할 수 없습니다.`);
      return false;
    }

    try {
      const oldName = tower.name;
      const newData = await pokeAPI.getPokemon(evolution.to);
      const levelMultiplier = Math.pow(1.05, tower.level - 1);
      
      get().updateTower(tower.id, {
        pokemonId: evolution.to,
        name: newData.name,
        sprite: newData.sprite,
        types: newData.types,
        maxHp: Math.floor(newData.stats.hp * levelMultiplier),
        currentHp: Math.floor(newData.stats.hp * levelMultiplier),
        baseAttack: Math.floor(newData.stats.attack * levelMultiplier),
        attack: Math.floor(newData.stats.attack * levelMultiplier),
        defense: Math.floor(newData.stats.defense * levelMultiplier),
        specialAttack: Math.floor(newData.stats.specialAttack * levelMultiplier),
        specialDefense: Math.floor(newData.stats.specialDefense * levelMultiplier),
      });
      soundService.playEvolutionSound();
      
      // 진화 토스트 표시
      set({
        evolutionToast: {
          fromName: oldName,
          toName: newData.name,
          timestamp: Date.now()
        }
      });
      
      // 3초 후 토스트 제거
      setTimeout(() => {
        const current = useGameStore.getState().evolutionToast;
        if (current && Date.now() - current.timestamp >= 3000) {
          set({ evolutionToast: null });
        }
      }, 3000);
      
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