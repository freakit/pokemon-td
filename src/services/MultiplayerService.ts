// src/services/MultiplayerService.ts
// ──────────────────────────────────────────────────────────────────
// [FIX-3] getPlayerStateForRejoin() 메서드 추가
//   - 재접속 시 Firebase에서 해당 플레이어의 lives, money, wave, towerDetails를 읽어옴
//   - GameLayout에서 로컬 Zustand 상태를 복원하는 데 사용

import {
  ref, set, onValue, push, update, remove, get, off,
  runTransaction
} from 'firebase/database';
import { rtdb } from '../config/firebase';
import {
  Room, RoomPlayer, PlayerGameState, AIDifficulty, TowerDetail,
  GamePhase, MultiplayerGameState, RoundMatchup, PvPBattleResult
} from '../types/multiplayer';
import { pvpBattleService } from './PvPBattleService';
import { authService } from './AuthService';
import { databaseService } from './DatabaseService';
import { achievementService } from './AchievementService';

const PHASE_COUNTDOWN_SECONDS = 10;
const FIRST_WAVE_PREP_SECONDS = 60;
const BATTLE_WAVE_INTERVAL = 3;

const ROOM_EXPIRY_TIME = 3 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = 10 * 60 * 1000;

class MultiplayerService {
  private currentRoomId: string | null = null;
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private serverTimeOffset: number = 0;

  constructor() {
    this.startAutoCleanup();
    this.syncServerTime();
  }

  private syncServerTime(): void {
    const offsetRef = ref(rtdb, '.info/serverTimeOffset');
    onValue(offsetRef, (snapshot) => {
      this.serverTimeOffset = snapshot.val() || 0;
    });
  }

  private now(): number {
    return Date.now() + this.serverTimeOffset;
  }

  getServerTimeOffset(): number {
    return this.serverTimeOffset;
  }

