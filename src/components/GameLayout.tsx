// src/components/GameLayout.tsx
// ──────────────────────────────────────────────────────────────────
// V9 — 3-Pane DS-Style Redesign
//
// [V9-1] 3열 레이아웃: 좌측(시너지+HUD) | 중앙(맵) | 우측(상점+버튼)
// [V9-2] SynergyTracker와 Shop을 embedded 모드로 패널에 내장
// [V9-3] HUD 정보(골드·목숨·웨이브·포켓몬수)를 좌측 패널에 표시
// [V9-4] 액션 버튼 2×2 DS 스타일 + ☰ 햄버거 / ⚙️ 설정 분리
// [V9-5] 모바일·태블릿 세로화면: 회전 안내 오버레이
// [V9-6] V6 멀티플레이어 로직 전체 보존
// [V9-7] 멀티 페이즈 정보를 좌측 HUD 영역에 표시
// ──────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes, css } from "styled-components";
import { useTranslation } from "../i18n";
import { GameCanvas } from "./Game/GameCanvas";
import { PokemonPicker } from "./UI/PokemonPicker";
import { PokemonManager } from "./UI/PokemonManager";
import { Shop } from "./UI/Shop";
import { SynergyTracker } from "./UI/SynergyTracker";
import { SynergyDetails } from "./UI/SynergyDetails";

import { AchievementsPanel } from "./Modals/Achievements";
import { HallOfFame } from "./Modals/HallOfFame";
import { Rankings } from "./Modals/Rankings";
import { Settings } from "./Modals/Settings";
import { useGameStore } from "../store/gameStore";
import { WaveSystem } from "../game/WaveSystem";
import { multiplayerService } from "../services/MultiplayerService";
import { MultiplayerView } from "./Multiplayer/MultiplayerView";
import { MultiplayerGameOverModal } from "./Multiplayer/MultiplayerGameOverModal";
import { BattlePhaseUI } from "./Multiplayer/BattlePhaseUI";
import { SkillPicker } from "./Modals/SkillPicker";
import { WaveEndPicker } from "./Modals/WaveEndPicker";
import { Wave50ClearModal } from "./Modals/Wave50ClearModal";
import { EvolutionConfirmModal } from "./Modals/EvolutionConfirmModal";

import { authService } from "../services/AuthService";
import { PlayerGameState, TowerDetail, GamePhase } from "../types/multiplayer";
import { aiPlayerManager } from "../services/AIPlayer";
import { getCriticalChance, getAOEDamageMultiplier } from "../utils/abilities";

interface GameLayoutProps {
  onLeaveGame: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────

const formatTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const getPhaseText = (
  phase: GamePhase,
  round: number,
  countdown: number | null,
  t: (k: string, o?: any) => string
): string => {
  switch (phase) {
    case "loading":       return t("multiplayer.phase.loading");
    case "shopping":      return t("multiplayer.phase.shopping");
    case "waiting_wave":
      return round === 0
        ? t("multiplayer.phase.waitingWaveStart", { countdown: countdown ?? 0 })
        : t("multiplayer.phase.waitingWaveNext",  { countdown: countdown ?? 0 });
    case "wave":          return t("multiplayer.phase.wave",          { round });
    case "waiting_battle":return t("multiplayer.phase.waitingBattle", { countdown: countdown ?? 0 });
    case "battle":        return t("multiplayer.phase.battle");
    default:              return "";
  }
};

const phaseEmoji = (phase: GamePhase) => {
  switch (phase) {
    case "shopping":       return "🛒";
    case "wave":           return "🌊";
    case "battle":         return "⚔️";
    case "waiting_wave":
    case "waiting_battle": return "⏳";
    default:               return "🔄";
  }
};

// ── Component ─────────────────────────────────────────────────────

export const GameLayout: React.FC<GameLayoutProps> = ({ onLeaveGame }) => {
  const { t } = useTranslation();

  // ── UI state ─────────────────────────────────────────────────
  const [showPicker,        setShowPicker]        = useState(false);
  const [showPokemonManager,setShowPokemonManager] = useState(false);
  const [showAchievements,  setShowAchievements]  = useState(false);
  const [showHallOfFame,    setShowHallOfFame]    = useState(false);
  const [showRankings,      setShowRankings]      = useState(false);
  const [showMultiView,     setShowMultiView]     = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showSettings,      setShowSettings]      = useState(false);
  const [showHamMenu,       setShowHamMenu]       = useState(false);
  const [finalPlayers,      setFinalPlayers]      = useState<PlayerGameState[]>([]);

  // ── Multiplayer ───────────────────────────────────────────────
  const multiRoomId   = multiplayerService.getCurrentRoomId();
  const isMultiplayer = !!multiRoomId;
  const user          = authService.getCurrentUser();

  const [multiPhase,    setMultiPhase]    = useState<GamePhase>("waiting_wave");
  const [multiRound,    setMultiRound]    = useState(0);
  const [multiCountdown,setMultiCountdown] = useState<number | null>(null);
  const [phaseEndTime,  setPhaseEndTime]  = useState<number | null>(null);
  const [multiLoading,  setMultiLoading]  = useState(isMultiplayer);

  const [battleResultToast, setBattleResultToast] = useState<{
    won: boolean; goldDelta: number; livesDelta: number; round: number;
  } | null>(null);

  // ── Game store ────────────────────────────────────────────────
  const {
    money, lives, wave, isWaveActive, towers, gameSpeed,
    timeOfDay, gameTime, skillChoiceQueue, waveEndItemPick, wave50Clear, gameOver,
    nextWave, spendMoney,
  } = useGameStore(s => ({
    money:          s.money,
    lives:          s.lives,
    wave:           s.wave,
    isWaveActive:   s.isWaveActive,
    towers:         s.towers,
    gameSpeed:      s.gameSpeed,
    timeOfDay:      s.timeOfDay,
    gameTime:       s.gameTime,
    skillChoiceQueue: s.skillChoiceQueue,
    waveEndItemPick:  s.waveEndItemPick,
    wave50Clear:      s.wave50Clear,
    gameOver:         s.gameOver,
    nextWave:         s.nextWave,
    spendMoney:       s.spendMoney,
  }));
  const setSpeed = useGameStore(s => s.setGameSpeed);

