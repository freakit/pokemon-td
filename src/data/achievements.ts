// src/data/achievements.ts

import { Achievement } from '../types/game';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'wave5', name: '첫 걸음', description: '웨이브 5 도달', icon: '🌱', condition: 'wave', progress: 0, target: 5, unlocked: false, reward: 100 },
  { id: 'wave10', name: '초보 탈출', description: '웨이브 10 도달', icon: '🌿', condition: 'wave', progress: 0, target: 10, unlocked: false, reward: 200 },
  { id: 'wave20', name: '중급자', description: '웨이브 20 도달', icon: '🌳', condition: 'wave', progress: 0, target: 20, unlocked: false, reward: 500 },
  { id: 'wave30', name: '고급자', description: '웨이브 30 도달', icon: '🏆', condition: 'wave', progress: 0, target: 30, unlocked: false, reward: 1000 },
  { id: 'wave50', name: '마스터', description: '웨이브 50 도달', icon: '👑', condition: 'wave', progress: 0, target: 50, unlocked: false, reward: 5000 },
  { id: 'collect10', name: '수집가', description: '포켓몬 10마리 수집', icon: '📖', condition: 'collect', progress: 0, target: 10, unlocked: false, reward: 150 },
  { id: 'collect50', name: '포켓몬 박사', description: '포켓몬 50마리 수집', icon: '🔬', condition: 'collect', progress: 0, target: 50, unlocked: false, reward: 1000 },
  { id: 'collect100', name: '포켓몬 마스터', description: '포켓몬 100마리 수집', icon: '⭐', condition: 'collect', progress: 0, target: 100, unlocked: false, reward: 5000 },
  { id: 'evolve1', name: '첫 진화', description: '포켓몬 1마리 진화', icon: '🦋', condition: 'evolve', progress: 0, target: 1, unlocked: false, reward: 100 },
  { id: 'evolve10', name: '진화 마니아', description: '포켓몬 10마리 진화', icon: '🌟', condition: 'evolve', progress: 0, target: 10, unlocked: false, reward: 500 },
  { id: 'kill100', name: '사냥꾼', description: '적 100마리 처치', icon: '⚔️', condition: 'kills', progress: 0, target: 100, unlocked: false, reward: 200 },
  { id: 'kill1000', name: '학살자', description: '적 1000마리 처치', icon: '💀', condition: 'kills', progress: 0, target: 1000, unlocked: false, reward: 2000 },
  { id: 'boss5', name: '보스 헌터', description: '보스 5마리 처치', icon: '🎯', condition: 'boss', progress: 0, target: 5, unlocked: false, reward: 300 },
  { id: 'boss20', name: '보스 킬러', description: '보스 20마리 처치', icon: '🔥', condition: 'boss', progress: 0, target: 20, unlocked: false, reward: 1500 },
  { id: 'money10k', name: '부자', description: '총 10000원 획득', icon: '💰', condition: 'money', progress: 0, target: 10000, unlocked: false, reward: 500 },
  { id: 'money100k', name: '재벌', description: '총 100000원 획득', icon: '💎', condition: 'money', progress: 0, target: 100000, unlocked: false, reward: 5000 },
  { id: 'perfect', name: '완벽한 방어', description: '라이프 손실 없이 웨이브 10 클리어', icon: '🛡️', condition: 'perfect10', progress: 0, target: 1, unlocked: false, reward: 1000 },
  { id: 'speedrun', name: '스피드러너', description: '웨이브 20을 30분 안에 클리어', icon: '⚡', condition: 'speedrun', progress: 0, target: 1, unlocked: false, reward: 2000, hidden: true },
  { id: 'nolosses', name: '불패신화', description: '한 번도 죽지 않고 웨이브 30 도달', icon: '🏅', condition: 'noloss30', progress: 0, target: 1, unlocked: false, reward: 3000, hidden: true },
  { id: 'allstarters', name: '스타터 마스터', description: '이상해씨, 파이리, 꼬부기 모두 수집', icon: '🔰', condition: 'starters', progress: 0, target: 1, unlocked: false, reward: 500 },
  { id: 'legendary', name: '전설의 트레이너', description: '전설 포켓몬 수집', icon: '✨', condition: 'legendary', progress: 0, target: 1, unlocked: false, reward: 10000, hidden: true },
];
