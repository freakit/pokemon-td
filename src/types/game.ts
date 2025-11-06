// src/types/game.ts

export type StatusEffectType =
  | "burn"
  | "poison"
  | "paralysis"
  | "freeze"
  | "sleep"
  | "confusion";
export type DamageClass = "physical" | "special" | "status";
export type Difficulty = "easiest" | "easy" | "normal" | "hard" | "expert";
export type PokemonRarity =
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Diamond"
  | "Master"
  | "Legend";

export interface Position {
  x: number;
  y: number;
}

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;
  tickDamage?: number;
}

export interface PokemonAbility {
  name: string;
  description: string;
  effect: "crit" | "lifesteal" | "aoe" | "speed" | "tank";
  value: number;
}

export interface GameMove {
  name: string;
  type: string;
  power: number;
  accuracy: number;
  damageClass: DamageClass;
  effect: MoveEffect; // 부가 효과
  cooldown: number;
  currentCooldown: number;
  isAOE: boolean; // 광역 여부
  aoeRadius?: number;
  manualCast?: boolean;
}

export interface MoveEffect {
  type: "damage" | "status" | "heal" | "buff" | "debuff";
  statusInflict?: StatusEffectType; // 상태이상
  statusChance?: number; // 확률
  damageMultiplier?: number;
  additionalEffects?: string;
}

export interface MapData {
  id: string;
  name: string;
  difficulty: "easiest" | "easy" | "medium" | "hard" | "expert";
  paths: Position[][];
  spawns: Position[];
  objectives: Position[];
  description: string;
  backgroundType: "grass" | "desert" | "snow" | "cave" | "water";
}
export type Gender = "male" | "female" | "genderless";

export interface GamePokemon {
  id: string;
  pokemonId: number;
  name: string;
  level: number;
  experience: number;
  currentHp: number;
  maxHp: number;
  baseAttack: number; // 기본 공격력 (버프/디버프 기준)
  attack: number; // 실제 공격력
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  types: string[];
  position: Position;
  equippedMoves: GameMove[];
  rejectedMoves: string[]; // 거부한 기술 이름 목록
  ability?: PokemonAbility;
  statusEffect?: StatusEffect;
  isFainted: boolean;
  sprite: string;
  targetEnemyId?: string;
  range: number;
  sellValue: number;
  kills: number;
  damageDealt: number;
  gender: Gender; // 성별 추가
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  baseAttack: number; // 기본 공격력
  attack: number; // 실제 공격력
  defense: number;
  specialAttack: number; // 특수 공격력
  specialDefense: number; // 특수 방어력
  speed: number;
  position: Position;
  path: Position[];
  pathIndex: number;
  statusEffect?: StatusEffect;
  isNamed: boolean;
  isBoss: boolean;
  reward: number;
  moveSpeed: number;
  targetTowerId?: string;
  types: string[]; // optional 제거
  sprite: string; // optional 제거
  range: number; // 타워 공격 사거리
  attackCooldown: number; // 타워 공격 쿨다운
  pokemonId: number; // 포켓몬 ID 추가
}

export interface Projectile {
  id: string;
  from: Position;
  to: Position;
  current: Position;
  damage: number;
  type: string;
  effect: MoveEffect; // 투사체에 부가 효과 포함
  speed: number;
  targetId: string;
  isAOE: boolean;
  aoeRadius?: number;
  attackPower: number; // 공격력 (물리 or 특수)
  damageClass: DamageClass; // 물리 or 특수
  attackerTypes: string[]; // 자속 보정을 위한 공격자 타입
  attackerId?: string; // 🆕 특성 효과 적용을 위한 공격자 ID
}

export interface DamageNumber {
  id: string;
  value: number;
  position: Position;
  isCrit: boolean;
  isMiss?: boolean; // 🎯 Miss 여부
  lifetime: number;
}

export interface Item {
  id: string;
  name: string;
  type:
    | "heal"
    | "revive"
    | "candy"
    | "egg"
    | "stone"
    | "gold"
    | "mega-stone"
    | "max-mushroom";
  cost: number;
  effect: string;
  value?: number; // 효과 값 (예: 힐량)
  targetPokemonId?: number; // 메가스톤의 경우 특정 포켓몬 ID
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
  progress: number;
  target: number;
  unlocked: boolean;
  reward: number;
  hidden?: boolean;
}

export interface GameStats {
  totalPlayTime: number;
  enemiesKilled: number;
  pokemonUsed: number;
  highestWave: number;
  totalMoneyEarned: number;
  evolutionsAchieved: number;
  bossesDefeated: number;
  mapClears: Record<string, number>;
}

export interface SaveData {
  stats: GameStats;
  achievements: Achievement[];
  pokedex: number[];
  unlockedMaps: string[];
  settings: GameSettings;
  highScores: HighScore[];
}

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  gameSpeed: number;
  showDamageNumbers: boolean;
  showGrid: boolean;
  autoSave: boolean;
  language: "ko" | "en";
}

export interface HighScore {
  wave: number;
  mapId: string;
  difficulty: Difficulty;
  date: string;
  pokemonUsed: string[];
}

export interface GameState {
  wave: number;
  money: number;
  lives: number;
  towers: GamePokemon[];
  enemies: Enemy[];
  projectiles: Projectile[];
  damageNumbers: DamageNumber[];
  isWaveActive: boolean;
  isPaused: boolean;
  gameOver: boolean;
  victory: boolean;
  selectedTowerSlot: Position | null;
  availableItems: Item[]; // 인벤토리 (현재 상점에서 바로 사용됨)
  currentMap: string;
  difficulty: Difficulty;
  gameSpeed: number;
  combo: number;
  gameTick: number;
  isSpawning: boolean;
  pokemonToPlace: any | null;
  timeOfDay: "day" | "night"; // 시간대 추가

  // 레벨업 시 기술 선택 (큐로 관리하여 순차 처리)
  skillChoiceQueue: Array<{
    towerId: string;
    newMoves: GameMove[];
  }>;

  // 진화 확인 큐 추가
  evolutionConfirmQueue: Array<{
    towerId: string;
    evolutionOptions: Array<{
      targetId: number;
      targetName: string;
      method: string;
    }>;
  }>;

  // 웨이브 종료 시 아이템 선택
  waveEndItemPick: Item[] | null;

  // 진화 알림 (작은 토스트 메시지)
  evolutionToast: {
    fromName: string;
    toName: string;
    timestamp: number;
  } | null;

  // 웨이브 50 클리어 모달 표시 여부
  wave50Clear: boolean;
}
