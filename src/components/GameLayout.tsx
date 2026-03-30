// src/components/GameLayout.tsx
import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
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
  const lastAppliedRoundRef = useRef<number>(-1);
  const [battleResultToast, setBattleResultToast] = useState<{
    won: boolean;
    goldDelta: number;
    livesDelta: number;
    round: number;
  } | null>(null);

  // ─── 멀티플레이 게임 시작 로딩 상태 ──────────────────────────────
  // gameState가 null → waiting_wave로 전환되기 전까지 조작 차단
  const [multiLoading, setMultiLoading] = useState(isMultiplayer);

  // ─── 멀티플레이어 초기화 ───────────────────────────────────────────
  const syncReadyRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isMultiplayer && !initializedRef.current) {
      initializedRef.current = true;
      // 싱글과 동일하게 lives:50으로 통일
      useGameStore.setState({ lives: 50, money: 500, gameSpeed: 3 });
      syncReadyRef.current = true;
    } else if (!isMultiplayer) {
      syncReadyRef.current = true;
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
  } = useGameStore((state) => ({
    nextWave: state.nextWave,
    isWaveActive: state.isWaveActive,
    gameOver: state.gameOver,
    skillChoiceQueue: state.skillChoiceQueue,
    waveEndItemPick: state.waveEndItemPick,
    spendMoney: state.spendMoney,
    wave50Clear: state.wave50Clear,
    towers: state.towers,
  }));

  const handleOpenPicker = () => {
    if (!spendMoney(20)) {
      alert(t('alerts.notEnoughMoneyPicker'));
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

  // ─── 로컬 → Firebase 상태 동기화 ────────────────────────────────
  // syncReadyRef가 true가 된 이후에만 subscribe가 실제로 전송
  // (초기화 전 lives:50 유출 원천 차단)
  useEffect(() => {
    if (!multiRoomId || !user) return;

    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      // 초기화 완료(초기값 Firebase 전송) 전에는 전송하지 않음
      if (!syncReadyRef.current) return;

      const changed =
        state.wave !== prevState.wave ||
        state.lives !== prevState.lives ||
        state.money !== prevState.money ||
        state.towers.length !== prevState.towers.length;

      if (!changed) return;

      multiplayerService.updatePlayerState(multiRoomId, user.uid, {
        wave: state.wave,
        lives: state.lives,
        money: state.money,
        towers: state.towers.length,
        isAlive: state.lives > 0
      });
    });

    return unsubscribe;
  }, [multiRoomId, user]);

  // 타워 상세 정보 동기화
  useEffect(() => {
    if (!multiRoomId || !user) return;

    const scrub = (obj: any): any => JSON.parse(JSON.stringify(obj));

    const towerDetails: TowerDetail[] = towers.map(t => scrub({
      pokemonId: t.pokemonId,
      name: t.displayName,
      level: t.level,
      sprite: t.sprite,
      position: t.position,
      currentHp: t.currentHp,
      maxHp: t.maxHp,
      isFainted: t.isFainted,
      attack: t.attack,
      defense: t.defense,
      specialAttack: t.specialAttack,
      specialDefense: t.specialDefense,
      speed: t.speed,
      types: t.types,
      equippedMoves: t.equippedMoves,
      lifesteal: t.lifesteal,
      aoeBonus: t.aoeBonus,
    }));

    multiplayerService.updatePlayerTowerDetails(multiRoomId, user.uid, towerDetails);
  }, [multiRoomId, user, towers]);

  // ─── [수정] 탈락 처리 ────────────────────────────────────────────
  // 중복 호출 방지: 이미 탈락 처리됐으면 재호출하지 않음
  const defeatedRef = useRef(false);

  useEffect(() => {
    if (!multiRoomId || !user) return;

    const unsubscribe = useGameStore.subscribe((state) => {
      if (state.lives <= 0 && !defeatedRef.current) {
        defeatedRef.current = true;
        console.log('[GameLayout] Player defeated');
        multiplayerService.playerDefeated(multiRoomId, user.uid);
      }
    });

    return unsubscribe;
  }, [multiRoomId, user]);

  // ─── [수정] 웨이브 완료 감지 → markWaveCompleted 호출 ────────────
  // wasWaveActive를 ref로 관리해 클로저 오감지 방지
  // 탈락 후에는 호출하지 않음
  useEffect(() => {
    if (!multiRoomId || !user) return;

    const wasWaveActiveRef = { current: false };

    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      // 탈락 후에는 무시
      if (defeatedRef.current) return;

      // isWaveActive가 true → false 로 바뀔 때만 (웨이브 종료)
      if (prevState.isWaveActive && !state.isWaveActive && wasWaveActiveRef.current) {
        console.log('[GameLayout] Wave completed, notifying Firebase and force syncing towers');
        
        // 웨이브 도중 타워의 현재 체력, 경험치 등이 배열 참조 변경 없이 가변(mutate)되므로, 
        // 여기서 마지막 상태를 강제로 JSON 직렬화 후 한 번 더 동기화하여 TFT 전에 최신판으로 맞춤
        const scrub = (obj: any): any => JSON.parse(JSON.stringify(obj));
        const currentTowers = useGameStore.getState().towers;
        const towerDetails: TowerDetail[] = currentTowers.map(t => scrub({
          pokemonId: t.pokemonId,
          name: t.displayName,
          level: t.level,
          sprite: t.sprite,
          position: t.position,
          currentHp: t.currentHp,
          maxHp: t.maxHp,
          isFainted: t.isFainted,
          attack: t.attack,
          defense: t.defense,
          specialAttack: t.specialAttack,
          specialDefense: t.specialDefense,
          speed: t.speed,
          types: t.types,
          equippedMoves: t.equippedMoves,
          lifesteal: t.lifesteal,
          aoeBonus: t.aoeBonus,
        }));
        multiplayerService.updatePlayerTowerDetails(multiRoomId, user.uid, towerDetails);

        multiplayerService.markWaveCompleted(multiRoomId, user.uid);
      }

      wasWaveActiveRef.current = state.isWaveActive;
    });

    return unsubscribe;
  }, [multiRoomId, user]);

  // ─── 페이즈 'wave' → 로컬 웨이브 시작 ──────────────────────────
  // 탈락 후에는 로컬 웨이브를 시작하지 않음
  useEffect(() => {
    if (!multiRoomId) return;

    let lastPhase: string | null = null;
    let aiStarted = false; // AI는 딱 한 번만 시작

    const unsubscribe = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, (state) => {
      if (!state) return;

      const currentPhase = state.currentPhase;
      const currentRound = state.currentRound;

      // null → waiting_wave 첫 전환 시: 로딩 해제 + AI 시작
      if (currentPhase === 'waiting_wave' && lastPhase === null) {
        setMultiLoading(false);

        // [수정] AI는 waiting_wave를 수신한 직후 시작
        // → AI의 currentPhase 초기값('waiting_wave')과 실제 페이즈가 같아
        //   onPhaseChange가 누락되던 문제 해결
        if (!aiStarted) {
          aiStarted = true;
          const startAIs = async () => {
            const room = await multiplayerService.getRoom(multiRoomId);
            const currentUser = authService.getCurrentUser();
            if (room && currentUser && room.hostId === currentUser.uid) {
              for (const player of room.players) {
                if (player.isAI && player.aiDifficulty) {
                  // 초기 페이즈를 null로 강제해서 waiting_wave를 반드시 onPhaseChange로 처리
                  aiPlayerManager.startAI(room.id, player.userId, player.aiDifficulty, room.mapId);
                }
              }
            }
          };
          startAIs().catch(console.error);
        }
      }

      if (currentPhase === 'wave' && lastPhase !== 'wave') {
        console.log('[GameLayout] Phase changed to wave, starting wave:', currentRound);

        // 탈락한 플레이어는 로컬 웨이브를 시작하지 않음
        if (defeatedRef.current) {
          lastPhase = currentPhase;
          return;
        }

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

        // 게임 종료 시 레이팅 업데이트 (호스트가 처리)
        // BattlePhaseUI에서 처리하도록 신호를 줄 수도 있지만,
        // 여기서는 단순히 모달만 띄움
      }
    });

    return unsubscribe;
  }, [multiRoomId]);

  useEffect(() => {
    if (!multiRoomId || !user) return;
 
    const unsubscribe = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, (state) => {
      if (!state) return;
 
      // 내 결과 찾기 (현재 라운드, 아직 로컬에 반영 안 한 것)
      const myResult = (state.battleResults || []).find(
        r =>
          r.roundNumber === state.currentRound &&
          r.roundNumber > lastAppliedRoundRef.current &&
          (r.player1Id === user.uid || r.player2Id === user.uid)
      );
 
      if (!myResult) return;
      lastAppliedRoundRef.current = myResult.roundNumber;
 
      const isWinner = myResult.winnerId === user.uid;
 
      // Firebase PlayerGameState에서 내 최신 상태 가져오기
      const myFirebaseState = state.players.find(p => p.userId === user.uid);
      if (!myFirebaseState) return;
 
      // 로컬 store와 Firebase 값의 차이 계산 (실제 변경분)
      const localState = useGameStore.getState();
      const livesDelta = myFirebaseState.lives - localState.lives;
      const goldDelta  = myFirebaseState.money  - localState.money;
 
      // 로컬 Zustand store에 반영
      if (livesDelta !== 0 || goldDelta !== 0) {
        useGameStore.setState({
          lives: Math.max(0, myFirebaseState.lives),
          money: Math.max(0, myFirebaseState.money),
        });
      }
 
      // 결과 토스트 표시
      setBattleResultToast({
        won: isWinner,
        goldDelta,
        livesDelta,
        round: myResult.roundNumber,
      });
      setTimeout(() => setBattleResultToast(null), 5000);
    });
 
    return unsubscribe;
  }, [multiRoomId, user]);

  // AI 플레이어 정리
  useEffect(() => {
    return () => {
      aiPlayerManager.stopAll();
    };
  }, [multiRoomId]);

  return (
    <AppContainer>
      {/* 멀티플레이 게임 시작 로딩 오버레이 — waiting_wave 진입 전까지 조작 차단 */}
      {isMultiplayer && multiLoading && (
        <MultiLoadingOverlay>
          <MultiLoadingBox>
            <LoadingSpinner />
            <LoadingTitle>🎮 게임 준비 중...</LoadingTitle>
            <LoadingDesc>모든 플레이어가 로딩될 때까지 기다려주세요</LoadingDesc>
            <LoadingDots>
              <span />
              <span />
              <span />
            </LoadingDots>
          </MultiLoadingBox>
        </MultiLoadingOverlay>
      )}

      <GameLayoutContainer>
        {isWaveActive && <GlobalLanguageSwitcher />}

        <CanvasContainer>
          <GameCanvas />
        </CanvasContainer>

        {/* BattlePhaseUI는 페이즈 전환 로직 담당 */}
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

      {gameOver && !isMultiplayer && (
        <GameOverOverlay>
          <GameOverModal>
            <GameOverTitle>{t('game.gameOver')}</GameOverTitle>
            <p>{t('game.waveReached', { wave: useGameStore.getState().wave })}</p>
            <RestartBtn onClick={handleResetAndLeave}>
              {t('game.restart')}
            </RestartBtn>
          </GameOverModal>
        </GameOverOverlay>
      )}

      {/* 업적 달성 토스트 (alert 대체) */}
      <AchievementToastDisplay />

      {/* 배틀 결과 토스트 */}
      {battleResultToast && isMultiplayer && (
        <BattleResultToast $won={battleResultToast.won}>
          <ToastIcon>{battleResultToast.won ? '🏆' : '💔'}</ToastIcon>
          <ToastBody>
            <ToastTitle>{battleResultToast.won ? '배틀 승리!' : '배틀 패배'}</ToastTitle>
            <ToastDetails>
              {battleResultToast.won ? (
                <ToastLine $positive>+{battleResultToast.goldDelta}G 획득</ToastLine>
              ) : (
                <>
                  <ToastLine $positive={false}>
                    ❤️ {battleResultToast.livesDelta} 라이프
                  </ToastLine>
                  {battleResultToast.goldDelta > 0 && (
                    <ToastLine $positive>+{battleResultToast.goldDelta}G 위로금</ToastLine>
                  )}
                </>
              )}
            </ToastDetails>
          </ToastBody>
        </BattleResultToast>
      )}
    </AppContainer>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

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
    box-shadow: 0 6px 20px rgba(76, 175, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.2);
  }

  ${media.mobile} {
    padding: 5px 10px;
    font-size: 11px;
  }
