import { create } from 'zustand';
import { GameState, GamePokemon, Enemy, Projectile, DamageNumber, Difficulty, Item, GameMove, Synergy } from '../types/game';
import { EVOLUTION_CHAINS, canMegaEvolve, canGigantamax, FUSION_DATA } from '../data/evolution';
import { pokeAPI } from '../api/pokeapi';
import { soundService } from '../services/SoundService';
import { saveService } from '../services/SaveService';
import { calculateActiveSynergies } from '../utils/synergyManager';

interface GameStore extends GameState {
  addTower: (tower: GamePokemon) => void;
  updateTower: (id: string, updates: Partial<GamePokemon>) => void;
  removeTower: (id: string) => void;
  sellTower: (id: string) => boolean;
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
  useItem: (itemType: string, targetTowerId?: string) => boolean;
  healAllTowers: () => void;
  addXpToTower: (towerId: string, xp: number) => void;
  evolvePokemon: (towerId: string, item?: string, targetId?: number) => Promise<boolean>;
  removeEvolutionConfirm: () => void;
  fusePokemon: (baseId: string, materialId: string, item: string) => Promise<boolean>;
  setSpawning: (isSpawning: boolean) => void;
  updateActiveSynergies: () => void;
  setHoveredSynergy: (synergy: Synergy | null) => void;
  setPreloading: (isLoading: boolean) => void;
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
  timeOfDay: 'day',
  evolutionConfirmQueue: [],
  activeSynergies: [],
  hoveredSynergy: null,
  isPreloading: false,
  
  addTower: (tower) => {
    set((state) => ({ towers: [...state.towers, tower] }));
    get().updateActiveSynergies();
  },
  
  updateTower: (id, updates) => {
    let needsSynergyUpdate = false;

    set((state) => ({
      towers: state.towers.map(t => {
        if (t.id === id) {
          if (updates.isFainted !== undefined && t.isFainted !== updates.isFainted) {
            needsSynergyUpdate = true;
          }
          return { ...t, ...updates };
        }
        return t;
      })
    }));
    if (needsSynergyUpdate) {
      get().updateActiveSynergies();
    }
  },

  removeTower: (id) => {
    set((state) => ({ towers: state.towers.filter(t => t.id !== id) }));
    get().updateActiveSynergies();
  },
  
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
  
  nextWave: () => set((state) => ({ 
    wave: state.wave + 1, 
    isWaveActive: true,
    timeOfDay: state.timeOfDay === 'day' ? 'night' : 'day'
  })),
  
