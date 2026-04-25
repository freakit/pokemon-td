// src/components/Multiplayer/TFTBattleArena.tsx
// 6x6 TFT 스타일 배틀 — V5 결정론 재설계 + V7 사람 매치 완주 보장 + V8 타이머 안정화
// ──────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { multiplayerService } from '../../services/MultiplayerService';
import { TowerDetail, PvPBattleResult } from '../../types/multiplayer';
import { getTypeEffectiveness } from '../../utils/typeEffectiveness';
import { calculateActiveSynergies, getBuffedStats } from '../../utils/synergyManager';
import { GamePokemon, Synergy } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { useTranslation } from '../../i18n';

const COLS = 6;
const ROWS = 6;
const CELL = 88;
const ATTACK_RANGE = 1.4;
const MOVE_SPEED = 1.0;
const ATK_COOLDOWN = 1.3;
const FPS = 30;
const TICK_MS = 1000 / FPS;

const PREP_TIME = 30;
const REVEAL_TIME = 5;

const MAX_CATCHUP_TICKS = FPS * 10;

const floatUp = keyframes`0%{opacity:0;transform:translateX(-50%) translateY(10px);}20%{opacity:1;transform:translateX(-50%) translateY(0);}100%{opacity:0;transform:translateX(-50%) translateY(-50px);}`;
const hitFlash = keyframes`0%,100%{filter:brightness(1);}50%{filter:brightness(2.5) saturate(0);}`;
const atkBounce = keyframes`0%,100%{transform:scale(1);}50%{transform:scale(1.25);}`;
const revealPulse = keyframes`0%,100%{opacity:0.8;transform:scale(0.95);}50%{opacity:1;transform:scale(1.05);}`;
const benchPulse = keyframes`0%,100%{box-shadow:0 0 0px rgba(74,222,128,0);}50%{box-shadow:0 0 15px rgba(74,222,128,0.4);}`;

// ── 시드 기반 결정론 RNG ──
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Unit {
  id: string;
  detail: TowerDetail;
  team: 'my' | 'opp';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atkCd: number;
  fainted: boolean;
  isAtk: boolean;
  isHit: boolean;
  // [FIX-5] 상태이상 지원
  statusEffect?: {
    type: 'burn' | 'poison' | 'paralysis' | 'freeze' | 'sleep';
    turnsLeft: number;   // 남은 지속 틱 수
  };
}

interface FloatTxt {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface TFTBattleResult {
  winner: 'player1' | 'player2';
  player1Remaining: number;
  player2Remaining: number;
}

export interface TFTBattleArenaProps {
  roomId?: string;
  myUserId?: string;
  opponentId?: string;
  myTeam: TowerDetail[];
  opponentTeam: TowerDetail[];
  opponentName: string;
  myPosition: 'L' | 'R';
  phase: 'prep' | 'battle' | 'result';
  battleResult?: PvPBattleResult | null;
  battleSeed?: number | null;
  battleStartTime?: number | null;
  onBattleComplete?: (result: TFTBattleResult) => void;
}

const L_POS = [
  { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 },
  { x: 1, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 5 },
];
const R_POS = [
  { x: 5, y: 0 }, { x: 4, y: 1 }, { x: 5, y: 2 },
  { x: 4, y: 3 }, { x: 5, y: 4 }, { x: 4, y: 5 },
];

// ─── [FIX-5] 배틀 데미지 계산 결과 타입 ──────────────────────────────────────
interface DmgResult {
  damage: number;
  isCrit: boolean;
  isStab: boolean;
  effectiveness: number;  // 타입 상성 배율 (0.1/0.5/1/2/4)
  statusInflicted?: 'burn' | 'poison' | 'paralysis' | 'freeze' | 'sleep';
  isMiss: boolean;        // 명중 실패 여부 (accuracy 판정)
  isAOE: boolean;         // 선택된 기술이 광역 기술인지
  drainPercent?: number;  // 기술의 흡혈 비율 (move.effect.drainPercent)
}

/**
 * [FIX-5 FINAL] calcDmg — 싱글플레이와 완전 동일한 로직
 *   STAB · 물리/특수 구분 · 타입상성 · 크리티컬 · 명중률 · 상태이상 · 흡혈 · AOE
 *
 * RNG 소비 순서 (결정론 보장 — 항상 정확히 6회 소비):
 *   r1 → 기술 선택 방식 (최강 vs 랜덤)
 *   r2 → 랜덤 기술 인덱스
 *   r3 → 크리티컬 판정
 *   r4 → 데미지 난수 (0.85~1.0)
 *   r5 → 상태이상 부여 판정
 *   r6 → 명중률 판정 (accuracy)
 *
 * ※ miss 시에도 r1~r5 소비 후 r6에서 판정 → 양측 RNG 시퀀스 일치 보장
 */
function calcDmg(a: Unit, d: Unit, rng: () => number): DmgResult {
  const r1 = rng();
  const r2 = rng();
  const r3 = rng();
  const r4 = rng();
  const r5 = rng();
  const r6 = rng();

  const attackerTypes = a.detail.types ?? [];
  const defenderTypes = d.detail.types ?? [];

  // 데미지가 있는 기술만 (status 기술 제외)
  const damageMoves = (a.detail.equippedMoves ?? []).filter(
    m => m.damageClass !== 'status' && (m.power ?? 0) > 0
  );

  let power = 50 + a.detail.level;
  let moveType: string = attackerTypes[0] ?? 'normal';
  let damageClass: 'physical' | 'special' = 'physical';
  let moveEffect: { statusInflict?: string; statusChance?: number | null; drainPercent?: number } | null = null;
  let accuracy = 100; // 기술 명중률 (기본 100%)
  let isAOE = false;

  if (damageMoves.length > 0) {
    let idx: number;
    if (r1 < 0.3) {
      // 30% 확률: 위력이 가장 높은 기술 사용
      const maxPower = Math.max(...damageMoves.map(m => m.power ?? 0));
      idx = damageMoves.findIndex(m => (m.power ?? 0) === maxPower);
      if (idx < 0) idx = 0;
    } else {
      // 70% 확률: 랜덤 기술 사용
      idx = Math.floor(r2 * damageMoves.length) % damageMoves.length;
    }
    const sel = damageMoves[idx];
    power      = Math.max(30, sel.power ?? power);
    moveType   = sel.type || moveType;
    damageClass = sel.damageClass === 'special' ? 'special' : 'physical';
    moveEffect = sel.effect ?? null;
    accuracy   = sel.accuracy ?? 100;   // [FIX] 기술 명중률 반영
    isAOE      = sel.isAOE ?? false;    // [FIX] 기술 AOE 여부 반영
  }

  // [FIX] 명중률 판정 (싱글플레이 hitChance = m.accuracy / 100 와 동일)
  // r6를 항상 소비하므로 miss여도 r1~r5 계산은 완료된 뒤 판정
  const isMiss = r6 > (accuracy / 100);
  if (isMiss) {
    return { damage: 0, isCrit: false, isStab: false, effectiveness: 1, isMiss: true, isAOE: false };
  }

  // 물리/특수 구분: 기술의 damageClass에 따라 공/방 스탯 선택
  const atkStat = damageClass === 'special'
    ? (a.detail.specialAttack ?? a.detail.attack ?? a.detail.level * 10)
    : (a.detail.attack ?? a.detail.level * 10);
  const defStat = damageClass === 'special'
    ? (d.detail.specialDefense ?? d.detail.defense ?? d.detail.level * 5)
    : (d.detail.defense ?? d.detail.level * 5);

  // 타입 상성: 기술 타입 기준
  const eff = getTypeEffectiveness(moveType, defenderTypes);

  // 자속 보정 (STAB)
  const isStab = attackerTypes.includes(moveType);

  // 크리티컬
  const critRate = a.detail.critChance ?? 0.0625;
  const isCrit = r3 < critRate;

  // 번 상태이상: 물리 공격력 절반
  const burnPenalty = (a.statusEffect?.type === 'burn' && damageClass === 'physical') ? 0.5 : 1.0;

  // 포켓몬 본가 데미지 공식
  const lvl = a.detail.level;
  const base = ((2 * lvl / 5 + 2) * power * atkStat / Math.max(defStat, 1)) / 50 + 2;
  const randomFactor = 0.85 + r4 * 0.15;
  let dmg = base * eff * randomFactor * burnPenalty;
  if (isStab) dmg *= 1.5;
  if (isCrit) dmg *= 1.5;

  // 상태이상 부여: 이미 상태이상이 없는 경우만
  let statusInflicted: DmgResult['statusInflicted'];
  if (!d.statusEffect && moveEffect?.statusInflict && moveEffect.statusChance != null) {
    if (r5 * 100 < (moveEffect.statusChance ?? 0)) {
      const s = moveEffect.statusInflict as string;
      if (s === 'burn' || s === 'poison' || s === 'paralysis' || s === 'freeze' || s === 'sleep') {
        statusInflicted = s;
      }
    }
  }

  // [FIX] drainPercent: move.effect.drainPercent (흡혈 기술, 싱글플레이와 동일)
  const drainPercent = moveEffect?.drainPercent;

  return {
    damage: Math.max(1, Math.floor(dmg)),
    isCrit,
    isStab,
    effectiveness: eff,
    statusInflicted,
    isMiss: false,
    isAOE,
    drainPercent,
  };
}

function dst(a: Unit, b: Unit) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function buildCanonicalOrder(units: Unit[], myPosition: 'L' | 'R'): Unit[] {
  const alive = (u: Unit) => !u.fainted && u.hp > 0 && u.x >= 0;
  const aliveUnits = units.filter(alive);

  const lTeam = aliveUnits
    .filter(u => (myPosition === 'L' ? u.team === 'my' : u.team === 'opp'))
    .sort((a, b) => parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1]));

  const rTeam = aliveUnits
    .filter(u => (myPosition === 'R' ? u.team === 'my' : u.team === 'opp'))
    .sort((a, b) => parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1]));

  return [...lTeam, ...rTeam];
}

