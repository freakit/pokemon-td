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
import { HallOfFame } from "./components/Modals/HallOfFame";
import { Rankings } from "./components/Modals/Rankings";
import { useGameStore } from "./store/gameStore";
import { WaveSystem } from "./game/WaveSystem";
import { saveService } from "./services/SaveService";
import { authService } from "./services/AuthService";
import { multiplayerService } from "./services/MultiplayerService";
import { LoginScreen } from "./Auth/LoginScreen";
import { MainMenu } from "./components/Menu/MainMenu";
import { MultiplayerLobby } from "./Multiplayer/MultiplayerLobby";
import { MultiplayerView } from "./Multiplayer/MultiplayerView";
import { User } from "./types/multiplayer";
import "./index.css";
import { SkillPicker } from './components/Modals/SkillPicker';
import { WaveEndPicker } from './components/Modals/WaveEndPicker';
import { Wave50ClearModal } from './components/Modals/Wave50ClearModal';
import { EvolutionConfirmModal } from './components/Modals/EvolutionConfirmModal';
import { SynergyTracker } from './components/UI/SynergyTracker';
import { SynergyDetails } from './components/UI/SynergyDetails';
import GlobalLanguageSwitcher from './components/UI/GlobalLanguageSwitcher';
import { pokeAPI } from './api/pokeapi';

type GameMode = 'none' | 'single' | 'multi';

