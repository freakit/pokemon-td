// src/App.tsx

import { useState, useEffect } from "react";
import styled from "styled-components";
import { useTranslation } from "./i18n";
import { GameCanvas } from "./components/Game/GameCanvas";
import { HUD } from "./components/UI/HUD";
import { PokemonPicker } from "./components/UI/PokemonPicker";
import { PokemonManager } from "./components/UI/PokemonManager";
import { MapSelector } from "./components/UI/MapSelector";
import { Shop } from "./components/UI/Shop";
import { Pokedex } from "./components/Modals/Pokedex";
import { AchievementsPanel } from "./components/Modals/Achievements";
import { Settings } from "./components/Modals/Settings";
import { useGameStore } from "./store/gameStore";
import { WaveSystem } from "./game/WaveSystem";
import { saveService } from "./services/SaveService";
import "./index.css";
import { SkillPicker } from './components/Modals/SkillPicker';
import { WaveEndPicker } from './components/Modals/WaveEndPicker';
import { Wave50ClearModal } from './components/Modals/Wave50ClearModal';
import { EvolutionConfirmModal } from './components/Modals/EvolutionConfirmModal';
import { SynergyTracker } from './components/UI/SynergyTracker';
import { SynergyDetails } from './components/UI/SynergyDetails';
import GlobalLanguageSwitcher from './components/UI/GlobalLanguageSwitcher';

function App() {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const [showPokemonManager, setShowPokemonManager] = useState(false);
  const [showPokedex, setShowPokedex] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(true);
  const {
    nextWave,
    isWaveActive,
    gameOver,
    reset,
    skillChoiceQueue,
    waveEndItemPick,
    spendMoney,
    wave50Clear,
  } = useGameStore((state) => ({
    nextWave: state.nextWave,
    isWaveActive: state.isWaveActive,
    gameOver: state.gameOver,
    reset: state.reset,
    skillChoiceQueue: state.skillChoiceQueue,
    waveEndItemPick: state.waveEndItemPick,
    spendMoney: state.spendMoney,
    wave50Clear: state.wave50Clear,
  }));

  const handleOpenPicker = () => {
    if (!spendMoney(20)) {
      alert(t('alerts.notEnoughMoneyEntryFee'));
      return;
    }
    setShowPicker(true);
  };

  useEffect(() => {
    const data = saveService.load();
    console.log("Loaded save data:", data);
  }, []);

  const handleStartWave = () => {
    if (isWaveActive) return;
    nextWave();
    const wave = useGameStore.getState().wave;
    WaveSystem.getInstance().startWave(wave);
  };

  const handleReset = () => {
    reset();
    setShowMapSelector(true);
    window.location.reload();
  };

  return (
    <AppContainer>
      <GameLayout>
        {/* Language Switcher */}
        <GlobalLanguageSwitcher />
        
        {/* 게임 캔버스 - 전체 화면 */}
        <CanvasContainer>
          {showMapSelector && !isWaveActive ? (
            <MapSelector onSelect={() => setShowMapSelector(false)} />
          ) : (
            <GameCanvas />
          )}
        </CanvasContainer>

        {/* 하단 컨트롤 패널 */}
        <BottomPanel>
          {(!showMapSelector || isWaveActive) && (
            <HUD
              onStartWave={handleStartWave}
              onAddPokemon={handleOpenPicker}
              onManagePokemon={() => setShowPokemonManager(true)}
            />
          )}

          {/* 추가 버튼들 (항상 표시) */}
          <ExtraButtons>
            <BottomBtn
              onClick={() => setShowPokedex(true)}
            >
              {t('nav.pokedex')}
            </BottomBtn>
            <BottomBtn
              onClick={() => setShowAchievements(true)}
            >
              {t('nav.achievements')}
            </BottomBtn>
            <BottomBtn
              onClick={() => setShowSettings(true)}
            >
              {t('nav.settings')}
            </BottomBtn>
          </ExtraButtons>
        </BottomPanel>

        {(!showMapSelector || isWaveActive) && <Shop />}
      </GameLayout>


      {showPicker && <PokemonPicker onClose={() => setShowPicker(false)} />}
      {showPokemonManager && (
        <PokemonManager onClose={() => setShowPokemonManager(false)} />
      )}
   
      {showPokedex && <Pokedex onClose={() => setShowPokedex(false)} />}
      {showAchievements && (
        <AchievementsPanel onClose={() => setShowAchievements(false)} />
      )}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {/* 시너지 트래커 */}
      <SynergyTracker />
      {/* 🆕 시너지 툴팁 */}
      <SynergyDetails />

      {/* 좌측 기술 선택 사이드바 - 레벨업 시 표시 */}
      {skillChoiceQueue && skillChoiceQueue.length > 0 && <SkillPicker />}

      {/* 진화 확인 모달 추가 */}
      <EvolutionConfirmModal />

      {/* 웨이브 종료 시 아이템 선택 모달 */}
      {waveEndItemPick && <WaveEndPicker />}

      {/* 웨이브 50 클리어 모달 */}
      {wave50Clear && (
        <Wave50ClearModal
          onContinue={() => {
            useGameStore.setState({ wave50Clear: false, isPaused: false });
          }}
          onRestart={() => {
            window.location.reload();
          }}
        />
      )}

      {gameOver && (
        <GameOverOverlay>
          <GameOverModal>
            <GameOverTitle>{t('gameOver.title')}</GameOverTitle>
            <p>{t('gameOver.reachedWave', { wave: useGameStore.getState().wave })}</p>
            <RestartBtn onClick={handleReset}>
              {t('gameOver.restart')}
            </RestartBtn>
          </GameOverModal>
        </GameOverOverlay>
      )}
    </AppContainer>
  );
}

