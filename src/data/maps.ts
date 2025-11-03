// src/data/maps.ts

import { Position } from '../types/game';

const T = 64;

export interface MapData {
  id: string; name: string; difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  path: Position[]; spawns: Position[]; objectives: Position[];
  description: string; unlockWave: number;
  backgroundType: 'grass' | 'desert' | 'snow' | 'cave' | 'water';
}

export const MAPS: MapData[] = [
  {
    id: 'beginner', name: '초보자의 길', difficulty: 'easy',
    description: '기본 직선 경로', unlockWave: 0, backgroundType: 'grass',
    spawns: [{x: -T, y: 5*T}], objectives: [{x: 16*T, y: 5*T}],
    path: [{x:-T,y:5*T+T/2},{x:3*T,y:5*T+T/2},{x:7*T,y:5*T+T/2},{x:11*T,y:5*T+T/2},{x:16*T,y:5*T+T/2}],
  },
  {
    id: 'winding', name: '구불구불 산길', difficulty: 'medium',
    description: 'S자 형태', unlockWave: 5, backgroundType: 'grass',
    spawns: [{x: -T, y: 2*T}], objectives: [{x: 16*T, y: 8*T}],
    path: [{x:-T,y:2*T+T/2},{x:3*T,y:2*T+T/2},{x:3*T,y:5*T+T/2},{x:7*T,y:5*T+T/2},{x:7*T,y:2*T+T/2},{x:11*T,y:2*T+T/2},{x:11*T,y:8*T+T/2},{x:16*T,y:8*T+T/2}],
  },
  {
    id: 'maze', name: '사막 미로', difficulty: 'hard',
    description: '복잡한 미로', unlockWave: 15, backgroundType: 'desert',
    spawns: [{x: -T, y: 5*T}], objectives: [{x: 16*T, y: 5*T}],
    path: [{x:-T,y:5*T+T/2},{x:2*T,y:5*T+T/2},{x:2*T,y:2*T+T/2},{x:5*T,y:2*T+T/2},{x:5*T,y:8*T+T/2},{x:8*T,y:8*T+T/2},{x:8*T,y:3*T+T/2},{x:11*T,y:3*T+T/2},{x:11*T,y:7*T+T/2},{x:13*T,y:7*T+T/2},{x:13*T,y:5*T+T/2},{x:16*T,y:5*T+T/2}],
  },
  {
    id: 'frozen', name: '얼음 동굴', difficulty: 'hard',
    description: '얼음 동굴', unlockWave: 20, backgroundType: 'snow',
    spawns: [{x: -T, y: 3*T}, {x: -T, y: 7*T}], objectives: [{x: 16*T, y: 5*T}],
    path: [{x:-T,y:3*T+T/2},{x:5*T,y:3*T+T/2},{x:5*T,y:5*T+T/2},{x:10*T,y:5*T+T/2},{x:16*T,y:5*T+T/2}],
  },
  {
    id: 'double', name: '이중 공격로', difficulty: 'expert',
    description: '두 개의 경로', unlockWave: 30, backgroundType: 'cave',
    spawns: [{x: -T, y: 2*T}, {x: -T, y: 8*T}], objectives: [{x: 16*T, y: 2*T}, {x: 16*T, y: 8*T}],
    path: [{x:-T,y:2*T+T/2},{x:4*T,y:2*T+T/2},{x:4*T,y:5*T+T/2},{x:7*T,y:5*T+T/2},{x:7*T,y:2*T+T/2},{x:11*T,y:2*T+T/2},{x:16*T,y:2*T+T/2}],
  },
  {
    id: 'spiral', name: '나선형 혼돈', difficulty: 'expert',
    description: '나선 경로', unlockWave: 40, backgroundType: 'water',
    spawns: [{x: 7*T, y: -T}], objectives: [{x: 7*T, y: 5*T}],
    path: [{x:7*T+T/2,y:-T},{x:7*T+T/2,y:2*T},{x:12*T+T/2,y:2*T},{x:12*T+T/2,y:8*T},{x:2*T+T/2,y:8*T},{x:2*T+T/2,y:3*T},{x:10*T+T/2,y:3*T},{x:10*T+T/2,y:7*T},{x:4*T+T/2,y:7*T},{x:4*T+T/2,y:4*T},{x:8*T+T/2,y:4*T},{x:8*T+T/2,y:6*T},{x:6*T+T/2,y:6*T},{x:6*T+T/2,y:5*T},{x:7*T+T/2,y:5*T}],
  },
];

export const getMapById = (id: string) => MAPS.find(m => m.id === id);
export const getUnlockedMaps = (wave: number) => MAPS.filter(m => m.unlockWave <= wave);
