// src/components/Menu/MainMenu.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { authService } from '../../services/AuthService';
import { useNavigate } from 'react-router-dom';

import { Pokedex } from '../Modals/Pokedex';
import { AchievementsPanel } from '../Modals/Achievements';
import { HallOfFame } from '../Modals/HallOfFame';
import { Rankings } from '../Modals/Rankings';

export const MainMenu = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const [showPokedex, setShowPokedex] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showRankings, setShowRankings] = useState(false);

  const handleSignOut = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await authService.signOut();
    }
  };

  const handleSinglePlay = () => navigate('/map-select');
  const handleMultiPlay = () => navigate('/lobby');

  return (
    <>
      <Overlay>
        <Container>
          <Header>
            <UserInfo>
              <Avatar src={user?.photoURL} alt={user?.displayName} />
              <UserName>{user?.displayName}</UserName>
              <Rating>⭐ Rating: {user?.rating}</Rating>
            </UserInfo>
            <SignOutButton onClick={handleSignOut}>로그아웃</SignOutButton>
          </Header>

          <Title>
            <img src="/images/kaist-ball.png" alt="Pokemon Aegis Logo" style={{ width: '80px', objectFit: 'contain', marginRight: '16px' }} />
            포켓몬 아이기스
          </Title>
          
          <MenuSection>
            <SectionTitle>게임 모드</SectionTitle>
            <GameModeButtons>
              <ModeButton onClick={handleSinglePlay}>
                <ModeIcon>👤</ModeIcon>
                <ModeTitle>싱글 플레이</ModeTitle>
                <ModeDesc>혼자서 즐기는 타워 디펜스</ModeDesc>
              </ModeButton>
              
              <ModeButton onClick={handleMultiPlay}>
                <ModeIcon>👥</ModeIcon>
                <ModeTitle>멀티 플레이</ModeTitle>
                <ModeDesc>최대 4인 대전 모드</ModeDesc>
              </ModeButton>
            </GameModeButtons>
          </MenuSection>

          <MenuSection>
            <SectionTitle>내 정보</SectionTitle>
            <BottomButtons>
              <BottomButton onClick={() => setShowPokedex(true)}>
                📖 도감
              </BottomButton>
              <BottomButton onClick={() => setShowAchievements(true)}>
                🏆 업적
              </BottomButton>
              <BottomButton onClick={() => setShowHallOfFame(true)}>
                👑 전당등록
              </BottomButton>
              <BottomButton onClick={() => setShowRankings(true)}>
                📊 랭킹
              </BottomButton>
            </BottomButtons>
          </MenuSection>
        </Container>
      </Overlay>

      {showPokedex && <Pokedex onClose={() => setShowPokedex(false)} />}
      {showAchievements && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
      {showHallOfFame && <HallOfFame onClose={() => setShowHallOfFame(false)} />}
      {showRankings && <Rankings onClose={() => setShowRankings(false)} />}
    </>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Container = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(255,255,255,0.2);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Avatar = styled.img`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 3px solid white;
`;

const UserName = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  color: white;
`;

const Rating = styled.div`
  background: rgba(255,255,255,0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  color: white;
  font-size: 0.9rem;
`;

const SignOutButton = styled.button`
  padding: 0.5rem 1rem;
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid white;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: rgba(255,255,255,0.3);
  }
`;

const Title = styled.h1`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
  text-align: center;
  margin-bottom: 0.5rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
`;

const MenuSection = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.3rem;
  color: white;
  margin-bottom: 1rem;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
`;

const GameModeButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
`;

const ModeButton = styled.button`
  background: white;
  padding: 2rem 1rem;
  border: none;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: center;
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  }
`;

const ModeIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 0.5rem;
`;

const ModeTitle = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
`;

const ModeDesc = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const BottomButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
`;

const BottomButton = styled.button`
  background: white;
  padding: 1rem;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  color: #333;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  }
`;