// Styled Components
const AppContainer = styled.div`
  min-height: 100vh;
  height: 100vh;
  background: radial-gradient(ellipse at top, #1a2332 0%, #0f1419 50%, #000000 100%);
  color: #e8edf3;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const GameLayout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
`;

const CanvasContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 16px 0 16px;
  overflow: auto;
`;

const BottomPanel = styled.div`
  padding: 12px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.5));
  backdrop-filter: blur(10px);
`;

const ExtraButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

const BottomBtn = styled.button`
  padding: 10px 24px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 12px;
  border: 2px solid rgba(76, 175, 255, 0.3);
  background: linear-gradient(135deg, rgba(76, 175, 255, 0.15), rgba(76, 175, 255, 0.05));
  color: #4cafff;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(76, 175, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1);
  backdrop-filter: blur(5px);
  text-shadow: 0 0 10px rgba(76, 175, 255, 0.5);
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, rgba(76, 175, 255, 0.25), rgba(76, 175, 255, 0.15));
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(76, 175, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1);
  }
`;

const GameOverOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(231, 76, 60, 0.3), rgba(0,0,0,0.9));
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.5s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const GameOverModal = styled.div`
  background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%);
  border-radius: 32px;
  padding: 64px;
  text-align: center;
  border: 3px solid rgba(231, 76, 60, 0.4);
  box-shadow: 0 25px 80px rgba(231, 76, 60, 0.4), 0 0 100px rgba(231, 76, 60, 0.2), inset 0 1px 0 rgba(255,255,255,0.1);
  animation: pulse 2s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.02);
    }
  }
`;

const GameOverTitle = styled.h2`
  font-size: 56px;
  margin-bottom: 32px;
  color: #ff6b6b;
  text-shadow: 0 0 30px rgba(231, 76, 60, 0.8), 0 4px 8px rgba(0,0,0,0.8);
  font-weight: 900;
`;

const RestartBtn = styled.button`
  padding: 20px 60px;
  font-size: 22px;
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  color: #fff;
  border: 3px solid rgba(46, 204, 113, 0.4);
  border-radius: 16px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 8px 32px rgba(46, 204, 113, 0.5), inset 0 1px 0 rgba(255,255,255,0.2);
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  margin-top: 24px;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(46, 204, 113, 0.6), inset 0 1px 0 rgba(255,255,255,0.2);
  }

  &:active {
    transform: translateY(0);
  }
`;

export default App;