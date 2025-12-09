// src/services/MultiplayerService.ts
import { ref, set, onValue, push, update, remove, get, off } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { Room, RoomPlayer, PlayerGameState, AIDifficulty, TowerDetail, GamePhase, MultiplayerGameState, RoundMatchup, PvPBattleResult } from '../types/multiplayer';
import { pvpBattleService } from './PvPBattleService';
import { authService } from './AuthService';
import { databaseService } from './DatabaseService';

// 디버프 시스템 제거됨 - TFT 스타일 PvP 대전으로 대체

// 페이즈 타이밍 상수
const PHASE_COUNTDOWN_SECONDS = 10; // 다음 페이즈까지 카운트다운
const FIRST_WAVE_PREP_SECONDS = 60; // 첫 웨이브 준비 시간 (1분)
const BATTLE_WAVE_INTERVAL = 3; // 3의 배수 웨이브마다 대전

const ROOM_EXPIRY_TIME = 3 * 60 * 60 * 1000; // 3시간 (밀리초)
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10분마다 정리

class MultiplayerService {
  private currentRoomId: string | null = null;
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    // 서비스 시작 시 자동 정리 작업 시작
    this.startAutoCleanup();
  }

  /**
   * 오래된 방 자동 정리 시작
   */
  private startAutoCleanup(): void {
    // 이미 실행 중이면 중지
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
    }

    // 즉시 한 번 실행
    this.cleanupExpiredRooms();

    // 주기적으로 실행
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredRooms();
    }, CLEANUP_INTERVAL);
  }

  /**
   * 만료된 방 정리
   */
  private async cleanupExpiredRooms(): Promise<void> {
    try {
      const roomsRef = ref(rtdb, 'rooms');
      const snapshot = await get(roomsRef);

      if (!snapshot.exists()) return;

      const now = Date.now();
      const roomsToDelete: string[] = [];

      snapshot.forEach((child) => {
        const room = child.val() as Room;
        const roomAge = now - room.createdAt;

        // 3시간 이상 경과한 방 삭제
        if (roomAge > ROOM_EXPIRY_TIME) {
          roomsToDelete.push(room.id);
          console.log(`Deleting expired room: ${room.id} (age: ${Math.floor(roomAge / 1000 / 60)} minutes)`);
        }
      });

      // 만료된 방 삭제
      for (const roomId of roomsToDelete) {
        await this.deleteRoom(roomId);
      }

      if (roomsToDelete.length > 0) {
        console.log(`Cleaned up ${roomsToDelete.length} expired rooms`);
      }
    } catch (error) {
      console.error('Failed to cleanup expired rooms:', error);
    }
  }

  /**
   * 방과 관련된 모든 데이터 삭제
   */
  private async deleteRoom(roomId: string): Promise<void> {
    try {
      // 방 데이터 삭제
      const roomRef = ref(rtdb, `rooms/${roomId}`);
      await remove(roomRef);

      // 게임 상태 삭제
      const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
      await remove(gameStateRef);

      // 타워 상세 정보 삭제
      const towerDetailsRef = ref(rtdb, `towerDetails/${roomId}`);
      await remove(towerDetailsRef);

      // PvP 대전 결과 삭제
      const battleResultsRef = ref(rtdb, `battleResults/${roomId}`);
      await remove(battleResultsRef);

      console.log(`Successfully deleted room and related data: ${roomId}`);
    } catch (error) {
      console.error(`Failed to delete room ${roomId}:`, error);
    }
  }

  /**
   * 정리 작업 중지
   */
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
    
    // 방이 만료되었는지 확인
    const roomAge = Date.now() - room.createdAt;
    if (roomAge > ROOM_EXPIRY_TIME) {
      await this.deleteRoom(roomId);
      throw new Error('Room has expired');
    }
    
    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    if (room.status !== 'waiting') {
      throw new Error('Game already started');
    }

    const newPlayer: RoomPlayer = {
      userId: user.uid,
      userName: user.displayName,
      isReady: false,
      isAI: false,
      rating: user.rating
    };

    await update(roomRef, {
      players: [...room.players, newPlayer]
    });

    this.currentRoomId = roomId;
    localStorage.setItem('currentRoomId', roomId);
  }

  async rejoinRoom(roomId: string): Promise<{ room: Room, canRejoin: boolean }> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);

    if (!snapshot.exists()) {
      this.clearCurrentRoom();
      return { room: null as any, canRejoin: false };
    }
    
    const room = snapshot.val() as Room;
    
    // 방이 만료되었는지 확인
    const roomAge = Date.now() - room.createdAt;
    if (roomAge > ROOM_EXPIRY_TIME) {
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
      // 모든 플레이어가 나가면 방 삭제
      await this.deleteRoom(roomId);
    } else {
      await update(roomRef, {
        players: updatedPlayers,
        hostId: room.hostId === user.uid ? updatedPlayers[0].userId : room.hostId,
        hostName: room.hostId === user.uid ? updatedPlayers[0].userName : room.hostName
      });
    }

    this.clearCurrentRoom();
  }

  clearCurrentRoom(): void {
    this.currentRoomId = null;
    localStorage.removeItem('currentRoomId');
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return null;
    
    const room = snapshot.val() as Room;
    
    // 방이 만료되었는지 확인
    const roomAge = Date.now() - room.createdAt;
    if (roomAge > ROOM_EXPIRY_TIME) {
      await this.deleteRoom(roomId);
      return null;
    }
    
    return room;
  }

  async addAI(roomId: string, difficulty: AIDifficulty): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) throw new Error('Room not found');
    
    const room = snapshot.val() as Room;
    if (room.hostId !== user.uid) {
      throw new Error('Only host can add AI');
    }

    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }

    const aiPlayer: RoomPlayer = {
      userId: `ai_${Date.now()}`,
      userName: `AI (${difficulty.toUpperCase()})`,
      isReady: true,
      isAI: true,
      aiDifficulty: difficulty,
      rating: difficulty === 'easy' ? 800 : difficulty === 'normal' ? 1000 : 1200
    };

    await update(roomRef, {
      players: [...room.players, aiPlayer]
    });
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
    if (room.hostId !== user.uid) {
      throw new Error('Only host can start game');
    }

    if (room.players.length < 2) {
      throw new Error('Need at least 2 players');
    }

    await update(roomRef, { status: 'starting' });

    setTimeout(async () => {
      await update(roomRef, { status: 'playing' });
      
      // TFT 스타일 PvP 게임 상태 초기화
      await this.initializePvPGameState(roomId, room.players);
    }, 3000);
  }

  async updatePlayerState(roomId: string, userId: string, state: Partial<PlayerGameState>): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    
    if (!snapshot.exists()) return;

    const gameState = snapshot.val();
    const updatedPlayers = (gameState.players || []).map((p: PlayerGameState) =>
      p.userId === userId ? { ...p, ...state, lastUpdate: Date.now() } : p
    );
    await update(gameStateRef, { players: updatedPlayers });
  }

  private lastTowerUpdate: Map<string, number> = new Map();
  private towerUpdateThrottle: number = 1000; // 1초
  private pendingTowerUpdates: Map<string, { roomId: string, userId: string, towerDetails: TowerDetail[] }> = new Map();
  private towerUpdateTimeouts: Map<string, NodeJS.Timeout> = new Map();

  async updatePlayerTowerDetails(roomId: string, userId: string, towerDetails: TowerDetail[]): Promise<void> {
    const now = Date.now();
    const lastUpdate = this.lastTowerUpdate.get(userId) || 0;
    
    // 이전에 예약된 업데이트가 있다면 취소 (최신 데이터로 덮어쓰기 위해)
    if (this.towerUpdateTimeouts.has(userId)) {
      clearTimeout(this.towerUpdateTimeouts.get(userId)!);
      this.towerUpdateTimeouts.delete(userId);
    }

    if (now - lastUpdate < this.towerUpdateThrottle) {
      // 스로틀링 중이면 대기열에 저장하고 타이머 설정
      this.pendingTowerUpdates.set(userId, { roomId, userId, towerDetails });
      
      const delay = this.towerUpdateThrottle - (now - lastUpdate);
      const timeout = setTimeout(() => {
        this.flushPendingTowerUpdate(userId);
      }, delay);
      this.towerUpdateTimeouts.set(userId, timeout);
      return;
    }
    
    // 즉시 전송
    await this.sendTowerUpdate(roomId, userId, towerDetails);
  }

  private async flushPendingTowerUpdate(userId: string) {
    const pending = this.pendingTowerUpdates.get(userId);
    if (pending) {
      const { roomId, userId: uid, towerDetails } = pending;
      await this.sendTowerUpdate(roomId, uid, towerDetails);
      this.pendingTowerUpdates.delete(userId);
    }
    this.towerUpdateTimeouts.delete(userId);
  }

  private async sendTowerUpdate(roomId: string, userId: string, towerDetails: TowerDetail[]) {
    this.lastTowerUpdate.set(userId, Date.now());
    
    // AI 플레이어인 경우 별도 처리 (Firebase 보안 규칙 우회)
    if (userId.startsWith('ai_')) {
      await this.updateAITowerDetailsInGameState(roomId, userId, towerDetails);
      return;
    }

    const towerDetailsRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
    
    try {
      await set(towerDetailsRef, {
        towers: towerDetails,
        lastUpdate: Date.now()
      });
    } catch (error: any) {
      // AI 플레이어의 경우 권한 오류 무시 (Firebase 규칙이 인증된 사용자만 허용)
      // 대신 호스트가 AI 타워 정보를 gameStates에 저장
      if (userId.startsWith('ai_')) {
        // AI 타워 정보는 gameStates에 저장
        await this.updateAITowerDetailsInGameState(roomId, userId, towerDetails);
      } else {
        console.error('Failed to update tower details:', error);
      }
    }
  }

  private async updateAITowerDetailsInGameState(roomId: string, aiUserId: string, towerDetails: TowerDetail[]) {
    try {
      const aiTowerRef = ref(rtdb, `gameStates/${roomId}/aiTowers/${aiUserId}`);
      await set(aiTowerRef, {
        towers: towerDetails,
        lastUpdate: Date.now()
      });
    } catch (error) {
      // 호스트로서 gameStates에도 쓰기 실패하면 그냥 무시
      console.warn(`[AI] Could not store tower details for ${aiUserId}`);
    }
  }

  onTowerDetailsUpdate(roomId: string, userId: string, callback: (towers: TowerDetail[]) => void): () => void {
    const towerDetailsRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
    const listener = onValue(towerDetailsRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const data = snapshot.val();
      callback(data.towers || []);
    });
    return () => off(towerDetailsRef, 'value', listener);
  }

  onAllTowerDetailsUpdate(roomId: string, callback: (allTowers: Map<string, TowerDetail[]>) => void): () => void {
    const towerDetailsRef = ref(rtdb, `towerDetails/${roomId}`);
    const aiTowersRef = ref(rtdb, `gameStates/${roomId}/aiTowers`);
    
    let playerTowers = new Map<string, TowerDetail[]>();
    let aiTowerData = new Map<string, TowerDetail[]>();
    
    const emitCombined = () => {
      const combined = new Map<string, TowerDetail[]>();
      // 먼저 플레이어 타워 추가
      playerTowers.forEach((towers, id) => combined.set(id, towers));
      // AI 타워 추가 (중복 방지)
      aiTowerData.forEach((towers, id) => {
        if (!combined.has(id)) combined.set(id, towers);
      });
      console.log('[onAllTowerDetailsUpdate] Received towers:', [...combined.entries()].map(([k, v]) => [k, v.length]));
      callback(combined);
    };
    
    // 플레이어 타워 구독
    const playerListener = onValue(towerDetailsRef, (snapshot) => {
      playerTowers = new Map<string, TowerDetail[]>();
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const userId = child.key!;
          const data = child.val();
          if (data.towers) {
            playerTowers.set(userId, data.towers);
          }
        });
      }
      emitCombined();
    });
    
    // AI 타워 구독
    const aiListener = onValue(aiTowersRef, (snapshot) => {
      aiTowerData = new Map<string, TowerDetail[]>();
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const aiUserId = child.key!;
          const data = child.val();
          if (data.towers) {
            aiTowerData.set(aiUserId, data.towers);
          }
        });
      }
      emitCombined();
    });
    
    return () => {
      off(towerDetailsRef, 'value', playerListener);
      off(aiTowersRef, 'value', aiListener);
    };
  }

  // applyDebuff 제거됨 - TFT 스타일 PvP 대전으로 대체

  async playerDefeated(roomId: string, userId: string): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    
    if (!snapshot.exists()) return;
    
    const gameState = snapshot.val();
    const players = gameState.players || [];
    const updatedPlayers = players.map((p: PlayerGameState) =>
      p.userId === userId ? { ...p, isAlive: false, placement: this.calculatePlacement(players) } : p
    );
    const rankings = [...(gameState.rankings || []), userId];

    await update(gameStateRef, { 
      players: updatedPlayers,
      rankings
    });

    const alivePlayers = updatedPlayers.filter((p: PlayerGameState) => p.isAlive);
    if (alivePlayers.length === 1) {
      await this.endGame(roomId, { ...gameState, players: updatedPlayers });
    }
  }

  private calculatePlacement(players: PlayerGameState[]): number {
    return players.filter(p => !p.isAlive).length + 1;
  }

  private async endGame(roomId: string, gameState: any): Promise<void> {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    await update(roomRef, { status: 'finished' });

    await this.updateRatings(gameState.players);
  }

  private async updateRatings(players: PlayerGameState[]): Promise<void> {
    const sortedPlayers = [...players].sort((a, b) => {
      if (a.isAlive && !b.isAlive) return -1;
      if (!a.isAlive && b.isAlive) return 1;
      return (b.placement || 999) - (a.placement || 999);
    });

    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      if (player.userId.startsWith('ai_')) continue;

      let ratingChange = 0;
      const placement = i + 1;

      for (let j = 0; j < sortedPlayers.length; j++) {
        if (i === j) continue;
        const opponent = sortedPlayers[j];
        const expectedScore = 1 / (1 + Math.pow(10, (opponent.rating - player.rating) / 400));
        const actualScore = placement < (j + 1) ? 1 : 0;
        
        ratingChange += Math.round(32 * (actualScore - expectedScore));
      }

      const newRating = Math.max(0, player.rating + ratingChange);
      
      await databaseService.updateUserRating(player.userId, newRating);
    }
  }

  onRoomsUpdate(callback: (rooms: Room[]) => void): () => void {
    const roomsRef = ref(rtdb, 'rooms');
    const listener = onValue(roomsRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const rooms: Room[] = [];
      const now = Date.now();
      
      snapshot.forEach((child) => {
        const room = child.val() as Room;
        const roomAge = now - room.createdAt;
        
        // 만료되지 않은 대기 중인 방만 반환
        if (roomAge <= ROOM_EXPIRY_TIME && room.status === 'waiting') {
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
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      
      const room = snapshot.val() as Room;
      const roomAge = Date.now() - room.createdAt;
      
      // 방이 만료되었으면 null 반환
      if (roomAge > ROOM_EXPIRY_TIME) {
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
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const gameState = snapshot.val();
      const players = gameState.players || [];
      callback(Array.isArray(players) ? players : Object.values(players));
    });
    return () => off(gameStateRef, 'value', listener);
  }

  // ===========================================
  // TFT 스타일 PvP 대전 시스템
  // ===========================================

  /**
   * 게임 상태를 초기 PvP 모드로 설정 (startGame에서 호출됨)
   */
  private async initializePvPGameState(roomId: string, players: RoomPlayer[]): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    
    const initialState: MultiplayerGameState = {
      roomId,
      players: players.map(p => ({
        userId: p.userId,
        userName: p.userName,
        wave: 0,
        lives: 100,
        money: 500,
        towers: 0,
        isAlive: true,
        rating: p.rating,
        waveCompleted: false,
        battleRecord: { wins: 0, losses: 0 }
      })),
      startTime: Date.now(),
      rankings: [],
      currentRound: 0,
      currentPhase: 'waiting_wave',
      encounterRecord: {},
      battleResults: [],
      phaseEndTime: Date.now() + FIRST_WAVE_PREP_SECONDS * 1000
    };

    await set(gameStateRef, initialState);
  }

  /**
   * 현재 게임 페이즈 변경
   */
  async setGamePhase(roomId: string, phase: GamePhase): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const needsCountdown = phase === 'waiting_wave' || phase === 'waiting_battle';
    await update(gameStateRef, { 
      currentPhase: phase,
      phaseEndTime: needsCountdown ? Date.now() + PHASE_COUNTDOWN_SECONDS * 1000 : null
    });
  }

  /**
   * 카운트다운 업데이트
   */
  // updateCountdown 제거됨 - phaseEndTime을 사용하므로 불필요
  // 클라이언트에서 (phaseEndTime - Date.now()) / 1000으로 남은 시간 계산

  /**
   * 동기화된 웨이브 시작 (모든 플레이어 동시에)
   */
  async startSynchronizedWave(roomId: string): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    if (!snapshot.exists()) return;

    const gameState = snapshot.val() as MultiplayerGameState;
    const newRound = gameState.currentRound + 1;

    // 모든 플레이어의 waveCompleted 초기화
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
   * 플레이어 웨이브 완료 표시
   */
  async markWaveCompleted(roomId: string, userId: string): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    if (!snapshot.exists()) return;

    const gameState = snapshot.val() as MultiplayerGameState;
    const updatedPlayers = gameState.players.map((p: PlayerGameState) =>
      p.userId === userId ? { ...p, waveCompleted: true } : p
    );

    await update(gameStateRef, { players: updatedPlayers });

    // 모든 생존 플레이어가 완료했는지 확인
    const alivePlayers = updatedPlayers.filter((p: PlayerGameState) => p.isAlive);
    const allCompleted = alivePlayers.every((p: PlayerGameState) => p.waveCompleted);

    if (allCompleted) {
      // 3의 배수 웨이브에만 대전, 그 외에는 다음 웨이브 준비
      if (gameState.currentRound > 0 && gameState.currentRound % BATTLE_WAVE_INTERVAL === 0) {
        await this.setGamePhase(roomId, 'waiting_battle');
      } else {
        await this.setGamePhase(roomId, 'waiting_wave');
      }
    }
  }

  /**
   * PvP 대전 페이즈 시작 - 매칭 생성 및 저장
   */
  async startBattlePhase(roomId: string): Promise<RoundMatchup | null> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    if (!snapshot.exists()) return null;

    const gameState = snapshot.val() as MultiplayerGameState;
    const alivePlayers = gameState.players.filter((p: PlayerGameState) => p.isAlive);

    // 생존자가 1명 이하면 게임 종료
    if (alivePlayers.length <= 1) {
      return null;
    }

    // 매칭 생성
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
   * 대전 결과 저장 및 만남 기록 업데이트
   */
  async submitBattleResult(roomId: string, result: PvPBattleResult): Promise<void> {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    if (!snapshot.exists()) return;

    const gameState = snapshot.val() as MultiplayerGameState;
    
    // 만남 기록 업데이트
    const encounterRecord = pvpBattleService.updateEncounterRecord(
      gameState.encounterRecord || {},
      result.player1Id,
      result.player2Id
    );

    // 패배자 라이프 감소 및 승패 기록
    const loserId = result.winnerId === result.player1Id ? result.player2Id : result.player1Id;
    const updatedPlayers = gameState.players.map((p: PlayerGameState) => {
      if (p.userId === result.winnerId) {
        return {
          ...p,
          money: p.money + 50, // 승리 보너스
          battleRecord: {
            wins: (p.battleRecord?.wins ?? 0) + 1,
            losses: p.battleRecord?.losses ?? 0
          }
        };
      } else if (p.userId === loserId) {
        const newLives = p.lives - result.lifeLost;
        return {
          ...p,
          lives: newLives,
          isAlive: newLives > 0,
          battleRecord: {
            wins: p.battleRecord?.wins ?? 0,
            losses: (p.battleRecord?.losses ?? 0) + 1
          }
        };
      }
      return p;
    });

    // 대전 결과 저장
    const battleResults = [...(gameState.battleResults || []), result];

    await update(gameStateRef, {
      players: updatedPlayers,
      encounterRecord,
      battleResults
    });

    // 탈락자 처리
    const newlyEliminated = updatedPlayers.find(
      (p: PlayerGameState) => p.userId === loserId && !p.isAlive
    );
    if (newlyEliminated) {
      await this.playerDefeated(roomId, loserId);
    }
  }

  /**
   * 모든 대전 완료 확인
   */
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

  /**
   * 다음 라운드 대기 페이즈로 전환
   */
  async startWaitingWavePhase(roomId: string): Promise<void> {
    await this.setGamePhase(roomId, 'waiting_wave');
  }

  /**
   * 게임 상태 구독 (페이즈 정보 포함)
   */
  onGameStateUpdateWithPhase(roomId: string, callback: (state: MultiplayerGameState | null) => void): () => void {
    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const listener = onValue(gameStateRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback(snapshot.val() as MultiplayerGameState);
    });
    return () => off(gameStateRef, 'value', listener);
  }

  /**
   * 매칭 정보 구독
   */
  onMatchupUpdate(roomId: string, callback: (matchups: RoundMatchup | null) => void): () => void {
    const matchupRef = ref(rtdb, `gameStates/${roomId}/roundMatchups`);
    const listener = onValue(matchupRef, (snapshot) => {
      callback(snapshot.exists() ? snapshot.val() : null);
    });
    return () => off(matchupRef, 'value', listener);
  }

  getCurrentRoomId(): string | null {
    if (!this.currentRoomId) {
      this.currentRoomId = localStorage.getItem('currentRoomId');
    }
    return this.currentRoomId;
  }

  /**
   * 방의 남은 시간 (밀리초)
   */
  getRoomRemainingTime(room: Room): number {
    const roomAge = Date.now() - room.createdAt;
    return Math.max(0, ROOM_EXPIRY_TIME - roomAge);
  }

  /**
   * 방의 만료 여부
   */
  isRoomExpired(room: Room): boolean {
    const roomAge = Date.now() - room.createdAt;
    return roomAge > ROOM_EXPIRY_TIME;
  }
}

export const multiplayerService = new MultiplayerService();