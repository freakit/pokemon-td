// src/components/Multiplayer/TFTBattleArena.tsx
// 6x6 TFT 스타일 배틀 (수정 버전 v3)
// ──────────────────────────────────────────────────────────────────
// [FIX-1] 전투 루프 유닛 순회를 캐노니컬 순서로 통일
//   - 기존: `for (const unit of next)` → next 배열 순서가 양측 클라이언트에서 다름
//   - 수정: L팀(col 0-1) 유닛 → R팀(col 4-5) 유닛 순서로 고정 순회
//     양측 모두 물리적 위치 기준이므로 my/opp 라벨과 무관하게 동일한 RNG 소비 순서 보장
// [FIX-2] 전투 루프 내 side-effect(setFloats, setTimeout) 제거 → 순수 상태 업데이트만 수행
//   - 기존: setUnits 콜백 안에서 setTimeout, setFloats 호출 → 비결정론적 타이밍
//   - 수정: floats를 units 밖에서 별도 ref로 관리, isAtk/isHit 리셋을 별도 interval로 분리

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { multiplayerService } from '../../services/MultiplayerService';
import { TowerDetail } from '../../types/multiplayer';
import { getTypeEffectiveness } from '../../utils/typeEffectiveness';
import { calculateActiveSynergies, getBuffedStats } from '../../utils/synergyManager';
import { GamePokemon, Synergy } from '../../types/game';
import { useGameStore } from '../../store/gameStore';

const COLS = 6;
const ROWS = 6;
const CELL = 88;
const POKE_SIZE = 60;
const ATTACK_RANGE = 1.4;
const MOVE_SPEED = 1.0;
const ATK_COOLDOWN = 1.3;
const FPS = 30;

const PREP_TIME = 30; // 준비 시간 (초)
const REVEAL_TIME = 5; // 공개 → 배틀 시작까지 (초)

// ── 시드 기반 결정론적 랜덤 (mulberry32) ──
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Unit {
  id: string;
  detail: TowerDetail;
  team: 'my' | 'opp';
  x: number; // -1 = 벤치(미배치)
  y: number;
  hp: number;
  maxHp: number;
  atkCd: number;
  fainted: boolean;
  isAtk: boolean;
  isHit: boolean;
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
  battleResult?: unknown;
  battleSeed?: number;
  isHost?: boolean;
  onBattleComplete?: (result: TFTBattleResult) => void;
}

// 상대 기본 배치 위치 (상대는 자동 배치)
const L_POS = [
  { x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 },
  { x: 1, y: 3 }, { x: 0, y: 4 }, { x: 1, y: 5 },
];
const R_POS = [
  { x: 5, y: 0 }, { x: 4, y: 1 }, { x: 5, y: 2 },
  { x: 4, y: 3 }, { x: 5, y: 4 }, { x: 4, y: 5 },
];

function calcDmg(a: Unit, d: Unit, rng: () => number): number {
  const atk = a.detail.attack ?? a.detail.level * 10;
  const def = d.detail.defense ?? d.detail.level * 5;
  const types = a.detail.types ?? [];
  const dTypes = d.detail.types ?? [];
  
  let power = 50 + a.detail.level;
  const moves = a.detail.equippedMoves;
  if (moves && moves.length > 0) {
    if (rng() < 0.3) {
      power = Math.max(...moves.map(m => m.power || 0));
    } else {
      const idx = Math.floor(rng() * moves.length);
      power = moves[idx].power || power;
    }
    power = Math.max(30, power);
  }

  const lvl = a.detail.level;
  const eff = getTypeEffectiveness(types[0] ?? 'normal', dTypes);
  const base = ((2 * lvl / 5 + 2) * power * atk / Math.max(def, 1)) / 50 + 2;
  return Math.max(1, Math.floor(base * eff * (0.85 + rng() * 0.15)));
}

function dst(a: Unit, b: Unit) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ── [FIX-1] 캐노니컬 순서 생성 헬퍼 ──
// 양측 클라이언트에서 동일한 순서를 보장하기 위해
// "L팀(col 0-1) 유닛 → R팀(col 4-5) 유닛" 순서로 정렬
// 각 팀 내에서는 유닛 ID의 인덱스(숫자 부분) 순서
function buildCanonicalOrder(units: Unit[], myPosition: 'L' | 'R'): Unit[] {
  const alive = (u: Unit) => !u.fainted && u.hp > 0 && u.x >= 0;
  const aliveUnits = units.filter(u => alive(u));

  // L팀: myPosition=L이면 'my', myPosition=R이면 'opp'
  const lTeam = aliveUnits
    .filter(u => (myPosition === 'L' ? u.team === 'my' : u.team === 'opp'))
    .sort((a, b) => parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1]));

  // R팀: myPosition=R이면 'my', myPosition=L이면 'opp'
  const rTeam = aliveUnits
    .filter(u => (myPosition === 'R' ? u.team === 'my' : u.team === 'opp'))
    .sort((a, b) => parseInt(a.id.split('-')[1]) - parseInt(b.id.split('-')[1]));

  return [...lTeam, ...rTeam];
}

