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
  name: string;              // 영문 key (예: "thunderbolt")
  displayName: string;       // 현지화된 이름 (예: "10만볼트")
  type: string;              // 타입 (예: "electric")
  power: number;             // 위력
  accuracy: number;          // 명중률
  damageClass: DamageClass;  // "physical" | "special" | "status"
  effect: MoveEffect;        // 기술 효과
  cooldown: number;          // 쿨다운 (ms)
  currentCooldown: number;   // 현재 남은 쿨다운 (ms)
  isAOE: boolean;            // 광역 공격 여부
  aoeRadius?: number;        // 광역 범위 (optional)
  manualCast?: boolean;      // 수동 시전 여부 (optional)
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
  // 기본 정보
  id: string;                      // 고유 ID
  pokemonId: number;               // 포켓몬 도감 번호
  name: string;                    // 영문 이름
  displayName: string;             // 현지화된 이름
  
  // 레벨 & 경험치
  level: number;                   // 레벨
  experience: number;              // 경험치
  
  // 스탯
  currentHp: number;               // 현재 HP
  maxHp: number;                   // 최대 HP
  baseAttack: number;              // 기본 공격력
  attack: number;                  // 현재 공격력
  defense: number;                 // 방어력
  specialAttack: number;           // 특수 공격력
  specialDefense: number;          // 특수 방어력
  speed: number;                   // 스피드
  
  // 타입 & 위치
  types: string[];                 // 타입 배열 (예: ["fire", "flying"])
  position: Position;              // 배치 위치 { x: number, y: number }
  
  // 전투 관련
  range: number;                   // 공격 범위
  sellValue: number;               // ⭐️ [추가] 판매 가격
  kills: number;                   // ⭐️ [추가] 킬 수
  damageDealt: number;             // ⭐️ [추가] 가한 데미지
  targetEnemyId: string | null;    // 타겟 적 ID
  isFainted: boolean;              // 기절 여부
  
  // 비주얼
  sprite: string;                  // 스프라이트 URL
  
  // 기술 (중요!)
  equippedMoves: GameMove[];       // 장착된 기술 (최대 4개)
  rejectedMoves?: string[];        // ⭐️ [수정] 2. 타입을 GameMove[]에서 string[]로 변경
  
  // 추가 속성 (optional)
  statusEffects?: StatusEffect[];
  rarity?: PokemonRarity;          // 레어도
  gender?: Gender;                 // 성별
  ability?: PokemonAbility;        // 특성
  critChance?: number;             // 크리티컬 확률
  critDamage?: number;             // 크리티컬 데미지
  lifesteal?: number;              // 흡혈
  aoeBonus?: number;               // 광역 보너스
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

  isPreloading: boolean;
  isShopDisabled: boolean; // ⭐ 추가
}
