// src/App.tsx
import { useState, useEffect, useCallback } from "react";
import styled, { keyframes } from "styled-components";
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { authService } from "./services/AuthService";
import { User } from "./types/multiplayer";
import { useGameStore } from "./store/gameStore";
import { multiplayerService } from "./services/MultiplayerService";
import { saveService } from "./services/SaveService";
import { pokeAPI } from './api/pokeapi';
import { getMapById } from './data/maps';

import { LoginScreen } from "./Auth/LoginScreen";
import { MainMenu } from "./components/Menu/MainMenu";
import { MultiplayerLobby } from "./components/Multiplayer/MultiplayerLobby";
import { MapSelector } from "./components/UI/MapSelector";
import { GameLayout } from "./components/GameLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

// ─── Styled Components ────────────────────────────────────────────────────────

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;

const PreloadingOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(circle at center, rgba(0,0,0,0.85), rgba(0,0,0,0.95));
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: ${fadeIn} 0.3s ease-out;
  gap: 24px;
`;

const LoadingTitle = styled.h1`
  font-size: 24px;
  color: #fff;
  text-shadow: 0 0 15px rgba(255,255,255,0.7);
  margin: 0;
`;

const ProgressBarOuter = styled.div`
  width: 320px;
  height: 12px;
  background: rgba(255,255,255,0.15);
  border-radius: 6px;
  overflow: hidden;
`;

const ProgressBarInner = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${p => p.$pct}%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  border-radius: 6px;
  transition: width 0.2s ease;
`;

const ProgressText = styled.p`
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  margin: 0;
`;

// ─── [수정 1] 맵 배경 이미지 프리로드 헬퍼 ────────────────────────────────────

function preloadMapBackground(mapId: string): Promise<void> {
  return new Promise((resolve) => {
    const map = getMapById(mapId);
    if (!map?.backgroundImage) {
      resolve();
      return;
    }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => {
      console.warn(`Map background image failed to load: ${map.backgroundImage}`);
      resolve(); // 실패해도 게임 진행은 허용
    };
    img.src = map.backgroundImage;
  });
}

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGamePreloading, setIsGamePreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 1025 });
  // [수정 1] 로딩 단계 텍스트 상태 추가
  const [loadingStage, setLoadingStage] = useState<'pokemon' | 'map' | 'done'>('pokemon');

  const navigate = useNavigate();
  const location = useLocation();
  const resetGame = useGameStore((state) => state.reset);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((authedUser) => {
      setUser(authedUser);
      setIsAuthLoading(false);
      if (authedUser) {
        // 로그인 성공 시 DB 업적을 로컬과 병합 (나갔다 들어와도 업적 유지)
        saveService.syncAchievementsFromDB().catch(err =>
          console.warn('[App] Failed to sync achievements:', err)
        );
        if (location.pathname === '/login') {
          navigate('/');
        }
      }
    });
    return unsubscribe;
  }, [navigate, location.pathname]);

  // [수정 1] 맵 배경 이미지도 함께 프리로드 → 모두 완료 후 게임 화면 열기
  const handlePreloadAndNavigate = useCallback(
    async (mapId: string, gameMode: 'single' | 'multi') => {
      resetGame();
      useGameStore.getState().setMap(mapId);

      if (gameMode === 'single') {
        multiplayerService.clearCurrentRoom();
      }

      setIsGamePreloading(true);
      setPreloadProgress({ loaded: 0, total: 1025 });
      setLoadingStage('pokemon');

      try {
        // 1단계: 포켓몬 데이터 프리로드
        await pokeAPI.preloadRarities((loaded, total) => {
          setPreloadProgress({ loaded, total });
        });

        // 2단계: 맵 배경 이미지 프리로드
        setLoadingStage('map');
        await preloadMapBackground(mapId);

        setLoadingStage('done');
        navigate('/game');
      } catch (err) {
        console.error('Failed to preload game data', err);
        alert('게임 데이터 로드에 실패했습니다. 새로고침 해주세요.');
      } finally {
        setIsGamePreloading(false);
      }
    },
    [resetGame, navigate]
  );

  const handleLeaveGame = useCallback(() => {
    const multiRoomId = multiplayerService.getCurrentRoomId();
    resetGame();
    if (multiRoomId) {
      multiplayerService.leaveRoom(multiRoomId);
      multiplayerService.clearCurrentRoom();
      navigate('/lobby');
    } else {
      multiplayerService.clearCurrentRoom();
      navigate('/map-select');
    }
  }, [resetGame, navigate]);


  if (isAuthLoading) {
    return (
      <PreloadingOverlay>
        <LoadingTitle>유저 정보 확인 중...</LoadingTitle>
      </PreloadingOverlay>
    );
  }

  if (isGamePreloading) {
    const pct = preloadProgress.total > 0
      ? Math.floor((preloadProgress.loaded / preloadProgress.total) * 100)
      : 0;

    // [수정 1] 로딩 단계별 텍스트 표시
    const stageText = loadingStage === 'map'
      ? '맵 배경 로딩 중...'
      : pct >= 100
        ? '거의 다 됐어요! ✨'
        : '포켓몬 데이터 로딩 중...';

    return (
      <PreloadingOverlay>
        <LoadingTitle>{stageText}</LoadingTitle>
        <ProgressBarOuter>
          <ProgressBarInner $pct={loadingStage === 'map' ? 100 : pct} />
        </ProgressBarOuter>
        <ProgressText>
          {loadingStage === 'map'
            ? '맵 배경 이미지를 불러오고 있습니다...'
            : `${preloadProgress.loaded} / ${preloadProgress.total} (${pct}%)`}
        </ProgressText>
      </PreloadingOverlay>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />

      <Route path="/" element={
        <ProtectedRoute>
          <MainMenu />
        </ProtectedRoute>
      } />

      <Route path="/lobby" element={
        <ProtectedRoute>
          <MultiplayerLobby
            onBack={() => navigate('/')}
            onStartGame={(_roomId, mapId) => {
              handlePreloadAndNavigate(mapId, 'multi');
            }}
          />
        </ProtectedRoute>
      } />

      <Route path="/map-select" element={
        <ProtectedRoute>
          <MapSelector
            onSelect={(mapId) => {
              handlePreloadAndNavigate(mapId, 'single');
            }}
          />
        </ProtectedRoute>
      } />

      <Route path="/game" element={
        <ProtectedRoute>
          <GameLayout onLeaveGame={handleLeaveGame} />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
}

export default App;