function buildUnits(
  myTeam: TowerDetail[],
  oppTeam: TowerDetail[],
  myPos: 'L' | 'R',
  rng: () => number,
  mySynergies: Synergy[],
  oppSynergies: Synergy[]
): Unit[] {
  const units: Unit[] = [];
  const oppDefaults = myPos === 'L' ? R_POS : L_POS;

  myTeam.slice(0, 6).forEach((d, i) => {
    const p = d as unknown as GamePokemon;
    const buffed = getBuffedStats(p, mySynergies);
    const detailWithSynergy = { ...d, ...buffed };

    units.push({
      id: `my-${i}`,
      detail: detailWithSynergy,
      team: 'my',
      x: -1,
      y: i,
      hp: d.currentHp > 0 ? d.currentHp : d.maxHp,
      maxHp: d.maxHp > 0 ? d.maxHp : 100,
      atkCd: rng() * 0.5,
      fainted: !!d.isFainted,
      isAtk: false,
      isHit: false,
    });
  });

  oppTeam.slice(0, 6).forEach((d, i) => {
    const p = d as unknown as GamePokemon;
    const buffed = getBuffedStats(p, oppSynergies);
    const detailWithSynergy = { ...d, ...buffed };
    const pos = oppDefaults[i] ?? { x: myPos === 'L' ? 4 + (i % 2) : i % 2, y: i };
    
    units.push({
      id: `op-${i}`,
      detail: detailWithSynergy,
      team: 'opp',
      x: pos.x,
      y: pos.y,
      hp: d.currentHp > 0 ? d.currentHp : d.maxHp,
      maxHp: d.maxHp > 0 ? d.maxHp : 100,
      atkCd: rng() * 0.5,
      fainted: !!d.isFainted,
      isAtk: false,
      isHit: false,
    });
  });
  return units;
}

