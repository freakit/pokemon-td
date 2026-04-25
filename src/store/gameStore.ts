// src/store/gameStore.ts
import { create } from 'zustand';
import {
  GameState, GamePokemon, Enemy, Projectile, DamageNumber,
  Difficulty, Item, GameMove, Synergy
} from '../types/game';
import {
  EVOLUTION_CHAINS, FUSION_DATA,
  canMegaEvolve, canGigantamax
} from '../data/evolution';

import { pokeAPI } from '../api/pokeapi';
import { saveService } from '../services/SaveService';
import { calculateActiveSynergies } from '../utils/synergyManager';
import { ACHIEVEMENTS } from '../data/achievements';
import { achievementService } from '../services/AchievementService';

// [V8-FIX-1-7] MAX_LIVES_CAP: 라이프 상한 (addLives에서 사용)
// INITIAL_LIVES_SINGLE과 값이 같지만 의미를 명확히 분리
export const MAX_LIVES_CAP = 50;
// 싱글플레이 초기 라이프 (업적 체크 기준값으로 사용)
export const INITIAL_LIVES_SINGLE = MAX_LIVES_CAP;

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
  addLives: (amount: number) => void;
  spendLives: (amount: number) => boolean;
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

  // [리뉴얼] 업적 토스트 — AP 포인트 + 최초 달성 여부 포함
  achievementToast: {
    name: string;
    earnedAP: number;
    isFirstTime: boolean;
    timestamp: number;
  } | null;
  showAchievementToast: (name: string, earnedAP?: number, isFirstTime?: boolean) => void;
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
  isPaused: false,
  gameOver: false,
  victory: false,
  selectedTowerSlot: null,
  availableItems: [],
  currentMap: 'beginner',
  difficulty: 'normal',
  gameSpeed: saveService.load().settings.gameSpeed || 1,
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

  sellTower: (id) => {
    const tower = get().towers.find(t => t.id === id);
    if (!tower) return false;
    const sellPrice = tower.level * 20;
    get().addMoney(sellPrice);
    get().removeTower(id);
    achievementService.onSell();
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

  // [BUG-1 FIX] Math.max(0, ...) 추가 — 음수 livesDelta(패배 시)가 전달돼도
  // lives가 0 미만이 되지 않도록 보호. 상한(MAX_LIVES_CAP)과 하한(0) 모두 보장.
  addLives: (amount) => set(state => ({
    lives: Math.max(0, Math.min(MAX_LIVES_CAP, state.lives + amount)),
  })),
  spendLives: (amount) => {
    set(state => ({ lives: Math.max(0, state.lives - amount) }));
    return true;
  },


  // ─── 설정 ─────────────────────────────────────────────────────────
  setMap: (mapId) => set({ currentMap: mapId }),
  setDifficulty: (difficulty) => set({ difficulty }),
  setGameSpeed: (speed) => {
    set({ gameSpeed: speed });
    saveService.save({ settings: { ...saveService.load().settings, gameSpeed: speed } });
  },

  nextWave: () => {
    const newWave = get().wave + 1;
    set(state => ({
      wave: newWave,
      isWaveActive: true,
      timeOfDay: state.timeOfDay === 'day' ? 'night' : 'day',
    }));

    // 웨이브 도달 업적 체크
    const waveAchievements = ACHIEVEMENTS.filter(
      a => a.condition === 'wave' && a.id !== 'wave50'
    );
    for (const ach of waveAchievements) {
      if (newWave >= ach.target) {
        saveService.updateAchievement(ach.id, ach.target);
      }
    }
  },

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

  // ─── [리뉴얼] 업적 토스트 ────────────────────────────────────────
  showAchievementToast: (name, earnedAP = 3, isFirstTime = false) => {
    set({
      achievementToast: {
        name,
        earnedAP,
        isFirstTime,
        timestamp: Date.now(),
      },
    });
    setTimeout(() => {
      const cur = get().achievementToast;
      if (cur && Date.now() - cur.timestamp >= 4000) {
        set({ achievementToast: null });
      }
    }, 4500);
  },

  // ─── 아이템 사용 ──────────────────────────────────────────────────
  useItem: (itemType, targetTowerId) => {
    if (!targetTowerId) return false;
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
        const healAmount = Math.max(150, Math.floor(target.maxHp * 0.1));
        const newHp = Math.min(target.maxHp, target.currentHp + healAmount);
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

    if (itemType === 'revive') {
      const target = towers.find(t => t.id === targetTowerId);
      if (target && target.isFainted) {
        const cost = target.level * 10;
        if (!get().spendMoney(cost)) return false;
        get().updateTower(targetTowerId, {
          isFainted: false,
          currentHp: Math.floor(target.maxHp * 0.5),
        });
        return true;
      }
      return false;
    }

    if (itemType === 'candy') {
      const target = towers.find(t => t.id === targetTowerId);
      if (target && !target.isFainted && target.level < 100) {
        const cost = target.level * 25;
        if (!get().spendMoney(cost)) return false;
        get().addXpToTower(targetTowerId, target.level * 100);
        return true;
      }
      return false;
    }

    if (itemType === 'exp_candy') {
      const aliveTowers = towers.filter(t => !t.isFainted);
      if (aliveTowers.length < 2) return false;

      const target = towers.find(t => t.id === targetTowerId);
      if (!target || target.isFainted) return false;

      // 현재 타겟보다 높은 레벨들 중 가장 낮은 레벨 찾기
      const higherLevels = [...new Set(aliveTowers.map(t => t.level))]
        .filter(lvl => lvl > target.level)
        .sort((a, b) => a - b);

      if (higherLevels.length === 0) return false;
      const nextTargetLevel = higherLevels[0];

      const cost = nextTargetLevel * 50;
      if (!get().spendMoney(cost)) return false;

      // 목표 레벨까지 필요한 정확한 경험치 계산
      let totalXpNeeded = 0;
      for (let lvl = target.level; lvl < nextTargetLevel; lvl++) {
        totalXpNeeded += lvl * 100;
      }
      const xpToApply = Math.max(0, totalXpNeeded - target.experience);

      get().addXpToTower(target.id, xpToApply);
      return true;
    }


    return false;
  },

  useRewardItem: (itemType, targetTowerId) => {
    if (!targetTowerId) return false;
    const towers = get().towers;
    const target = towers.find(t => t.id === targetTowerId);
    if (!target) return false;

    if (itemType === 'candy') {
      get().addXpToTower(targetTowerId, target.level * 100);
      return true;
    }

    if (itemType === 'revive') {
      if (!target.isFainted) return false;
      get().updateTower(targetTowerId, {
        isFainted: false,
        currentHp: Math.floor(target.maxHp * 0.5),
      });
      return true;
    }

    return false;
  },

  healAllTowers: () => {
    const { towers, updateTower } = get();
    towers.forEach(t => {
      // [T11-REVERTED] isFainted 부활은 여기서 하지 않음.
      // 이유: healAllTowers는 WaveEndPicker 표시 직전에 호출됨 →
      //   전원 부활하면 revive 아이템의 유효 대상이 사라져 선택 불가 UX 버그 발생.
      // TFT 페어니스(기절 포켓몬 포함 전투)는 buildUnits에서 fainted:false로 처리.
      if (!t.isFainted) {
        updateTower(t.id, { currentHp: t.maxHp });
      }
    });
  },

  addXpToTower: (towerId, xp) => {
    const { towers, updateTower, addSkillChoice } = get();
    const tower = towers.find(t => t.id === towerId);
    if (!tower || tower.isFainted || tower.level >= 100) return;

    let newXp = tower.experience + xp;
    let currentLevel = tower.level;
    let currentMaxHp = tower.maxHp;
    let currentAttack = tower.attack;
    let currentBaseAttack = tower.baseAttack;
    let currentSpecialAttack = tower.specialAttack;
    let currentHp = tower.currentHp;

    const levelUps: number[] = [];

    while (currentLevel < 100) {
      const xpToNextLevel = currentLevel * 100;
      if (newXp >= xpToNextLevel) {
        newXp -= xpToNextLevel;
        currentLevel++;
        levelUps.push(currentLevel);

        const hpIncrease = Math.floor(currentMaxHp * 0.1);
        const atkIncrease = Math.floor(currentAttack * 0.05);
        
        currentMaxHp += hpIncrease;
        currentHp += hpIncrease;
        currentAttack += atkIncrease;
        currentBaseAttack += atkIncrease;
        currentSpecialAttack += atkIncrease;
      } else {
        break;
      }
    }

    updateTower(towerId, {
      level: currentLevel,
      experience: newXp,
      maxHp: currentMaxHp,
      currentHp: Math.min(currentHp, currentMaxHp),
      attack: currentAttack,
      baseAttack: currentBaseAttack,
      specialAttack: currentSpecialAttack,
    });

    if (levelUps.length > 0) {
      // 레벨업 업적 체크
      if (currentLevel >= 50) saveService.updateAchievement('level50', 1);
      if (currentLevel >= 100) saveService.updateAchievement('level100', 1);

      // 각 레벨업마다 배울 수 있는 기술 체크
      try {
        // [V8-FIX-12-1] _pokeAPI alias 제거 → pokeAPI 직접 사용
        // [V8-FIX-12-1] rejectedMoves 필터 — 이미 거절한 기술은 다시 제안하지 않음
        levelUps.forEach(lvl => {
          pokeAPI.getLearnableMoves(tower.pokemonId, lvl).then((newMoves: any[]) => {
            const rejectedMoves: string[] = tower.rejectedMoves ?? [];
            const filtered = newMoves.filter(m => !rejectedMoves.includes(m.name));
            if (filtered.length > 0) {
              addSkillChoice({ towerId, newMoves: filtered });
            }
          }).catch(() => {});
        });
      } catch (err) {
        console.error('Failed to load moves during multi-level up:', err);
      }
    }
  },


  evolvePokemon: async (towerId, item, targetId) => {
    const { towers, updateTower } = get();
    const tower = towers.find(t => t.id === towerId);
    if (!tower) return false;

    try {
      const evolutionTarget = await (async () => {
        if (targetId) return targetId;

        // 1. 메가진화 체크 (mega_stone_ 상성)
        if (item?.startsWith('mega_stone_')) {
          const stoneName = item.replace('mega_stone_', '');
          const mega = canMegaEvolve(tower.pokemonId, stoneName);
          return mega?.to;
        }

        // 2. 거다이맥스 체크 (max_mushroom_)
        if (item?.startsWith('max_mushroom')) {
          const gmax = canGigantamax(tower.pokemonId, 'max-mushroom');
          return gmax?.to;
        }

        // 3. 일반 진화 체크
        const chain = EVOLUTION_CHAINS.find(c =>
          c.from === tower.pokemonId && (!item || c.item === item)
        );
        return chain?.to;
      })();

      if (!evolutionTarget) {
        console.warn(`[Evolution] No evolution target found for ${tower.name} with item ${item}`);
        return false;
      }


      const newData = await pokeAPI.getPokemon(evolutionTarget);

      // 현재 레벨에 따른 스탯 스케일링 계산 (1.1^level-1)
      const scaleFactor = Math.pow(1.1, tower.level - 1);
      
      const newMaxHp = Math.floor(newData.stats.hp * scaleFactor);
      const newAttack = Math.floor(newData.stats.attack * scaleFactor);
      const newSpecialAttack = Math.floor(newData.stats.specialAttack * scaleFactor);
      const newDefense = Math.floor(newData.stats.defense * scaleFactor);
      const newStatSpeed = newData.stats.speed; 


      const hpRatio = tower.currentHp / tower.maxHp;

      updateTower(towerId, {
        pokemonId: newData.id,
        name: newData.name,
        displayName: newData.displayName,
        sprite: newData.sprite,
        types: newData.types,
        maxHp: newMaxHp,
        currentHp: Math.floor(newMaxHp * hpRatio),
        attack: newAttack,
        baseAttack: newAttack,
        specialAttack: newSpecialAttack,
        defense: newDefense,
        speed: newStatSpeed,
      });


      set(() => ({
        evolutionToast: {
          fromName: tower.displayName,
          toName: newData.displayName,
          timestamp: Date.now(),
        },
      }));
      setTimeout(() => {
        const cur = get().evolutionToast;
        if (cur && Date.now() - cur.timestamp >= 3000) {
          set({ evolutionToast: null });
        }
      }, 3500);

      // 진화 통계 + 업적
      const stats = saveService.load().stats;
      saveService.updateStats({ evolutionsAchieved: stats.evolutionsAchieved + 1 });
      achievementService.onEvolve('normal');

      // 진화 확정 큐에서 제거
      set(state => ({
        evolutionConfirmQueue: state.evolutionConfirmQueue.slice(1),
      }));

      return true;
    } catch (err) {
      console.error('Evolution failed:', err);
      return false;
    }
  },

  removeEvolutionConfirm: () => {
    set(state => ({
      evolutionConfirmQueue: state.evolutionConfirmQueue.slice(1),
    }));
  },

  fusePokemon: async (baseId, materialId, item) => {
    const { towers, updateTower, removeTower, spendMoney } = get();
    const baseTower = towers.find(t => t.id === baseId);
    const materialTower = towers.find(t => t.id === materialId);
    if (!baseTower || !materialTower) return false;

    const fusionData = FUSION_DATA.find(
      f => f.base === baseTower.pokemonId &&
           f.material === materialTower.pokemonId &&
           f.item === item
    );
    if (!fusionData) return false;

    const cost = 1000;
    if (!spendMoney(cost)) return false;

    try {
      const newData = await pokeAPI.getPokemon(fusionData.result);

      const hpRatio = baseTower.currentHp / baseTower.maxHp;
      const newMaxHp = Math.max(baseTower.maxHp, newData.stats.hp);

      updateTower(baseId, {
        pokemonId: newData.id,
        name: newData.name,
        displayName: newData.displayName,
        sprite: newData.sprite,
        types: newData.types,
        maxHp: newMaxHp,
        currentHp: Math.floor(newMaxHp * hpRatio),
        attack: Math.max(baseTower.attack, newData.stats.attack),
        baseAttack: Math.max(baseTower.baseAttack, newData.stats.attack),
        specialAttack: Math.max(baseTower.specialAttack, newData.stats.specialAttack),
        defense: Math.max(baseTower.defense, newData.stats.defense),
        speed: Math.max(baseTower.speed, newData.stats.speed),
      });

      removeTower(materialId);

      set(() => ({
        evolutionToast: {
          fromName: baseTower.displayName,
          toName: newData.displayName,
          timestamp: Date.now(),
        },
      }));
      setTimeout(() => {
        const cur = get().evolutionToast;
        if (cur && Date.now() - cur.timestamp >= 3000) {
          set({ evolutionToast: null });
        }
      }, 3500);

      achievementService.onEvolve('fusion');
      return true;
    } catch (err) {
      console.error('Fusion failed:', err);
      get().addMoney(cost);
      return false;
    }
  },

  updateActiveSynergies: () => {
    const { towers } = get();
    const activeTowers = towers.filter(t => !t.isFainted);
    const synergies = calculateActiveSynergies(activeTowers);
    set({ activeSynergies: synergies });
  },

  setHoveredSynergy: (synergy) => set({ hoveredSynergy: synergy }),
  setPreloading: (isLoading) => set({ isPreloading: isLoading }),
}));