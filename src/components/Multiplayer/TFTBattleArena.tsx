// src/components/Multiplayer/TFTBattleArena.tsx
// 6x6 TFT 스타일 배틀
// - 보드: 6열 × 6행
// - 상단 2행(row 0-1): 상대 배치
// - 하단 2행(row 4-5): 내 배치
// - 중간 2행(row 2-3): 교전 구역
// - 배틀: 가장 가까운 적을 향해 이동 → 사정거리 내 공격 → 한 팀 전멸까지

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { TowerDetail } from '../../types/multiplayer';
import { getTypeEffectiveness } from '../../utils/typeEffectiveness';

const COLS = 6;
const ROWS = 6;
const CELL = 88;
const POKE_SIZE = 60;
const ATTACK_RANGE = 1.4;
const MOVE_SPEED = 1.0;
const ATK_COOLDOWN = 1.3;
const FPS = 30;
const DT = 1 / FPS;

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
}

interface FloatTxt {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

export interface TFTBattleArenaProps {
  myTeam: TowerDetail[];
  opponentTeam: TowerDetail[];
  opponentName: string;
  phase: 'prep' | 'battle' | 'result';
  battleResult?: unknown;
  onBattleComplete?: (winner: string) => void;
}

const MY_POS  = [
  {x:0,y:5},{x:2,y:5},{x:4,y:5},
  {x:1,y:4},{x:3,y:4},{x:5,y:4},
  {x:0,y:4},{x:2,y:4},{x:4,y:4},
];
const OPP_POS = [
  {x:1,y:0},{x:3,y:0},{x:5,y:0},
  {x:0,y:1},{x:2,y:1},{x:4,y:1},
  {x:1,y:1},{x:3,y:1},{x:5,y:1},
];

function calcDmg(a: Unit, d: Unit): number {
  const atk = a.detail.attack ?? a.detail.level * 10;
  const def = d.detail.defense ?? d.detail.level * 5;
  const types = a.detail.types ?? [];
  const dTypes = d.detail.types ?? [];
  const power = 50 + a.detail.level;
  const lvl = a.detail.level;
  const eff = getTypeEffectiveness(types[0] ?? 'normal', dTypes);
  const base = ((2 * lvl / 5 + 2) * power * atk / Math.max(def, 1)) / 50 + 2;
  return Math.max(1, Math.floor(base * eff * (0.85 + Math.random() * 0.15)));
}

function dst(a: Unit, b: Unit) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function buildUnits(myTeam: TowerDetail[], oppTeam: TowerDetail[]): Unit[] {
  const units: Unit[] = [];
  myTeam.forEach((d, i) => {
    const pos = MY_POS[i] ?? { x: i % COLS, y: 5 };
    units.push({
      id: `my-${i}`, detail: d, team: 'my',
      x: pos.x, y: pos.y,
      hp: d.currentHp > 0 ? d.currentHp : d.maxHp,
      maxHp: d.maxHp > 0 ? d.maxHp : 100,
      atkCd: Math.random() * 0.5,
      fainted: !!d.isFainted, isAtk: false, isHit: false,
    });
  });
  oppTeam.forEach((d, i) => {
    const pos = OPP_POS[i] ?? { x: i % COLS, y: 0 };
    units.push({
      id: `op-${i}`, detail: d, team: 'opp',
      x: pos.x, y: pos.y,
      hp: d.currentHp > 0 ? d.currentHp : d.maxHp,
      maxHp: d.maxHp > 0 ? d.maxHp : 100,
      atkCd: Math.random() * 0.5,
      fainted: !!d.isFainted, isAtk: false, isHit: false,
    });
  });
  return units;
}

export const TFTBattleArena: React.FC<TFTBattleArenaProps> = ({
  myTeam, opponentTeam, opponentName, phase, onBattleComplete,
}) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [floats, setFloats] = useState<FloatTxt[]>([]);
  const [battleState, setBattleState] = useState<'idle' | 'fighting' | 'done'>('idle');
  const [winnerText, setWinnerText] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const floatIdRef = useRef(0);
  const initRef = useRef({ my: -1, op: -1 });

