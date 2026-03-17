// src/services/AIPlayer.ts
/**
 * AI 플레이어 - 실제 유저와 동일한 TFT 흐름으로 동작
 *
 * 시뮬레이션 결과 발견된 버그 수정 목록:
 * 1. getRandomPokemon → getRandomPokemonIdWithRarity + getPokemon 으로 교체
 * 2. mapId 파라미터 미사용 → 제거 (mapData 직접 사용)
 * 3. mapDifficulty 하드코딩 → Room에서 읽어옴
 * 4. markWaveCompleted 미보장 → finally 블록으로 보장
 * 5. Firebase 콜백 중복 실행 → waveProcessing 플래그 + round 체크
 * 6. simulateWave 수치 버그 → 실제 GameManager 공식 적용
 * 7. 초기 money/wave 동기화 지연 → Firebase 갱신 전까지 로컬값 사용
 * 8. AI 타워 정보 배틀 전 미동기화 → waiting_battle 페이즈에서 즉시 재전송
 */

import { multiplayerService } from './MultiplayerService';
import { pokeAPI } from '../api/pokeapi';
import {
  AIDifficulty, TowerDetail, MultiplayerGameState, GamePhase,
} from '../types/multiplayer';
import {
  GamePokemon, GameMove, MoveEffect, PokemonRarity,
} from '../types/game';
import { getMapById, MAPS } from '../data/maps';
import { EVOLUTION_CHAINS, canMegaEvolve } from '../data/evolution';
import { getTypeEffectiveness } from '../utils/typeEffectiveness';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const TILE_SIZE = 64;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 10;
const MAX_TOWERS = 6;
const ENTRY_FEE = 20;

const RARITY_SCORE: Record<PokemonRarity, number> = {
  Bronze: 1, Silver: 2, Gold: 3, Diamond: 4, Master: 5, Legend: 6,
};

const RARITY_COST: Record<PokemonRarity, number> = {
  Bronze: 50, Silver: 100, Gold: 200, Diamond: 350, Master: 500, Legend: 800,
};

// 난이도별 AI 설정
const AI_CONFIG: Record<AIDifficulty, {
  purchaseIntervalMs: number;
  pickTopN: number;         // 상위 N개 중 선택 (1 = 항상 최고, 클수록 무작위)
  levelUpChance: number;    // 0~1, 웨이브 후 레벨업 확률
  evolvePriority: number;   // 0~1, 진화 시도 확률
  upgradeTeam: boolean;     // 약한 타워 교체 여부
  rerollCount: number;      // 추가 후보 생성 횟수 (리롤)
  synergyWeight: number;    // 시너지 점수 비중
}> = {
  easy:   { purchaseIntervalMs: 12000, pickTopN: 999, levelUpChance: 0.15, evolvePriority: 0.1, upgradeTeam: false, rerollCount: 0, synergyWeight: 0 },
  normal: { purchaseIntervalMs: 7000,  pickTopN: 3,   levelUpChance: 0.5,  evolvePriority: 0.5, upgradeTeam: false, rerollCount: 1, synergyWeight: 0.5 },
  hard:   { purchaseIntervalMs: 3000,  pickTopN: 1,   levelUpChance: 0.9,  evolvePriority: 0.85, upgradeTeam: true, rerollCount: 3, synergyWeight: 1.0 },
};

// ─── 인터페이스 ───────────────────────────────────────────────────────────────

interface AICandidate {
  pokemonId: number;
  rarity: PokemonRarity;
  cost: number;
  score: number;
}

// ─── 전투 시뮬레이터 ─────────────────────────────────────────────────────────
// GameManager / WaveSystem의 실제 공식을 그대로 따릅니다.

function getDiffMult(diff: string): { hp: number; atk: number } {
  switch (diff) {
    case 'easiest': return { hp: 0.1, atk: 0.1 };
    case 'easy':    return { hp: 0.7, atk: 0.7 };
    case 'hard':    return { hp: 1.1, atk: 1.1 };
    case 'expert':  return { hp: 1.3, atk: 1.3 };
    default:        return { hp: 0.9, atk: 0.9 }; // normal
  }
}