  private startAutoCleanup(): void {
    if (this.cleanupIntervalId) clearInterval(this.cleanupIntervalId);
    this.cleanupExpiredRooms();
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredRooms();
    }, CLEANUP_INTERVAL);
  }

  private async cleanupExpiredRooms(): Promise<void> {
    try {
      const roomsRef = ref(rtdb, 'rooms');
      const snapshot = await get(roomsRef);
      if (!snapshot.exists()) return;
      const now = Date.now();
      const roomsToDelete: string[] = [];
      snapshot.forEach((child) => {
        const room = child.val() as Room;
        if (now - room.createdAt > ROOM_EXPIRY_TIME) roomsToDelete.push(room.id);
      });
      for (const roomId of roomsToDelete) await this.deleteRoom(roomId);
    } catch (error) {
      console.error('Failed to cleanup expired rooms:', error);
    }
  }

  private async deleteRoom(roomId: string): Promise<void> {
    try {
      await remove(ref(rtdb, `rooms/${roomId}`));
      await remove(ref(rtdb, `gameStates/${roomId}`));
      await remove(ref(rtdb, `towerDetails/${roomId}`));
      await remove(ref(rtdb, `battleResults/${roomId}`));
      console.log(`Successfully deleted room and related data: ${roomId}`);
    } catch (error) {
      console.error(`Failed to delete room ${roomId}:`, error);
    }
  }

  public stopAutoCleanup(): void {
    if (this.cleanupIntervalId) { clearInterval(this.cleanupIntervalId); this.cleanupIntervalId = null; }
  }

  async createRoom(mapId: string, mapName: string): Promise<string> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const roomsRef = ref(rtdb, 'rooms');
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key!;
    const room: Room = { id: roomId, name: `${user.displayName}의 방`, mapId, mapName, hostId: user.uid, hostName: user.displayName, players: [{ userId: user.uid, userName: user.displayName, isReady: true, isAI: false, rating: user.rating }], maxPlayers: 8, status: 'waiting', createdAt: Date.now() };
    await set(newRoomRef, room);
    this.currentRoomId = roomId;
    localStorage.setItem('currentRoomId', roomId);
    return roomId;
  }

  async joinRoom(roomId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) throw new Error('Room not found');
    const room = snapshot.val() as Room;
    if (Date.now() - room.createdAt > ROOM_EXPIRY_TIME) { await this.deleteRoom(roomId); throw new Error('Room has expired'); }
    const isAlreadyPlayer = room.players.some(p => p.userId === user.uid);
    if (isAlreadyPlayer) { this.currentRoomId = roomId; localStorage.setItem('currentRoomId', roomId); return; }
    if (room.players.length >= room.maxPlayers) throw new Error('Room is full');
    if (room.status !== 'waiting') throw new Error('Game already started');
    const newPlayer: RoomPlayer = { userId: user.uid, userName: user.displayName, isReady: false, isAI: false, rating: user.rating };
    await update(roomRef, { players: [...room.players, newPlayer] });
    this.currentRoomId = roomId;
    localStorage.setItem('currentRoomId', roomId);
  }

  async rejoinRoom(roomId: string): Promise<{ room: Room; canRejoin: boolean }> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) { this.clearCurrentRoom(); return { room: null as any, canRejoin: false }; }
    const room = snapshot.val() as Room;
    if (Date.now() - room.createdAt > ROOM_EXPIRY_TIME) { await this.deleteRoom(roomId); this.clearCurrentRoom(); return { room: null as any, canRejoin: false }; }
    const isPlayerInRoom = room.players.some(p => p.userId === user.uid);
    if (!isPlayerInRoom) { this.clearCurrentRoom(); return { room: null as any, canRejoin: false }; }
    if (room.status === 'playing' || room.status === 'starting') { this.currentRoomId = roomId; return { room, canRejoin: true }; }
    return { room, canRejoin: true };
  }

  async leaveRoom(roomId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return;
    const room = snapshot.val() as Room;
    const updatedPlayers = room.players.filter(p => p.userId !== user.uid);
    if (updatedPlayers.length === 0) { await this.deleteRoom(roomId); } else {
      const newHostId = room.hostId === user.uid ? updatedPlayers[0].userId : room.hostId;
      const newHostName = room.hostId === user.uid ? updatedPlayers[0].userName : room.hostName;
      await update(roomRef, { players: updatedPlayers, hostId: newHostId, hostName: newHostName });
    }
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const gsSnap = await get(gameStateRef);
    if (gsSnap.exists()) {
      const gs = gsSnap.val() as MultiplayerGameState;
      const updatedGsPlayers = gs.players.map((p: PlayerGameState) => p.userId === user.uid ? { ...p, isAlive: false } : p);
      await update(gameStateRef, { players: updatedGsPlayers });
    }
    this.clearCurrentRoom();
  }

  async addAI(roomId: string, difficulty: AIDifficulty): Promise<void> {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return;
    const room = snapshot.val() as Room;
    if (room.players.length >= room.maxPlayers) throw new Error('Room is full');
    const aiId = `ai_${difficulty}_${Date.now()}`;
    const aiPlayer: RoomPlayer = { userId: aiId, userName: `AI (${difficulty})`, isReady: true, isAI: true, aiDifficulty: difficulty, rating: difficulty === 'easy' ? 800 : difficulty === 'normal' ? 1000 : 1200 };
    await update(roomRef, { players: [...room.players, aiPlayer] });
  }

  async toggleReady(roomId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return;
    const room = snapshot.val() as Room;
    const updatedPlayers = room.players.map(p => p.userId === user.uid ? { ...p, isReady: !p.isReady } : p);
    await update(roomRef, { players: updatedPlayers });
  }

  async startGame(roomId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) throw new Error('Room not found');
    const room = snapshot.val() as Room;
    if (room.hostId !== user.uid) throw new Error('Only host can start game');
    if (room.players.length < 2) throw new Error('Need at least 2 players');
    await this.initializePvPGameState(roomId, room.players);
    await update(roomRef, { status: 'starting' });
    setTimeout(async () => { await update(roomRef, { status: 'playing' }); }, 3000);
  }

  private async initializePvPGameState(roomId: string, players: RoomPlayer[]): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const loadingReady: Record<string, boolean> = {};
    for (const p of players) loadingReady[p.userId] = p.isAI;
    const initialState: MultiplayerGameState = {
      roomId, players: players.map(p => ({ userId: p.userId, userName: p.userName, wave: 0, lives: 50, money: 500, towers: 0, isAlive: true, rating: p.rating, waveCompleted: false, battleRecord: { wins: 0, losses: 0 } })),
      startTime: this.now(), rankings: [], currentRound: 0, currentPhase: 'loading', encounterRecord: {}, battleResults: [], phaseEndTime: null, loadingReady,
    };
    await set(gameStateRef, initialState);
  }

  async markPlayerLoaded(roomId: string, userId: string): Promise<boolean> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    let updated = false;
    await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;
      const loadingReady = { ...(gameState as any).loadingReady || {} };
      if (loadingReady[userId]) { updated = true; return gameState; }
      loadingReady[userId] = true;
      updated = true;
      const allLoaded = gameState.players.every((p: PlayerGameState) => loadingReady[p.userId] === true);
      if (allLoaded) return { ...gameState, loadingReady, currentPhase: 'waiting_wave', phaseEndTime: this.now() + FIRST_WAVE_PREP_SECONDS * 1000 };
      return { ...gameState, loadingReady };
    });
    return updated;
  }

  async setGamePhase(roomId: string, phase: GamePhase): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const needsCountdown = phase === 'waiting_wave' || phase === 'waiting_battle';
    await update(gameStateRef, { currentPhase: phase, phaseEndTime: needsCountdown ? this.now() + PHASE_COUNTDOWN_SECONDS * 1000 : null });
  }

  // [FIX-11] 호스트 의존도 제거: 페이즈 전환을 runTransaction으로 원자화
  // 모든 클라이언트가 동시에 호출해도 딱 한 번만 실행되도록 보장
  async startSynchronizedWave(roomId: string): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;
      // 이미 wave 페이즈로 전환됐으면 무시 (다른 클라이언트가 먼저 실행)
      if (gameState.currentPhase === 'wave') return gameState;
      // waiting_wave 상태일 때만 전환
      if (gameState.currentPhase !== 'waiting_wave') return gameState;
      const newRound = gameState.currentRound + 1;
      const updatedPlayers = gameState.players.map((p: PlayerGameState) => ({
        ...p,
        wave: p.isAlive ? newRound : p.wave,
        waveCompleted: false,
      }));
      return { ...gameState, currentRound: newRound, currentPhase: 'wave', players: updatedPlayers, phaseEndTime: null };
    });
  }

  async markWaveCompleted(roomId: string, userId: string): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    let shouldTransition = false;
    let transitionPhase: GamePhase = 'waiting_wave';
    let currentRound = 0;

    await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;
      if (gameState.currentPhase !== 'wave') return gameState;
      const updatedPlayers = gameState.players.map((p: PlayerGameState) => p.userId === userId ? { ...p, waveCompleted: true } : p);
      const alivePlayers = updatedPlayers.filter((p: PlayerGameState) => p.isAlive);
      const allCompleted = alivePlayers.length > 0 && alivePlayers.every((p: PlayerGameState) => p.waveCompleted);
      currentRound = gameState.currentRound;
      if (allCompleted) {
        shouldTransition = true;
        if (gameState.currentRound > 0 && gameState.currentRound % BATTLE_WAVE_INTERVAL === 0) transitionPhase = 'waiting_battle';
        else transitionPhase = 'waiting_wave';
        return { ...gameState, players: updatedPlayers, currentPhase: transitionPhase, phaseEndTime: this.now() + PHASE_COUNTDOWN_SECONDS * 1000 };
      }
      return { ...gameState, players: updatedPlayers };
    });

    if (shouldTransition) console.log(`[MultiplayerService] All players completed wave ${currentRound}, transitioning to ${transitionPhase}`);
  }

  async updatePlayerState(roomId: string, userId: string, state: Partial<PlayerGameState>): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;
      const updatedPlayers = (gameState.players || []).map((p: PlayerGameState) => p.userId === userId ? { ...p, ...state, lastUpdate: this.now() } : p);
      return { ...gameState, players: updatedPlayers };
    });
  }

  private lastTowerUpdate: Map<string, number> = new Map();
  private towerUpdateThrottle = 1000;
  private towerUpdateTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async updatePlayerTowerDetails(roomId: string, userId: string, towerDetails: TowerDetail[]): Promise<void> {
    const now = Date.now();
    const lastUpdate = this.lastTowerUpdate.get(userId) || 0;
    if (this.towerUpdateTimeouts.has(userId)) { clearTimeout(this.towerUpdateTimeouts.get(userId)!); this.towerUpdateTimeouts.delete(userId); }
    const doUpdate = async () => {
      const towerDetailsRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
      await update(towerDetailsRef, { towers: towerDetails, updatedAt: this.now() });
      this.lastTowerUpdate.set(userId, Date.now());
    };
    if (now - lastUpdate >= this.towerUpdateThrottle) { await doUpdate(); } else {
      const timeout = setTimeout(async () => { await doUpdate(); this.towerUpdateTimeouts.delete(userId); }, this.towerUpdateThrottle - (now - lastUpdate));
      this.towerUpdateTimeouts.set(userId, timeout);
    }
  }

  async submitTFTPlacements(roomId: string, userId: string, placements: { id: string, x: number, y: number }[]): Promise<void> {
    const tftPlacementsRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
    await update(tftPlacementsRef, { tftPlacements: placements });
  }

  onAllTFTPlacementsUpdate(roomId: string, callback: (placements: Map<string, { id: string, x: number, y: number }[]>) => void): () => void {
    const tftPlacementsRef = ref(rtdb, `towerDetails/${roomId}`);
    const listener = onValue(tftPlacementsRef, (snapshot) => {
      const combined = new Map<string, { id: string, x: number, y: number }[]>();
      if (!snapshot.exists()) { callback(combined); return; }
      const data = snapshot.val();
      Object.keys(data).forEach((userId) => {
        if (data[userId] && data[userId].tftPlacements) combined.set(userId, data[userId].tftPlacements);
        else combined.set(userId, []);
      });
      callback(combined);
    });
    return () => off(tftPlacementsRef, 'value', listener);
  }

  async playerDefeated(roomId: string, userId: string): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    let placementRank = 0;
    await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;
      const target = gameState.players.find((p: PlayerGameState) => p.userId === userId);
      if (!target || !target.isAlive) return;
      const aliveCount = gameState.players.filter((p: PlayerGameState) => p.isAlive).length;
      placementRank = aliveCount;
      const rankings = [...(gameState.rankings || []), userId];
      const updatedPlayers = gameState.players.map((p: PlayerGameState) => p.userId === userId ? { ...p, isAlive: false, placement: placementRank } : p);
      return { ...gameState, players: updatedPlayers, rankings };
    });
    console.log(`[MultiplayerService] Player ${userId} defeated at rank ${placementRank}`);
  }

  async startBattlePhase(roomId: string): Promise<RoundMatchup | null> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    let resultMatchup: RoundMatchup | null = null;

    await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;
      // 이미 battle 페이즈로 전환됐으면 무시 (다른 클라이언트가 먼저 실행)
      if (gameState.currentPhase === 'battle') return gameState;
      // waiting_battle 상태일 때만 전환
      if (gameState.currentPhase !== 'waiting_battle') return gameState;

      const alivePlayers = gameState.players.filter((p: PlayerGameState) => p.isAlive);
      if (alivePlayers.length <= 1) return gameState;

      const lastSkipPlayerId = gameState.roundMatchups?.skipPlayerId ?? null;
      const matchups = pvpBattleService.generateMatchups(alivePlayers, gameState.encounterRecord || {}, gameState.currentRound, lastSkipPlayerId);
      resultMatchup = matchups;

      let updatedPlayers = gameState.players;
      if (matchups.skipPlayerId) {
        const BYE_BONUS_GOLD = 50;
        updatedPlayers = gameState.players.map((p: PlayerGameState) =>
          p.userId === matchups.skipPlayerId ? { ...p, money: p.money + BYE_BONUS_GOLD } : p
        );
        console.log(`[MultiplayerService] Bye bonus +${BYE_BONUS_GOLD}G → ${matchups.skipPlayerId}`);
      }

      return { ...gameState, currentPhase: 'battle', roundMatchups: matchups, players: updatedPlayers, phaseEndTime: null };
    });

    return resultMatchup;
  }

  private calcBattleRewards(player: PlayerGameState, isWinner: boolean, myRemaining: number, oppRemaining: number): { goldDelta: number; livesDelta: number } {
    if (isWinner) {
      let gold = 80;
      const winStreak = (player.battleRecord?.wins ?? 0) + 1;
      if (winStreak >= 4) gold += 80; else if (winStreak >= 3) gold += 50; else if (winStreak >= 2) gold += 30;
      if (myRemaining >= 3) gold += 50;
      return { goldDelta: gold, livesDelta: 0 };
    } else {
      const livesLost = 2 + oppRemaining;
      let consolation = 0;
      const loseStreak = (player.battleRecord?.losses ?? 0) + 1;
      if (loseStreak >= 4) consolation = 80; else if (loseStreak >= 3) consolation = 50; else if (loseStreak >= 2) consolation = 30;
      if (player.lives <= 10) consolation += 40; else if (player.lives <= 20) consolation += 20;
      return { goldDelta: consolation, livesDelta: -livesLost };
    }
  }

  async submitBattleResult(roomId: string, result: PvPBattleResult): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    let eliminatedId = '';

    const { committed } = await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;
      const existingResult = (gameState.battleResults || []).find((r: PvPBattleResult) => r.roundNumber === result.roundNumber && ((r.player1Id === result.player1Id && r.player2Id === result.player2Id) || (r.player1Id === result.player2Id && r.player2Id === result.player1Id)));
      if (existingResult) return gameState;

      const loserId = result.winnerId === result.player1Id ? result.player2Id : result.player1Id;
      const encounterRecord = pvpBattleService.updateEncounterRecord(gameState.encounterRecord || {}, result.player1Id, result.player2Id);
      const winnerRemaining = result.winnerId === result.player1Id ? result.player1RemainingPokemon : result.player2RemainingPokemon;
      const loserRemaining = result.winnerId === result.player1Id ? result.player2RemainingPokemon : result.player1RemainingPokemon;
      let loserWillBeEliminated = false;
      let rewardP1: { gold: number; lives: number } | undefined;
      let rewardP2: { gold: number; lives: number } | undefined;

      const updatedPlayers = gameState.players.map((p: PlayerGameState) => {
        const isWinner = p.userId === result.winnerId;
        const isLoser = p.userId === loserId;
        if (!isWinner && !isLoser) return p;
        const { goldDelta, livesDelta } = this.calcBattleRewards(p, isWinner, isWinner ? winnerRemaining : loserRemaining, isWinner ? loserRemaining : winnerRemaining);
        if (p.userId === result.player1Id) rewardP1 = { gold: goldDelta, lives: livesDelta };
        if (p.userId === result.player2Id) rewardP2 = { gold: goldDelta, lives: livesDelta };
        const newMoney = Math.max(0, p.money + goldDelta);
        const newLives = Math.max(0, p.lives + livesDelta);
        if (isLoser && newLives <= 0) loserWillBeEliminated = true;
        return { ...p, money: newMoney, lives: newLives, isAlive: newLives > 0, battleRecord: { wins: isWinner ? (p.battleRecord?.wins ?? 0) + 1 : (p.battleRecord?.wins ?? 0), losses: isLoser ? (p.battleRecord?.losses ?? 0) + 1 : (p.battleRecord?.losses ?? 0) } };
      });

      const battleResults = [...(gameState.battleResults || []), { ...result, rewardP1, rewardP2 }];
      return { ...gameState, players: updatedPlayers, encounterRecord, battleResults, _pendingElimination: loserWillBeEliminated ? loserId : null } as any;
    });

    if (committed) {
      const snap = await get(gameStateRef);
      if (snap.exists()) {
        const gs = snap.val() as any;
        if (gs._pendingElimination) { eliminatedId = gs._pendingElimination; await update(gameStateRef, { _pendingElimination: null }); }
      }
    }
    if (eliminatedId) await this.playerDefeated(roomId, eliminatedId);

    const currentUser = authService.getCurrentUser();
    if (currentUser && result.winnerId === currentUser.uid) achievementService.onMultiWin(currentUser.rating ?? 1000);
  }

  async checkAllBattlesComplete(roomId: string): Promise<boolean> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    if (!snapshot.exists()) return false;
    const gameState = snapshot.val() as MultiplayerGameState;
    if (!gameState.roundMatchups) return true;
    const currentRoundResults = (gameState.battleResults || []).filter((r: PvPBattleResult) => r.roundNumber === gameState.currentRound);
    return currentRoundResults.length >= gameState.roundMatchups.matches.length;
  }

  async startWaitingWavePhase(roomId: string): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;
      // 이미 waiting_wave로 전환됐으면 무시
      if (gameState.currentPhase === 'waiting_wave') return gameState;
      // battle 페이즈일 때만 전환 (모든 배틀 완료 후)
      if (gameState.currentPhase !== 'battle') return gameState;
      const currentRound = gameState.currentRound;
      const recentResults = (gameState.battleResults || []).filter(
        (r: PvPBattleResult) => r.roundNumber >= currentRound - 2
      );
      return {
        ...gameState,
        currentPhase: 'waiting_wave',
        phaseEndTime: this.now() + PHASE_COUNTDOWN_SECONDS * 1000,
        battleResults: recentResults,
      };
    });
  }

  async finalizeGame(roomId: string): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    if (!snapshot.exists()) return;
    const gameState = snapshot.val() as MultiplayerGameState;
    await this.updateRatings(gameState);
  }

  private async updateRatings(gameState: MultiplayerGameState): Promise<void> {
    const players = gameState.players;
    const currentUser = authService.getCurrentUser();
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      let ratingChange = 0;
      for (let j = 0; j < players.length; j++) {
        if (i === j) continue;
        const opponent = players[j];
        const expectedScore = 1 / (1 + Math.pow(10, (opponent.rating - player.rating) / 400));
        const actualScore = (player.placement ?? players.length) < (opponent.placement ?? players.length) ? 1 : 0;
        ratingChange += Math.round(32 * (actualScore - expectedScore));
      }
      const newRating = Math.max(0, player.rating + ratingChange);
      await databaseService.updateUserRating(player.userId, newRating);
      if (currentUser && player.userId === currentUser.uid) achievementService.onRatingUpdate(newRating);
    }
  }

  // ─── [FIX-3] 재접속 시 플레이어 상태 복원 ───────────────────────
  async getPlayerStateForRejoin(roomId: string, userId: string): Promise<{
    lives: number;
    money: number;
    wave: number;
    towerDetails: TowerDetail[];
    isAlive: boolean;
    currentRound: number;
    currentPhase: GamePhase;
  } | null> {
    try {
      const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
      const gsSnap = await get(gameStateRef);
      if (!gsSnap.exists()) return null;

      const gameState = gsSnap.val() as MultiplayerGameState;
      const playerState = gameState.players.find((p: PlayerGameState) => p.userId === userId);
      if (!playerState) return null;

      const towerRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
      const towerSnap = await get(towerRef);
      const towerDetails: TowerDetail[] = towerSnap.exists() ? (towerSnap.val().towers || []) : [];

      return {
        lives: playerState.lives,
        money: playerState.money,
        wave: playerState.wave,
        towerDetails,
        isAlive: playerState.isAlive,
        currentRound: gameState.currentRound,
        currentPhase: gameState.currentPhase,
      };
    } catch (err) {
      console.error('[MultiplayerService] getPlayerStateForRejoin error:', err);
      return null;
    }
  }

  // ─── 구독 메서드들 ─────────────────────────────────────────────

  onRoomsUpdate(callback: (rooms: Room[]) => void): () => void {
    const roomsRef = ref(rtdb, 'rooms');
    const listener = onValue(roomsRef, (snapshot) => {
      if (!snapshot.exists()) { callback([]); return; }
      const rooms: Room[] = [];
      const now = Date.now();
      snapshot.forEach((child) => { const room = child.val() as Room; if (now - room.createdAt <= ROOM_EXPIRY_TIME && room.status === 'waiting') rooms.push(room); });
      callback(rooms);
    });
    return () => off(roomsRef, 'value', listener);
  }

  onRoomUpdate(roomId: string, callback: (room: Room | null) => void): () => void {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const listener = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) { callback(null); return; }
      const room = snapshot.val() as Room;
      if (Date.now() - room.createdAt > ROOM_EXPIRY_TIME) { this.deleteRoom(roomId); callback(null); return; }
      callback(room);
    });
    return () => off(roomRef, 'value', listener);
  }

  onGameStateUpdate(roomId: string, callback: (players: PlayerGameState[]) => void): () => void {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const listener = onValue(gameStateRef, (snapshot) => {
      if (!snapshot.exists()) { callback([]); return; }
      const gameState = snapshot.val();
      const players = gameState.players || [];
      callback(Array.isArray(players) ? players : Object.values(players));
    });
    return () => off(gameStateRef, 'value', listener);
  }

  onGameStateUpdateWithPhase(roomId: string, callback: (state: MultiplayerGameState | null) => void): () => void {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const listener = onValue(gameStateRef, (snapshot) => { callback(snapshot.exists() ? (snapshot.val() as MultiplayerGameState) : null); });
    return () => off(gameStateRef, 'value', listener);
  }

  onMatchupUpdate(roomId: string, callback: (matchups: RoundMatchup | null) => void): () => void {
    const matchupRef = ref(rtdb, `gameStates/${roomId}/roundMatchups`);
    const listener = onValue(matchupRef, (snapshot) => { callback(snapshot.exists() ? snapshot.val() : null); });
    return () => off(matchupRef, 'value', listener);
  }

  onTowerDetailsUpdate(roomId: string, userId: string, callback: (towers: TowerDetail[]) => void): () => void {
    const towerDetailsRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
    const listener = onValue(towerDetailsRef, (snapshot) => { if (!snapshot.exists()) { callback([]); return; } const data = snapshot.val(); callback(data.towers || []); });
    return () => off(towerDetailsRef, 'value', listener);
  }

  onAllTowerDetailsUpdate(roomId: string, callback: (allTowers: Map<string, TowerDetail[]>) => void): () => void {
    const allTowersRef = ref(rtdb, `towerDetails/${roomId}`);
    const listener = onValue(allTowersRef, (snapshot) => {
      const combined = new Map<string, TowerDetail[]>();
      if (snapshot.exists()) { snapshot.forEach((child) => { const userId = child.key!; const data = child.val(); if (data.towers && Array.isArray(data.towers)) combined.set(userId, data.towers); }); }
      callback(combined);
    });
    return () => off(allTowersRef, 'value', listener);
  }

  async getAllTowerDetailsOnce(roomId: string): Promise<Map<string, TowerDetail[]>> {
    const allTowersRef = ref(rtdb, `towerDetails/${roomId}`);
    const snapshot = await get(allTowersRef);
    const combined = new Map<string, TowerDetail[]>();
    if (snapshot.exists()) { snapshot.forEach((child) => { const userId = child.key!; const data = child.val(); if (data.towers && Array.isArray(data.towers) && data.towers.length > 0) combined.set(userId, data.towers); }); }
    console.log(`[MultiplayerService] getAllTowerDetailsOnce: ${combined.size} players loaded`);
    return combined;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    return snapshot.exists() ? (snapshot.val() as Room) : null;
  }

  getCurrentRoomId(): string | null {
    if (!this.currentRoomId) this.currentRoomId = localStorage.getItem('currentRoomId');
    return this.currentRoomId;
  }

  clearCurrentRoom(): void {
    this.currentRoomId = null;
    localStorage.removeItem('currentRoomId');
  }

  getRoomRemainingTime(room: Room): number { return Math.max(0, ROOM_EXPIRY_TIME - (Date.now() - room.createdAt)); }
  isRoomExpired(room: Room): boolean { return Date.now() - room.createdAt > ROOM_EXPIRY_TIME; }
}

export const multiplayerService = new MultiplayerService();