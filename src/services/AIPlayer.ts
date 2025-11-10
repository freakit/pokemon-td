// src/services/AIPlayer.ts
import { useGameStore } from '../store/gameStore';
import { WaveSystem } from '../game/WaveSystem';
import { pokeAPI } from '../api/pokeapi';
import { AIDifficulty } from '../types/multiplayer';
import { GamePokemon, GameMove, MoveEffect } from '../types/game';

export class AIPlayer {
  private playerId: string;
  private difficulty: AIDifficulty;
  private isRunning: boolean = false;
  private autoWaveInterval: NodeJS.Timeout | null = null;
  private autoPurchaseInterval: NodeJS.Timeout | null = null;

  constructor(playerId: string, difficulty: AIDifficulty) {
    this.playerId = playerId;
    this.difficulty = difficulty;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`AI Player ${this.playerId} (${this.difficulty}) started`);

    // 웨이브 자동 시작
    this.autoWaveInterval = setInterval(() => {
      this.tryStartWave();
    }, this.getWaveDelay());

    // 포켓몬 자동 구매 및 배치
    this.autoPurchaseInterval = setInterval(() => {
      this.tryPurchasePokemon();
    }, this.getPurchaseDelay());
  }

  stop() {
    this.isRunning = false;
    if (this.autoWaveInterval) {
      clearInterval(this.autoWaveInterval);
      this.autoWaveInterval = null;
    }
    if (this.autoPurchaseInterval) {
      clearInterval(this.autoPurchaseInterval);
      this.autoPurchaseInterval = null;
    }
    console.log(`AI Player ${this.playerId} stopped`);
  }

  private getWaveDelay(): number {
    // 난이도별 웨이브 시작 딜레이
    switch (this.difficulty) {
      case 'easy': return 15000; // 15초
      case 'normal': return 10000; // 10초
      case 'hard': return 7000; // 7초
      default: return 10000;
    }
  }

  private getPurchaseDelay(): number {
    // 난이도별 구매 딜레이
    switch (this.difficulty) {
      case 'easy': return 8000; // 8초
      case 'normal': return 5000; // 5초
      case 'hard': return 3000; // 3초
      default: return 5000;
    }
  }

  private tryStartWave() {
    const state = useGameStore.getState();
    
    // 이미 웨이브 진행 중이거나 게임이 끝났으면 시작 안 함
    if (state.isWaveActive || state.gameOver || state.lives <= 0) {
      return;
    }

    // 최소한의 타워가 있을 때만 웨이브 시작
    const minTowers = this.difficulty === 'easy' ? 2 : this.difficulty === 'normal' ? 3 : 4;
    if (state.towers.length >= minTowers) {
      state.nextWave();
      WaveSystem.getInstance().startWave(state.wave);
      console.log(`AI ${this.playerId} started wave ${state.wave}`);
    }
  }