export const TFTBattleArena: React.FC<TFTBattleArenaProps> = ({
  roomId, myUserId, opponentId, myTeam, opponentTeam, opponentName, myPosition, phase, battleSeed, battleResult: battleResultProp, isHost = true, onBattleComplete,
}) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [floats, setFloats] = useState<FloatTxt[]>([]);
  const [battleState, setBattleState] = useState<'idle' | 'reveal' | 'fighting' | 'done'>('idle');
  const [winnerText, setWinnerText] = useState<string | null>(null);
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(PREP_TIME);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const floatIdRef = useRef(0);
  const initRef = useRef({ my: -1, op: -1 });
  const rngRef = useRef<() => number>(() => Math.random());
  const resultReportedRef = useRef(false);
  const hasSubmittedRef = useRef(false);
  const lastTickRef = useRef<number>(Date.now());
  const nonHostCompletedRef = useRef(false);
  // [FIX-2] 보류 중인 floats를 ref로 관리 (setUnits 콜백 외부에서 배치 적용)
  const pendingFloatsRef = useRef<FloatTxt[]>([]);
  
  const [remotePlacements, setRemotePlacements] = useState<Map<string, { id: string, x: number, y: number }[]>>(new Map());

  useEffect(() => {
    if (!roomId) return;
    const unsub = multiplayerService.onAllTFTPlacementsUpdate(roomId, (placementsMap) => {
      setRemotePlacements(placementsMap);
    });
    return unsub;
  }, [roomId]);

  const myCols = myPosition === 'L' ? [0, 1] : [4, 5];
  const oppCols = myPosition === 'L' ? [4, 5] : [0, 1];

  const benchUnits = units.filter(u => u.team === 'my' && u.x === -1 && !u.fainted);
  const placedMyUnits = units.filter(u => u.team === 'my' && u.x >= 0 && !u.fainted);

  useEffect(() => {
    const seed = battleSeed ?? Date.now();
    rngRef.current = mulberry32(seed);
  }, [battleSeed]);

  const mySynergies = useMemo(() => {
    return calculateActiveSynergies(myTeam as unknown as GamePokemon[]);
  }, [myTeam]);
  const oppSynergies = useMemo(() => {
    return calculateActiveSynergies(opponentTeam as unknown as GamePokemon[]);
  }, [opponentTeam]);

  useEffect(() => {
    if (phase !== 'result') {
      useGameStore.setState({ activeSynergies: mySynergies });
    }
  }, [mySynergies, phase]);

  useEffect(() => {
    if (myTeam.length === 0 && opponentTeam.length === 0) return;
    if (
      initRef.current.my === myTeam.length &&
      initRef.current.op === opponentTeam.length &&
      units.length > 0
    ) return;
    initRef.current = { my: myTeam.length, op: opponentTeam.length };
    resultReportedRef.current = false;
    hasSubmittedRef.current = false;
    const seed = battleSeed ?? Date.now();
    const rng = mulberry32(seed);
    rngRef.current = rng;
    setUnits(buildUnits(myTeam, opponentTeam, myPosition, rng, mySynergies, oppSynergies));
    setBattleState('idle');
    setWinnerText(null);
    setFloats([]);
    setDragId(null);
    setSelectedBenchId(null);
    setCountdown(PREP_TIME);
  }, [myTeam, opponentTeam, myPosition, battleSeed, mySynergies, oppSynergies]);

  // ── 준비 페이즈 카운트다운 (30초) ──
  useEffect(() => {
    if (phase !== 'prep' || battleState !== 'idle') return;
    if (countdownRef.current) clearInterval(countdownRef.current);

    setCountdown(PREP_TIME);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          autoPlaceRemainingUnits();
          setBattleState('reveal');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [phase, battleState]);

  // ── 미배치 유닛 자동 배치 ──
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
          const key = `${pos.x},${pos.y}`;
          if (!usedPositions.has(key)) {
            unit.x = pos.x;
            unit.y = pos.y;
            usedPositions.add(key);
            defaultIdx++;
            break;
          }
          defaultIdx++;
        }

        if (unit.x === -1) {
          for (let col of myCols) {
            for (let row = 0; row < ROWS; row++) {
              const key = `${col},${row}`;
              if (!usedPositions.has(key)) {
                unit.x = col;
                unit.y = row;
                usedPositions.add(key);
                break;
              }
            }
            if (unit.x >= 0) break;
          }
        }
      }

      return next;
    });
  }, [myPosition, myCols]);

  // ── 내 배치를 Firebase에 업로드 ──
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

  // ── 공개 페이즈 (5초) → 배틀 시작 ──
  useEffect(() => {
    if (battleState !== 'reveal') return;
    
    const isOpponentAI = opponentId?.startsWith('ai_');
    const oppPlacements = opponentId ? remotePlacements.get(opponentId) : null;
    const isOpponentReady = isOpponentAI || (oppPlacements && oppPlacements.length > 0);
    
    if (!isOpponentReady) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(REVEAL_TIME);
      return;
    }

    if (!isOpponentAI && oppPlacements && oppPlacements.length > 0) {
      setUnits(prev => {
        let changed = false;
        const next = prev.map(u => {
          if (u.team === 'opp') {
            const matchIndex = parseInt(u.id.split('-')[1]);
            const placement = oppPlacements[matchIndex];
            if (placement && (u.x !== placement.x || u.y !== placement.y)) {
              changed = true;
              return { ...u, x: placement.x, y: placement.y };
            }
          }
          return u;
        });
        return changed ? next : prev;
      });
    }

    if (countdownRef.current) clearInterval(countdownRef.current);

    setCountdown(REVEAL_TIME);

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;

          // ★ 캐노니컬 전투 초기화
          const seed = battleSeed ?? Date.now();
          const battleRng = mulberry32(seed + 99999);
          rngRef.current = battleRng;

          setUnits(currentUnits => {
            const withOppPos = currentUnits.map(u => {
              if (u.team === 'opp' && !isOpponentAI && oppPlacements && oppPlacements.length > 0) {
                const idx = parseInt(u.id.split('-')[1]);
                const pl = oppPlacements[idx];
                if (pl) return { ...u, x: pl.x, y: pl.y };
              }
              return u;
            });

            const lTeam = withOppPos.filter(u =>
              (myPosition === 'L' ? u.team === 'my' : u.team === 'opp')
              && u.x >= 0 && !u.fainted
            );
            const rTeam = withOppPos.filter(u =>
              (myPosition === 'R' ? u.team === 'my' : u.team === 'opp')
              && u.x >= 0 && !u.fainted
            );

            const atkCdMap = new Map<string, number>();
            for (const u of [...lTeam, ...rTeam]) {
              atkCdMap.set(u.id, battleRng() * 0.5);
            }

            return withOppPos.map(u => {
              if (atkCdMap.has(u.id)) {
                return { ...u, atkCd: atkCdMap.get(u.id)! };
              }
              return { ...u, fainted: true };
            });
          });

          setBattleState('fighting');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [battleState, battleSeed, opponentId, remotePlacements]);

  // ── 외부 phase='battle'에 의한 강제 전환 ──
  useEffect(() => {
    if (phase === 'battle' && battleState === 'idle') {
      if (countdownRef.current) clearInterval(countdownRef.current);
      autoPlaceRemainingUnits();
      setBattleState('reveal');
    }
  }, [phase, battleState, autoPlaceRemainingUnits]);

  // ── 비호스트: Firebase battleResult 수신 → 자동 완료 처리 ──
  useEffect(() => {
    if (isHost) return;
    if (!battleResultProp) return;
    if (nonHostCompletedRef.current) return;
    nonHostCompletedRef.current = true;
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    setBattleState('done');
    console.log('[TFTBattleArena] Non-host: Firebase battle result received, stopping local loop');
  }, [isHost, battleResultProp]);

  // ── [FIX-1] 배틀 루프 — 캐노니컬 순서 적용 ──
  useEffect(() => {
    if (battleState !== 'fighting') return;
    if (loopRef.current) clearInterval(loopRef.current);

    const rng = rngRef.current;
    lastTickRef.current = Date.now();

    const onVisibility = () => {
      if (!document.hidden) {
        lastTickRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    loopRef.current = setInterval(() => {
      const realDt = 1 / FPS;

      setUnits(prev => {
        const next = prev.map(u => ({ ...u, isAtk: false, isHit: false }));
        const alive = (u: Unit) => !u.fainted && u.hp > 0 && u.x >= 0;
        const myAlive = next.filter(u => u.team === 'my' && alive(u));
        const oppAlive = next.filter(u => u.team === 'opp' && alive(u));

        if (myAlive.length === 0 || oppAlive.length === 0) {
          if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }

          const myWon = myAlive.length > 0;
          const winTeam = myWon ? 'my' : 'opp';
          setBattleState('done');
          setWinnerText(winTeam === 'my' ? '🏆 내 팀 승리!' : `💀 ${opponentName} 승리!`);

          if (!resultReportedRef.current && isHost) {
            resultReportedRef.current = true;

            const p1Alive = next.filter(u => {
              const isP1 = (myPosition === 'L' && u.team === 'my') || (myPosition === 'R' && u.team === 'opp');
              return isP1 && !u.fainted && u.hp > 0 && u.x >= 0;
            }).length;
            const p2Alive = next.filter(u => {
              const isP2 = (myPosition === 'R' && u.team === 'my') || (myPosition === 'L' && u.team === 'opp');
              return isP2 && !u.fainted && u.hp > 0 && u.x >= 0;
            }).length;

            const winner: 'player1' | 'player2' = p1Alive > 0 ? 'player1' : 'player2';

            onBattleComplete?.({
              winner,
              player1Remaining: p1Alive,
              player2Remaining: p2Alive,
            });
          }

          return prev;
        }

        // ★ [FIX-1] 캐노니컬 순서로 유닛 순회
        // L팀(col 0-1) → R팀(col 4-5), 각 팀 내 인덱스순
        // 양측 클라이언트에서 동일한 순서로 RNG를 소비
        const canonicalOrder = buildCanonicalOrder(next, myPosition);

        const newFloats: FloatTxt[] = [];

        for (const unitRef of canonicalOrder) {
          // canonicalOrder는 next 배열의 같은 객체 참조이므로 직접 수정 가능
          const unit = next.find(u => u.id === unitRef.id)!;
          if (!alive(unit)) continue;
          const enemies = unit.team === 'my'
            ? next.filter(u => u.team === 'opp' && alive(u))
            : next.filter(u => u.team === 'my' && alive(u));
          if (!enemies.length) continue;

          let target = enemies[0];
          let minD = Infinity;
          for (const e of enemies) {
            const d = dst(unit, e);
            if (d < minD) { minD = d; target = e; }
          }

          unit.atkCd = Math.max(0, unit.atkCd - realDt);

          if (minD <= ATTACK_RANGE) {
            if (unit.atkCd <= 0) {
              unit.isAtk = true;
              unit.atkCd = ATK_COOLDOWN;
              const t2 = next.find(u => u.id === target.id);
              if (t2 && alive(t2)) {
                const dmg = calcDmg(unit, t2, rng);
                
                // AoE
                const aoeRatio = unit.detail.aoeBonus || 0;
                if (aoeRatio > 0 && enemies.length > 1) {
                  const splashRange = 1.6;
                  const splashDmg = Math.floor(dmg * aoeRatio);
                  for (const e of enemies) {
                    if (e.id === t2.id) continue;
                    if (dst(t2, e) <= splashRange) {
                      const spTarget = next.find(u => u.id === e.id);
                      if (spTarget && alive(spTarget)) {
                        spTarget.hp = Math.max(0, spTarget.hp - splashDmg);
                        spTarget.isHit = true;
                        if (spTarget.hp <= 0) spTarget.fainted = true;
                        newFloats.push({
                          id: ++floatIdRef.current,
                          text: `-${splashDmg}`,
                          x: spTarget.x * CELL + CELL / 2 + 10,
                          y: spTarget.y * CELL - 10,
                          color: '#e67e22',
                        });
                      }
                    }
                  }
                }

                // Main damage
                t2.hp = Math.max(0, t2.hp - dmg);
                t2.isHit = true;
                if (t2.hp <= 0) t2.fainted = true;
                newFloats.push({
                  id: ++floatIdRef.current,
                  text: `-${dmg}`,
                  x: t2.x * CELL + CELL / 2,
                  y: t2.y * CELL,
                  color: t2.team === 'my' ? '#ff6b6b' : '#ffd93d',
                });

                // Life Steal
                const lsRatio = unit.detail.lifesteal || 0;
                if (lsRatio > 0) {
                  const healAmount = Math.floor(dmg * lsRatio);
                  if (healAmount > 0 && unit.hp < unit.maxHp) {
                    unit.hp = Math.min(unit.maxHp, unit.hp + healAmount);
                    newFloats.push({
                      id: ++floatIdRef.current,
                      text: `+${healAmount}`,
                      x: unit.x * CELL + CELL / 2,
                      y: unit.y * CELL - 15,
                      color: '#2ecc71',
                    });
                  }
                }
              }
            }
          } else {
            unit.isAtk = false;
            const dx = target.x - unit.x;
            const dy = target.y - unit.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0.01) {
              unit.x = Math.max(0, Math.min(COLS - 1, unit.x + (dx / len) * MOVE_SPEED * realDt));
              unit.y = Math.max(0, Math.min(ROWS - 1, unit.y + (dy / len) * MOVE_SPEED * realDt));
            }
          }
        }

        // [FIX-2] floats를 setUnits 외부에서 처리하기 위해 ref에 축적
        if (newFloats.length > 0) {
          pendingFloatsRef.current = [...pendingFloatsRef.current, ...newFloats];
        }

        return next;
      });

      // [FIX-2] setUnits 콜백 밖에서 floats 적용
      if (pendingFloatsRef.current.length > 0) {
        const batch = pendingFloatsRef.current;
        pendingFloatsRef.current = [];
        setFloats(f => [...f, ...batch]);
        setTimeout(() => setFloats(f => f.slice(batch.length)), 850);
      }
    }, 1000 / FPS);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [battleState, opponentName, onBattleComplete, myPosition, battleSeed, isHost]);

  useEffect(() => () => { if (loopRef.current) clearInterval(loopRef.current); }, []);

  // ── 벤치 유닛 클릭 → 선택 ──
  const handleBenchClick = (unitId: string) => {
    if (battleState !== 'idle' || phase !== 'prep') return;
    setSelectedBenchId(prev => prev === unitId ? null : unitId);
    setDragId(null);
  };

  // ── 셀 클릭: 배치 또는 이동 ──
  const handleCellClick = (col: number, row: number) => {
    if (phase !== 'prep' || battleState !== 'idle' || !myCols.includes(col)) return;

    if (selectedBenchId) {
      const occ = units.find(u => u.team === 'my' && u.x >= 0 && Math.round(u.x) === col && Math.round(u.y) === row);
      if (occ) return;
      setUnits(prev => prev.map(u => {
        if (u.id === selectedBenchId) return { ...u, x: col, y: row };
        return u;
      }));
      setSelectedBenchId(null);
      return;
    }

    if (dragId) {
      const occ = units.find(u => u.team === 'my' && u.x >= 0 && Math.round(u.x) === col && Math.round(u.y) === row);
      setUnits(prev => prev.map(u => {
        if (u.id === dragId) return { ...u, x: col, y: row };
        if (occ && u.id === occ.id) {
          const src = prev.find(p => p.id === dragId)!;
          return { ...u, x: src.x, y: src.y };
        }
        return u;
      }));
      setDragId(null);
    } else {
      const clicked = units.find(u => u.team === 'my' && u.x >= 0 && Math.round(u.x) === col && Math.round(u.y) === row);
      if (clicked && !clicked.fainted) {
        setDragId(p => p === clicked.id ? null : clicked.id);
        setSelectedBenchId(null);
      }
    }
  };

  // ── 보드에서 유닛을 벤치로 되돌리기 ──
  const handleReturnToBench = (unitId: string) => {
    if (phase !== 'prep' || battleState !== 'idle') return;
    setUnits(prev => prev.map(u => {
      if (u.id === unitId) return { ...u, x: -1, y: units.filter(u2 => u2.team === 'my' && u2.x === -1).length };
      return u;
    }));
    setDragId(null);
  };

  const boardW = COLS * CELL;
  const boardH = ROWS * CELL;
  const isPrep = phase === 'prep' && battleState === 'idle';
  const isReveal = battleState === 'reveal';

  if (myTeam.length === 0 && opponentTeam.length === 0) {
    return (
      <Wrap>
        <TopBar>
          <ArenaTitle>⚔️ TFT 배틀 아레나</ArenaTitle>
          <PhaseTag $color="#fbbf24">⏳ 로딩 중...</PhaseTag>
        </TopBar>
        <LoadBox style={{ width: boardW, height: boardH }}>
          <LoadMsg>포켓몬 정보를 불러오는 중입니다 🎮</LoadMsg>
        </LoadBox>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <TopBar>
        <ArenaTitle>⚔️ TFT 배틀 아레나</ArenaTitle>
        {isPrep && (
          <PhaseTag $color="#4fc3f7">
            🛡️ 준비 ({countdown}초) — {myPosition === 'L' ? '좌측' : '우측'} 2열에 배치
          </PhaseTag>
        )}
        {isReveal && (
          <PhaseTag $color="#fbbf24">
            👁️ 배치 공개! {countdown}초 후 배틀 시작
          </PhaseTag>
        )}
        {battleState === 'fighting' && <PhaseTag $color="#ff6b6b">🔥 배틀 중!</PhaseTag>}
        {winnerText && <WinTag>{winnerText}</WinTag>}
      </TopBar>

      <PositionBar>
        <PosLabel $isMe={myPosition === 'L'}>
          {myPosition === 'L' ? '👤 나 (L)' : `👤 ${opponentName} (L)`}
        </PosLabel>
        <PosVS>VS</PosVS>
        <PosLabel $isMe={myPosition === 'R'}>
          {myPosition === 'R' ? '👤 나 (R)' : `👤 ${opponentName} (R)`}
        </PosLabel>
      </PositionBar>

      <ContentRow>
        {isPrep && myPosition === 'L' && (
          <BenchArea>
            <BenchTitle>
              📦 내 타워 벤치 ({benchUnits.length})
              {placedMyUnits.length > 0 && <span style={{display: 'block', fontSize: '11px', color: '#ffea00'}}>🟢 배치됨: {placedMyUnits.length}</span>}
            </BenchTitle>
            <BenchGrid>
              {benchUnits.map(unit => (
                <BenchCard key={unit.id} $selected={selectedBenchId === unit.id} onClick={() => handleBenchClick(unit.id)}>
                  {unit.detail.sprite ? <BenchSprite src={unit.detail.sprite} alt={unit.detail.name} /> : <BenchFallback>{unit.detail.name?.slice(0, 2) ?? '?'}</BenchFallback>}
                  <BenchName>{unit.detail.name}</BenchName>
                  <BenchStats>Lv.{unit.detail.level}</BenchStats>
                </BenchCard>
              ))}
              {benchUnits.length === 0 && <BenchEmptyMsg>✅ 모두 배치 완료</BenchEmptyMsg>}
            </BenchGrid>
            <Hint>클릭 → 게임판 빈칸 배치<br/>게임판 타워 우클릭 → 회수</Hint>
          </BenchArea>
        )}
        {isPrep && myPosition === 'R' && (
          <OpponentInfoPanel>
            <InfoTitle>🔍 상대 타워 ({opponentName})</InfoTitle>
            <InfoGrid>
              {opponentTeam.slice(0, 6).map((t, i) => (
                <InfoCard key={i}>
                  {t.sprite ? <InfoSprite src={t.sprite} alt={t.name} /> : <InfoFallback>{t.name?.slice(0, 2) ?? '?'}</InfoFallback>}
                  <InfoName>{t.name}</InfoName>
                  <InfoStats>Lv.{t.level} | HP {t.maxHp}</InfoStats>
                  {t.types && t.types.length > 0 && <InfoTypes>{t.types.map(type => <TypeBadge key={type}>{type}</TypeBadge>)}</InfoTypes>}
                </InfoCard>
              ))}
            </InfoGrid>
          </OpponentInfoPanel>
        )}

        <Board style={{ width: boardW, height: boardH }}>
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => {
              const isMyZone = myCols.includes(col);
              const isOppZone = oppCols.includes(col);
              const zone: 'my' | 'opp' | 'mid' = isMyZone ? 'my' : isOppZone ? 'opp' : 'mid';
              const hasMyUnit = units.some(u => u.team === 'my' && u.x >= 0 && Math.round(u.x) === col && Math.round(u.y) === row);
              const isPlaceable = isPrep && isMyZone && !hasMyUnit && (selectedBenchId !== null || dragId !== null);
              return (
                <Cell key={`${col}-${row}`} style={{ left: col * CELL, top: row * CELL, width: CELL, height: CELL }}
                  $zone={zone} $isTarget={isPlaceable} $disabled={!isMyZone && isPrep}
                  onClick={() => handleCellClick(col, row)} />
              );
            })
          )}

          <VertDivider style={{ left: 2 * CELL }} />
          <VertDivider style={{ left: 4 * CELL }} />

          <ZoneLbl style={{ top: 4, left: 8, color: myPosition === 'L' ? 'rgba(100,255,160,0.85)' : 'rgba(255,110,110,0.85)' }}>
            {myPosition === 'L' ? '👤 나' : `👤 ${opponentName}`}
          </ZoneLbl>
          <ZoneLbl style={{ top: 4, right: 8, color: myPosition === 'R' ? 'rgba(100,255,160,0.85)' : 'rgba(255,110,110,0.85)' }}>
            {myPosition === 'R' ? '👤 나' : `👤 ${opponentName}`}
          </ZoneLbl>

          {units.map(unit => {
            if (unit.x < 0) return null;
            if (isPrep && unit.team === 'opp') return null;

            const px = unit.x * CELL + CELL / 2 - POKE_SIZE / 2;
            const py = unit.y * CELL + CELL / 2 - POKE_SIZE / 2;
            const hpPct = Math.max(0, unit.hp / unit.maxHp);
            return (
              <UnitWrap key={unit.id}
                style={{ left: px, top: py, width: POKE_SIZE, transition: battleState === 'fighting' ? 'left 0.033s linear, top 0.033s linear' : 'left 0.15s ease, top 0.15s ease' }}
                $team={unit.team} $fainted={unit.fainted} $hit={unit.isHit} $atk={unit.isAtk} $sel={dragId === unit.id}
                onClick={() => { if (isPrep && unit.team === 'my' && !unit.fainted) { setDragId(p => p === unit.id ? null : unit.id); setSelectedBenchId(null); } }}
                onContextMenu={(e) => { e.preventDefault(); if (isPrep && unit.team === 'my') handleReturnToBench(unit.id); }}>
                <HpBg><HpFill style={{ width: `${hpPct * 100}%`, background: hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f1c40f' : '#e74c3c' }} /></HpBg>
                {unit.detail.sprite ? <Sprite src={unit.detail.sprite} alt={unit.detail.name} $fainted={unit.fainted} $flip={unit.team === 'opp'} /> : <Fallback $team={unit.team}>{unit.detail.name?.slice(0, 2).toUpperCase() ?? '?'}</Fallback>}
                <UnitName>{unit.detail.name}</UnitName>
              </UnitWrap>
            );
          })}

          {floats.map(f => <FloatEl key={f.id} style={{ left: f.x, top: f.y, color: f.color }}>{f.text}</FloatEl>)}

          {isReveal && <RevealOverlay><RevealText>⚔️ 배틀 시작까지 {countdown}초</RevealText></RevealOverlay>}
        </Board>

        {isPrep && myPosition === 'L' && (
          <OpponentInfoPanel>
            <InfoTitle>🔍 상대 타워 ({opponentName})</InfoTitle>
            <InfoGrid>
              {opponentTeam.slice(0, 6).map((t, i) => (
                <InfoCard key={i}>
                  {t.sprite ? <InfoSprite src={t.sprite} alt={t.name} /> : <InfoFallback>{t.name?.slice(0, 2) ?? '?'}</InfoFallback>}
                  <InfoName>{t.name}</InfoName>
                  <InfoStats>Lv.{t.level} | HP {t.maxHp}</InfoStats>
                  {t.types && t.types.length > 0 && <InfoTypes>{t.types.map(type => <TypeBadge key={type}>{type}</TypeBadge>)}</InfoTypes>}
                </InfoCard>
              ))}
            </InfoGrid>
          </OpponentInfoPanel>
        )}
        {isPrep && myPosition === 'R' && (
          <BenchArea>
            <BenchTitle>
              📦 내 타워 벤치 ({benchUnits.length})
              {placedMyUnits.length > 0 && <span style={{display: 'block', fontSize: '11px', color: '#ffea00'}}>🟢 배치됨: {placedMyUnits.length}</span>}
            </BenchTitle>
            <BenchGrid>
              {benchUnits.map(unit => (
                <BenchCard key={unit.id} $selected={selectedBenchId === unit.id} onClick={() => handleBenchClick(unit.id)}>
                  {unit.detail.sprite ? <BenchSprite src={unit.detail.sprite} alt={unit.detail.name} /> : <BenchFallback>{unit.detail.name?.slice(0, 2) ?? '?'}</BenchFallback>}
                  <BenchName>{unit.detail.name}</BenchName>
                  <BenchStats>Lv.{unit.detail.level}</BenchStats>
                </BenchCard>
              ))}
              {benchUnits.length === 0 && <BenchEmptyMsg>✅ 모두 배치 완료</BenchEmptyMsg>}
            </BenchGrid>
            <Hint>클릭 → 게임판 빈칸 배치<br/>게임판 타워 우클릭 → 회수</Hint>
          </BenchArea>
        )}
      </ContentRow>
    </Wrap>
  );
};