function sortTeamDeterministic(team: TowerDetail[]): TowerDetail[] {
  return (team || []).slice().sort((a, b) => {
    if (a.pokemonId !== b.pokemonId) return a.pokemonId - b.pokemonId;
    if (a.level !== b.level) return b.level - a.level;
    return (a.name || '').localeCompare(b.name || '');
  });
}

// atkCd 초기값: RNG 소비 없이 인덱스 기반 고정 (양측 동일 시퀀스 보장)
function initialAtkCd(i: number): number { return i * (0.5 / 6); }

function buildUnits(
  myTeam: TowerDetail[],
  oppTeam: TowerDetail[],
  mySynergies: Synergy[],
  oppSynergies: Synergy[],
): Unit[] {
  const units: Unit[] = [];

  const sortedMy = sortTeamDeterministic(myTeam).slice(0, 6);
  const sortedOpp = sortTeamDeterministic(oppTeam).slice(0, 6);

  sortedMy.forEach((d, i) => {
    // [T11-FIX] 기절 포켓몬도 TFT에서는 풀팀으로 시작.
    //   isFainted:false로 cast해야 getBuffedStats에서 early-return 없이 버프가 정상 적용됨.
    const p = { ...d, isFainted: false } as unknown as GamePokemon;
    const buffed = getBuffedStats(p, mySynergies);
    units.push({
      id: `my-${i}`,
      detail: { ...d, ...buffed },
      team: 'my',
      x: -1,  // 벤치 (prep 중 플레이어가 배치)
      y: i,
      hp: d.maxHp > 0 ? d.maxHp : 100,   // [FIX] 항상 풀HP로 시작 (기력의조각 회복 포함)
      maxHp: d.maxHp > 0 ? d.maxHp : 100,
      atkCd: initialAtkCd(i),
      fainted: false,  // [T11-FIX] TFT는 항상 풀팀으로 시작 (기절 포켓몬도 부활)
      isAtk: false,
      isHit: false,
    });
  });

  sortedOpp.forEach((d, i) => {
    // [T11-FIX] 상대방도 동일하게 기절 포켓몬 포함 풀팀으로 시작
    const p = { ...d, isFainted: false } as unknown as GamePokemon;
    const buffed = getBuffedStats(p, oppSynergies);
    units.push({
      id: `op-${i}`,
      detail: { ...d, ...buffed },
      team: 'opp',
      x: -2,  // 숨김 (prep 중 보이면 안 됨 — reveal 직전에 배치 확정)
      y: i,
      hp: d.maxHp > 0 ? d.maxHp : 100,   // [FIX] 항상 풀HP로 시작
      maxHp: d.maxHp > 0 ? d.maxHp : 100,
      atkCd: initialAtkCd(i),
      fainted: false,  // [T11-FIX] TFT는 항상 풀팀으로 시작
      isAtk: false,
      isHit: false,
    });
  });
  return units;
}