  // ── Pulse cues ────────────────────────────────────────────────
  const pulseWave   = !isWaveActive && wave >= 0 && !gameOver;
  const pulsePokemon = towers.length === 0 && !isWaveActive;

  // ── Refs ──────────────────────────────────────────────────────
  const lastAppliedRoundRef    = useRef<number>(-1);
  const lastAppliedByeRoundRef = useRef<number>(-1);
  const loadingReportedRef     = useRef(false);
  const syncReadyRef           = useRef(false);
  const initializedRef         = useRef(false);
  const defeatedRef            = useRef(false);
  let lastPhase: GamePhase | null = null;

  // ── Tower detail builder (Firebase sync) ─────────────────────
  const buildTowerDetails = (tds: any[]): TowerDetail[] =>
    (tds ?? []).map((td: any) => ({
      pokemonId:     td.pokemonId,
      name:          td.displayName || td.name,
      level:         td.level,
      sprite:        td.sprite,
      position:      td.position,
      currentHp:     td.currentHp,
      maxHp:         td.maxHp,
      isFainted:     !!td.isFainted,
      attack:        td.attack,
      defense:       td.defense,
      specialAttack: td.specialAttack,
      specialDefense:td.specialDefense,
      speed:         td.speed ?? 50,
      types:         td.types ?? ["normal"],
      equippedMoves: (td.equippedMoves ?? []).map((m: any) => ({
        ...m, currentCooldown: m.currentCooldown ?? 0,
      })),
      critChance:    td.critChance ?? 0,
      aoeBonus:      td.aoeBonus  ?? 0,
      lifesteal:     0,
    }));

  // ─────────────────────────────────────────────────────────────
  // Effects (all original V6/V8 logic preserved)
  // ─────────────────────────────────────────────────────────────

