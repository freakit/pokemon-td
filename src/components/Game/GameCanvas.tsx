// src/components/Game/GameCanvas.tsx

import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Circle, Text, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../../store/gameStore';
import { GameManager } from '../../game/GameManager';
import { getMapById } from '../../data/maps';
import { GamePokemon } from '../../types/game';

const TILE_SIZE = 64;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 10;

// 포켓몬 이미지 렌더링 헬퍼
const PokemonImage: React.FC<{ src: string, x: number, y: number, isFainted: boolean }> = ({ src, x, y, isFainted }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<any>(null);
  const imageSize = 64;

  useEffect(() => {
    if (!src) return;
    const img = new window.Image();
    img.src = src;
    img.crossOrigin = 'Anonymous';
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
const HPBar: React.FC<{ x: number, y: number, current: number, max: number, width?: number, level?: number }> = ({ 
  x, y, current, max, width = 50, level 
}) => {
  const ratio = Math.max(0, Math.min(1, current / max));
  const color = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';
  
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
  const { pokemonToPlace, setPokemonToPlace, addTower, spendMoney } = useGameStore(state => ({
    pokemonToPlace: state.pokemonToPlace,
    setPokemonToPlace: state.setPokemonToPlace,
    addTower: state.addTower,
    spendMoney: state.spendMoney,
  }));
  
  const { towers, enemies, projectiles, damageNumbers, currentMap } = useGameStore.getState();
  
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [placementImage, setPlacementImage] = useState<HTMLImageElement | null>(null); // 배치 미리보기 이미지
  const [canvasScale, setCanvasScale] = useState(1);
  
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
      
      const scale = Math.min(scaleX, scaleY, 1.5); // 최대 1.5배
      setCanvasScale(scale);
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
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
      img.crossOrigin = 'Anonymous';
      img.onload = () => setPlacementImage(img);
    } else {
      setPlacementImage(null);
    }
  }, [pokemonToPlace]);

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (pokemonToPlace && pos) {
      // 격자에 스냅
      const gridX = Math.floor(pos.x / TILE_SIZE);
      const gridY = Math.floor(pos.y / TILE_SIZE);
      const snappedX = gridX * TILE_SIZE + TILE_SIZE / 2;
      const snappedY = gridY * TILE_SIZE + TILE_SIZE / 2;
      
      setMousePos({ x: snappedX, y: snappedY });
    } else {
      setMousePos(pos || { x: 0, y: 0 });
    }
  };

  // 경로 타일 확인 함수
  const isPathTile = (x: number, y: number): boolean => {
    if (!map) return false;
    
    for (let i = 0; i < map.path.length - 1; i++) {
      const start = map.path[i];
      const end = map.path[i + 1];
      
      // 경로를 따라 타일 체크
      const minX = Math.min(start.x, end.x) - TILE_SIZE;
      const maxX = Math.max(start.x, end.x) + TILE_SIZE;
      const minY = Math.min(start.y, end.y) - TILE_SIZE;
      const maxY = Math.max(start.y, end.y) + TILE_SIZE;
      
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return true;
      }
    }
    return false;
  };

  // 격자 위치 유효성 검사
  const isValidPlacement = (x: number, y: number): boolean => {
    // 맵 범위 체크
    if (x < 0 || x >= MAP_WIDTH * TILE_SIZE || y < 0 || y >= MAP_HEIGHT * TILE_SIZE) {
      return false;
    }
    
    // 경로 체크
    if (isPathTile(x, y)) {
      return false;
    }
    
    // 다른 타워와 겹침 체크
    for (const tower of towers) {
      const dx = Math.abs(tower.position.x - x);
      const dy = Math.abs(tower.position.y - y);
      if (dx < TILE_SIZE / 2 && dy < TILE_SIZE / 2) {
        return false;
      }
    }
    
    return true;
  };

  const handleCanvasClick = () => {
    if (!pokemonToPlace) return;

    const cost = pokemonToPlace.cost || 100; // 동적 가격
    
    // 배치 유효성 검사
    if (!isValidPlacement(mousePos.x, mousePos.y)) {
      alert('여기에는 배치할 수 없습니다!');
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
      isFainted: false,
      sprite: poke.sprite,
      range: 3,
      sellValue: 50,
      kills: 0,
      damageDealt: 0,
    };
    
    addTower(tower);
    setPokemonToPlace(null);
  };
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div style={{ 
        border: '3px solid #1a242f', 
        borderRadius: '8px', 
        overflow: 'hidden', 
        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
        transform: `scale(${canvasScale})`,
        transformOrigin: 'center',
      }}>
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
              const isValid = pokemonToPlace ? isValidPlacement(tileX, tileY) : true;
              
              return (
                <Rect
                  key={`${x}-${y}`} 
                  x={x * TILE_SIZE} 
                  y={y * TILE_SIZE}
                  width={TILE_SIZE} 
                  height={TILE_SIZE}
                  fill={
                    isPath 
                      ? '#2c3e50'  // 경로는 어둡게
                      : pokemonToPlace && !isValid
                        ? 'rgba(231, 76, 60, 0.3)'  // 배치 불가는 빨강
                        : pokemonToPlace
                          ? 'rgba(46, 204, 113, 0.2)'  // 배치 가능은 초록
                          : (x + y) % 2 === 0 ? '#3A5369' : '#3E5A71'  // 기본 체커보드
                  }
                  stroke="#2c3e50"
                  strokeWidth={0.5}
                />
              );
            })
          )}
          
          {/* 경로 */}
          {map && (
            <Line
              points={map.path.flatMap(p => [p.x, p.y])}
              stroke="#2c3e50"
              strokeWidth={40}
              lineJoin="round"
              lineCap="round"
              opacity={0.3}
            />
          )}
          
          {/* 타워 (이미지) */}
          {towers.map(tower => (
            <React.Fragment key={tower.id}>
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
          {enemies.map(enemy => (
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
                  fill={enemy.isBoss ? '#e74c3c' : '#95a5a6'}
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
          {projectiles.map(proj => (
            <Circle
              key={proj.id}
              x={proj.current.x}
              y={proj.current.y}
              radius={8}
              fill={proj.isAOE ? '#f39c12' : '#3498db'}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
          
          {/* 데미지 숫자 */}
          {damageNumbers.map(dmg => (
            <Text
              key={dmg.id}
              x={dmg.position.x - 20}
              y={dmg.position.y - 30}
              text={dmg.value.toString()}
              fontSize={dmg.isCrit ? 26 : 20}
              fill={dmg.isCrit ? '#f39c12' : '#fff'}
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
                x={mousePos.x} y={mousePos.y} radius={3 * TILE_SIZE}
                stroke="#fff" strokeWidth={2} opacity={0.4} dash={[10, 5]}
              />
            </>
          )}
        </Layer>
      </Stage>
      </div>
    </div>
  );
};