function simulateTick(
  units: Unit[],
  myPosition: 'L' | 'R',
  rng: () => number,
): { units: Unit[]; floats: FloatTxt[]; done: boolean } {
  const next = units.map(u => ({ ...u, isAtk: false, isHit: false }));
  const alive = (u: Unit) => !u.fainted && u.hp > 0 && u.x >= 0;
  const myAlive = next.filter(u => u.team === 'my' && alive(u));
  const oppAlive = next.filter(u => u.team === 'opp' && alive(u));

  if (myAlive.length === 0 || oppAlive.length === 0) {
    return { units: next, floats: [], done: true };
  }

  const canonicalOrder = buildCanonicalOrder(next, myPosition);
  const floats: FloatTxt[] = [];
  let floatSeq = 0;

  // ── [FIX-5] 상태이상 틱 처리 (매 틱마다 적용) ──────────────────
  for (const unit of next) {
    if (!alive(unit) || !unit.statusEffect) continue;
    const se = unit.statusEffect;

    // 독/번 틱 데미지
    if (se.type === 'burn' || se.type === 'poison') {
      const tickDmg = se.type === 'burn'
        ? Math.max(1, Math.floor(unit.maxHp / 16 / FPS))   // 번: 1/16 HP/초
        : Math.max(1, Math.floor(unit.maxHp / 8 / FPS));   // 독: 1/8 HP/초
      unit.hp = Math.max(0, unit.hp - tickDmg);
      if (unit.hp <= 0) unit.fainted = true;
    }

    // 지속 시간 감소
    unit.statusEffect = {
      ...se,
      turnsLeft: se.turnsLeft - 1,
    };
    if (unit.statusEffect.turnsLeft <= 0) {
      unit.statusEffect = undefined;
    }
  }

  for (const unitRef of canonicalOrder) {
    const unit = next.find(u => u.id === unitRef.id)!;
    if (!alive(unit)) continue;

    // ── [FIX-5] 얼음/잠듦: 행동 불가 ──
    if (unit.statusEffect?.type === 'freeze' || unit.statusEffect?.type === 'sleep') {
      // 얼음: 매 틱 20% 확률로 해제 (RNG 소비 없음 — 결정론 유지용 단순 틱 기반)
      if (unit.statusEffect.type === 'freeze' && unit.statusEffect.turnsLeft % 6 === 1) { // 초기값(90)이 6의 배수라 0이면 첫 틱 즉시 해제됨 → 1로 수정
        unit.statusEffect = undefined;
      }
      // 쿨다운만 감소, 공격 스킵
      unit.atkCd = Math.max(0, unit.atkCd - (1 / FPS));
      continue;
    }

    const enemies = unit.team === 'my'
      ? next.filter(u => u.team === 'opp' && alive(u))
      : next.filter(u => u.team === 'my' && alive(u));
    if (!enemies.length) continue;

    // 가장 가까운 적 타겟
    let target = enemies[0];
    let minD = Infinity;
    for (const e of enemies) {
      const d = dst(unit, e);
      if (d < minD - 1e-9) { minD = d; target = e; }
      else if (Math.abs(d - minD) < 1e-9 && e.id.localeCompare(target.id) < 0) { target = e; }
    }

    unit.atkCd = Math.max(0, unit.atkCd - (1 / FPS));

    if (minD <= ATTACK_RANGE) {
      if (unit.atkCd <= 0) {
        // ── [FIX-5] 마비: 25% 확률로 행동 불가 (결정론: 틱 번호 기반) ──
        // RNG를 추가 소비하지 않고 unit.id 해시 + 틱으로 대체해 결정론 유지
        const paraSkip = unit.statusEffect?.type === 'paralysis' &&
          ((parseInt(unit.id.replace(/\D/g, ''), 10) + Math.floor(unit.atkCd * 1000)) % 4 === 0);

        if (!paraSkip) {
          unit.isAtk = true;

          // [FIX-5] 스피드 기반 공격 쿨다운 (speed가 높을수록 빠른 공격)
          const spd = unit.detail.speed ?? 50;
          const speedMult = Math.max(0.4, 1.0 - spd / 400);
          unit.atkCd = ATK_COOLDOWN * speedMult;

          const t2 = next.find(u => u.id === target.id);
          if (t2 && alive(t2)) {
            const result = calcDmg(unit, t2, rng);
            const {
              damage: dmg, isCrit, effectiveness: eff, statusInflicted,
              isMiss, isAOE, drainPercent,
            } = result;

            // ── 명중 실패 (accuracy) ─────────────────────────────────
            if (isMiss) {
              floats.push({
                id: ++floatSeq, text: 'MISS',
                x: t2.x * CELL + CELL / 2, y: t2.y * CELL,
                color: '#aaaaaa',
              });
            } else {
              // ── AOE: 이번 턴에 선택된 기술이 isAOE인 경우만 스플래시 ──
              // aoeBonus = ability AOE 배율 (buildTowerDetails에서 계산)
              if (isAOE && enemies.length > 1) {
                const splashRange = 1.6;
                // aoeBonus: ability AOE 배율(buildTowerDetails에서 계산), 없으면 1.0 기본
                const aoeBonus = (unit.detail.aoeBonus ?? 0) > 0 ? (unit.detail.aoeBonus ?? 1.0) : 1.0;
                const splashDmg = Math.floor(dmg * 0.5 * aoeBonus);
                const splashTargets = enemies
                  .filter(e => e.id !== t2.id && dst(t2, e) <= splashRange)
                  .sort((a, b) => a.id.localeCompare(b.id));
                for (const e of splashTargets) {
                  const spTarget = next.find(u => u.id === e.id);
                  if (spTarget && alive(spTarget)) {
                    spTarget.hp = Math.max(0, spTarget.hp - splashDmg);
                    spTarget.isHit = true;
                    if (spTarget.hp <= 0) spTarget.fainted = true;
                    floats.push({
                      id: ++floatSeq,
                      text: `-${splashDmg}`,
                      x: spTarget.x * CELL + CELL / 2 + 10,
                      y: spTarget.y * CELL - 10,
                      color: '#e67e22',
                    });
                  }
                }
              }

              // ── 메인 타겟 데미지 ──────────────────────────────────
              t2.hp = Math.max(0, t2.hp - dmg);
              t2.isHit = true;
              if (t2.hp <= 0) t2.fainted = true;

              // 플로트 텍스트: 색상으로만 상성 표현 (텍스트 멘트 없음)
              // 크리티컬 + 약점 > 크리티컬 > 4배 > 2배 > 반감 > 무효 > 보통(팀 기준)
              let floatColor: string;
              if (isCrit && eff >= 2)       floatColor = '#ff2200';  // 크리티컬 + 약점: 진빨강
              else if (isCrit)              floatColor = '#f39c12';  // 크리티컬: 골드
              else if (eff >= 4)            floatColor = '#e74c3c';  // 4배: 빨강
              else if (eff >= 2)            floatColor = '#e67e22';  // 2배: 주황
              else if (eff <= 0.15)         floatColor = '#7f8c8d';  // 무효(×0.1): 진회색
              else if (eff <= 0.5)          floatColor = '#5dade2';  // 반감(×0.5): 파랑
              else floatColor = t2.team === 'my' ? '#ff6b6b' : '#ffd93d'; // 보통: 팀색

              const floatText = isCrit ? `💥${dmg}` : `-${dmg}`;

              floats.push({
                id: ++floatSeq, text: floatText,
                x: t2.x * CELL + CELL / 2, y: t2.y * CELL,
                color: floatColor,
              });

              // ── 흡혈: drainPercent(기술 효과) 우선, 없으면 lifesteal 필드 ──
              // 싱글플레이와 동일: proj.effect.drainPercent 기반
              const healRatio = drainPercent ?? (unit.detail.lifesteal || 0);
              if (healRatio > 0 && dmg > 0) {
                const healAmount = Math.floor(dmg * healRatio);
                if (healAmount > 0 && unit.hp < unit.maxHp) {
                  unit.hp = Math.min(unit.maxHp, unit.hp + healAmount);
                  floats.push({
                    id: ++floatSeq, text: `+${healAmount}`,
                    x: unit.x * CELL + CELL / 2, y: unit.y * CELL - 15,
                    color: '#2ecc71',
                  });
                }
              }

              // ── 상태이상 부여 ─────────────────────────────────────
              if (statusInflicted && !t2.fainted) {
                const DURATION: Record<string, number> = {
                  burn: FPS * 5, poison: FPS * 5, paralysis: FPS * 4,
                  freeze: FPS * 3, sleep: FPS * 2,
                };
                t2.statusEffect = {
                  type: statusInflicted,
                  turnsLeft: DURATION[statusInflicted] ?? FPS * 3,
                };
                const SE_ICONS: Record<string, string> = {
                  burn: '🔥', poison: '☠️', paralysis: '⚡', freeze: '❄️', sleep: '💤',
                };
                floats.push({
                  id: ++floatSeq,
                  text: SE_ICONS[statusInflicted] ?? '❓',
                  x: t2.x * CELL + CELL / 2 + 20,
                  y: t2.y * CELL - 10,
                  color: '#fff',
                });
              }
            } // end !isMiss
          }
        } else {
          // 마비로 행동 불가
          unit.atkCd = ATK_COOLDOWN * 0.5; // 짧은 페널티
        }
      }
    } else {
      // 이동
      unit.isAtk = false;
      const dx = target.x - unit.x;
      const dy = target.y - unit.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      // [FIX-5] 스피드 기반 이동 속도 (마비 시 절반)
      const spd = unit.detail.speed ?? 50;
      const moveSpeedFinal = MOVE_SPEED * (1 + spd / 200) *
        (unit.statusEffect?.type === 'paralysis' ? 0.5 : 1.0);
      if (len > 0.01) {
        unit.x = Math.max(0, Math.min(COLS - 1, unit.x + (dx / len) * moveSpeedFinal * (1 / FPS)));
        unit.y = Math.max(0, Math.min(ROWS - 1, unit.y + (dy / len) * moveSpeedFinal * (1 / FPS)));
      }
    }
  }

  return { units: next, floats, done: false };
}

