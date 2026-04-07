// src/components/Menu/MainMenu.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { authService } from '../../services/AuthService';
import { useNavigate } from 'react-router-dom';
import { ShootingStarsBackground } from '../UI/ShootingStarsBackground';

import { Pokedex } from '../Modals/Pokedex';
import { AchievementsPanel } from '../Modals/Achievements';
import { HallOfFame } from '../Modals/HallOfFame';
import { Rankings } from '../Modals/Rankings';
import {
  TutorialModal,
  hasTowerTutorialSeen,
  hasMultiTutorialSeen,
} from '../Modals/TutorialModal';
import { Settings } from '../Modals/Settings';

export const MainMenu = () => {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();

  const [showPokedex,      setShowPokedex]      = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHallOfFame,   setShowHallOfFame]   = useState(false);
  const [showRankings,     setShowRankings]     = useState(false);
  const [showSettings,     setShowSettings]     = useState(false);

  // 튜토리얼: 'tower' | 'multi' | null
  const [tutorial, setTutorial] = useState<'tower' | 'multi' | null>(null);
  // 튜토리얼 닫은 후 이동할 경로
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      await authService.signOut();
    }
  };

  const handleSinglePlay = () => {
    if (!hasTowerTutorialSeen()) {
      setPendingNav('/map-select');
      setTutorial('tower');
    } else {
      navigate('/map-select');
    }
  };

  const handleMultiPlay = () => {
    if (!hasMultiTutorialSeen()) {
      setPendingNav('/lobby');
      setTutorial('multi');
    } else {
      navigate('/lobby');
    }
  };

  // "시작하기" 버튼 → pendingNav 경로로 이동
  const handleProceed = () => {
    const dest = pendingNav;
    setTutorial(null);
    setPendingNav(null);
    if (dest) navigate(dest);
  };

  // X버튼 / 오버레이 클릭 → 그냥 닫기 (이동 안 함)
  const handleClose = () => {
    setTutorial(null);
    setPendingNav(null);
  };

  return (
    <>
      <ShootingStarsBackground />
      <Overlay>
        <Container>
          <Header>
            <UserInfo>
              <Avatar
                src={user?.photoURL || '/images/kaist-ball.png'}
                alt={user?.displayName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/kaist-ball.png';
                }}
              />
              <UserName>{user?.displayName}</UserName>
              <Rating>⭐ Rating: {user?.rating}</Rating>
            </UserInfo>
            <RightButtons>
              <SettingsButton onClick={() => setShowSettings(true)}>⚙️ 설정</SettingsButton>
              <SignOutButton onClick={handleSignOut}>로그아웃</SignOutButton>
            </RightButtons>
          </Header>

          <Title>
            <img
              src="/images/kaist-ball.png"
              alt="Pokemon Aegis Logo"
              style={{ width: '80px', objectFit: 'contain', marginRight: '16px' }}
            />
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
                <ModeDesc>최대 4인 PvP 배틀</ModeDesc>
              </ModeButton>
            </GameModeButtons>
          </MenuSection>

          <MenuSection>
            <SectionTitle>내 정보</SectionTitle>
            <BottomButtons>
              <BottomButton onClick={() => setShowPokedex(true)}>📖 도감</BottomButton>
              <BottomButton onClick={() => setShowAchievements(true)}>🏆 업적</BottomButton>
              <BottomButton onClick={() => setShowHallOfFame(true)}>🎖️ 전당</BottomButton>
              <BottomButton onClick={() => setShowRankings(true)}>📊 랭킹</BottomButton>
            </BottomButtons>
          </MenuSection>

          {/* 도움말 버튼 — 언제든 다시 볼 수 있음 */}
          <HelpRow>
            <HelpButton onClick={() => { setPendingNav(null); setTutorial('tower'); }}>
              ❓ 싱글 플레이 가이드
            </HelpButton>
            <HelpButton onClick={() => { setPendingNav(null); setTutorial('multi'); }}>
              ❓ 멀티 플레이 가이드
            </HelpButton>
          </HelpRow>
        </Container>
      </Overlay>

      {/* 일반 모달 */}
      {showPokedex      && <Pokedex           onClose={() => setShowPokedex(false)} />}
      {showAchievements && <AchievementsPanel  onClose={() => setShowAchievements(false)} />}
      {showHallOfFame   && <HallOfFame         onClose={() => setShowHallOfFame(false)} />}
      {showRankings     && <Rankings           onClose={() => setShowRankings(false)} />}
      {showSettings     && <Settings           onClose={() => setShowSettings(false)} />}

      {/* 튜토리얼 모달 */}
      {tutorial && (
        <TutorialModal
          mode={tutorial}
          onClose={handleClose}
          onProceed={pendingNav ? handleProceed : undefined}
        />
      )}
    </>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const Overlay = styled.div`
  min-height: 100vh;
  background-color: #0f1015;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 2rem 1rem;
`;

const Container = styled.div`
  background: rgba(26, 27, 33, 0.85);
  backdrop-filter: blur(12px);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Avatar = styled.img`
  width: 44px; height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  object-fit: cover;
  background-color: #0f1015;
`;

const UserName = styled.span`color: white; font-weight: 500; font-size: 1.05rem;`;

const Rating = styled.span`
  background: rgba(255, 255, 255, 0.05);
  padding: 0.3rem 0.6rem;
  border-radius: 6px;
  color: #a0a0a0;
  font-size: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const SignOutButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  color: #a0a0a0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.05); color: white; }
`;

const RightButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const SettingsButton = styled(SignOutButton)``;

const Title = styled.h1`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: white;
  text-align: center;
  margin-bottom: 1.5rem;
`;

const MenuSection = styled.div`margin-bottom: 2.5rem;`;

const SectionTitle = styled.h2`
  font-size: 1.1rem;
  color: #e0e0e0;
  font-weight: 500;
  margin-bottom: 1rem;
`;

const GameModeButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
`;

const ModeButton = styled.button`
  background: #23252e;
  padding: 1.5rem 1rem;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  &:hover { background: #2a2d36; }
`;

const ModeIcon  = styled.div`font-size: 2rem; margin-bottom: 0.75rem;`;
const ModeTitle = styled.div`font-size: 1.1rem; font-weight: 600; color: #fff; margin-bottom: 0.25rem;`;
const ModeDesc  = styled.div`font-size: 0.85rem; color: #888;`;

const BottomButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
`;

const BottomButton = styled.button`
  background: #23252e;
  padding: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  color: #e0e0e0;
  transition: background 0.2s;
  &:hover { background: #2a2d36; }
`;

const HelpRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-top: -1rem;
`;

const HelpButton = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #a0a0a0;
  padding: 0.75rem;
  font-size: 0.85rem;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.05); color: white; }
`;