// src/data/achievements.ts
import { Achievement } from '../types/game';

export type AchievementCategory =
  | 'wave'
  | 'combat'
  | 'economy'
  | 'collect'
  | 'growth'
  | 'synergy'
  | 'challenge'
  | 'multi';

export interface AchievementWithCategory extends Achievement {
  category: AchievementCategory;
}

// ─── 포켓몬 18타입 목록 ───────────────────────────────────────────────────────
const ALL_TYPES: Array<{ key: string; nameKo: string; icon: string }> = [
  { key: 'normal',   nameKo: '노말',    icon: '⬜' },
  { key: 'fire',     nameKo: '불꽃',    icon: '🔥' },
  { key: 'water',    nameKo: '물',      icon: '💧' },
  { key: 'electric', nameKo: '전기',    icon: '⚡' },
  { key: 'grass',    nameKo: '풀',      icon: '🌿' },
  { key: 'ice',      nameKo: '얼음',    icon: '❄️' },
  { key: 'fighting', nameKo: '격투',    icon: '🥊' },
  { key: 'poison',   nameKo: '독',      icon: '☠️' },
  { key: 'ground',   nameKo: '땅',      icon: '🌍' },
  { key: 'flying',   nameKo: '비행',    icon: '🦅' },
  { key: 'psychic',  nameKo: '에스퍼',  icon: '🔮' },
  { key: 'bug',      nameKo: '벌레',    icon: '🐛' },
  { key: 'rock',     nameKo: '바위',    icon: '🪨' },
  { key: 'ghost',    nameKo: '고스트',  icon: '👻' },
  { key: 'dragon',   nameKo: '드래곤',  icon: '🐉' },
  { key: 'dark',     nameKo: '악',      icon: '🌑' },
  { key: 'steel',    nameKo: '강철',    icon: '⚙️' },
  { key: 'fairy',    nameKo: '페어리',  icon: '🌸' },
];

// 타입별 시너지 업적 생성 (2단계/4단계/6단계 × 18타입 = 54개)
const typeSynergyAchievements: AchievementWithCategory[] = ALL_TYPES.flatMap(t => [
  {
    id: `syn_type_${t.key}_2`,
    name: `${t.nameKo} 시너지 Lv.1`,
    description: `${t.nameKo} 타입 포켓몬 2마리 배치`,
    icon: t.icon,
    category: 'synergy' as AchievementCategory,
    condition: `synergy_type_${t.key}_2`,
    progress: 0, target: 1, unlocked: false, reward: 150,
  },
  {
    id: `syn_type_${t.key}_4`,
    name: `${t.nameKo} 시너지 Lv.2`,
    description: `${t.nameKo} 타입 포켓몬 4마리 배치`,
    icon: t.icon,
    category: 'synergy' as AchievementCategory,
    condition: `synergy_type_${t.key}_4`,
    progress: 0, target: 1, unlocked: false, reward: 500,
  },
  {
    id: `syn_type_${t.key}_6`,
    name: `${t.nameKo} 군단`,
    description: `${t.nameKo} 타입 포켓몬 6마리 배치 (시너지 최대)`,
    icon: t.icon,
    category: 'synergy' as AchievementCategory,
    condition: `synergy_type_${t.key}_6`,
    progress: 0, target: 1, unlocked: false, reward: 2000,
    hidden: false,
  },
]);

// 세대별 시너지 업적 생성 (2단계/4단계/6단계 × 9세대 = 27개)
const GEN_NAMES: Record<number, string> = {
  1: '1세대(관동)', 2: '2세대(성도)', 3: '3세대(호연)',
  4: '4세대(신오)', 5: '5세대(하나)', 6: '6세대(칼로스)',
  7: '7세대(알로라)', 8: '8세대(가라르)', 9: '9세대(팔데아)',
};
const GEN_ICONS: Record<number, string> = {
  1:'🕹️', 2:'🌟', 3:'🌊', 4:'💎', 5:'🦸', 6:'🗼', 7:'🌺', 8:'👑', 9:'🌐',
};

