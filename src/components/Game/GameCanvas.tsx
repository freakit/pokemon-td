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
import { useGameStore } from "../../store/gameStore";
import { GameManager } from "../../game/GameManager";
import { getMapById } from "../../data/maps";
import { GamePokemon } from "../../types/game";

const TILE_SIZE = 64;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 10;

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
  const [placementImage, setPlacementImage] = useState<HTMLImageElement | null>(
    null
  );
  const [canvasScale, setCanvasScale] = useState(1);
  const [hoveredTower, setHoveredTower] = useState<GamePokemon | null>(null);
  const [repositionMode, setRepositionMode] = useState(false); // 재배치 모드
  const [selectedTowerForReposition, setSelectedTowerForReposition] =
    useState<GamePokemon | null>(null);

  const lastTimeRef = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const map = getMapById(currentMap);

  // 캔버스 크기 자동 조정
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

  // 게임 루프
  useEffect(() => {
    const { tick } = useGameStore.getState();
    const gameLoop = () => {
      const now = Date.now();
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      GameManager.getInstance().update(dt);
      tick();
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
  }, [isWaveActive]);

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

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

      // 호버된 타워 찾기
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
    // 맵 경계 체크
    if (
      x < 0 ||
      x >= MAP_WIDTH * TILE_SIZE ||
      y < 0 ||
      y >= MAP_HEIGHT * TILE_SIZE
    ) {
      return false;
    }

    // 🔵 수정된 isPathTile 함수로 경로인지 검사
    if (isPathTile(x, y)) {
      return false;
    }

    // 다른 타워와 겹치는지 검사
    for (const tower of towers) {
      if (excludeTowerId && tower.id === excludeTowerId) continue;
      const dx = Math.abs(tower.position.x - x);
      const dy = Math.abs(tower.position.y - y);
      if (dx < TILE_SIZE / 2 && dy < TILE_SIZE / 2) {
        return false;
      }
    }

    return true;
  };

  const handleCanvasClick = () => {
    // 재배치 모드
    if (repositionMode && !pokemonToPlace) {
      if (selectedTowerForReposition) {
        // 위치 변경
        if (
          !isValidPlacement(
            mousePos.x,
            mousePos.y,
            selectedTowerForReposition.id
          )
        ) {
          alert("여기에는 배치할 수 없습니다!");
          return;
        }

        useGameStore.getState().updateTower(selectedTowerForReposition.id, {
          position: { x: mousePos.x, y: mousePos.y },
        });
        setSelectedTowerForReposition(null);
      } else {
        // 타워 선택
        const clicked = towers.find((t) => {
          const dx = Math.abs(t.position.x - mousePos.x);
          const dy = Math.abs(t.position.y - mousePos.y);
          return dx < 32 && dy < 32;
        });
        if (clicked) {
          setSelectedTowerForReposition(clicked);
        }
      }
      return;
    }

    if (!pokemonToPlace) return;

    // 포켓몬 6마리 제한
    if (towers.length >= 6) {
      alert("포켓몬은 최대 6마리까지만 배치할 수 있습니다!");
      return;
    }

    const cost = pokemonToPlace.cost || 100;

    if (!isValidPlacement(mousePos.x, mousePos.y)) {
      alert("여기에는 배치할 수 없습니다!");
      return;
    }

    if (!spendMoney(cost)) {
      alert(`돈이 부족합니다! (포켓몬: ${cost}원)`);
      setPokemonToPlace(null);
      return;
    }

    const poke = pokemonToPlace;

    const tower: GamePokemon = {
      id: `tower-${Date.now()}`,
      pokemonId: poke.id,
      name: poke.name,
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
      position: { x: mousePos.x, y: mousePos.y },
      equippedMoves: poke.equippedMoves,
      rejectedMoves: poke.rejectedMoves || [], // 거부한 기술 목록
      isFainted: false,
      sprite: poke.sprite,
      range: 3,
      sellValue: 50,
      kills: 0,
      damageDealt: 0,
      gender: poke.gender,
    };

    addTower(tower);
    setPokemonToPlace(null);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* 진화 토스트 */}
      {evolutionToast && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background:
              "linear-gradient(135deg, rgba(155, 89, 182, 0.95), rgba(142, 68, 173, 0.95))",
            padding: "12px 24px",
            borderRadius: "12px",
            border: "2px solid rgba(155, 89, 182, 0.6)",
            boxShadow: "0 8px 24px rgba(155, 89, 182, 0.6)",
            zIndex: 1000,
            animation: "slideInDown 0.3s ease-out",
            color: "#fff",
            fontSize: "16px",
            fontWeight: "bold",
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span>
            ✨ {evolutionToast.fromName} → {evolutionToast.toName} 진화!
          </span>
          <button
            onClick={() => useGameStore.setState({ evolutionToast: null })}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "50%",
              width: "20px",
              height: "20px",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: "bold",
              padding: 0,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")
            }
          >
            ×
          </button>
        </div>
      )}

      {/* 호버 툴팁 */}
      {hoveredTower && !pokemonToPlace && !selectedTowerForReposition && (
        <div
          style={{
            position: "absolute",
            left: `${mousePos.x * canvasScale + 40}px`,
            top: `${mousePos.y * canvasScale - 20}px`,
            background:
              "linear-gradient(145deg, rgba(30, 40, 60, 0.98), rgba(15, 20, 35, 0.98))",
            border: "2px solid rgba(76, 175, 255, 0.5)",
            borderRadius: "10px",
            padding: "8px 12px",
            color: "#e8edf3",
            fontSize: "11px",
            fontWeight: "bold",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            pointerEvents: "none",
            zIndex: 999,
            minWidth: "180px",
            maxWidth: "220px",
          }}
        >
          <div
            style={{ marginBottom: "4px", color: "#4cafff", fontSize: "12px" }}
          >
            {hoveredTower.name} (Lv.{hoveredTower.level})
          </div>
          <div
            style={{ fontSize: "10px", color: "#a8b8c8", marginBottom: "4px" }}
          >
            {hoveredTower.types.map((t) => (
              <span
                key={t}
                style={{
                  background: "rgba(76, 175, 255, 0.2)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  marginRight: "4px",
                  textTransform: "uppercase",
                  fontSize: "9px",
                }}
              >
                {t}
              </span>
            ))}
          </div>
          <div style={{ fontSize: "10px", lineHeight: "1.4" }}>
            <div>
              HP: {Math.floor(hoveredTower.currentHp)}/{hoveredTower.maxHp}
            </div>
            <div>
              공격: {hoveredTower.attack} | 방어: {hoveredTower.defense}
            </div>
            <div>
              특공: {hoveredTower.specialAttack} | 특방:{" "}
              {hoveredTower.specialDefense}
            </div>
            <div>스피드: {hoveredTower.speed}</div>
            {hoveredTower.equippedMoves[0] && (
              <div style={{ marginTop: "4px", color: "#f39c12" }}>
                ⚔️ {hoveredTower.equippedMoves[0].name} (
                {hoveredTower.equippedMoves[0].power})
              </div>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          border: "3px solid #1a242f",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
          transform: `scale(${canvasScale})`,
          transformOrigin: "center",
        }}
      >
        <Stage
          width={MAP_WIDTH * TILE_SIZE}
          height={MAP_HEIGHT * TILE_SIZE}
          onMouseMove={handleMouseMove}
          onClick={handleCanvasClick}
        >
          <Layer>
            {/* 그리드 */}
            {Array.from({ length: MAP_WIDTH }).map((_, x) =>
              Array.from({ length: MAP_HEIGHT }).map((_, y) => {
                const tileX = x * TILE_SIZE + TILE_SIZE / 2;
                const tileY = y * TILE_SIZE + TILE_SIZE / 2;
                const isPath = isPathTile(tileX, tileY);
                const isValid =
                  pokemonToPlace || selectedTowerForReposition
                    ? isValidPlacement(
                        tileX,
                        tileY,
                        selectedTowerForReposition?.id
                      )
                    : true;

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
                  key={`path-${index}`} // 🔵 고유 key 부여
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
                {/* 재배치 모드에서 선택된 타워 강조 */}
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
                  x={mousePos.x + 40}
                  y={mousePos.y - 40}
                  text={`${pokemonToPlace.cost || 100}원`}
                  fill="#f39c12"
                  fontSize={18}
                  fontStyle="bold"
                  stroke="black"
                  strokeWidth={2}
                />
                <KonvaImage
                  image={placementImage || undefined}
                  x={mousePos.x - 32}
                  y={mousePos.y - 32}
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
                  x={mousePos.x - 32}
                  y={mousePos.y - 32}
                  width={64}
                  height={64}
                  opacity={0.6}
                  imageSmoothingEnabled={false}
                />
              </>
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};
