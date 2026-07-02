// src/services/SaveService.ts
import { SaveData, GameStats, Achievement } from '../types/game';
import { databaseService } from './DatabaseService';
import { ACHIEVEMENTS } from '../data/achievements';

const SAVE_KEY = 'pokemon-td-save';

class SaveService {
  private static instance: SaveService;
  private constructor() {}

  static getInstance() {
    if (!SaveService.instance) {
      SaveService.instance = new SaveService();
    }
    return SaveService.instance;
  }

  save(data: Partial<SaveData>) {
    try {
      const existing = this.load();
      const merged = { ...existing, ...data };
      localStorage.setItem(SAVE_KEY, JSON.stringify(merged));
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }

  load(): SaveData {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.totalAP === undefined) parsed.totalAP = 0;

        let changed = false;
        if (parsed.achievements && Array.isArray(parsed.achievements)) {
          let recalculatedAP = 0;
          parsed.achievements.forEach((a: any) => {
            const tierPoints: Record<string, number> = { bronze: 3, silver: 10, gold: 25, diamond: 50, legendary: 100 };
            const ptsPer = a.tier ? tierPoints[a.tier] ?? 3 : 3;
            const unlocked = a.unlocked || (a.completions ?? 0) > 0 || a.progress >= a.target;
            const targetCompletions = unlocked ? 1 : 0;
            const targetTotalPoints = unlocked ? ptsPer : 0;

            if (a.completions !== targetCompletions || a.totalPoints !== targetTotalPoints || a.unlocked !== unlocked) {
              a.unlocked = unlocked;
              a.completions = targetCompletions;
              a.totalPoints = targetTotalPoints;
              a.pointsPerCompletion = ptsPer;
              changed = true;
            }
            recalculatedAP += a.totalPoints;
          });

          if (parsed.totalAP !== recalculatedAP) {
            parsed.totalAP = recalculatedAP;
            changed = true;
          }
        }

        if (changed) {
          localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load game:', error);
    }
    return this.getDefaultSave();
  }

  getDefaultSave(): SaveData {
    return {
      stats: {
        totalPlayTime: 0,
        enemiesKilled: 0,
        pokemonUsed: 0,
        highestWave: 0,
        totalMoneyEarned: 0,
        evolutionsAchieved: 0,
        bossesDefeated: 0,
        mapClears: {},
      },
      achievements: [],
      unlockedMaps: ['beginner'],
      settings: {
        musicVolume: 0.2,
        gameSpeed: 1,
        showDamageNumbers: true,
        showGrid: true,
        autoSave: true,
        language: 'ko',
      },
      highScores: [],
      totalAP: 0,
    };
  }

  updateStats(updates: Partial<GameStats>) {
    const data = this.load();
    data.stats = { ...data.stats, ...updates };
    this.save(data);
  }


  // ─── [리뉴얼] 업적 업데이트 — 중복 달성 불가능하도록 completions 1로 고정 및 AP 정규화 ─────────────────
  updateAchievement(achievementId: string, progress: number) {
    const data = this.load();
    let achievement: Achievement | undefined = data.achievements.find(
      a => a.id === achievementId
    );

    if (!achievement) {
      const base = ACHIEVEMENTS.find(a => a.id === achievementId);
      if (base) {
        achievement = {
          ...base,
          progress: 0,
          unlocked: false,
          completions: 0,
          totalPoints: 0,
        };
        data.achievements.push(achievement);
      } else {
        console.warn(`Attempted to update undefined achievement: ${achievementId}`);
        return;
      }
    }

    const pointsPerCompletion = achievement.tier ? { bronze:3, silver:10, gold:25, diamond:50, legendary:100 }[achievement.tier] ?? 3 : 3;
    achievement.pointsPerCompletion = pointsPerCompletion;

    const prevProgress = achievement.progress;
    let justUnlocked = false;

    // 이미 달성된 업적이면 더 이상 처리하지 않음 (반복 달성 버그 방지)
    if (!achievement.unlocked) {
      achievement.progress = Math.max(prevProgress, progress);

      // 달성 조건: target 도달
      if (achievement.progress >= achievement.target) {
        achievement.unlocked = true;
        justUnlocked = true;

        achievement.completions = 1;
        achievement.totalPoints = pointsPerCompletion;

        // [A5] Vite ESM 환경에서 require는 동작 불보장 → dynamic import로 전환
        import('../store/gameStore')
          .then(m => m.useGameStore.getState().showAchievementToast(achievement!.name, pointsPerCompletion, true))
          .catch(() => {});

        // [카드모드] 업적 최초 달성 시 티어별 별조각 지급
        import('./CardService')
          .then(({ cardService }) => {
            const shardByTier: Record<string, number> = { bronze: 2, silver: 5, gold: 12, diamond: 25, legendary: 50 };
            cardService.grantRewards({ starShards: shardByTier[achievement!.tier] ?? 2 });
          })
          .catch(() => {});
      }
    } else {
      // 이미 달성되었음에도 혹시 카운트가 잘못되어 있다면 정규화
      achievement.completions = 1;
      achievement.totalPoints = pointsPerCompletion;
    }

    // 총 AP 누적 오류 방지를 위해 전체 합산 방식으로 재계산
    data.totalAP = data.achievements.reduce((sum, a) => sum + (a.totalPoints ?? 0), 0);
    this.save(data);

    // [FREE-TIER] 업적이 최초로 달성되었을 때만 Firestore에 저장 (쿼터 보호)
    if (justUnlocked) {
      import('./AuthService')
        .then(({ authService }) => {
          // [FREE-TIER] 오프라인 모드는 Firestore 쓰기를 건너뜀
          if (authService.getCurrentUser() && !authService.isOfflineMode()) {
            const unlockedCount = data.achievements.filter(a => a.unlocked).length;
            databaseService
              .updateUserAchievement(achievement!, data.totalAP, unlockedCount)
              .catch((err: any) => {
                if (err?.code !== 'permission-denied') {
                  console.warn('[SaveService] Failed to persist achievement to DB:', err);
                }
              });
          }
        })
        .catch(() => {});
    }
  }