  useEffect(() => {
    if (myTeam.length === 0 && opponentTeam.length === 0) return;
    if (
      initRef.current.my === myTeam.length &&
      initRef.current.op === opponentTeam.length &&
      units.length > 0
    ) return;
    initRef.current = { my: myTeam.length, op: opponentTeam.length };
    setUnits(buildUnits(myTeam, opponentTeam));
    setBattleState('idle');
    setWinnerText(null);
    setFloats([]);
    setDragId(null);
  }, [myTeam, opponentTeam]);

  const startBattle = useCallback(() => {
    setBattleState(prev => prev === 'idle' ? 'fighting' : prev);
  }, []);

  useEffect(() => {
    if (phase === 'battle' && battleState === 'idle') {
      let waited = 0;
      const t = setInterval(() => {
        waited += 200;
        if (units.length > 0 || waited >= 5000) {
          clearInterval(t);
          setTimeout(startBattle, 600);
        }
      }, 200);
      return () => clearInterval(t);
    }
  }, [phase, battleState, units.length, startBattle]);

  useEffect(() => {
    if (battleState !== 'fighting') return;
    if (loopRef.current) clearInterval(loopRef.current);

    loopRef.current = setInterval(() => {
      setUnits(prev => {
        const next = prev.map(u => ({ ...u }));
        const alive = (u: Unit) => !u.fainted && u.hp > 0;
        const myAlive  = next.filter(u => u.team === 'my'  && alive(u));
        const oppAlive = next.filter(u => u.team === 'opp' && alive(u));

        if (myAlive.length === 0 || oppAlive.length === 0) {
          if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
          const win = myAlive.length > 0 ? 'my' : 'opp';
          setBattleState('done');
          setWinnerText(win === 'my' ? '🏆 내 팀 승리!' : `💀 ${opponentName} 승리!`);
          onBattleComplete?.(win);
          return prev;
        }

        const newFloats: FloatTxt[] = [];

        for (const unit of next) {
          if (!alive(unit)) continue;
          const enemies = unit.team === 'my' ? oppAlive : myAlive;
          if (!enemies.length) continue;

          let target = enemies[0];
          let minD = Infinity;
          for (const e of enemies) {
            const d = dst(unit, e);
            if (d < minD) { minD = d; target = e; }
          }

          unit.atkCd = Math.max(0, unit.atkCd - DT);

          if (minD <= ATTACK_RANGE) {
            if (unit.atkCd <= 0) {
              unit.isAtk = true;
              unit.atkCd = ATK_COOLDOWN;
              const t2 = next.find(u => u.id === target.id);
              if (t2 && alive(t2)) {
                const dmg = calcDmg(unit, t2);
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
              }
            }
          } else {
            unit.isAtk = false;
            const dx = target.x - unit.x;
            const dy = target.y - unit.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 0.01) {
              unit.x = Math.max(0, Math.min(COLS - 1, unit.x + (dx / len) * MOVE_SPEED * DT));
              unit.y = Math.max(0, Math.min(ROWS - 1, unit.y + (dy / len) * MOVE_SPEED * DT));
            }
          }
        }

        setTimeout(() => setUnits(u => u.map(x => ({ ...x, isAtk: false, isHit: false }))), 280);
        if (newFloats.length > 0) {
          setFloats(f => [...f, ...newFloats]);
          setTimeout(() => setFloats(f => f.slice(newFloats.length)), 850);
        }
        return next;
      });
    }, 1000 / FPS);

    return () => { if (loopRef.current) clearInterval(loopRef.current); };
  }, [battleState, opponentName, onBattleComplete]);

  useEffect(() => () => { if (loopRef.current) clearInterval(loopRef.current); }, []);

  const handleCellClick = (col: number, row: number) => {
    if (phase !== 'prep' || battleState !== 'idle' || row < 4) return;
    if (dragId) {
      const occ = units.find(u => u.team === 'my' && Math.round(u.x) === col && Math.round(u.y) === row);
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
      const clicked = units.find(u => u.team === 'my' && Math.round(u.x) === col && Math.round(u.y) === row);
      if (clicked && !clicked.fainted) setDragId(p => p === clicked.id ? null : clicked.id);
    }
  };

  const boardW = COLS * CELL;
  const boardH = ROWS * CELL;
  const isPrep = phase === 'prep' && battleState === 'idle';

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
        {isPrep && <PhaseTag $color="#4fc3f7">🛡️ 준비 — 하단 2행에서 포켓몬 재배치 가능</PhaseTag>}
        {battleState === 'fighting' && <PhaseTag $color="#ff6b6b">🔥 배틀 중!</PhaseTag>}
        {winnerText && <WinTag>{winnerText}</WinTag>}
      </TopBar>

      <Board style={{ width: boardW, height: boardH }}>
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: COLS }, (_, col) => {
            const zone: 'my'|'opp'|'mid' = row >= 4 ? 'my' : row <= 1 ? 'opp' : 'mid';
            const hasMyUnit = units.some(u => u.team==='my' && Math.round(u.x)===col && Math.round(u.y)===row);
            return (
              <Cell
                key={`${col}-${row}`}
                style={{ left: col*CELL, top: row*CELL, width: CELL, height: CELL }}
                $zone={zone}
                $isTarget={dragId !== null && zone === 'my' && !hasMyUnit}
                onClick={() => handleCellClick(col, row)}
              />
            );
          })
        )}

        <Divider style={{ top: 2 * CELL }} />
        <Divider style={{ top: 4 * CELL }} />
        <ZoneLbl style={{ top: 4, left: 8, color: 'rgba(255,110,110,0.85)' }}>👤 {opponentName}</ZoneLbl>
        <ZoneLbl style={{ bottom: 4, left: 8, color: 'rgba(100,255,160,0.85)' }}>👤 나</ZoneLbl>

        {units.map(unit => {
          const px = unit.x * CELL + CELL/2 - POKE_SIZE/2;
          const py = unit.y * CELL + CELL/2 - POKE_SIZE/2;
          const hpPct = Math.max(0, unit.hp / unit.maxHp);
          return (
            <UnitWrap
              key={unit.id}
              style={{
                left: px, top: py, width: POKE_SIZE,
                transition: battleState === 'fighting'
                  ? 'left 0.033s linear, top 0.033s linear'
                  : 'left 0.15s ease, top 0.15s ease',
              }}
              $team={unit.team} $fainted={unit.fainted}
              $hit={unit.isHit} $atk={unit.isAtk} $sel={dragId===unit.id}
              onClick={() => {
                if (isPrep && unit.team==='my' && !unit.fainted)
                  setDragId(p => p===unit.id ? null : unit.id);
              }}
            >
              <HpBg>
                <HpFill style={{
                  width:`${hpPct*100}%`,
                  background: hpPct>0.5?'#2ecc71':hpPct>0.25?'#f1c40f':'#e74c3c',
                }}/>
              </HpBg>
              {unit.detail.sprite ? (
                <Sprite src={unit.detail.sprite} alt={unit.detail.name}
                  $fainted={unit.fainted} $flip={unit.team==='opp'} />
              ) : (
                <Fallback $team={unit.team}>
                  {unit.detail.name?.slice(0,2).toUpperCase()??'?'}
                </Fallback>
              )}
              <UnitName>{unit.detail.name}</UnitName>
            </UnitWrap>
          );
        })}

        {floats.map(f => (
          <FloatEl key={f.id} style={{ left:f.x, top:f.y, color:f.color }}>{f.text}</FloatEl>
        ))}
      </Board>

      {isPrep && <Hint>포켓몬 클릭 → 원하는 칸 클릭으로 이동 | 하단 2행에만 배치 가능</Hint>}
    </Wrap>
  );
};

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

