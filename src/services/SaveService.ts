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
        musicVolume: 0.5,
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
          .catch(() => {
            // Firebase permission 에러 등은 조용히 무시 (로컬 저장은 이미 완료됨)
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

  clearSave() {
    localStorage.removeItem(SAVE_KEY);
    console.log('Save data cleared');
  }
}

export const saveService = SaveService.getInstance();