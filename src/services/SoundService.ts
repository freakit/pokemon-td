// src/services/SoundService.ts

import { Howl, Howler } from 'howler';

class SoundService {
  private static instance: SoundService;
  
  private musicVolume = 0.5;
  private sfxVolume = 0.7;
  
  private currentBGM: Howl | null = null;
  
  // (예시 경로입니다. 실제 파일이 /public/sounds/.. 에 있어야 합니다)
  private sfxMap: Record<string, string> = {
    'attack_fire': '/sounds/sfx/attack_fire.wav',
    'attack_water': '/sounds/sfx/attack_water.wav',
    'evolution': '/sounds/sfx/evolution.wav',
    'victory': '/sounds/sfx/victory.wav',
    'defeat': '/sounds/sfx/defeat.wav',
  };

  private bgmMap: Record<string, string> = {
    'grass': '/sounds/bgm/bgm_grass.mp3',
    'desert': '/sounds/bgm/bgm_desert.mp3',
    'cave': '/sounds/bgm/bgm_cave.mp3',
  };

  private constructor() {
    Howler.volume(0.7); // 경고 해결: 글로벌 볼륨 설정
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
    // Howler는 개별 sfx 볼륨을 지원하지 않으므로, 글로벌 볼륨을 조절하거나
    // 재생 시점에 개별 볼륨을 설정해야 합니다. (현재: 개별 설정)
  }
  
  playBGM(mapType: string) {
    this.stopBGM();
    
    const track = this.bgmMap[mapType] || this.bgmMap['grass'];
    if (!track) return;

    const bgm = new Howl({
      src: [track],
      volume: this.musicVolume,
      loop: true,
      html5: true,
    });
    
    bgm.play();
    this.currentBGM = bgm;
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
        volume: this.sfxVolume, // 개별 볼륨 적용
      });
      sfx.play();
    } else {
      console.log(`(SFX: ${soundName})`); // 맵핑 안된 사운드
    }
  }
  
  playAttackSound(type: string) {
    this.playSFX(`attack_${type}`);
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