export const TFTBattleArena: React.FC<TFTBattleArenaProps> = ({
  roomId, myUserId, opponentId, myTeam, opponentTeam, opponentName,
  myPosition, phase, battleSeed, battleStartTime, battleResult: battleResultProp, onBattleComplete,
}) => {
  const { t } = useTranslation();
  const startTime = battleStartTime;
  
  const [units, setUnits] = useState<Unit[]>([]);
  const [floats, setFloats] = useState<FloatTxt[]>([]);
  const [battleState, setBattleState] = useState<'idle' | 'reveal' | 'fighting' | 'done'>('idle');
  const [winnerText, setWinnerText] = useState<string | null>(null);
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(PREP_TIME);

  const simUnitsRef = useRef<Unit[]>([]);
  const rngRef = useRef<() => number>(() => Math.random());
  const simTickRef = useRef<number>(0);
  const revealStartedRef = useRef(false);
  const battleStartAtRef = useRef<number | null>(null);

  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const floatIdRef = useRef(0);
  const initRef = useRef<{ my: string; op: string }>({ my: '', op: '' });
  const resultReportedRef = useRef(false);
  const hasSubmittedRef = useRef(false);

  // [FIX-JITTER-1] onBattleComplete을 ref로 관리 — 부모 리렌더마다 새 함수 참조가 들어와도
  // fighting useEffect의 dependency로 쓰이지 않으므로 setInterval이 재시작되지 않음
  const onBattleCompleteRef = useRef(onBattleComplete);
  useEffect(() => { onBattleCompleteRef.current = onBattleComplete; }, [onBattleComplete]);

  const [remotePlacements, setRemotePlacements] = useState<Map<string, { id: string, x: number, y: number }[]>>(new Map());

  useEffect(() => {
    if (!roomId) return;
    const unsub = multiplayerService.onAllTFTPlacementsUpdate(roomId, (pm) => {
      setRemotePlacements(pm);
    });
    return unsub;
  }, [roomId]);

  const myCols = myPosition === 'L' ? [0, 1] : [4, 5];

  const benchUnits = units.filter(u => u.team === 'my' && u.x === -1 && !u.fainted);

  const mySynergies = useMemo(
    () => calculateActiveSynergies(
      sortTeamDeterministic(myTeam).filter(t => !t.isFainted) as unknown as GamePokemon[]
    ),
    [myTeam],
  );
  const oppSynergies = useMemo(
    () => calculateActiveSynergies(
      sortTeamDeterministic(opponentTeam).filter(t => !t.isFainted) as unknown as GamePokemon[]
    ),
    [opponentTeam],
  );

  useEffect(() => {
    if (phase !== 'result') {
      const current = useGameStore.getState().activeSynergies;
      const sig = (s: Synergy[]) => s.map(x => `${x.id}:${x.count}`).join('|');
      const currentSig = sig(current);
      const newSig = sig(mySynergies);
      if (currentSig !== newSig) {
        useGameStore.setState({ activeSynergies: mySynergies });
      }
    }
  }, [mySynergies, phase]);

  const myTeamSig = useMemo(
    () => (myTeam || []).map(t => `${t.pokemonId}:${t.level}:${t.currentHp}:${t.isFainted ? 1 : 0}`).join(','),
    [myTeam]
  );
  const oppTeamSig = useMemo(
    () => (opponentTeam || []).map(t => `${t.pokemonId}:${t.level}:${t.currentHp}:${t.isFainted ? 1 : 0}`).join(','),
    [opponentTeam]
  );

  useEffect(() => {
    if (myTeam.length === 0 && opponentTeam.length === 0) return;
    if (initRef.current.my === myTeamSig && initRef.current.op === oppTeamSig && units.length > 0) return;

    initRef.current = { my: myTeamSig, op: oppTeamSig };
    resultReportedRef.current = false;
    hasSubmittedRef.current = false;
    // RNG는 fighting 진입 시점에 초기화 — buildUnits에서 소비하지 않음
    rngRef.current = () => 0.5;
    const initialUnits = buildUnits(myTeam, opponentTeam, mySynergies, oppSynergies);
    revealStartedRef.current = false;
    simUnitsRef.current = initialUnits;
    setUnits(initialUnits);
    setBattleState('idle');
    setWinnerText(null);
    setFloats([]);
    setDragId(null);
    setSelectedBenchId(null);
  }, [myTeamSig, oppTeamSig, myPosition, battleSeed]);

  useEffect(() => {
    if (phase !== 'prep' || battleState !== 'idle') return;
    const updateTime = () => {
      if (!startTime) {
        setCountdown(PREP_TIME);
        return;
      }
      const now = Date.now() + multiplayerService.getServerTimeOffset();
      const elapsed = Math.floor((now - startTime) / 1000);
      // [T3] clamp: 0 ≤ remaining ≤ PREP_TIME (clock skew 방어)
      const remaining = Math.max(0, Math.min(PREP_TIME, PREP_TIME - elapsed));
      setCountdown(prev => prev !== remaining ? remaining : prev);
      if (remaining <= 0) {
        autoPlaceRemainingUnits();
        setBattleState('reveal');
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 500);
    return () => clearInterval(timer);
  }, [phase, battleState, startTime]);

  const autoPlaceRemainingUnits = useCallback(() => {
    setUnits(prev => {
      const next = [...prev];
      const defaults = myPosition === 'L' ? L_POS : R_POS;
      const unplaced = next.filter(u => u.team === 'my' && u.x === -1 && !u.fainted);
      if (unplaced.length === 0) return prev;
      const usedPositions = new Set(
        next.filter(u => u.team === 'my' && u.x >= 0).map(u => `${Math.round(u.x)},${Math.round(u.y)}`)
      );
      let defaultIdx = 0;
      for (const unit of unplaced) {
        while (defaultIdx < defaults.length) {
          const pos = defaults[defaultIdx];
          if (!usedPositions.has(`${pos.x},${pos.y}`)) {
            unit.x = pos.x; unit.y = pos.y;
            usedPositions.add(`${pos.x},${pos.y}`);
            break;
          }
          defaultIdx++;
        }
        if (unit.x === -1) {
          outer: for (let col of myCols) {
            for (let row = 0; row < ROWS; row++) {
              if (!usedPositions.has(`${col},${row}`)) {
                unit.x = col; unit.y = row;
                usedPositions.add(`${col},${row}`);
                break outer;
              }
            }
          }
        }
      }
      simUnitsRef.current = next;
      return next;
    });
  }, [myPosition, myCols]);

  useEffect(() => {
    if (battleState === 'reveal' && roomId && myUserId && !hasSubmittedRef.current) {
      const myPlacements = units
        .filter(u => u.team === 'my' && u.x >= 0)
        .map(u => ({ id: u.id, x: u.x, y: u.y }));
      if (myPlacements.length > 0) {
        hasSubmittedRef.current = true;
        multiplayerService.submitTFTPlacements(roomId, myUserId, myPlacements).catch(console.error);
      }
    }
  }, [battleState, units, roomId, myUserId]);

  const isOpponentAI = opponentId?.startsWith('ai_');
  const oppPlacements = opponentId ? remotePlacements.get(opponentId) : null;
  const isOpponentReady = isOpponentAI || (oppPlacements && oppPlacements.length > 0);

  // oppPlacements를 ref로 유지 — reveal effect dependency에서 제거해 timer 재시작 방지
  const oppPlacementsRef = useRef(oppPlacements);
  useEffect(() => { oppPlacementsRef.current = oppPlacements; }, [oppPlacements]);

  useEffect(() => {
    if (battleState !== 'reveal') return;

    // AI 상대: 즉시 준비완료. 사람 상대: Firebase 배치 수신 대기
    if (!isOpponentReady) {
      setCountdown(REVEAL_TIME);
      return;
    }

    // 이미 타이머 동작 중이면 중복 실행 방지
    if (revealStartedRef.current) return;
    revealStartedRef.current = true;

    // [DET] reveal 기준시각 = battleStartTime(서버) + PREP_TIME*1000
    const revealBase = battleStartTime
      ? battleStartTime + PREP_TIME * 1000
      : Date.now() + multiplayerService.getServerTimeOffset();

    const startFighting = () => {
      // [DET] RNG: fighting 진입 시점에 단 한 번 초기화
      const seed = battleSeed ?? 42424242;
      rngRef.current = mulberry32(seed);
      simTickRef.current = 0;

      // [DET] fighting 기준시각 고정 (서버 시각 기반 — 양측 tick 일치)
      battleStartAtRef.current = revealBase + REVEAL_TIME * 1000;

      // [DET] 배치 확정: oppPlacementsRef.current로 최신값 참조 (dependency 없음)
      const latestOppPlacements = oppPlacementsRef.current;
      const oppDefaults = myPosition === 'L' ? R_POS : L_POS;
      setUnits(currentUnits => {
        const finalized = currentUnits.map(u => {
          if (u.team === 'opp') {
            const idx = parseInt(u.id.split('-')[1]);
            if (!isOpponentAI && latestOppPlacements && latestOppPlacements[idx]) {
              return { ...u, x: latestOppPlacements[idx].x, y: latestOppPlacements[idx].y };
            }
            // AI 또는 배치 미수신: 기본 위치
            const pos = oppDefaults[idx] ?? { x: myPosition === 'L' ? 4 + (idx % 2) : idx % 2, y: idx };
            return { ...u, x: pos.x, y: pos.y };
          }
          return u;
        });
        simUnitsRef.current = finalized;
        return finalized;
      });

      setBattleState('fighting');
    };

    let timerId: ReturnType<typeof setInterval> | null = null;

    const updateReveal = () => {
      const now = Date.now() + multiplayerService.getServerTimeOffset();
      const elapsed = Math.floor((now - revealBase) / 1000);
      // [T3] clamp: 0 ≤ remaining ≤ REVEAL_TIME (clock skew 방어)
      const remaining = Math.max(0, Math.min(REVEAL_TIME, REVEAL_TIME - elapsed));
      setCountdown(remaining);
      if (remaining <= 0) {
        if (timerId) { clearInterval(timerId); timerId = null; }
        startFighting();
      }
    };

    updateReveal();
    timerId = setInterval(updateReveal, 250);
    return () => { if (timerId) clearInterval(timerId); };
    // oppPlacements를 dependency에서 제거 → ref로 최신값 읽음 (timer 재시작 방지)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleState, isOpponentReady, battleStartTime, battleSeed, isOpponentAI, myPosition]);

  // [T2] phase === 'battle' 분기 삭제 — BattlePhaseUI가 arenaPhase='prep'|'result'만 전달하므로
  //   이 useEffect는 절대 실행되지 않는 dead code였음.

  useEffect(() => {
    if (!battleResultProp) return;
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    if (battleState !== 'done') {
      // [T7] 서버 결과 기반 winnerText 동기화 — done 오버레이에 정확한 텍스트 표시
      const myUserIdSafe = myUserId ?? '';
      const myWon = battleResultProp.winnerId === myUserIdSafe;
      setWinnerText(myWon ? t('battle.winMsg') : t('battle.loseMsg', { name: opponentName }));
      setBattleState('done');
    }
  }, [battleResultProp, battleState, myUserId, opponentName, t]);

  useEffect(() => {
    if (battleState !== 'fighting') return;
    const tick = () => {
      const now = Date.now() + multiplayerService.getServerTimeOffset();
      const delta = Math.max(0, now - (battleStartAtRef.current ?? now));
      const targetTick = Math.floor(delta / TICK_MS);
      const simTick = simTickRef.current;
      let ticksToRun = Math.min(targetTick - simTick, MAX_CATCHUP_TICKS);
      if (ticksToRun <= 0) return;

      const rng = rngRef.current;
      let current = simUnitsRef.current;
      const allFloats: FloatTxt[] = [];
      let done = false;
      for (let i = 0; i < ticksToRun; i++) {
        const res = simulateTick(current, myPosition, rng);
        current = res.units;
        if (allFloats.length < 60) res.floats.forEach(f => allFloats.length < 60 && allFloats.push(f));
        simTickRef.current++;
        if (res.done) { done = true; break; }
      }
      simUnitsRef.current = current;
      setUnits(current);
      if (allFloats.length > 0) {
        const idOffset = floatIdRef.current;
        const rebased = allFloats.map((f, idx) => ({ ...f, id: idOffset + idx + 1 }));
        floatIdRef.current += allFloats.length;
        setFloats(f => [...f, ...rebased]);
        setTimeout(() => setFloats(f => f.filter(x => !rebased.some(r => r.id === x.id))), 850);
      }
      if (done) {
        if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
        setBattleState('done');
        const alive = (u: Unit) => !u.fainted && u.hp > 0 && u.x >= 0;
        const myWon = current.some(u => u.team === 'my' && alive(u));
        setWinnerText(myWon ? t('battle.winMsg') : t('battle.loseMsg', { name: opponentName }));
        if (!resultReportedRef.current) {
          resultReportedRef.current = true;
          const p1Alive = current.filter(u => ((myPosition === 'L' && u.team === 'my') || (myPosition === 'R' && u.team === 'opp')) && alive(u)).length;
          const p2Alive = current.filter(u => ((myPosition === 'R' && u.team === 'my') || (myPosition === 'L' && u.team === 'opp')) && alive(u)).length;
          // [FIX-JITTER-1] ref를 통해 호출 — dependency에서 제거해 interval 재시작 방지
          onBattleCompleteRef.current?.({ winner: p1Alive > 0 ? 'player1' : 'player2', player1Remaining: p1Alive, player2Remaining: p2Alive });
        }
      }
    };
    loopRef.current = setInterval(tick, TICK_MS);
    return () => { if (loopRef.current) clearInterval(loopRef.current); };
  // [FIX-JITTER-1] onBattleComplete 제거 — ref로 최신값 참조, interval 재시작 방지
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleState, opponentName, myPosition]);

  const handleBenchClick = (id: string) => {
    if (battleState !== 'idle' || phase !== 'prep') return;
    setSelectedBenchId(prev => prev === id ? null : id);
    setDragId(null);
  };

  const handleCellClick = (col: number, row: number) => {
    if (phase !== 'prep' || battleState !== 'idle' || !myCols.includes(col)) return;
    const movingId = selectedBenchId ?? dragId;
    if (!movingId) return;

    setUnits(prev => {
      const next = prev.map(u => ({ ...u }));
      const moving = next.find(u => u.id === movingId);
      if (!moving) return prev;

      // [T4] 같은 셀에 내 유닛이 있으면 swap
      const occupant = next.find(u =>
        u.team === 'my' && u.id !== movingId && u.x === col && u.y === row
      );
      if (occupant) {
        occupant.x = moving.x;
        occupant.y = moving.y;
      }
      moving.x = col;
      moving.y = row;
      simUnitsRef.current = next;
      return next;
    });
    setSelectedBenchId(null);
    setDragId(null);
  };

  const handleReturnToBench = (id: string) => {
    if (phase !== 'prep' || battleState !== 'idle') return;
    setUnits(prev => {
      const next = prev.map(u => {
        if (u.id !== id) return u;
        const idx = parseInt(u.id.split('-')[1]);
        // [T14] y도 bench index로 복원 — 재배치 시 이상 위치 방지
        return { ...u, x: -1, y: idx };
      });
      return next;
    });
    // [T12] setter 외부에서 ref 동기화 — React 18 Strict Mode 안전
    queueMicrotask(() => {
      simUnitsRef.current = simUnitsRef.current.map(u => {
        if (u.id !== id) return u;
        const idx = parseInt(u.id.split('-')[1]);
        return { ...u, x: -1, y: idx };
      });
    });
    setDragId(null);
  };

  const isPrep = phase === 'prep' && battleState === 'idle';
  const isReveal = battleState === 'reveal';

  return (
    <Wrap>
      <Header>
        <TitleRow>
          <ArenaIcon>⚔️</ArenaIcon>
          <ArenaTitle>{t('battle.arenaTitle')}</ArenaTitle>
          {isPrep && (
            <PhasePill>
              <PhaseDot />
              {t('battle.prepTime')}: {countdown}s
            </PhasePill>
          )}
        </TitleRow>
        <VersusRow>
          <PosLabel $isMe={true}>{t('battle.you')} ({myPosition})</PosLabel>
          <PosVS>{t('battle.vs')}</PosVS>
          <PosLabel $isMe={false}>{opponentName} ({myPosition === 'L' ? 'R' : 'L'})</PosLabel>
        </VersusRow>
      </Header>

      <MainGrid>
        {/* myPosition에 따라 벤치와 상대 패널 좌우 스왑 */}
        {(() => {
          const myBenchPanel = (
            <BenchArea>
              <PanelTitle>{t('battle.myBenchCount', { count: benchUnits.length })}</PanelTitle>
              <BenchGrid>
                {benchUnits.map(u => (
                  <TowerCard key={u.id} $selected={selectedBenchId === u.id} onClick={() => handleBenchClick(u.id)}>
                    {u.detail.sprite ? <CardSprite src={u.detail.sprite} /> : <CardFallback>{u.detail.name?.slice(0, 2)}</CardFallback>}
                    <CardInfo>
                      <CardNameRow>
                        <CardName>{u.detail.name}</CardName>
                        <CardLevel>Lv.{u.detail.level}</CardLevel>
                      </CardNameRow>
                      {u.detail.types && (
                        <CardTypes>
                          {u.detail.types.map(type => <TypeBadge key={type} $type={type}>{type}</TypeBadge>)}
                        </CardTypes>
                      )}
                    </CardInfo>
                  </TowerCard>
                ))}
                {benchUnits.length === 0 && <EmptyMsg>{t('battle.allPlaced')}</EmptyMsg>}
              </BenchGrid>
              <Hint dangerouslySetInnerHTML={{ __html: t('battle.placementHint') }} />
            </BenchArea>
          );

          const opponentPanel = (
            <OpponentInfoPanel>
              <PanelTitle>{t('battle.opponentTowersCount', { count: opponentTeam.length })}</PanelTitle>
              <BenchGrid>
                {sortTeamDeterministic(opponentTeam).map((t, i) => (
                  <TowerCard key={i}>
                    {t.sprite ? <CardSprite src={t.sprite} alt={t.name} /> : <CardFallback>{t.name?.slice(0, 2)}</CardFallback>}
                    <CardInfo>
                      <CardNameRow>
                        <CardName>{t.name}</CardName>
                        <CardLevel>Lv.{t.level}</CardLevel>
                      </CardNameRow>
                      {t.types && (
                        <CardTypes>
                          {t.types.map(type => <TypeBadge key={type} $type={type}>{type}</TypeBadge>)}
                        </CardTypes>
                      )}
                    </CardInfo>
                  </TowerCard>
                ))}
              </BenchGrid>
            </OpponentInfoPanel>
          );

          return (
            <>
              <LeftSidebar>
                {myPosition === 'L' ? myBenchPanel : opponentPanel}
              </LeftSidebar>

              <CenterArea>
                <Board $isPrep={isPrep}>
                  {[...Array(ROWS)].map((_, r) => [...Array(COLS)].map((_, c) => (
                    <Cell key={`${r}-${c}`} $col={c} $row={r} $isMy={myCols.includes(c)}
                      $isTarget={!!(selectedBenchId || dragId) && myCols.includes(c)}
                      onClick={() => handleCellClick(c, r)}
                    />
                  )))}
                  <ZoneLbl style={{ left: '2%', top: '2%' }}>{myPosition === 'L' ? t('battle.myZone') : t('battle.opponentZone')}</ZoneLbl>
                  <ZoneLbl style={{ right: '2%', top: '2%' }}>{myPosition === 'R' ? t('battle.myZone') : t('battle.opponentZone')}</ZoneLbl>
                  {units.filter(u => u.x >= 0).map(u => (
                    <UnitWrap key={u.id} $team={u.team} $fainted={u.fainted} $hit={u.isHit} $atk={u.isAtk} $sel={dragId === u.id}
                      style={{ left: u.x * CELL + CELL / 2, top: u.y * CELL + CELL / 2, transform: 'translate(-50%, -50%)' }}
                      onMouseDown={() => isPrep && u.team === 'my' && setDragId(u.id)}
                      onContextMenu={(e) => { e.preventDefault(); handleReturnToBench(u.id); }}
                    >
                      {!u.fainted && <HpBg><HpFill style={{ width: `${(u.hp / u.maxHp) * 100}%`, background: u.team === 'my' ? '#4ade80' : '#f87171' }} /></HpBg>}
                      {u.detail.sprite ? <Sprite src={u.detail.sprite} $fainted={u.fainted} $flip={myPosition === 'R' ? u.team === 'my' : u.team === 'opp'} /> : <Fallback $team={u.team}>{u.detail.name?.slice(0, 2)}</Fallback>}
                      <UnitName>{u.detail.name}</UnitName>
                    </UnitWrap>
                  ))}
                  {floats.map(f => <FloatEl key={f.id} style={{ left: f.x, top: f.y, color: f.color }}>{f.text}</FloatEl>)}
                  {isReveal && <RevealOverlay><RevealText>{!isOpponentReady ? t('battle.waitingOpponent') : t('battle.startIn', { countdown })}</RevealText></RevealOverlay>}
                  {battleState === 'done' && <RevealOverlay style={{ background: 'rgba(0,0,0,0.6)', pointerEvents: 'auto' }}><div style={{ textAlign: 'center' }}><RevealText style={{ fontSize: '42px', marginBottom: '10px' }}>{winnerText}</RevealText></div></RevealOverlay>}
                  <AchievementToastDisplay />
                </Board>
              </CenterArea>

              <RightSidebar>
                {myPosition === 'R' ? myBenchPanel : opponentPanel}
              </RightSidebar>
            </>
          );
        })()}
      </MainGrid>
    </Wrap>

  );
};
const AchievementToastDisplay: React.FC = () => {
  const achievementToast = useGameStore(s => s.achievementToast);
  if (!achievementToast) return null;
  const ap = achievementToast.earnedAP ?? 3;
  const tierColor = ap >= 100 ? '#ff80ff' : ap >= 50 ? '#b9f2ff' : ap >= 25 ? '#FFD700' : ap >= 10 ? '#c0c0c0' : '#cd7f32';
  const isFirst = achievementToast.isFirstTime;
  return (
    <AchievementToastPill key={achievementToast.timestamp} $color={tierColor} $first={isFirst}>
      {isFirst ? '🏆 ' : '✓ '}
      <AchPillName $first={isFirst}>{achievementToast.name}</AchPillName>
      {isFirst && <AchPillAP $color={tierColor}> +{ap}AP</AchPillAP>}
    </AchievementToastPill>
  );
};

const Wrap = styled.div`width:100%;height:100%;display:flex;flex-direction:column;background:#0b0e14;color:#fff;overflow:hidden;padding:20px;`;

const Header = styled.div`display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:24px;`;
const TitleRow = styled.div`display:flex;align-items:center;gap:12px;`;
const ArenaIcon = styled.div`font-size:24px;`;
const ArenaTitle = styled.div`font-size:20px;font-weight:900;letter-spacing:1px;text-transform:uppercase;`;
const PhasePill = styled.div`display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.08);padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);`;
const PhaseDot = styled.div`width:8px;height:8px;border-radius:50%;background:#fbbf24;box-shadow:0 0 8px #fbbf24;`;

const VersusRow = styled.div`display:flex;align-items:center;gap:20px;`;
const PosVS = styled.div`font-size:14px;font-weight:900;color:rgba(255,255,255,0.2);`;
const PosLabel = styled.div<{ $isMe: boolean }>`font-size:14px;font-weight:800;color:${p => p.$isMe ? '#4ade80' : '#f87171'};text-shadow:0 0 10px ${p => p.$isMe ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'};`;

const MainGrid = styled.div`display:flex;flex:1;gap:24px;justify-content:center;align-items:stretch;min-height:0;`;

const LeftSidebar = styled.div`width:260px;display:flex;flex-direction:column;gap:20px;min-height:0;`;
const CenterArea = styled.div`display:flex;flex-direction:column;align-items:center;`;
const RightSidebar = styled.div`width:260px;display:flex;flex-direction:column;gap:20px;min-height:0;`;

const PanelTitle = styled.div`font-size:11px;font-weight:800;color:rgba(255,255,255,0.5);margin-bottom:12px;text-transform:uppercase;letter-spacing:1.5px;padding-left:4px;`;


const BenchArea = styled.div`flex:1;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;display:flex;flex-direction:column;min-height:0;`;
const BenchGrid = styled.div`flex:1;display:flex;flex-direction:column;gap:8px;overflow-y:auto;padding-right:4px;`;

const TowerCard = styled.div<{ $selected?: boolean }>`display:flex;align-items:center;padding:8px 12px;border-radius:12px;background:${p => p.$selected ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)'};border:1.5px solid ${p => p.$selected ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.08)'};gap:12px;cursor:pointer;transition:all 0.2s;${p => p.$selected && css`animation:${benchPulse} 2s infinite;`}&:hover{background:rgba(255,255,255,0.08);transform:translateX(4px);}`;
const CardSprite = styled.img`width:36px;height:36px;image-rendering:pixelated;`;
const CardFallback = styled.div`width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:8px;font-size:10px;font-weight:800;color:rgba(255,255,255,0.4);`;
const CardInfo = styled.div`flex:1;min-width:0;`;
const CardNameRow = styled.div`display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;`;
const CardName = styled.div`font-size:12px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
const CardLevel = styled.div`font-size:10px;color:rgba(255,255,255,0.4);font-weight:700;`;
const CardTypes = styled.div`display:flex;gap:4px;`;

const OpponentInfoPanel = styled.div`flex:1;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;display:flex;flex-direction:column;min-height:0;`;

const Board = styled.div<{ $isPrep: boolean }>`position:relative;width:${COLS * CELL}px;height:${ROWS * CELL}px;background:rgba(15,25,45,0.05);border:4px solid rgba(255,255,255,0.1);border-radius:12px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,0.6);&::before{content:'';position:absolute;inset:0;background-image:url('/images/maps/battle_field.png');background-size:cover;background-position:center;opacity:0.60;pointer-events:none;z-index:0;}`;
const Cell = styled.div<{ $col: number; $row: number; $isMy: boolean; $isTarget: boolean }>`position:absolute;left:${p => p.$col * CELL}px;top:${p => p.$row * CELL}px;width:${CELL}px;height:${CELL}px;border:1px solid rgba(255,255,255,0.03);background:${p => p.$isTarget ? 'rgba(74,222,128,0.1)' : (p.$isMy ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.01)')};&:hover{background:${p => p.$isTarget ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.03)'};}`;
const ZoneLbl = styled.div`position:absolute;font-size:10px;font-weight:800;color:rgba(255,255,255,0.2);text-transform:uppercase;letter-spacing:1px;pointer-events:none;z-index:3;`;
const UnitWrap = styled.div<{ $team: 'my' | 'opp'; $fainted: boolean; $hit: boolean; $atk: boolean; $sel: boolean }>`position:absolute;display:flex;flex-direction:column;align-items:center;z-index:${p => p.$sel ? 20 : 10};opacity:${p => p.$fainted ? 0.25 : 1};${p => (!p.$hit && !p.$atk) ? css`transition:left ${TICK_MS}ms linear,top ${TICK_MS}ms linear;` : ''}${p => p.$hit ? css`animation:${hitFlash} 0.35s ease;` : p.$atk ? css`animation:${atkBounce} 0.3s ease;` : ''}${p => p.$sel ? 'filter:drop-shadow(0 0 12px #4ade80);' : ''}`;
const HpBg = styled.div`width:90%;height:4px;border-radius:2px;background:rgba(0,0,0,0.6);overflow:hidden;margin-bottom:2px;`;
const HpFill = styled.div`height:100%;border-radius:2px;transition:width 0.2s cubic-bezier(0.4, 0, 0.2, 1);`;
const Sprite = styled.img<{ $fainted: boolean; $flip: boolean }>`width:60px;height:60px;image-rendering:pixelated;${p => p.$fainted && 'filter:grayscale(1) brightness(0.5);'}${p => p.$flip && 'transform:scaleX(-1);'}`;
const Fallback = styled.div<{ $team: 'my' | 'opp' }>`width:60px;height:60px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:12px;font-weight:800;background:${p => p.$team === 'my' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'};color:${p => p.$team === 'my' ? '#4ade80' : '#f87171'};`;
const UnitName = styled.div`font-size:9px;color:rgba(255,255,255,0.6);font-weight:700;margin-top:2px;text-shadow:0 1px 2px rgba(0,0,0,0.8);`;
const FloatEl = styled.div`position:absolute;z-index:50;font-size:18px;font-weight:900;pointer-events:none;animation:${floatUp} 1s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;transform:translateX(-50%);text-shadow:0 2px 8px rgba(0,0,0,0.9);`;

const EmptyMsg = styled.div`padding:30px;text-align:center;color:rgba(255,255,255,0.15);font-size:11px;font-weight:600;font-style:italic;`;
const Hint = styled.div`margin-top:12px;font-size:9px;color:rgba(255,255,255,0.2);text-align:center;line-height:1.5;padding:0 8px;`;

const RevealOverlay = styled.div`position:absolute;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);`;
const RevealText = styled.div`color:#fbbf24;font-size:40px;font-weight:900;text-shadow:0 0 30px rgba(251,191,36,0.5);animation:${revealPulse} 1s infinite;`;

const TypeBadge = styled.span<{ $type?: string }>`font-size:8px;padding:2px 5px;border-radius:4px;background:${p => getTypeColor(p.$type)};color:#fff;font-weight:900;text-transform:uppercase;`;

function getTypeColor(type?: string) {
  const colors: Record<string, string> = {
    fire: '#ef4444', water: '#3b82f6', grass: '#22c55e', electric: '#eab308', ice: '#6ee7b7', fighting: '#f97316',
    poison: '#a855f7', ground: '#78350f', flying: '#818cf8', psychic: '#ec4899', bug: '#84cc16', rock: '#71717a',
    ghost: '#6366f1', dragon: '#4f46e5', dark: '#1f2937', steel: '#94a3b8', fairy: '#f472b6', normal: '#9ca3af'
  };
  return colors[type?.toLowerCase() || ''] || 'rgba(255,255,255,0.1)';
}

// 최초 달성: 2.5s 슬라이드인→유지→페이드아웃 (작고 빠름)
const achSlideIn = keyframes`0%{opacity:0;transform:translateX(40px);}12%{opacity:1;transform:translateX(0);}72%{opacity:1;transform:translateX(0);}100%{opacity:0;transform:translateX(20px);}`;
// 반복 달성: 1.5s 빠른 페이드
const achSlideInRepeat = keyframes`0%{opacity:0;transform:translateX(16px);}12%{opacity:0.6;transform:translateX(0);}72%{opacity:0.6;}100%{opacity:0;}`;

const AchievementToastPill = styled.div<{ $color: string; $first: boolean }>`
  position: absolute; top: 10px; right: 10px; z-index: 1002;
  display: flex; align-items: center; gap: 6px;
  padding: ${p => p.$first ? '7px 14px' : '5px 11px'};
  border-radius: 20px;
  background: rgba(55,55,70,0.92);
  border: 1px solid ${p => p.$color}${p => p.$first ? '99' : '55'};
  font-size: ${p => p.$first ? '12px' : '11px'};
  font-weight: 700;
  color: rgba(255,255,255,${p => p.$first ? '0.92' : '0.65'});
  animation: ${p => p.$first ? achSlideIn : achSlideInRepeat} ${p => p.$first ? '2.5s' : '1.5s'} ease forwards;
  pointer-events: none;
  white-space: nowrap;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  backdrop-filter: blur(6px);
  box-shadow: 0 2px 12px rgba(0,0,0,0.5);
`;

const AchPillName = styled.span<{ $first: boolean }>`color:rgba(255,255,255,${p => p.$first ? '0.88' : '0.55'});overflow:hidden;text-overflow:ellipsis;`;
const AchPillAP = styled.span<{ $color: string }>`color:${p => p.$color};font-size:10px;font-weight:700;flex-shrink:0;opacity:0.85;`;