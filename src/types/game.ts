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

export interface Synergy {
  id: string;
  name: string;
  level: number;
  count: number;
  description: string;
}

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
  name: string; // 영문 key
  displayName: string; // 현지화된 이름
  description: string;
  effect: "crit" | "lifesteal" | "aoe" | "speed" | "tank";
  value: number;
}

export interface GameMove {
  name: string; // 영문 key
  displayName: string; // 현지화된 이름
  type: string;
  power: number;
  accuracy: number;
  damageClass: DamageClass;
  effect: MoveEffect;
  cooldown: number;
  currentCooldown: number;
  isAOE: boolean;
  aoeRadius?: number;
  manualCast?: boolean;
}

export interface MoveEffect {
  type: "damage" | "status" | "heal" | "buff" | "debuff";
  statusInflict?: StatusEffectType;
  statusChance?: number | null;
  damageMultiplier?: number;
  additionalEffects?: string;
  drainPercent?: number;
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
  name: string; // 영문 key
  displayName: string; // 현지화된 이름
  level: number;
  experience: number;
  currentHp: number;
  maxHp: number;
  baseAttack: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  types: string[];
  position: Position;
  equippedMoves: GameMove[];
  rejectedMoves: string[];
  ability?: PokemonAbility;
  statusEffect?: StatusEffect;
  isFainted: boolean;
  sprite: string;
  targetEnemyId?: string;
  range: number;
  sellValue: number;
  kills: number;
  damageDealt: number;
  gender: Gender;
}

export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  baseAttack: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
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
  types: string[];
  sprite: string;
  range: number;
  attackCooldown: number;
  pokemonId: number;
}

export interface Projectile {
  id: string;
  from: Position;
  to: Position;
  current: Position;
  damage: number;
  type: string;
  effect: MoveEffect;
  speed: number;
  targetId: string;
  isAOE: boolean;
  aoeRadius?: number;
  attackPower: number;
  damageClass: DamageClass;
  attackerTypes: string[];
  attackerId?: string;
}

export interface DamageNumber {
  id: string;
  value: number;
  position: Position;
  isCrit: boolean;
  isMiss?: boolean;
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
  value?: number;
  targetPokemonId?: number;
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
  availableItems: Item[];
  currentMap: string;
  difficulty: Difficulty;
  gameSpeed: number;
  combo: number;
  gameTime: number;
  isSpawning: boolean;
  pokemonToPlace: any | null;
  timeOfDay: "day" | "night";

  skillChoiceQueue: Array<{
    towerId: string;
    newMoves: GameMove[];
  }>;

  evolutionConfirmQueue: Array<{
    towerId: string;
    evolutionOptions: Array<{
      targetId: number;
      targetName: string;
      method: string;
    }>;
  }>;
  waveEndItemPick: Item[] | null;
  evolutionToast: {
    fromName: string;
    toName: string;
    timestamp: number;
  } | null;

  wave50Clear: boolean;

  activeSynergies: Synergy[];
  hoveredSynergy: Synergy | null;

  // ⭐️ [수정] 여기에 isPreloading 추가
  isPreloading: boolean;
}