// ── 스타일 ──────────────────────────────────────────────────────

const floatUp = keyframes`
  0%  { opacity:1; transform:translateX(-50%) translateY(0); }
  100%{ opacity:0; transform:translateX(-50%) translateY(-42px); }
`;
const hitFlash = keyframes`
  0%,100%{ filter:brightness(1); }
  40%    { filter:brightness(2.2) saturate(0); }
`;
const atkBounce = keyframes`
  0%,100%{ transform:scale(1); }
  50%    { transform:scale(1.18); }
`;
const fadeIn = keyframes`
  from{ opacity:0; transform:translateY(-10px); }
  to  { opacity:1; transform:translateY(0); }
`;
const revealPulse = keyframes`
  0%,100% { opacity: 0.9; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
`;
const benchPulse = keyframes`
  0%,100% { box-shadow: 0 0 0 0 rgba(79,195,247,0.4); }
  50% { box-shadow: 0 0 0 6px rgba(79,195,247,0); }
`;

const Wrap = styled.div`flex:1;display:flex;flex-direction:column;align-items:center;background:radial-gradient(ellipse at center,#1a1a2e 0%,#0d0d1a 100%);padding:14px;padding-bottom:80px;overflow:auto;animation:${fadeIn} 0.35s ease;width:100%;`;
const ContentRow = styled.div`display:flex;flex-direction:row;align-items:center;justify-content:center;gap:20px;width:100%;min-width:max-content;`;
const TopBar = styled.div`display:flex;align-items:center;gap:14px;margin-bottom:10px;flex-wrap:wrap;justify-content:center;`;
const ArenaTitle = styled.div`color:#fff;font-size:17px;font-weight:800;letter-spacing:2px;`;
const PhaseTag = styled.div<{ $color: string }>`color:${p => p.$color};font-size:12px;font-weight:600;padding:3px 11px;border-radius:20px;border:1px solid ${p => p.$color}44;background:${p => p.$color}11;`;
const WinTag = styled.div`color:#fbbf24;font-size:17px;font-weight:900;text-shadow:0 0 18px rgba(251,191,36,0.6);animation:${atkBounce} 1s ease infinite;`;
const Board = styled.div`position:relative;border:2px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;background-image:linear-gradient(rgba(255,255,255,0.1),rgba(255,255,255,0.1)),url('/images/maps/battle_field.png');background-size:cover;background-position:center;flex-shrink:0;min-width:${COLS * CELL}px;min-height:${ROWS * CELL}px;`;
const LoadBox = styled.div`display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.1);border-radius:8px;background:rgba(0,0,0,0.4);`;
const LoadMsg = styled.div`color:rgba(255,255,255,0.45);font-size:14px;text-align:center;line-height:1.7;`;
const Cell = styled.div<{ $zone: 'my' | 'opp' | 'mid'; $isTarget: boolean; $disabled: boolean }>`
  position:absolute;box-sizing:border-box;
  border:1px solid ${p => p.$zone === 'my' ? 'rgba(0,255,128,0.07)' : p.$zone === 'opp' ? 'rgba(255,80,80,0.07)' : 'rgba(255,255,255,0.04)'};
  background:${p => p.$isTarget ? 'rgba(0,255,128,0.22)' : p.$zone === 'my' ? 'rgba(0,80,40,0.08)' : p.$zone === 'opp' ? 'rgba(80,0,0,0.08)' : 'rgba(255,255,255,0.02)'};
  cursor:${p => p.$isTarget ? 'crosshair' : p.$disabled ? 'not-allowed' : 'pointer'};
  transition:background 0.15s ease;
  &:hover {
    background:${p => p.$isTarget ? 'rgba(0,255,128,0.32)' : undefined};
  }
`;
const VertDivider = styled.div`position:absolute;top:0;bottom:0;width:2px;background:rgba(255,255,255,0.08);pointer-events:none;z-index:2;`;
const ZoneLbl = styled.div`position:absolute;font-size:10px;font-weight:700;letter-spacing:1px;pointer-events:none;z-index:3;text-shadow:0 1px 4px rgba(0,0,0,0.7);`;

