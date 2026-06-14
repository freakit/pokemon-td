// src/components/game/GameCanvas.tsx

import React, { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Line,
  Circle,
  Text,
  Image as KonvaImage,
} from "react-konva";
import Konva from "konva";
import styled, { keyframes } from "styled-components";
import { useTranslation } from "../../i18n";
import { useGameStore } from "../../store/gameStore";
import { GameManager } from "../../game/GameManager";
import { getMapById } from "../../data/maps";
import { GamePokemon } from "../../types/game";
import { lMedia, isMobileOrTablet, isTouchDevice } from "../../utils/responsive.utils";

const TILE_SIZE = 64;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 10;
const TYPE_ICON_API_BASE = 'https://www.serebii.net/pokedex-bw/type/';

// ─── 맵 배경 타입별 타일 테마 ─────────────────────────────────────────────────
type BackgroundType = 'grass' | 'desert' | 'snow' | 'cave' | 'water';

interface TileTheme {
  tileA: string;
  tileB: string;
  pathFill: string;
  stroke: string;
  pathStroke: string;
  pathLineStroke: string;
  pathLineOpacity: number;
}

const TILE_THEMES: Record<BackgroundType, TileTheme> = {
  grass: {
    tileA: '#4a7c3f', tileB: '#3d6b34', pathFill: '#7a5c3a',
    stroke: '#2d4f28', pathStroke: '#5c3f20', pathLineStroke: '#4a2e10', pathLineOpacity: 0.6,
  },
  desert: {
    tileA: '#c4a256', tileB: '#b8924a', pathFill: '#8a6a30',
    stroke: '#9a7830', pathStroke: '#6b4f22', pathLineStroke: '#5a3e18', pathLineOpacity: 0.6,
  },
  snow: {
    tileA: '#d0e8f5', tileB: '#b8d4e8', pathFill: '#7fb3d3',
    stroke: '#8ab4cc', pathStroke: '#5a90b8', pathLineStroke: '#3a70a0', pathLineOpacity: 0.55,
  },
  cave: {
    tileA: '#3a3240', tileB: '#2e2734', pathFill: '#1a1520',
    stroke: '#1e1824', pathStroke: '#0f0c14', pathLineStroke: '#080610', pathLineOpacity: 0.7,
  },
  water: {
    tileA: '#2a6fa8', tileB: '#235e90', pathFill: '#1a4a72',
    stroke: '#184060', pathStroke: '#102d4a', pathLineStroke: '#081e30', pathLineOpacity: 0.65,
  },
};

const getTileTheme = (bgType?: string): TileTheme =>
  TILE_THEMES[(bgType as BackgroundType) ?? 'grass'] ?? TILE_THEMES.grass;

// ─── 포켓몬 이미지 렌더링 헬퍼 ───────────────────────────────────────────────
const PokemonImage: React.FC<{
  src: string;
  x: number;
  y: number;
  isFainted: boolean;
  size?: number;
}> = ({ src, x, y, isFainted, size = 64 }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<any>(null);
  const imageSize = size;

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.src = src;
    img.crossOrigin = "Anonymous";
    img.onload = () => setImage(img);
  }, [src]);

  useEffect(() => {
    if (imageRef.current) {
      if (isFainted) {
        imageRef.current.cache();
        imageRef.current.filters([Konva.Filters.Grayscale]);
      } else {
        imageRef.current.filters([]);
      }
    }
  }, [isFainted, image]);

  if (!image) return null;

  return (
    <KonvaImage
      ref={imageRef}
      image={image || undefined}
      x={x - imageSize / 2}
      y={y - imageSize / 2}
      width={imageSize}
      height={imageSize}
      opacity={isFainted ? 0.4 : 1}
      imageSmoothingEnabled={false}
    />
  );
};

// ─── 유리구슬 투사체 오버레이 (Canvas 2D) ────────────────────────────────────
// [수정③] 포켓몬 공식 타입 배경색 + 유리 느낌 투명도/굴절 표현