interface WaveSim {
  livesLost: number;
  moneyEarned: number;
  towerHpFractions: Record<string, number>; // 타워ID → 남은 HP 비율 (0~1)
}

function runWaveSim(towers: GamePokemon[], wave: number, difficulty: string): WaveSim {
  const dm = getDiffMult(difficulty);
  const scale = Math.pow(1.08, wave - 1);
  const enemyCount = Math.floor(5 + wave * 1.5);
  const hasBoss = wave % 5 === 0;

  // 실제 WaveSystem 공식과 동일
  const baseEnemyHp  = (80 + wave * 15) * dm.hp  * scale;
  const baseEnemyAtk = (12 + wave * 2)  * dm.atk * scale;
  const baseEnemyDef = (5  + wave * 0.5)          * scale;

  // 타워 현재 HP 복사본 (불변 유지)
  const towerHp: Record<string, number> = {};
  const towerMaxHp: Record<string, number> = {};
  for (const t of towers) {
    if (!t.isFainted) {
      towerHp[t.id] = t.currentHp;
      towerMaxHp[t.id] = t.maxHp;
    }
  }

  const aliveTowers = towers.filter(t => !t.isFainted && t.currentHp > 0);
  if (aliveTowers.length === 0) {
    return {
      livesLost: enemyCount + (hasBoss ? 1 : 0),
      moneyEarned: 0,
      towerHpFractions: {},
    };
  }

  let livesLost = 0;
  let moneyEarned = 0;

  // 적 한 마리씩 처리
  const processEnemy = (enemyHp: number, enemyAtk: number, enemyDef: number, reward: number, enemyTypes: string[]) => {
    let remainingHp = enemyHp;

    for (const tower of aliveTowers) {
      if ((towerHp[tower.id] ?? 0) <= 0) continue;

      // 타워 → 적 공격 (GameManager.towerAttack 공식)
      const attackType = tower.types[0] || 'normal';
      const eff = getTypeEffectiveness(attackType, enemyTypes);
      const power = tower.equippedMoves[0]?.power || 50;
      const towerAtk = tower.attack;

      // GameManager calculateDamage 공식: ((2*lv/5+2) * power * atk/def / 50 + 2) * eff
      const rawDmg = ((2 * tower.level / 5 + 2) * power * towerAtk / Math.max(1, enemyDef) / 50 + 2) * eff;
      // 타워가 적을 range 내에 두는 평균 시간 (레인지 3타일, 적 speed 60px/s → ~3.2초 노출)
      const exposureTime = 3.0 + wave * 0.05;
      const speedMult = Math.max(0.2, 1 - tower.speed / 300);
      const cooldown = (tower.equippedMoves[0]?.cooldown || 2.0) * speedMult;
      const hits = Math.max(1, Math.floor(exposureTime / cooldown));
      const totalDmg = rawDmg * hits;

      remainingHp -= totalDmg;

      // 적 반격: 타워 공격 (간소화 - 데미지 받음)
      const enemyDmgPerTick = Math.max(1, Math.floor(
        enemyAtk / Math.max(1, tower.defense)
      ));
      const takenDmg = enemyDmgPerTick * Math.min(hits, 3); // 최대 3회 반격
      towerHp[tower.id] = Math.max(0, (towerHp[tower.id] ?? 0) - takenDmg);

      if (remainingHp <= 0) {
        moneyEarned += reward;
        return true; // 처치
      }
    }

    // 남은 HP가 있으면 라이프 손실
    if (remainingHp > 0) {
      livesLost++;
      return false;
    }
    return true;
  };

  // 일반 적
  for (let i = 0; i < enemyCount; i++) {
    processEnemy(baseEnemyHp, baseEnemyAtk, baseEnemyDef, 10, ['normal']);
  }

  // 보스
  if (hasBoss) {
    processEnemy(baseEnemyHp * 3, baseEnemyAtk * 2, baseEnemyDef * 1.5, 50, ['normal']);
  }

  // 남은 HP 비율 계산
  const towerHpFractions: Record<string, number> = {};
  for (const t of aliveTowers) {
    const max = towerMaxHp[t.id] || 1;
    towerHpFractions[t.id] = Math.max(0, (towerHp[t.id] ?? 0) / max);
  }

  return { livesLost, moneyEarned, towerHpFractions };
}

