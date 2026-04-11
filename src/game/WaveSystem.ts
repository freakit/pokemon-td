// src/game/WaveSystem.ts
import { useGameStore } from "../store/gameStore";
import { Enemy, Difficulty } from "../types/game";
import { getMapById } from "../data/maps";
import { pokeAPI } from "../api/pokeapi";

const DIFFICULTY_MULTIPLIERS: Record<
  Difficulty,
  { hp: number; attack: number; reward: number }
> = {
  easiest: { hp: 0.1, attack: 0.1, reward: 1.0 },
  easy:    { hp: 0.7, attack: 0.7, reward: 1.0 },
  normal:  { hp: 0.9, attack: 0.9, reward: 1.0 },
  hard:    { hp: 1.05, attack: 1.05, reward: 1.0 },
  expert:  { hp: 1.2, attack: 1.2, reward: 1.0 },
};

// 웨이브별 종족값 범위 (스폰 포켓몬 강도 조절)
const WAVE_STAT_RANGES: Array<{ min: number; max: number }> = [
  { min: 1,   max: 300  }, // 1~5
  { min: 200, max: 380  }, // 6~10
  { min: 280, max: 430  }, // 11~15
  { min: 320, max: 480  }, // 16~20
  { min: 370, max: 510  }, // 21~25
  { min: 410, max: 550  }, // 26~30
  { min: 450, max: 580  }, // 31~35
  { min: 490, max: 600  }, // 36~40
  { min: 520, max: 630  }, // 41~45
  { min: 550, max: 660  }, // 46~50
];

function getStatRange(wave: number): { min: number; max: number } {
  const idx = Math.min(Math.floor((wave - 1) / 5), WAVE_STAT_RANGES.length - 1);
  return WAVE_STAT_RANGES[idx];
}

export class WaveSystem {
  private static instance: WaveSystem;
  private enemyCounter = 0;

  // [수정] 스폰 타이머 ID 추적 (웨이브 전환 시 취소)
  private activeTimers: ReturnType<typeof setTimeout>[] = [];

  // [버그3 수정] 보스 스폰 대기 중 플래그
  // setSpawning(false) 이후에도 보스가 아직 async 스폰 중이면 웨이브 완료 방지
  private _bossSpawnPending = false;

  static getInstance() {
    if (!WaveSystem.instance) {
      WaveSystem.instance = new WaveSystem();
    }
    return WaveSystem.instance;
  }

  // [버그3 수정] GameManager에서 조회 가능한 getter
  get isBossSpawnPending(): boolean {
    return this._bossSpawnPending;
  }

  // [수정] 새 웨이브 시작 전 이전 웨이브의 미실행 타이머 취소
  cancelPendingSpawns() {
    this.activeTimers.forEach(id => clearTimeout(id));
    this.activeTimers = [];
    this._bossSpawnPending = false;
  }

  startWave(wave: number) {
    this.cancelPendingSpawns();

    const { currentMap, difficulty, addEnemy, setSpawning } = useGameStore.getState();
    const map = getMapById(currentMap);
    if (!map || map.paths.length === 0) return;

    setSpawning(true);

    const count = this.getEnemyCount(wave);
    const mult = DIFFICULTY_MULTIPLIERS[difficulty];
    const pathsToUse = map.paths;

    // [수정①] 3의 배수 웨이브마다 보스 스폰 (기존 5의 배수 → 3의 배수)
    const isBossWave = wave % 3 === 0;

    // [버그3 수정] 보스 웨이브 시작 시 플래그 ON
    if (isBossWave) {
      this._bossSpawnPending = true;
    }

    let lastSpawnTime = 0;

    for (let i = 0; i < count; i++) {
      const pathIndex = i % pathsToUse.length;
      const currentPath = pathsToUse[pathIndex];
      const spawnTime = Math.floor(i / pathsToUse.length) * 800;

      const timer = setTimeout(() => {
        this.spawnEnemy(wave, currentPath, false, mult, addEnemy);
      }, spawnTime);
      this.activeTimers.push(timer);
      lastSpawnTime = spawnTime;
    }

    // 3의 배수 웨이브마다 보스 스폰
    if (isBossWave) {
      const bossSpawnTime = Math.ceil(count / pathsToUse.length) * 800 + 2000;
      const bossTimer = setTimeout(async () => {
        // [버그3 수정] 보스 addEnemy 완료 후 플래그 OFF
        await this.spawnBossInternal(wave, pathsToUse[0], mult, addEnemy);
        this._bossSpawnPending = false;
      }, bossSpawnTime);
      this.activeTimers.push(bossTimer);
      lastSpawnTime = bossSpawnTime;
    }

    const endTimer = setTimeout(() => {
      setSpawning(false);
      // activeTimers에서 완료된 것들 정리
      this.activeTimers = [];
    }, lastSpawnTime + 500);
    this.activeTimers.push(endTimer);
  }

