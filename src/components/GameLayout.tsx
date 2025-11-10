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
import { SkillPicker } from './Modals/SkillPicker';
import { WaveEndPicker } from './Modals/WaveEndPicker';
import { Wave50ClearModal } from './Modals/Wave50ClearModal';
import { EvolutionConfirmModal } from './Modals/EvolutionConfirmModal';
import { SynergyTracker } from './UI/SynergyTracker';
import { SynergyDetails } from './UI/SynergyDetails';
import GlobalLanguageSwitcher from './UI/GlobalLanguageSwitcher';
import { authService } from '../services/AuthService';
import { PlayerGameState } from '../types/multiplayer';

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
  const user = authService.getCurrentUser();

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
    if (multiRoomId) {
      const unsubscribe = useGameStore.subscribe(
        (state, prevState) => {
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
      return unsubscribe;
    }
  }, [multiRoomId, wave, lives, money, towers.length, isWaveActive]);

  // ⭐ 타워 상세 정보 동기화
  useEffect(() => {
    if (!multiRoomId) return;

    const towerDetails = towers
      .filter(t => !t.isFainted)
      .map(t => ({
        pokemonId: t.pokemonId,
        name: t.name,
        level: t.level,
        sprite: t.sprite,
        position: t.position
      }));

    multiplayerService.updatePlayerTowerDetails(multiRoomId, towerDetails);
  }, [multiRoomId, towers]);

  useEffect(() => {
    if (multiRoomId) {
      const unsubscribe = multiplayerService.onDebuffReceived(multiRoomId, (debuff) => {
        applyDebuff(debuff);
      });
      return unsubscribe;
    }
  }, [multiRoomId]);
  
  useEffect(() => {
    if (multiRoomId) {
      const unsubscribe = useGameStore.subscribe(
        (state) => {
          if (state.lives <= 0 && state.isWaveActive) {
            multiplayerService.playerDefeated(multiRoomId);
          }
        }
      );
      return unsubscribe;
    }
  }, [multiRoomId, isWaveActive]);

  // ⭐ 게임 종료 감지
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
      case 'freeze_towers':
        towers.forEach(tower => {
          tower.equippedMoves.forEach((m) => {
            m.currentCooldown = debuff.value * 1000;
          });
        });
        setTimeout(() => {
          towers.forEach(tower => {
            tower.equippedMoves.forEach(m => {
              m.currentCooldown = 0;
            });
          });
        }, debuff.value * 1000);
        alert(`상대가 타워 동결 디버프를 사용했습니다! ${debuff.value}초간 공격 불가!`);
        break;
      case 'spawn_boss':
        const waveSystem = WaveSystem.getInstance();
        const currentWave = useGameStore.getState().wave;
        waveSystem.spawnDebuffBoss(currentWave);
        alert('⚠️ 상대가 보스를 투입했습니다!');
        break;
      case 'disable_shop':
        useGameStore.setState({ isShopDisabled: true });
        alert(`🚫 상대가 상점을 봉쇄했습니다! ${debuff.value}초간 상점 사용 불가!`);
        setTimeout(() => {
          useGameStore.setState({ isShopDisabled: false });
          alert('✅ 상점 봉쇄가 해제되었습니다!');
        }, debuff.value * 1000);
        break;
    }
  };

  return (
    <AppContainer>
      <GameLayoutContainer>
        {isWaveActive && <GlobalLanguageSwitcher />}
        
        <CanvasContainer>
          <GameCanvas />
        </CanvasContainer>

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