const UnitWrap = styled.div<{ $team: 'my' | 'opp'; $fainted: boolean; $hit: boolean; $atk: boolean; $sel: boolean }>`position:absolute;display:flex;flex-direction:column;align-items:center;z-index:${p => p.$sel ? 20 : 10};opacity:${p => p.$fainted ? 0.25 : 1};cursor:${p => p.$fainted ? 'default' : 'pointer'};${p => p.$hit && css`animation:${hitFlash} 0.35s ease;`}${p => p.$atk && css`animation:${atkBounce} 0.3s ease;`}${p => p.$sel && css`filter:drop-shadow(0 0 8px rgba(0,255,128,0.7));`}`;
const HpBg = styled.div`width:90%;height:5px;border-radius:3px;background:rgba(0,0,0,0.5);overflow:hidden;margin-bottom:1px;`;
const HpFill = styled.div`height:100%;border-radius:3px;transition:width 0.15s;`;
const Sprite = styled.img<{ $fainted: boolean; $flip: boolean }>`width:60px;height:60px;image-rendering:pixelated;${p => p.$fainted && 'filter:grayscale(1) brightness(0.5);'}${p => p.$flip && 'transform:scaleX(-1);'}`;
const Fallback = styled.div<{ $team: 'my' | 'opp' }>`width:60px;height:60px;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:12px;font-weight:800;background:${p => p.$team === 'my' ? 'rgba(0,200,100,0.2)' : 'rgba(200,50,50,0.2)'};color:${p => p.$team === 'my' ? '#4ade80' : '#f87171'};`;
const UnitName = styled.div`font-size:8px;color:rgba(255,255,255,0.7);font-weight:600;max-width:58px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;`;
const FloatEl = styled.div`position:absolute;z-index:50;font-size:16px;font-weight:900;pointer-events:none;animation:${floatUp} 0.8s ease forwards;transform:translateX(-50%);text-shadow:0 1px 4px rgba(0,0,0,0.8);`;

