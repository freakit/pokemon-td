// src/components/GameLayout.tsx
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useTranslation } from "../i18n";
import { GameCanvas } from "./Game/GameCanvas";
import { HUD } from "./UI/HUD";
import { PokemonPicker } from "./UI/PokemonPicker";
import { PokemonManager } from "./UI/PokemonManager";
import { Shop } from "./UI/Shop";
import { Pokedex } from "./Modals/Pokedex";
import { AchievementsPanel } from "./Modals/Achievements";
import { Settings } from "./Modals/Settings";
import { HallOfFame } from "./Modals/HallOfFame";
import { Rankings } from "./Modals/Rankings";
import { useGameStore } from "../store/gameStore";
import { WaveSystem } from "../game/WaveSystem";
import { multiplayerService } from "../services/MultiplayerService";
import { MultiplayerView } from "./Multiplayer/MultiplayerView";
import { MultiplayerGameOverModal } from "./Multiplayer/MultiplayerGameOverModal";
import { BattlePhaseUI } from "./Multiplayer/BattlePhaseUI";
import { SkillPicker } from './Modals/SkillPicker';
import { WaveEndPicker } from './Modals/WaveEndPicker';
import { Wave50ClearModal } from './Modals/Wave50ClearModal';
import { EvolutionConfirmModal } from './Modals/EvolutionConfirmModal';
import { SynergyTracker } from './UI/SynergyTracker';
import { SynergyDetails } from './UI/SynergyDetails';
import GlobalLanguageSwitcher from './UI/GlobalLanguageSwitcher';
import { authService } from '../services/AuthService';
import { PlayerGameState, TowerDetail } from '../types/multiplayer';
import { aiPlayerManager } from '../services/AIPlayer';
import { media } from '../utils/responsive.utils';

interface GameLayoutProps {
  onLeaveGame: () => void;
}

