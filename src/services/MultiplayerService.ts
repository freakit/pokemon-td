// src/services/MultiplayerService.ts
// ──────────────────────────────────────────────────────────────────
// V5 대규모 개편 — 멀티플레이 동기화 정확성 확보
//
// [V5-FIX-MS-1] deleteRoom이 모든 관련 경로를 재귀 삭제 (이미 대부분 있었으나 battleResults 누락 가능성 점검)
// [V5-FIX-MS-2] cleanupExpiredRooms 에 고아(orphan) gameStates/towerDetails 정리 추가
// [V5-FIX-MS-3] cleanupGame(roomId): 게임 종료 직후 즉시 정리용 public 메서드
// [V5-FIX-MS-4] leaveRoom: 호스트 이전 시 비AI 플레이어 우선 선택 (AI가 호스트 되는 상황 방지)
// [V5-FIX-MS-5] submitBattleResult 내 _pendingElimination 경로 제거
// [V5-FIX-MS-6] startBattlePhase: lastSkipPlayerId 결정론 전달
// [V5-FIX-MS-7] updatePlayerTowerDetails 에 tftPlacements 보존 (set 대신 항상 update)
// [V5-FIX-MS-8] updatePlayerState의 이중 경로 차단 (V6에서 money/lives 다시 허용됨)
// [V5-FIX-MS-9] 서버 시간 동기는 firebase.ts의 전역 serverNow() 사용
// [V5-FIX-MS-10] onGameStateUpdateWithPhase 구독에서 players의 배열/객체 정규화
// [V5-FIX-MS-11] finalizeGame이 끝나면 1분 유예 후 cleanupGame 호출
// [V5-FIX-MS-12] submitTFTPlacements: 플레이어 UID 검증 추가
// [V5-FIX-MS-13] markWaveCompleted: 이미 완료된 플레이어는 재호출 금지
//
// ── V7: 사람 매치 완주 보장 + Deadlock 방지 ──
// [V7-FIX-MS-14] leaveRoom: 사람 0명 시 방 자동 삭제 (AI-only deadlock 방지)
// [V7-FIX-MS-15] forcePushTowerDetailsFull 공식 API 추가
//   - AIPlayer가 fbSet을 직접 호출하던 것을 일원화
//   - throttle 무시 즉시 업로드 + tftPlacements 보존

import {
  ref, set, onValue, push, update, remove, get, off,
  runTransaction,
} from 'firebase/database';
import { rtdb, serverNow, getServerTimeOffset, registerPresence } from '../config/firebase';
import {
  Room, RoomPlayer, PlayerGameState, AIDifficulty, TowerDetail,
  GamePhase, MultiplayerGameState, RoundMatchup, PvPBattleResult,
} from '../types/multiplayer';
import { pvpBattleService } from './PvPBattleService';
import { authService } from './AuthService';
import { databaseService } from './DatabaseService';
import { achievementService } from './AchievementService';

const PHASE_COUNTDOWN_SECONDS = 10;
const FIRST_WAVE_PREP_SECONDS = 60;
const BATTLE_WAVE_INTERVAL = 3;

const ROOM_EXPIRY_TIME = 3 * 60 * 60 * 1000;       // 3시간
const FINISHED_GAME_TTL = 5 * 60 * 1000;           // [V5] 종료된 게임 정리까지 5분 대기
const CLEANUP_INTERVAL = 10 * 60 * 1000;           // 10분 간격

// [V6-FIX] 클라이언트가 업로드 가능한 필드 — money/lives 복원
//   배틀 보상 및 탈락 처리는 여전히 서버 트랜잭션이 수행하지만,
//   일반 구매/판매는 클라이언트가 로컬에서 즉시 반영하고 Firebase에 푸시.
//   레이스 컨디션 방지는 GameLayout의 "로컬 낙관적 갱신 플래그"가 담당.
const CLIENT_WRITABLE_PLAYER_FIELDS: Array<keyof PlayerGameState> = [
  'wave', 'towers', 'waveCompleted',
  'money', 'lives', 'isAlive',
];

class MultiplayerService {
  private currentRoomId: string | null = null;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
  private presenceCleanup: (() => void) | null = null;

  constructor() {
    this.startAutoCleanup();
  }

  // [V5-FIX-MS-9] 서버 시간은 firebase.ts 전역 값을 사용
  private now(): number { return serverNow(); }
  getServerTimeOffset(): number { return getServerTimeOffset(); }