function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('none');
  const [showMainMenu, setShowMainMenu] = useState(true);
  const [showMultiLobby, setShowMultiLobby] = useState(false);
  const [multiRoomId, setMultiRoomId] = useState<string | null>(null);
  const [showMultiView, setShowMultiView] = useState(false);
  
  const [showPicker, setShowPicker] = useState(false);
  const [showPokemonManager, setShowPokemonManager] = useState(false);
  const [showPokedex, setShowPokedex] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showRankings, setShowRankings] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  
  const {
    nextWave,
    isWaveActive,
    gameOver,
    reset,
    skillChoiceQueue,
    waveEndItemPick,
    spendMoney,
    wave50Clear,
    isPreloading,
    setPreloading,
    towers
  } = useGameStore((state) => ({
    nextWave: state.nextWave,
    isWaveActive: state.isWaveActive,
    gameOver: state.gameOver,
    reset: state.reset,
    skillChoiceQueue: state.skillChoiceQueue,
    waveEndItemPick: state.waveEndItemPick,
    spendMoney: state.spendMoney,
    wave50Clear: state.wave50Clear,
    isPreloading: state.isPreloading,
    setPreloading: state.setPreloading,
    towers: state.towers,
    wave: state.wave,
    lives: state.lives,
    money: state.money
  }));

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange(setUser);
    return unsubscribe;
  }, []);

  // Zustand store를 구독
  useEffect(() => {
    if (gameMode === 'multi' && multiRoomId) {
      const unsubscribe = useGameStore.subscribe(
        (state, prevState) => {
          // 상태가 실제로 변경되었을 때만 전송
          if (state.isWaveActive && (
            state.wave !== prevState.wave ||
            state.lives !== prevState.lives ||
            state.money !== prevState.money ||
            state.towers.length !== prevState.towers.length
          )) {
            multiplayerService.updatePlayerState(multiRoomId, {
              wave: state.wave,
              lives: state.lives,
              money: state.money,
              towers: state.towers.length,
              isAlive: state.lives > 0
            });
          }
        }
      );
      return unsubscribe; // 컴포넌트 언마운트 시 구독 취소
    }
  }, [gameMode, multiRoomId]);

  useEffect(() => {
    if (gameMode === 'multi' && multiRoomId) {
      const unsubscribe = multiplayerService.onDebuffReceived(multiRoomId, (debuff) => {
        applyDebuff(debuff);
      });
      return unsubscribe;
    }
  }, [gameMode, multiRoomId]);

  const applyDebuff = (debuff: any) => {
    switch (debuff.type) {
      case 'instant_kill':
        if (towers.length > 0) {
          const randomIndex = Math.floor(Math.random() * towers.length);
          useGameStore.getState().updateTower(towers[randomIndex].id, { 
            currentHp: 0, 
            isFainted: true 
          });
          alert('상대가 포켓몬 즉사 디버프를 사용했습니다!');
        }
        break;
      case 'slow_attack':
        towers.forEach(tower => {
          useGameStore.getState().updateTower(tower.id, { 
            speed: tower.speed * 0.5 
          });
        });
        setTimeout(() => {
          towers.forEach(tower => {
            useGameStore.getState().updateTower(tower.id, { 
              speed: tower.speed * 2 
            });
          });
        }, debuff.value * 1000);
        alert('상대가 공속 감소 디버프를 사용했습니다!');
        break;
      case 'reduce_gold':
        const currentMoney = useGameStore.getState().money;
        useGameStore.setState({ money: Math.max(0, currentMoney - debuff.value) });
        alert(`상대가 골드 ${debuff.value}을 강탈했습니다!`);
        break;
    }
  };

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
    const currentWave = useGameStore.getState().wave;
    WaveSystem.getInstance().startWave(currentWave);
  };

  const handleReset = () => {
    reset();
    setShowMapSelector(false);
    setGameMode('none');
    setShowMainMenu(true);
    setMultiRoomId(null);
    if (multiRoomId) {
      multiplayerService.leaveRoom(multiRoomId);
    }
  };

  const handleMapSelect = async () => {
    setShowMapSelector(false);
    setPreloading(true);

    try {
      await pokeAPI.preloadRarities();
    } catch (err) {
      console.error("Failed to preload rarities", err);
      alert("게임 데이터 로드에 실패했습니다. 새로고침 해주세요.");
    }

    setPreloading(false);
  };

  const handleSinglePlay = () => {
    setGameMode('single');
    setShowMainMenu(false);
    setShowMapSelector(true);
  };

  const handleMultiPlay = () => {
    setGameMode('multi');
    setShowMainMenu(false);
    setShowMultiLobby(true);
  };

  const handleMultiGameStart = (roomId: string, mapId: string) => {
    setMultiRoomId(roomId);
    setShowMultiLobby(false);
    setShowMapSelector(false);
    useGameStore.getState().setMap(mapId);
  };

  if (!user) {
    return <LoginScreen />;
  }

  if (showMainMenu) {
    return (
      <MainMenu
        onSinglePlay={handleSinglePlay}
        onMultiPlay={handleMultiPlay}
        onShowPokedex={() => setShowPokedex(true)}
        onShowAchievements={() => setShowAchievements(true)}
        onShowHallOfFame={() => setShowHallOfFame(true)}
        onShowRankings={() => setShowRankings(true)}
      />
    );
  }

  if (showMultiLobby) {
    return (
      <>
        <MultiplayerLobby
          onBack={() => {
            setShowMultiLobby(false);
            setShowMainMenu(true);
            setGameMode('none');
          }}
          onStartGame={handleMultiGameStart}
        />
        {showPokedex && <Pokedex onClose={() => setShowPokedex(false)} />}
        {showAchievements && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
        {showHallOfFame && <HallOfFame onClose={() => setShowHallOfFame(false)} />}
        {showRankings && <Rankings onClose={() => setShowRankings(false)} />}
      </>
    );
  }

  return (
    <AppContainer>
      {isPreloading && (
        <PreloadingOverlay>
          <LoadingText>{t('picker.loading')}</LoadingText>
        </PreloadingOverlay>
      )}

      <GameLayout>
        {showMapSelector && <GlobalLanguageSwitcher />}
        
        <CanvasContainer>
          {showMapSelector && !isWaveActive ? (
            <MapSelector onSelect={handleMapSelect} />
          ) : (
            <GameCanvas />
          )}
        </CanvasContainer>

        <BottomPanel>
          {(!showMapSelector || isWaveActive) && (
            <HUD
              onStartWave={handleStartWave}
              onAddPokemon={handleOpenPicker}
              onManagePokemon={() => setShowPokemonManager(true)}
            />
          )}

          <ExtraButtons>
            <BottomBtn onClick={() => setShowPokedex(true)}>
              {t('nav.pokedex')}
            </BottomBtn>
            <BottomBtn onClick={() => setShowAchievements(true)}>
              {t('nav.achievements')}
            </BottomBtn>
            <BottomBtn onClick={() => setShowHallOfFame(true)}>
              전당등록
            </BottomBtn>
            <BottomBtn onClick={() => setShowRankings(true)}>
              랭킹
            </BottomBtn>
            <BottomBtn onClick={() => setShowSettings(true)}>
              {t('nav.settings')}
            </BottomBtn>
            {gameMode === 'multi' && multiRoomId && (
              <BottomBtn onClick={() => setShowMultiView(true)}>
                👥 멀티뷰
              </BottomBtn>
            )}
            <BottomBtn onClick={handleReset}>
              🏠 메인메뉴
            </BottomBtn>
          </ExtraButtons>
        </BottomPanel>

        {(!showMapSelector || isWaveActive) && <Shop />}
      </GameLayout>

      {showPicker && <PokemonPicker onClose={() => setShowPicker(false)} />}
      {showPokemonManager && <PokemonManager onClose={() => setShowPokemonManager(false)} />}
      {showPokedex && <Pokedex onClose={() => setShowPokedex(false)} />}
      {showAchievements && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showHallOfFame && <HallOfFame onClose={() => setShowHallOfFame(false)} />}
      {showRankings && <Rankings onClose={() => setShowRankings(false)} />}
      {showMultiView && multiRoomId && (
        <MultiplayerView roomId={multiRoomId} onClose={() => setShowMultiView(false)} />
      )}

      <SynergyTracker />
      <SynergyDetails />

      {skillChoiceQueue && skillChoiceQueue.length > 0 && <SkillPicker />}
      <EvolutionConfirmModal />
      {waveEndItemPick && <WaveEndPicker />}

      {wave50Clear && (
        <Wave50ClearModal
          onContinue={() => {
            useGameStore.setState({ wave50Clear: false, isPaused: false });
          }}
          onRestart={handleReset}
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
  flex-wrap: wrap;
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
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const GameOverModal = styled.div`
  background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%);
  border-radius: 32px;
  padding: 64px;
  text-align: center;
  border: 3px solid rgba(231, 76, 60, 0.4);
  box-shadow: 0 25px 80px rgba(231, 76, 60, 0.4), 0 0 100px rgba(231, 76, 60, 0.2), inset 0 1px 0 rgba(255,255,255,0.1);
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
  z-index: 99999;
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

export default App;