export const GameLayout: React.FC<GameLayoutProps> = ({ onLeaveGame }) => {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const [showPokemonManager, setShowPokemonManager] = useState(false);
  const [showPokedex, setShowPokedex] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showRankings, setShowRankings] = useState(false);
  const [showMultiView, setShowMultiView] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState<PlayerGameState[]>([]);
  const multiRoomId = multiplayerService.getCurrentRoomId();
  const isMultiplayer = !!multiRoomId;
  const user = authService.getCurrentUser();

  // 멀티플레이어 초기화: lives 100, speed 3x
  // 멀티플레이어 초기화: lives 100, speed 3x
  const initializedRef = React.useRef(false);

  useEffect(() => {
    if (isMultiplayer && !initializedRef.current) {
      console.log('[GameLayout] Initializing Multiplayer State (Once)');
      initializedRef.current = true;
      useGameStore.setState({ 
        lives: 100, 
        money: 500,
        gameSpeed: 3 
      });
    }
  }, [isMultiplayer]);
  const {
    nextWave,
    isWaveActive,
    gameOver,
    skillChoiceQueue,
    waveEndItemPick,
    spendMoney,
    wave50Clear,
    towers,
    wave,
    lives,
    money
  } = useGameStore((state) => ({
    nextWave: state.nextWave,
    isWaveActive: state.isWaveActive,
    gameOver: state.gameOver,
    skillChoiceQueue: state.skillChoiceQueue,
    waveEndItemPick: state.waveEndItemPick,
    spendMoney: state.spendMoney,
    wave50Clear: state.wave50Clear,
    towers: state.towers,
    wave: state.wave,
    lives: state.lives,
    money: state.money,
  }));

  const handleOpenPicker = () => {
    if (!spendMoney(20)) {
      alert(t('alerts.notEnoughMoneyEntryFee'));
      return;
    }
    setShowPicker(true);
  };

  const handleStartWave = () => {
    if (isWaveActive) return;
    nextWave();
    const currentWave = useGameStore.getState().wave;
    WaveSystem.getInstance().startWave(currentWave);
  };

  const handleResetAndLeave = () => {
    onLeaveGame();
  };

  useEffect(() => {
    if (multiRoomId && user) {
      const unsubscribe = useGameStore.subscribe(
        (state, prevState) => {
          if (
            state.wave !== prevState.wave ||
            state.lives !== prevState.lives ||
            state.money !== prevState.money ||
            state.towers.length !== prevState.towers.length
          ) {
            console.log(`[GameLayout] State changed - Wave: ${state.wave}, Lives: ${state.lives}, Money: ${state.money}`);
            // 초기화 전(lives=50) 상태가 Firebase로 전송되는 것 방지
            // 멀티플레이어 시작 시 100라이프로 설정되는데, 그 전에 50이 전송되면 안됨
            if (state.lives === 50 && state.wave === 0 && !state.isWaveActive) {
                return;
            }
            
            multiplayerService.updatePlayerState(multiRoomId, user.uid, {
              wave: state.wave,
              lives: state.lives,
              money: state.money,
              towers: state.towers.length,
              isAlive: state.lives > 0
            });
          }
        }
      );
      return unsubscribe;
    }
  }, [multiRoomId, user, wave, lives, money, towers.length, isWaveActive]);

  useEffect(() => {
    if (!multiRoomId || !user) return;

    const towerDetails: TowerDetail[] = towers
      .map(t => ({
        pokemonId: t.pokemonId,
        name: t.displayName,
        level: t.level,
        sprite: t.sprite,
        position: t.position,
        currentHp: t.currentHp,
        maxHp: t.maxHp,
        isFainted: t.isFainted
      }));

    multiplayerService.updatePlayerTowerDetails(multiRoomId, user.uid, towerDetails);
  }, [multiRoomId, user, towers]);

  // 디버프 시스템 제거됨 - TFT 스타일 PvP 대전으로 대체

  // 플레이어 탈락 처리
  useEffect(() => {
    if (multiRoomId && user) {
      const unsubscribe = useGameStore.subscribe(
        (state) => {
          if (state.lives <= 0 && state.isWaveActive) {
            multiplayerService.playerDefeated(multiRoomId, user.uid);
          }
        }
      );
      return unsubscribe;
    }
  }, [multiRoomId, user, isWaveActive]);

  // 게임 종료 감지
  useEffect(() => {
    if (!multiRoomId) return;

    const unsubscribe = multiplayerService.onGameStateUpdate(multiRoomId, (players) => {
      const alivePlayers = players.filter(p => p.isAlive);
      
      if (alivePlayers.length <= 1 && players.length > 1) {
        setFinalPlayers(players);
        setShowGameOverModal(true);
        
        import('../services/AIPlayer').then(({ aiPlayerManager }) => {
          aiPlayerManager.stopAll();
        });
      }
    });

    return unsubscribe;
  }, [multiRoomId]);

  // 멀티플레이어: 페이즈가 'wave'로 변경되면 웨이브 시작
  useEffect(() => {
    if (!multiRoomId) return;

    let lastPhase: string | null = null;
    
    const unsubscribe = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, (state) => {
      if (!state) return;
      
      const currentPhase = state.currentPhase;
      const currentRound = state.currentRound;
      
      // 페이즈가 'wave'로 변경되었을 때만 웨이브 시작
      if (currentPhase === 'wave' && lastPhase !== 'wave') {
        console.log('[GameLayout] Phase changed to wave, starting wave:', currentRound);
        
        // 로컬 게임 상태 업데이트
        const gameStore = useGameStore.getState();
        if (!gameStore.isWaveActive) {
          useGameStore.setState({ 
            wave: currentRound, 
            isWaveActive: true, 
            isPaused: false 
          });
          WaveSystem.getInstance().startWave(currentRound);
        }
      }
      
      lastPhase = currentPhase;
    });

    return unsubscribe;
  }, [multiRoomId]);

  // 멀티플레이어: 웨이브 완료 감지 → markWaveCompleted 호출
  useEffect(() => {
    if (!multiRoomId || !user) return;
    
    let wasWaveActive = false;
    
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      // 웨이브가 끝났을 때 (isWaveActive: true → false)
      if (prevState.isWaveActive && !state.isWaveActive && wasWaveActive) {
        console.log('[GameLayout] Wave completed, marking as completed');
        multiplayerService.markWaveCompleted(multiRoomId, user.uid);
      }
      wasWaveActive = state.isWaveActive;
    });
    
    return unsubscribe;
  }, [multiRoomId, user]);
  
  // AI 플레이어 시작
  useEffect(() => {
    if (multiRoomId) {
      const startAIs = async () => {
        const room = await multiplayerService.getRoom(multiRoomId);
        const currentUser = authService.getCurrentUser();
        if (room && currentUser && room.hostId === currentUser.uid) {
          for (const player of room.players) {
            if (player.isAI && player.aiDifficulty) {
              aiPlayerManager.startAI(room.id, player.userId, player.aiDifficulty, room.mapId);
            }
          }
        }
      };
      startAIs();
    }

    return () => {
      aiPlayerManager.stopAll();
    };
  }, [multiRoomId]);

  return (
    <AppContainer>
      <GameLayoutContainer>
        {isWaveActive && <GlobalLanguageSwitcher />}
        
        <CanvasContainer>
          <GameCanvas />
        </CanvasContainer>

        {/* BattlePhaseUI는 페이즈 전환 로직 담당 (UI는 HUD에서 표시) */}
        {multiRoomId && <BattlePhaseUI roomId={multiRoomId} />}

        <BottomPanel>
          <HUD
            onStartWave={handleStartWave}
            onAddPokemon={handleOpenPicker}
            onManagePokemon={() => setShowPokemonManager(true)}
          />

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
            {multiRoomId && (
              <BottomBtn onClick={() => setShowMultiView(true)}>
                👥 멀티뷰
              </BottomBtn>
            )}
            <BottomBtn onClick={handleResetAndLeave}>
              🏠 메인메뉴
            </BottomBtn>
          </ExtraButtons>
        </BottomPanel>

        <Shop />
      </GameLayoutContainer>

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

      {showGameOverModal && multiRoomId && user && (
        <MultiplayerGameOverModal
          players={finalPlayers}
          myUserId={user.uid}
          onClose={() => {
            setShowGameOverModal(false);
            handleResetAndLeave();
          }}
        />
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
          onRestart={handleResetAndLeave}
        />
      )}

      {gameOver && (
        <GameOverOverlay>
          <GameOverModal>
            <GameOverTitle>{t('gameOver.title')}</GameOverTitle>
            <p>{t('gameOver.reachedWave', { wave: useGameStore.getState().wave })}</p>
            <RestartBtn onClick={handleResetAndLeave}>
              {t('gameOver.restart')}
            </RestartBtn>
          </GameOverModal>
        </GameOverOverlay>
      )}
    </AppContainer>
  );
};

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