  // Loading report
  useEffect(() => {
    if (!isMultiplayer || !multiRoomId || !user || loadingReportedRef.current) return;
    const unsub = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, state => {
      if (!state || loadingReportedRef.current) return;
      loadingReportedRef.current = true;
      if (state.currentPhase !== "loading") { setMultiLoading(false); unsub(); return; }
      multiplayerService.markPlayerLoaded(multiRoomId, user.uid)
        .then(ok => { if (ok) unsub(); else loadingReportedRef.current = false; })
        .catch(() => { loadingReportedRef.current = false; });
    });
    return unsub;
  }, [isMultiplayer, multiRoomId, user]);

  // Phase + countdown subscription (covers loading → playing transitions)
  useEffect(() => {
    if (!multiRoomId) return;
    const unsub = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, state => {
      if (!state) return;
      const currentPhase  = state.currentPhase  as GamePhase;
      const currentRound  = state.currentRound  as number;

      setMultiPhase(currentPhase);
      setMultiRound(currentRound);
      setPhaseEndTime(state.phaseEndTime ?? null);
      if (currentPhase !== "loading") setMultiLoading(false);

      // AI 호스트 판정 후 AI 시작
      if (currentPhase === "wave" && lastPhase !== "wave") {
        const room = (state as any).room;
        const currentUser = authService.getCurrentUser();
        const aiHostPlayer = state.players?.[0];
        const iAmAIHost = currentUser && aiHostPlayer?.userId === currentUser.uid;
        if (room && iAmAIHost) {
          for (const p of room.players) {
            if (p.isAI && p.aiDifficulty) {
              aiPlayerManager.startAI(room.id, p.userId, p.aiDifficulty, room.mapId);
            }
          }
        }
        if (defeatedRef.current) { lastPhase = currentPhase; return; }
        useGameStore.setState({ waveEndItemPick: null });
        const gs = useGameStore.getState();
        if (!gs.isWaveActive) {
          useGameStore.setState({ wave: currentRound, isWaveActive: true, isPaused: false });
          WaveSystem.getInstance().startWave(currentRound);
        }
      }

      // Rejoin during wave
      if (currentPhase === "wave" && lastPhase === null && currentRound > 0) {
        if (!defeatedRef.current) {
          const gs = useGameStore.getState();
          if (!gs.isWaveActive) {
            useGameStore.setState({ wave: currentRound, isWaveActive: true, isPaused: false });
            WaveSystem.getInstance().startWave(currentRound);
          }
        }
      }

      // Clear item pick UI on battle phase
      if (currentPhase === "battle" && lastPhase !== "battle") {
        useGameStore.setState({ waveEndItemPick: null });
      }

      // Bye bonus [V6-FIX-GL-5] — byeBonuses 타입 없음, skipPlayerId 방식 사용
      if (
        (currentPhase === "battle" || currentPhase === "waiting_battle") &&
        state.roundMatchups?.skipPlayerId === user?.uid &&
        lastAppliedByeRoundRef.current < currentRound
      ) {
        lastAppliedByeRoundRef.current = currentRound;
        if (lastPhase !== null) {
          useGameStore.getState().addMoney(50);
          setBattleResultToast({ won: true, goldDelta: 50, livesDelta: 0, round: currentRound });
          setTimeout(() => setBattleResultToast(null), 4000);
        }
      }

      // Game over: collect final players
      if ((state as any).status === "finished" && state.players) {
        setFinalPlayers(state.players as PlayerGameState[]);
        setShowGameOverModal(true);
      }

      lastPhase = currentPhase;
    });
    return unsub;
  }, [multiRoomId]);

  // Countdown timer
  useEffect(() => {
    if (!phaseEndTime) { setMultiCountdown(null); return; }
    const tick = () =>
      setMultiCountdown(Math.max(0, Math.round((phaseEndTime - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [phaseEndTime]);

  // Multiplayer init + state restore [V6-FIX-GL-1~4]
  useEffect(() => {
    if (isMultiplayer && !initializedRef.current) {
      initializedRef.current = true;
      (async () => {
        if (!multiRoomId || !user) {
          useGameStore.setState({ lives: 50, money: 500, gameSpeed: 3 });
          syncReadyRef.current = true;
          return;
        }
        try {
          const restored = await multiplayerService.getPlayerStateForRejoin(multiRoomId, user.uid);
          if (restored && restored.wave > 0) {
            useGameStore.setState({ lives: restored.lives, money: restored.money, wave: restored.wave });
            lastAppliedRoundRef.current    = restored.wave;
            lastAppliedByeRoundRef.current = restored.wave;
            if (restored.towerDetails?.length) {
              const restoredTowers = buildTowerDetails(restored.towerDetails).map((td: any) => ({
                id: `tower_${Math.random().toString(36).slice(2)}`,
                pokemonId: td.pokemonId, displayName: td.name, name: td.name,
                level: td.level, sprite: td.sprite, position: td.position,
                currentHp: td.currentHp, maxHp: td.maxHp, isFainted: td.isFainted,
                attack: td.attack, defense: td.defense,
                specialAttack: td.specialAttack, specialDefense: td.specialDefense,
                speed: td.speed ?? 50, types: td.types ?? ["normal"],
                range: 3, equippedMoves: td.equippedMoves ?? [],
                rejectedMoves: [], sellValue: td.level * 20, kills: 0, damageDealt: 0,
                ability: "", lifesteal: 0, aoeBonus: 0,
                statusEffect: undefined, gender: "unknown", targetEnemyId: null,
              } as any));
              useGameStore.setState({ towers: restoredTowers });
              const details = buildTowerDetails(restored.towerDetails);
              await multiplayerService.flushTowerUpdate(multiRoomId, user.uid, details);
            }
            if (!restored.isAlive) defeatedRef.current = true;
          } else {
            useGameStore.setState({ lives: 50, money: 500, gameSpeed: 3 });
          }
        } catch {
          useGameStore.setState({ lives: 50, money: 500, gameSpeed: 3 });
        }
        syncReadyRef.current = true;
      })();
    } else if (!isMultiplayer) {
      useGameStore.setState({ gameSpeed: 3 });
      syncReadyRef.current = true;
    }
  }, [isMultiplayer]);

  // Firebase isAlive sync [V8-FIX-1-3]
  useEffect(() => {
    if (!multiRoomId || !user) return;
    const unsub = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, state => {
      if (!state || defeatedRef.current) return;
      const me = state.players?.find((p: any) => p.uid === user.uid);
      if (me && me.isAlive === false) {
        defeatedRef.current = true;
        useGameStore.setState({ lives: 0 });
      }
    });
    return unsub;
  }, [multiRoomId, user]);

  // Battle rewards [V6-FIX-GL-3]
  useEffect(() => {
    if (!multiRoomId || !user) return;
    const unsub = multiplayerService.onGameStateUpdateWithPhase(multiRoomId, state => {
      if (!state) return;
      const myResult = (state.battleResults ?? []).find((r: any) =>
        r.roundNumber === state.currentRound &&
        r.roundNumber > lastAppliedRoundRef.current &&
        (r.player1Id === user.uid || r.player2Id === user.uid)
      );
      if (!myResult) return;
      lastAppliedRoundRef.current = myResult.roundNumber;
      const myReward = user.uid === myResult.player1Id ? myResult.rewardP1 : myResult.rewardP2;
      if (!myReward) return;
      const { addMoney, addLives } = useGameStore.getState();
      if (myReward.gold  !== 0) addMoney(myReward.gold);
      if (myReward.lives !== 0) addLives(myReward.lives);
      setBattleResultToast({
        won: user.uid === myResult.winnerId,
        goldDelta:  myReward.gold,
        livesDelta: myReward.lives,
        round: myResult.roundNumber,
      });
      setTimeout(() => setBattleResultToast(null), 5000);
    });
    return unsub;
  }, [multiRoomId, user]);

  // Tower detail → Firebase sync
  useEffect(() => {
    if (!isMultiplayer || !multiRoomId || !user) return;
    const unsub = useGameStore.subscribe(state => {
      if (!syncReadyRef.current) return;
      const details: TowerDetail[] = state.towers.map(t => ({
        pokemonId:     t.pokemonId,
        name:          t.displayName || (t as any).name,
        level:         t.level,
        sprite:        t.sprite,
        position:      t.position,
        currentHp:     t.currentHp,
        maxHp:         t.maxHp,
        isFainted:     !!t.isFainted,
        attack:        t.attack,
        defense:       t.defense,
        specialAttack: t.specialAttack,
        specialDefense:t.specialDefense,
        speed:         t.speed,
        types:         t.types,
        equippedMoves: t.equippedMoves,
        critChance:    getCriticalChance(t.ability),
        aoeBonus:      (getAOEDamageMultiplier(t.ability) - 1) * 0.5,
        lifesteal:     0,
      }));
      multiplayerService.updatePlayerTowerDetails(multiRoomId, user.uid, details).catch(() => {});
    });
    return unsub;
  }, [isMultiplayer, multiRoomId, user]);

  useEffect(() => { return () => { aiPlayerManager.stopAll(); }; }, [multiRoomId]);

  // ── Handlers ──────────────────────────────────────────────────

  const handleStartWave = () => {
    if (isWaveActive) return;
    nextWave();
    WaveSystem.getInstance().startWave(useGameStore.getState().wave);
  };

  const handleOpenPicker = () => {
    if (!spendMoney(20)) { alert(t("gameLayout.notEnoughMoneyPicker")); return; }
    setShowPicker(true);
  };

  const handleResetAndLeave = () => {
    if (multiRoomId) multiplayerService.leaveRoom(multiRoomId).catch(() => {});
    onLeaveGame();
  };

  const handleSpeedToggle = () =>
    setSpeed(gameSpeed === 1 ? 3 : gameSpeed === 3 ? 5 : 1);

  // ── Render ────────────────────────────────────────────────────

  return (
    <AppContainer>

      {/* Portrait guard – mobile/tablet 세로 화면 */}
      <PortraitGuard>
        <RotateEmoji>📱</RotateEmoji>
        <RotateMsg>화면을 가로로 돌려주세요</RotateMsg>
      </PortraitGuard>

      {/* Multiplayer loading overlay */}
      {isMultiplayer && multiLoading && (
        <MultiLoadingOverlay>
          <MultiLoadingBox>
            <Spinner />
            <LoadTitle>{t("gameLayout.loadingTitle")}</LoadTitle>
            <LoadDesc>{t("gameLayout.loadingDesc1")}<br />{t("gameLayout.loadingDesc2")}</LoadDesc>
            <LoadDots><span /><span /><span /></LoadDots>
          </MultiLoadingBox>
        </MultiLoadingOverlay>
      )}

      {/* ─── 3-column layout ─────────────────────────────────── */}
      <TriPane>

        {/* ▌LEFT: 시너지 + HUD */}
        <LeftPanel>
          <PanelHdr>💎 {t("synergy.title")}</PanelHdr>
          <SynergyArea>
            <SynergyTracker embedded />
          </SynergyArea>
          <HudSep />
          <HudArea>
            <HudGrid>
              <HudTile>
                <HudLbl>GOLD</HudLbl>
                <HudVal $c="gold">{money}G</HudVal>
              </HudTile>
              <HudTile>
                <HudLbl>LIVES</HudLbl>
                <HudVal $c="red">{lives}</HudVal>
              </HudTile>
              <HudTile>
                <HudLbl>WAVE</HudLbl>
                <HudVal $c="blue">{wave}<Sub>/50</Sub></HudVal>
              </HudTile>
              <HudTile>
                <HudLbl>포켓몬</HudLbl>
                <HudVal $c="white">{towers.length}<Sub>/6</Sub></HudVal>
              </HudTile>
            </HudGrid>

            {isMultiplayer ? (
              <PhaseChip $phase={multiPhase}>
                {phaseEmoji(multiPhase)}{" "}
                {getPhaseText(multiPhase, multiRound, multiCountdown, t)}
              </PhaseChip>
            ) : (
              <TimeChip>⏰ {formatTime(gameTime)} {timeOfDay === "day" ? "☀️" : "🌙"}</TimeChip>
            )}
          </HudArea>
        </LeftPanel>

        {/* ▌CENTER: 맵 */}
        <CenterPanel>
          <GameCanvas />
          {multiRoomId && <BattlePhaseUI roomId={multiRoomId} />}
        </CenterPanel>

        {/* ▌RIGHT: 상점 + 액션 버튼 */}
        <RightPanel>

          {/* 상점 영역 */}
          <ShopWrapper>
            <ShopHdr>
              <ShopHdrTitle>🏪 {t("shop.title")}</ShopHdrTitle>
              <GoldBadge>💰 {money}G</GoldBadge>
            </ShopHdr>
            <Shop embedded />
          </ShopWrapper>

          {/* 액션 버튼 영역 */}
          <ActionArea>
            <ActionSep>— Action —</ActionSep>
            <BtnGrid>

              {/* 웨이브 시작 / 멀티 페이즈 */}
              {!isMultiplayer ? (
                <DsBtn $v="wave" $pulse={pulseWave}
                  onClick={handleStartWave} disabled={isWaveActive}>
                  <Ico>🎯</Ico>
                  <Lbl>{isWaveActive ? "진행 중" : t("hud.startWave")}</Lbl>
                </DsBtn>
              ) : (
                <DsBtn $v="wave" disabled>
                  <Ico>{phaseEmoji(multiPhase)}</Ico>
                  <Lbl>R{multiRound}</Lbl>
                </DsBtn>
              )}

              {/* 포켓몬 구입 */}
              <DsBtn $v="shop" $pulse={pulsePokemon} onClick={handleOpenPicker}>
                <Ico>🏪</Ico>
                <Lbl>{t("hud.addPokemon")}</Lbl>
              </DsBtn>

              {/* 포켓몬 관리 */}
              <DsBtn $v="manage" onClick={() => setShowPokemonManager(true)}>
                <Ico>🎒</Ico>
                <Lbl>{t("hud.managePokemon")} ({towers.length}/6)</Lbl>
              </DsBtn>

              {/* 배속 / 상대방 보기 */}
              {!isMultiplayer ? (
                <DsBtn $v="speed" onClick={handleSpeedToggle}>
                  <Ico>⚡</Ico>
                  <Lbl>{gameSpeed}×</Lbl>
                </DsBtn>
              ) : multiRoomId ? (
                <DsBtn $v="rival" onClick={() => setShowMultiView(true)}>
                  <Ico>👁</Ico>
                  <Lbl>{t("hud.rival")}</Lbl>
                </DsBtn>
              ) : null}

            </BtnGrid>

            {/* 유틸 버튼 행 */}
            <UtilRow>
              <HamBtn onClick={() => setShowHamMenu(v => !v)}>
                ☰ 메뉴
              </HamBtn>
              <CfgBtn onClick={() => setShowSettings(true)}>
                ⚙️ 설정
              </CfgBtn>
            </UtilRow>
          </ActionArea>
        </RightPanel>
      </TriPane>

      {/* ─── Hamburger menu ─────────────────────────────────── */}
      {showHamMenu && (
        <>
          <HamBackdrop onClick={() => setShowHamMenu(false)} />
          <HamPanel>
            <HamClose onClick={() => setShowHamMenu(false)}>✕</HamClose>
            <HamItem onClick={() => { setShowAchievements(true);  setShowHamMenu(false); }}>
              🏆 {t("gameLayout.navAchievements")}
            </HamItem>
            <HamItem onClick={() => { setShowHallOfFame(true);    setShowHamMenu(false); }}>
              🏛️ {t("gameLayout.navHallOfFame")}
            </HamItem>
            <HamItem onClick={() => { setShowRankings(true);      setShowHamMenu(false); }}>
              📊 {t("gameLayout.navRankings")}
            </HamItem>
            {isMultiplayer && (
              <HamItem onClick={() => { setShowMultiView(true);   setShowHamMenu(false); }}>
                👥 멀티뷰
              </HamItem>
            )}
            <HamDivider />
            <HamItem $danger onClick={() => { setShowHamMenu(false); handleResetAndLeave(); }}>
              🚪 {t("gameLayout.navMainMenu")}
            </HamItem>
          </HamPanel>
        </>
      )}

      {/* ─── Modals ─────────────────────────────────────────── */}
      {showPicker        && <PokemonPicker   onClose={() => setShowPicker(false)} />}
      {showPokemonManager&& <PokemonManager  onClose={() => setShowPokemonManager(false)} />}
      {showSettings      && <Settings        onClose={() => setShowSettings(false)} />}
      {showAchievements  && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
      {showHallOfFame    && <HallOfFame      onClose={() => setShowHallOfFame(false)} />}
      {showRankings      && <Rankings        onClose={() => setShowRankings(false)} />}
      {showMultiView && multiRoomId && (
        <MultiplayerView roomId={multiRoomId} onClose={() => setShowMultiView(false)} />
      )}
      {showGameOverModal && multiRoomId && user && (
        <MultiplayerGameOverModal
          players={finalPlayers}
          myUserId={user.uid}
          onClose={() => {
            setShowGameOverModal(false);
            multiplayerService.finalizeGame(multiRoomId).catch(() => {});
            handleResetAndLeave();
          }}
        />
      )}

      {/* ─── Floating overlays ──────────────────────────────── */}
      <SynergyDetails />
      {skillChoiceQueue && skillChoiceQueue.length > 0 && <SkillPicker />}
      <EvolutionConfirmModal />
      {waveEndItemPick && <WaveEndPicker />}
      {wave50Clear && (
        <Wave50ClearModal
          onContinue={() => useGameStore.setState({ wave50Clear: false, isPaused: false })}
          onRestart={handleResetAndLeave}
        />
      )}

      {gameOver && !isMultiplayer && (
        <GameOverOverlay>
          <GameOverModal>
            <GameOverTitle>{t("gameLayout.gameOverTitle")}</GameOverTitle>
            <p>{t("gameLayout.waveReached", { wave: useGameStore.getState().wave })}</p>
            <RestartBtn onClick={handleResetAndLeave}>{t("gameLayout.restartBtn")}</RestartBtn>
          </GameOverModal>
        </GameOverOverlay>
      )}

      {battleResultToast && isMultiplayer && (
        <ResultToast $won={battleResultToast.won}>
          <ToastIco>{battleResultToast.won ? "🏆" : "💔"}</ToastIco>
          <ToastBody>
            <ToastTitle>
              {battleResultToast.won ? t("gameLayout.toastWin") : t("gameLayout.toastLose")}
            </ToastTitle>
            <ToastDetails>
              {battleResultToast.goldDelta !== 0 && (
                <ToastLine $pos={battleResultToast.goldDelta > 0}>
                  💰 {battleResultToast.goldDelta > 0 ? "+" : ""}{battleResultToast.goldDelta}G
                </ToastLine>
              )}
              {battleResultToast.livesDelta !== 0 && (
                <ToastLine $pos={battleResultToast.livesDelta > 0}>
                  ❤️ {battleResultToast.livesDelta > 0 ? "+" : ""}{battleResultToast.livesDelta}
                </ToastLine>
              )}
            </ToastDetails>
          </ToastBody>
        </ResultToast>
      )}
    </AppContainer>
  );
};

// ─────────────────────────────────────────────────────────────────
// Styled Components
// ─────────────────────────────────────────────────────────────────

// ── 반응형 헬퍼 (가로화면 고정 게임 전용) ─────────────────────────
// L1024: 태블릿 가로 (iPad 등, ≤1024px landscape)
// L768 : 폰 가로 (≤768px landscape)
const L1024 = `@media (max-width: 1024px) and (orientation: landscape)`;
const L768  = `@media (max-width: 768px)  and (orientation: landscape)`;

// ── Root ──────────────────────────────────────────────────────────

const AppContainer = styled.div`
  width: 100vw;
  height: 100vh;
  background: radial-gradient(ellipse at top, #1a2332 0%, #0f1419 50%, #000 100%);
  color: #e8edf3;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
`;

// Portrait orientation guard (모바일/태블릿 세로 전용)
const PortraitGuard = styled.div`
  display: none;
  @media (max-width: 1024px) and (orientation: portrait) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    position: fixed;
    inset: 0;
    background: #0f1419;
    z-index: 99999;
  }
`;
const RotateEmoji = styled.div`font-size: 52px;`;
const RotateMsg   = styled.p`
  font-size: 18px; color: #60b0ff; font-weight: 500; text-align: center;
  padding: 0 32px;
`;

// ── 3-column grid ─────────────────────────────────────────────────

const TriPane = styled.div`
  display: grid;
  /* 데스크탑: 210px 패널 */
  grid-template-columns: 210px 1fr 210px;
  overflow: hidden;
  border-top: 2px solid rgba(80, 140, 220, 0.25);
  border-bottom: 2px solid rgba(80, 140, 220, 0.25);

  /* 태블릿 가로 (iPad 등, ≤1024px) */
  ${L1024} { grid-template-columns: 172px 1fr 172px; }
  /* 폰 가로 (≤768px) */
  ${L768}  { grid-template-columns: 128px 1fr 128px; }

  /* 세로 화면: PortraitGuard가 덮으므로 숨김 */
  @media (max-width: 1024px) and (orientation: portrait) { display: none; }
`;

// ── Left Panel ────────────────────────────────────────────────────

const LeftPanel = styled.div`
  background: #111827;
  border-right: 2px solid rgba(80, 140, 220, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const PanelHdr = styled.div`
  background: linear-gradient(180deg, #1e3050 0%, #162540 100%);
  border-bottom: 1px solid rgba(80, 140, 220, 0.28);
  padding: 7px 12px;
  font-size: 12px; font-weight: 600; color: #60b0ff;
  text-transform: uppercase; letter-spacing: 0.5px;
  flex-shrink: 0;
  ${L1024} { padding: 6px 9px; font-size: 10px; }
  ${L768}  { padding: 4px 6px; font-size: 8px; letter-spacing: 0.3px; }
`;

const SynergyArea = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const HudSep = styled.div`
  height: 1px;
  background: rgba(80, 140, 220, 0.14);
  flex-shrink: 0;
`;

const HudArea = styled.div`
  flex-shrink: 0;
  background: #0d1520;
  padding: 10px;
  display: flex; flex-direction: column; gap: 6px;
  ${L1024} { padding: 7px 8px; gap: 5px; }
  ${L768}  { padding: 4px 5px; gap: 3px; }
`;

const HudGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 5px;
  ${L1024} { gap: 4px; }
  ${L768}  { gap: 3px; }
`;

const HudTile = styled.div`
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 6px; padding: 4px 7px;
  display: flex; flex-direction: column; gap: 2px;
  ${L1024} { padding: 3px 5px; }
  ${L768}  { padding: 2px 4px; }
`;

const HudLbl = styled.span`
  font-size: 9px; color: #5a7090;
  text-transform: uppercase; letter-spacing: 0.4px;
  ${L1024} { font-size: 8px; }
  ${L768}  { font-size: 6px; letter-spacing: 0.2px; }
`;

const colorMap: Record<string, string> = {
  gold: "#f0c040", red: "#e05050", blue: "#60b0ff", white: "#aabbcc",
};
const HudVal = styled.span<{ $c: string }>`
  font-size: 18px; font-weight: 600; line-height: 1.1;
  color: ${p => colorMap[p.$c] ?? "#aabbcc"};
  ${L1024} { font-size: 15px; }
  ${L768}  { font-size: 12px; }
`;

const Sub = styled.span`
  font-size: 11px; opacity: 0.5;
  ${L1024} { font-size: 9px; }
  ${L768}  { font-size: 8px; }
`;

const TimeChip = styled.div`
  font-size: 11px; color: #60b0ff; font-weight: 500;
  background: rgba(96,176,255,.07); border: 1px solid rgba(96,176,255,.18);
  border-radius: 5px; padding: 4px 8px; text-align: center;
  ${L1024} { font-size: 9px; padding: 3px 6px; }
  ${L768}  { font-size: 8px; padding: 2px 4px; }
`;

const phaseColorMap: Record<string, { text: string; bg: string; border: string }> = {
  shopping:       { text: "#f0c040", bg: "rgba(240,192,64,.10)", border: "rgba(240,192,64,.30)" },
  wave:           { text: "#50d080", bg: "rgba(80,208,128,.10)", border: "rgba(80,208,128,.30)" },
  battle:         { text: "#e05050", bg: "rgba(224,80,80,.10)",  border: "rgba(224,80,80,.30)"  },
  waiting_wave:   { text: "#60b0ff", bg: "rgba(96,176,255,.08)", border: "rgba(96,176,255,.22)" },
  waiting_battle: { text: "#60b0ff", bg: "rgba(96,176,255,.08)", border: "rgba(96,176,255,.22)" },
  loading:        { text: "#60b0ff", bg: "rgba(96,176,255,.08)", border: "rgba(96,176,255,.22)" },
};

const PhaseChip = styled.div<{ $phase: GamePhase }>`
  font-size: 11px; font-weight: 500;
  border-radius: 5px; padding: 4px 8px; text-align: center;
  color:      ${p => phaseColorMap[p.$phase]?.text   ?? "#60b0ff"};
  background: ${p => phaseColorMap[p.$phase]?.bg     ?? "rgba(96,176,255,.08)"};
  border: 1px solid ${p => phaseColorMap[p.$phase]?.border ?? "rgba(96,176,255,.22)"};
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  ${L1024} { font-size: 9px; padding: 3px 6px; }
  ${L768}  { font-size: 8px; padding: 2px 4px; }
`;

// ── Center Panel ──────────────────────────────────────────────────

const CenterPanel = styled.div`
  /* 맵 타일 15×10 → 3:2 비율 고정 */
  aspect-ratio: 15 / 10;
  overflow: hidden;
  position: relative;
  background: #080e14;
`;

// ── Right Panel ───────────────────────────────────────────────────

const RightPanel = styled.div`
  background: #111827;
  border-left: 2px solid rgba(80, 140, 220, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ShopWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-bottom: 2px solid rgba(80, 140, 220, 0.28);
`;

const ShopHdr = styled.div`
  background: linear-gradient(180deg, #1e3050 0%, #162540 100%);
  border-bottom: 1px solid rgba(80, 140, 220, 0.28);
  padding: 7px 10px;
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
  ${L1024} { padding: 5px 8px; }
  ${L768}  { padding: 4px 6px; }
`;

const ShopHdrTitle = styled.span`
  font-size: 12px; font-weight: 600; color: #60b0ff;
  text-transform: uppercase; letter-spacing: 0.4px;
  ${L1024} { font-size: 10px; }
  ${L768}  { font-size: 8px; }
`;

const GoldBadge = styled.span`
  font-size: 13px; font-weight: 600; color: #f0c040;
  ${L1024} { font-size: 11px; }
  ${L768}  { font-size: 9px; }
`;

const ActionArea = styled.div`
  flex-shrink: 0;
  background: #0d1422;
  padding: 8px;
  display: flex; flex-direction: column; gap: 5px;
  ${L1024} { padding: 6px; gap: 4px; }
  ${L768}  { padding: 4px 5px; gap: 3px; }
`;

const ActionSep = styled.div`
  font-size: 9px; color: #5a7090;
  text-transform: uppercase; letter-spacing: 0.7px; text-align: center;
  border-top: 1px solid rgba(80, 140, 220, 0.14);
  padding-top: 6px;
  ${L1024} { font-size: 8px; padding-top: 5px; }
  ${L768}  { font-size: 7px; padding-top: 3px; }
`;

// ── DS-style buttons ──────────────────────────────────────────────

const pulseGreen = keyframes`
  0%   { box-shadow: 0 0 0 0   rgba(80, 208, 128, 0.80); }
  70%  { box-shadow: 0 0 0 8px rgba(80, 208, 128, 0);    }
  100% { box-shadow: 0 0 0 0   rgba(80, 208, 128, 0);    }
`;
const pulseOrange = keyframes`
  0%   { box-shadow: 0 0 0 0   rgba(240, 168, 64, 0.80); }
  70%  { box-shadow: 0 0 0 8px rgba(240, 168, 64, 0);    }
  100% { box-shadow: 0 0 0 0   rgba(240, 168, 64, 0);    }
`;

const btnVariants = {
  wave:   css`background: linear-gradient(180deg,#1f6640,#174f30);
              color:#5ee894;
              border:1.5px solid #2d8a56;
              text-shadow:0 0 8px rgba(80,230,140,0.5);
              &:disabled{opacity:.38;}`,
  shop:   css`background: linear-gradient(180deg,#4e2c0a,#3a2006);
              color:#f5b540;
              border:1.5px solid #7a4e18;
              text-shadow:0 0 8px rgba(245,165,40,0.5);`,
  manage: css`background: linear-gradient(180deg,#143660,#0e2840);
              color:#72c0ff;
              border:1.5px solid #2458a0;
              text-shadow:0 0 8px rgba(100,180,255,0.5);`,
  speed:  css`background: linear-gradient(180deg,#321858,#28103c);
              color:#d090ff;
              border:1.5px solid #5c2898;
              text-shadow:0 0 8px rgba(200,100,255,0.5);`,
  rival:  css`background: linear-gradient(180deg,#143050,#0e2040);
              color:#90d8ff;
              border:1.5px solid #1e4868;`,
};

const BtnGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 5px; padding-bottom: 6px;
  ${L1024} { gap: 4px; padding-bottom: 5px; }
  ${L768}  { gap: 3px; padding-bottom: 4px; }
`;

const DsBtn = styled.button<{ $v: keyof typeof btnVariants; $pulse?: boolean }>`
  padding: 0 4px; border-radius: 8px; cursor: pointer;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 2px; height: 52px;
  position: relative; overflow: hidden;
  touch-action: manipulation; width: 100%;
  outline: none; appearance: none; -webkit-appearance: none;

  &::before {
    content: ""; position: absolute;
    top: 0; left: 0; right: 0; height: 38%;
    background: rgba(255,255,255,.09);
    border-radius: 7px 7px 0 0; pointer-events: none;
  }

  box-shadow: 0 5px 0 rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.12);
  ${p => btnVariants[p.$v]}
  ${p => p.$pulse && p.$v === "wave" && css`animation: ${pulseGreen}  1.5s ease infinite;`}
  ${p => p.$pulse && p.$v === "shop" && css`animation: ${pulseOrange} 1.5s ease infinite;`}

  @media (hover: hover) {
    &:not(:disabled):hover {
      filter: brightness(1.2); transform: translateY(-1px);
      box-shadow: 0 6px 0 rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.14);
    }
  }
  &:not(:disabled):active {
    transform: translateY(4px);
    box-shadow: 0 1px 0 rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08);
    filter: brightness(0.88);
  }
  &:focus, &:focus-visible { outline: none; }

  ${L1024} { height: 46px; border-radius: 7px; }
  ${L768}  { height: 38px; gap: 1px; border-radius: 6px; }
`;

const Ico = styled.span`
  font-size: 20px; line-height: 1; position: relative; z-index: 1;
  ${L1024} { font-size: 17px; }
  ${L768}  { font-size: 13px; }
`;

const Lbl = styled.span`
  font-size: 9.5px; font-weight: 600; line-height: 1.2;
  position: relative; z-index: 1; text-align: center;
  width: 100%; padding: 0 3px;
  word-break: keep-all; overflow-wrap: break-word;
  ${L1024} { font-size: 8px; }
  ${L768}  { font-size: 7px; padding: 0 2px; }
`;

// ── Util buttons (☰ / ⚙️) ─────────────────────────────────────────

const UtilRow = styled.div`
  display: flex; gap: 5px;
  ${L768} { gap: 3px; }
`;

const utilBase = css`
  flex: 1; height: 32px; border-radius: 7px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  font-size: 12px; font-weight: 500; touch-action: manipulation;
  @media (hover: hover) { &:hover { filter: brightness(1.15); } }
  &:active { transform: scale(0.97); }
  ${L1024} { height: 28px; font-size: 10px; }
  ${L768}  { height: 24px; font-size: 9px; }
`;

const HamBtn = styled.button`
  ${utilBase}
  background: #1e2232; color: #9ab0cc;
  border: 1.5px solid #303650;
  box-shadow: 0 3px 0 rgba(0,0,0,.5);
  outline: none; appearance: none; -webkit-appearance: none;
  &:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,.4); }
  &:focus, &:focus-visible { outline: none; }
