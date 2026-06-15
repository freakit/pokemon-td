// src/store/gameStore.ts
import { create } from 'zustand';
import {
  GameState, GamePokemon, Enemy, Projectile, DamageNumber,
  Difficulty, Item, GameMove, Synergy
} from '../types/game';
import {
  EVOLUTION_CHAINS, FUSION_DATA,
  canMegaEvolve, canGigantamax, canEvolve
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

// 레벨업에 필요한 XP — 10레벨 구간마다 100씩 증가
//   Lv1~10: 100 / 11~20: 200 / 21~30: 300 / … / 91~100: 1000
export const xpToNextLevel = (level: number) =>
  (Math.floor((level - 1) / 10) + 1) * 100;

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
  storyClear: false,        // story 챕터 클리어 트리거
  storyChapterNumber: null as number | null,  // 현재 스토리 챕터 번호
  storyTotalWaves: null as number | null,     // 이 챕터의 목표 웨이브 수
  storyEnemyTypes: null as string[] | null,   // 챕터별 적 타입 편향
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

  reset: () => {
    // [BUG-C2] GameManager 싱글턴 내부 상태도 함께 초기화.
    // pendingStats, statFlushTimer, isCompletingWave 가 이전 게임에서 누적되던 버그 수정.
    // 동적 import로 순환 참조 방지 (GameManager → gameStore 역방향 의존성)
    import('../game/GameManager').then(({ GameManager }) => {
      GameManager.getInstance().resetState();
    }).catch(() => {});

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
      storyClear: false,
      storyChapterNumber: null,
      storyTotalWaves: null,
      storyEnemyTypes: null,
      timeOfDay: 'day',
      evolutionConfirmQueue: [],
      activeSynergies: [],
      hoveredSynergy: null,
      isPreloading: false,
      isShopDisabled: false,
    });
  },

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
        // 가격은 레벨×25 그대로. XP는 새 곡선 기준으로 정확히 +1레벨만큼 지급.
        get().addXpToTower(targetTowerId, xpToNextLevel(target.level));
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

      // 목표 레벨까지 필요한 정확한 경험치 계산 (새 곡선 기준 — 딱 목표레벨까지)
      let totalXpNeeded = 0;
      for (let lvl = target.level; lvl < nextTargetLevel; lvl++) {
        totalXpNeeded += xpToNextLevel(lvl);
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
      get().addXpToTower(targetTowerId, xpToNextLevel(target.level)); // 정확히 +1레벨
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
    // [FIX] 방어·특방·스피드도 레벨업 시 성장
    let currentDefense = tower.defense;
    let currentSpecialDefense = tower.specialDefense;
    const currentSpeed = tower.speed; // 속도는 레벨업으로 변하지 않음 (고정)

    const levelUps: number[] = [];

    while (currentLevel < 100) {
      const need = xpToNextLevel(currentLevel);
      if (newXp >= need) {
        newXp -= need;
        currentLevel++;
        levelUps.push(currentLevel);

        // 레벨당 성장: 속도 제외 전 스탯 ×1.05(+5%). 속도는 고정.
        const hpIncrease     = Math.floor(currentMaxHp * 0.05);
        const atkIncrease    = Math.floor(currentAttack * 0.05);
        const defIncrease    = Math.floor(currentDefense * 0.05);
        const spAtkIncrease  = Math.floor(currentSpecialAttack * 0.05);
        const spDefIncrease  = Math.floor(currentSpecialDefense * 0.05);

        currentMaxHp           += hpIncrease;
        currentHp              += hpIncrease;
        currentAttack          += atkIncrease;
        currentBaseAttack      += atkIncrease;
        currentSpecialAttack   += spAtkIncrease;
        currentDefense         += defIncrease;
        currentSpecialDefense  += spDefIncrease;
        // 속도(currentSpeed)는 레벨업 성장 없음 (고정)
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
      defense: currentDefense,
      specialDefense: currentSpecialDefense,
      speed: currentSpeed,
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

      // ─── 레벨 진화 체크 ──────────────────────────────────────────
      // 레벨업 후 현재 레벨에서 진화 가능한지 확인하여 모달 큐에 추가
      const evoData = canEvolve(tower.pokemonId, currentLevel);
      if (evoData) {
        // 해당 포켓몬의 레벨 진화 옵션 전체 수집 (분기 진화 대응)
        const levelEvoOptions = EVOLUTION_CHAINS.filter(
          e => e.from === tower.pokemonId && e.level !== undefined && e.item === undefined && currentLevel >= e.level!
        );
        // 이미 큐에 동일 타워가 등록되어 있으면 중복 추가 방지
        const currentQueue = get().evolutionConfirmQueue;
        const alreadyQueued = currentQueue.some(q => q.towerId === towerId);
        if (!alreadyQueued && levelEvoOptions.length > 0) {
          const evolutionOptions = levelEvoOptions.map(e => ({
            targetId: e.to,
            targetName: `#${e.to}`,
            method: `Lv.${e.level}`,
          }));
          set(state => ({
            evolutionConfirmQueue: [
              ...state.evolutionConfirmQueue,
              { towerId, evolutionOptions },
            ],
          }));
          // 진화 옵션의 포켓몬 이름을 비동기로 가져와서 큐 업데이트
          Promise.all(
            levelEvoOptions.map(e => pokeAPI.getPokemon(e.to).then(d => ({
              targetId: e.to,
              targetName: d.displayName,
              method: `Lv.${e.level}`,
            })).catch(() => ({
              targetId: e.to,
              targetName: `#${e.to}`,
              method: `Lv.${e.level}`,
            })))
          ).then(resolvedOptions => {
            set(state => ({
              evolutionConfirmQueue: state.evolutionConfirmQueue.map(q =>
                q.towerId === towerId
                  ? { ...q, evolutionOptions: resolvedOptions }
                  : q
              ),
            }));
          }).catch(() => {});
        }
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
      // [BUG-FIX] specialDefense도 scaleFactor 적용 (기존 누락)
      const newSpecialDefense = Math.floor(newData.stats.specialDefense * scaleFactor);
      // speed는 진화 후 포켓몬의 기본 스피드를 그대로 사용 (의도된 불변값)
      const newSpeed = newData.stats.speed;

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
        specialDefense: newSpecialDefense,
        speed: newSpeed,
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
      // [C1-FIX] slice(1)(첫 항목 제거) → towerId 필터.
      //   메가/거다 진화는 큐를 거치지 않고 호출되는데, slice(1)이면 대기 중인
      //   무관한 레벨진화 확인 항목을 잘못 삼키는 버그가 있었음.
      //   towerId당 큐 항목은 최대 1개(addXpToTower의 alreadyQueued 가드)이므로
      //   레벨진화 케이스에서도 동일하게 1개만 제거된다.
      set(state => ({
        evolutionConfirmQueue: state.evolutionConfirmQueue.filter(q => q.towerId !== towerId),
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

    const cost = 500;
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
    const { towers, storyChapterNumber } = get();
    const activeTowers = towers.filter(t => !t.isFainted);
    // 스토리 모드: 스트리머(에눈박놈) 파티 시너지 비활성화
    const synergies = calculateActiveSynergies(activeTowers, storyChapterNumber !== null);
    set({ activeSynergies: synergies });
  },

  setHoveredSynergy: (synergy) => set({ hoveredSynergy: synergy }),
  setPreloading: (isLoading) => set({ isPreloading: isLoading }),
}));