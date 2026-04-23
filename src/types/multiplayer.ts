// src/types/multiplayer.ts
import { GameMove } from './game';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  rating: number;
  createdAt: number;
}

export interface HallOfFameEntry {
  id: string;
  userId: string;
  userName: string;
  mapId: string;
  mapName: string;
  wave: number;
  pokemonUsed: string[];
  clearTime: number;
  timestamp: number;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  mapId: string;
  clearTime?: number;
  highestWave: number;
  timestamp: number;
  rating: number;
}

export type AIDifficulty = 'easy' | 'normal' | 'hard';

export interface Room {
  id: string;
  name: string;
  mapId: string;
  mapName: string;
  hostId: string;
  hostName: string;
  players: RoomPlayer[];
  maxPlayers: number;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  createdAt: number;
}

export interface RoomPlayer {
  userId: string;
  userName: string;
  isReady: boolean;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  rating: number;
}

// [수정 2] 게임 페이즈 (멀티플레이어) — 'loading' 추가
export type GamePhase = 'loading' | 'shopping' | 'wave' | 'waiting_battle' | 'battle' | 'waiting_wave';

// Battle Log Entry
export interface BattleLogEntry {
  turn: number;
  attackerId: string;
  targetId: string;
  action: 'attack' | 'skill';
  damage: number;
  isCrit: boolean;
  isMiss: boolean;
  isFainted: boolean;
  healed?: number;
  moveName?: string;
  timestamp: number;
}

// PvP 대전 결과
export interface PvPBattleResult {
  matchId: string;
  roundNumber: number;
  player1Id: string;
  player2Id: string;
  winnerId: string;
  player1RemainingPokemon: number;
  player2RemainingPokemon: number;
  lifeLost: number;
  battleLog: BattleLogEntry[];
  rewardP1?: { gold: number; lives: number };
  rewardP2?: { gold: number; lives: number };
  timestamp: number;
}

// 라운드 매칭
export interface RoundMatchup {
  roundNumber: number;
  matches: Array<{ player1Id: string; player2Id: string }>;
  skipPlayerId: string | null;
  timestamp: number;
}

// 플레이어 간 만남 횟수 기록
export interface EncounterRecord {
  [playerId: string]: { [opponentId: string]: number };
}

export interface PlayerGameState {
  userId: string;
  userName: string;
  wave: number;
  lives: number;
  money: number;
  towers: number;
  isAlive: boolean;
  rating: number;
  placement?: number;
  ratingChange?: number;
  waveCompleted?: boolean;
  battleRecord?: {
    wins: number;
    losses: number;
  };
}

export interface MultiplayerGameState {
  roomId: string;
  players: PlayerGameState[];
  startTime: number;
  rankings: string[];
  currentRound: number;
  currentPhase: GamePhase;
  roundMatchups?: RoundMatchup;
  encounterRecord: EncounterRecord;
  battleResults: PvPBattleResult[];
  phaseEndTime?: number | null;
  loadingReady?: Record<string, boolean>;
  battleStartTime?: number | null;  // [V8] TFT Arena fighting 시작 서버 시각 (양측 동기화용)
}

export interface TowerDetail {
  pokemonId: number;
  name: string;
  level: number;
  sprite: string;
  position: { x: number; y: number };
  currentHp: number;
  maxHp: number;
  isFainted: boolean;
  // PvP 대전용 추가 정보
  attack?: number;
  defense?: number;
  specialAttack?: number;
  specialDefense?: number;
  speed?: number;
  types?: string[];
  equippedMoves?: GameMove[];
  lifesteal?: number;
  aoeBonus?: number;
}