`;
const CfgBtn = styled.button`
  ${utilBase}
  background: #0e2240; color: #60b0ff;
  border: 1.5px solid #1e3860;
  box-shadow: 0 3px 0 rgba(0,0,0,.5);
  outline: none; appearance: none; -webkit-appearance: none;
  &:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,.4); }
  &:focus, &:focus-visible { outline: none; }
`;

// ── Hamburger menu panel ──────────────────────────────────────────

const HamBackdrop = styled.div`
  position: fixed; inset: 0; z-index: 4000;
`;

const HamPanel = styled.div`
  position: fixed;
  bottom: 72px; right: 14px;
  z-index: 4001;
  background: linear-gradient(145deg, #1a1f2e, #0f1419);
  border: 2px solid rgba(80, 140, 220, 0.32);
  border-radius: 12px;
  padding: 8px;
  min-width: 164px;
  display: flex; flex-direction: column; gap: 2px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  ${L1024} { right: 10px; bottom: 60px; min-width: 148px; }
  ${L768}  { right: 8px;  bottom: 52px; min-width: 130px; padding: 6px; }
`;

const HamClose = styled.button`
  align-self: flex-end;
  background: none; border: none;
  color: #5a7090; font-size: 14px; cursor: pointer; padding: 0 4px; margin-bottom: 4px;
  @media (hover: hover) { &:hover { color: #aabbcc; } }
`;

const HamItem = styled.button<{ $danger?: boolean }>`
  background: none; border: none; border-radius: 7px;
  padding: 8px 12px; font-size: 12px;
  color: ${p => p.$danger ? "#e05050" : "#aabbd0"};
  cursor: pointer; text-align: left;
  display: flex; align-items: center; gap: 8px;
  touch-action: manipulation;
  @media (hover: hover) {
    &:hover {
      background: ${p => p.$danger ? "rgba(224,80,80,.1)" : "rgba(96,176,255,.08)"};
      color: ${p => p.$danger ? "#ff7070" : "#d8e8f8"};
    }
  }
  ${L1024} { font-size: 11px; padding: 7px 10px; }
  ${L768}  { font-size: 10px; padding: 6px 8px; gap: 6px; }
`;

const HamDivider = styled.div`
  height: 1px; background: rgba(255,255,255,.06); margin: 2px 0;
`;

// ── Game over ─────────────────────────────────────────────────────

const GameOverOverlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(0,0,0,.85);
  display: flex; justify-content: center; align-items: center;
  z-index: 9999;
`;
const GameOverModal = styled.div`
  background: linear-gradient(135deg, #1a2332, #0f1419);
  border: 2px solid rgba(255,100,100,.5);
  border-radius: 20px; padding: 40px;
  text-align: center; color: #e8edf3; max-width: 90vw;
  ${L1024} { padding: 28px; border-radius: 16px; }
  ${L768}  { padding: 20px; border-radius: 12px; }
`;
const GameOverTitle = styled.h2`
  font-size: 32px; color: #ff6464; margin-bottom: 16px;
  ${L1024} { font-size: 24px; }
  ${L768}  { font-size: 20px; }
`;
const RestartBtn = styled.button`
  margin-top: 20px; padding: 12px 32px; font-size: 16px; cursor: pointer;
  border-radius: 12px; border: 2px solid rgba(76,175,255,.5);
  background: rgba(76,175,255,.2); color: #4cafff; font-weight: bold;
  transition: background .2s;
  @media (hover: hover) { &:hover { background: rgba(76,175,255,.35); } }
`;

// ── Multiplayer loading ───────────────────────────────────────────

const MultiLoadingOverlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(0,0,0,.92);
  display: flex; justify-content: center; align-items: center;
  z-index: 99999; backdrop-filter: blur(6px);
`;
const MultiLoadingBox = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border: 2px solid rgba(76,175,255,.4);
  border-radius: 24px; padding: 48px 64px;
  box-shadow: 0 0 40px rgba(76,175,255,.2);
  ${L1024} { padding: 32px 40px; border-radius: 18px; gap: 12px; }
  ${L768}  { padding: 24px 28px; border-radius: 14px; gap: 10px; }
`;
const spin = keyframes`from{transform:rotate(0deg);}to{transform:rotate(360deg);}`;
const Spinner = styled.div`
  width:56px;height:56px;
  border:4px solid rgba(76,175,255,.2);border-top-color:#4cafff;
  border-radius:50%;animation:${spin} .9s linear infinite;
  ${L1024} { width: 44px; height: 44px; }
  ${L768}  { width: 36px; height: 36px; border-width: 3px; }
`;
const LoadTitle = styled.div`
  font-size:22px;font-weight:bold;color:#fff;
  ${L1024} { font-size: 18px; }
  ${L768}  { font-size: 15px; }
`;
const LoadDesc  = styled.div`
  font-size:14px;color:rgba(255,255,255,.6);text-align:center;
  ${L1024} { font-size: 12px; }
  ${L768}  { font-size: 10px; }
`;
const dot = keyframes`
  0%,80%,100%{transform:translateY(0);opacity:.4;}
  40%{transform:translateY(-8px);opacity:1;}
`;
const LoadDots = styled.div`
  display:flex;gap:8px;margin-top:4px;
  span{width:8px;height:8px;border-radius:50%;background:#4cafff;
    animation:${dot} 1.2s ease-in-out infinite;
    &:nth-child(1){animation-delay:0s;}
    &:nth-child(2){animation-delay:.2s;}
    &:nth-child(3){animation-delay:.4s;}}
`;

// ── Battle result toast ───────────────────────────────────────────

const slide = keyframes`
  0%  {opacity:0;transform:translateX(60px);}
  15% {opacity:1;transform:translateX(0);}
  80% {opacity:1;transform:translateX(0);}
  100%{opacity:0;transform:translateX(60px);}
`;
const ResultToast = styled.div<{ $won: boolean }>`
  position:fixed;top:80px;right:20px;z-index:9997;
  display:flex;align-items:center;gap:12px;
  padding:14px 20px;border-radius:16px;min-width:220px;
  background:${p=>p.$won
    ?"linear-gradient(135deg,rgba(46,204,113,.95),rgba(39,174,96,.95))"
    :"linear-gradient(135deg,rgba(231,76,60,.95),rgba(192,57,43,.95))"};
  border:1px solid ${p=>p.$won?"rgba(46,204,113,.5)":"rgba(231,76,60,.5)"};
  animation:${slide} 5s ease forwards;pointer-events:none;
  ${L1024}{right:12px;min-width:180px;padding:10px 14px;border-radius:12px;}
  ${L768} {right:8px; min-width:140px;padding:8px 10px; border-radius:10px;gap:8px;}
`;
const ToastIco   = styled.div`
  font-size:28px;line-height:1;flex-shrink:0;
  ${L1024}{font-size:22px;}
  ${L768} {font-size:18px;}
`;
const ToastBody  = styled.div`display:flex;flex-direction:column;gap:3px;`;
const ToastTitle = styled.div`
  font-size:15px;font-weight:800;color:#fff;
  ${L1024}{font-size:13px;}
  ${L768} {font-size:11px;}
`;
const ToastDetails=styled.div`display:flex;flex-direction:column;gap:2px;`;
const ToastLine  = styled.div<{$pos:boolean}>`
  font-size:13px;font-weight:600;
  color:${p=>p.$pos?"#fff":"rgba(255,255,255,.9)"};
  ${L1024}{font-size:11px;}
  ${L768} {font-size:10px;}
`;