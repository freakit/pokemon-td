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

// ─── Achievement 티어 ────────────────────────────────────────────────────────
// 매판 달성 가능한 정도에 따라 포인트 차등
// Bronze(3) : 게임마다 쉽게 달성 가능
// Silver(10) : 플레이 잘 하면 달성 가능
// Gold(25)   : 집중해야 달성 가능
// Diamond(50): 고난도 도전
// Legendary(100): 거의 불가능에 가까운 도전
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';

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
  name: string;
  displayName: string;
  description: string;
  effect: "crit" | "lifesteal" | "aoe" | "speed" | "tank";
  value: number;
}

export interface GameMove {
  name: string;
  displayName: string;
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
  backgroundImage?: string;
}

export type Gender = "male" | "female" | "genderless";

export interface GamePokemon {
  id: string;
  pokemonId: number;
  name: string;
  displayName: string;
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
  range: number;
  sellValue: number;
  kills: number;
  damageDealt: number;
  targetEnemyId: string | null;
  isFainted: boolean;
  sprite: string;
  equippedMoves: GameMove[];
  rejectedMoves?: string[];
  statusEffect?: StatusEffect;
  rarity?: PokemonRarity;
  gender?: Gender;
  ability?: PokemonAbility;
  critChance?: number;
  critDamage?: number;
  lifesteal?: number;
  aoeBonus?: number;
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
  statusEffect?: StatusEffect;
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

// ─── Achievement (리뉴얼) ─────────────────────────────────────────────────────
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: string;
  // 기존 호환용 (단순 진행도 추적 — condition별 누적 카운터)
  progress: number;
  target: number;
  unlocked: boolean;         // 최초 1회 달성 여부 (레거시 호환)
  reward: number;            // 레거시 골드 보상 (0으로 통일, AP 포인트로 대체)
  hidden?: boolean;

  // ── 리뉴얼 필드 ─────────────────────────────────────────────────────────────
  tier: AchievementTier;              // 난이도 티어
  pointsPerCompletion: number;        // 달성 1회당 AP 포인트
  completions: number;               // 누적 달성 횟수 (매판 초기화 안 됨)
  totalPoints: number;               // completions × pointsPerCompletion (누적 AP)
}

// ─── AP 티어 포인트 상수 ──────────────────────────────────────────────────────
export const TIER_POINTS: Record<AchievementTier, number> = {
  bronze:    3,
  silver:    10,
  gold:      25,
  diamond:   50,
  legendary: 100,
};

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
  unlockedMaps: string[];
  settings: GameSettings;
  highScores: HighScore[];
  totalAP: number;           // 누적 Achievement Points
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

  isPreloading: boolean;
  isShopDisabled: boolean;
}