const genSynergyAchievements: AchievementWithCategory[] = Array.from({ length: 9 }, (_, i) => i + 1).flatMap(gen => [
  {
    id: `syn_gen_${gen}_2`,
    name: `${GEN_NAMES[gen]} 시너지 Lv.1`,
    description: `${gen}세대 포켓몬 2마리 배치`,
    icon: GEN_ICONS[gen],
    category: 'synergy' as AchievementCategory,
    condition: `synergy_gen_${gen}_2`,
    progress: 0, target: 1, unlocked: false, reward: 150,
  },
  {
    id: `syn_gen_${gen}_4`,
    name: `${GEN_NAMES[gen]} 시너지 Lv.2`,
    description: `${gen}세대 포켓몬 4마리 배치`,
    icon: GEN_ICONS[gen],
    category: 'synergy' as AchievementCategory,
    condition: `synergy_gen_${gen}_4`,
    progress: 0, target: 1, unlocked: false, reward: 500,
  },
  {
    id: `syn_gen_${gen}_6`,
    name: `${GEN_NAMES[gen]} 올스타`,
    description: `${gen}세대 포켓몬 6마리 배치 (세대 시너지 최대)`,
    icon: GEN_ICONS[gen],
    category: 'synergy' as AchievementCategory,
    condition: `synergy_gen_${gen}_6`,
    progress: 0, target: 1, unlocked: false, reward: 2000,
  },
]);