private async tryPurchasePokemon() {
    const state = useGameStore.getState();
    // 게임이 끝났거나 돈이 부족하면 구매 안 함
    if (state.gameOver || state.lives <= 0 || state.money < 20) {
      return;
    }

    // 웨이브 진행 중이면 구매 안 함
    if (state.isWaveActive) {
      return;
    }

    // 최대 타워 수 제한
    const maxTowers = 20; // (GameCanvas.tsx의 6마리 제한과 다름, AI는 20마리로 설정되어 있음)
    if (state.towers.length >= maxTowers) {
      return;
    }

    try {
      // 난이도에 따라 포켓몬 선택 전략 다름
      let pokemonId: number;
      if (this.difficulty === 'easy') {
        // Easy: 랜덤으로 약한 포켓몬 선택
        pokemonId = Math.floor(Math.random() * 200) + 1;
      } else if (this.difficulty === 'normal') {
        // Normal: 중간 강도의 포켓몬 선택
        pokemonId = Math.floor(Math.random() * 500) + 1;
      } else {
        // Hard: 강한 포켓몬 선택 (높은 종족값)
        pokemonId = Math.floor(Math.random() * 500) + 500;
      }

      // 포켓몬 정보 가져오기
      const pokemonData = await pokeAPI.getPokemon(pokemonId);
      // 20골드 사용
      if (!state.spendMoney(20)) {
        return;
      }

      // 맵에서 빈 타일 찾기
      const emptyTile = this.findEmptyTile();
      if (!emptyTile) {
        // 빈 타일이 없으면 돈 환불
        state.addMoney(20);
        return;
      }

      // ⭐️ [수정] PokemonPicker와 동일하게 실제 기술 데이터를 가져오도록 로직 변경
      const moveNames = pokemonData.moves.slice(0, 10);
      let usableMove: any = null;
      
      for (const name of moveNames) {
        const move = await pokeAPI.getMove(name);
        if (move.damageClass !== 'status') {
          usableMove = move;
          break;
        }
      }
      
      if (!usableMove) {
        const lang = localStorage.getItem('language');
        usableMove = {
          name: 'tackle',
          displayName: lang === 'en' ? 'Tackle' : '몸통박치기',
          type: 'normal',
          power: 40,
          accuracy: 100,
          damageClass: 'physical',
          target: 'selected-pokemon',
          effectEntries: ['Inflicts regular damage with no additional effect.'],
          effectChance: null,
        };
      }
      
      const effect: MoveEffect = { type: 'damage' };
      const effectText = usableMove.effectEntries?.[0]?.toLowerCase() || '';

      if (effectText.includes('drain') || effectText.includes('recover') || effectText.includes('restore')) {
        if (effectText.includes('75%')) {
          effect.drainPercent = 0.75;
        } else {
          effect.drainPercent = 0.5;
        }
      }

      if (effectText.includes('burn')) {
        effect.statusInflict = 'burn';
        effect.statusChance = usableMove.effectChance;
      } else if (effectText.includes('paralyze') || effectText.includes('paralysis')) {
        effect.statusInflict = 'paralysis';
        effect.statusChance = usableMove.effectChance;
      } else if (effectText.includes('poison')) {
        effect.statusInflict = 'poison';
        effect.statusChance = usableMove.effectChance;
      } else if (effectText.includes('freeze') || effectText.includes('frozen')) {
        effect.statusInflict = 'freeze';
        effect.statusChance = usableMove.effectChance;
      } else if (effectText.includes('sleep')) {
        effect.statusInflict = 'sleep';
        effect.statusChance = usableMove.effectChance;
      } else if (effectText.includes('confus')) {
        effect.statusInflict = 'confusion';
        effect.statusChance = usableMove.effectChance;
      }
      
      if (effectText) {
        effect.additionalEffects = effectText;
      }

      const isAOE = [
        'all-opponents',
        'all-other-pokemon',
        'all-pokemon',
        'user-and-allies'
      ].includes(usableMove.target || '');

      const equippedMoves: GameMove[] = [{
        name: usableMove.name,
        displayName: usableMove.displayName,
        type: usableMove.type,
        power: usableMove.power || 40,
        accuracy: usableMove.accuracy || 100,
        damageClass: usableMove.damageClass,
        effect: effect,
        cooldown: 2.0,
        currentCooldown: 0,
        isAOE: isAOE,
        aoeRadius: isAOE ? 100 : undefined,
        manualCast: false,
      }];

      // ⭐️ [수정] GamePokemon 타입에 맞게 타워 생성 (equippedMoves 및 sellValue 수정)
      const newTower: GamePokemon = {
        id: `ai-tower-${Date.now()}-${Math.random()}`,
        pokemonId: pokemonData.id,
        name: pokemonData.name,
        displayName: pokemonData.name,
        level: 1,
        experience: 0,
        maxHp: pokemonData.stats.hp,
        currentHp: pokemonData.stats.hp,
        baseAttack: pokemonData.stats.attack,
        attack: pokemonData.stats.attack,
        defense: pokemonData.stats.defense,
        specialAttack: pokemonData.stats.specialAttack,
        specialDefense: pokemonData.stats.specialDefense,
        speed: pokemonData.stats.speed,
        position: emptyTile,
        range: 150, 
        equippedMoves: equippedMoves, 
        types: pokemonData.types,
        sprite: pokemonData.sprite,
        isFainted: false,
        targetEnemyId: null,
        sellValue: 50,               // ⭐️ [추가] 기본 판매 가격
        kills: 0,                    // ⭐️ [추가] 킬 수 초기화
        damageDealt: 0,              // ⭐️ [추가] 가한 데미지 초기화
        // AI는 gender, ability 등을 단순화
      };
      
      state.addTower(newTower);
      console.log(`AI ${this.playerId} purchased ${pokemonData.name} at ${emptyTile.x}, ${emptyTile.y}`);
    } catch (error) {
      console.error('AI failed to purchase pokemon:', error);
      // ⭐️ [수정] 구매 실패 시 20원 환불
      state.addMoney(20);
    }
  }

  private findEmptyTile(): { x: number; y: number } | null {
    const state = useGameStore.getState();
    
    // 맵 크기 (GameCanvas에서와 동일)
    const TILE_SIZE = 48;
    const CANVAS_WIDTH = 1200;
    const CANVAS_HEIGHT = 720;
    const GRID_COLS = Math.floor(CANVAS_WIDTH / TILE_SIZE);
    const GRID_ROWS = Math.floor(CANVAS_HEIGHT / TILE_SIZE);

    // 타워가 있는 위치들을 Set으로 저장
    const occupiedPositions = new Set(
      state.towers.map(t => `${t.position.x},${t.position.y}`)
    );

    // 빈 타일 찾기 (랜덤 시도)
    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
      const col = Math.floor(Math.random() * GRID_COLS);
      const row = Math.floor(Math.random() * GRID_ROWS);
      const x = col * TILE_SIZE + TILE_SIZE / 2;
      const y = row * TILE_SIZE + TILE_SIZE / 2;
      
      const key = `${x},${y}`;
      if (!occupiedPositions.has(key)) {
        return { x, y };
      }
    }

    return null;
  }
}

// AI 플레이어 관리자
class AIPlayerManager {
  private aiPlayers: Map<string, AIPlayer> = new Map();

  startAI(playerId: string, difficulty: AIDifficulty) {
    if (this.aiPlayers.has(playerId)) {
      return; // 이미 실행 중
    }

    const aiPlayer = new AIPlayer(playerId, difficulty);
    aiPlayer.start();
    this.aiPlayers.set(playerId, aiPlayer);
  }

  stopAI(playerId: string) {
    const aiPlayer = this.aiPlayers.get(playerId);
    if (aiPlayer) {
      aiPlayer.stop();
      this.aiPlayers.delete(playerId);
    }
  }

  stopAll() {
    this.aiPlayers.forEach(ai => ai.stop());
    this.aiPlayers.clear();
  }
}

export const aiPlayerManager = new AIPlayerManager();
