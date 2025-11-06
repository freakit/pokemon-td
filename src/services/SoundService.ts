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

  private constructor() {
    Howler.volume(0.7); // 경고 해결: 글로벌 볼륨 설정
    // 게임 시작 시 BGM 자동 재생
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
    // Howler는 개별 sfx 볼륨을 지원하지 않으므로, 글로벌 볼륨을 조절하거나
    // 재생 시점에 개별 볼륨을 설정해야 합니다. (현재: 개별 설정)
  }
  
  playBGM() {
    // 이미 BGM이 재생 중이면 중단하지 않음 (끊김 없이 계속 재생)
    if (this.currentBGM && this.currentBGM.playing()) {
      return;
    }
    
    // 기존 Howl 인스턴스가 있으면 재사용
    if (this.currentBGM) {
      this.currentBGM.play();
      console.log('BGM 재생 재개');
      return;
    }
    
    const track = '/sounds/dj-pikachu.mp3'; // 모든 맵에서 동일한 BGM
    const bgm = new Howl({
      src: [track],
      volume: this.musicVolume,
      loop: true,
      html5: false, // html5를 false로 설정하여 Web Audio API 사용
    });

    // currentBGM을 먼저 설정하여 중복 재생 방지
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