// ─── AIPlayer ─────────────────────────────────────────────────────────────────

export class AIPlayer {
  private isRunning = false;
  private purchaseInterval: ReturnType<typeof setInterval> | null = null;
  private gameStateSub: (() => void) | null = null;
  private phaseSub: (() => void) | null = null;

  // 로컬 상태 (Firebase와 주기적 동기화)
  private money = 500;
  private lives = 100;
  private wave = 0;
  private towers: GamePokemon[] = [];
  private isAlive = true;
  private currentPhase: GamePhase = 'waiting_wave';
  private roomDifficulty = 'normal';

  // 중복 실행 방지
  private waveProcessing = false;
  private lastProcessedRound = -1;

  private cfg: typeof AI_CONFIG['normal'];
  private mapData: ReturnType<typeof getMapById>;

  constructor(
    private readonly roomId: string,
    private readonly playerId: string,
    private readonly difficulty: AIDifficulty,
    mapId: string,
  ) {
    this.cfg = AI_CONFIG[difficulty];
    this.mapData = getMapById(mapId) || MAPS[0];
  }

  // ─── 공개 API ───────────────────────────────────────────────────────────────

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 룸 난이도 읽기
    multiplayerService.getRoom(this.roomId).then(room => {
      if (room) {
        // MapData.difficulty를 roomDifficulty로 사용
        const mapData = getMapById(room.mapId);
        if (mapData) this.roomDifficulty = mapData.difficulty;
      }
    }).catch(() => {});

    // Firebase 플레이어 상태 구독
    this.gameStateSub = multiplayerService.onGameStateUpdate(this.roomId, players => {
      const me = players.find(p => p.userId === this.playerId);
      if (!me) return;
      // Firebase 값으로 덮어쓰기 (단, 로컬이 더 최신이면 유지 → 여기서는 항상 Firebase 우선)
      this.money = me.money;
      this.lives = me.lives;
      this.wave = me.wave;
      this.isAlive = me.isAlive;
      if (!this.isAlive) this.stop();
    });

    // 페이즈 변경 구독
    this.phaseSub = multiplayerService.onGameStateUpdateWithPhase(this.roomId, state => {
      if (!state || !this.isRunning || !this.isAlive) return;
      const prev = this.currentPhase;
      this.currentPhase = state.currentPhase;
      if (prev !== this.currentPhase) {
        this.onPhaseChange(state);
      }
    });

    // 주기적 쇼핑
    this.purchaseInterval = setInterval(() => {
      if (!this.isRunning || !this.isAlive) return;
      if (this.currentPhase === 'waiting_wave' || this.currentPhase === 'shopping') {
        this.doShoppingTurn().catch(err =>
          console.warn(`[AI:${this.playerId}] shopping error`, err)
        );
      }
    }, this.cfg.purchaseIntervalMs);

