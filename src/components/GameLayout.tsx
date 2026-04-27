// src/components/GameLayout.tsx
// ──────────────────────────────────────────────────────────────────
// V6 — 로컬 권위 + 서버 트랜잭션 보상
//
// [V6-FIX-GL-1] 로컬 gameStore가 money/lives의 주인. Firebase는 보상 델타만 제공.
// [V6-FIX-GL-2] Firebase → 로컬 덮어쓰기 제거 (탈락 판정만 Firebase 기준).
// [V6-FIX-GL-3] 배틀 보상은 battleResults.rewardP1/P2 델타를 로컬 addMoney/addLives로 적용.
// [V6-FIX-GL-4] 재접속 시 lastAppliedRoundRef를 currentRound로 초기화 (이중 보상 방지).
// [V6-FIX-GL-5] Bye 보너스 로컬 반영 + 토스트.
// [V6-FIX-GL-6] 탈락 판정: 로컬 lives=0 즉시 + Firebase isAlive=false 방어층.
// [V8-FIX-1-3] Firebase isAlive=false 감지 시 로컬 gameOver 동기화.

import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { useTranslation } from "../i18n";
import { GameCanvas } from "./Game/GameCanvas";
import { HUD } from "./UI/HUD";
import { PokemonPicker } from "./UI/PokemonPicker";
import { PokemonManager } from "./UI/PokemonManager";
import { Shop } from "./UI/Shop";

import { AchievementsPanel } from "./Modals/Achievements";
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

import { authService } from '../services/AuthService';
import { PlayerGameState, TowerDetail } from '../types/multiplayer';
import { aiPlayerManager } from '../services/AIPlayer';
import { media } from '../utils/responsive.utils';
import { getCriticalChance, getAOEDamageMultiplier } from '../utils/abilities';

interface GameLayoutProps {
  onLeaveGame: () => void;
}

