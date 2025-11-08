// src/services/SaveService.ts

import { SaveData, GameStats, Achievement } from '../types/game';

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
        return JSON.parse(saved);
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
  
  updateAchievement(achievementId: string, progress: number) {
    const data = this.load();
    
    // 1. 'Achievement' 타입을 명시적으로 사용하여 경고 해결
    const achievement: Achievement | undefined = data.achievements.find(a => a.id === achievementId);
    
    if (achievement) {
      achievement.progress = progress;
      if (progress >= achievement.target && !achievement.unlocked) {
        achievement.unlocked = true;
        console.log(`Achievement unlocked: ${achievement.name}`);
        // TODO: 업적 달성 알림 UI 표시
      }
      this.save(data);
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