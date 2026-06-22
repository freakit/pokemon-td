// src/data/heldItems.ts
// 프렌들리숍(잉여 타일) 전용 지닌 도구. 포켓몬에게 알바를 시켜(숍 타일에 올려) 누적 근무 웨이브로 등급을 해금한다.
// 설계 원칙: 효과는 어디까지나 '부가적' — 수치를 낮게(유나이트 % 버프 ~7.5% 수준 참고).
// 등급: Lv1=일회성 열매 / Lv2=딜 증가(영속) / Lv3=피흡·고급(비싸다).

export interface HeldItemDef {
  id: string;
  name: string;
  icon: string;
  grade: 1 | 2 | 3;
  cost: number;
  desc: string;
  consumable?: boolean; // 1회 소모성(열매)
}

export const HELD_ITEMS: HeldItemDef[] = [
  // ── Lv1: 일회성 열매 (싸다) ──────────────────────────────────────
  { id: 'sitrus-berry', name: '자뭉열매', icon: '🍒', grade: 1, cost: 100, consumable: true, desc: 'HP 50% 이하로 떨어지면 20% 회복(1회)' },
  { id: 'liechi-berry', name: '리샘열매', icon: '🔴', grade: 1, cost: 120, consumable: true, desc: '다음 공격 1회의 위력 ×1.5(1회)' },
  { id: 'enigma-berry', name: '한카포열매', icon: '🟣', grade: 1, cost: 130, consumable: true, desc: '효과가 굉장한 공격을 맞으면 HP 25% 회복(1회)' },
  // ── Lv2: 딜 증가(영속) ───────────────────────────────────────────
  { id: 'muscle-band',  name: '근육밴드',   icon: '🥊', grade: 2, cost: 320, desc: '물리 기술 위력 ×1.06' },
  { id: 'wise-glasses', name: '신비의구슬', icon: '👓', grade: 2, cost: 320, desc: '특수 기술 위력 ×1.06' },
  { id: 'expert-belt',  name: '달인의띠',   icon: '🎯', grade: 2, cost: 400, desc: '효과가 굉장한(상성 우위) 기술 위력 ×1.1' },
  { id: 'scope-lens',   name: '초점렌즈',   icon: '🔍', grade: 2, cost: 380, desc: '크리티컬 확률 +8%' },
  // ── Lv3: 피흡·고급 (비싸다) ──────────────────────────────────────
  { id: 'shell-bell',   name: '조개껍질방울', icon: '🐚', grade: 3, cost: 650, desc: '준 데미지의 8%만큼 HP 흡혈' },
  { id: 'leftovers',    name: '먹다남은음식', icon: '🍖', grade: 3, cost: 600, desc: '전투 중 매초 최대 HP 2% 회복' },
  { id: 'life-orb',     name: '생명의구슬',   icon: '💉', grade: 3, cost: 900, desc: '전 기술 위력 ×1.12, 단 공격마다 최대 HP 4% 소모' },
];

export const getHeldItem = (id?: string): HeldItemDef | undefined =>
  id ? HELD_ITEMS.find(h => h.id === id) : undefined;

// 누적 알바(근무) 웨이브 → 상점 등급(0~3). 0=아직 준비 중(이용 불가), 5/10/15 → Lv1/2/3.
export const shopTier = (waves: number): 0 | 1 | 2 | 3 =>
  waves >= 15 ? 3 : waves >= 10 ? 2 : waves >= 5 ? 1 : 0;

// 다음 등급 해금까지 남은 웨이브 (등급3이면 0)
export const wavesToNextTier = (waves: number): number => {
  const next = waves < 5 ? 5 : waves < 10 ? 10 : waves < 15 ? 15 : null;
  return next === null ? 0 : next - waves;
};

// 해당 등급에서 구매 가능한(등급 이하) 도구 목록. tier 0이면 빈 배열.
export const buyableHeldItems = (tier: number): HeldItemDef[] =>
  HELD_ITEMS.filter(h => h.grade <= tier);

// 레어도 칸: 근무 누적 웨이브 → 고레어 가중 부스트(조금씩). 5/10/15웨이브 = 약/중/강.
export const rarityBoostFromWaves = (waves: number): number =>
  waves >= 15 ? 1.5 : waves >= 10 ? 0.8 : waves >= 5 ? 0.3 : 0;

// ── 전투 효과 헬퍼 (GameManager에서 사용) — 수치 전반 하향 ──────────
/** 공격 데미지 배율 (단일 장착) */
export function heldDamageMultiplier(
  id: string | undefined,
  superEffective: boolean,
  damageClass: string
): number {
  switch (id) {
    case 'life-orb':     return 1.12;
    case 'expert-belt':  return superEffective ? 1.1 : 1.0;
    case 'muscle-band':  return damageClass === 'physical' ? 1.06 : 1.0;
    case 'wise-glasses': return damageClass === 'special' ? 1.06 : 1.0;
    default:             return 1.0;
  }
}
export const heldCritBonus = (id?: string) => (id === 'scope-lens' ? 0.08 : 0);
export const heldLifesteal = (id?: string) => (id === 'shell-bell' ? 0.08 : 0);
/** 생명의구슬 공격당 HP 소모 비율(최대 HP 대비) */
export const heldRecoilRatio = (id?: string) => (id === 'life-orb' ? 0.04 : 0);
/** 먹다남은음식 초당 회복 비율(최대 HP 대비) */
export const heldRegenPerSec = (id?: string) => (id === 'leftovers' ? 0.02 : 0);
