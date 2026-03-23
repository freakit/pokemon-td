// src/components/Multiplayer/TFTBattleArena.tsx
// 실제 TFT 스타일 배틀: 포켓몬들이 보드 위에서 실시간으로 이동하며 싸움
// - 준비 페이즈: 내 포켓몬 배치 (하단 2행), 클릭으로 자리 바꾸기
// - 배틀 페이즈: 포켓몬들이 자율적으로 이동 → 가장 가까운 적 향해 이동 → 범위 내 공격
// - AI 지원: opponentTeam이 AI 팀이어도 동일하게 동작

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { TowerDetail } from '../../types/multiplayer';
import { getTypeEffectiveness } from '../../utils/typeEffectiveness';

// ─── 보드 설정 ───────────────────────────────────────────────────────────────
const BOARD_COLS = 7;
const BOARD_ROWS = 4;
const CELL_SIZE = 90;
const POKEMON_SIZE = 60;
const ATTACK_RANGE = 1.5;
const MOVE_SPEED = 1.2;
const ATTACK_COOLDOWN = 1.2;
const BATTLE_FPS = 30;

interface BoardUnit {
  id: string;
  detail: TowerDetail;
  col: number;
  row: number;
  hp: number;
  maxHp: number;
  attackCooldown: number;
  isFainted: boolean;
  isAttacking: boolean;
  isHit: boolean;
  team: 'my' | 'opponent';
  x: number;
  y: number;
}

interface FloatText {
  id: number;
  text: string;
  col: number;
  row: number;
  color: string;
}

export interface TFTBattleArenaProps {
  myTeam: TowerDetail[];
  opponentTeam: TowerDetail[];
  opponentName: string;
  phase: 'prep' | 'battle' | 'result';
  // battleResult prop: 현재 직접 사용하지 않음 — phase prop으로 배틀 시작 제어
  // 외부에서 전달받지만 내부 배틀 로직은 독립적으로 동작 (미래 확장을 위해 유지)
  battleResult?: unknown;
  onBattleComplete?: (winnerId: string) => void;
}

const getDefaultMyPositions = (count: number) => {
  const positions = [
    { col: 1, row: 3 }, { col: 3, row: 3 }, { col: 5, row: 3 },
    { col: 0, row: 2 }, { col: 2, row: 2 }, { col: 4, row: 2 }, { col: 6, row: 2 },
  ];
  return positions.slice(0, count);
};

const getDefaultOpponentPositions = (count: number) => {
  const positions = [
    { col: 1, row: 0 }, { col: 3, row: 0 }, { col: 5, row: 0 },
    { col: 0, row: 1 }, { col: 2, row: 1 }, { col: 4, row: 1 }, { col: 6, row: 1 },
  ];
  return positions.slice(0, count);
};

const calcDamage = (attacker: BoardUnit, defender: BoardUnit): number => {
  const atkStat = attacker.detail.attack ?? attacker.detail.level * 10;
  const defStat = defender.detail.defense ?? defender.detail.level * 5;
  const attackerTypes = attacker.detail.types ?? [];
  const defenderTypes = defender.detail.types ?? [];
  const basePower = 50 + attacker.detail.level;
  const lvl = attacker.detail.level;
  const attackType = attackerTypes[0] ?? 'normal';
  const typeEff = getTypeEffectiveness(attackType, defenderTypes);
  const base = ((2 * lvl / 5 + 2) * basePower * atkStat / Math.max(defStat, 1) / 50 + 2);
  const rng = 0.85 + Math.random() * 0.15;
  return Math.max(1, Math.floor(base * typeEff * rng));
};

const distBetween = (a: BoardUnit, b: BoardUnit) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