const GameLayoutContainer = styled.div`
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
  padding: 8px 8px 0 8px;
  overflow: auto;

  ${media.mobile} {
    padding: 4px 4px 0 4px;
  }
`;

const BottomPanel = styled.div`
  padding: 6px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.5));
  backdrop-filter: blur(10px);

  ${media.mobile} {
    padding: 4px;
  }
`;

const ExtraButtons = styled.div`
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;

  ${media.mobile} {
    gap: 4px;
  }
`;

const BottomBtn = styled.button`
  padding: 6px 16px;
  font-size: 13px;
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

  ${media.tablet} {
    padding: 5px 12px;
    font-size: 12px;
  }

  ${media.mobile} {
    padding: 4px 10px;
    font-size: 10px;
    flex: 1;
    min-width: 0;
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
  padding: 32px;
  text-align: center;
  border: 3px solid rgba(231, 76, 60, 0.4);
  box-shadow: 0 25px 80px rgba(231, 76, 60, 0.4), 0 0 100px rgba(231, 76, 60, 0.2), inset 0 1px 0 rgba(255,255,255,0.1);

  ${media.tablet} {
    padding: 24px;
    border-radius: 24px;
  }

  ${media.mobile} {
    padding: 20px;
    border-radius: 16px;
    margin: 16px;
  }
`;

const GameOverTitle = styled.h2`
  font-size: 48px;
  margin-bottom: 24px;
  color: #ff6b6b;
  text-shadow: 0 0 30px rgba(231, 76, 60, 0.8), 0 4px 8px rgba(0,0,0,0.8);
  font-weight: 900;

  ${media.tablet} {
    font-size: 36px;
    margin-bottom: 20px;
  }

  ${media.mobile} {
    font-size: 28px;
    margin-bottom: 16px;
  }
`;

const RestartBtn = styled.button`
  padding: 16px 48px;
  font-size: 18px;
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  color: #fff;
  border: 3px solid rgba(46, 204, 113, 0.4);
  border-radius: 16px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 8px 32px rgba(46, 204, 113, 0.5), inset 0 1px 0 rgba(255,255,255,0.2);
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  margin-top: 20px;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(46, 204, 113, 0.6), inset 0 1px 0 rgba(255,255,255,0.2);
  }

  &:active {
    transform: translateY(0);
  }

  ${media.tablet} {
    padding: 12px 36px;
    font-size: 16px;
  }

  ${media.mobile} {
    padding: 10px 28px;
    font-size: 14px;
  }
`;