// src/components/Auth/LoginScreen.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { authService } from '../../services/AuthService';

export const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      setError(err.message || '로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <Content>
        <Logo>🎮 포켓몬 아이기스</Logo>
        <Title>Pokemon Aegis</Title>
        <Subtitle>1세대부터 9세대까지 1025마리의 포켓몬과 함께하는 타워 디펜스</Subtitle>
        
        <LoginButton onClick={handleGoogleLogin} disabled={loading}>
          <GoogleIcon>G</GoogleIcon>
          {loading ? '로그인 중...' : 'Google로 로그인'}
        </LoginButton>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <Notice>
          ※ 게임을 플레이하려면 Google 계정으로 로그인이 필요합니다
        </Notice>
      </Content>
    </Container>
  );
};

const Container = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const Content = styled.div`
  background: white;
  padding: 3rem;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  text-align: center;
  max-width: 500px;
  width: 90%;
`;

const Logo = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  color: #333;
`;

const Subtitle = styled.p`
  color: #666;
  margin-bottom: 2rem;
  line-height: 1.5;
`;

const LoginButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  background: #4285f4;
  color: white;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    background: #357ae8;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(66, 133, 244, 0.4);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

const GoogleIcon = styled.div`
  width: 30px;
  height: 30px;
  background: white;
  color: #4285f4;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
`;

const ErrorMessage = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee;
  color: #c33;
  border-radius: 5px;
`;

const Notice = styled.div`
  margin-top: 2rem;
  font-size: 0.9rem;
  color: #888;
`;