  private getEnemyCount(wave: number) {
    return Math.floor(5 + wave * 1.5);
  }

  private async spawnEnemy(
    wave: number,
    path: any[],
    isBoss: boolean,
    mult: any,
    addEnemy: (enemy: Enemy) => void
  ) {
    try {
      const pokemonId = this.getEnemyPokemonId(wave);
      const pokemonData = await pokeAPI.getPokemon(pokemonId);

      // 지수적 스케일링 (1.08^(wave-1) 으로 조금 완화)
      const waveMultiplier = Math.pow(1.08, wave - 1);

      const baseHp = pokemonData.stats.hp * waveMultiplier * mult.hp;
      const baseAttack = pokemonData.stats.attack * waveMultiplier * mult.attack;
      const baseDefense = pokemonData.stats.defense * waveMultiplier * mult.attack;
      const baseSpecialAttack = pokemonData.stats.specialAttack * waveMultiplier * mult.attack;
      const baseSpecialDefense = pokemonData.stats.specialDefense * waveMultiplier * mult.attack;

      // [수정] 보스 보상: 일반 적의 5배
      const reward = isBoss ? 50 : 10;

      // [보스 강화] HP 5배, 공격/특공/방어/특방 2.5배, 이동속도 40
      const enemy: Enemy = {
        id: `enemy-${this.enemyCounter++}`,
        name: pokemonData.name,
        pokemonId: pokemonData.id,
        hp: isBoss ? baseHp * 5 : baseHp,
        maxHp: isBoss ? baseHp * 5 : baseHp,
        baseAttack: isBoss ? baseAttack * 2.5 : baseAttack,
        attack: isBoss ? baseAttack * 2.5 : baseAttack,
        defense: isBoss ? baseDefense * 2.5 : baseDefense,
        specialAttack: isBoss ? baseSpecialAttack * 2.5 : baseSpecialAttack,
        specialDefense: isBoss ? baseSpecialDefense * 2.5 : baseSpecialDefense,
        speed: pokemonData.stats.speed,
        position: { ...path[0] },
        path: [...path],
        pathIndex: 0,
        isNamed: isBoss,
        isBoss,
        reward,
        moveSpeed: isBoss ? 40 : 60,
        types: pokemonData.types,
        sprite: pokemonData.sprite,
        range: 80,
        attackCooldown: 0,
      };
      addEnemy(enemy);
    } catch (e) {
      console.error('Failed to spawn enemy pokemon:', e);
      this.spawnFallbackEnemy(wave, path, isBoss, mult, addEnemy);
    }
  }

  private async spawnBossInternal(
    wave: number,
    path: any[],
    mult: any,
    addEnemy: (enemy: Enemy) => void
  ) {
    await this.spawnEnemy(wave, path, true, mult, addEnemy);
  }

  spawnDebuffBoss(wave: number) {
    const { currentMap, difficulty, addEnemy } = useGameStore.getState();
    const map = getMapById(currentMap);
    if (!map || map.paths.length === 0) return;

    const mult = DIFFICULTY_MULTIPLIERS[difficulty];
    this.spawnEnemy(wave + 5, map.paths[0], true, mult, addEnemy);
  }

  /**
   * [수정] 경량 스탯 캐시 사용 - 추가 API 호출 없음
   */
  private getEnemyPokemonId(wave: number): number {
    const { min, max } = getStatRange(wave);
    return pokeAPI.getEnemyPokemonIdByStatRange(min, max);
  }

  private spawnFallbackEnemy(
    wave: number,
    path: any[],
    isBoss: boolean,
    mult: any,
    addEnemy: (enemy: Enemy) => void
  ) {
    const baseHp = (50 + wave * 12) * mult.hp;
    const baseAttack = (10 + wave * 2) * mult.attack;
    const baseDefense = 5 + wave;
    const reward = isBoss ? 50 : 10;

    // [보스 강화] fallback도 동일 배율 적용
    const enemy: Enemy = {
      id: `enemy-${this.enemyCounter++}`,
      name: isBoss ? `Boss ${wave}` : `Enemy ${wave}`,
      pokemonId: 0,
      hp: isBoss ? baseHp * 5 : baseHp,
      maxHp: isBoss ? baseHp * 5 : baseHp,
      baseAttack: isBoss ? baseAttack * 2.5 : baseAttack,
      attack: isBoss ? baseAttack * 2.5 : baseAttack,
      defense: isBoss ? baseDefense * 2.5 : baseDefense,
      specialAttack: isBoss ? baseAttack * 2.5 : baseAttack,
      specialDefense: isBoss ? baseDefense * 2.5 : baseDefense,
      speed: 50 + wave,
      position: { ...path[0] },
      path: [...path],
      pathIndex: 0,
      isNamed: isBoss,
      isBoss,
      reward,
      moveSpeed: isBoss ? 40 : 60,
      types: ['normal'],
      sprite: '',
      range: 80,
      attackCooldown: 0,
    };
    addEnemy(enemy);
  }
}