  // ⭐️ [수정] reset 함수에 isPreloading 추가
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
    timeOfDay: 'day',
    evolutionConfirmQueue: [],
    activeSynergies: [],
    hoveredSynergy: null,
    isPreloading: false,
  }),
  
   tick: () => set((state) => ({ gameTick: state.gameTick + 1 })),
  setSpawning: (isSpawning) => set({ isSpawning }),
  
  setPokemonToPlace: (pokemon) => set({ pokemonToPlace: pokemon }),
  
  addSkillChoice: (choice) => set((state) => {
    const newQueue = [...state.skillChoiceQueue, choice];
    return { skillChoiceQueue: newQueue };
  }),
  
  removeCurrentSkillChoice: () => set((state) => {
    const newQueue = state.skillChoiceQueue.slice(1);
    return { skillChoiceQueue: newQueue };
  }),
  
  setWaveEndItemPick: (items) => set({ waveEndItemPick: items }),

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
          return false;
        }
        get().addXpToTower(target.id, 100);
        return true;
      }
    }
    if (itemType === 'exp_candy') {
      if (towers.length < 2) return false;
      const aliveTowers = towers.filter(t => !t.isFainted);
      if (aliveTowers.length < 2) return false;
      
      const sortedTowers = [...aliveTowers].sort((a, b) => a.level - b.level);
      const lowestLevelTower = sortedTowers[0];
      const secondLowestLevel = sortedTowers[1].level;
      
      if (lowestLevelTower.level < secondLowestLevel) {
        const levelDiff = secondLowestLevel - lowestLevelTower.level;
        const statMultiplier = Math.pow(1.05, levelDiff);
        const newBaseExperience = (secondLowestLevel - 1) * 100;
        get().updateTower(lowestLevelTower.id, {
          level: secondLowestLevel,
          experience: newBaseExperience,
          maxHp: Math.floor(lowestLevelTower.maxHp * statMultiplier),
          currentHp: Math.floor(lowestLevelTower.currentHp * statMultiplier),
          attack: Math.floor(lowestLevelTower.attack * statMultiplier),
          baseAttack: Math.floor(lowestLevelTower.baseAttack * statMultiplier),
          defense: Math.floor(lowestLevelTower.defense * statMultiplier),
          specialAttack: Math.floor(lowestLevelTower.specialAttack * statMultiplier),
          specialDefense: Math.floor(lowestLevelTower.specialDefense * statMultiplier),
        });
        return true;
      }
      return false;
    }
    if (itemType === 'revive') {
      const target = targetTowerId 
        ? towers.find(t => t.id === targetTowerId && t.isFainted)
        : towers.find(t => t.isFainted);
      if (target) {
        get().updateTower(target.id, {
          isFainted: false,
          currentHp: Math.floor(target.maxHp * 0.5),
        });
        return true;
      }
    }
    return false;
  },

  healAllTowers: () => {
    set((state) => ({
      towers: state.towers.map(t => ({
        ...t,
        currentHp: t.isFainted ? t.currentHp : t.maxHp,
      }))
    }));
  },

  addXpToTower: (towerId, xp) => {
    const tower = get().towers.find(t => t.id === towerId);
    if (!tower || tower.isFainted || tower.level >= 100) {
      return;
    }

    const oldLevel = tower.level;
    const newExperience = tower.experience + xp;
    let newLevel = Math.floor(newExperience / 100) + 1;

    let finalExperience = newExperience;
    if (newLevel > 100) {
      newLevel = 100;
      finalExperience = 9900;
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
      pokeAPI.getLearnableMoves(tower.pokemonId, newLevel).then(moves => {
        if (moves.length > 0) {
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
      }).catch(() => {});
      
      const currentState = get();
      const possibleEvolutions = EVOLUTION_CHAINS.filter(chain => {
        if (chain.from !== tower.pokemonId) return false;
        if (chain.level && newLevel < chain.level) return false;
        if (chain.item) return false;
        if (chain.gender && chain.gender !== tower.gender) return false;
        if (chain.timeOfDay && chain.timeOfDay !== currentState.timeOfDay) return false;
        return true;
      });
      
      if (possibleEvolutions.length > 0) {
        Promise.all(possibleEvolutions.map(async (evo) => {
          const targetData = await pokeAPI.getPokemon(evo.to);
          let method = '';
          if (evo.level) method = `레벨 ${evo.level}`;
          if (evo.gender) method += ` (${evo.gender === 'male' ? '♂' : '♀'})`;
          if (evo.timeOfDay) method += ` (${evo.timeOfDay === 'day' ? '☀️' : '🌙'})`;
          
          return {
            targetId: evo.to,
            targetName: targetData.displayName,
            method,
          };
        })).then(options => {
          set(state => ({
            evolutionConfirmQueue: [...state.evolutionConfirmQueue, {
              towerId,
              evolutionOptions: options,
            }],
          }));
        });
      }
      
    } else {
      get().updateTower(tower.id, { experience: finalExperience });
    }
  },

  evolvePokemon: async (towerId, item, targetId) => {
    const tower = get().towers.find(t => t.id === towerId);
    if (!tower) return false;
    
    const currentState = get();
    
    if (!targetId) {
      if (item) {
        const megaEvolution = canMegaEvolve(tower.pokemonId, item);
        if (megaEvolution) {
          targetId = megaEvolution.to;
        }
      }
      
      if (!targetId && item === 'max-mushroom') {
        const gigantamax = canGigantamax(tower.pokemonId, item);
        if (gigantamax) {
          targetId = gigantamax.to;
        }
      }
      
      if (!targetId) {
        const possibleEvolutions = EVOLUTION_CHAINS.filter(chain => {
          if (chain.from !== tower.pokemonId) return false;
          
          if (chain.level && tower.level < chain.level) return false;
          if (chain.item && chain.item !== item) return false;
          if (chain.gender && chain.gender !== tower.gender) return false;
          if (chain.timeOfDay && chain.timeOfDay !== currentState.timeOfDay) return false;
          
          return true;
        });
        
        if (possibleEvolutions.length === 0) return false;
        
        if (possibleEvolutions.length === 1) {
          targetId = possibleEvolutions[0].to;
        } else {
          const options = await Promise.all(possibleEvolutions.map(async (evo) => {
            const targetData = await pokeAPI.getPokemon(evo.to);
            let method = '';
            if (evo.item) method = `아이템 필요`;
            else if (evo.level) method = `레벨 ${evo.level}`;
            if (evo.gender) method += ` (${evo.gender === 'male' ? '♂' : '♀'})`;
            if (evo.timeOfDay) method += ` (${evo.timeOfDay === 'day' ? '☀️' : '🌙'})`;
            
            return {
              targetId: evo.to,
              targetName: targetData.displayName,
              method,
            };
          }));
          
          set(state => ({
            evolutionConfirmQueue: [...state.evolutionConfirmQueue, {
              towerId,
              evolutionOptions: options,
            }],
          }));
          return false;
        }
      }
    }
    
    try {
      const oldName = tower.displayName;
      const targetData = await pokeAPI.getPokemon(targetId);
      const levelMultiplier = Math.pow(1.05, tower.level - 1);
      
      const currentHpRatio = tower.currentHp / tower.maxHp;
      const newMaxHp = Math.floor(targetData.stats.hp * levelMultiplier);
      
      get().updateTower(towerId, {
        pokemonId: targetId,
        name: targetData.name,
        displayName: targetData.displayName,
        sprite: targetData.sprite,
        types: targetData.types,
        maxHp: newMaxHp,
        currentHp: Math.floor(newMaxHp * currentHpRatio),
        baseAttack: Math.floor(targetData.stats.attack * levelMultiplier),
        attack: Math.floor(targetData.stats.attack * levelMultiplier),
        defense: Math.floor(targetData.stats.defense * levelMultiplier),
        specialAttack: Math.floor(targetData.stats.specialAttack * levelMultiplier),
        specialDefense: Math.floor(targetData.stats.specialDefense * levelMultiplier),
        speed: targetData.stats.speed,
      });
      get().updateActiveSynergies();

      soundService.playEvolutionSound();
      set({
        evolutionToast: {
          fromName: oldName,
          toName: targetData.displayName,
          timestamp: Date.now()
        }
      });
      setTimeout(() => {
        const current = useGameStore.getState().evolutionToast;
        if (current && Date.now() - current.timestamp >= 3000) {
          set({ evolutionToast: null });
        }
      }, 3000);
      
      set(state => ({
        evolutionConfirmQueue: state.evolutionConfirmQueue.filter(e => e.towerId !== towerId)
      }));
      
      saveService.updateStats({
        evolutionsAchieved: saveService.load().stats.evolutionsAchieved + 1,
      });
      
      return true;
    } catch (e) {
      console.error('Evolution failed:', e);
      return false;
    }
  },

  removeEvolutionConfirm: () => set(state => ({
    evolutionConfirmQueue: state.evolutionConfirmQueue.slice(1),
  })),

  fusePokemon: async (baseId, materialId, item) => {
    const baseTower = get().towers.find(t => t.id === baseId);
    const materialTower = get().towers.find(t => t.id === materialId);
    
    if (!baseTower || !materialTower) return false;
    
    const fusion = FUSION_DATA.find(f => 
      f.base === baseTower.pokemonId && 
      f.material === materialTower.pokemonId && 
      f.item === item
    );
    
    if (!fusion) return false;
    
    get().removeTower(materialId);
    
    try {
      const resultData = await pokeAPI.getPokemon(fusion.result);
      const levelMultiplier = Math.pow(1.05, baseTower.level - 1);
      
      const currentHpRatio = baseTower.currentHp / baseTower.maxHp;
      const newMaxHp = Math.floor(resultData.stats.hp * levelMultiplier);
      
      get().updateTower(baseId, {
        pokemonId: fusion.result,
        name: resultData.name,
        displayName: resultData.displayName,
        sprite: resultData.sprite,
        maxHp: newMaxHp,
        currentHp: Math.floor(newMaxHp * currentHpRatio),
        baseAttack: Math.floor(resultData.stats.attack * levelMultiplier),
        attack: Math.floor(resultData.stats.attack * levelMultiplier),
        defense: Math.floor(resultData.stats.defense * levelMultiplier),
        specialAttack: Math.floor(resultData.stats.specialAttack * levelMultiplier),
        specialDefense: Math.floor(resultData.stats.specialDefense * levelMultiplier),
        speed: resultData.stats.speed,
        types: resultData.types,
      });
      get().updateActiveSynergies();

      set({
        evolutionToast: {
          fromName: `${baseTower.displayName} + ${materialTower.displayName}`,
          toName: resultData.displayName,
          timestamp: Date.now(),
        },
      });
      setTimeout(() => {
        const current = useGameStore.getState().evolutionToast;
        if (current && Date.now() - current.timestamp >= 3000) {
          set({ evolutionToast: null });
        }
      }, 3000);
      return true;
    } catch (e) {
      console.error('Fusion failed:', e);
      return false;
    }
  },

  updateActiveSynergies: () => {
    const synergies = calculateActiveSynergies(get().towers);
    set({ activeSynergies: synergies });
  },

  setHoveredSynergy: (synergy) => set({ hoveredSynergy: synergy }),

  // ⭐️ [수정] setPreloading 액션 정의
  setPreloading: (isLoading) => set({ isPreloading: isLoading }),
}));