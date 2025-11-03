// src/data/evolution.ts

export interface EvolutionData {
  from: number;
  to: number;
  level?: number; // 레벨 진화 시 필요
  item?: string; // 진화의 돌 or 연결의 끈
}

export const EVOLUTION_CHAINS: EvolutionData[] = [
  // 1세대 레벨 진화
  { from: 1, to: 2, level: 16 }, { from: 2, to: 3, level: 32 },
  { from: 4, to: 5, level: 16 }, { from: 5, to: 6, level: 36 },
  { from: 7, to: 8, level: 16 }, { from: 8, to: 9, level: 36 },
  { from: 10, to: 11, level: 7 }, { from: 11, to: 12, level: 10 },
  { from: 13, to: 14, level: 7 }, { from: 14, to: 15, level: 10 },
  { from: 16, to: 17, level: 18 }, { from: 17, to: 18, level: 36 },
  { from: 19, to: 20, level: 20 }, { from: 21, to: 22, level: 20 },
  { from: 23, to: 24, level: 22 }, 
  { from: 27, to: 28, level: 22 }, { from: 29, to: 30, level: 16 },
  { from: 32, to: 33, level: 16 }, { from: 41, to: 42, level: 22 },
  { from: 43, to: 44, level: 21 },
  { from: 46, to: 47, level: 24 },
  { from: 48, to: 49, level: 31 }, { from: 50, to: 51, level: 26 },
  { from: 52, to: 53, level: 28 }, { from: 54, to: 55, level: 33 },
  { from: 56, to: 57, level: 28 }, { from: 60, to: 61, level: 25 },
  { from: 63, to: 64, level: 16 },
  { from: 66, to: 67, level: 28 },
  { from: 69, to: 70, level: 21 },
  { from: 72, to: 73, level: 30 }, { from: 74, to: 75, level: 25 },
  { from: 75, to: 76, level: 36 }, { from: 77, to: 78, level: 40 },
  { from: 79, to: 80, level: 37 }, { from: 81, to: 82, level: 30 },
  { from: 84, to: 85, level: 31 }, { from: 86, to: 87, level: 34 },
  { from: 88, to: 89, level: 38 }, { from: 92, to: 93, level: 25 },
  { from: 96, to: 97, level: 26 },
  { from: 98, to: 99, level: 28 }, { from: 100, to: 101, level: 30 },
  { from: 104, to: 105, level: 28 }, { from: 109, to: 110, level: 35 },
  { from: 111, to: 112, level: 42 }, { from: 116, to: 117, level: 32 },
  { from: 118, to: 119, level: 33 }, { from: 129, to: 130, level: 20 },
  { from: 138, to: 139, level: 40 }, { from: 140, to: 141, level: 40 },
  { from: 147, to: 148, level: 30 }, { from: 148, to: 149, level: 55 },
  
  // 1세대 통신 교환 진화 → 연결의 끈
  { from: 64, to: 65, item: 'linking-cord' }, // 윤겔라 → 후딘
  { from: 67, to: 68, item: 'linking-cord' }, // 근육몬 → 괴력몬
  { from: 93, to: 94, item: 'linking-cord' }, // 고우스트 → 팬텀
  
  // 1세대 진화의 돌 진화
  { from: 25, to: 26, item: 'thunder-stone' }, // 피카츄 -> 라이츄
  { from: 30, to: 31, item: 'moon-stone' }, // 니드리나 -> 니드퀸
  { from: 33, to: 34, item: 'moon-stone' }, // 니드리노 -> 니드킹
  { from: 35, to: 36, item: 'moon-stone' }, // 삐삐 -> 픽시
  { from: 37, to: 38, item: 'fire-stone' }, // 식스테일 -> 나인테일
  { from: 39, to: 40, item: 'moon-stone' }, // 푸린 -> 푸크린
  { from: 44, to: 45, item: 'leaf-stone' }, // 냄새꼬 -> 라플레시아 (중복 제거)
  { from: 58, to: 59, item: 'fire-stone' }, // 가디 -> 윈디
  { from: 61, to: 62, item: 'water-stone' }, // 슈륙챙이 -> 강챙이
  { from: 70, to: 71, item: 'leaf-stone' }, // 우츠동 -> 우츠보트
  { from: 90, to: 91, item: 'water-stone' }, // 셀러 -> 파르셀
  { from: 102, to: 103, item: 'leaf-stone' }, // 아라리 -> 나시
  { from: 120, to: 121, item: 'water-stone' }, // 별가사리 -> 아쿠스타
  { from: 133, to: 134, item: 'water-stone' }, // 이브이 -> 샤미드
  { from: 133, to: 135, item: 'thunder-stone' }, // 이브이 -> 쥬피썬더
  { from: 133, to: 136, item: 'fire-stone' }, // 이브이 -> 부스터
];

export function canEvolve(pokemonId: number, level: number): EvolutionData | null {
  const evolution = EVOLUTION_CHAINS.find(e => e.from === pokemonId);
  if (!evolution) return null;
  // 레벨 진화: level이 있고 item이 없으며, 현재 레벨이 진화 레벨 이상
  if (evolution.level && !evolution.item && level >= evolution.level) return evolution;
  return null;
}

// 아이템(돌)으로 진화 가능한지 확인
export function canEvolveWithItem(pokemonId: number, item: string): EvolutionData | null {
  const evolution = EVOLUTION_CHAINS.find(e => e.from === pokemonId && e.item === item);
  return evolution || null;
}

// 특정 아이템으로 진화 가능한 포켓몬 ID 목록 가져오기
export function getEvolvableWithItem(item: string): number[] {
  return EVOLUTION_CHAINS
    .filter(e => e.item === item)
    .map(e => e.from);
}

export const EVOLUTION_STAT_BOOST = {
  hp: 1.35, attack: 1.35, defense: 1.3,
  specialAttack: 1.35, specialDefense: 1.3, speed: 1.25,
};

// 레어도 타입
export type Rarity = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Master' | 'Legend';

// 최종 진화체인지 확인
export function isFinalEvolution(pokemonId: number): boolean {
  // 이 포켓몬이 다른 포켓몬의 'from'에 해당하지 않으면 최종 진화체
  return !EVOLUTION_CHAINS.some(e => e.from === pokemonId);
}

// 최종 진화체 ID 가져오기
export function getFinalEvolutionId(pokemonId: number): number {
  const evolution = EVOLUTION_CHAINS.find(e => e.from === pokemonId);
  if (!evolution) return pokemonId; // 이미 최종 진화체
  return getFinalEvolutionId(evolution.to); // 재귀적으로 탐색
}

// 종족값 총합으로 레어도 계산
export function calculateRarity(statTotal: number): Rarity {
  if (statTotal < 450) return 'Bronze';
  if (statTotal < 500) return 'Silver';
  if (statTotal < 550) return 'Gold';
  if (statTotal < 600) return 'Diamond';
  if (statTotal < 650) return 'Master';
  return 'Legend';
}

// 레어도별 가중치 (역수 관계 - 낮은 가중치 = 낮은 확률)
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  'Bronze': 100,   // 가장 높은 확률
  'Silver': 50,
  'Gold': 25,
  'Diamond': 12,
  'Master': 6,
  'Legend': 3,     // 가장 낮은 확률
};

// 레어도별 색상
export const RARITY_COLORS: Record<Rarity, string> = {
  'Bronze': '#cd7f32',
  'Silver': '#c0c0c0',
  'Gold': '#ffd700',
  'Diamond': '#b9f2ff',
  'Master': '#e040fb',
  'Legend': '#ff6b00',
};