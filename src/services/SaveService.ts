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
      if (saved) return JSON.parse(saved);
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
      pokedex: [],
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
    };
  }

  updateStats(updates: Partial<GameStats>) {
    const data = this.load();
    data.stats = { ...data.stats, ...updates };
    this.save(data);
  }

  addToPokedex(pokemonId: number) {
    const data = this.load();
    if (!data.pokedex.includes(pokemonId)) {
      data.pokedex.push(pokemonId);
      this.save(data);

      // 새 포켓몬 추가 시 수집 업적 체크
      try {
        const { achievementService } = require('./AchievementService');
        achievementService.onPokedexAdd(data.pokedex);
      } catch {
        // 모듈 순환 참조 방지 — 실패 시 조용히 무시
      }
    }
  }

  // [수정] alert → achievementToast 사용
  updateAchievement(achievementId: string, progress: number) {
    const data = this.load();
    let achievement: Achievement | undefined = data.achievements.find(
      a => a.id === achievementId
    );

    if (!achievement) {
      const base = ACHIEVEMENTS.find(a => a.id === achievementId);
      if (base) {
        achievement = { ...base, progress: 0, unlocked: false };
        data.achievements.push(achievement);
      } else {
        console.warn(`Attempted to update undefined achievement: ${achievementId}`);
        return;
      }
    }

    if (achievement.unlocked) return;

    achievement.progress = progress;

    if (progress >= achievement.target && !achievement.unlocked) {
      achievement.unlocked = true;
      console.log(`Achievement unlocked: ${achievement.name}`);

      // [수정] alert 제거 → 게임 내 토스트 사용
      try {
        const { useGameStore } = require('../store/gameStore');
        useGameStore.getState().showAchievementToast(achievement.name);
      } catch {
        // 스토어가 없는 경우 무시
      }
    }

    this.save(data);

    // DB 저장 (로그인 상태일 때만, 에러는 조용히 무시)
    try {
      const { authService } = require('./AuthService');
      if (authService.getCurrentUser()) {
        databaseService
          .updateUserAchievement(achievement)
          .catch((err: any) => {
            // Firebase permission 에러는 조용히 무시 (로컬 저장은 이미 완료됨)
            if (err?.code !== 'permission-denied') {
              console.warn('[SaveService] Failed to persist achievement to DB:', err);
            }
          });
      }
    } catch {
      // 모듈 로드 실패 시 무시
    }
  }

  unlockMap(mapId: string) {
    const data = this.load();
    if (!data.unlockedMaps.includes(mapId)) {
      data.unlockedMaps.push(mapId);
      this.save(data);
    }
  }

  /**
   * 로그인 직후 Firebase DB에서 업적 목록을 가져와
   * 로컬 저장소와 병합합니다 (더 높은 progress / unlocked 우선).
   * 나갔다 들어와도 업적이 유지되는 핵심 로직입니다.
   */
  async syncAchievementsFromDB(): Promise<void> {
    try {
      const dbAchievements = await databaseService.getUserAchievements();
      if (!dbAchievements || dbAchievements.length === 0) return;

      const data = this.load();

      for (const dbAch of dbAchievements) {
        const localIdx = data.achievements.findIndex(a => a.id === dbAch.id);

        if (localIdx === -1) {
          // 로컬에 없으면 그대로 추가
          data.achievements.push(dbAch);
        } else {
          const local = data.achievements[localIdx];
          // DB 기준으로 더 좋은 값(progress 높음 or unlocked) 채택
          const shouldUpdate =
            dbAch.unlocked && !local.unlocked ||
            (!local.unlocked && dbAch.progress > local.progress);
          if (shouldUpdate) {
            data.achievements[localIdx] = {
              ...local,
              progress: dbAch.unlocked ? dbAch.progress : Math.max(local.progress, dbAch.progress),
              unlocked: local.unlocked || dbAch.unlocked,
            };
          }
        }
      }

      this.save(data);
      console.log(`[SaveService] Synced ${dbAchievements.length} achievements from DB`);
    } catch (err: any) {
      // Firebase permission 에러는 로그 없이 무시 (Firestore Rules 미설정 환경)
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