  // ─── 자동 정리 ─────────────────────────────────────────────────
  private startAutoCleanup(): void {
    if (this.cleanupIntervalId) clearInterval(this.cleanupIntervalId);
    this.cleanupExpiredRooms().catch(e => console.warn('[MS] initial cleanup failed:', e));
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredRooms().catch(e => console.warn('[MS] periodic cleanup failed:', e));
    }, CLEANUP_INTERVAL);
  }

  /**
   * [V5-FIX-MS-2] 만료 방 + 고아 경로(gameStates/towerDetails) + 종료된 방 정리
   */
  private async cleanupExpiredRooms(): Promise<void> {
    try {
      const now = Date.now();
      const roomsSnap = await get(ref(rtdb, 'rooms'));
      const existingRoomIds = new Set<string>();
      const roomsToDelete: string[] = [];

      if (roomsSnap.exists()) {
        roomsSnap.forEach((child) => {
          const room = child.val() as Room & { finishedAt?: number };
          existingRoomIds.add(room.id);
          if (now - room.createdAt > ROOM_EXPIRY_TIME) {
            roomsToDelete.push(room.id);
          } else if (room.status === 'finished' && room.finishedAt
            && now - room.finishedAt > FINISHED_GAME_TTL) {
            roomsToDelete.push(room.id);
          }
        });
      }

      for (const roomId of roomsToDelete) await this.deleteRoom(roomId);

      // [V5-FIX-MS-2] 고아 gameStates 정리
      const gsSnap = await get(ref(rtdb, 'gameStates'));
      if (gsSnap.exists()) {
        const orphans: string[] = [];
        gsSnap.forEach((child) => {
          if (!existingRoomIds.has(child.key!) && !roomsToDelete.includes(child.key!)) {
            orphans.push(child.key!);
          }
        });
        for (const id of orphans) {
          await remove(ref(rtdb, `gameStates/${id}`)).catch(() => {});
          console.log(`[MS] Cleaned orphan gameStates/${id}`);
        }
      }

      // 고아 towerDetails 정리
      const tdSnap = await get(ref(rtdb, 'towerDetails'));
      if (tdSnap.exists()) {
        const orphans: string[] = [];
        tdSnap.forEach((child) => {
          if (!existingRoomIds.has(child.key!) && !roomsToDelete.includes(child.key!)) {
            orphans.push(child.key!);
          }
        });
        for (const id of orphans) {
          await remove(ref(rtdb, `towerDetails/${id}`)).catch(() => {});
          console.log(`[MS] Cleaned orphan towerDetails/${id}`);
        }
      }

      // 고아 battleResults 정리 (혹시 남아있다면)
      const brSnap = await get(ref(rtdb, 'battleResults'));
      if (brSnap.exists()) {
        const orphans: string[] = [];
        brSnap.forEach((child) => {
          if (!existingRoomIds.has(child.key!)) orphans.push(child.key!);
        });
        for (const id of orphans) {
          await remove(ref(rtdb, `battleResults/${id}`)).catch(() => {});
        }
      }
    } catch (error: any) {
      if (error?.message?.includes('Permission denied')) return;
      console.error('Failed to cleanup expired rooms:', error);
    }
  }

  /**
   * [V5-FIX-MS-1] 방과 모든 관련 데이터 완전 삭제
   */
  private async deleteRoom(roomId: string): Promise<void> {
    try {
      await Promise.allSettled([
        remove(ref(rtdb, `rooms/${roomId}`)),
        remove(ref(rtdb, `gameStates/${roomId}`)),
        remove(ref(rtdb, `towerDetails/${roomId}`)),
        remove(ref(rtdb, `battleResults/${roomId}`)),
        remove(ref(rtdb, `debuffs/${roomId}`)),
        remove(ref(rtdb, `presence/${roomId}`)),
      ]);
      console.log(`[MS] Deleted room and all related data: ${roomId}`);
    } catch (error) {
      console.error(`Failed to delete room ${roomId}:`, error);
    }
  }

  /**
   * [V5-FIX-MS-3] 게임 종료 직후 호출. 랭킹 확정 후 수 분 뒤 실제 삭제.
   */
  async cleanupGame(roomId: string, immediate = false): Promise<void> {
    if (immediate) {
      await this.deleteRoom(roomId);
      return;
    }
    // 방 상태만 finished로 표기 → cleanupExpiredRooms가 5분 후 실삭제
    try {
      await update(ref(rtdb, `rooms/${roomId}`), {
        status: 'finished',
        finishedAt: Date.now(),
      });
    } catch (err) {
      console.warn('[MS] cleanupGame mark finished failed:', err);
    }
  }

  public stopAutoCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  // ─── 방 CRUD ────────────────────────────────────────────────────
  async createRoom(mapId: string, mapName: string): Promise<string> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const newRoomRef = push(ref(rtdb, 'rooms'));
    const roomId = newRoomRef.key!;
    const room: Room = {
      id: roomId,
      name: `${user.displayName}의 방`,
      mapId, mapName,
      hostId: user.uid,
      hostName: user.displayName,
      players: [{
        userId: user.uid,
        userName: user.displayName,
        isReady: true, isAI: false,
        rating: user.rating,
      }],
      maxPlayers: 8,
      status: 'waiting',
      createdAt: Date.now(),
    };
    await set(newRoomRef, room);
    this.setCurrentRoom(roomId);
    return roomId;
  }

  async joinRoom(roomId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const roomRef = ref(rtdb, `rooms/${roomId}`);

    // 트랜잭션으로 동시 참가 레이스 방지
    let joinError: Error | null = null;
    await runTransaction(roomRef, (room: Room | null) => {
      if (!room) { joinError = new Error('Room not found'); return room; }
      if (Date.now() - room.createdAt > ROOM_EXPIRY_TIME) {
        joinError = new Error('Room has expired'); return room;
      }
      const isAlreadyPlayer = room.players.some(p => p.userId === user.uid);
      if (isAlreadyPlayer) return room; // 멱등
      if (room.players.length >= room.maxPlayers) {
        joinError = new Error('Room is full'); return room;
      }
      if (room.status !== 'waiting') {
        joinError = new Error('Game already started'); return room;
      }
      const newPlayer: RoomPlayer = {
        userId: user.uid, userName: user.displayName,
        isReady: false, isAI: false, rating: user.rating,
      };
      return { ...room, players: [...room.players, newPlayer] };
    });
    if (joinError) throw joinError;
    this.setCurrentRoom(roomId);
  }

  async rejoinRoom(roomId: string): Promise<{ room: Room; canRejoin: boolean }> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const snapshot = await get(ref(rtdb, `rooms/${roomId}`));
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
    this.setCurrentRoom(roomId);
    return { room, canRejoin: true };
  }

  /**
   * [V5-FIX-MS-4] leaveRoom — 호스트 이전 시 비AI 플레이어 우선 선택
   * [V7-FIX-MS-14] 사람이 한 명도 안 남으면 방 자동 삭제 (AI-only deadlock 방지)
   */
  async leaveRoom(roomId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const roomRef = ref(rtdb, `rooms/${roomId}`);

    let shouldDelete = false;
    await runTransaction(roomRef, (room: Room | null) => {
      if (!room) return room;
      const updatedPlayers = room.players.filter(p => p.userId !== user.uid);
      if (updatedPlayers.length === 0) {
        shouldDelete = true;
        return room;
      }

      // [V7-FIX-MS-14] 사람 0명이면 방 삭제
      const humanRemaining = updatedPlayers.filter(p => !p.isAI);
      if (humanRemaining.length === 0) {
        console.log('[MS] No humans left in room; marking for deletion');
        shouldDelete = true;
        return room;
      }

      let newHostId = room.hostId;
      let newHostName = room.hostName;
      if (room.hostId === user.uid) {
        // [V5-FIX-MS-4] 비AI 플레이어 우선 승격
        const nextHost = humanRemaining[0];
        newHostId = nextHost.userId;
        newHostName = nextHost.userName;
      }
      return { ...room, players: updatedPlayers, hostId: newHostId, hostName: newHostName };
    });

    if (shouldDelete) {
      await this.deleteRoom(roomId);
    } else {
      // gameStates 에서 isAlive=false 표시
      const gsRef = ref(rtdb, `gameStates/${roomId}`);
      await runTransaction(gsRef, (gs: MultiplayerGameState | null) => {
        if (!gs) return gs;
        const updatedPlayers = gs.players.map(p =>
          p.userId === user.uid ? { ...p, isAlive: false } : p
        );
        return { ...gs, players: updatedPlayers };
      });
    }

    this.clearCurrentRoom();
  }

  async addAI(roomId: string, difficulty: AIDifficulty): Promise<void> {
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    let err: Error | null = null;
    await runTransaction(roomRef, (room: Room | null) => {
      if (!room) { err = new Error('Room not found'); return room; }
      if (room.players.length >= room.maxPlayers) {
        err = new Error('Room is full'); return room;
      }
      const aiId = `ai_${difficulty}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      const aiPlayer: RoomPlayer = {
        userId: aiId,
        userName: `AI (${difficulty})`,
        isReady: true, isAI: true,
        aiDifficulty: difficulty,
        rating: difficulty === 'easy' ? 800 : difficulty === 'normal' ? 1000 : 1200,
      };
      return { ...room, players: [...room.players, aiPlayer] };
    });
    if (err) throw err;
  }

  async toggleReady(roomId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    const roomRef = ref(rtdb, `rooms/${roomId}`);
    await runTransaction(roomRef, (room: Room | null) => {
      if (!room) return room;
      const updatedPlayers = room.players.map(p =>
        p.userId === user.uid ? { ...p, isReady: !p.isReady } : p
      );
      return { ...room, players: updatedPlayers };
    });
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
    setTimeout(async () => {
      await update(roomRef, { status: 'playing' }).catch(() => {});
    }, 3000);
  }

  private async initializePvPGameState(roomId: string, players: RoomPlayer[]): Promise<void> {
    const loadingReady: Record<string, boolean> = {};
    for (const p of players) loadingReady[p.userId] = p.isAI; // AI는 즉시 loaded
    const initialState: MultiplayerGameState = {
      roomId,
      players: players.map(p => ({
        userId: p.userId, userName: p.userName,
        wave: 0, lives: 50, money: 500, towers: 0,
        isAlive: true, rating: p.rating,
        waveCompleted: false,
        battleRecord: { wins: 0, losses: 0 },
      })),
      startTime: this.now(),
      rankings: [],
      currentRound: 0,
      currentPhase: 'loading',
      encounterRecord: {},
      battleResults: [],
      phaseEndTime: null,
      loadingReady,
    };
    await set(ref(rtdb, `gameStates/${roomId}`), initialState);
  }

  async markPlayerLoaded(roomId: string, userId: string): Promise<boolean> {
    const gsRef = ref(rtdb, `gameStates/${roomId}`);
    let updated = false;
    await runTransaction(gsRef, (gs: MultiplayerGameState | null) => {
      if (!gs) return gs;
      const loadingReady = { ...((gs as any).loadingReady || {}) };
      if (loadingReady[userId]) { updated = true; return gs; }
      loadingReady[userId] = true;
      updated = true;
      const allLoaded = gs.players.every(p => loadingReady[p.userId] === true);
      if (allLoaded) {
        return {
          ...gs,
          loadingReady,
          currentPhase: 'waiting_wave' as GamePhase,
          phaseEndTime: this.now() + FIRST_WAVE_PREP_SECONDS * 1000,
        };
      }
      return { ...gs, loadingReady };
    });
    return updated;
  }

  async setGamePhase(roomId: string, phase: GamePhase): Promise<void> {
    const gsRef = ref(rtdb, `gameStates/${roomId}`);
    const needsCountdown = phase === 'waiting_wave' || phase === 'waiting_battle';
    await update(gsRef, {
      currentPhase: phase,
      phaseEndTime: needsCountdown ? this.now() + PHASE_COUNTDOWN_SECONDS * 1000 : null,
    });
  }

  async startSynchronizedWave(roomId: string): Promise<void> {
    const gsRef = ref(rtdb, `gameStates/${roomId}`);
    await runTransaction(gsRef, (gs: MultiplayerGameState | null) => {
      if (!gs) return gs;
      if (gs.currentPhase === 'wave') return gs;
      if (gs.currentPhase !== 'waiting_wave') return gs;
      const newRound = gs.currentRound + 1;
      const updatedPlayers = gs.players.map(p => ({
        ...p,
        wave: p.isAlive ? newRound : p.wave,
        waveCompleted: false,
      }));
      return {
        ...gs,
        currentRound: newRound,
        currentPhase: 'wave' as GamePhase,
        players: updatedPlayers,
        phaseEndTime: null,
      };
    });
  }

  /**
   * [V5-FIX-MS-13] 멱등성 보장: 이미 완료된 플레이어는 재호출해도 변경 없음
   */
  async markWaveCompleted(roomId: string, userId: string): Promise<void> {
    const gsRef = ref(rtdb, `gameStates/${roomId}`);
    let shouldTransition = false;
    let transitionPhase: GamePhase = 'waiting_wave';
    let currentRound = 0;

    await runTransaction(gsRef, (gs: MultiplayerGameState | null) => {
      if (!gs) return gs;
      if (gs.currentPhase !== 'wave') return gs;
      const target = gs.players.find(p => p.userId === userId);
      if (!target) return gs;
      // [V5-FIX-MS-13] 이미 완료 → no-op
      if (target.waveCompleted) return gs;

      const updatedPlayers = gs.players.map(p =>
        p.userId === userId ? { ...p, waveCompleted: true } : p
      );
      const alivePlayers = updatedPlayers.filter(p => p.isAlive);
      const allCompleted = alivePlayers.length > 0 && alivePlayers.every(p => p.waveCompleted);
      currentRound = gs.currentRound;
      if (allCompleted) {
        shouldTransition = true;
        transitionPhase =
          gs.currentRound > 0 && gs.currentRound % BATTLE_WAVE_INTERVAL === 0
            ? 'waiting_battle'
            : 'waiting_wave';
        return {
          ...gs,
          players: updatedPlayers,
          currentPhase: transitionPhase,
          phaseEndTime: this.now() + PHASE_COUNTDOWN_SECONDS * 1000,
        };
      }
      return { ...gs, players: updatedPlayers };
    });

    if (shouldTransition) {
      console.log(`[MS] All completed wave ${currentRound} → ${transitionPhase}`);
    }
  }

  /**
   * [V5-FIX-MS-8] 클라이언트가 업로드 가능한 필드만 허용.
   * money/lives/isAlive 는 서버 트랜잭션만 수정할 수 있음.
   */
  async updatePlayerState(
    roomId: string,
    userId: string,
    state: Partial<PlayerGameState>
  ): Promise<void> {
    // 화이트리스트 필터링
    const filtered: Partial<PlayerGameState> = {};
    for (const key of CLIENT_WRITABLE_PLAYER_FIELDS) {
      if (state[key] !== undefined) (filtered as any)[key] = state[key];
    }
    if (Object.keys(filtered).length === 0) return;

    const gsRef = ref(rtdb, `gameStates/${roomId}`);
    await runTransaction(gsRef, (gs: MultiplayerGameState | null) => {
      if (!gs) return gs;
      const updatedPlayers = (gs.players || []).map(p =>
        p.userId === userId ? { ...p, ...filtered } : p
      );
      return { ...gs, players: updatedPlayers };
    });
  }

  // ─── 타워 상세 업로드 ──────────────────────────────────────────
  private lastTowerUpdate: Map<string, number> = new Map();
  private towerUpdateThrottle = 500;
  private towerUpdateTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /**
   * [V5-FIX-MS-7] update() 를 써서 tftPlacements 같은 sibling 필드 보존
   */
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
      const tRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
      await update(tRef, {
        towers: this.normalizeTowerDetails(towerDetails),
        updatedAt: this.now(),
      });
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
   * [V5] 배틀 결정론을 위한 타워 데이터 정규화
   *   - currentCooldown 등 런타임 필드 제거
   *   - equippedMoves를 name 기준 사전순 정렬 (Firebase key 순서 의존 제거)
   *   - undefined 제거
   */
  private normalizeTowerDetails(towerDetails: TowerDetail[]): TowerDetail[] {
    return (towerDetails || []).map(td => {
      const moves = Array.isArray(td.equippedMoves) ? td.equippedMoves : [];
      const sortedMoves = moves.slice().sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      ).map((m: any) => {
        // currentCooldown 등 런타임 상태 제거
        const { currentCooldown, ...rest } = m;
        return rest;
      });
      return {
        pokemonId: td.pokemonId,
        name: td.name,
        level: td.level,
        sprite: td.sprite,
        position: td.position,
        currentHp: td.currentHp,
        maxHp: td.maxHp,
        isFainted: !!td.isFainted,
        attack: td.attack ?? 0,
        defense: td.defense ?? 0,
        specialAttack: td.specialAttack ?? 0,
        specialDefense: td.specialDefense ?? 0,
        speed: td.speed ?? 0,
        types: Array.isArray(td.types) ? td.types.slice() : [],
        equippedMoves: sortedMoves,
        lifesteal: td.lifesteal ?? 0,
        aoeBonus: td.aoeBonus ?? 0,
      };
    });
  }

  async flushTowerUpdate(
    roomId: string,
    userId: string,
    towerDetails: TowerDetail[]
  ): Promise<void> {
    if (this.towerUpdateTimeouts.has(userId)) {
      clearTimeout(this.towerUpdateTimeouts.get(userId)!);
      this.towerUpdateTimeouts.delete(userId);
    }
    const tRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
    await update(tRef, {
      towers: this.normalizeTowerDetails(towerDetails),
      updatedAt: this.now(),
    });
    this.lastTowerUpdate.set(userId, Date.now());
    console.log(`[MS] flushTowerUpdate: ${towerDetails.length} towers for ${userId}`);
  }

  /**
   * [V7-FIX-MS-15] throttle 무시 즉시 업로드 (AIPlayer.forcePushTowerDetails 대체)
   *   AIPlayer가 fbSet을 직접 호출하던 것을 공식 API로 일원화.
   *   - set이 아닌 update 사용 → tftPlacements 등 sibling 필드 보존
   *   - normalizeTowerDetails() 경유 → 결정론 정렬 + 런타임 필드 제거
   *   - 향후 Firebase Security Rules가 강화돼도 이 경로 하나만 점검하면 됨.
   */
  async forcePushTowerDetailsFull(
    roomId: string,
    userId: string,
    towerDetails: TowerDetail[]
  ): Promise<void> {
    if (this.towerUpdateTimeouts.has(userId)) {
      clearTimeout(this.towerUpdateTimeouts.get(userId)!);
      this.towerUpdateTimeouts.delete(userId);
    }
    const tRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
    await update(tRef, {
      towers: this.normalizeTowerDetails(towerDetails),
      updatedAt: this.now(),
    });
    this.lastTowerUpdate.set(userId, Date.now());
  }

  /**
   * [V5-FIX-MS-12] 본인 UID 만 배치 업로드 가능
   */
  async submitTFTPlacements(
    roomId: string,
    userId: string,
    placements: { id: string; x: number; y: number }[]
  ): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user || user.uid !== userId) {
      // AI의 경우 userId가 ai_로 시작 — 호스트 권한으로 허용
      if (!userId.startsWith('ai_')) {
        throw new Error('Cannot submit placements for another player');
      }
    }
    const tRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
    await update(tRef, { tftPlacements: placements });
  }

  onAllTFTPlacementsUpdate(
    roomId: string,
    callback: (placements: Map<string, { id: string; x: number; y: number }[]>) => void
  ): () => void {
    const tRef = ref(rtdb, `towerDetails/${roomId}`);
    const listener = onValue(tRef, (snapshot) => {
      const combined = new Map<string, { id: string; x: number; y: number }[]>();
      if (!snapshot.exists()) { callback(combined); return; }
      const data = snapshot.val();
      Object.keys(data).forEach((userId) => {
        if (data[userId] && Array.isArray(data[userId].tftPlacements)) {
          combined.set(userId, data[userId].tftPlacements);
        } else {
          combined.set(userId, []);
        }
      });
      callback(combined);
    });
    return () => off(tRef, 'value', listener);
  }

  async playerDefeated(roomId: string, userId: string): Promise<void> {
    const gsRef = ref(rtdb, `gameStates/${roomId}`);
    let placementRank = 0;
    await runTransaction(gsRef, (gs: MultiplayerGameState | null) => {
      if (!gs) return gs;
      const target = gs.players.find(p => p.userId === userId);
      if (!target || !target.isAlive) return gs;
      const aliveCount = gs.players.filter(p => p.isAlive).length;
      placementRank = aliveCount;
      const rankings = [...(gs.rankings || []), userId];
      const updatedPlayers = gs.players.map(p =>
        p.userId === userId
          ? { ...p, isAlive: false, placement: placementRank }
          : p
      );
      return { ...gs, players: updatedPlayers, rankings };
    });
    console.log(`[MS] Player ${userId} defeated at rank ${placementRank}`);
  }

  /**
   * [V5-FIX-MS-6] startBattlePhase — lastSkipPlayerId 결정론 전달
   */
  async startBattlePhase(roomId: string): Promise<RoundMatchup | null> {
    const gsRef = ref(rtdb, `gameStates/${roomId}`);
    let resultMatchup: RoundMatchup | null = null;

    await runTransaction(gsRef, (gs: MultiplayerGameState | null) => {
      if (!gs) return gs;
      if (gs.currentPhase === 'battle') return gs;
      if (gs.currentPhase !== 'waiting_battle') return gs;

      const alivePlayers = gs.players.filter(p => p.isAlive);
      if (alivePlayers.length <= 1) return gs;

      const lastSkipPlayerId = gs.roundMatchups?.skipPlayerId ?? null;
      const matchups = pvpBattleService.generateMatchups(
        alivePlayers,
        gs.encounterRecord || {},
        gs.currentRound,
        lastSkipPlayerId,
      );
      resultMatchup = matchups;

      // [V6-FIX] Bye 보너스는 클라이언트가 자체 반영 (skipPlayerId 필드로 감지)
      // 서버는 matchups만 기록

      return {
        ...gs,
        currentPhase: 'battle' as GamePhase,
        roundMatchups: matchups,
        phaseEndTime: null,
      };
    });

    return resultMatchup;
  }

  private calcBattleRewards(
    player: PlayerGameState,
    isWinner: boolean,
    myRemaining: number,
    oppRemaining: number
  ): { goldDelta: number; livesDelta: number } {
    if (isWinner) {
      let gold = 80;
      const winStreak = (player.battleRecord?.wins ?? 0) + 1;
      if (winStreak >= 4) gold += 80;
      else if (winStreak >= 3) gold += 50;
      else if (winStreak >= 2) gold += 30;
      if (myRemaining >= 3) gold += 50;
      return { goldDelta: gold, livesDelta: 0 };
    } else {
      const livesLost = 2 + oppRemaining;
      let consolation = 0;
      const loseStreak = (player.battleRecord?.losses ?? 0) + 1;
      if (loseStreak >= 4) consolation = 80;
      else if (loseStreak >= 3) consolation = 50;
      else if (loseStreak >= 2) consolation = 30;
      if (player.lives <= 10) consolation += 40;
      else if (player.lives <= 20) consolation += 20;
      return { goldDelta: consolation, livesDelta: -livesLost };
    }
  }

  /**
   * [V6-FIX] submitBattleResult — 서버 트랜잭션은 보상(rewardP1/P2)과
   * battleRecord, 중복 제출 방지만 담당. money/lives 실제 적용은 클라이언트가
   * 자체 Firebase 구독을 보고 수행 (로컬 권위).
   *
   * 탈락 처리: 클라이언트가 보상 적용 후 lives <= 0 이면 playerDefeated() 호출.
   * 여기서는 트랜잭션으로 중복만 차단.
   */
  async submitBattleResult(roomId: string, result: PvPBattleResult): Promise<void> {
    const gsRef = ref(rtdb, `gameStates/${roomId}`);

    const { committed } = await runTransaction(gsRef, (gs: MultiplayerGameState | null) => {
      if (!gs) return gs;
      const existing = (gs.battleResults || []).find(
        r => r.roundNumber === result.roundNumber
          && ((r.player1Id === result.player1Id && r.player2Id === result.player2Id)
            || (r.player1Id === result.player2Id && r.player2Id === result.player1Id))
      );
      if (existing) return gs; // 중복 제출 무시

      const loserId = result.winnerId === result.player1Id ? result.player2Id : result.player1Id;
      const encounterRecord = pvpBattleService.updateEncounterRecord(
        gs.encounterRecord || {},
        result.player1Id, result.player2Id,
      );
      const winnerRemaining = result.winnerId === result.player1Id
        ? result.player1RemainingPokemon : result.player2RemainingPokemon;
      const loserRemaining = result.winnerId === result.player1Id
        ? result.player2RemainingPokemon : result.player1RemainingPokemon;

      let rewardP1: { gold: number; lives: number } | undefined;
      let rewardP2: { gold: number; lives: number } | undefined;

      // [V6-FIX] money/lives 는 변경하지 않고 battleRecord 만 갱신
      const updatedPlayers = gs.players.map(p => {
        const isWinner = p.userId === result.winnerId;
        const isLoser = p.userId === loserId;
        if (!isWinner && !isLoser) return p;
        const { goldDelta, livesDelta } = this.calcBattleRewards(
          p, isWinner,
          isWinner ? winnerRemaining : loserRemaining,
          isWinner ? loserRemaining : winnerRemaining,
        );
        if (p.userId === result.player1Id) rewardP1 = { gold: goldDelta, lives: livesDelta };
        if (p.userId === result.player2Id) rewardP2 = { gold: goldDelta, lives: livesDelta };
        return {
          ...p,
          // money/lives/isAlive 는 그대로 유지 (클라이언트가 자체 반영)
          battleRecord: {
            wins: isWinner ? (p.battleRecord?.wins ?? 0) + 1 : (p.battleRecord?.wins ?? 0),
            losses: isLoser ? (p.battleRecord?.losses ?? 0) + 1 : (p.battleRecord?.losses ?? 0),
          },
        };
      });

      const battleResults = [...(gs.battleResults || []), { ...result, rewardP1, rewardP2 }];
      return {
        ...gs,
        players: updatedPlayers,
        encounterRecord,
        battleResults,
      };
    });

    if (committed) {
      const currentUser = authService.getCurrentUser();
      if (currentUser && result.winnerId === currentUser.uid) {
        achievementService.onMultiWin(currentUser.rating ?? 1000);
      }
    }
  }

  async checkAllBattlesComplete(roomId: string): Promise<boolean> {
    const snap = await get(ref(rtdb, `gameStates/${roomId}`));
    if (!snap.exists()) return false;
    const gs = snap.val() as MultiplayerGameState;
    if (!gs.roundMatchups) return true;
    const current = (gs.battleResults || []).filter(r => r.roundNumber === gs.currentRound);
    return current.length >= gs.roundMatchups.matches.length;
  }

  async startWaitingWavePhase(roomId: string): Promise<void> {
    const gsRef = ref(rtdb, `gameStates/${roomId}`);
    await runTransaction(gsRef, (gs: MultiplayerGameState | null) => {
      if (!gs) return gs;
      if (gs.currentPhase === 'waiting_wave') return gs;
      if (gs.currentPhase !== 'battle') return gs;
      const currentRound = gs.currentRound;
      const recentResults = (gs.battleResults || []).filter(
        r => r.roundNumber >= currentRound - 2
      );
      return {
        ...gs,
        currentPhase: 'waiting_wave' as GamePhase,
        phaseEndTime: this.now() + PHASE_COUNTDOWN_SECONDS * 1000,
        battleResults: recentResults,
      };
    });

    // [V5] 배틀 종료 → tftPlacements 정리 (다음 라운드 혼동 방지)
    try {
      const tdRef = ref(rtdb, `towerDetails/${roomId}`);
      const snap = await get(tdRef);
      if (snap.exists()) {
        const updates: Record<string, any> = {};
        snap.forEach((child) => {
          const userId = child.key!;
          updates[`${userId}/tftPlacements`] = null;
        });
        if (Object.keys(updates).length > 0) {
          await update(tdRef, updates);
        }
      }
    } catch (err) {
      console.warn('[MS] tftPlacements cleanup failed:', err);
    }
  }

  async finalizeGame(roomId: string): Promise<void> {
    const snap = await get(ref(rtdb, `gameStates/${roomId}`));
    if (!snap.exists()) return;
    const gs = snap.val() as MultiplayerGameState;
    await this.updateRatings(gs);
    // [V5-FIX-MS-11] 랭킹 업데이트 후 방 상태를 finished로 표기
    await this.cleanupGame(roomId, false).catch(() => {});
  }

  private async updateRatings(gs: MultiplayerGameState): Promise<void> {
    const players = gs.players;
    const currentUser = authService.getCurrentUser();
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (player.userId.startsWith('ai_')) continue; // AI는 레이팅 저장 안 함
      let ratingChange = 0;
      for (let j = 0; j < players.length; j++) {
        if (i === j) continue;
        const opponent = players[j];
        const expectedScore = 1 / (1 + Math.pow(10, (opponent.rating - player.rating) / 400));
        const actualScore = (player.placement ?? players.length) < (opponent.placement ?? players.length) ? 1 : 0;
        ratingChange += Math.round(32 * (actualScore - expectedScore));
      }
      const newRating = Math.max(0, player.rating + ratingChange);
      try {
        await databaseService.updateUserRating(player.userId, newRating);
      } catch (err) {
        console.warn('[MS] rating update failed:', err);
      }
      if (currentUser && player.userId === currentUser.uid) {
        achievementService.onRatingUpdate(newRating);
      }
    }
  }

  // ─── 재접속 상태 복원 ───────────────────────────────────────────
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
      const [gsSnap, tdSnap] = await Promise.all([
        get(ref(rtdb, `gameStates/${roomId}`)),
        get(ref(rtdb, `towerDetails/${roomId}/${userId}`)),
      ]);
      if (!gsSnap.exists()) return null;

      const gs = gsSnap.val() as MultiplayerGameState;
      const playerState = gs.players.find(p => p.userId === userId);
      if (!playerState) return null;

      const towerDetails: TowerDetail[] = tdSnap.exists()
        ? (tdSnap.val().towers || [])
        : [];

      return {
        lives: playerState.lives,
        money: playerState.money,
        wave: playerState.wave,
        towerDetails,
        isAlive: playerState.isAlive,
        currentRound: gs.currentRound,
        currentPhase: gs.currentPhase,
      };
    } catch (err) {
      console.error('[MS] getPlayerStateForRejoin error:', err);
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
        this.deleteRoom(roomId).catch(() => {});
        callback(null);
        return;
      }
      callback(room);
    });
    return () => off(roomRef, 'value', listener);
  }

  // [V5-FIX-MS-10] players 정규화
  private normalizePlayers(raw: any): PlayerGameState[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    return Object.values(raw).filter(Boolean) as PlayerGameState[];
  }

  onGameStateUpdate(roomId: string, callback: (players: PlayerGameState[]) => void): () => void {
    const gsRef = ref(rtdb, `gameStates/${roomId}`);
    const listener = onValue(gsRef, (snapshot) => {
      if (!snapshot.exists()) { callback([]); return; }
      const gs = snapshot.val();
      callback(this.normalizePlayers(gs.players));
    });
    return () => off(gsRef, 'value', listener);
  }

  onGameStateUpdateWithPhase(
    roomId: string,
    callback: (state: MultiplayerGameState | null) => void
  ): () => void {
    const gsRef = ref(rtdb, `gameStates/${roomId}`);
    const listener = onValue(gsRef, (snapshot) => {
      if (!snapshot.exists()) { callback(null); return; }
      const gs = snapshot.val() as MultiplayerGameState;
      // [V5-FIX-MS-10] players / battleResults / rankings 정규화
      const normalized: MultiplayerGameState = {
        ...gs,
        players: this.normalizePlayers(gs.players),
        battleResults: Array.isArray(gs.battleResults)
          ? gs.battleResults
          : gs.battleResults ? Object.values(gs.battleResults) as PvPBattleResult[] : [],
        rankings: Array.isArray(gs.rankings) ? gs.rankings : (gs.rankings ? Object.values(gs.rankings) as string[] : []),
      };
      callback(normalized);
    });
    return () => off(gsRef, 'value', listener);
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
    const tRef = ref(rtdb, `towerDetails/${roomId}/${userId}`);
    const listener = onValue(tRef, (snapshot) => {
      if (!snapshot.exists()) { callback([]); return; }
      const data = snapshot.val();
      callback(Array.isArray(data.towers) ? data.towers : []);
    });
    return () => off(tRef, 'value', listener);
  }

  onAllTowerDetailsUpdate(
    roomId: string,
    callback: (allTowers: Map<string, TowerDetail[]>) => void
  ): () => void {
    const tRef = ref(rtdb, `towerDetails/${roomId}`);
    const listener = onValue(tRef, (snapshot) => {
      const combined = new Map<string, TowerDetail[]>();
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const userId = child.key!;
          const data = child.val();
          if (data && Array.isArray(data.towers)) combined.set(userId, data.towers);
        });
      }
      callback(combined);
    });
    return () => off(tRef, 'value', listener);
  }

  async getAllTowerDetailsOnce(roomId: string): Promise<Map<string, TowerDetail[]>> {
    const snap = await get(ref(rtdb, `towerDetails/${roomId}`));
    const combined = new Map<string, TowerDetail[]>();
    if (snap.exists()) {
      snap.forEach((child) => {
        const userId = child.key!;
        const data = child.val();
        if (data && Array.isArray(data.towers) && data.towers.length > 0) {
          combined.set(userId, data.towers);
        }
      });
    }
    return combined;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const snap = await get(ref(rtdb, `rooms/${roomId}`));
    return snap.exists() ? (snap.val() as Room) : null;
  }

  getCurrentRoomId(): string | null {
    if (!this.currentRoomId) this.currentRoomId = localStorage.getItem('currentRoomId');
    return this.currentRoomId;
  }

  private setCurrentRoom(roomId: string): void {
    this.currentRoomId = roomId;
    localStorage.setItem('currentRoomId', roomId);
    // [V5] presence 등록 — 브라우저 종료 시 자동으로 isAlive=false 가 아니라
    // presence 노드에만 기록. 실제 isAlive는 leaveRoom/탈락 로직이 담당.
    const user = authService.getCurrentUser();
    if (user && this.presenceCleanup) { this.presenceCleanup(); this.presenceCleanup = null; }
    if (user) {
      this.presenceCleanup = registerPresence(
        `presence/${roomId}/${user.uid}`,
        { online: true, joinedAt: Date.now() },
        { online: false, lastSeen: Date.now() },
      );
    }
  }

  clearCurrentRoom(): void {
    this.currentRoomId = null;
    localStorage.removeItem('currentRoomId');
    if (this.presenceCleanup) { this.presenceCleanup(); this.presenceCleanup = null; }
  }

  getRoomRemainingTime(room: Room): number {
    return Math.max(0, ROOM_EXPIRY_TIME - (Date.now() - room.createdAt));
  }

  isRoomExpired(room: Room): boolean {
    return Date.now() - room.createdAt > ROOM_EXPIRY_TIME;
  }
}

export const multiplayerService = new MultiplayerService();