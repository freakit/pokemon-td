// src/App.tsx
import { useState, useEffect } from "react";
import styled from "styled-components";
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { authService } from "./services/AuthService";
import { User } from "./types/multiplayer";
import { useGameStore } from "./store/gameStore";
import { multiplayerService } from "./services/MultiplayerService";
import { useTranslation } from "./i18n";
import { pokeAPI } from './api/pokeapi';

import { LoginScreen } from "./Auth/LoginScreen";
import { MainMenu } from "./components/Menu/MainMenu";
import { MultiplayerLobby } from "./components/Multiplayer/MultiplayerLobby";
import { MapSelector } from "./components/UI/MapSelector";
import { GameLayout } from "./components/GameLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

const PreloadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.95));
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease-out;
`;

const LoadingText = styled.h1`
  font-size: 24px;
  color: #fff;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.7);
  
  &::after {
    content: '...';
    animation: dots 1.4s infinite;
  }

  @keyframes dots {
    0%, 20% { content: '.'; }
    40% { content: '..'; }
    60%, 100% { content: '...'; }
  }
`;

function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGamePreloading, setIsGamePreloading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const resetGame = useGameStore((state) => state.reset);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((authedUser) => {
      console.log('App.tsx(onAuthStateChange):', authedUser?.displayName || 'null', '현재 경로:', location.pathname);

      setUser(authedUser);
      setIsAuthLoading(false);
      
      if (authedUser && location.pathname === '/login') {
        console.log('App.tsx: 로그인 성공, /로 이동');
        navigate('/');
      }
     
    });
    return unsubscribe;
  }, [navigate, location.pathname]);

  // [수정] 멀티플레이 맵 로딩 버그 수정
  const handlePreloadAndNavigate = async (mapId: string, gameMode: 'single' | 'multi') => {
    
    // [수정] 맵 ID를 스토어에 설정하는 로직을 공통으로 이동
    useGameStore.getState().setMap(mapId);
    
    if (gameMode === 'single') {
      // 싱글플레이 전용 로직 (필요시)
    }
    
    setIsGamePreloading(true);
    try {
      await pokeAPI.preloadRarities();
      navigate('/game');
    } catch (err) {
      console.error("Failed to preload rarities", err);
      alert("게임 데이터 로드에 실패했습니다. 새로고침 해주세요.");
    }
    setIsGamePreloading(false);
  };

  const handleLeaveGame = () => {
    resetGame();
    const multiRoomId = multiplayerService.getCurrentRoomId();
    if (multiRoomId) {
      multiplayerService.leaveRoom(multiRoomId);
    }
    multiplayerService.clearCurrentRoom();
    navigate('/');
  };

  if (isAuthLoading) {
    return (
      <PreloadingOverlay>
        <LoadingText>유저 정보 확인 중...</LoadingText>
      </PreloadingOverlay>
    );
  }

  if (isGamePreloading) {
    return (
      <PreloadingOverlay>
        <LoadingText>{t('picker.loading')}</LoadingText>
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
              // [수정] gameMode: 'multi' 전달
              handlePreloadAndNavigate(mapId, 'multi');
            }}
          />
        </ProtectedRoute>
      } />

      <Route path="/map-select" element={
        <ProtectedRoute>
          <MapSelector 
            onSelect={(mapId) => {
              // [수정] gameMode: 'single' 전달
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