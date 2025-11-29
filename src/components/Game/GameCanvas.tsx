// src/components/Game/GameCanvas.tsx

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
import styled from "styled-components";
import { useTranslation } from "../../i18n";
import { useGameStore } from "../../store/gameStore";
import { GameManager } from "../../game/GameManager";
import { getMapById } from "../../data/maps";
import { GamePokemon } from "../../types/game";
import { media, isMobileOrTablet, isTouchDevice } from "../../utils/responsive.utils";

const TILE_SIZE = 64;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 10;
const TYPE_ICON_API_BASE = 'https://www.serebii.net/pokedex-bw/type/';

// 포켓몬 이미지 렌더링 헬퍼
const PokemonImage: React.FC<{
  src: string;
  x: number;
  y: number;
  isFainted: boolean;
}> = ({ src, x, y, isFainted }) => {
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
      {/* 레벨 표시 */}
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

      {/* HP 바 배경 */}
      <Rect
        x={x - width / 2}
        y={y - 35}
        width={width}
        height={6}
        fill="#2c3e50"
        stroke="#1a242f"
        strokeWidth={1}
      />

      {/* HP 바 */}
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

export const GameCanvas: React.FC = () => {
  const { t } = useTranslation();
  const {
    pokemonToPlace,
    setPokemonToPlace,
    addTower,
    spendMoney,
    isWaveActive,
  } = useGameStore((state) => ({
    pokemonToPlace: state.pokemonToPlace,
    setPokemonToPlace: state.setPokemonToPlace,
    addTower: state.addTower,
    spendMoney: state.spendMoney,
    isWaveActive: state.isWaveActive,
  }));
  const {
    towers,
    enemies,
    projectiles,
    damageNumbers,
    currentMap,
    evolutionToast,
  } = useGameStore.getState();

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [rawMousePos, setRawMousePos] = useState({ x: 0, y: 0 }); // 실제 마우스 위치 (Ghost Tower용)
  const [placementImage, setPlacementImage] = useState<HTMLImageElement | null>(
    null
  );
  const [canvasScale, setCanvasScale] = useState(1);
  const [hoveredTower, setHoveredTower] = useState<GamePokemon | null>(null);
  const [repositionMode, setRepositionMode] = useState(false);
  const [selectedTowerForReposition, setSelectedTowerForReposition] =
    useState<GamePokemon | null>(null);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);

  const lastTimeRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const map = getMapById(currentMap);

  // 캔버스 크기 자동 조정 (모바일 대응)
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const canvasWidth = MAP_WIDTH * TILE_SIZE;
      const canvasHeight = MAP_HEIGHT * TILE_SIZE;

      // 모바일/태블릿에서는 패딩을 더 작게
      const padding = isMobileOrTablet() ? 8 : 32;
      const scaleX = (containerWidth - padding) / canvasWidth;
      const scaleY = (containerHeight - padding) / canvasHeight;

      const maxScale = isMobileOrTablet() ? 1.2 : 1.5;
      const scale = Math.min(scaleX, scaleY, maxScale);
      setCanvasScale(scale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    window.addEventListener("orientationchange", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
      window.removeEventListener("orientationchange", updateScale);
    };
  }, []);

  // 게임 루프
  useEffect(() => {
    const gameLoop = () => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      GameManager.getInstance().update(dt);
      requestAnimationFrame(gameLoop);
    };
    const id = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(id);
  }, []);

  // 배치할 포켓몬 이미지 미리 로드
  useEffect(() => {
    if (pokemonToPlace && pokemonToPlace.sprite) {
      const img = new window.Image();
      img.src = pokemonToPlace.sprite;
      img.crossOrigin = "Anonymous";
      img.onload = () => setPlacementImage(img);
    } else {
      setPlacementImage(null);
    }
  }, [pokemonToPlace]);

  // Wave 종료 시 재배치 모드 자동 활성화
  useEffect(() => {
    if (!isWaveActive && towers.length > 0) {
      setRepositionMode(true);
    } else {
      setRepositionMode(false);
      setSelectedTowerForReposition(null);
    }
  }, [isWaveActive, towers.length]);

  // 터치 이벤트 처리 (모바일 대응)
  const handleTouchStart = (e: any) => {
    if (!isTouchDevice()) return;
    
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (pos) {
      setTouchStartPos({ x: pos.x, y: pos.y });
    }
  };

  const handleTouchMove = (e: any) => {
    if (!isTouchDevice() || !touchStartPos) return;
    
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (pos) {
      setRawMousePos({ x: pos.x, y: pos.y });
    }

    if (pokemonToPlace && pos) {
      const gridX = Math.floor(pos.x / TILE_SIZE);
      const gridY = Math.floor(pos.y / TILE_SIZE);
      const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
      const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;

      setMousePos({ x: snappedX, y: snappedY });
    } else if (selectedTowerForReposition && pos) {
      const gridX = Math.floor(pos.x / TILE_SIZE);
      const gridY = Math.floor(pos.y / TILE_SIZE);
      const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
      const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;

      setMousePos({ x: snappedX, y: snappedY });
    }
  };

  const handleTouchEnd = (e: any) => {
    if (!isTouchDevice() || !touchStartPos) return;
    
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (pos) {
      const dx = Math.abs(pos.x - touchStartPos.x);
      const dy = Math.abs(pos.y - touchStartPos.y);
      
      // 탭인지 드래그인지 판단 (이동 거리가 작으면 탭)
      if (dx < 10 && dy < 10) {
        handleClick(e);
      }
    }
    
    setTouchStartPos(null);
  };

  const handleMouseMove = (e: any) => {
    // 터치 디바이스 체크 제거 (하이브리드 장치 지원)
    // if (isTouchDevice()) return; 
    
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (pos) {
      setRawMousePos({ x: pos.x, y: pos.y });
    }

    if (pokemonToPlace && pos) {
      const gridX = Math.floor(pos.x / TILE_SIZE);
      const gridY = Math.floor(pos.y / TILE_SIZE);
      const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
      const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;

      setMousePos({ x: snappedX, y: snappedY });
    } else if (selectedTowerForReposition && pos) {
      const gridX = Math.floor(pos.x / TILE_SIZE);
      const gridY = Math.floor(pos.y / TILE_SIZE);
      const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
      const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;

      setMousePos({ x: snappedX, y: snappedY });
    } else {
      setMousePos(pos || { x: 0, y: 0 });
      if (pos) {
        const found = towers.find((t) => {
          const dx = Math.abs(t.position.x - pos.x);
          const dy = Math.abs(t.position.y - pos.y);
          return dx < 32 && dy < 32;
        });
        setHoveredTower(found || null);
      }
    }
  };

  // 경로 타일 확인 함수
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

  // 격자 위치 유효성 검사
  const isValidPlacement = (
    x: number,
    y: number,
    excludeTowerId?: string
  ): boolean => {
    if (
      x < 0 ||
      x >= MAP_WIDTH * TILE_SIZE ||
      y < 0 ||
      y >= MAP_HEIGHT * TILE_SIZE
    ) {
      return false;
    }

    if (isPathTile(x, y)) {
      return false;
    }

    const occupied = towers.some((t) => {
      if (excludeTowerId && t.id === excludeTowerId) return false;
      const dx = Math.abs(t.position.x - x);
      const dy = Math.abs(t.position.y - y);
      return dx < TILE_SIZE && dy < TILE_SIZE;
    });

    return !occupied;
  };

  const handleClick = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const gridX = Math.floor(pos.x / TILE_SIZE);
    const gridY = Math.floor(pos.y / TILE_SIZE);
    const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;

    // 재배치 모드
    if (repositionMode && !pokemonToPlace) {
      if (selectedTowerForReposition) {
        // 위치 변경
        if (!isValidPlacement(snappedX, snappedY, selectedTowerForReposition.id)) {
          alert(t('alerts.cannotPlaceHere'));
          return;
        }

        useGameStore.getState().updateTower(selectedTowerForReposition.id, {
          position: { x: snappedX, y: snappedY },
        });
        setSelectedTowerForReposition(null);
      } else {
        // 타워 선택
        const clicked = towers.find((t) => {
          const dx = Math.abs(t.position.x - pos.x);
          const dy = Math.abs(t.position.y - pos.y);
          return dx < 32 && dy < 32;
        });
        if (clicked) {
          setSelectedTowerForReposition(clicked);
          const img = new window.Image();
          img.src = clicked.sprite;
          img.crossOrigin = "Anonymous";
          img.onload = () => setPlacementImage(img);
        }
      }
      return;
    }

    if (!pokemonToPlace) return;

    // 포켓몬 6마리 제한
    if (towers.length >= 6) {
      alert(t('alerts.maxPokemon'));
      setPokemonToPlace(null);
      return;
    }

    const cost = pokemonToPlace.cost || 100;
    if (!isValidPlacement(snappedX, snappedY)) {
      alert(t('alerts.cannotPlaceHere'));
      return;
    }

    if (!spendMoney(cost)) {
      alert(t('alerts.notEnoughMoneyWithCost', { cost }));
      setPokemonToPlace(null);
      return;
    }

    const poke = pokemonToPlace;

    const tower: GamePokemon = {
      id: `tower-${Date.now()}`,
      pokemonId: poke.id,
      name: poke.name,
      displayName: poke.displayName,
      level: 1,
      experience: 0,
      currentHp: poke.stats.hp,
      maxHp: poke.stats.hp,
      baseAttack: poke.stats.attack,
      attack: poke.stats.attack,
      defense: poke.stats.defense,
      specialAttack: poke.stats.specialAttack,
      specialDefense: poke.stats.specialDefense,
      speed: poke.stats.speed,
      types: poke.types,
      position: { x: snappedX, y: snappedY },
      equippedMoves: poke.equippedMoves,
      rejectedMoves: poke.rejectedMoves || [],
      isFainted: false,
      sprite: poke.sprite,
      range: 3,
      sellValue: 50,
      kills: 0,
      damageDealt: 0,
      gender: poke.gender,
      ability: poke.ability,
      targetEnemyId: null,
    };
    addTower(tower);
    setPokemonToPlace(null);
  };

  const handleRightClick = (e: any) => {
    e.evt.preventDefault();
    setPokemonToPlace(null);
    setSelectedTowerForReposition(null);
  };

  return (
    <CanvasContainer ref={containerRef}>
      {evolutionToast && (
        <EvolutionToast>
          <span>
            ✨ {t('game.evoToast', { fromName: evolutionToast.fromName, toName: evolutionToast.toName })}
          </span>
          <EvolutionToastButton
            onClick={() => {
              useGameStore.setState({ evolutionToast: null });
            }}
          >
            ✕
          </EvolutionToastButton>
        </EvolutionToast>
      )}

      {hoveredTower && !pokemonToPlace && !selectedTowerForReposition && (
        <Tooltip
          style={{
            left: `${mousePos.x * canvasScale + 80}px`,
            top: `${mousePos.y * canvasScale - 20}px`,
          }}
        >
          <TooltipTitle>
            {hoveredTower.displayName} (Lv.{hoveredTower.level})
          </TooltipTitle>
          
          <TooltipTypes>
            {hoveredTower.types.map((type) => (
              <TooltipTypeIcon
                key={type}
                src={`${TYPE_ICON_API_BASE}${type}.gif`}
                alt={type}
              />
            ))}
          </TooltipTypes>
          
          <TooltipStats>
            <TooltipStatRow>
              HP: {Math.floor(hoveredTower.currentHp)}/{hoveredTower.maxHp}
            </TooltipStatRow>
            <TooltipStatRow>
              {t('picker.attack')}: {hoveredTower.attack} | {t('picker.defense')}: {hoveredTower.defense}
            </TooltipStatRow>
            <TooltipStatRow>
              {t('picker.spAttack')}: {hoveredTower.specialAttack} | {t('picker.spDefense')}: {hoveredTower.specialDefense}
            </TooltipStatRow>
            <TooltipStatRow>{t('picker.speed')}: {hoveredTower.speed}</TooltipStatRow>
            {hoveredTower.equippedMoves[0] && (
              <TooltipMove>
                ⚔️ {hoveredTower.equippedMoves[0].displayName} ({hoveredTower.equippedMoves[0].power})
              </TooltipMove>
            )}
          </TooltipStats>
        </Tooltip>
      )}

      <StageWrapper style={{ transform: `scale(${canvasScale})` }}>
        <Stage
          ref={stageRef}
          width={MAP_WIDTH * TILE_SIZE}
          height={MAP_HEIGHT * TILE_SIZE}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onContextMenu={handleRightClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Layer>
            {/* 격자 */}
            {Array.from({ length: MAP_HEIGHT }).map((_, y) =>
              Array.from({ length: MAP_WIDTH }).map((_, x) => {
                const centerX = x * TILE_SIZE + TILE_SIZE / 2;
                const centerY = y * TILE_SIZE + TILE_SIZE / 2;
                const isPath = isPathTile(centerX, centerY);
                const isValid = !isPath && isValidPlacement(centerX, centerY, selectedTowerForReposition?.id);

                return (
                  <Rect
                    key={`${x}-${y}`}
                    x={x * TILE_SIZE}
                    y={y * TILE_SIZE}
                    width={TILE_SIZE}
                    height={TILE_SIZE}
                    fill={
                      isPath
                        ? "#2c3e50"
                        : (pokemonToPlace || selectedTowerForReposition) &&
                          !isValid
                          ? "rgba(231, 76, 60, 0.3)"
                          : pokemonToPlace || selectedTowerForReposition
                            ? "rgba(46, 204, 113, 0.2)"
                            : (x + y) % 2 === 0
                              ? "#3A5369"
                              : "#3E5A71"
                    }
                    stroke="#2c3e50"
                    strokeWidth={0.5}
                  />
                );
              })
            )}

            {/* 경로 */}
            {map &&
              map.paths.map((path, index) => (
                <Line
                  key={`path-${index}`}
                  points={path.flatMap((p) => [p.x, p.y])}
                  stroke="#2c3e50"
                  strokeWidth={40}
                  lineJoin="round"
                  lineCap="round"
                  opacity={0.3}
                />
              ))}

            {/* 타워 (이미지) */}
            {towers.map((tower) => (
              <React.Fragment key={tower.id}>
                {selectedTowerForReposition?.id === tower.id && (
                  <Circle
                    x={tower.position.x}
                    y={tower.position.y}
                    radius={40}
                    stroke="#4cafff"
                    strokeWidth={3}
                    dash={[10, 5]}
                    opacity={0.8}
                  />
                )}
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

            {/* 적 (포켓몬 스프라이트 or 원) */}
            {enemies.map((enemy) => (
              <React.Fragment key={enemy.id}>
                {enemy.sprite ? (
                    <PokemonImage
                      src={enemy.sprite}
                      x={enemy.position.x}
                      y={enemy.position.y}
                      isFainted={false}
                    />
                  ) : (
                    <Circle
                      x={enemy.position.x}
                      y={enemy.position.y}
                      radius={enemy.isBoss ? 25 : 15}
                      fill={enemy.isBoss ? "#e74c3c" : "#95a5a6"}
                      stroke="#1a242f"
                      strokeWidth={3}
                    />
                  )}
                <HPBar
                  x={enemy.position.x}
                  y={enemy.position.y}
                  current={enemy.hp}
                  max={enemy.maxHp}
                  width={enemy.isBoss ? 60 : 50}
                />
              </React.Fragment>
            ))}

            {/* 투사체 */}
            {projectiles.map((proj) => (
              <Circle
                key={proj.id}
                x={proj.current.x}
                y={proj.current.y}
                radius={8}
                fill={proj.isAOE ? "#f39c12" : "#3498db"}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}

            {/* 데미지 숫자 */}
            {damageNumbers.map((dmg) => (
              <Text
                key={dmg.id}
                x={dmg.position.x - 20}
                y={dmg.position.y - 30}
                text={dmg.isMiss ? "MISS" : dmg.value.toString()}
                fontSize={dmg.isMiss ? 22 : dmg.isCrit ? 26 : 20}
                fill={dmg.isMiss ? "#95a5a6" : dmg.isCrit ? "#f39c12" : "#fff"}
                fontStyle="bold"
                stroke="#000"
                strokeWidth={2}
                shadowColor="#000"
                shadowBlur={5}
                shadowOpacity={0.8}
              />
            ))}

            {/* 배치 모드 UI */}
            {pokemonToPlace && (
              <>
                <Text
                  x={rawMousePos.x + 40}
                  y={rawMousePos.y - 40}
                  text={`${pokemonToPlace.cost || 100}${t('common.money')}`}
                  fill="#f39c12"
                  fontSize={18}
                  fontStyle="bold"
                  stroke="black"
                  strokeWidth={2}
                />
                <KonvaImage
                  image={placementImage || undefined}
                  x={rawMousePos.x - 32}
                  y={rawMousePos.y - 32}
                  width={64}
                  height={64}
                  opacity={0.6}
                  imageSmoothingEnabled={false}
                />
                <Circle
                  x={mousePos.x}
                  y={mousePos.y}
                  radius={3 * TILE_SIZE}
                  stroke="#fff"
                  strokeWidth={2}
                  opacity={0.4}
                  dash={[10, 5]}
                />
              </>
            )}

            {/* 재배치 모드 미리보기 */}
            {selectedTowerForReposition && (
              <>
                <KonvaImage
                  image={placementImage || undefined}
                  x={rawMousePos.x - 32}
                  y={rawMousePos.y - 32}
                  width={64}
                  height={64}
                  opacity={0.6}
                  imageSmoothingEnabled={false}
                />
              </>
            )}
          </Layer>
        </Stage>
      </StageWrapper>
    </CanvasContainer>
  );
};

// Styled Components (모바일 대응)
const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  touch-action: none; /* 터치 스크롤 방지 */
`;

const EvolutionToast = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(155, 89, 182, 0.95), rgba(142, 68, 173, 0.95));
  padding: 8px 16px;
  border-radius: 12px;
  border: 2px solid rgba(155, 89, 182, 0.6);
  box-shadow: 0 8px 24px rgba(155, 89, 182, 0.6);
  z-index: 1000;
  animation: slideInDown 0.3s ease-out;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  gap: 8px;

  ${media.mobile} {
    font-size: 12px;
    padding: 6px 12px;
  }
`;

const EvolutionToastButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  padding: 0;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  ${media.mobile} {
    width: 18px;
    height: 18px;
    font-size: 10px;
  }
`;

const Tooltip = styled.div`
  position: absolute;
  background: linear-gradient(145deg, rgba(30, 40, 60, 0.98), rgba(15, 20, 35, 0.98));
  border: 2px solid rgba(76, 175, 255, 0.5);
  border-radius: 10px;
  padding: 6px 10px;
  color: #e8edf3;
  font-size: 10px;
  font-weight: bold;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  pointer-events: none;
  z-index: 1001;
  min-width: 160px;
  max-width: 200px;

  ${media.mobile} {
    font-size: 9px;
    padding: 4px 8px;
    min-width: 140px;
  }
`;

const TooltipTitle = styled.div`
  margin-bottom: 3px;
  color: #4cafff;
  font-size: 11px;

  ${media.mobile} {
    font-size: 10px;
  }
`;

const TooltipTypes = styled.div`
  font-size: 9px;
  color: #a8b8c8;
  margin-bottom: 3px;
  display: flex;
  gap: 3px;
  align-items: center;

  ${media.mobile} {
    font-size: 8px;
  }
`;

const TooltipTypeIcon = styled.img`
  height: 10px;
  object-fit: contain;

  ${media.mobile} {
    height: 9px;
  }
`;

const TooltipStats = styled.div`
  font-size: 9px;
  line-height: 1.4;

  ${media.mobile} {
    font-size: 8px;
  }
`;

const TooltipStatRow = styled.div`
  /* A simple div is fine */
`;

const TooltipMove = styled.div`
  margin-top: 3px;
  color: #f39c12;

  ${media.mobile} {
    font-size: 8px;
  }
`;

const StageWrapper = styled.div`
  border: 2px solid #1a242f;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  transform-origin: center;
  transition: transform 0.3s ease;

  ${media.mobile} {
    border: 1px solid #1a242f;
    border-radius: 4px;
  }
`;