export const TFTBattleArena: React.FC<TFTBattleArenaProps> = ({
  myTeam,
  opponentTeam,
  opponentName,
  phase,
  onBattleComplete,
}) => {
  const [units, setUnits] = useState<BoardUnit[]>([]);
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([]);
  const [battlePhase, setBattlePhase] = useState<'idle' | 'fighting' | 'done'>('idle');
  const [winnerText, setWinnerText] = useState<string | null>(null);
  const [dragUnit, setDragUnit] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const floatIdRef = useRef(0);

  // ─── 초기화 ───────────────────────────────────────────────────────
  useEffect(() => {
    const myPositions = getDefaultMyPositions(myTeam.length);
    const opPositions = getDefaultOpponentPositions(opponentTeam.length);

    const initialUnits: BoardUnit[] = [
      ...myTeam.map((d, i) => ({
        id: `my-${i}`,
        detail: d,
        col: myPositions[i]?.col ?? i % BOARD_COLS,
        row: myPositions[i]?.row ?? 3,
        hp: d.currentHp > 0 ? d.currentHp : d.maxHp,
        maxHp: d.maxHp,
        attackCooldown: 0,
        isFainted: d.isFainted,
        isAttacking: false,
        isHit: false,
        team: 'my' as const,
        x: myPositions[i]?.col ?? i % BOARD_COLS,
        y: myPositions[i]?.row ?? 3,
      })),
      ...opponentTeam.map((d, i) => ({
        id: `op-${i}`,
        detail: d,
        col: opPositions[i]?.col ?? i % BOARD_COLS,
        row: opPositions[i]?.row ?? 0,
        hp: d.currentHp > 0 ? d.currentHp : d.maxHp,
        maxHp: d.maxHp,
        attackCooldown: 0,
        isFainted: d.isFainted,
        isAttacking: false,
        isHit: false,
        team: 'opponent' as const,
        x: opPositions[i]?.col ?? i % BOARD_COLS,
        y: opPositions[i]?.row ?? 0,
      })),
    ];

    setUnits(initialUnits);
    setBattlePhase('idle');
    setWinnerText(null);
    setFloatTexts([]);
    setDragUnit(null);
  }, [myTeam, opponentTeam]);

  // ─── 배틀 시작 ────────────────────────────────────────────────────
  const startBattle = useCallback(() => {
    setBattlePhase(prev => (prev === 'idle' ? 'fighting' : prev));
  }, []);

  // ─── 배틀 루프 ────────────────────────────────────────────────────
  useEffect(() => {
    if (battlePhase !== 'fighting') return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    const dt = 1 / BATTLE_FPS;

    intervalRef.current = setInterval(() => {
      setUnits(prev => {
        const next = prev.map(u => ({ ...u }));

        const alive = (u: BoardUnit) => !u.isFainted && u.hp > 0;
        const myAlive = next.filter(u => u.team === 'my' && alive(u));
        const opAlive = next.filter(u => u.team === 'opponent' && alive(u));

        if (myAlive.length === 0 || opAlive.length === 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          const winnerSide = myAlive.length > 0 ? 'my' : 'opponent';
          const text = myAlive.length > 0 ? '🏆 내 팀 승리!' : `💀 ${opponentName} 승리!`;
          setBattlePhase('done');
          setWinnerText(text);
          onBattleComplete?.(winnerSide);
          return prev;
        }

        const newFloats: FloatText[] = [];

        for (const unit of next) {
          if (!alive(unit)) continue;

          const enemies = unit.team === 'my' ? opAlive : myAlive;
          if (enemies.length === 0) continue;

          let closest = enemies[0];
          let minDist = Infinity;
          for (const e of enemies) {
            const d = distBetween(unit, e);
            if (d < minDist) { minDist = d; closest = e; }
          }

          unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);

          if (minDist <= ATTACK_RANGE) {
            if (unit.attackCooldown <= 0) {
              unit.isAttacking = true;
              unit.attackCooldown = ATTACK_COOLDOWN;

              const targetUnit = next.find(u => u.id === closest.id);
              if (targetUnit && alive(targetUnit)) {
                const dmg = calcDamage(unit, targetUnit);
                targetUnit.hp = Math.max(0, targetUnit.hp - dmg);
                targetUnit.isHit = true;
                if (targetUnit.hp <= 0) targetUnit.isFainted = true;

                newFloats.push({
                  id: ++floatIdRef.current,
                  text: `-${dmg}`,
                  col: targetUnit.x,
                  row: targetUnit.y,
                  color: '#ff4444',
                });
              }
            }
          } else {
            unit.isAttacking = false;
            const dx = closest.x - unit.x;
            const dy = closest.y - unit.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0.01) {
              unit.x = Math.max(0, Math.min(BOARD_COLS - 1, unit.x + (dx / len) * MOVE_SPEED * dt));
              unit.y = Math.max(0, Math.min(BOARD_ROWS - 1, unit.y + (dy / len) * MOVE_SPEED * dt));
            }
          }
        }

        // 공격/피격 애니메이션 플래그 자동 리셋
        setTimeout(() => {
          setUnits(u => u.map(x => ({ ...x, isAttacking: false, isHit: false })));
        }, 300);

        if (newFloats.length > 0) {
          setFloatTexts(p => [...p, ...newFloats]);
          setTimeout(() => setFloatTexts(p => p.slice(newFloats.length)), 900);
        }

        return next;
      });
    }, 1000 / BATTLE_FPS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [battlePhase, opponentName, onBattleComplete]);

  // ─── phase prop 변화 → 배틀 자동 시작 ───────────────────────────
  useEffect(() => {
    if (phase === 'battle' && battlePhase === 'idle') {
      const timer = setTimeout(() => startBattle(), 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, battlePhase, startBattle]);

  // ─── 클린업 ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // ─── 준비 페이즈 클릭 핸들러 ─────────────────────────────────────
  const handleCellClick = (col: number, row: number) => {
    if (phase !== 'prep' || battlePhase !== 'idle') return;
    if (row < 2) return;

    if (dragUnit) {
      const targetOccupied = units.find(
        u => u.team === 'my' && Math.round(u.x) === col && Math.round(u.y) === row
      );
      setUnits(prev => prev.map(u => {
        if (u.id === dragUnit) return { ...u, x: col, y: row, col, row };
        if (targetOccupied && u.id === targetOccupied.id) {
          const src = prev.find(x => x.id === dragUnit);
          if (src) return { ...u, x: src.x, y: src.y, col: src.col, row: src.row };
        }
        return u;
      }));
      setDragUnit(null);
    } else {
      const clicked = units.find(
        u => u.team === 'my' && Math.round(u.x) === col && Math.round(u.y) === row
      );
      if (clicked && !clicked.isFainted) setDragUnit(prev => prev === clicked.id ? null : clicked.id);
    }
  };

  // ─── 렌더 ─────────────────────────────────────────────────────────
  const boardWidth = BOARD_COLS * CELL_SIZE;
  const boardHeight = BOARD_ROWS * CELL_SIZE;
  const isPrepPhase = phase === 'prep' && battlePhase === 'idle';

  return (
    <ArenaWrapper>
      <ArenaHeader>
        <ArenaTitle>⚔️ TFT 배틀 아레나</ArenaTitle>
        {isPrepPhase && <PhaseLabel $color="#4fc3f7">🛡️ 준비 — 포켓몬 클릭해서 재배치</PhaseLabel>}
        {battlePhase === 'fighting' && <PhaseLabel $color="#ff6b6b">🔥 배틀 중!</PhaseLabel>}
        {winnerText && <WinnerLabel>{winnerText}</WinnerLabel>}
      </ArenaHeader>

      <BoardContainer style={{ width: boardWidth, height: boardHeight }}>
        {Array.from({ length: BOARD_ROWS }, (_, row) =>
          Array.from({ length: BOARD_COLS }, (_, col) => {
            const isMyZone = row >= 2;
            const hasMyUnit = units.some(
              u => u.team === 'my' && Math.round(u.x) === col && Math.round(u.y) === row
            );
            return (
              <GridCell
                key={`${col}-${row}`}
                style={{ left: col * CELL_SIZE, top: row * CELL_SIZE, width: CELL_SIZE, height: CELL_SIZE }}
                $isMyZone={isMyZone}
                $isDropTarget={dragUnit !== null && isMyZone && !hasMyUnit}
                onClick={() => handleCellClick(col, row)}
              />
            );
          })
        )}

        <TeamDivider style={{ top: 2 * CELL_SIZE }} />

        <ZoneLabel style={{ top: 4, left: 6, color: 'rgba(255,128,128,0.75)' }}>
          👤 {opponentName}
        </ZoneLabel>
        <ZoneLabel style={{ bottom: 4, left: 6, color: 'rgba(128,255,128,0.75)' }}>
          👤 나
        </ZoneLabel>

        {units.map(unit => {
          const px = unit.x * CELL_SIZE + CELL_SIZE / 2 - POKEMON_SIZE / 2;
          const py = unit.y * CELL_SIZE + CELL_SIZE / 2 - POKEMON_SIZE / 2;
          const hpPct = Math.max(0, unit.hp / unit.maxHp);

          return (
            <UnitWrapper
              key={unit.id}
              style={{
                left: px,
                top: py,
                width: POKEMON_SIZE,
                height: POKEMON_SIZE + 28,
                transition: battlePhase === 'fighting'
                  ? 'left 0.05s linear, top 0.05s linear'
                  : 'left 0.15s ease, top 0.15s ease',
              }}
              $team={unit.team}
              $fainted={unit.isFainted}
              $isHit={unit.isHit}
              $isAttacking={unit.isAttacking}
              $selected={dragUnit === unit.id}
              onClick={() => {
                if (isPrepPhase && unit.team === 'my' && !unit.isFainted) {
                  setDragUnit(prev => prev === unit.id ? null : unit.id);
                }
              }}
            >
              <HpBarBg>
                <HpBarFill
                  style={{
                    width: `${hpPct * 100}%`,
                    background: hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c',
                  }}
                />
              </HpBarBg>
              <UnitSprite
                src={unit.detail.sprite}
                alt={unit.detail.name}
                $flip={unit.team === 'opponent'}
                $fainted={unit.isFainted}
              />
              <UnitName $team={unit.team}>
                {unit.detail.name} Lv.{unit.detail.level}
              </UnitName>
            </UnitWrapper>
          );
        })}

        {floatTexts.map(ft => (
          <FloatDmg
            key={ft.id}
            style={{
              left: ft.col * CELL_SIZE + CELL_SIZE / 2,
              top: ft.row * CELL_SIZE + 8,
              color: ft.color,
            }}
          >
            {ft.text}
          </FloatDmg>
        ))}
      </BoardContainer>
    </ArenaWrapper>
  );
};

// ─── 스타일 ───────────────────────────────────────────────────────────────────
const hitAnim = keyframes`
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50%       { transform: scale(0.88); filter: brightness(2.5) saturate(3); }
`;
const attackAnim = keyframes`
  0%, 100% { transform: scale(1) translateY(0); }
  40%       { transform: scale(1.18) translateY(-7px); }
`;
const floatUp = keyframes`
  0%   { opacity: 1; transform: translateY(0) translateX(-50%); }
  100% { opacity: 0; transform: translateY(-38px) translateX(-50%); }
`;
const pulse = keyframes`
  from { opacity: 0.7; } to { opacity: 1; }
`;

const ArenaWrapper = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 14px; background: rgba(0,0,0,0.85); border-radius: 16px;
  border: 2px solid rgba(255,215,0,0.3); max-width: 100%; overflow: hidden;
`;
const ArenaHeader = styled.div`
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: center;
`;
const ArenaTitle = styled.span`font-size: 15px; font-weight: bold; color: #fff;`;
const PhaseLabel = styled.span<{ $color: string }>`
  color: ${p => p.$color}; font-size: 13px;
  animation: ${pulse} 1s ease infinite alternate;
`;
const WinnerLabel = styled.span`
  color: #ffd700; font-size: 18px; font-weight: bold;
  text-shadow: 0 0 12px rgba(255,215,0,0.8);
`;
const BoardContainer = styled.div`
  position: relative; border: 2px solid rgba(255,255,255,0.12);
  border-radius: 8px; overflow: hidden;
  background: linear-gradient(180deg,
    rgba(40,40,100,0.92) 0%, rgba(40,40,100,0.92) 50%,
    rgba(30,80,30,0.92) 50%, rgba(30,80,30,0.92) 100%);
`;
const GridCell = styled.div<{ $isMyZone: boolean; $isDropTarget: boolean }>`
  position: absolute;
  border: 1px solid ${p => p.$isMyZone ? 'rgba(100,200,100,0.18)' : 'rgba(100,100,200,0.18)'};
  background: ${p => p.$isDropTarget ? 'rgba(100,255,100,0.18)' : 'transparent'};
  cursor: ${p => p.$isMyZone ? 'pointer' : 'default'};
  transition: background 0.15s;
  &:hover { background: ${p => p.$isMyZone ? 'rgba(100,255,100,0.1)' : 'transparent'}; }
`;
const TeamDivider = styled.div`
  position: absolute; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  pointer-events: none; z-index: 5;
`;
const ZoneLabel = styled.div`
  position: absolute; font-size: 11px; font-weight: bold;
  pointer-events: none; z-index: 5;
`;
const UnitWrapper = styled.div<{
  $team: 'my' | 'opponent'; $fainted: boolean;
  $isHit: boolean; $isAttacking: boolean; $selected: boolean;
}>`
  position: absolute; display: flex; flex-direction: column; align-items: center;
  cursor: ${p => p.$team === 'my' ? 'pointer' : 'default'};
  filter: ${p => p.$fainted ? 'grayscale(100%) opacity(0.35)' : 'none'};
  outline: ${p => p.$selected ? '3px solid #ffd700' : 'none'};
  border-radius: 8px; z-index: 10;
  ${p => p.$isHit && css`animation: ${hitAnim} 0.28s ease;`}
  ${p => p.$isAttacking && !p.$fainted && css`animation: ${attackAnim} 0.28s ease;`}
`;
const HpBarBg = styled.div`
  width: 100%; height: 5px; background: rgba(0,0,0,0.55);
  border-radius: 3px; overflow: hidden; margin-bottom: 2px;
`;
const HpBarFill = styled.div`
  height: 100%; border-radius: 3px; transition: width 0.18s ease;
`;
const UnitSprite = styled.img<{ $flip: boolean; $fainted: boolean }>`
  width: 100%; height: auto; image-rendering: pixelated;
  transform: ${p => p.$flip ? 'scaleX(-1)' : 'scaleX(1)'};
`;
const UnitName = styled.div<{ $team: 'my' | 'opponent' }>`
  font-size: 9px; color: ${p => p.$team === 'my' ? '#80ff80' : '#ff8080'};
  white-space: nowrap; font-weight: bold; text-shadow: 0 1px 3px black;
  max-width: 80px; overflow: hidden; text-overflow: ellipsis; text-align: center;
`;
const FloatDmg = styled.div`
  position: absolute; font-size: 15px; font-weight: bold;
  text-shadow: 0 1px 4px black; pointer-events: none;
  animation: ${floatUp} 0.9s ease-out forwards; z-index: 20;
`;