    // 초기 타워 정보 전송
    this.pushTowerDetails();
  }

  stop() {
    this.isRunning = false;
    if (this.purchaseInterval) { clearInterval(this.purchaseInterval); this.purchaseInterval = null; }
    if (this.gameStateSub) { this.gameStateSub(); this.gameStateSub = null; }
    if (this.phaseSub) { this.phaseSub(); this.phaseSub = null; }
  }

  // ─── 페이즈 핸들러 ─────────────────────────────────────────────────────────

  private onPhaseChange(state: MultiplayerGameState) {
    const round = state.currentRound;

    switch (this.currentPhase) {
      case 'waiting_wave':
        // 웨이브 전 준비 — 마지막 쇼핑 기회 + 플래그 리셋
        this.waveProcessing = false;
        setTimeout(() => {
          this.doShoppingTurn().catch(() => {});
        }, 500 + Math.random() * 1500);
        break;

      case 'wave':
        // 웨이브 시작 — 전투 시뮬레이션 (중복 방지)
        if (!this.waveProcessing && round !== this.lastProcessedRound) {
          this.waveProcessing = true;
          this.lastProcessedRound = round;
          this.handleWave(round).catch(err => {
            console.error(`[AI:${this.playerId}] handleWave error`, err);
          }).finally(() => {
            this.waveProcessing = false;
          });
        }
        break;

      case 'waiting_battle':
        // 배틀 직전 — 타워 정보 즉시 동기화 (BattlePhaseUI가 읽음)
        this.pushTowerDetails();
        // 웨이브 완료 신호가 아직 안 갔다면 재전송 (안전장치)
        if (round === this.lastProcessedRound) {
          multiplayerService.markWaveCompleted(this.roomId, this.playerId).catch(() => {});
        }
        break;

      case 'battle':
        // AI 대전은 BattlePhaseUI(호스트)가 처리 — 대기
        break;

      case 'shopping':
        // 라운드 시작 — 즉시 쇼핑 (1~2초 지연으로 자연스럽게)
        setTimeout(() => {
          this.doShoppingTurn().catch(() => {});
        }, 1000 + Math.random() * 2000);
        break;
    }
  }

  // ─── 웨이브 처리 ────────────────────────────────────────────────────────────

  private async handleWave(round: number) {
    if (!this.isAlive) return;

    // 웨이브 지속 시간만큼 대기 후 결과 처리 (실제 유저가 플레이하는 시간)
    const waveDurationMs = Math.min(20000, 8000 + round * 300);
    await delay(waveDurationMs + Math.random() * 3000);

    if (!this.isRunning || !this.isAlive) return;

    // 전투 시뮬레이션 (실제 수치 기반)
    const sim = runWaveSim(this.towers, round, this.roomDifficulty);

    // HP 업데이트
    this.towers = this.towers.map(t => {
      const frac = sim.towerHpFractions[t.id];
      if (frac === undefined) return t; // 기절 상태였던 타워 유지
      const newHp = Math.floor(t.maxHp * frac);
      return { ...t, currentHp: newHp, isFainted: newHp <= 0 };
    });

    // 라이프/돈 업데이트
    const waveBonus = 100 + round * 10;
    const newLives = Math.max(0, this.lives - sim.livesLost);
    const newMoney = this.money + sim.moneyEarned + waveBonus;

    this.lives = newLives;
    this.money = newMoney;

    // 탈락 체크
    if (newLives <= 0) {
      this.lives = 0;
      this.isAlive = false;
      await multiplayerService.playerDefeated(this.roomId, this.playerId);
      this.stop();
      return;
    }

    // 웨이브 후처리 (힐 + 성장)
    await this.postWaveProcessing(round);

    // Firebase 동기화 (markWaveCompleted 전에 상태 먼저 업로드)
    await multiplayerService.updatePlayerState(this.roomId, this.playerId, {
      wave: round,
      lives: this.lives,
      money: this.money,
      towers: this.towers.length,
      isAlive: true,
      waveCompleted: true,
    });

    this.pushTowerDetails();

    // 웨이브 완료 신호 (이게 가야 다음 페이즈로 넘어감)
    await multiplayerService.markWaveCompleted(this.roomId, this.playerId);
  }

  // ─── 웨이브 후처리 ──────────────────────────────────────────────────────────

  private async postWaveProcessing(wave: number) {
    // 1. 전원 HP 완전 회복 (healAllTowers와 동일)
    this.towers = this.towers.map(t => ({
      ...t,
      currentHp: t.maxHp,
      isFainted: false,
    }));

    // 2. 레벨업 (확률 기반, 가장 강한 타워 우선)
    if (Math.random() < this.cfg.levelUpChance) {
      this.levelUpBestTower();
    }

    // 3. 진화 시도
    if (Math.random() < this.cfg.evolvePriority) {
      await this.tryEvolve();
    }

    // 4. hard: 5의 배수 웨이브에서 메가진화
    if (this.difficulty === 'hard' && wave % 5 === 0) {
      await this.tryMegaEvolve();
    }
  }

  // ─── 쇼핑 턴 ────────────────────────────────────────────────────────────────

  private async doShoppingTurn() {
    if (!this.isAlive) return;

    // 기절 회복 먼저
    this.healFainted();

    // 슬롯 있으면 구매
    if (this.towers.length < MAX_TOWERS) {
      await this.buyPokemon();
    }

    // hard: 팀 강화
    if (this.cfg.upgradeTeam && this.towers.length === MAX_TOWERS) {
      await this.upgradeWeakest();
    }
  }

  // ─── 포켓몬 구매 ────────────────────────────────────────────────────────────

  private async buyPokemon() {
    if (this.money < ENTRY_FEE + RARITY_COST['Bronze']) return;

    const candidates = await this.generateCandidates();
    if (candidates.length === 0) return;

    const picked = this.pickCandidate(candidates);
    if (!picked || ENTRY_FEE + picked.cost > this.money) return;

    // 배치 위치
    const pos = this.findEmptyTile();
    if (!pos) return;

    try {
      const data = await pokeAPI.getPokemon(picked.pokemonId);

      // 기술 선택
      const move = await this.pickMove(data.moves, data.types);

      // 차감
      this.money -= ENTRY_FEE + picked.cost;

      // 타워 생성
      const tower = this.makeTower(data, pos, move, picked.rarity);
      this.towers.push(tower);

      await multiplayerService.updatePlayerState(this.roomId, this.playerId, {
        money: this.money,
        towers: this.towers.length,
      });
      this.pushTowerDetails();

    } catch (err) {
      // 실패 시 환불
      console.warn(`[AI:${this.playerId}] buy failed`, err);
    }
  }

  // ─── 후보 생성 ──────────────────────────────────────────────────────────────

  private async generateCandidates(): Promise<AICandidate[]> {
    const totalAttempts = 3 + this.cfg.rerollCount;
    const results: AICandidate[] = [];

    for (let i = 0; i < totalAttempts; i++) {
      try {
        // 가중치 랜덤 (레어도 분포 반영)
        const id = await pokeAPI.getRandomPokemonIdWithRarity();
        const rarity = await pokeAPI.getRarity(id);
        const cost = RARITY_COST[rarity];
        if (ENTRY_FEE + cost > this.money) continue; // 살 수 없으면 스킵

        // 스탯은 캐시에서 (getPokemon은 캐시 우선)
        const data = await pokeAPI.getPokemon(id);
        const score = this.scoreCandidate(data.stats, data.types, cost, rarity);
        results.push({ pokemonId: id, rarity, cost, score });
      } catch {
        // 무시
      }
    }
    return results;
  }

  // ─── 포켓몬 평가 ────────────────────────────────────────────────────────────

  private scoreCandidate(
    stats: { hp: number; attack: number; defense: number; specialAttack: number; specialDefense: number; speed: number },
    types: string[],
    cost: number,
    rarity: PokemonRarity,
  ): number {
    const total = stats.hp + stats.attack + stats.defense +
      stats.specialAttack + stats.specialDefense + stats.speed;
    const isEarly = this.wave <= 10;

    let score = 0;
    score += total * (isEarly ? 0.4 : 0.8);
    score += (stats.attack + stats.specialAttack) * 0.6;    // 공격력 가중치
    score += (total / Math.max(1, cost)) * 60;              // 가성비
    score += RARITY_SCORE[rarity] * 20;

    // 시너지 점수
    if (this.cfg.synergyWeight > 0) {
      score += this.calcTypeSynergyScore(types) * this.cfg.synergyWeight * 40;
    }

    // easy는 의도적 노이즈
    if (this.difficulty === 'easy') {
      score *= 0.3 + Math.random() * 1.4;
    }

    return score;
  }

  private calcTypeSynergyScore(types: string[]): number {
    const typeCounts: Record<string, number> = {};
    for (const t of this.towers) {
      for (const type of t.types) {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    }
    let bonus = 0;
    for (const type of types) {
      const after = (typeCounts[type] || 0) + 1;
      // 시너지 달성 직전(2→2, 4→4, 6→6)이면 높은 보너스
      if (after === 2 || after === 4 || after === 6) bonus += 3;
      else bonus += 0.5;
    }
    return bonus;
  }

  // ─── 후보 선택 ──────────────────────────────────────────────────────────────

  private pickCandidate(candidates: AICandidate[]): AICandidate | null {
    const sorted = [...candidates].sort((a, b) => b.score - a.score);
    const poolSize = Math.min(this.cfg.pickTopN, sorted.length);
    if (poolSize === 0) return null;
    return sorted[Math.floor(Math.random() * poolSize)];
  }

  // ─── 기술 선택 ──────────────────────────────────────────────────────────────

  private async pickMove(moveNames: string[], pokemonTypes: string[]): Promise<any> {
    const fallback = {
      name: 'tackle', displayName: '몸통박치기',
      type: 'normal', power: 40, accuracy: 100,
      damageClass: 'physical', effectChance: null,
    };

    const attackMoves: any[] = [];
    for (const name of moveNames.slice(0, 15)) {
      try {
        const m = await pokeAPI.getMove(name);
        if (m.damageClass !== 'status' && (m.power || 0) > 0) {
          attackMoves.push(m);
        }
      } catch { /* 무시 */ }
      if (attackMoves.length >= 5) break; // 충분하면 중단
    }

    if (attackMoves.length === 0) return fallback;

    // hard: STAB 우선, power 최대
    if (this.difficulty === 'hard') {
      const stab = attackMoves.filter(m => pokemonTypes.includes(m.type));
      const pool = stab.length > 0 ? stab : attackMoves;
      return pool.sort((a, b) => (b.power || 0) - (a.power || 0))[0];
    }

    // normal: power 상위 3개 중 랜덤
    const sorted = attackMoves.sort((a, b) => (b.power || 0) - (a.power || 0));
    const top = sorted.slice(0, Math.min(3, sorted.length));
    return top[Math.floor(Math.random() * top.length)];
  }

  // ─── 타워 생성 ──────────────────────────────────────────────────────────────

  private makeTower(
    data: { id: number; name: string; displayName: string; types: string[]; sprite: string; stats: any; moves: string[] },
    pos: { x: number; y: number },
    moveData: any,
    rarity: PokemonRarity,
  ): GamePokemon {
    const effect: MoveEffect = { type: 'damage' };
    const move: GameMove = {
      name: moveData.name,
      displayName: moveData.displayName || moveData.name,
      type: moveData.type || 'normal',
      power: moveData.power || 40,
      accuracy: moveData.accuracy || 100,
      damageClass: (moveData.damageClass as any) || 'physical',
      effect,
      cooldown: 2.0,
      currentCooldown: 0,
      isAOE: false,
    };

    return {
      id: `ai_${this.playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      pokemonId: data.id,
      name: data.name,
      displayName: data.displayName,
      level: 1,
      experience: 0,
      maxHp: data.stats.hp,
      currentHp: data.stats.hp,
      baseAttack: data.stats.attack,
      attack: data.stats.attack,
      defense: data.stats.defense,
      specialAttack: data.stats.specialAttack,
      specialDefense: data.stats.specialDefense,
      speed: data.stats.speed,
      position: pos,
      range: 3,
      equippedMoves: [move],
      types: data.types,
      sprite: data.sprite,
      isFainted: false,
      targetEnemyId: null,
      sellValue: RARITY_COST[rarity],
      kills: 0,
      damageDealt: 0,
      gender: 'genderless',
      ability: undefined,
      rejectedMoves: [],
      rarity,
    };
  }

  // ─── 레벨업 ─────────────────────────────────────────────────────────────────

  private levelUpBestTower() {
    const alive = this.towers.filter(t => !t.isFainted && t.level < 100);
    if (alive.length === 0) return;

    // hard: 레어도×레벨 점수 최고 타워 / easy: 랜덤
    let target: GamePokemon;
    if (this.difficulty === 'easy') {
      target = alive[Math.floor(Math.random() * alive.length)];
    } else {
      target = alive.sort((a, b) =>
        (b.level * RARITY_SCORE[b.rarity || 'Bronze']) -
        (a.level * RARITY_SCORE[a.rarity || 'Bronze'])
      )[0];
    }

    const idx = this.towers.indexOf(target);
    if (idx === -1) return;

    const M = 1.05;
    this.towers[idx] = {
      ...target,
      level: target.level + 1,
      experience: target.level * 100,
      maxHp:          Math.floor(target.maxHp          * M),
      currentHp:      Math.floor(target.currentHp      * M),
      attack:         Math.floor(target.attack          * M),
      baseAttack:     Math.floor(target.baseAttack      * M),
      defense:        Math.floor(target.defense         * M),
      specialAttack:  Math.floor(target.specialAttack   * M),
      specialDefense: Math.floor(target.specialDefense  * M),
    };
  }

  // ─── 진화 ────────────────────────────────────────────────────────────────────

  private async tryEvolve() {
    for (let i = 0; i < this.towers.length; i++) {
      const t = this.towers[i];
      const evos = EVOLUTION_CHAINS.filter(e =>
        e.from === t.pokemonId && !e.item && (!e.level || t.level >= e.level)
      );
      if (evos.length === 0) continue;

      try {
        const toId = evos[0].to;
        const d = await pokeAPI.getPokemon(toId);
        const M = Math.pow(1.05, t.level - 1);
        const hpRatio = t.currentHp / t.maxHp;
        const newMax = Math.floor(d.stats.hp * M);

        this.towers[i] = {
          ...t,
          pokemonId: d.id, name: d.name, displayName: d.displayName,
          sprite: d.sprite, types: d.types,
          maxHp:          newMax,
          currentHp:      Math.floor(newMax * hpRatio),
          baseAttack:     Math.floor(d.stats.attack       * M),
          attack:         Math.floor(d.stats.attack       * M),
          defense:        Math.floor(d.stats.defense      * M),
          specialAttack:  Math.floor(d.stats.specialAttack  * M),
          specialDefense: Math.floor(d.stats.specialDefense * M),
          speed: d.stats.speed,
        };
        break; // 웨이브당 1마리만
      } catch { /* 무시 */ }
    }
  }

  private async tryMegaEvolve() {
    for (let i = 0; i < this.towers.length; i++) {
      const t = this.towers[i];
      const mega = canMegaEvolve(t.pokemonId, '');
      if (!mega) continue;
      try {
        const d = await pokeAPI.getPokemon(mega.to);
        const M = Math.pow(1.05, t.level - 1);
        this.towers[i] = {
          ...t,
          pokemonId: d.id, name: d.name, displayName: d.displayName,
          sprite: d.sprite, types: d.types,
          maxHp:          Math.floor(d.stats.hp          * M),
          currentHp:      Math.floor(d.stats.hp          * M),
          baseAttack:     Math.floor(d.stats.attack       * M),
          attack:         Math.floor(d.stats.attack       * M),
          defense:        Math.floor(d.stats.defense      * M),
          specialAttack:  Math.floor(d.stats.specialAttack  * M),
          specialDefense: Math.floor(d.stats.specialDefense * M),
          speed: d.stats.speed,
        };
        break;
      } catch { /* 무시 */ }
    }
  }

  // ─── 팀 강화 (hard) ──────────────────────────────────────────────────────────

  private async upgradeWeakest() {
    if (this.money < ENTRY_FEE + RARITY_COST['Silver'] + 50) return;

    const weakestIdx = this.towers.reduce((minI, t, i) => {
      const s = t.level * RARITY_SCORE[t.rarity || 'Bronze'];
      return s < this.towers[minI].level * RARITY_SCORE[this.towers[minI].rarity || 'Bronze'] ? i : minI;
    }, 0);

    const weakScore = this.towers[weakestIdx].level * RARITY_SCORE[this.towers[weakestIdx].rarity || 'Bronze'];

    const candidates = await this.generateCandidates();
    if (candidates.length === 0) return;
    const best = candidates.sort((a, b) => b.score - a.score)[0];

    // 1레벨 기준으로 최소 2배 강하지 않으면 교체 안 함
    const newScore = 1 * RARITY_SCORE[best.rarity];
    if (newScore < weakScore * 1.5) return;

    // 약한 타워 판매
    const sell = this.towers[weakestIdx];
    const sellPrice = Math.max(sell.level * 20, Math.floor((sell.sellValue || 50) * 0.6));
    this.towers.splice(weakestIdx, 1);
    this.money += sellPrice;

    // 새 포켓몬 구매
    await this.buyPokemon();
  }

  // ─── 기절 회복 ───────────────────────────────────────────────────────────────

  private healFainted() {
    const fainted = this.towers
      .filter(t => t.isFainted)
      .sort((a, b) =>
        (b.level * RARITY_SCORE[b.rarity || 'Bronze']) -
        (a.level * RARITY_SCORE[a.rarity || 'Bronze'])
      );

    const count = this.difficulty === 'hard' ? Math.min(2, fainted.length) : 1;
    for (let i = 0; i < count; i++) {
      const idx = this.towers.findIndex(t => t.id === fainted[i].id);
      if (idx !== -1) {
        this.towers[idx] = {
          ...this.towers[idx],
          isFainted: false,
          currentHp: Math.floor(this.towers[idx].maxHp * 0.5),
        };
      }
    }
  }

  // ─── 배치 탐색 ───────────────────────────────────────────────────────────────

  private findEmptyTile(): { x: number; y: number } | null {
    const used = new Set(this.towers.map(t => `${t.position.x},${t.position.y}`));

    for (let row = 0; row < MAP_HEIGHT; row++) {
      for (let col = 0; col < MAP_WIDTH; col++) {
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        if (!used.has(`${x},${y}`) && !this.isOnPath(x, y)) {
          return { x, y };
        }
      }
    }
    return null;
  }

  private isOnPath(x: number, y: number): boolean {
    if (!this.mapData) return false;
    for (const path of this.mapData.paths) {
      for (let i = 0; i < path.length - 1; i++) {
        const s = path[i], e = path[i + 1];
        const minX = Math.min(s.x, e.x) - TILE_SIZE / 2;
        const maxX = Math.max(s.x, e.x) + TILE_SIZE / 2;
        const minY = Math.min(s.y, e.y) - TILE_SIZE / 2;
        const maxY = Math.max(s.y, e.y) + TILE_SIZE / 2;
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) return true;
      }
    }
    return false;
  }

  // ─── Firebase 동기화 ─────────────────────────────────────────────────────────

  private pushTowerDetails() {
    const details: TowerDetail[] = this.towers.map(t => ({
      pokemonId: t.pokemonId,
      name: t.displayName,
      level: t.level,
      sprite: t.sprite,
      position: t.position,
      currentHp: t.currentHp,
      maxHp: t.maxHp,
      isFainted: t.isFainted,
      attack: t.attack,
      defense: t.defense,
      types: t.types,
      speed: t.speed,
    }));
    multiplayerService.updatePlayerTowerDetails(this.roomId, this.playerId, details);
  }
}

// ─── AIPlayerManager ──────────────────────────────────────────────────────────

class AIPlayerManager {
  private players = new Map<string, AIPlayer>();

  startAI(roomId: string, playerId: string, difficulty: AIDifficulty, mapId: string) {
    if (this.players.has(playerId)) return;
    const ai = new AIPlayer(roomId, playerId, difficulty, mapId);
    ai.start();
    this.players.set(playerId, ai);
  }

  stopAI(playerId: string) {
    this.players.get(playerId)?.stop();
    this.players.delete(playerId);
  }

  stopAll() {
    this.players.forEach(ai => ai.stop());
    this.players.clear();
  }
}

export const aiPlayerManager = new AIPlayerManager();

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}