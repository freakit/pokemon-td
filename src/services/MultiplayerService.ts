// src/services/MultiplayerService.ts
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

// 페이즈 타이밍 상수
const PHASE_COUNTDOWN_SECONDS = 10;
const FIRST_WAVE_PREP_SECONDS = 60;
const BATTLE_WAVE_INTERVAL = 3;

const ROOM_EXPIRY_TIME = 3 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = 10 * 60 * 1000;

class MultiplayerService {
  private currentRoomId: string | null = null;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  // 서버-클라이언트 시간 오프셋 (ms)
  private serverTimeOffset: number = 0;

  constructor() {
    this.startAutoCleanup();
    this.syncServerTime();
  }

  /**
   * Firebase 서버 시간과 클라이언트 시간의 오프셋을 동기화
   * phaseEndTime 계산 시 이 오프셋을 적용해 시계 편차 보정
   */
  private syncServerTime(): void {
    const offsetRef = ref(rtdb, '.info/serverTimeOffset');
    onValue(offsetRef, (snapshot) => {
      this.serverTimeOffset = snapshot.val() || 0;
    });
  }

  /** 보정된 현재 시간 (서버 기준) */
  private now(): number {
    return Date.now() + this.serverTimeOffset;
  }

  /** 외부에서 카운트다운 계산 시 사용할 수 있도록 오프셋 공개 */
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
        if (now - room.createdAt > ROOM_EXPIRY_TIME) {
          roomsToDelete.push(room.id);
        }
      });

      for (const roomId of roomsToDelete) {
        await this.deleteRoom(roomId);
      }
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
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  async createRoom(mapId: string, mapName: string): Promise<string> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const roomsRef = ref(rtdb, 'rooms');
    const newRoomRef = push(roomsRef);
    const roomId = newRoomRef.key!;

    const room: Room = {
      id: roomId,
      name: `${user.displayName}의 방`,
      mapId,
      mapName,
      hostId: user.uid,
      hostName: user.displayName,
      players: [{
        userId: user.uid,
        userName: user.displayName,
        isReady: true,
        isAI: false,
        rating: user.rating
      }],
      maxPlayers: 8,
      status: 'waiting',
      createdAt: Date.now()
    };

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
    if (Date.now() - room.createdAt > ROOM_EXPIRY_TIME) {
      await this.deleteRoom(roomId);
      throw new Error('Room has expired');
    }
    if (room.players.length >= room.maxPlayers) throw new Error('Room is full');
    if (room.status !== 'waiting') throw new Error('Game already started');

    const newPlayer: RoomPlayer = {
      userId: user.uid,
      userName: user.displayName,
      isReady: false,
      isAI: false,
      rating: user.rating
    };

    await update(roomRef, { players: [...room.players, newPlayer] });
    this.currentRoomId = roomId;
    localStorage.setItem('currentRoomId', roomId);
  }

  async rejoinRoom(roomId: string): Promise<{ room: Room; canRejoin: boolean }> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) {
      this.clearCurrentRoom();
      return { room: null as any, canRejoin: false };
    }

    const room = snapshot.val() as Room;
    if (Date.now() - room.createdAt > ROOM_EXPIRY_TIME) {
      await this.deleteRoom(roomId);
      this.clearCurrentRoom();
      return { room: null as any, canRejoin: false };
    }

    const isPlayerInRoom = room.players.some(p => p.userId === user.uid);
    if (!isPlayerInRoom) {
      this.clearCurrentRoom();
      return { room: null as any, canRejoin: false };
    }

    if (room.status === 'playing' || room.status === 'starting') {
      this.currentRoomId = roomId;
      return { room, canRejoin: true };
    }

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

    if (updatedPlayers.length === 0) {
      await this.deleteRoom(roomId);
    } else {
      const newHostId = room.hostId === user.uid ? updatedPlayers[0].userId : room.hostId;
      const newHostName = room.hostId === user.uid ? updatedPlayers[0].userName : room.hostName;
      await update(roomRef, {
        players: updatedPlayers,
        hostId: newHostId,
        hostName: newHostName
      });
    }

    // 게임 진행 중이면 해당 플레이어 탈락 처리
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const gsSnap = await get(gameStateRef);
    if (gsSnap.exists()) {
      const gs = gsSnap.val() as MultiplayerGameState;
      const updatedGsPlayers = gs.players.map((p: PlayerGameState) =>
        p.userId === user.uid ? { ...p, isAlive: false } : p
      );
      await update(gameStateRef, { players: updatedGsPlayers });
    }

    this.clearCurrentRoom();
  }

  async addAI(roomId: string, difficulty: AIDifficulty): Promise<void> {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return;

    const room = snapshot.val() as Room;
    const aiId = `ai_${difficulty}_${Date.now()}`;
    const aiPlayer: RoomPlayer = {
      userId: aiId,
      userName: `AI (${difficulty})`,
      isReady: true,
      isAI: true,
      aiDifficulty: difficulty,
      rating: difficulty === 'easy' ? 800 : difficulty === 'normal' ? 1000 : 1200
    };

    await update(roomRef, { players: [...room.players, aiPlayer] });
  }

  async toggleReady(roomId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return;

    const room = snapshot.val() as Room;
    const updatedPlayers = room.players.map(p =>
      p.userId === user.uid ? { ...p, isReady: !p.isReady } : p
    );
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

    await update(roomRef, { status: 'starting' });

    setTimeout(async () => {
      await update(roomRef, { status: 'playing' });
      await this.initializePvPGameState(roomId, room.players);
    }, 3000);
  }

  /**
   * 게임 상태 초기화 - 서버 보정 시간 사용
   */
  private async initializePvPGameState(roomId: string, players: RoomPlayer[]): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);

    const initialState: MultiplayerGameState = {
      roomId,
      players: players.map(p => ({
        userId: p.userId,
        userName: p.userName,
        wave: 0,
        lives: 50,
        money: 500,
        towers: 0,
        isAlive: true,
        rating: p.rating,
        waveCompleted: false,
        battleRecord: { wins: 0, losses: 0 }
      })),
      startTime: this.now(),
      rankings: [],
      currentRound: 0,
      currentPhase: 'waiting_wave',
      encounterRecord: {},
      battleResults: [],
      phaseEndTime: this.now() + FIRST_WAVE_PREP_SECONDS * 1000
    };

    await set(gameStateRef, initialState);
  }

  /**
   * 페이즈 변경 - 서버 보정 시간 사용
   */
  async setGamePhase(roomId: string, phase: GamePhase): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const needsCountdown = phase === 'waiting_wave' || phase === 'waiting_battle';
    await update(gameStateRef, {
      currentPhase: phase,
      phaseEndTime: needsCountdown ? this.now() + PHASE_COUNTDOWN_SECONDS * 1000 : null
    });
  }

  /**
   * 동기화된 웨이브 시작
   */
  async startSynchronizedWave(roomId: string): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    if (!snapshot.exists()) return;

    const gameState = snapshot.val() as MultiplayerGameState;
    const newRound = gameState.currentRound + 1;

    const updatedPlayers = gameState.players.map((p: PlayerGameState) => ({
      ...p,
      wave: p.isAlive ? newRound : p.wave,
      waveCompleted: false
    }));

    await update(gameStateRef, {
      currentRound: newRound,
      currentPhase: 'wave',
      players: updatedPlayers,
      phaseEndTime: null
    });
  }

  /**
   * 웨이브 완료 표시 - 트랜잭션으로 경쟁 조건 방지
   * 모든 생존 플레이어가 완료하면 자동으로 다음 페이즈로 전환
   */
  async markWaveCompleted(roomId: string, userId: string): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);

    let shouldTransition = false;
    let transitionPhase: GamePhase = 'waiting_wave';
    let currentRound = 0;

    await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;

      // 이미 wave 페이즈가 아니면 무시 (중복 호출 방지)
      if (gameState.currentPhase !== 'wave') return gameState;

      const updatedPlayers = gameState.players.map((p: PlayerGameState) =>
        p.userId === userId ? { ...p, waveCompleted: true } : p
      );

      const alivePlayers = updatedPlayers.filter((p: PlayerGameState) => p.isAlive);
      const allCompleted = alivePlayers.length > 0 &&
        alivePlayers.every((p: PlayerGameState) => p.waveCompleted);

      currentRound = gameState.currentRound;

      if (allCompleted) {
        shouldTransition = true;
        if (gameState.currentRound > 0 && gameState.currentRound % BATTLE_WAVE_INTERVAL === 0) {
          transitionPhase = 'waiting_battle';
        } else {
          transitionPhase = 'waiting_wave';
        }

        return {
          ...gameState,
          players: updatedPlayers,
          currentPhase: transitionPhase,
          phaseEndTime: this.now() + PHASE_COUNTDOWN_SECONDS * 1000
        };
      }

      return { ...gameState, players: updatedPlayers };
    });

    if (shouldTransition) {
      console.log(`[MultiplayerService] All players completed wave ${currentRound}, transitioning to ${transitionPhase}`);
    }
  }

  /**
   * 플레이어 상태 업데이트 - 트랜잭션으로 덮어쓰기 방지
   */
  async updatePlayerState(
    roomId: string,
    userId: string,
    state: Partial<PlayerGameState>
  ): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);

    await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;

      const updatedPlayers = (gameState.players || []).map((p: PlayerGameState) =>
        p.userId === userId
          ? { ...p, ...state, lastUpdate: this.now() }
          : p
      );

      return { ...gameState, players: updatedPlayers };
    });
  }

  /**
   * 타워 상세 정보 업데이트 (스로틀링 유지)
   */
  private lastTowerUpdate: Map<string, number> = new Map();
  private towerUpdateThrottle = 1000;
  private towerUpdateTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async updatePlayerTowerDetails(
    roomId: string,
    userId: string,
    towerDetails: TowerDetail[]
  ): Promise<void> {
    const now = Date.now();
    const lastUpdate = this.lastTowerUpdate.get(userId) || 0;

    if (this.towerUpdateTimeouts.has(userId)) {
      clearTimeout(this.towerUpdateTimeouts.get(userId)!);
      this.towerUpdateTimeouts.delete(userId);
    }

    const doUpdate = async () => {
      const towerDetailsRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
      await set(towerDetailsRef, { towers: towerDetails, updatedAt: this.now() });
      this.lastTowerUpdate.set(userId, Date.now());
    };

    if (now - lastUpdate >= this.towerUpdateThrottle) {
      await doUpdate();
    } else {
      const timeout = setTimeout(async () => {
        await doUpdate();
        this.towerUpdateTimeouts.delete(userId);
      }, this.towerUpdateThrottle - (now - lastUpdate));
      this.towerUpdateTimeouts.set(userId, timeout);
    }
  }

  /**
   * 플레이어 탈락 처리 - 트랜잭션으로 중복 처리 방지
   */
  async playerDefeated(roomId: string, userId: string): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);

    let placementRank = 0;
    let aliveCount = 0;

    await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;

      const target = gameState.players.find((p: PlayerGameState) => p.userId === userId);
      if (!target || !target.isAlive) return; // 이미 탈락 처리됨 - 중복 방지

      aliveCount = gameState.players.filter((p: PlayerGameState) => p.isAlive).length;
      placementRank = aliveCount; // 탈락 순위

      const rankings = [...(gameState.rankings || []), userId];
      const updatedPlayers = gameState.players.map((p: PlayerGameState) =>
        p.userId === userId
          ? { ...p, isAlive: false, placement: placementRank }
          : p
      );

      return { ...gameState, players: updatedPlayers, rankings };
    });

    console.log(`[MultiplayerService] Player ${userId} defeated at rank ${placementRank}`);
  }

  /**
   * PvP 대전 페이즈 시작
   */
  async startBattlePhase(roomId: string): Promise<RoundMatchup | null> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    if (!snapshot.exists()) return null;

    const gameState = snapshot.val() as MultiplayerGameState;
    const alivePlayers = gameState.players.filter((p: PlayerGameState) => p.isAlive);

    if (alivePlayers.length <= 1) return null;

    const matchups = pvpBattleService.generateMatchups(
      alivePlayers,
      gameState.encounterRecord || {},
      gameState.currentRound
    );

    await update(gameStateRef, {
      currentPhase: 'battle',
      roundMatchups: matchups,
      phaseEndTime: null
    });

    return matchups;
  }

  /**
   * TFT 스타일 배틀 보상/페널티 계산
   *
   * ─ 승리 ─────────────────────────────────────────────
   *  기본:        +80G
   *  연승 보너스:  2연승 +30 / 3연승 +50 / 4연승+ +80G
   *  압승(생존 3+): +50G
   *  최대 보상:   +210G
   *
   * ─ 패배 ─────────────────────────────────────────────
   *  라이프 차감:  2 + 상대 생존 포켓몬 수
   *  연패 위로금:  2연패 +30 / 3연패 +50 / 4연패+ +80G
   *  빈사 보너스:  라이프 ≤20 → +20G / ≤10 → +40G
   */
  private calcBattleRewards(
    player: PlayerGameState,
    isWinner: boolean,
    myRemaining: number,
    oppRemaining: number,
  ): { goldDelta: number; livesDelta: number } {
 
    if (isWinner) {
      let gold = 80;
      const winStreak = (player.battleRecord?.wins ?? 0) + 1; // 이번 승리 포함
      if (winStreak >= 4)      gold += 80;
      else if (winStreak >= 3) gold += 50;
      else if (winStreak >= 2) gold += 30;
      if (myRemaining >= 3)    gold += 50; // 압승 보너스
      return { goldDelta: gold, livesDelta: 0 };
    } else {
      const livesLost = 2 + oppRemaining; // 패배 라이프 차감
      let consolation = 0;
      const loseStreak = (player.battleRecord?.losses ?? 0) + 1;
      if (loseStreak >= 4)      consolation = 80;
      else if (loseStreak >= 3) consolation = 50;
      else if (loseStreak >= 2) consolation = 30;
      // 빈사 보너스 (현재 라이프 기준)
      if (player.lives <= 10)      consolation += 40;
      else if (player.lives <= 20) consolation += 20;
      return { goldDelta: consolation, livesDelta: -livesLost };
    }
  }
 
  /**
   * 대전 결과 저장 - 트랜잭션으로 중복 저장 방지
   */
  async submitBattleResult(roomId: string, result: PvPBattleResult): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
 
    let needsElimination = false;
    let eliminatedId = '';
 
    await runTransaction(gameStateRef, (gameState: MultiplayerGameState | null) => {
      if (!gameState) return gameState;
 
      // 중복 저장 방지
      const existingResult = (gameState.battleResults || []).find(
        (r: PvPBattleResult) =>
          r.roundNumber === result.roundNumber &&
          ((r.player1Id === result.player1Id && r.player2Id === result.player2Id) ||
            (r.player1Id === result.player2Id && r.player2Id === result.player1Id))
      );
      if (existingResult) return;
 
      const loserId = result.winnerId === result.player1Id ? result.player2Id : result.player1Id;
 
      const encounterRecord = pvpBattleService.updateEncounterRecord(
        gameState.encounterRecord || {},
        result.player1Id,
        result.player2Id
      );
 
      // 승자/패자 시점의 생존 포켓몬 수
      const winnerRemaining = result.winnerId === result.player1Id
        ? result.player1RemainingPokemon
        : result.player2RemainingPokemon;
      const loserRemaining = result.winnerId === result.player1Id
        ? result.player2RemainingPokemon
        : result.player1RemainingPokemon;
 
      const updatedPlayers = gameState.players.map((p: PlayerGameState) => {
        const isWinner = p.userId === result.winnerId;
        const isLoser  = p.userId === loserId;
        if (!isWinner && !isLoser) return p;
 
        const { goldDelta, livesDelta } = this.calcBattleRewards(
          p,
          isWinner,
          isWinner ? winnerRemaining : loserRemaining,
          isWinner ? loserRemaining  : winnerRemaining,
        );
 
        const newMoney = Math.max(0, p.money + goldDelta);
        const newLives = Math.max(0, p.lives + livesDelta);
 
        if (isLoser && newLives <= 0) {
          needsElimination = true;
          eliminatedId = loserId;
        }
 
        return {
          ...p,
          money: newMoney,
          lives: newLives,
          isAlive: newLives > 0,
          battleRecord: {
            wins:   isWinner ? (p.battleRecord?.wins   ?? 0) + 1 : (p.battleRecord?.wins   ?? 0),
            losses: isLoser  ? (p.battleRecord?.losses ?? 0) + 1 : (p.battleRecord?.losses ?? 0),
          },
        };
      });
 
      const battleResults = [...(gameState.battleResults || []), result];
      return { ...gameState, players: updatedPlayers, encounterRecord, battleResults };
    });
 
    // 탈락자 처리 (트랜잭션 밖에서 별도 호출)
    if (needsElimination && eliminatedId) {
      await this.playerDefeated(roomId, eliminatedId);
    }
 
    // 승리 업적 체크
    const currentUser = authService.getCurrentUser();
    if (currentUser && result.winnerId === currentUser.uid) {
      achievementService.onMultiWin(currentUser.rating ?? 1000);
    }
  }

  async checkAllBattlesComplete(roomId: string): Promise<boolean> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    if (!snapshot.exists()) return false;

    const gameState = snapshot.val() as MultiplayerGameState;
    if (!gameState.roundMatchups) return true;

    const currentRoundResults = (gameState.battleResults || []).filter(
      (r: PvPBattleResult) => r.roundNumber === gameState.currentRound
    );

    return currentRoundResults.length >= gameState.roundMatchups.matches.length;
  }

  async startWaitingWavePhase(roomId: string): Promise<void> {
    await this.setGamePhase(roomId, 'waiting_wave');
  }

  /**
   * 게임 종료 처리 및 레이팅 업데이트
   */
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
        const actualScore =
          (player.placement ?? players.length) < (opponent.placement ?? players.length) ? 1 : 0;
        ratingChange += Math.round(32 * (actualScore - expectedScore));
      }

      const newRating = Math.max(0, player.rating + ratingChange);
      await databaseService.updateUserRating(player.userId, newRating);

      // 현재 유저의 레이팅이 확정되면 레이팅 업적 정확하게 체크
      if (currentUser && player.userId === currentUser.uid) {
        achievementService.onRatingUpdate(newRating);
      }
    }
  }

  // ─── 구독 메서드들 ─────────────────────────────────────────────

  onRoomsUpdate(callback: (rooms: Room[]) => void): () => void {
    const roomsRef = ref(rtdb, 'rooms');
    const listener = onValue(roomsRef, (snapshot) => {
      if (!snapshot.exists()) { callback([]); return; }

      const rooms: Room[] = [];
      const now = Date.now();
      snapshot.forEach((child) => {
        const room = child.val() as Room;
        if (now - room.createdAt <= ROOM_EXPIRY_TIME && room.status === 'waiting') {
          rooms.push(room);
        }
      });
      callback(rooms);
    });
    return () => off(roomsRef, 'value', listener);
  }

  onRoomUpdate(roomId: string, callback: (room: Room | null) => void): () => void {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const listener = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) { callback(null); return; }
      const room = snapshot.val() as Room;
      if (Date.now() - room.createdAt > ROOM_EXPIRY_TIME) {
        this.deleteRoom(roomId);
        callback(null);
        return;
      }
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

  onGameStateUpdateWithPhase(
    roomId: string,
    callback: (state: MultiplayerGameState | null) => void
  ): () => void {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const listener = onValue(gameStateRef, (snapshot) => {
      callback(snapshot.exists() ? (snapshot.val() as MultiplayerGameState) : null);
    });
    return () => off(gameStateRef, 'value', listener);
  }

  onMatchupUpdate(
    roomId: string,
    callback: (matchups: RoundMatchup | null) => void
  ): () => void {
    const matchupRef = ref(rtdb, `gameStates/${roomId}/roundMatchups`);
    const listener = onValue(matchupRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : null);
    });
    return () => off(matchupRef, 'value', listener);
  }

  onTowerDetailsUpdate(
    roomId: string,
    userId: string,
    callback: (towers: TowerDetail[]) => void
  ): () => void {
    const towerDetailsRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
    const listener = onValue(towerDetailsRef, (snapshot) => {
      if (!snapshot.exists()) { callback([]); return; }
      const data = snapshot.val();
      callback(data.towers || []);
    });
    return () => off(towerDetailsRef, 'value', listener);
  }

  onAllTowerDetailsUpdate(
    roomId: string,
    callback: (allTowers: Map<string, TowerDetail[]>) => void
  ): () => void {
    // [수정] AI의 pushTowerDetails()는 updatePlayerTowerDetails()를 통해
    // towerDetails/{roomId}/{userId} 경로에 씁니다.
    // 기존의 aiTowers 별도 경로 구독은 잘못된 경로였으므로 제거하고
    // towerDetails/{roomId}/ 단일 경로에서 모든 플레이어(AI 포함)를 읽습니다.
    const allTowersRef = ref(rtdb, `towerDetails/${roomId}`);
 
    const listener = onValue(allTowersRef, (snapshot) => {
      const combined = new Map<string, TowerDetail[]>();
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const userId = child.key!;
          const data = child.val();
          if (data.towers && Array.isArray(data.towers)) {
            combined.set(userId, data.towers);
          }
        });
      }
      callback(combined);
    });
 
    return () => off(allTowersRef, 'value', listener);
  }

  // ─── 유틸 ─────────────────────────────────────────────────────

  async getRoom(roomId: string): Promise<Room | null> {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    return snapshot.exists() ? (snapshot.val() as Room) : null;
  }

  getCurrentRoomId(): string | null {
    if (!this.currentRoomId) {
      this.currentRoomId = localStorage.getItem('currentRoomId');
    }
    return this.currentRoomId;
  }

  clearCurrentRoom(): void {
    this.currentRoomId = null;
    localStorage.removeItem('currentRoomId');
  }

  getRoomRemainingTime(room: Room): number {
    return Math.max(0, ROOM_EXPIRY_TIME - (Date.now() - room.createdAt));
  }

  isRoomExpired(room: Room): boolean {
    return Date.now() - room.createdAt > ROOM_EXPIRY_TIME;
  }
}

export const multiplayerService = new MultiplayerService();