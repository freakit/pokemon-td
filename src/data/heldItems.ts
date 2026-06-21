// src/data/heldItems.ts
// 프렌들리숍(잉여 타일) 전용 지닌 도구. 평소 상점엔 없고, 점원 타워의 숍 등급으로 해금된다.
// 효과는 우리 게임의 기존 시스템(상성·크리·평타반복·HP)에 훅이 걸리는 것만 채택.

export interface HeldItemDef {
  id: string;
  name: string;     // 한글 표기
  icon: string;     // 이모지(캔버스/모달 공용)
  grade: 1 | 2 | 3; // 숍 등급(누적 점유 웨이브로 해금)
  cost: number;     // 포켓달러
  desc: string;     // 효과 설명
}

export const HELD_ITEMS: HeldItemDef[] = [
  // ── Lv1: 유지/생존 ──────────────────────────────────────────────
  { id: 'leftovers',    name: '먹다남은음식', icon: '🍖', grade: 1, cost: 180, desc: '전투 중 매초 최대 HP의 일부를 회복' },
  { id: 'shell-bell',   name: '조개껍질방울', icon: '🐚', grade: 1, cost: 200, desc: '준 데미지의 12.5%만큼 HP 흡혈' },
  { id: 'sitrus-berry', name: '자뭉열매',     icon: '🍒', grade: 1, cost: 150, desc: 'HP 50% 이하로 떨어지면 25% 회복(1회 소모)' },
  // ── Lv2: 스탯/딜 강화 ───────────────────────────────────────────
  { id: 'eviolite',     name: '진화의휘석',   icon: '💠', grade: 2, cost: 320, desc: '방어·특방 ×1.5 (피격 피해 감소)' },
  { id: 'muscle-band',  name: '근육밴드',     icon: '🥊', grade: 2, cost: 300, desc: '물리 기술 위력 ×1.1' },
  { id: 'wise-glasses', name: '신비의구슬',   icon: '👓', grade: 2, cost: 300, desc: '특수 기술 위력 ×1.1' },
  { id: 'life-orb',     name: '생명의구슬',   icon: '🔴', grade: 2, cost: 450, desc: '전 기술 ×1.3, 단 공격마다 최대 HP 5% 소모' },
  // ── Lv3: TD 네이티브(우리 시스템 직결) ──────────────────────────
  { id: 'expert-belt',     name: '달인의띠',  icon: '🎯', grade: 3, cost: 550, desc: '효과가 굉장한(상성 우위) 기술 위력 ×1.2' },
  { id: 'metronome',       name: '메트로놈',  icon: '🌀', grade: 3, cost: 600, desc: '연속 공격 시 위력 누적(+20%씩, 최대 ×2.0)' },
  { id: 'scope-lens',      name: '초점렌즈',  icon: '🔍', grade: 3, cost: 500, desc: '크리티컬 확률 +15%' },
  { id: 'weakness-policy', name: '약점보험',  icon: '🛡️', grade: 3, cost: 650, desc: '효과가 굉장한 공격을 맞으면 공격·특공 ×1.5(1회 소모)' },
];

export const getHeldItem = (id?: string): HeldItemDef | undefined =>
  id ? HELD_ITEMS.find(h => h.id === id) : undefined;

// 점원 누적 점유 웨이브 → 숍 등급(1~3). 오래 둘수록 백화점화.
export const shopGradeFromWaves = (waves: number): 1 | 2 | 3 =>
  waves >= 6 ? 3 : waves >= 3 ? 2 : 1;

// 해당 등급에서 구매 가능한(등급 이하) 도구 목록
export const buyableHeldItems = (grade: number): HeldItemDef[] =>
  HELD_ITEMS.filter(h => h.grade <= grade);

// ── 전투 효과 헬퍼 (GameManager에서 사용) ──────────────────────────
/** 공격 데미지 배율 (단일 장착이므로 합산 없이 그 도구 효과만) */
export function heldDamageMultiplier(
  id: string | undefined,
  superEffective: boolean,
  damageClass: string,
  metroStack = 0
): number {
  switch (id) {
    case 'life-orb':    return 1.3;
    case 'expert-belt': return superEffective ? 1.2 : 1.0;
    case 'muscle-band': return damageClass === 'physical' ? 1.1 : 1.0;
    case 'wise-glasses':return damageClass === 'special' ? 1.1 : 1.0;
    case 'metronome':   return Math.min(2.0, 1 + 0.2 * metroStack);
    default:            return 1.0;
  }
}
export const heldCritBonus = (id?: string) => (id === 'scope-lens' ? 0.15 : 0);
export const heldLifesteal = (id?: string) => (id === 'shell-bell' ? 0.125 : 0);
export const heldDefenseMultiplier = (id?: string) => (id === 'eviolite' ? 1.5 : 1.0);
/** 생명의구슬 공격당 HP 소모 비율(최대 HP 대비) */
export const heldRecoilRatio = (id?: string) => (id === 'life-orb' ? 0.05 : 0);
/** 먹다남은음식 초당 회복 비율(최대 HP 대비) */
export const heldRegenPerSec = (id?: string) => (id === 'leftovers' ? 0.04 : 0);