export const GameLayout: React.FC<GameLayoutProps> = ({ onLeaveGame }) => {
  const { t } = useTranslation();
  const [showPicker, setShowPicker] = useState(false);
  const [showPokemonManager, setShowPokemonManager] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showRankings, setShowRankings] = useState(false);
  const [showMultiView, setShowMultiView] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [finalPlayers, setFinalPlayers] = useState<PlayerGameState[]>([]);

  const multiRoomId = multiplayerService.getCurrentRoomId();
  const isMultiplayer = !!multiRoomId;
  const user = authService.getCurrentUser();
  const lastAppliedRoundRef = useRef<number>(-1);
  const lastAppliedByeRoundRef = useRef<number>(-1);
  const [battleResultToast, setBattleResultToast] = useState<{
    won: boolean; goldDelta: number; livesDelta: number; round: number;
  } | null>(null);

  const [multiLoading, setMultiLoading] = useState(isMultiplayer);

  // ─── 로딩 완료 리포트 ──────────────────────────────────
  const loadingReportedRef = useRef(false);
  useEffect(() => {
    if (!isMultiplayer || !multiRoomId || !user || loadingReportedRef.current) return;
    const unsubscribe = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, (state) => {
      if (state && !loadingReportedRef.current) {
        loadingReportedRef.current = true;

        if (state.currentPhase !== 'loading') {
          console.log('[GameLayout] Rejoined after loading phase');
          setMultiLoading(false);
          unsubscribe();
          return;
        }

        multiplayerService.markPlayerLoaded(multiRoomId, user.uid)
          .then((success) => {
            if (success) {
              console.log('[GameLayout] Loading reported successfully');
              unsubscribe();
            } else {
              loadingReportedRef.current = false;
            }
          })
          .catch(err => {
            console.error('[GameLayout] Failed to report loading:', err);
            loadingReportedRef.current = false;
          });
      }
    });
    return unsubscribe;
  }, [isMultiplayer, multiRoomId, user]);

  // ─── 멀티플레이어 초기화 + 재접속 상태 복원 ─────────────────
  const syncReadyRef = useRef(false);
  const initializedRef = useRef(false);
  const defeatedRef = useRef(false);

  useEffect(() => {
    if (isMultiplayer && !initializedRef.current) {
      initializedRef.current = true;

      const restoreState = async () => {
        if (!multiRoomId || !user) {
          useGameStore.setState({ lives: 50, money: 500, gameSpeed: 3 });
          syncReadyRef.current = true;
          return;
        }

        try {
          const restored = await multiplayerService.getPlayerStateForRejoin(multiRoomId, user.uid);

          if (restored && restored.wave > 0) {
            console.log('[GameLayout] Restoring state from Firebase:', {
              lives: restored.lives, money: restored.money, wave: restored.wave,
              towers: restored.towerDetails.length, isAlive: restored.isAlive,
            });

            useGameStore.setState({
              lives: restored.lives,
              money: restored.money,
              wave: restored.wave,
              gameSpeed: 3,
              isWaveActive: false,
              isPaused: false,
            });

            // [V5-FIX-GL-4] 재접속 시 이미 처리된 라운드 보상은 다시 적용하지 않음
            lastAppliedRoundRef.current = restored.currentRound;
            lastAppliedByeRoundRef.current = restored.currentRound;

            // 타워 복원
            if (restored.towerDetails.length > 0) {
              const restoredTowers = restored.towerDetails.map((td, idx) => ({
                id: `restored-${idx}-${Date.now()}`,
                pokemonId: td.pokemonId,
                displayName: td.name,
                name: td.name,
                level: td.level,
                experience: 0,
                sprite: td.sprite,
                position: td.position,
                currentHp: td.currentHp,
                maxHp: td.maxHp,
                isFainted: td.isFainted,
                attack: td.attack ?? td.level * 10,
                baseAttack: td.attack ?? td.level * 10,
                defense: td.defense ?? td.level * 5,
                specialAttack: td.specialAttack ?? td.level * 8,
                specialDefense: td.specialDefense ?? td.level * 5,
                speed: td.speed ?? 50,
                types: td.types ?? ['normal'],
                range: 3,
                equippedMoves: (td.equippedMoves ?? []).map((m: any) => ({
                  ...m,
                  currentCooldown: m.currentCooldown ?? 0,
                })),
                rejectedMoves: [],
                sellValue: td.level * 20,
                kills: 0,
                damageDealt: 0,
                ability: '',
                lifesteal: td.lifesteal ?? 0,
                aoeBonus: td.aoeBonus ?? 0,
                statusEffect: undefined,
                gender: 'unknown',
                targetEnemyId: null,
              } as any));

              useGameStore.setState({ towers: restoredTowers });
              console.log(`[GameLayout] Restored ${restoredTowers.length} towers from Firebase`);

              // 복원된 타워를 즉시 Firebase에 재업로드
              const restoredDetails = buildTowerDetails(restored.towerDetails);
              await multiplayerService.flushTowerUpdate(multiRoomId, user.uid, restoredDetails);
              console.log(`[GameLayout] Re-uploaded ${restoredDetails.length} towers after rejoin`);
            }

            if (!restored.isAlive) {
              defeatedRef.current = true;
            }
          } else {
            // 신규 게임
            useGameStore.setState({ lives: 50, money: 500, gameSpeed: 3 });
          }
        } catch (err) {
          console.error('[GameLayout] State restoration failed, using defaults:', err);
          useGameStore.setState({ lives: 50, money: 500, gameSpeed: 3 });
        }

        syncReadyRef.current = true;
      };

      restoreState();
    } else if (!isMultiplayer) {
      // 싱글플레이 첫 진입 시 항상 3배속으로 시작
      useGameStore.setState({ gameSpeed: 3 });
      syncReadyRef.current = true;
    }
  }, [isMultiplayer]);

  const {
    nextWave, isWaveActive, gameOver, skillChoiceQueue, waveEndItemPick,
    spendMoney, wave50Clear, towers,
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
    if (!spendMoney(20)) { alert(t('gameLayout.notEnoughMoneyPicker')); return; }
    setShowPicker(true);
  };
  const handleStartWave = () => {
    if (isWaveActive) return;
    nextWave();
    const currentWave = useGameStore.getState().wave;
    WaveSystem.getInstance().startWave(currentWave);
  };
  const handleResetAndLeave = () => { onLeaveGame(); };

  // ─── [V6-FIX-GL-1] 로컬 → Firebase 상태 동기화 (money, lives, wave, towers) ──
  //   로컬 gameStore가 money/lives의 "주인".
  //   포켓몬 구매/판매/아이템 사용 등은 로컬에서 즉시 반영되고 Firebase로 푸시됨.
  //   배틀 보상/Bye 보너스만 Firebase → 로컬 방향 (아래 별도 useEffect).
  useEffect(() => {
    if (!multiRoomId || !user) return;
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      if (!syncReadyRef.current) return;
      if (defeatedRef.current) return;
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
        isAlive: state.lives > 0,
      });
    });
    return unsubscribe;
  }, [multiRoomId, user]);

  // [V6-FIX-GL-2] Firebase → 로컬 덮어쓰기 제거
  //   이전 버전에서 Firebase 구독이 로컬 money를 덮어써서 구매 직후 500원으로 돌아오는 버그 발생.
  //   현재는 로컬이 주인이므로 Firebase → 로컬 덮어쓰기는 하지 않음.
  //   탈락 판정만 Firebase 기준으로 유지.
  useEffect(() => {
    if (!multiRoomId || !user) return;
    const unsubscribe = multiplayerService.onGameStateUpdate(multiRoomId, (players) => {
      const me = players.find(p => p.userId === user.uid);
      if (!me) return;
      // [V8-FIX-1-3] Firebase isAlive=false 감지 시 로컬 gameOver 상태 동기화
      //   defeatedRef만 업데이트하면 UI에 탈락 화면이 표시되지 않아
      //   gameStore.gameOver를 true로 설정해 게임오버 UI 표시
      if (!me.isAlive && !defeatedRef.current) {
        defeatedRef.current = true;
        console.log('[GameLayout] Player defeated (from Firebase isAlive=false)');
        // [V8-FIX-1-3] 로컬 gameStore를 통해 스토어에 탈락 화면 표시
        useGameStore.setState({ gameOver: true });
      }
    });
    return unsubscribe;
  }, [multiRoomId, user]);

  // 타워 동기화
  useEffect(() => {
    if (!multiRoomId || !user || !syncReadyRef.current) return;
    if (towers.length === 0) return;
    const towerDetails = buildTowerDetails(towers);
    multiplayerService.updatePlayerTowerDetails(multiRoomId, user.uid, towerDetails);
  }, [multiRoomId, user, towers]);

  // ─── 탈락 처리 (싱글플레이 로컬 lives 기반 + 멀티 isAlive 기반) ──
  useEffect(() => {
    if (!multiRoomId || !user) return;
    const unsubscribe = useGameStore.subscribe((state) => {
      // [V5-FIX-GL-6] 싱글플레이용 체크는 유지하되, 멀티에서는 Firebase가 권위
      // 로컬 lives가 먼저 0에 도달한 경우만 명시적으로 playerDefeated 호출
      if (state.lives <= 0 && !defeatedRef.current) {
        defeatedRef.current = true;
        console.log('[GameLayout] Player defeated (from local lives=0)');
        multiplayerService.playerDefeated(multiRoomId, user.uid);
      }
    });
    return unsubscribe;
  }, [multiRoomId, user]);

  // ─── 웨이브 완료 감지 → markWaveCompleted ──
  useEffect(() => {
    if (!multiRoomId || !user) return;
    const wasWaveActiveRef = { current: false };
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      if (defeatedRef.current) return;
      if (prevState.isWaveActive && !state.isWaveActive && wasWaveActiveRef.current) {
        console.log('[GameLayout] Wave completed, flushing tower data');
        const currentTowers = useGameStore.getState().towers;
        const towerDetails = buildTowerDetails(currentTowers);
        multiplayerService.flushTowerUpdate(multiRoomId, user.uid, towerDetails)
          .then(() => multiplayerService.markWaveCompleted(multiRoomId, user.uid))
          .catch(err => {
            console.error('[GameLayout] flushTowerUpdate failed:', err);
            multiplayerService.markWaveCompleted(multiRoomId, user.uid);
          });
      }
      wasWaveActiveRef.current = state.isWaveActive;
    });
    return unsubscribe;
  }, [multiRoomId, user]);

  // ─── 페이즈 'wave' → 로컬 웨이브 시작 ──
  useEffect(() => {
    if (!multiRoomId) return;
    let lastPhase: string | null = null;
    let aiStarted = false;
    const unsubscribe = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, (state) => {
      if (!state) return;
      const currentPhase = state.currentPhase;
      const currentRound = state.currentRound;

      if (currentPhase !== 'loading') setMultiLoading(false);

      if (lastPhase === null && !aiStarted) {
        aiStarted = true;
        const startAIs = async () => {
          const room = await multiplayerService.getRoom(multiRoomId);
          const currentUser = authService.getCurrentUser();
          // [V5] 호스트 여부는 userId 사전순으로 결정론적 판정 (호스트 장애 대응)
          const aliveHumans = state.players
            .filter(p => p.isAlive && !p.userId.startsWith('ai_'))
            .sort((a, b) => a.userId.localeCompare(b.userId));
          const aiHostPlayer = aliveHumans[0] ?? state.players[0];
          const iAmAIHost = currentUser && aiHostPlayer?.userId === currentUser.uid;
          if (room && iAmAIHost) {
            for (const player of room.players) {
              if (player.isAI && player.aiDifficulty) {
                aiPlayerManager.startAI(room.id, player.userId, player.aiDifficulty, room.mapId);
              }
            }
          }
        };
        startAIs().catch(console.error);
      }

      if (currentPhase === 'wave' && lastPhase !== 'wave') {
        console.log('[GameLayout] Phase changed to wave:', currentRound);
        if (defeatedRef.current) { lastPhase = currentPhase; return; }
        // [NEW-4 FIX] 새 웨이브 시작 시 미선택 아이템 보상 UI 강제 클리어
        // 기존: waveEndItemPick이 남아있으면 웨이브 진행 중에 아이템 선택 UI가 겹쳐 표시됨
        useGameStore.setState({ waveEndItemPick: null });
        const gs = useGameStore.getState();
        if (!gs.isWaveActive) {
          useGameStore.setState({ wave: currentRound, isWaveActive: true, isPaused: false });
          WaveSystem.getInstance().startWave(currentRound);
        }
      }

      if (currentPhase === 'wave' && lastPhase === null && currentRound > 0) {
        if (!defeatedRef.current) {
          const gs = useGameStore.getState();
          if (!gs.isWaveActive) {
            console.log('[GameLayout] Rejoined during wave phase:', currentRound);
            useGameStore.setState({ wave: currentRound, isWaveActive: true, isPaused: false });
            WaveSystem.getInstance().startWave(currentRound);
          }
        }
      }

      // [NEW-4 FIX] battle 페이즈 진입 시 미선택 아이템 보상 UI 강제 클리어
      // WaveEndPicker(z:1001)가 BattlePhaseUI(z:1000) 위에 남아 배틀 화면을 덮는 것을 방지
      if (currentPhase === 'battle' && lastPhase !== 'battle') {
        useGameStore.setState({ waveEndItemPick: null });
      }

      // [V6-FIX-GL-4] Bye 보너스 로컬 적용 — 서버는 더 이상 money를 변경하지 않으므로
      //   클라이언트가 직접 50G를 로컬에 추가함. lastAppliedByeRoundRef로 중복 방지.
      //   재접속 시에는 lastAppliedByeRoundRef = currentRound 로 초기화되어 있어 중복 없음.
      if (
        (currentPhase === 'battle' || currentPhase === 'waiting_battle') &&
        state.roundMatchups?.skipPlayerId === user?.uid &&
        lastAppliedByeRoundRef.current < currentRound
      ) {
        lastAppliedByeRoundRef.current = currentRound;
        if (lastPhase !== null) {
          // 신규 Bye 라운드 — 보상 적용
          const { addMoney } = useGameStore.getState();
          addMoney(50);
          console.log('[GameLayout] Bye Bonus +50G applied, round:', currentRound);
          setBattleResultToast({
            won: true, goldDelta: 50, livesDelta: 0, round: currentRound,
          });
          setTimeout(() => setBattleResultToast(null), 4000);
        } else {
          // 재접속 직후 — 이미 보상 반영된 상태
          console.log('[GameLayout] Rejoined with bye round, skipping (already applied):', currentRound);
        }
      }

      lastPhase = currentPhase;
    });
    return unsubscribe;
  }, [multiRoomId, user]);

  // ─── 게임 종료 감지 ──
  useEffect(() => {
    if (!multiRoomId) return;
    const unsubscribe = multiplayerService.onGameStateUpdate(multiRoomId, (players) => {
      const alivePlayers = players.filter(p => p.isAlive);
      if (alivePlayers.length <= 1 && players.length > 1) {
        setFinalPlayers(players);
        setShowGameOverModal(true);
        import('../services/AIPlayer').then(({ aiPlayerManager }) => aiPlayerManager.stopAll());
      }
    });
    return unsubscribe;
  }, [multiRoomId]);

  // ─── [V6-FIX-GL-3] 배틀 결과 → 로컬에 보상 적용 + 토스트 ──
  //   서버 트랜잭션은 rewardP1/rewardP2 필드만 기록함 (money/lives 는 미변경).
  //   클라이언트가 자기 matchId 결과를 보고 로컬에 한 번만 적용 (lastAppliedRoundRef로 중복 방지).
  useEffect(() => {
    if (!multiRoomId || !user) return;
    const unsubscribe = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, (state) => {
      if (!state) return;
      const myResult = (state.battleResults || []).find(r =>
        r.roundNumber === state.currentRound
        && r.roundNumber > lastAppliedRoundRef.current
        && (r.player1Id === user.uid || r.player2Id === user.uid)
      );
      if (!myResult) return;
      lastAppliedRoundRef.current = myResult.roundNumber;
      const myReward = user.uid === myResult.player1Id ? myResult.rewardP1 : myResult.rewardP2;
      if (!myReward) return;
      // 로컬에 보상 적용 (Firebase로는 로컬 → Firebase 구독이 자동 푸시)
      const { addMoney, addLives } = useGameStore.getState();
      if (myReward.gold !== 0) addMoney(myReward.gold);
      if (myReward.lives !== 0) addLives(myReward.lives);
      setBattleResultToast({
        won: user.uid === myResult.winnerId,
        goldDelta: myReward.gold,
        livesDelta: myReward.lives,
        round: myResult.roundNumber,
      });
      setTimeout(() => setBattleResultToast(null), 5000);
    });
    return unsubscribe;
  }, [multiRoomId, user]);

  useEffect(() => {
    return () => { aiPlayerManager.stopAll(); };
  }, [multiRoomId]);

  return (
    <AppContainer>
      {isMultiplayer && multiLoading && (
        <MultiLoadingOverlay>
          <MultiLoadingBox>
            <LoadingSpinner />
            <LoadingTitle>{t('gameLayout.loadingTitle')}</LoadingTitle>
            <LoadingDesc>
              {t('gameLayout.loadingDesc1')}<br/>
              {t('gameLayout.loadingDesc2')}
            </LoadingDesc>
            <LoadingDots><span /><span /><span /></LoadingDots>
          </MultiLoadingBox>
        </MultiLoadingOverlay>
      )}

      <GameLayoutContainer>
        <CanvasContainer><GameCanvas /></CanvasContainer>
        {multiRoomId && <BattlePhaseUI roomId={multiRoomId} />}
        <BottomPanel>
          <HUD
            onStartWave={handleStartWave}
            onAddPokemon={handleOpenPicker}
            onManagePokemon={() => setShowPokemonManager(true)}
            onShowRival={multiRoomId ? () => setShowMultiView(true) : undefined}
          />
          <ExtraButtons>
            <BottomBtn onClick={() => setShowAchievements(true)}>{t('gameLayout.navAchievements')}</BottomBtn>
            <BottomBtn onClick={() => setShowHallOfFame(true)}>{t('gameLayout.navHallOfFame')}</BottomBtn>
            <BottomBtn onClick={() => setShowRankings(true)}>{t('gameLayout.navRankings')}</BottomBtn>
            <BottomBtn onClick={handleResetAndLeave}>{t('gameLayout.navMainMenu')}</BottomBtn>
          </ExtraButtons>
        </BottomPanel>
        <Shop />
      </GameLayoutContainer>

      {showPicker && <PokemonPicker onClose={() => setShowPicker(false)} />}
      {showPokemonManager && <PokemonManager onClose={() => setShowPokemonManager(false)} />}
      {showAchievements && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
      {showHallOfFame && <HallOfFame onClose={() => setShowHallOfFame(false)} />}
      {showRankings && <Rankings onClose={() => setShowRankings(false)} />}
      {showMultiView && multiRoomId && <MultiplayerView roomId={multiRoomId} onClose={() => setShowMultiView(false)} />}
      {showGameOverModal && multiRoomId && user && (
        <MultiplayerGameOverModal
          players={finalPlayers}
          myUserId={user.uid}
          onClose={() => {
            setShowGameOverModal(false);
            // [NEW-1 FIX] finalizeGame 호출 — 레이팅 업데이트 + 방 finished 마킹
            // 기존: finalizeGame이 주석에만 언급되고 실제로는 절대 호출되지 않아 레이팅이 갱신되지 않음
            if (multiRoomId) {
              multiplayerService.finalizeGame(multiRoomId).catch(err =>
                console.warn('[GameLayout] finalizeGame failed:', err)
              );
            }
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
          onContinue={() => { useGameStore.setState({ wave50Clear: false, isPaused: false }); }}
          onRestart={handleResetAndLeave}
        />
      )}

      {gameOver && !isMultiplayer && (
        <GameOverOverlay>
          <GameOverModal>
            <GameOverTitle>{t('gameLayout.gameOverTitle')}</GameOverTitle>
            <p>{t('gameLayout.waveReached', { wave: useGameStore.getState().wave })}</p>
            <RestartBtn onClick={handleResetAndLeave}>{t('gameLayout.restartBtn')}</RestartBtn>
          </GameOverModal>
        </GameOverOverlay>
      )}



      {battleResultToast && isMultiplayer && (
        <BattleResultToast $won={battleResultToast.won}>
          <ToastIcon>{battleResultToast.won ? '🏆' : '💔'}</ToastIcon>
          <ToastBody>
            <ToastTitle>{battleResultToast.won ? t('gameLayout.toastWin') : t('gameLayout.toastLose')}</ToastTitle>
            <ToastDetails>
              {battleResultToast.won ? (
                <ToastLine $positive>{t('gameLayout.toastGoldEarned', { gold: battleResultToast.goldDelta })}</ToastLine>
              ) : (
                <>
                  <ToastLine $positive={false}>{t('gameLayout.toastLivesLost', { lives: battleResultToast.livesDelta })}</ToastLine>
                  {battleResultToast.goldDelta > 0 && (
                    <ToastLine $positive>{t('gameLayout.toastConsolation', { gold: battleResultToast.goldDelta })}</ToastLine>
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

// ─── Helpers ──────────────────────────────────────────────────
const buildTowerDetails = (towers: any[]): TowerDetail[] => {
  const scrub = (obj: any): any => JSON.parse(JSON.stringify(obj));
  return towers.map(t => {
    const ability = t.ability;

    // [FIX] ability에서 critChance 파생 (싱글플레이 getCriticalChance와 동일 로직)
    const critChance = getCriticalChance(ability);

    // [FIX] AOE: 장착 기술 중 isAOE가 있을 때만 활성화,
    //       ability AOE 배율을 곱해 splash 비율 결정 (기본 50% × 배율)
    const hasAOEMove = (t.equippedMoves || []).some((m: any) => m.isAOE);
    const aoeMultiplier = getAOEDamageMultiplier(ability); // 1.0 or 1.2
    const aoeBonus = hasAOEMove ? 0.5 * aoeMultiplier : 0;

    // [FIX] lifesteal: 싱글플레이는 move.effect.drainPercent에서 처리하므로
    //       여기서는 0으로 세팅. TFT calcDmg가 선택된 move의 drainPercent를 직접 적용.
    //       (ability의 lifesteal 효과는 싱글에서도 미사용 — 일관성 유지)
    const lifesteal = 0;

    return scrub({
      pokemonId: t.pokemonId, name: t.displayName || t.name, level: t.level, sprite: t.sprite,
      position: t.position, currentHp: t.currentHp, maxHp: t.maxHp,
      isFainted: !!t.isFainted,
      attack: t.attack, defense: t.defense,
      specialAttack: t.specialAttack, specialDefense: t.specialDefense,
      speed: t.speed, types: t.types,
      equippedMoves: t.equippedMoves,
      critChance,
      aoeBonus,
      lifesteal,
    });
  });
};

// ─── Styled Components (원본 유지) ────────────────────────────────
const AppContainer = styled.div`min-height:100vh;height:100vh;background:radial-gradient(ellipse at top,#1a2332 0%,#0f1419 50%,#000000 100%);color:#e8edf3;position:relative;overflow:hidden;display:flex;flex-direction:column;`;
const GameLayoutContainer = styled.div`display:flex;flex-direction:column;height:100vh;width:100vw;`;
const CanvasContainer = styled.div`flex:1;display:flex;justify-content:center;align-items:center;padding:8px 8px 0 8px;overflow:hidden;${media.tablet}{flex:0 0 auto;height:calc((100vw - 16px) * 640 / 960);}${media.mobile}{padding:4px 4px 0 4px;flex:0 0 auto;height:calc((100vw - 8px) * 640 / 960);}`;
const BottomPanel = styled.div`padding:6px;background:linear-gradient(180deg,transparent,rgba(0,0,0,0.5));backdrop-filter:blur(10px);${media.mobile}{padding:3px;}`;
const ExtraButtons = styled.div`display:flex;gap:6px;justify-content:center;flex-wrap:wrap;${media.mobile}{gap:3px;}`;
const BottomBtn = styled.button`padding:6px 16px;font-size:13px;cursor:pointer;border-radius:12px;border:2px solid rgba(76,175,255,0.3);background:linear-gradient(135deg,rgba(76,175,255,0.15),rgba(76,175,255,0.05));color:#4cafff;font-weight:bold;box-shadow:0 4px 15px rgba(76,175,255,0.2),inset 0 1px 0 rgba(255,255,255,0.1);backdrop-filter:blur(5px);text-shadow:0 0 10px rgba(76,175,255,0.5);transition:all 0.3s ease;@media (hover: hover){&:hover{background:linear-gradient(135deg,rgba(76,175,255,0.25),rgba(76,175,255,0.15));transform:translateY(-2px);box-shadow:0 6px 20px rgba(76,175,255,0.3),inset 0 1px 0 rgba(255,255,255,0.2);}}${media.mobile}{padding:4px 8px;font-size:10px;border-radius:8px;border-width:1px;}`;
const GameOverOverlay = styled.div`position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:9999;`;
const GameOverModal = styled.div`background:linear-gradient(135deg,#1a2332,#0f1419);border:2px solid rgba(255,100,100,0.5);border-radius:20px;padding:40px;text-align:center;color:#e8edf3;max-width:90vw;${media.mobile}{padding:24px 16px;border-radius:14px;}`;
const GameOverTitle = styled.h2`font-size:32px;color:#ff6464;margin-bottom:16px;${media.mobile}{font-size:22px;}`;
const RestartBtn = styled.button`margin-top:20px;padding:12px 32px;font-size:16px;cursor:pointer;border-radius:12px;border:2px solid rgba(76,175,255,0.5);background:rgba(76,175,255,0.2);color:#4cafff;font-weight:bold;transition:background 0.2s,border-color 0.2s;@media (hover: hover){&:hover{background:rgba(76,175,255,0.35);transform:translateY(-2px);}}${media.mobile}{padding:10px 24px;font-size:14px;}`;
const MultiLoadingOverlay = styled.div`position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);display:flex;justify-content:center;align-items:center;z-index:99999;backdrop-filter:blur(6px);`;
const MultiLoadingBox = styled.div`display:flex;flex-direction:column;align-items:center;gap:16px;background:linear-gradient(145deg,#1a1a2e,#16213e);border:2px solid rgba(76,175,255,0.4);border-radius:24px;padding:48px 64px;box-shadow:0 0 40px rgba(76,175,255,0.2);`;
const spin = keyframes`from{transform:rotate(0deg);}to{transform:rotate(360deg);}`;
const LoadingSpinner = styled.div`width:56px;height:56px;border:4px solid rgba(76,175,255,0.2);border-top-color:#4cafff;border-radius:50%;animation:${spin} 0.9s linear infinite;`;
const LoadingTitle = styled.div`font-size:22px;font-weight:bold;color:#fff;text-shadow:0 0 12px rgba(76,175,255,0.6);`;
const LoadingDesc = styled.div`font-size:14px;color:rgba(255,255,255,0.6);text-align:center;`;
const dotBounce = keyframes`0%,80%,100%{transform:translateY(0);opacity:0.4;}40%{transform:translateY(-8px);opacity:1;}`;
const LoadingDots = styled.div`display:flex;gap:8px;margin-top:4px;span{width:8px;height:8px;border-radius:50%;background:#4cafff;animation:${dotBounce} 1.2s ease-in-out infinite;&:nth-child(1){animation-delay:0s;}&:nth-child(2){animation-delay:0.2s;}&:nth-child(3){animation-delay:0.4s;}}`;
const toastSlide = keyframes`0%{opacity:0;transform:translateX(60px);}15%{opacity:1;transform:translateX(0);}80%{opacity:1;transform:translateX(0);}100%{opacity:0;transform:translateX(60px);}`;
const BattleResultToast = styled.div<{ $won: boolean }>`position:fixed;top:80px;right:20px;z-index:9997;display:flex;align-items:center;gap:12px;padding:14px 20px;border-radius:16px;min-width:220px;background:${p => p.$won ? 'linear-gradient(135deg,rgba(46,204,113,0.95),rgba(39,174,96,0.95))' : 'linear-gradient(135deg,rgba(231,76,60,0.95),rgba(192,57,43,0.95))'};border:1px solid ${p => p.$won ? 'rgba(46,204,113,0.5)' : 'rgba(231,76,60,0.5)'};box-shadow:0 8px 32px ${p => p.$won ? 'rgba(46,204,113,0.4)' : 'rgba(231,76,60,0.4)'};animation:${toastSlide} 5s ease forwards;pointer-events:none;`;
const ToastIcon = styled.div`font-size:28px;line-height:1;flex-shrink:0;`;
const ToastBody = styled.div`display:flex;flex-direction:column;gap:3px;`;
const ToastTitle = styled.div`font-size:15px;font-weight:800;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.3);`;
const ToastDetails = styled.div`display:flex;flex-direction:column;gap:2px;`;
const ToastLine = styled.div<{ $positive: boolean }>`font-size:13px;font-weight:600;color:${p => p.$positive ? '#fff' : 'rgba(255,255,255,0.9)'};`;