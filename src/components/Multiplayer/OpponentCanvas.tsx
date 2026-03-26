// src/components/Multiplayer/OpponentCanvas.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Line,
  Text,
  Image as KonvaImage,
} from "react-konva";
import Konva from "konva";
import styled from "styled-components";
import { getMapById } from "../../data/maps";
import { TowerDetail } from "../../types/multiplayer";

const TILE_SIZE = 64;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 10;

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
    tileA: '#4a7c3f',
    tileB: '#3d6b34',
    pathFill: '#7a5c3a',
    stroke: '#2d4f28',
    pathStroke: '#5c3f20',
    pathLineStroke: '#4a2e10',
    pathLineOpacity: 0.6,
  },
  desert: {
    tileA: '#c4a256',
    tileB: '#b8924a',
    pathFill: '#8a6a30',
    stroke: '#9a7830',
    pathStroke: '#6b4f22',
    pathLineStroke: '#5a3e18',
    pathLineOpacity: 0.6,
  },
  snow: {
    tileA: '#d0e8f5',
    tileB: '#b8d4e8',
    pathFill: '#7fb3d3',
    stroke: '#8ab4cc',
    pathStroke: '#5a90b8',
    pathLineStroke: '#3a70a0',
    pathLineOpacity: 0.55,
  },
  cave: {
    tileA: '#3a3240',
    tileB: '#2e2734',
    pathFill: '#1a1520',
    stroke: '#1e1824',
    pathStroke: '#0f0c14',
    pathLineStroke: '#080610',
    pathLineOpacity: 0.7,
  },
  water: {
    tileA: '#2a6fa8',
    tileB: '#235e90',
    pathFill: '#1a4a72',
    stroke: '#184060',
    pathStroke: '#102d4a',
    pathLineStroke: '#081e30',
    pathLineOpacity: 0.65,
  },
};

const getTileTheme = (bgType?: string): TileTheme =>
  TILE_THEMES[(bgType as BackgroundType) ?? 'grass'] ?? TILE_THEMES.grass;

// ─── 포켓몬 이미지 ────────────────────────────────────────────────────────────
const PokemonImage: React.FC<{
  src: string;
  x: number;
  y: number;
  isFainted: boolean;
}> = React.memo(({ src, x, y, isFainted }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<any>(null);
  const imageSize = 64;

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.src = src;
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      setImage(img);
    };
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
});

const HPBar: React.FC<{
  x: number;
  y: number;
  current: number;
  max: number;
  width?: number;
  level?: number;
}> = React.memo(({ x, y, current, max, width = 50, level }) => {
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
});

interface OpponentCanvasProps {
  towers: TowerDetail[];
  mapId: string;
}

export const OpponentCanvas: React.FC<OpponentCanvasProps> = React.memo(({ towers, mapId }) => {
  const [canvasScale, setCanvasScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const map = getMapById(mapId);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const canvasWidth = MAP_WIDTH * TILE_SIZE;
      const canvasHeight = MAP_HEIGHT * TILE_SIZE;

      const scaleX = (containerWidth - 32) / canvasWidth;
      const scaleY = (containerHeight - 32) / canvasHeight;

      const scale = Math.min(scaleX, scaleY, 1.5);
      setCanvasScale(scale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const isPathTile = (x: number, y: number): boolean => {
    if (!map) return false;
    for (const path of map.paths) {
      for (let i = 0; i < path.length - 1; i++) {
        const start = path[i];
        const end = path[i + 1];

        const minX = Math.min(start.x, end.x) - TILE_SIZE / 2;
        const maxX = Math.max(start.x, end.x) + TILE_SIZE / 2;
        const minY = Math.min(start.y, end.y) - TILE_SIZE / 2;
        const maxY = Math.max(start.y, end.y) + TILE_SIZE / 2;

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          return true;
        }
      }
    }
    return false;
  };

  const theme = getTileTheme(map?.backgroundType);

  return (
    <CanvasContainer ref={containerRef}>
      <StageWrapper
        style={{
          transform: `scale(${canvasScale})`,
        }}
      >
        <Stage
          width={MAP_WIDTH * TILE_SIZE}
          height={MAP_HEIGHT * TILE_SIZE}
          listening={false}
        >
          <Layer>
            {/* 격자 — 맵 테마 적용 */}
            {Array.from({ length: MAP_WIDTH }).map((_, x) =>
              Array.from({ length: MAP_HEIGHT }).map((_, y) => {
                const tileX = x * TILE_SIZE + TILE_SIZE / 2;
                const tileY = y * TILE_SIZE + TILE_SIZE / 2;
                const isPath = isPathTile(tileX, tileY);
                return (
                  <Rect
                    key={`${x}-${y}`}
                    x={x * TILE_SIZE}
                    y={y * TILE_SIZE}
                    width={TILE_SIZE}
                    height={TILE_SIZE}
                    fill={
                      isPath
                        ? theme.pathFill
                        : (x + y) % 2 === 0
                        ? theme.tileA
                        : theme.tileB
                    }
                    stroke={isPath ? theme.pathStroke : theme.stroke}
                    strokeWidth={0.8}
                  />
                );
              })
            )}

            {/* 경로 — 테마 색상 적용 */}
            {map &&
              map.paths.map((path, index) => (
                <Line
                  key={`path-${index}`}
                  points={path.flatMap((p) => [p.x, p.y])}
                  stroke={theme.pathLineStroke}
                  strokeWidth={42}
                  lineJoin="round"
                  lineCap="round"
                  opacity={theme.pathLineOpacity}
                />
              ))}

            {towers.map((tower) => (
              <React.Fragment key={tower.pokemonId + tower.position.x}>
                <PokemonImage
                  src={tower.sprite}
                  x={tower.position.x}
                  y={tower.position.y}
                  isFainted={tower.isFainted}
                />
                <HPBar
                  x={tower.position.x}
                  y={tower.position.y}
                  current={tower.currentHp}
                  max={tower.maxHp}
                  level={tower.level}
                />
              </React.Fragment>
            ))}
          </Layer>
        </Stage>
      </StageWrapper>
    </CanvasContainer>
  );
});

const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
`;

const StageWrapper = styled.div`
  border: 3px solid #1a242f;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  transform-origin: center;
`;