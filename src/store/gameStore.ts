// src/store/gameStore.ts
import { create } from 'zustand';
import {
  GameState, GamePokemon, Enemy, Projectile, DamageNumber,
  Difficulty, Item, GameMove, Synergy
} from '../types/game';
import {
  EVOLUTION_CHAINS, canMegaEvolve, canGigantamax, FUSION_DATA
} from '../data/evolution';
import { pokeAPI } from '../api/pokeapi';
import { soundService } from '../services/SoundService';
import { saveService } from '../services/SaveService';
import { calculateActiveSynergies } from '../utils/synergyManager';
import { ACHIEVEMENTS } from '../data/achievements';
import { EVOLUTION_ITEMS } from '../data/evolutionItems';
import { achievementService } from '../services/AchievementService';

// 싱글플레이 초기 라이프 (업적 체크 기준값으로 사용)
export const INITIAL_LIVES_SINGLE = 50;

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
  incrementGameTime: (dt: number) => void;
  setPokemonToPlace: (pokemon: any | null) => void;
  addSkillChoice: (choice: { towerId: string; newMoves: GameMove[] }) => void;
  removeCurrentSkillChoice: () => void;
  setWaveEndItemPick: (items: Item[] | null) => void;
  useItem: (itemType: string, targetTowerId?: string) => boolean;
  useRewardItem: (itemType: string, targetTowerId: string) => boolean;
  healAllTowers: () => void;
  addXpToTower: (towerId: string, xp: number) => void;
  evolvePokemon: (towerId: string, item?: string, targetId?: number) => Promise<boolean>;
  removeEvolutionConfirm: () => void;
  fusePokemon: (baseId: string, materialId: string, item: string) => Promise<boolean>;
  setSpawning: (isSpawning: boolean) => void;
  updateActiveSynergies: () => void;
  setHoveredSynergy: (synergy: Synergy | null) => void;
  setPreloading: (isLoading: boolean) => void;
  // 토스트 알림 (alert 대체)
  achievementToast: { name: string; timestamp: number } | null;
  showAchievementToast: (name: string) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // ─── 초기 상태 ───────────────────────────────────────────────────
  wave: 0,
  money: 500,
  lives: INITIAL_LIVES_SINGLE,
  towers: [],
  enemies: [],
  projectiles: [],
  damageNumbers: [],
  isWaveActive: false,
  isPaused: false,           // [수정] reset에서도 초기화
  gameOver: false,
  victory: false,
  selectedTowerSlot: null,
  availableItems: [],
  currentMap: 'beginner',
  difficulty: 'normal',
  gameSpeed: 1,
  combo: 0,
  gameTime: 0,
  isSpawning: false,
  pokemonToPlace: null,
  skillChoiceQueue: [],
  waveEndItemPick: null,
  evolutionToast: null,
  achievementToast: null,    // [수정] alert 대체 토스트
  wave50Clear: false,
  timeOfDay: 'day',
  evolutionConfirmQueue: [],
  activeSynergies: [],
  hoveredSynergy: null,
  isPreloading: false,
  isShopDisabled: false,

  // ─── 타워 ─────────────────────────────────────────────────────────
  addTower: (tower) => {
    set(state => ({ towers: [...state.towers, tower] }));
    get().updateActiveSynergies();
  },

  updateTower: (id, updates) => {
    let needsSynergyUpdate = false;
    set(state => ({
      towers: state.towers.map(t => {
        if (t.id !== id) return t;
        if (updates.isFainted !== undefined && t.isFainted !== updates.isFainted) {
          needsSynergyUpdate = true;
        }
        return { ...t, ...updates };
      }),
    }));
    if (needsSynergyUpdate) get().updateActiveSynergies();
  },

  removeTower: (id) => {
    set(state => ({ towers: state.towers.filter(t => t.id !== id) }));
    get().updateActiveSynergies();
  },

  // [수정] 판매가 = max(sellValue의 60%, level * 20) 으로 개선
  // sellValue는 PokemonPicker에서 포켓몬을 배치할 때 구매가로 설정됨
  sellTower: (id) => {
    const tower = get().towers.find(t => t.id === id);
    if (!tower) return false;
    const baseSellPrice = tower.level * 20;
    // sellValue가 구매가로 사용됨 (0이면 기본 level*20 사용)
    const costBasedPrice = tower.sellValue > 0 ? Math.floor(tower.sellValue * 0.6) : 0;
    const sellPrice = Math.max(baseSellPrice, costBasedPrice);
    get().addMoney(sellPrice);
    get().removeTower(id);
    achievementService.onSell(); // 판매 업적 체크
    return true;
  },

  // ─── 적 ───────────────────────────────────────────────────────────
  addEnemy: (enemy) => set(state => ({ enemies: [...state.enemies, enemy] })),
  updateEnemy: (id, updates) =>
    set(state => ({
      enemies: state.enemies.map(e => e.id === id ? { ...e, ...updates } : e),
    })),
  removeEnemy: (id) =>
    set(state => ({ enemies: state.enemies.filter(e => e.id !== id) })),

  // ─── 투사체 / 데미지 숫자 ─────────────────────────────────────────
  addProjectile: (p) => set(state => ({ projectiles: [...state.projectiles, p] })),
  removeProjectile: (id) =>
    set(state => ({ projectiles: state.projectiles.filter(p => p.id !== id) })),
  addDamageNumber: (dmg) =>
    set(state => ({ damageNumbers: [...state.damageNumbers, dmg] })),
  removeDamageNumber: (id) =>
    set(state => ({ damageNumbers: state.damageNumbers.filter(d => d.id !== id) })),

  // ─── 골드 ─────────────────────────────────────────────────────────
  addMoney: (amount) => set(state => ({ money: state.money + amount })),
  spendMoney: (amount) => {
    if (get().money >= amount) {
      set(state => ({ money: state.money - amount }));
      return true;
    }
    return false;
  },

  // ─── 설정 ─────────────────────────────────────────────────────────
  setMap: (mapId) => set({ currentMap: mapId }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setGameSpeed: (speed) => set({ gameSpeed: speed }),

  nextWave: () => {
    const newWave = get().wave + 1;
    set(state => ({
      wave: newWave,
      isWaveActive: true,
      timeOfDay: state.timeOfDay === 'day' ? 'night' : 'day',
    }));

    const waveAchievements = ACHIEVEMENTS.filter(
      a => a.condition === 'wave' && a.id !== 'wave50'
    );
    for (const ach of waveAchievements) {
      if (newWave >= ach.target) {
        saveService.updateAchievement(ach.id, ach.target);
      }
    }
  },

  // [수정] isPaused: false 추가
  reset: () =>
    set({
      wave: 0,
      money: 500,
      lives: INITIAL_LIVES_SINGLE,
      towers: [],
      enemies: [],
      projectiles: [],
      damageNumbers: [],
      isWaveActive: false,
      isPaused: false,
      gameOver: false,
      victory: false,
      combo: 0,
      gameTime: 0,
      isSpawning: false,
      pokemonToPlace: null,
      skillChoiceQueue: [],
      waveEndItemPick: null,
      evolutionToast: null,
      achievementToast: null,
      wave50Clear: false,
      timeOfDay: 'day',
      evolutionConfirmQueue: [],
      activeSynergies: [],
      hoveredSynergy: null,
      isPreloading: false,
    }),

  incrementGameTime: (dt) =>
    set(state => ({ gameTime: state.gameTime + dt * 1000 })),

  setSpawning: (isSpawning) => set({ isSpawning }),
  setPokemonToPlace: (pokemon) => set({ pokemonToPlace: pokemon }),

  addSkillChoice: (choice) =>
    set(state => ({ skillChoiceQueue: [...state.skillChoiceQueue, choice] })),
  removeCurrentSkillChoice: () =>
    set(state => ({ skillChoiceQueue: state.skillChoiceQueue.slice(1) })),
  setWaveEndItemPick: (items) => set({ waveEndItemPick: items }),

  // ─── 토스트 (alert 대체) ──────────────────────────────────────────
  showAchievementToast: (name) => {
    set({ achievementToast: { name, timestamp: Date.now() } });
    setTimeout(() => {
      const cur = get().achievementToast;
      if (cur && Date.now() - cur.timestamp >= 3000) {
        set({ achievementToast: null });
      }
    }, 3500);
  },

  // ─── 아이템 사용 ──────────────────────────────────────────────────
  useItem: (itemType, targetTowerId) => {
    const towers = get().towers;
    if (
      towers.length === 0 &&
      itemType !== 'potion' &&
      itemType !== 'potion_good' &&
      itemType !== 'potion_super'
    )
      return false;

    if (itemType === 'potion') {
      if (!get().spendMoney(20)) return false;
      const target = targetTowerId
        ? towers.find(t => t.id === targetTowerId && !t.isFainted)
        : towers.filter(t => !t.isFainted).sort(
            (a, b) => a.currentHp / a.maxHp - b.currentHp / b.maxHp
          )[0];
      if (target) {
        const newHp = Math.min(target.maxHp, target.currentHp + 30);
        get().updateTower(target.id, { currentHp: newHp });
        return true;
      }
      get().addMoney(20);
      return false;
    }

    if (itemType === 'potion_good') {
      if (!get().spendMoney(100)) return false;
      const target = targetTowerId
        ? towers.find(t => t.id === targetTowerId && !t.isFainted)
        : towers.filter(t => !t.isFainted).sort(
            (a, b) => a.currentHp / a.maxHp - b.currentHp / b.maxHp
          )[0];
      if (target) {
        const healAmt = Math.max(150, Math.floor(target.maxHp * 0.1));
        const newHp = Math.min(target.maxHp, target.currentHp + healAmt);
        get().updateTower(target.id, { currentHp: newHp });
        return true;
      }
      get().addMoney(100);
      return false;
    }

    if (itemType === 'potion_super') {
      if (!get().spendMoney(500)) return false;
      const target = targetTowerId
        ? towers.find(t => t.id === targetTowerId && !t.isFainted)
        : towers.filter(t => !t.isFainted).sort(
            (a, b) => a.currentHp / a.maxHp - b.currentHp / b.maxHp
          )[0];
      if (target) {
        const newHp = Math.min(target.maxHp, target.currentHp + Math.floor(target.maxHp * 0.5));
        get().updateTower(target.id, { currentHp: newHp });
        return true;
      }
      get().addMoney(500);
      return false;
    }

    if (itemType === 'candy') {
      const target = targetTowerId
        ? towers.find(t => t.id === targetTowerId)
        : towers.sort((a, b) => a.level - b.level)[0];
      if (target) {
        if (target.level >= 100) return false;
        const candyCost = target.level * 25;
        if (!get().spendMoney(candyCost)) return false;
        get().addXpToTower(target.id, 100);
        return true;
      }
      return false;
    }

    if (itemType === 'exp_candy') {
      if (towers.length < 2) return false;
      const aliveTowers = towers.filter(t => !t.isFainted);
      if (aliveTowers.length < 2) return false;

      const sortedTowers = [...aliveTowers].sort((a, b) => a.level - b.level);
      const lowest = sortedTowers[0];
      const secondLowestLevel = sortedTowers[1].level;

      if (targetTowerId !== lowest.id) return false;
      if (lowest.level >= secondLowestLevel) return false;

      const expCandyCost = secondLowestLevel * 50;
      if (!get().spendMoney(expCandyCost)) return false;

      const levelDiff = secondLowestLevel - lowest.level;
      const statMult = Math.pow(1.05, levelDiff);
      get().updateTower(lowest.id, {
        level: secondLowestLevel,
        experience: (secondLowestLevel - 1) * 100,
        maxHp: Math.floor(lowest.maxHp * statMult),
        currentHp: Math.floor(lowest.currentHp * statMult),
        attack: Math.floor(lowest.attack * statMult),
        baseAttack: Math.floor(lowest.baseAttack * statMult),
        defense: Math.floor(lowest.defense * statMult),
        specialAttack: Math.floor(lowest.specialAttack * statMult),
        specialDefense: Math.floor(lowest.specialDefense * statMult),
      });
      return true;
    }

    if (itemType === 'revive') {
      if (targetTowerId) {
        const strictTarget = towers.find(t => t.id === targetTowerId);
        if (strictTarget && !strictTarget.isFainted) return false;
      }
      const target = targetTowerId
        ? towers.find(t => t.id === targetTowerId && t.isFainted)
        : towers.find(t => t.isFainted);
      if (target) {
        const reviveCost = target.level * 10;
        if (!get().spendMoney(reviveCost)) return false;
        get().updateTower(target.id, {
          isFainted: false,
          currentHp: Math.floor(target.maxHp * 0.5),
        });
        return true;
      }
      return false;
    }

    return false;
  },

  useRewardItem: (itemType, targetTowerId) => {
    const towers = get().towers;
    if (towers.length === 0) return false;

    if (itemType === 'candy') {
      const target = towers.find(t => t.id === targetTowerId);
      if (target && target.level < 100) {
        get().addXpToTower(target.id, 100);
        return true;
      }
      return false;
    }

    if (itemType === 'revive') {
      const target = towers.find(t => t.id === targetTowerId && t.isFainted);
      if (target) {
        get().updateTower(target.id, {
          isFainted: false,
          currentHp: Math.floor(target.maxHp * 0.5),
        });
        return true;
      }
      return false;
    }

    return false;
  },

  // healAllTowers - 기절한 포켓몬은 그대로 유지
  healAllTowers: () => {
    set(state => ({
      towers: state.towers.map(t => {
        if (t.isFainted) return t; // 기절 포켓몬은 아무것도 변경하지 않음
        return { ...t, currentHp: t.maxHp }; // 생존 포켓몬만 풀 회복
      }),
    }));
  },

  // [수정] 경험치 상한 처리 버그 수정
  addXpToTower: (towerId, xp) => {
    const tower = get().towers.find(t => t.id === towerId);
    if (!tower || tower.isFainted || tower.level >= 100) return;

    const oldLevel = tower.level;
    const rawNewXp = tower.experience + xp;
    let newLevel = Math.floor(rawNewXp / 100) + 1;
    newLevel = Math.min(100, newLevel);

    // [수정] 경험치는 level 100 상한에서 9900으로 고정
    const newExperience = newLevel >= 100 ? 9900 : rawNewXp;

    if (newLevel > oldLevel) {
      get().updateTower(towerId, {
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

      // 레벨 100 업적
      if (newLevel >= 100) {
        achievementService.onLevel100();
      }

      // 팀 전원 레벨 50+ 업적 (현재 타워 업데이트 후 전체 확인)
      const updatedTowers = get().towers;
      if (
        updatedTowers.length === 6 &&
        updatedTowers.every(t => (t.id === towerId ? newLevel : t.level) >= 50)
      ) {
        achievementService.onTeamAllLevel50();
      }

      pokeAPI.getLearnableMoves(tower.pokemonId, newLevel).then(moves => {
        if (moves.length > 0) {
          const rejectedMoves = tower.rejectedMoves || [];
          const equippedNames = tower.equippedMoves.map(m => m.name);
          const available = moves.filter(
            move => !rejectedMoves.includes(move.name) && !equippedNames.includes(move.name)
          );
          if (available.length > 0) {
            get().addSkillChoice({ towerId, newMoves: available });
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
        Promise.all(
          possibleEvolutions.map(async evo => {
            const targetData = await pokeAPI.getPokemon(evo.to);
            let method = '';
            if (evo.level) method = `레벨 ${evo.level}`;
            if (evo.gender) method += ` (${evo.gender === 'male' ? '♂' : '♀'})`;
            if (evo.timeOfDay)
              method += ` (${evo.timeOfDay === 'day' ? '☀️' : '🌙'})`;
            return { targetId: evo.to, targetName: targetData.displayName, method };
          })
        ).then(options => {
          set(state => ({
            evolutionConfirmQueue: [
              ...state.evolutionConfirmQueue,
              { towerId, evolutionOptions: options },
            ],
          }));
        });
      }
    } else {
      get().updateTower(towerId, { experience: newExperience });
    }
  },

  evolvePokemon: async (towerId, item, targetId) => {
    const tower = get().towers.find(t => t.id === towerId);
    if (!tower) return false;

    const currentState = get();
    let cost = 0;

    if (!targetId) {
      if (item) {
        const itemData = EVOLUTION_ITEMS[item];
        if (itemData) {
          cost = itemData.price;
        } else if (item.startsWith('mega_stone_')) {
          cost = 0;
          const megaStoneName = item.replace('mega_stone_', '');
          const megaEvolution = canMegaEvolve(tower.pokemonId, megaStoneName);
          if (megaEvolution) targetId = megaEvolution.to;
        } else if (item.startsWith('max_mushroom')) {
          cost = 0;
          const gigantamax = canGigantamax(tower.pokemonId, 'max-mushroom');
          if (gigantamax) targetId = gigantamax.to;
        }

        if (!targetId) {
          const possibleEvolutions = EVOLUTION_CHAINS.filter(
            chain => chain.from === tower.pokemonId && chain.item === item
          );
          if (possibleEvolutions.length === 1) {
            targetId = possibleEvolutions[0].to;
          }
        }
      } else {
        const possibleEvolutions = EVOLUTION_CHAINS.filter(chain => {
          if (chain.from !== tower.pokemonId) return false;
          if (chain.level && tower.level < chain.level) return false;
          if (chain.item) return false;
          if (chain.gender && chain.gender !== tower.gender) return false;
          if (chain.timeOfDay && chain.timeOfDay !== currentState.timeOfDay) return false;
          return true;
        });
        if (possibleEvolutions.length === 0) return false;
        if (possibleEvolutions.length === 1) targetId = possibleEvolutions[0].to;
        else return false;
      }
    }

    if (!targetId) return false;
    if (cost > 0 && !get().spendMoney(cost)) return false;

    try {
      const oldName = tower.displayName;
      const targetData = await pokeAPI.getPokemon(targetId);
      const levelMult = Math.pow(1.05, tower.level - 1);
      const hpRatio = tower.currentHp / tower.maxHp;
      const newMaxHp = Math.floor(targetData.stats.hp * levelMult);

      get().updateTower(towerId, {
        pokemonId: targetId,
        name: targetData.name,
        displayName: targetData.displayName,
        sprite: targetData.sprite,
        types: targetData.types,
        maxHp: newMaxHp,
        currentHp: Math.floor(newMaxHp * hpRatio),
        baseAttack: Math.floor(targetData.stats.attack * levelMult),
        attack: Math.floor(targetData.stats.attack * levelMult),
        defense: Math.floor(targetData.stats.defense * levelMult),
        specialAttack: Math.floor(targetData.stats.specialAttack * levelMult),
        specialDefense: Math.floor(targetData.stats.specialDefense * levelMult),
        speed: targetData.stats.speed,
      });
      get().updateActiveSynergies();

      soundService.playEvolutionSound();
      set({
        evolutionToast: {
          fromName: oldName,
          toName: targetData.displayName,
          timestamp: Date.now(),
        },
      });
      setTimeout(() => {
        const cur = get().evolutionToast;
        if (cur && Date.now() - cur.timestamp >= 3000) set({ evolutionToast: null });
      }, 3000);

      set(state => ({
        evolutionConfirmQueue: state.evolutionConfirmQueue.filter(
          e => e.towerId !== towerId
        ),
      }));

      saveService.updateStats({
        evolutionsAchieved: saveService.load().stats.evolutionsAchieved + 1,
      });

      // 진화 종류에 따른 업적 체크
      const isMega = item?.startsWith('mega_stone_');
      const isGiga = item?.startsWith('max_mushroom');
      achievementService.onEvolve(isMega ? 'mega' : isGiga ? 'gigamax' : 'normal');

      return true;
    } catch (e) {
      console.error('Evolution failed:', e);
      if (cost > 0) get().addMoney(cost);
      return false;
    }
  },

  removeEvolutionConfirm: () =>
    set(state => ({
      evolutionConfirmQueue: state.evolutionConfirmQueue.slice(1),
    })),

  fusePokemon: async (baseId, materialId, item) => {
    const baseTower = get().towers.find(t => t.id === baseId);
    const materialTower = get().towers.find(t => t.id === materialId);
    if (!baseTower || !materialTower) return false;

    const fusion = FUSION_DATA.find(
      f =>
        f.base === baseTower.pokemonId &&
        f.material === materialTower.pokemonId &&
        f.item === item
    );
    if (!fusion) return false;

    const fusionCost = 500;
    if (!get().spendMoney(fusionCost)) return false;

    get().removeTower(materialId);

    try {
      const resultData = await pokeAPI.getPokemon(fusion.result);
      const levelMult = Math.pow(1.05, baseTower.level - 1);
      const hpRatio = baseTower.currentHp / baseTower.maxHp;
      const newMaxHp = Math.floor(resultData.stats.hp * levelMult);

      get().updateTower(baseId, {
        pokemonId: fusion.result,
        name: resultData.name,
        displayName: resultData.displayName,
        sprite: resultData.sprite,
        maxHp: newMaxHp,
        currentHp: Math.floor(newMaxHp * hpRatio),
        baseAttack: Math.floor(resultData.stats.attack * levelMult),
        attack: Math.floor(resultData.stats.attack * levelMult),
        defense: Math.floor(resultData.stats.defense * levelMult),
        specialAttack: Math.floor(resultData.stats.specialAttack * levelMult),
        specialDefense: Math.floor(resultData.stats.specialDefense * levelMult),
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
        const cur = get().evolutionToast;
        if (cur && Date.now() - cur.timestamp >= 3000) set({ evolutionToast: null });
      }, 3000);

      achievementService.onEvolve('fusion'); // 합체 업적
      return true;
    } catch (e) {
      console.error('Fusion failed:', e);
      get().addMoney(fusionCost);
      return false;
    }
  },

  updateActiveSynergies: () => {
    const synergies = calculateActiveSynergies(get().towers);
    set({ activeSynergies: synergies });
    // 시너지 업적 체크 (타입별/세대별 모두 여기서 처리)
    achievementService.onSynergyUpdate(synergies);
  },

  setHoveredSynergy: (synergy) => set({ hoveredSynergy: synergy }),
  setPreloading: (isLoading) => set({ isPreloading: isLoading }),
}));