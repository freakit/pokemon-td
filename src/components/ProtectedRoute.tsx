// src/components/ProtectedRoute.tsx
import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/AuthService';
import { User } from '../types/multiplayer';
import styled from 'styled-components';

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: #0f1419;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  color: white;
  z-index: 99999;
`;

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((authedUser) => {
      console.log('ProtectedRoute(onAuthStateChange):', authedUser?.displayName || 'null');
      setUser(authedUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  if (isLoading) {
    console.log('ProtectedRoute: 로딩 중...');
    return <LoadingOverlay>유저 정보 확인 중...</LoadingOverlay>;
  }

  if (!user) {
    console.log('ProtectedRoute: user 없음, /login으로 이동');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('ProtectedRoute: user 있음, children 렌더링');
  return children;
};