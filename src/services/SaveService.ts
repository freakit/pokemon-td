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
        // totalAP 필드가 없는 구버전 데이터 마이그레이션
        if (parsed.totalAP === undefined) parsed.totalAP = 0;
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
        sfxVolume: 0.7,
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


  // ─── [리뉴얼] 업적 업데이트 — 횟수 누적 + AP 포인트 ─────────────────────
  // progress >= target 달성 시마다 completions++ / totalPoints += pointsPerCompletion
  // 기존 unlocked 플래그는 최초 달성 기록용으로 유지
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

    // 리뉴얼 필드 마이그레이션 (구버전 데이터 대응)
    if (achievement.completions === undefined) achievement.completions = achievement.unlocked ? 1 : 0;
    if (achievement.totalPoints === undefined) achievement.totalPoints = achievement.completions * (achievement.pointsPerCompletion ?? 3);
    if (achievement.pointsPerCompletion === undefined) achievement.pointsPerCompletion = achievement.tier ? { bronze:3, silver:10, gold:25, diamond:50, legendary:100 }[achievement.tier] ?? 3 : 3;

    const prevProgress = achievement.progress;
    let justUnlocked = false;

    // 이미 달성된 업적이면 더 이상 처리하지 않음 (반복 달성 버그 방지)
    if (!achievement.unlocked) {
      achievement.progress = Math.max(prevProgress, progress);

      // 달성 조건: target 도달
      if (achievement.progress >= achievement.target) {
        achievement.unlocked = true;
        justUnlocked = true;

        // 새 달성 1회 카운트
        achievement.completions = 1;
        const earnedAP = achievement.pointsPerCompletion ?? 3;
        achievement.totalPoints = earnedAP;

        // 전체 누적 AP 갱신
        data.totalAP = (data.totalAP ?? 0) + earnedAP;

        // [A5] Vite ESM 환경에서 require는 동작 불보장 → dynamic import로 전환
        import('../store/gameStore')
          .then(m => m.useGameStore.getState().showAchievementToast(achievement!.name, earnedAP, true))
          .catch(() => {});
      }
    }

    this.save(data);

    // [FREE-TIER] 업적이 최초로 달성되었을 때만 Firestore에 저장 (쿼터 보호)
    if (justUnlocked) {
      import('./AuthService')
        .then(({ authService }) => {
          if (authService.getCurrentUser()) {
            databaseService
              .updateUserAchievement(achievement!, data.totalAP)
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

  // ─── Firebase → localStorage 병합 ────────────────────────────────────────
  async syncAchievementsFromDB(): Promise<void> {
    try {
      const dbAchievements = await databaseService.getUserAchievements();
      if (!dbAchievements || dbAchievements.length === 0) return;

      const data = this.load();

      for (const dbAch of dbAchievements) {
        const localIdx = data.achievements.findIndex(a => a.id === dbAch.id);

        if (localIdx === -1) {
          data.achievements.push(dbAch);
        } else {
          const local = data.achievements[localIdx];
          // DB가 더 많은 completions를 가지면 DB 우선
          const dbCompletions = dbAch.completions ?? 0;
          const localCompletions = local.completions ?? 0;
          if (dbCompletions > localCompletions) {
            data.achievements[localIdx] = {
              ...local,
              completions: dbCompletions,
              totalPoints: dbAch.totalPoints ?? dbCompletions * (local.pointsPerCompletion ?? 3),
              unlocked: local.unlocked || dbAch.unlocked,
              progress: Math.max(local.progress, dbAch.progress),
            };
          }
        }
      }

      // 총 AP 재계산
      data.totalAP = data.achievements.reduce((sum, a) => sum + (a.totalPoints ?? 0), 0);
      this.save(data);

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