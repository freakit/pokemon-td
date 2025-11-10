// src/services/SaveService.ts

import { SaveData, GameStats, Achievement } from '../types/game';
import { databaseService } from './DatabaseService';
import { ACHIEVEMENTS } from '../data/achievements'; // 1. 업적 기본 데이터 임포트

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
      highScores: 
 [],
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
  
  // 2. updateAchievement 로직 수정
  updateAchievement(achievementId: string, progress: number) {
    const data = this.load();
    let achievement: Achievement | undefined = data.achievements.find(a => a.id === achievementId);
    
    // 2a. 로컬 세이브에 업적이 없으면, 기본 업적 목록에서 찾아 추가
    if (!achievement) {
      const baseAchievement = ACHIEVEMENTS.find(a => a.id === achievementId);
      if (baseAchievement) {
        // 기본 데이터를 복사하되, progress와 unlocked는 0/false로 초기화
        achievement = { 
          ...baseAchievement, 
          progress: 0, 
          unlocked: false 
        };
        data.achievements.push(achievement);
      } else {
        // ACHIEVEMENTS 배열에도 없는 업적 ID라면 무시
        console.warn(`Attempted to update undefined achievement: ${achievementId}`);
        return;
      }
    }

    // 2b. 이미 달성한 업적은 갱신하지 않음
    if (achievement.unlocked) return; 

    // 2c. 진행도 업데이트
    achievement.progress = progress;
    
    // 2d. 달성 여부 체크
    if (progress >= achievement.target && !achievement.unlocked) {
      achievement.unlocked = true;
      console.log(`Achievement unlocked: ${achievement.name}`);
      alert(`업적 달성: ${achievement.name}`);
      // TODO: 업적 달성 알림 UI 표시
    }
    
    // 2e. 로컬에 저장
    this.save(data);
    
    // 2f. DB에 저장
    databaseService.updateUserAchievement(achievement)
      .catch(err => console.error("DB Achievement update failed:", err));
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