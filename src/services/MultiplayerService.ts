// src/services/MultiplayerService.ts
import { ref, set, onValue, push, update, remove, get, off } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { Room, RoomPlayer, PlayerGameState, AIDifficulty, DebuffItem, TowerDetail } from '../types/multiplayer';
import { authService } from './AuthService';
import { databaseService } from './DatabaseService';

const DEBUFF_ITEMS: DebuffItem[] = [
  { id: 'instant_kill', name: '즉사', description: '상대 포켓몬 1마리 즉사', cost: 300, effect: 'instant_kill' },
  { id: 'slow_attack', name: '공속 감소', description: '상대 모든 포켓몬 공속 50% 감소 (10초)', cost: 200, effect: 'slow_attack', value: 10 },
  { id: 'spawn_boss', name: '보스 투입', description: '상대 맵에 강력한 보스 투입', cost: 500, effect: 'spawn_boss' },
  { id: 'freeze_towers', name: '타워 동결', description: '상대 모든 포켓몬 5초간 공격 불가', cost: 250, effect: 'freeze_towers', value: 5 },
  { id: 'disable_shop', name: '상점 봉쇄', description: '상대 상점 15초간 사용 불가', cost: 180, effect: 'disable_shop', value: 15 }
];

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

      // 디버프 정보 삭제
      const debuffsRef = ref(rtdb, `debuffs/${roomId}`);
      await remove(debuffsRef);

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
      maxPlayers: 4,
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
      
      const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
      const playersArray: PlayerGameState[] = room.players.map(p => ({
        userId: p.userId,
        userName: p.userName,
        wave: 0,
        lives: 50,
        money: 500,
        towers: 0,
        isAlive: true,
        rating: p.rating
      }));

      await set(gameStateRef, {
        roomId,
        players: playersArray,
        startTime: Date.now(),
        rankings: []
      });
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
    const towerDetailsRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
    await set(towerDetailsRef, {
      towers: towerDetails,
      lastUpdate: Date.now()
    });
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
    const listener = onValue(towerDetailsRef, (snapshot) => {
      const allTowers = new Map<string, TowerDetail[]>();
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const userId = child.key!;
          const data = child.val();
          if (data.towers) {
            allTowers.set(userId, data.towers);
          }
        });
      }
      callback(allTowers);
    });
    return () => off(towerDetailsRef, 'value', listener);
  }

  async applyDebuff(roomId: string, targetUserId: string, debuff: DebuffItem): Promise<void> {
    const debuffRef = ref(rtdb, `debuffs/${roomId}/${targetUserId}/${Date.now()}`);
    await set(debuffRef, {
      type: debuff.effect,
      value: debuff.value,
      timestamp: Date.now()
    });
  }

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

  onDebuffReceived(roomId: string, callback: (debuff: any) => void): () => void {
    const user = authService.getCurrentUser();
    if (!user) return () => {};

    const debuffRef = ref(rtdb, `debuffs/${roomId}/${user.uid}`);
    const listener = onValue(debuffRef, (snapshot) => {
      if (!snapshot.exists()) return;
      
      snapshot.forEach((child) => {
        const debuff = child.val();
        callback(debuff);
        remove(child.ref);
      });
    });
    return () => off(debuffRef, 'value', listener);
  }

  getDebuffItems(): DebuffItem[] {
    return DEBUFF_ITEMS;
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