const PositionBar = styled.div`display:flex;align-items:center;gap:14px;margin-bottom:8px;`;
const PosLabel = styled.div<{ $isMe: boolean }>`font-size:13px;font-weight:700;letter-spacing:1px;color:${p => p.$isMe ? '#4ade80' : '#f87171'};`;
const PosVS = styled.div`color:rgba(255,255,255,0.5);font-size:16px;font-weight:900;letter-spacing:3px;`;

const OpponentInfoPanel = styled.div`width:100%;max-width:${COLS * CELL}px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;margin-bottom:8px;`;
const InfoTitle = styled.div`color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;margin-bottom:8px;letter-spacing:1px;`;
const InfoGrid = styled.div`display:grid;grid-template-columns:repeat(3,1fr);gap:6px;`;
const InfoCard = styled.div`display:flex;flex-direction:column;align-items:center;padding:6px 4px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);`;
const InfoSprite = styled.img`width:60px;height:60px;image-rendering:pixelated;`;
const InfoFallback = styled.div`width:60px;height:60px;display:flex;align-items:center;justify-content:center;background:rgba(255,0,0,0.15);border-radius:6px;color:#ff6b6b;font-size:11px;font-weight:700;`;
const InfoName = styled.div`color:rgba(255,255,255,0.8);font-size:10px;font-weight:600;margin-top:3px;text-align:center;`;
const InfoStats = styled.div`color:rgba(255,255,255,0.4);font-size:9px;margin-top:2px;`;
const InfoTypes = styled.div`display:flex;gap:3px;margin-top:2px;flex-wrap:wrap;justify-content:center;`;
const TypeBadge = styled.span`font-size:8px;padding:1px 5px;border-radius:4px;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);text-transform:capitalize;`;

