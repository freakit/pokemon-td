// src/services/SoundService.ts

import { Howl, Howler } from 'howler';

class SoundService {
  private static instance: SoundService;
  
  private musicVolume = 0.5;
  private sfxVolume = 0.7;
  
  private currentBGM: Howl | null = null;
  
  // 공격 사운드는 제거됨 — 투사체가 타입 아이콘으로 대체
  private sfxMap: Record<string, string> = {
    'evolution': '/sounds/sfx/evolution.wav',
    'victory': '/sounds/sfx/victory.wav',
    'defeat': '/sounds/sfx/defeat.wav',
  };

  private constructor() {
    Howler.volume(0.7);
    this.playBGM();
  }
  
  static getInstance() {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }
  
  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.currentBGM) {
      this.currentBGM.volume(this.musicVolume);
    }
  }
  
  setSFXVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }
  
  playBGM() {
    if (this.currentBGM && this.currentBGM.playing()) {
      return;
    }
    
    if (this.currentBGM) {
      this.currentBGM.play();
      console.log('BGM 재생 재개');
      return;
    }
    
    const track = '/sounds/dj-pikachu.m4a';
    const bgm = new Howl({
      src: [track],
      volume: this.musicVolume,
      loop: true,
      html5: false,
    });

    this.currentBGM = bgm;
    const playId = bgm.play();
    console.log('BGM 재생 시도:', track, 'Play ID:', playId);
  }
  
  stopBGM() {
    if (this.currentBGM) {
      this.currentBGM.stop();
      this.currentBGM.unload();
      this.currentBGM = null;
    }
  }
  
  playSFX(soundName: string) {
    const track = this.sfxMap[soundName];
    if (track) {
      const sfx = new Howl({
        src: [track],
        volume: this.sfxVolume,
      });
      sfx.play();
    }
  }

  // 공격 사운드는 타입 아이콘 투사체로 대체되어 no-op 처리
  playAttackSound(_type: string) {
    // 사운드 없음 — 투사체가 타입 아이콘 GIF로 시각적 피드백 제공
  }
  
  playEvolutionSound() {
    this.playSFX('evolution');
  }
  
  playVictorySound() {
    this.playSFX('victory');
  }
  
  playDefeatSound() {
    this.playSFX('defeat');
  }
}

export const soundService = SoundService.getInstance();