  // ─── 총 AP 조회 ──────────────────────────────────────────────────────────
  getTotalAP(): number {
    return this.load().totalAP ?? 0;
  }

  unlockMap(mapId: string) {
    const data = this.load();
    if (!data.unlockedMaps.includes(mapId)) {
      data.unlockedMaps.push(mapId);
      this.save(data);
    }
  }

  // ─── Firebase → localStorage 병합 (중복 달성 데이터 강제 정규화 실행) ────────
  async syncAchievementsFromDB(): Promise<void> {
    try {
      const dbAchievements = await databaseService.getUserAchievements();
      const data = this.load();

      // [FIX] DB도 비어있고 로컬도 진척도가 전혀 없다면 굳이 Firestore 쓰기를 하지 않고 리턴 (쿼터 절약)
      const localHasProgress = (data.totalAP ?? 0) > 0 || data.achievements.some(a => (a.progress ?? 0) > 0);
      if ((!dbAchievements || dbAchievements.length === 0) && !localHasProgress) {
        return;
      }

      if (dbAchievements && dbAchievements.length > 0) {
        for (const dbAch of dbAchievements) {
          const localIdx = data.achievements.findIndex(a => a.id === dbAch.id);
          const pointsPerCompletion = dbAch.tier ? { bronze:3, silver:10, gold:25, diamond:50, legendary:100 }[dbAch.tier] ?? 3 : 3;
          const isUnlocked = dbAch.unlocked || (dbAch.completions ?? 0) > 0 || dbAch.progress >= dbAch.target;

          const normalizedAch: Achievement = {
            ...dbAch,
            unlocked: isUnlocked,
            completions: isUnlocked ? 1 : 0,
            totalPoints: isUnlocked ? pointsPerCompletion : 0,
            pointsPerCompletion
          };

          if (localIdx === -1) {
            data.achievements.push(normalizedAch);
          } else {
            const local = data.achievements[localIdx];
            const localPointsPer = local.tier ? { bronze:3, silver:10, gold:25, diamond:50, legendary:100 }[local.tier] ?? 3 : 3;
            const localUnlocked = local.unlocked || (local.completions ?? 0) > 0 || local.progress >= local.target;

            data.achievements[localIdx] = {
              ...local,
              unlocked: localUnlocked || isUnlocked,
              completions: (localUnlocked || isUnlocked) ? 1 : 0,
              totalPoints: (localUnlocked || isUnlocked) ? localPointsPer : 0,
              pointsPerCompletion: localPointsPer,
              progress: Math.max(local.progress, dbAch.progress),
            };
          }
        }
      }

      // 모든 로컬 데이터의 Completions와 AP 정규화 강제 적용
      for (let i = 0; i < data.achievements.length; i++) {
        const a = data.achievements[i];
        const ptsPer = a.tier ? { bronze:3, silver:10, gold:25, diamond:50, legendary:100 }[a.tier] ?? 3 : 3;
        const unlocked = a.unlocked || (a.completions ?? 0) > 0 || a.progress >= a.target;
        data.achievements[i] = {
          ...a,
          unlocked,
          completions: unlocked ? 1 : 0,
          totalPoints: unlocked ? ptsPer : 0,
          pointsPerCompletion: ptsPer
        };
      }

      data.totalAP = data.achievements.reduce((sum, a) => sum + (a.totalPoints ?? 0), 0);
      this.save(data);

      // 정규화된 최신 AP와 고유 업적 개수를 DB에 강제 반영하여 동기화 (단일 Bulk Batch)
      import('./AuthService')
        .then(async ({ authService }) => {
          const user = authService.getCurrentUser();
          if (user && !authService.isOfflineMode()) {
            const unlockedCount = data.achievements.filter(a => a.unlocked).length;
            await databaseService.updateUserAchievementsBulk(data.achievements, data.totalAP, unlockedCount);
          }
        })
        .catch(() => {});

    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('[SaveService] Failed to sync achievements from DB:', err);
      }
    }
  }

  clearSave() {
    localStorage.removeItem(SAVE_KEY);
    console.log('Save data cleared');
  }
}

export const saveService = SaveService.getInstance();