`;

const GameOverOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

const GameOverModal = styled.div`
  background: linear-gradient(135deg, #1a2332, #0f1419);
  border: 2px solid rgba(255, 100, 100, 0.5);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  color: #e8edf3;
`;

const GameOverTitle = styled.h2`
  font-size: 32px;
  color: #ff6464;
  margin-bottom: 16px;
`;

const RestartBtn = styled.button`
  margin-top: 20px;
  padding: 12px 32px;
  font-size: 16px;
  cursor: pointer;
  border-radius: 12px;
  border: 2px solid rgba(76, 175, 255, 0.5);
  background: rgba(76, 175, 255, 0.2);
  color: #4cafff;
  font-weight: bold;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(76, 175, 255, 0.35);
    transform: translateY(-2px);
  }
`;

// ─── 업적 달성 토스트 (alert 대체) ────────────────────────────────────────────

const AchievementToastDisplay: React.FC = () => {
  const { t } = useTranslation();
  const achievementToast = useGameStore(s => s.achievementToast);
  if (!achievementToast) return null;
  return (
    <AchievementToastOverlay>
      🏆 {t('achievement.unlocked', { name: achievementToast.name })}
    </AchievementToastOverlay>
  );
};

const AchievementToastOverlay = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.95), rgba(184, 134, 11, 0.95));
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  padding: 10px 24px;
  border-radius: 14px;
  border: 2px solid rgba(255, 215, 0, 0.7);
  box-shadow: 0 8px 24px rgba(212, 175, 55, 0.5);
  z-index: 9998;
  pointer-events: none;
  animation: slideUp 0.3s ease-out;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);

  @keyframes slideUp {
    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;

// ─── 멀티플레이 게임 시작 로딩 오버레이 ──────────────────────────────────────

const MultiLoadingOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 99999;
  backdrop-filter: blur(6px);
`;

const MultiLoadingBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border: 2px solid rgba(76, 175, 255, 0.4);
  border-radius: 24px;
  padding: 48px 64px;
  box-shadow: 0 0 40px rgba(76, 175, 255, 0.2);
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const LoadingSpinner = styled.div`
  width: 56px;
  height: 56px;
  border: 4px solid rgba(76, 175, 255, 0.2);
  border-top-color: #4cafff;
  border-radius: 50%;
  animation: ${spin} 0.9s linear infinite;
`;

const LoadingTitle = styled.div`
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 12px rgba(76, 175, 255, 0.6);
`;

const LoadingDesc = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
`;

const dotBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40%           { transform: translateY(-8px); opacity: 1; }
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 4px;

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4cafff;
    animation: ${dotBounce} 1.2s ease-in-out infinite;

    &:nth-child(1) { animation-delay: 0s; }
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
`;

const toastSlide = keyframes`
  0%   { opacity: 0; transform: translateX(60px); }
  15%  { opacity: 1; transform: translateX(0); }
  80%  { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(60px); }
`;
 
const BattleResultToast = styled.div<{ $won: boolean }>`
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 9997;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 16px;
  min-width: 220px;
  background: ${p => p.$won
    ? 'linear-gradient(135deg, rgba(46,204,113,0.95), rgba(39,174,96,0.95))'
    : 'linear-gradient(135deg, rgba(231,76,60,0.95), rgba(192,57,43,0.95))'};
  border: 1px solid ${p => p.$won ? 'rgba(46,204,113,0.5)' : 'rgba(231,76,60,0.5)'};
  box-shadow: 0 8px 32px ${p => p.$won ? 'rgba(46,204,113,0.4)' : 'rgba(231,76,60,0.4)'};
  animation: ${toastSlide} 5s ease forwards;
  pointer-events: none;
`;
 
const ToastIcon = styled.div`font-size: 28px; line-height: 1; flex-shrink: 0;`;
 
const ToastBody = styled.div`display: flex; flex-direction: column; gap: 3px;`;
 
const ToastTitle = styled.div`
  font-size: 15px; font-weight: 800; color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.3);
`;
 
const ToastDetails = styled.div`display: flex; flex-direction: column; gap: 2px;`;
 
const ToastLine = styled.div<{ $positive: boolean }>`
  font-size: 13px; font-weight: 600;
  color: ${p => p.$positive ? '#fff' : 'rgba(255,255,255,0.9)'};
`;