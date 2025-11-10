// src/types/multiplayer.ts
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  rating: number;
  createdAt: number;
}

export interface PokedexEntry {
  pokemonId: number;
  name: string;
  firstSeen: number;
  timesSeen: number;
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

export interface DebuffItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: 'instant_kill' | 'slow_attack' | 'spawn_boss' | 'reduce_gold' | 'freeze_towers' | 'disable_shop';
  value?: number;
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
}

export interface MultiplayerGameState {
  roomId: string;
  players: PlayerGameState[];
  startTime: number;
  rankings: string[];
}