// ─── 고정 업적 목록 ───────────────────────────────────────────────────────────
const fixedAchievements: AchievementWithCategory[] = [

  // 🌊 진행
  { id: 'wave5',  name: '첫 걸음',   description: '웨이브 5 도달',       icon: '🌱', category: 'wave', condition: 'wave', progress: 0, target: 5,  unlocked: false, reward: 100 },
  { id: 'wave10', name: '초보 탈출', description: '웨이브 10 도달',      icon: '🌿', category: 'wave', condition: 'wave', progress: 0, target: 10, unlocked: false, reward: 200 },
  { id: 'wave20', name: '중급자',    description: '웨이브 20 도달',      icon: '🌳', category: 'wave', condition: 'wave', progress: 0, target: 20, unlocked: false, reward: 500 },
  { id: 'wave30', name: '고급자',    description: '웨이브 30 도달',      icon: '🏆', category: 'wave', condition: 'wave', progress: 0, target: 30, unlocked: false, reward: 1000 },
  { id: 'wave50', name: '마스터',    description: '웨이브 50 클리어!',   icon: '👑', category: 'wave', condition: 'wave', progress: 0, target: 50, unlocked: false, reward: 5000 },

  // ⚔️ 전투
  { id: 'kill100',  name: '사냥꾼',    description: '적 100마리 처치',  icon: '⚔️', category: 'combat', condition: 'kills', progress: 0, target: 100,  unlocked: false, reward: 200 },
  { id: 'kill500',  name: '베테랑',    description: '적 500마리 처치',  icon: '🗡️', category: 'combat', condition: 'kills', progress: 0, target: 500,  unlocked: false, reward: 800 },
  { id: 'kill1000', name: '학살자',    description: '적 1000마리 처치', icon: '💀', category: 'combat', condition: 'kills', progress: 0, target: 1000, unlocked: false, reward: 2000 },
  { id: 'kill5000', name: '전쟁의 신', description: '적 5000마리 처치', icon: '☠️', category: 'combat', condition: 'kills', progress: 0, target: 5000, unlocked: false, reward: 8000, hidden: true },
  { id: 'boss5',    name: '보스 헌터', description: '보스 5마리 처치',  icon: '🎯', category: 'combat', condition: 'boss',  progress: 0, target: 5,    unlocked: false, reward: 300 },
  { id: 'boss20',   name: '보스 킬러', description: '보스 20마리 처치', icon: '🔥', category: 'combat', condition: 'boss',  progress: 0, target: 20,   unlocked: false, reward: 1500 },
  { id: 'boss50',   name: '보스 학살자',description: '보스 50마리 처치',icon: '💥', category: 'combat', condition: 'boss',  progress: 0, target: 50,   unlocked: false, reward: 5000, hidden: true },

  // 💰 경제
  { id: 'money10k',  name: '부자',        description: '총 10,000원 획득',  icon: '💰', category: 'economy', condition: 'money', progress: 0, target: 10000,  unlocked: false, reward: 500 },
  { id: 'money100k', name: '재벌',        description: '총 100,000원 획득', icon: '💎', category: 'economy', condition: 'money', progress: 0, target: 100000, unlocked: false, reward: 5000 },
  { id: 'money500k', name: '억만장자',    description: '총 500,000원 획득', icon: '🤑', category: 'economy', condition: 'money', progress: 0, target: 500000, unlocked: false, reward: 20000, hidden: true },
  { id: 'sell10',    name: '거래의 달인', description: '포켓몬 10마리 판매',icon: '🏪', category: 'economy', condition: 'sell',  progress: 0, target: 10,     unlocked: false, reward: 300 },
  { id: 'sell50',    name: '포켓몬 브로커',description: '포켓몬 50마리 판매',icon: '📈', category: 'economy', condition: 'sell',  progress: 0, target: 50,     unlocked: false, reward: 1000 },

  // 📚 수집
  { id: 'collect10',  name: '수집가',        description: '포켓몬 10종 수집',  icon: '📖', category: 'collect', condition: 'collect', progress: 0, target: 10,  unlocked: false, reward: 150 },
  { id: 'collect50',  name: '포켓몬 박사',   description: '포켓몬 50종 수집',  icon: '🔬', category: 'collect', condition: 'collect', progress: 0, target: 50,  unlocked: false, reward: 1000 },
  { id: 'collect100', name: '포켓몬 마스터', description: '포켓몬 100종 수집', icon: '⭐', category: 'collect', condition: 'collect', progress: 0, target: 100, unlocked: false, reward: 5000 },
  { id: 'collect200', name: '도감 반 완성',  description: '포켓몬 200종 수집', icon: '🌟', category: 'collect', condition: 'collect', progress: 0, target: 200, unlocked: false, reward: 15000 },
  { id: 'collect500', name: '살아있는 도감', description: '포켓몬 500종 수집', icon: '📕', category: 'collect', condition: 'collect', progress: 0, target: 500, unlocked: false, reward: 50000, hidden: true },
  { id: 'allstarters', name: '스타터 마스터', description: '이상해씨, 파이리, 꼬부기 모두 수집', icon: '🔰', category: 'collect', condition: 'starters', progress: 0, target: 1, unlocked: false, reward: 500 },
  { id: 'legendary',   name: '전설의 트레이너', description: '전설 포켓몬 수집', icon: '✨', category: 'collect', condition: 'legendary', progress: 0, target: 1, unlocked: false, reward: 10000, hidden: true },

  // 🧬 성장
  { id: 'evolve1',   name: '첫 진화',      description: '포켓몬 1마리 진화',         icon: '🦋', category: 'growth', condition: 'evolve',      progress: 0, target: 1,  unlocked: false, reward: 100 },
  { id: 'evolve10',  name: '진화 마니아',  description: '포켓몬 10마리 진화',        icon: '🌟', category: 'growth', condition: 'evolve',      progress: 0, target: 10, unlocked: false, reward: 500 },
  { id: 'evolve50',  name: '진화의 달인',  description: '포켓몬 50마리 진화',        icon: '🔮', category: 'growth', condition: 'evolve',      progress: 0, target: 50, unlocked: false, reward: 3000 },
  { id: 'mega1',     name: '메가진화!',    description: '메가진화 1회 달성',         icon: '💫', category: 'growth', condition: 'mega',        progress: 0, target: 1,  unlocked: false, reward: 500 },
  { id: 'mega5',     name: '메가 파워',    description: '메가진화 5회 달성',         icon: '🌠', category: 'growth', condition: 'mega',        progress: 0, target: 5,  unlocked: false, reward: 2000 },
  { id: 'gigamax1',  name: '거다이맥스!',  description: '거다이맥스 1회 달성',       icon: '⚡', category: 'growth', condition: 'gigamax',     progress: 0, target: 1,  unlocked: false, reward: 500 },
  { id: 'fusion1',   name: '신화의 합체',  description: '포켓몬 합체 1회 달성',      icon: '🔗', category: 'growth', condition: 'fusion',      progress: 0, target: 1,  unlocked: false, reward: 1000 },
  { id: 'level100',  name: '레벨 100!',    description: '포켓몬을 레벨 100으로 성장', icon: '💯', category: 'growth', condition: 'level100',    progress: 0, target: 1,  unlocked: false, reward: 3000 },
  { id: 'max_team',  name: '최강 전대',    description: '포켓몬 6마리 모두 레벨 50+', icon: '🤝', category: 'growth', condition: 'team_level50', progress: 0, target: 1, unlocked: false, reward: 5000 },

  // 🔥 시너지 (공통 - 타입/세대 무관)
  { id: 'synergy_multi3', name: '복합 전략가', description: '시너지 3가지 동시 활성화', icon: '🧩', category: 'synergy', condition: 'synergy_multi', progress: 0, target: 3, unlocked: false, reward: 1500 },
  { id: 'synergy_multi5', name: '시너지 마스터', description: '시너지 5가지 동시 활성화', icon: '🎭', category: 'synergy', condition: 'synergy_multi', progress: 0, target: 5, unlocked: false, reward: 5000, hidden: true },

  // 🎯 도전
  { id: 'perfect',      name: '완벽한 방어',  description: '라이프 손실 없이 웨이브 10 클리어',    icon: '🛡️', category: 'challenge', condition: 'perfect10',   progress: 0, target: 1, unlocked: false, reward: 1000 },
  { id: 'speedrun',     name: '스피드러너',   description: '웨이브 20을 30분 안에 클리어',         icon: '⚡',  category: 'challenge', condition: 'speedrun',    progress: 0, target: 1, unlocked: false, reward: 2000, hidden: true },
  { id: 'nolosses',     name: '불패신화',     description: '포켓몬 기절 없이 웨이브 30 도달',      icon: '🏅',  category: 'challenge', condition: 'noloss30',    progress: 0, target: 1, unlocked: false, reward: 3000, hidden: true },
  { id: 'hard_clear',   name: '도전자',       description: 'Hard 난이도 웨이브 30 클리어',         icon: '💪',  category: 'challenge', condition: 'hard_clear',  progress: 0, target: 1, unlocked: false, reward: 3000 },
  { id: 'expert_clear', name: '전문가',       description: 'Expert 난이도 웨이브 30 클리어',       icon: '🔱',  category: 'challenge', condition: 'expert_clear',progress: 0, target: 1, unlocked: false, reward: 8000, hidden: true },
  { id: 'all_maps',     name: '탐험가',       description: '모든 맵에서 웨이브 20 이상 도달',      icon: '🗺️',  category: 'challenge', condition: 'all_maps',    progress: 0, target: 1, unlocked: false, reward: 5000 },
  { id: 'speed50',      name: '50파 스피드런',description: '웨이브 50을 60분 안에 클리어',         icon: '🚀',  category: 'challenge', condition: 'speed50',     progress: 0, target: 1, unlocked: false, reward: 10000, hidden: true },

  // 👥 멀티플레이
  { id: 'multi_first_win', name: '첫 승리',    description: '멀티플레이 첫 승리',   icon: '🏆', category: 'multi', condition: 'multi_win', progress: 0, target: 1,    unlocked: false, reward: 500 },
  { id: 'multi_5wins',     name: '승부사',     description: '멀티플레이 5승',       icon: '🥇', category: 'multi', condition: 'multi_win', progress: 0, target: 5,    unlocked: false, reward: 2000 },
  { id: 'multi_20wins',    name: '지배자',     description: '멀티플레이 20승',      icon: '👑', category: 'multi', condition: 'multi_win', progress: 0, target: 20,   unlocked: false, reward: 8000 },
  { id: 'rating1200',      name: '골드 등급',  description: '레이팅 1200 달성',     icon: '🌟', category: 'multi', condition: 'rating',    progress: 0, target: 1200, unlocked: false, reward: 3000 },
  { id: 'rating1500',      name: '다이아 등급',description: '레이팅 1500 달성',     icon: '💎', category: 'multi', condition: 'rating',    progress: 0, target: 1500, unlocked: false, reward: 10000, hidden: true },
];

// ─── 최종 목록 조합 ───────────────────────────────────────────────────────────
export const ACHIEVEMENTS: AchievementWithCategory[] = [
  ...fixedAchievements,
  ...typeSynergyAchievements,
  ...genSynergyAchievements,
];

// ─── 카테고리 메타데이터 ──────────────────────────────────────────────────────
export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, { label: string; icon: string }> = {
  wave:      { label: '진행',      icon: '🌊' },
  combat:    { label: '전투',      icon: '⚔️' },
  economy:   { label: '경제',      icon: '💰' },
  collect:   { label: '수집',      icon: '📚' },
  growth:    { label: '성장',      icon: '🧬' },
  synergy:   { label: '시너지',    icon: '🔥' },
  challenge: { label: '도전',      icon: '🎯' },
  multi:     { label: '멀티플레이',icon: '👥' },
};