const RevealOverlay = styled.div`position:absolute;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);pointer-events:none;`;
const RevealText = styled.div`color:#fbbf24;font-size:28px;font-weight:900;text-shadow:0 0 24px rgba(251,191,36,0.6);animation:${revealPulse} 1s ease infinite;`;

const Hint = styled.div`color:rgba(255,255,255,0.4);font-size:11px;margin-top:6px;text-align:center;max-width:${COLS * CELL}px;line-height:1.5;`;

const BenchArea = styled.div`width:100%;max-width:${COLS * CELL}px;margin-top:10px;padding:12px;background:rgba(79,195,247,0.05);border:1px solid rgba(79,195,247,0.15);border-radius:12px;`;
const BenchTitle = styled.div`color:rgba(255,255,255,0.7);font-size:12px;font-weight:600;margin-bottom:8px;letter-spacing:0.5px;`;
const BenchGrid = styled.div`display:grid;grid-template-columns:repeat(3,1fr);gap:8px;min-height:60px;align-items:start;`;
const BenchCard = styled.div<{ $selected: boolean }>`display:flex;flex-direction:column;align-items:center;padding:8px 10px;border-radius:10px;cursor:pointer;background:${p => p.$selected ? 'rgba(79,195,247,0.2)' : 'rgba(255,255,255,0.04)'};border:2px solid ${p => p.$selected ? 'rgba(79,195,247,0.6)' : 'rgba(255,255,255,0.08)'};transition:all 0.2s;${p => p.$selected && css`animation:${benchPulse} 1.5s ease infinite;`}&:hover{background:rgba(79,195,247,0.15);border-color:rgba(79,195,247,0.4);transform:translateY(-2px);}`;
const BenchSprite = styled.img`width:60px;height:60px;image-rendering:pixelated;`;
const BenchFallback = styled.div`width:60px;height:60px;display:flex;align-items:center;justify-content:center;background:rgba(0,200,100,0.15);border-radius:8px;color:#4ade80;font-size:12px;font-weight:700;`;
const BenchName = styled.div`color:rgba(255,255,255,0.8);font-size:10px;font-weight:600;margin-top:3px;`;
const BenchStats = styled.div`color:rgba(255,255,255,0.4);font-size:9px;margin-top:1px;`;
const BenchEmptyMsg = styled.div`color:rgba(79,195,247,0.7);font-size:12px;font-weight:600;padding:8px;text-align:center;`;