const TYPE_MARBLE_COLORS: Record<string, {
  base: string;
  light: string;   // 밝은 면 (굴절광)
  dark: string;    // 어두운 면 (그림자)
  glow: string;    // 외부 글로우
  rim: string;     // 테두리 하이라이트
}> = {
  // 노말 — #9FA19F
  normal:   { base: '#9FA19F', light: '#D8DAD8', dark: 'rgba(60,62,60,0.5)',   glow: 'rgba(159,161,159,0.40)', rim: 'rgba(255,255,255,0.50)' },
  // 불꽃 — #E62829
  fire:     { base: '#E62829', light: '#FF8060', dark: 'rgba(100,10,10,0.55)', glow: 'rgba(230,40,41,0.50)',   rim: 'rgba(255,160,100,0.70)' },
  // 물 — #2980EF
  water:    { base: '#2980EF', light: '#90C8FF', dark: 'rgba(10,40,100,0.55)', glow: 'rgba(41,128,239,0.50)',  rim: 'rgba(160,210,255,0.70)' },
  // 풀 — #3FA129
  grass:    { base: '#3FA129', light: '#90D870', dark: 'rgba(20,60,15,0.55)',  glow: 'rgba(63,161,41,0.50)',   rim: 'rgba(150,230,120,0.70)' },
  // 전기 — #FAC000
  electric: { base: '#FAC000', light: '#FFE878', dark: 'rgba(100,75,0,0.50)',  glow: 'rgba(250,192,0,0.55)',   rim: 'rgba(255,240,140,0.75)' },
  // 얼음 — #3DCEF3
  ice:      { base: '#3DCEF3', light: '#B0EEFF', dark: 'rgba(10,80,110,0.50)', glow: 'rgba(61,206,243,0.45)',  rim: 'rgba(200,245,255,0.75)' },
  // 격투 — #FF8000
  fighting: { base: '#FF8000', light: '#FFB860', dark: 'rgba(110,45,0,0.55)',  glow: 'rgba(255,128,0,0.50)',   rim: 'rgba(255,200,120,0.70)' },
  // 독 — #9141CB
  poison:   { base: '#9141CB', light: '#C880EE', dark: 'rgba(50,15,80,0.55)',  glow: 'rgba(145,65,203,0.50)',  rim: 'rgba(200,150,240,0.70)' },
  // 땅 — #915121
  ground:   { base: '#915121', light: '#C89060', dark: 'rgba(50,25,5,0.55)',   glow: 'rgba(145,81,33,0.45)',   rim: 'rgba(210,160,100,0.65)' },
  // 비행 — #81B9EF
  flying:   { base: '#81B9EF', light: '#C4DEFF', dark: 'rgba(30,70,120,0.45)', glow: 'rgba(129,185,239,0.40)', rim: 'rgba(210,235,255,0.70)' },
  // 에스퍼 — #EF4179
  psychic:  { base: '#EF4179', light: '#FF90B0', dark: 'rgba(100,10,40,0.55)', glow: 'rgba(239,65,121,0.50)',  rim: 'rgba(255,170,195,0.70)' },
  // 벌레 — #91A119
  bug:      { base: '#91A119', light: '#C4CC60', dark: 'rgba(45,52,5,0.55)',   glow: 'rgba(145,161,25,0.45)',  rim: 'rgba(200,215,90,0.65)' },
  // 바위 — #AFA981
  rock:     { base: '#AFA981', light: '#D8D4B8', dark: 'rgba(55,52,30,0.50)',  glow: 'rgba(175,169,129,0.40)', rim: 'rgba(230,226,200,0.60)' },
  // 고스트 — #704170
  ghost:    { base: '#704170', light: '#A870A8', dark: 'rgba(30,10,30,0.60)',  glow: 'rgba(112,65,112,0.50)',  rim: 'rgba(180,130,180,0.65)' },
  // 드래곤 — #5060E1
  dragon:   { base: '#5060E1', light: '#90A0FF', dark: 'rgba(20,25,100,0.60)', glow: 'rgba(80,96,225,0.50)',   rim: 'rgba(170,185,255,0.70)' },
  // 악 — #624D4E
  dark:     { base: '#624D4E', light: '#9A8080', dark: 'rgba(20,15,15,0.65)',  glow: 'rgba(98,77,78,0.45)',    rim: 'rgba(155,130,130,0.55)' },
  // 강철 — #60A1B8
  steel:    { base: '#60A1B8', light: '#B0D5E8', dark: 'rgba(20,50,70,0.50)',  glow: 'rgba(96,161,184,0.40)',  rim: 'rgba(200,230,245,0.70)' },
  // 페어리 — #EF70EF
  fairy:    { base: '#EF70EF', light: '#FFB8FF', dark: 'rgba(100,20,100,0.50)', glow: 'rgba(239,112,239,0.50)', rim: 'rgba(255,200,255,0.75)' },
};

const getMarbleColor = (type: string) =>
  TYPE_MARBLE_COLORS[type] ?? TYPE_MARBLE_COLORS.normal;

interface ProjectileOverlayProps {
  projectiles: Array<{ id: string; current: { x: number; y: number }; type: string; isAOE: boolean }>;
  canvasScale: number;
}

const ProjectileOverlay: React.FC<ProjectileOverlayProps> = ({ projectiles, canvasScale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const projectilesRef = useRef(projectiles);
  projectilesRef.current = projectiles;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = MAP_WIDTH * TILE_SIZE;
    const H = MAP_HEIGHT * TILE_SIZE;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      for (const proj of projectilesRef.current) {
        const cx = proj.current.x;
        const cy = proj.current.y;
        const r = proj.isAOE ? 12 : 7;
        const c = getMarbleColor(proj.type);

        // ── 1. 아주 약한 외부 글로우 (너무 강하지 않게)
        const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 2.2);
        glowGrad.addColorStop(0, c.glow);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // ── 2. 구슬 본체 — 유리처럼 투명한 느낌을 위해 중심~하단 어둡게
        const bodyGrad = ctx.createRadialGradient(
          cx - r * 0.28, cy - r * 0.28, r * 0.02,  // 좌상단 하이라이트 중심
          cx + r * 0.15, cy + r * 0.20, r           // 우하단으로 그라디언트 끝
        );
        bodyGrad.addColorStop(0,    c.light);                  // 밝은 진입광
        bodyGrad.addColorStop(0.30, c.base + 'CC');            // 타입 색 (80% 불투명)
        bodyGrad.addColorStop(0.70, c.base + '99');            // 중간 (60% 불투명 — 유리 투과)
        bodyGrad.addColorStop(1,    c.dark);                   // 하단 그림자
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // ── 3. 내부 굴절광 — 구슬 하단 반사 (유리 특유의 아래쪽 반달 빛)
        const refGrad = ctx.createRadialGradient(
          cx + r * 0.10, cy + r * 0.55, 0,
          cx + r * 0.10, cy + r * 0.55, r * 0.55
        );
        refGrad.addColorStop(0,   'rgba(255,255,255,0.18)');
        refGrad.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = refGrad;
        ctx.fill();

        // ── 4. 메인 하이라이트 — 좌상단 타원형 (굴절된 빛의 핵심)
        const hlGrad = ctx.createRadialGradient(
          cx - r * 0.30, cy - r * 0.30, 0,
          cx - r * 0.30, cy - r * 0.30, r * 0.44
        );
        hlGrad.addColorStop(0,   'rgba(255,255,255,0.88)');
        hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.38)');
        hlGrad.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.beginPath();
        // 타원형으로 더 자연스럽게
        ctx.save();
        ctx.translate(cx - r * 0.30, cy - r * 0.30);
        ctx.scale(1, 0.65);
        ctx.arc(0, 0, r * 0.44, 0, Math.PI * 2);
        ctx.restore();
        ctx.fillStyle = hlGrad;
        ctx.fill();

        // ── 5. 림 하이라이트 — 구슬 가장자리 얇은 빛 (유리 테두리)
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = c.rim;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={MAP_WIDTH * TILE_SIZE}
      height={MAP_HEIGHT * TILE_SIZE}
      style={{
        position: 'absolute',
        top: '16px',
        left: '50%',
        transform: `translate(-50%, 0) scale(${canvasScale})`,
        transformOrigin: 'center top',
        pointerEvents: 'none',
      }}
    />
  );
};

