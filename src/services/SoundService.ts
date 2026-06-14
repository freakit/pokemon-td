// src/services/SoundService.ts

import { Howl, Howler } from 'howler';
import { saveService } from './SaveService';

class SoundService {
  private static instance: SoundService;
  
  private musicVolume = 0.5;
  private currentBGM: Howl | null = null;

  private constructor() {
    const settings = saveService.load().settings;
    this.musicVolume = settings.musicVolume;
    
    Howler.volume(1.0);
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
}

export const soundService = SoundService.getInstance();