const Wrap = styled.div`
  flex:1; display:flex; flex-direction:column; align-items:center;
  background:radial-gradient(ellipse at center,#1a1a2e 0%,#0d0d1a 100%);
  padding:14px; overflow:hidden; animation:${fadeIn} 0.35s ease;
`;
const TopBar = styled.div`display:flex;align-items:center;gap:14px;margin-bottom:10px;`;
const ArenaTitle = styled.div`color:#fff;font-size:17px;font-weight:800;letter-spacing:2px;`;
const PhaseTag = styled.div<{$color:string}>`
  color:${p=>p.$color};font-size:12px;font-weight:600;
  padding:3px 11px;border-radius:20px;
  border:1px solid ${p=>p.$color}44;background:${p=>p.$color}11;
`;
const WinTag = styled.div`
  color:#fbbf24;font-size:17px;font-weight:900;
  text-shadow:0 0 18px rgba(251,191,36,0.6);
  animation:${atkBounce} 1s ease infinite;
`;
const Board = styled.div`
  position:relative;border:2px solid rgba(255,255,255,0.1);
  border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.45);
`;
const LoadBox = styled.div`
  display:flex;align-items:center;justify-content:center;
  border:2px solid rgba(255,255,255,0.1);border-radius:8px;background:rgba(0,0,0,0.4);
`;
const LoadMsg = styled.div`color:rgba(255,255,255,0.45);font-size:14px;text-align:center;line-height:1.7;`;
const Cell = styled.div<{$zone:'my'|'opp'|'mid';$isTarget:boolean}>`
  position:absolute;box-sizing:border-box;
  border:1px solid ${p=>p.$zone==='my'?'rgba(0,255,128,0.07)':p.$zone==='opp'?'rgba(255,80,80,0.07)':'rgba(255,255,255,0.04)'};
  background:${p=>p.$isTarget?'rgba(0,255,128,0.14)':p.$zone==='my'?'rgba(0,80,40,0.08)':p.$zone==='opp'?'rgba(80,0,0,0.08)':'rgba(255,255,255,0.02)'};
  cursor:${p=>p.$isTarget?'pointer':'default'};transition:background 0.12s;
  &:hover{background:${p=>p.$isTarget?'rgba(0,255,128,0.22)':undefined};}
`;
const Divider = styled.div`
  position:absolute;left:0;right:0;height:2px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent);
  pointer-events:none;z-index:2;
`;
const ZoneLbl = styled.div`position:absolute;font-size:10px;font-weight:600;pointer-events:none;z-index:3;`;
const UnitWrap = styled.div<{$team:'my'|'opp';$fainted:boolean;$hit:boolean;$atk:boolean;$sel:boolean}>`
  position:absolute;display:flex;flex-direction:column;align-items:center;
  cursor:pointer;z-index:10;height:${POKE_SIZE+22}px;
  opacity:${p=>p.$fainted?0.25:1};filter:${p=>p.$fainted?'grayscale(1)':'none'};
  outline:${p=>p.$sel?'2px solid #4fc3f7':'none'};border-radius:6px;
  ${p=>p.$hit&&css`animation:${hitFlash} 0.28s ease;`}
  ${p=>p.$atk&&css`animation:${atkBounce} 0.28s ease;`}
`;
const HpBg = styled.div`width:${POKE_SIZE}px;height:4px;background:rgba(0,0,0,0.55);border-radius:2px;overflow:hidden;margin-bottom:1px;`;
const HpFill = styled.div`height:100%;border-radius:2px;transition:width 0.18s ease;`;
const Sprite = styled.img<{$fainted:boolean;$flip:boolean}>`
  width:${POKE_SIZE}px;height:${POKE_SIZE}px;object-fit:contain;image-rendering:pixelated;
  transform:${p=>p.$flip?'scaleX(-1)':'none'};
  filter:${p=>p.$fainted?'grayscale(1) opacity(0.35)':'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'};
`;
const Fallback = styled.div<{$team:'my'|'opp'}>`
  width:${POKE_SIZE}px;height:${POKE_SIZE}px;display:flex;align-items:center;justify-content:center;
  background:${p=>p.$team==='my'?'rgba(0,80,255,0.3)':'rgba(255,50,50,0.3)'};
  border-radius:50%;font-size:13px;font-weight:700;color:#fff;
`;
const UnitName = styled.div`
  font-size:9px;color:rgba(255,255,255,0.8);text-align:center;white-space:nowrap;
  max-width:${POKE_SIZE+8}px;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 3px rgba(0,0,0,0.9);
`;
const FloatEl = styled.div`
  position:absolute;font-size:13px;font-weight:800;
  text-shadow:0 1px 4px rgba(0,0,0,0.8);pointer-events:none;z-index:20;
  animation:${floatUp} 0.85s ease forwards;
`;
const Hint = styled.div`margin-top:7px;color:rgba(255,255,255,0.3);font-size:11px;`;