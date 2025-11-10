// src/services/MultiplayerService.ts
import { ref, set, onValue, push, update, remove, get, off } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { Room, RoomPlayer, PlayerGameState, AIDifficulty, DebuffItem } from '../types/multiplayer';
import { authService } from './AuthService';
import { databaseService } from './DatabaseService';

const DEBUFF_ITEMS: DebuffItem[] = [
  { id: 'instant_kill', name: '즉사', description: '상대 포켓몬 1마리 즉사', cost: 300, effect: 'instant_kill' },
  { id: 'slow_attack', name: '공속 감소', description: '상대 모든 포켓몬 공속 50% 감소 (10초)', cost: 200, effect: 'slow_attack', value: 10 },
  { id: 'spawn_boss', name: '보스 투입', description: '상대 맵에 강력한 보스 투입', cost: 500, effect: 'spawn_boss' },
  { id: 'reduce_gold', name: '골드 강탈', description: '상대 골드 200 감소', cost: 150, effect: 'reduce_gold', value: 200 },
  { id: 'freeze_towers', name: '타워 동결', description: '상대 모든 포켓몬 5초간 공격 불가', cost: 250, effect: 'freeze_towers', value: 5 },
  { id: 'disable_shop', name: '상점 봉쇄', description: '상대 상점 15초간 사용 불가', cost: 180, effect: 'disable_shop', value: 15 }
];

class MultiplayerService {
  private currentRoomId: string | null = null;

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
    return roomId;
  }

  async joinRoom(roomId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const roomRef = ref(rtdb, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) throw new Error('Room not found');
    
    const room = snapshot.val() as Room;
    
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
      await remove(roomRef);
    } else {
      await update(roomRef, {
        players: updatedPlayers,
        hostId: room.hostId === user.uid ? updatedPlayers[0].userId : room.hostId,
        hostName: room.hostId === user.uid ? updatedPlayers[0].userName : room.hostName
      });
    }

    this.currentRoomId = null;
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
      const initialPlayers: PlayerGameState[] = room.players.map(p => ({
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
        players: initialPlayers,
        startTime: Date.now(),
        rankings: []
      });
    }, 3000);
  }

  async updatePlayerState(roomId: string, state: Partial<PlayerGameState>): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    
    if (!snapshot.exists()) return;

    const playerStateRef = ref(rtdb, `gameStates/${roomId}/players/${user.uid}`);
    await update(playerStateRef, state);
  }

  async applyDebuff(roomId: string, targetUserId: string, debuff: DebuffItem): Promise<void> {
    const debuffRef = ref(rtdb, `debuffs/${roomId}/${targetUserId}/${Date.now()}`);
    await set(debuffRef, {
      type: debuff.effect,
      value: debuff.value,
      timestamp: Date.now()
    });
  }

  async playerDefeated(roomId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const gameStateRef = ref(rtdb, `gameStates/${roomId}`);
    const snapshot = await get(gameStateRef);
    
    if (!snapshot.exists()) return;
    
    const gameState = snapshot.val();
    const updatedPlayers = gameState.players.map((p: PlayerGameState) =>
      p.userId === user.uid ? { ...p, isAlive: false, placement: this.calculatePlacement(gameState.players) } : p
    );

    const rankings = [...(gameState.rankings || []), user.uid];

    await update(gameStateRef, { 
      players: updatedPlayers,
      rankings
    });

    const alivePlayers = updatedPlayers.filter((p: PlayerGameState) => p.isAlive);
    if (alivePlayers.length === 1) {
      await this.endGame(roomId, gameState);
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
      snapshot.forEach((child) => {
        rooms.push(child.val() as Room);
      });
      
      callback(rooms.filter(r => r.status === 'waiting'));
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
      callback(snapshot.val() as Room);
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
      callback(gameState.players);
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
    return this.currentRoomId;
  }
}

export const multiplayerService = new MultiplayerService();