// ─── 보스 글로우 pulse 오버레이 (Canvas 2D) ──────────────────────────────────
// [수정②] 적당한 강도의 붉은 pulse 글로우 — 너무 과하지 않게 조정

interface BossGlowOverlayProps {
  enemies: Array<{ id: string; position: { x: number; y: number }; isBoss: boolean }>;
  canvasScale: number;
}

const BossGlowOverlay: React.FC<BossGlowOverlayProps> = ({ enemies, canvasScale }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const enemiesRef = useRef(enemies);
  enemiesRef.current = enemies;
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = MAP_WIDTH * TILE_SIZE;
    const H = MAP_HEIGHT * TILE_SIZE;

    const draw = (now: number) => {
      ctx.clearRect(0, 0, W, H);

      const elapsed = (now - startTimeRef.current) / 1000;

      for (const enemy of enemiesRef.current) {
        if (!enemy.isBoss) continue;

        const cx = enemy.position.x;
        const cy = enemy.position.y;

        // pulse: 1.6초 주기 사인파, 0~1
        const pulse = (Math.sin(elapsed * (Math.PI * 2 / 1.6)) + 1) / 2;

        // [수정①] 글로우 반경을 줄임: 38~50px (기존 44~62px)
        const glowR = 38 + pulse * 12;
        // [수정①] 투명도도 낮춤: 0.10~0.24 (기존 0.18~0.42)
        const outerAlpha = 0.05 + pulse * 0.07;
        const innerAlpha = 0.10 + pulse * 0.08;

        // 외부 넓은 글로우
        const outerGrad = ctx.createRadialGradient(cx, cy, glowR * 0.25, cx, cy, glowR);
        outerGrad.addColorStop(0, `rgba(255, 50, 20, ${innerAlpha})`);
        outerGrad.addColorStop(0.6, `rgba(210, 20, 0, ${outerAlpha})`);
        outerGrad.addColorStop(1, 'rgba(180, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fillStyle = outerGrad;
        ctx.fill();

        // 내부 코어 글로우 (작고 은은하게)
        const coreR = 16 + pulse * 5;
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        coreGrad.addColorStop(0, `rgba(255, 100, 60, ${0.12 + pulse * 0.10})`);
        coreGrad.addColorStop(1, 'rgba(255, 40, 10, 0)');

        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fillStyle = coreGrad;
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={MAP_WIDTH * TILE_SIZE}
      height={MAP_HEIGHT * TILE_SIZE}
      style={{
        position: 'absolute',
        top: '16px',
        left: '50%',
        transform: `translate(-50%, 0) scale(${canvasScale})`,
        transformOrigin: 'center top',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
};

// HP 바 컴포넌트
const HPBar: React.FC<{
  x: number;
  y: number;
  current: number;
  max: number;
  width?: number;
  level?: number;
}> = ({ x, y, current, max, width = 50, level }) => {
  const ratio = Math.max(0, Math.min(1, current / max));
  const color = ratio > 0.5 ? "#2ecc71" : ratio > 0.25 ? "#f39c12" : "#e74c3c";

  return (
    <>
      {level !== undefined && (
        <Text
          x={x - width / 2 - 28}
          y={y - 38}
          text={`Lv.${level}`}
          fontSize={11}
          fill="#ffffff"
          fontStyle="bold"
          stroke="#000"
          strokeWidth={0.5}
          shadowColor="#000"
          shadowBlur={3}
          shadowOpacity={0.8}
        />
      )}
      <Rect
        x={x - width / 2}
        y={y - 35}
        width={width}
        height={6}
        fill="#2c3e50"
        stroke="#1a242f"
        strokeWidth={1}
      />
      <Rect
        x={x - width / 2}
        y={y - 35}
        width={width * ratio}
        height={6}
        fill={color}
      />
    </>
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

export const GameCanvas: React.FC = () => {
  const { t } = useTranslation();
  const {
    pokemonToPlace, setPokemonToPlace, addTower, spendMoney, addMoney,
    isWaveActive, towers, enemies, projectiles, damageNumbers, currentMap, evolutionToast,
  } = useGameStore((state) => ({
    pokemonToPlace: state.pokemonToPlace,
    setPokemonToPlace: state.setPokemonToPlace,
    addTower: state.addTower,
    spendMoney: state.spendMoney,
    addMoney: state.addMoney,
    isWaveActive: state.isWaveActive,
    towers: state.towers,
    enemies: state.enemies,
    projectiles: state.projectiles,
    damageNumbers: state.damageNumbers,
    currentMap: state.currentMap,
    evolutionToast: state.evolutionToast,
  }));

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [rawMousePos, setRawMousePos] = useState({ x: 0, y: 0 });
  const [placementImage, setPlacementImage] = useState<HTMLImageElement | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [hoveredTower, setHoveredTower] = useState<GamePokemon | null>(null);
  const [repositionMode, setRepositionMode] = useState(false);
  const [selectedTowerForReposition, setSelectedTowerForReposition] = useState<GamePokemon | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [mapBgImage, setMapBgImage] = useState<HTMLImageElement | null>(null);

  const lastTimeRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const map = React.useMemo(() => getMapById(currentMap), [currentMap]);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const padding = isMobileOrTablet() ? 8 : 32;
      const scaleX = (container.clientWidth - padding) / (MAP_WIDTH * TILE_SIZE);
      const scaleY = (container.clientHeight - padding) / (MAP_HEIGHT * TILE_SIZE);
      const maxScale = isMobileOrTablet() ? 1.2 : 1.5;
      setCanvasScale(Math.min(scaleX, scaleY, maxScale));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);
    return () => { window.removeEventListener("resize", updateScale); window.removeEventListener("orientationchange", updateScale); };
  }, []);

  useEffect(() => {
    let rafId: number | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const BG_FPS = 30;
    const tick = () => {
      const now = Date.now();
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;
      GameManager.getInstance().update(dt);
    };
    const startRaf = () => {
      if (rafId !== null) return;
      if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
      lastTimeRef.current = Date.now();
      const loop = () => { tick(); rafId = requestAnimationFrame(loop); };
      rafId = requestAnimationFrame(loop);
    };
    const startInterval = () => {
      if (intervalId !== null) return;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      lastTimeRef.current = Date.now();
      intervalId = setInterval(tick, 1000 / BG_FPS);
    };
    const handleVisibility = () => { if (document.hidden) startInterval(); else startRaf(); };
    document.addEventListener('visibilitychange', handleVisibility);
    document.hidden ? startInterval() : startRaf();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (pokemonToPlace?.sprite) {
      const img = new window.Image();
      img.src = pokemonToPlace.sprite;
      img.crossOrigin = "Anonymous";
      img.onload = () => setPlacementImage(img);
    } else {
      setPlacementImage(null);
    }
  }, [pokemonToPlace]);

  useEffect(() => {
    if (!map?.backgroundImage) { setMapBgImage(null); return; }
    const img = new window.Image();
    img.src = map.backgroundImage;
    img.onload = () => setMapBgImage(img);
    img.onerror = () => setMapBgImage(null);
  }, [map?.backgroundImage]);

  useEffect(() => {
    if (!isWaveActive && towers.length > 0) setRepositionMode(true);
    else if (isWaveActive) { setRepositionMode(false); setSelectedTowerForReposition(null); }
  }, [isWaveActive, towers.length]);

  const handleTouchStart = (e: any) => {
    if (!isTouchDevice()) return;
    const pos = e.target.getStage().getPointerPosition();
    if (pos) setTouchStartPos({ x: pos.x, y: pos.y });
  };

  const handleTouchMove = (e: any) => {
    if (!isTouchDevice() || !touchStartPos) return;
    const pos = e.target.getStage().getPointerPosition();
    if (pos) {
      setRawMousePos({ x: pos.x, y: pos.y });
      if (pokemonToPlace || selectedTowerForReposition) {
        setMousePos({ x: Math.floor(pos.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2, y: Math.floor(pos.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2 });
      }
    }
  };

  const handleTouchEnd = (e: any) => {
    if (!isTouchDevice() || !touchStartPos) return;
    const pos = e.target.getStage().getPointerPosition();
    if (pos && Math.abs(pos.x - touchStartPos.x) < 10 && Math.abs(pos.y - touchStartPos.y) < 10) handleClick(e);
    setTouchStartPos(null);
  };

  const handleMouseMove = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    if (pos) setRawMousePos({ x: pos.x, y: pos.y });
    if (pokemonToPlace && pos) {
      setMousePos({ x: Math.floor(pos.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2, y: Math.floor(pos.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2 });
    } else if (selectedTowerForReposition && pos) {
      setMousePos({ x: Math.floor(pos.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2, y: Math.floor(pos.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2 });
    } else {
      setMousePos(pos || { x: 0, y: 0 });
      if (pos) setHoveredTower(towers.find(t => Math.abs(t.position.x - pos.x) < 32 && Math.abs(t.position.y - pos.y) < 32) || null);
    }
  };

  const theme = React.useMemo(() => getTileTheme(map?.backgroundType), [map?.backgroundType]);

  const pathTileSet = React.useMemo(() => {
    const set = new Set<string>();
    if (!map) return set;
    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      for (let tx = 0; tx < MAP_WIDTH; tx++) {
        const cx = tx * TILE_SIZE + TILE_SIZE / 2;
        const cy = ty * TILE_SIZE + TILE_SIZE / 2;
        for (const path of map.paths) {
          for (let i = 0; i < path.length - 1; i++) {
            const s = path[i], e = path[i + 1];
            if (cx >= Math.min(s.x, e.x) - TILE_SIZE / 2 && cx <= Math.max(s.x, e.x) + TILE_SIZE / 2 &&
                cy >= Math.min(s.y, e.y) - TILE_SIZE / 2 && cy <= Math.max(s.y, e.y) + TILE_SIZE / 2) {
              set.add(`${tx}-${ty}`); break;
            }
          }
        }
      }
    }
    return set;
  }, [map]);

  const validPlacementSet = React.useMemo(() => {
    const set = new Set<string>();
    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      for (let tx = 0; tx < MAP_WIDTH; tx++) {
        const key = `${tx}-${ty}`;
        if (pathTileSet.has(key)) continue;
        const cx = tx * TILE_SIZE + TILE_SIZE / 2;
        const cy = ty * TILE_SIZE + TILE_SIZE / 2;
        if (!towers.some(t => Math.abs(t.position.x - cx) < TILE_SIZE && Math.abs(t.position.y - cy) < TILE_SIZE)) set.add(key);
      }
    }
    return set;
  }, [pathTileSet, towers]);

  const isPathTile = (x: number, y: number) => pathTileSet.has(`${Math.floor(x / TILE_SIZE)}-${Math.floor(y / TILE_SIZE)}`);
  const isValidPlacement = (x: number, y: number, excludeId?: string) => {
    if (x < 0 || x >= MAP_WIDTH * TILE_SIZE || y < 0 || y >= MAP_HEIGHT * TILE_SIZE) return false;
    if (isPathTile(x, y)) return false;
    return !towers.some(t => (!excludeId || t.id !== excludeId) && Math.abs(t.position.x - x) < TILE_SIZE && Math.abs(t.position.y - y) < TILE_SIZE);
  };

  const handleClick = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    const snappedX = Math.floor(pos.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    const snappedY = Math.floor(pos.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;

    if (repositionMode && !pokemonToPlace) {
      if (selectedTowerForReposition) {
        if (!isValidPlacement(snappedX, snappedY, selectedTowerForReposition.id)) { alert(t('alerts.cannotPlaceHere')); return; }
        useGameStore.getState().updateTower(selectedTowerForReposition.id, { position: { x: snappedX, y: snappedY } });
        setSelectedTowerForReposition(null);
      } else {
        const clicked = towers.find(t => Math.abs(t.position.x - pos.x) < 32 && Math.abs(t.position.y - pos.y) < 32);
        if (clicked) {
          setSelectedTowerForReposition(clicked);
          const img = new window.Image(); img.src = clicked.sprite; img.crossOrigin = "Anonymous"; img.onload = () => setPlacementImage(img);
        }
      }
      return;
    }

    if (!pokemonToPlace) return;
    if (towers.length >= 6) { alert(t('alerts.maxPokemon')); if (pokemonToPlace.originalCost) addMoney(pokemonToPlace.originalCost); setPokemonToPlace(null); return; }
    if (!isValidPlacement(snappedX, snappedY)) { alert(t('alerts.cannotPlaceHere')); return; }
    if (!spendMoney(pokemonToPlace.cost || 0)) { alert(t('alerts.notEnoughMoneyWithCost', { cost: pokemonToPlace.cost })); setPokemonToPlace(null); return; }

    const poke = pokemonToPlace;
    addTower({
      id: `tower-${Date.now()}`, pokemonId: poke.id, name: poke.name, displayName: poke.displayName,
      level: 1, experience: 0, currentHp: poke.stats.hp, maxHp: poke.stats.hp,
      baseAttack: poke.stats.attack, attack: poke.stats.attack, defense: poke.stats.defense,
      specialAttack: poke.stats.specialAttack, specialDefense: poke.stats.specialDefense, speed: poke.stats.speed,
      types: poke.types, position: { x: snappedX, y: snappedY }, equippedMoves: poke.equippedMoves,
      rejectedMoves: poke.rejectedMoves || [], isFainted: false, sprite: poke.sprite, range: 3,
      sellValue: Math.floor((poke.originalCost || 100) * 0.5), kills: 0, damageDealt: 0,
      gender: poke.gender, ability: poke.ability, targetEnemyId: null,
    });
    setPokemonToPlace(null);
  };

  const handleRightClick = (e: any) => {
    e.evt.preventDefault();
    if (pokemonToPlace?.originalCost) useGameStore.getState().addMoney(pokemonToPlace.originalCost);
    setPokemonToPlace(null);
    setSelectedTowerForReposition(null);
  };

  const staticTiles = React.useMemo(() => {
    const tiles: React.ReactNode[] = [];
    for (let y = 0; y < MAP_HEIGHT; y++)
      for (let x = 0; x < MAP_WIDTH; x++) {
        const isPath = pathTileSet.has(`${x}-${y}`);
        tiles.push(<Rect key={`${x}-${y}`} x={x*TILE_SIZE} y={y*TILE_SIZE} width={TILE_SIZE} height={TILE_SIZE}
          fill={isPath ? theme.pathFill : (x+y)%2===0 ? theme.tileA : theme.tileB}
          stroke={isPath ? theme.pathStroke : theme.stroke} strokeWidth={isPath ? 1 : 0.8} />);
      }
    return tiles;
  }, [pathTileSet, theme]);

  const pathOverlayLines = React.useMemo(() => {
    if (!map) return null;
    const bgType = (map.backgroundType ?? 'grass') as BackgroundType;
    const PATH_COLORS: Record<BackgroundType, string> = { grass: 'rgba(82,55,18,0.62)', cave: 'rgba(22,18,15,0.70)', water: 'rgba(118,85,28,0.65)', desert: 'rgba(102,64,16,0.60)', snow: 'rgba(75,98,130,0.54)' };
    const SHADOW_COLORS: Record<BackgroundType, string> = { grass: '#1a0e04', cave: '#050404', water: '#1c1005', desert: '#180c03', snow: '#141e2e' };
    const W = TILE_SIZE - 16;
    return map.paths.map((path, pi) => {
      const pts = path.flatMap(p => [p.x, p.y]);
      return (
        <React.Fragment key={`pathOverlay-${pi}`}>
          <Line points={pts} stroke={PATH_COLORS[bgType]} strokeWidth={W} lineJoin="round" lineCap="round"
            shadowColor={SHADOW_COLORS[bgType]} shadowBlur={10} shadowOffsetX={2} shadowOffsetY={6} shadowOpacity={0.50} />
          <Line points={pts} stroke="rgba(255,255,255,0.11)" strokeWidth={W - 14} lineJoin="round" lineCap="round" />
        </React.Fragment>
      );
    });
  }, [map]);

  const placementOverlay = React.useMemo(() => {
    if (!pokemonToPlace && !selectedTowerForReposition) return null;
    const overlays: React.ReactNode[] = [];
    for (let y = 0; y < MAP_HEIGHT; y++)
      for (let x = 0; x < MAP_WIDTH; x++) {
        const key = `${x}-${y}`;
        if (pathTileSet.has(key)) continue;
        overlays.push(<Rect key={`overlay-${key}`} x={x*TILE_SIZE} y={y*TILE_SIZE} width={TILE_SIZE} height={TILE_SIZE}
          fill={validPlacementSet.has(key) ? 'rgba(46,204,113,0.25)' : 'rgba(231,76,60,0.25)'} />);
      }
    return overlays;
  }, [pokemonToPlace, selectedTowerForReposition, pathTileSet, validPlacementSet]);

  return (
    <CanvasContainer ref={containerRef}>
      {evolutionToast && (
        <EvolutionToast>
          <span>✨ {t('game.evoToast', { fromName: evolutionToast.fromName, toName: evolutionToast.toName })}</span>
          <EvolutionToastButton onClick={() => useGameStore.setState({ evolutionToast: null })}>✕</EvolutionToastButton>
        </EvolutionToast>
      )}



      {hoveredTower && !pokemonToPlace && !selectedTowerForReposition && (
        <Tooltip style={{ left: `${mousePos.x * canvasScale + 80}px`, top: `${mousePos.y * canvasScale - 20}px` }}>
          <TooltipTitle>{hoveredTower.displayName} (Lv.{hoveredTower.level})</TooltipTitle>
          <TooltipTypes>
            {hoveredTower.types.map(type => <TooltipTypeIcon key={type} src={`${TYPE_ICON_API_BASE}${type}.gif`} alt={type} />)}
          </TooltipTypes>
          <TooltipStats>
            <TooltipStatRow>HP: {Math.floor(hoveredTower.currentHp)}/{hoveredTower.maxHp}</TooltipStatRow>
            <TooltipStatRow>{t('picker.attack')}: {hoveredTower.attack} | {t('picker.defense')}: {hoveredTower.defense}</TooltipStatRow>
            <TooltipStatRow>{t('picker.spAttack')}: {hoveredTower.specialAttack} | {t('picker.spDefense')}: {hoveredTower.specialDefense}</TooltipStatRow>
            <TooltipStatRow>{t('picker.speed')}: {hoveredTower.speed}</TooltipStatRow>
            {hoveredTower.equippedMoves[0] && <TooltipMove>⚔️ {hoveredTower.equippedMoves[0].displayName} ({hoveredTower.equippedMoves[0].power})</TooltipMove>}
          </TooltipStats>
        </Tooltip>
      )}

      <StageWrapper style={{ transform: `translate(-50%, 0) scale(${canvasScale})` }}>
        <Stage ref={stageRef} width={MAP_WIDTH * TILE_SIZE} height={MAP_HEIGHT * TILE_SIZE}
          onMouseMove={handleMouseMove} onClick={handleClick} onContextMenu={handleRightClick}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <Layer>
            {mapBgImage ? (
              <>
                <KonvaImage image={mapBgImage} x={0} y={0} width={MAP_WIDTH*TILE_SIZE} height={MAP_HEIGHT*TILE_SIZE} imageSmoothingEnabled={true} />
                <Rect x={0} y={0} width={MAP_WIDTH*TILE_SIZE} height={MAP_HEIGHT*TILE_SIZE} fill="rgba(255,255,255,0.05)" />
                {pathOverlayLines}
              </>
            ) : (
              <>
                {staticTiles}
                {map && map.paths.map((path, i) => (
                  <Line key={`path-${i}`} points={path.flatMap(p => [p.x, p.y])} stroke={theme.pathLineStroke}
                    strokeWidth={42} lineJoin="round" lineCap="round" opacity={theme.pathLineOpacity} />
                ))}
              </>
            )}

            {placementOverlay}

            {/* 입구 마커 */}
            {map && map.spawns.map((spawn, idx) => {
              const cx = Math.max(TILE_SIZE/2, Math.min(MAP_WIDTH*TILE_SIZE-TILE_SIZE/2, spawn.x));
              const cy = Math.max(TILE_SIZE/2, Math.min(MAP_HEIGHT*TILE_SIZE-TILE_SIZE/2, spawn.y));
              const fp = map.paths.find(p => Math.abs(p[0].x-spawn.x) < TILE_SIZE*2 && Math.abs(p[0].y-spawn.y) < TILE_SIZE*2);
              const dir = fp && fp.length > 1 ? { dx: fp[1].x-fp[0].x, dy: fp[1].y-fp[0].y } : { dx: 1, dy: 0 };
              return (
                <React.Fragment key={`spawn-${idx}`}>
                  <Circle x={cx} y={cy} radius={16} fillRadialGradientStartPoint={{x:0,y:0}} fillRadialGradientStartRadius={0}
                    fillRadialGradientEndPoint={{x:0,y:0}} fillRadialGradientEndRadius={16}
                    fillRadialGradientColorStops={[0,'#ff6b6b',1,'#c0392b']} stroke="#fff" strokeWidth={2} shadowColor="#e74c3c" shadowBlur={10} />
                  <Line x={cx} y={cy} points={[-2,-6,4,0,-2,6]} stroke="#fff" strokeWidth={3} lineCap="round" lineJoin="round"
                    rotation={(Math.atan2(dir.dy, dir.dx) * 180) / Math.PI} />
                </React.Fragment>
              );
            })}

            {/* 출구 마커 */}
            {map && map.objectives.map((obj, idx) => {
              const cx = Math.max(TILE_SIZE/2, Math.min(MAP_WIDTH*TILE_SIZE-TILE_SIZE/2, obj.x));
              const cy = Math.max(TILE_SIZE/2, Math.min(MAP_HEIGHT*TILE_SIZE-TILE_SIZE/2, obj.y));
              return (
                <React.Fragment key={`obj-${idx}`}>
                  <Circle x={cx} y={cy} radius={16} fillRadialGradientStartPoint={{x:0,y:0}} fillRadialGradientStartRadius={0}
                    fillRadialGradientEndPoint={{x:0,y:0}} fillRadialGradientEndRadius={16}
                    fillRadialGradientColorStops={[0,'#4facfe',1,'#1b8de8']} stroke="#fff" strokeWidth={2} shadowColor="#00f2fe" shadowBlur={10} />
                  <Rect x={cx} y={cy} width={10} height={10} offsetX={5} offsetY={5} fill="#fff" rotation={45} cornerRadius={2} />
                </React.Fragment>
              );
            })}

            {/* 타워 */}
            {towers.map((tower) => (
              <React.Fragment key={tower.id}>
                {selectedTowerForReposition?.id === tower.id && (
                  <Circle x={tower.position.x} y={tower.position.y} radius={40} stroke="#4cafff" strokeWidth={3} dash={[10,5]} opacity={0.8} />
                )}
                <PokemonImage src={tower.sprite} x={tower.position.x} y={tower.position.y} isFainted={tower.isFainted} />
                <HPBar x={tower.position.x} y={tower.position.y} current={tower.currentHp} max={tower.maxHp} level={tower.level} />
              </React.Fragment>
            ))}

            {/* 적 */}
            {enemies.map((enemy) => (
              <React.Fragment key={enemy.id}>
                {enemy.sprite ? (
                  <PokemonImage src={enemy.sprite} x={enemy.position.x} y={enemy.position.y} isFainted={false} size={enemy.isBoss ? 96 : 64} />
                ) : (
                  <Circle x={enemy.position.x} y={enemy.position.y} radius={enemy.isBoss ? 32 : 15}
                    fill={enemy.isBoss ? "#e74c3c" : "#95a5a6"} stroke={enemy.isBoss ? "#ff2020" : "#1a242f"}
                    strokeWidth={enemy.isBoss ? 4 : 3} shadowColor={enemy.isBoss ? "#ff1010" : undefined}
                    shadowBlur={enemy.isBoss ? 16 : 0} shadowOpacity={enemy.isBoss ? 0.6 : 0} />
                )}
                <HPBar x={enemy.position.x} y={enemy.position.y} current={enemy.hp} max={enemy.maxHp} width={enemy.isBoss ? 70 : 50} />
              </React.Fragment>
            ))}

            {/* 데미지 숫자 */}
            {damageNumbers.map((dmg) => {
              const eff = dmg.effectiveness ?? 1;
              const fill =
                dmg.isMiss                        ? '#95a5a6' : // MISS: 회색
                dmg.isCrit && eff >= 2            ? '#ff2200' : // 크리티컬 + 약점: 진빨강
                dmg.isCrit                        ? '#f39c12' : // 크리티컬: 골드
                eff >= 4                          ? '#e74c3c' : // 4배 약점: 빨강
                eff >= 2                          ? '#e67e22' : // 2배 약점: 주황
                eff <= 0.15                       ? '#7f8c8d' : // 무효(×0.1): 진한 회색
                eff <= 0.5                        ? '#5dade2' : // 반감(×0.5): 파랑
                                                   '#ffffff';   // 보통: 흰색
              const fontSize =
                dmg.isMiss ? 22 :
                dmg.isCrit ? 26 :
                eff >= 2   ? 24 : 20;
              return (
                <Text key={dmg.id} x={dmg.position.x - 20} y={dmg.position.y - 30}
                  text={dmg.isMiss ? 'MISS' : dmg.value.toString()}
                  fontSize={fontSize}
                  fill={fill}
                  fontStyle="bold" stroke="#000" strokeWidth={2}
                  shadowColor="#000" shadowBlur={5} shadowOpacity={0.8} />
              );
            })}

            {/* 배치 모드 */}
            {pokemonToPlace && (
              <>
                <Text x={rawMousePos.x+40} y={rawMousePos.y-40} text={pokemonToPlace.originalCost ? `${pokemonToPlace.originalCost}${t('common.money')}` : ''}
                  fill="#f39c12" fontSize={18} fontStyle="bold" stroke="black" strokeWidth={2} />
                <KonvaImage image={placementImage||undefined} x={rawMousePos.x-32} y={rawMousePos.y-32} width={64} height={64} opacity={0.6} imageSmoothingEnabled={false} />
                <Circle x={mousePos.x} y={mousePos.y} radius={3*TILE_SIZE} stroke="#fff" strokeWidth={2} opacity={0.4} dash={[10,5]} />
              </>
            )}

            {selectedTowerForReposition && (
              <KonvaImage image={placementImage||undefined} x={rawMousePos.x-32} y={rawMousePos.y-32} width={64} height={64} opacity={0.6} imageSmoothingEnabled={false} />
            )}
          </Layer>
        </Stage>
        <AchievementToastDisplay />
      </StageWrapper>

      {/* [수정②] 보스 글로우 pulse — 완화된 Canvas 2D 오버레이 */}
      <BossGlowOverlay enemies={enemies} canvasScale={canvasScale} />

      {/* [수정③] 투사체 유리구슬 오버레이 */}
      <ProjectileOverlay projectiles={projectiles} canvasScale={canvasScale} />
    </CanvasContainer>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const CanvasContainer = styled.div`
  width: 100%; height: 100%;
  position: relative;
  overflow: hidden;          /* [FIX] 960px Stage가 컨테이너 밖으로 넘치는 것을 방지 */
  touch-action: none;
`;

const EvolutionToast = styled.div`
  position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(155,89,182,0.95), rgba(142,68,173,0.95));
  padding: 8px 16px; border-radius: 12px; border: 2px solid rgba(155,89,182,0.6);
  box-shadow: 0 8px 24px rgba(155,89,182,0.6); z-index: 1000;
  animation: slideInDown 0.3s ease-out; color: #fff; font-size: 14px; font-weight: bold;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 8px;
  ${lMedia.phoneSm} { font-size: 12px; padding: 6px 12px; }
`;

const EvolutionToastButton = styled.button`
  background: rgba(255,255,255,0.2); border: none; border-radius: 50%;
  width: 20px; height: 20px; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: bold; padding: 0; transition: background 0.2s;
  @media (hover: hover) { &:hover { background: rgba(255,255,255,0.3); } }
  ${lMedia.phoneSm} { width: 18px; height: 18px; font-size: 10px; }
`;

const Tooltip = styled.div`
  position: absolute;
  background: linear-gradient(145deg, rgba(30,40,60,0.98), rgba(15,20,35,0.98));
  border: 2px solid rgba(76,175,255,0.5); border-radius: 10px; padding: 6px 10px;
  color: #e8edf3; font-size: 10px; font-weight: bold;
  box-shadow: 0 8px 24px rgba(0,0,0,0.6); pointer-events: none; z-index: 1001;
  min-width: 160px; max-width: 200px;
  ${lMedia.phoneSm} { font-size: 9px; padding: 4px 8px; min-width: 140px; }
`;

const TooltipTitle = styled.div`
  margin-bottom: 3px; color: #4cafff; font-size: 11px;
  ${lMedia.phoneSm} { font-size: 10px; }
`;
const TooltipTypes = styled.div`
  font-size: 9px; color: #a8b8c8; margin-bottom: 3px; display: flex; gap: 3px; align-items: center;
  ${lMedia.phoneSm} { font-size: 8px; }
`;
const TooltipTypeIcon = styled.img`height: 10px; object-fit: contain; ${lMedia.phoneSm} { height: 9px; }`;
const TooltipStats = styled.div`font-size: 9px; line-height: 1.4; ${lMedia.phoneSm} { font-size: 8px; }`;
const TooltipStatRow = styled.div``;
const TooltipMove = styled.div`margin-top: 3px; color: #f39c12; ${lMedia.phoneSm} { font-size: 8px; }`;

const StageWrapper = styled.div`
  /* [FIX] position:absolute → 레이아웃 흐름에서 제거, 960px 고정 크기가 부모를 밀지 않음 */
  position: absolute;
  top: 16px; left: 50%;
  transform-origin: center top;
  border: 2px solid #1a242f; border-radius: 8px; overflow: hidden;
  box-shadow: 0 8px 16px rgba(0,0,0,0.2); transition: transform 0.3s ease;
  ${lMedia.phoneSm} { border: 1px solid #1a242f; border-radius: 4px; }
`;

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