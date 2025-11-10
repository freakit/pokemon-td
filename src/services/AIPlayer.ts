// src/services/AIPlayer.ts
import { multiplayerService } from './MultiplayerService';
import { pokeAPI, PokemonData } from '../api/pokeapi';
import { AIDifficulty, TowerDetail } from '../types/multiplayer';
import { GamePokemon, GameMove, MoveEffect, Position, PokemonRarity } from '../types/game';
import { getMapById, MAPS } from '../data/maps';

const TILE_SIZE = 64;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 10;

const RARITY_SCORE: Record<PokemonRarity, number> = {
  'Bronze': 1,
  'Silver': 2,
  'Gold': 3,
  'Diamond': 4,
  'Master': 5,
  'Legend': 6
};

interface AIChoice {
  data: PokemonData;
  cost: number;
  rarity: PokemonRarity;
}

export class AIPlayer {
  private isRunning: boolean = false;
  private autoWaveInterval: NodeJS.Timeout | null = null;
  private autoPurchaseInterval: NodeJS.Timeout | null = null;
  private gameStateListener: (() => void) | null = null;

  private wave: number = 0;
  private money: number = 500;
  private lives: number = 50;
  private towers: GamePokemon[] = [];
  private isAlive: boolean = true;
  private isWaveActive: boolean = false;
  private mapData = getMapById(this.mapId) || MAPS[0];

  constructor(
    private roomId: string,
    private playerId: string,
    private difficulty: AIDifficulty,
    private mapId: string
  ) {}

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.gameStateListener = multiplayerService.onGameStateUpdate(this.roomId, (players) => {
      const myState = players.find(p => p.userId === this.playerId);
      if (myState) {
        this.money = myState.money;
        this.lives = myState.lives;
        this.isAlive = myState.isAlive;
        
        if (!this.isAlive && this.isRunning) {
          this.stop();
        }
      }
    });

    this.autoWaveInterval = setInterval(() => {
      this.tryStartWave();
    }, this.getWaveDelay());

    this.autoPurchaseInterval = setInterval(() => {
      this.tryReviveFaintedPokemon();
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
    if (this.gameStateListener) {
      this.gameStateListener();
      this.gameStateListener = null;
    }
  }

  private getWaveDelay(): number {
    switch (this.difficulty) {
      case 'easy': return 20000;
      case 'normal': return 15000;
      case 'hard': return 10000;
      default: return 15000;
    }
  }

  private getPurchaseDelay(): number {
    switch (this.difficulty) {
      case 'easy': return 10000;
      case 'normal': return 7000;
      case 'hard': return 4000;
      default: return 7000;
    }
  }

  private calculateTowerPower(): number {
    let totalPower = 0;
    this.towers.forEach(tower => {
      if (!tower.isFainted) {
        totalPower += tower.level * (RARITY_SCORE[tower.rarity || 'Bronze']) * 10;
      }
    });
    return totalPower;
  }

  private calculateWavePower(wave: number): number {
    const basePower = 100;
    return basePower * Math.pow(1.25, wave - 1);
  }

  private updateTowerDetails() {
    const towerDetails: TowerDetail[] = this.towers.map(t => ({
      pokemonId: t.pokemonId,
      name: t.displayName,
      level: t.level,
      sprite: t.sprite,
      position: t.position,
      currentHp: t.currentHp,
      maxHp: t.maxHp,
      isFainted: t.isFainted
    }));
    multiplayerService.updatePlayerTowerDetails(this.roomId, this.playerId, towerDetails);
  }

  private runWaveEndLogic() {
    if (!this.isAlive) return;

    const faintedTowers = this.towers.filter(t => t.isFainted);
    const aliveTowers = this.towers.filter(t => !t.isFainted);

    // 전략적 결정: 기절한 타워가 있을 때
    if (faintedTowers.length > 0) {
      // 난이도에 따라 부활시킬 타워 선택
      faintedTowers.sort((a, b) => {
        // 레벨과 희귀도를 함께 고려
        const scoreA = b.level * RARITY_SCORE[b.rarity || 'Bronze'];
        const scoreB = a.level * RARITY_SCORE[a.rarity || 'Bronze'];
        return scoreA - scoreB;
      });
      
      // 난이도에 따라 여러 타워 부활 가능
      const reviveCount = this.difficulty === 'hard' ? Math.min(2, faintedTowers.length) : 1;
      
      for (let i = 0; i < reviveCount; i++) {
        const target = faintedTowers[i];
        target.isFainted = false;
        target.currentHp = target.maxHp * 0.5;
      }
    } else if (aliveTowers.length > 0) {
      // 기절한 타워가 없으면 레벨업 전략
      // 레벨이 높고 희귀도가 높은 타워를 우선 레벨업 (캐리 육성 전략)
      aliveTowers.sort((a, b) => {
        const scoreA = a.level * RARITY_SCORE[a.rarity || 'Bronze'] * 2;
        const scoreB = b.level * RARITY_SCORE[b.rarity || 'Bronze'] * 2;
        return scoreB - scoreA;
      });
      
      const target = aliveTowers[0];
      
      if (target.level < 100) {
        const newLevel = target.level + 1;
        const statMultiplier = 1.05;
        target.level = newLevel;
        target.experience = (newLevel - 1) * 100;
        target.maxHp = Math.floor(target.maxHp * statMultiplier);
        target.baseAttack = Math.floor(target.baseAttack * statMultiplier);
        target.attack = target.baseAttack;
        target.defense = Math.floor(target.defense * statMultiplier);
        target.specialAttack = Math.floor(target.specialAttack * statMultiplier);
        target.specialDefense = Math.floor(target.specialDefense * statMultiplier);
      }
    }

    // 모든 살아있는 타워 체력 회복
    this.towers.forEach(tower => {
      if (!tower.isFainted) {
        tower.currentHp = tower.maxHp;
      }
    });
    
    this.updateTowerDetails();
  }
  
  private simulateWaveCombat() {
    const towerPower = this.calculateTowerPower();
    const wavePower = this.calculateWavePower(this.wave);
    
    const waveDuration = 15000 + this.wave * 500;
    const combatTickInterval = 1000; // 1초마다 전투 틱
    const combatTicks = Math.floor(waveDuration / combatTickInterval);

    let currentTick = 0;
    const combatInterval = setInterval(() => {
      if (!this.isRunning || !this.isAlive) {
        clearInterval(combatInterval);
        return;
      }

      currentTick++;
      
      // 웨이브가 강할수록 타워들이 더 많은 데미지를 받음
      const aliveTowers = this.towers.filter(t => !t.isFainted);
      if (aliveTowers.length > 0 && towerPower < wavePower) {
        const damagePerTick = (wavePower - towerPower) / combatTicks / aliveTowers.length;
        
        // 무작위로 타워들이 데미지를 받음
        aliveTowers.forEach(tower => {
          // 레벨이 낮은 타워일수록 더 많은 데미지를 받을 확률이 높음
          const damageChance = 0.3 + (0.5 / tower.level);
          if (Math.random() < damageChance) {
            const damage = damagePerTick * (1 + Math.random());
            tower.currentHp = Math.max(0, tower.currentHp - damage);
            
            if (tower.currentHp <= 0) {
              tower.isFainted = true;
              tower.currentHp = 0;
            }
          }
        });
        
        this.updateTowerDetails();
      }

      // 마지막 틱
      if (currentTick >= combatTicks) {
        clearInterval(combatInterval);
        this.finishWave(towerPower, wavePower);
      }
    }, combatTickInterval);
  }

  private finishWave(towerPower: number, wavePower: number) {
    if (!this.isRunning) return;

    this.isWaveActive = false;
    let moneyEarned = 0;

    // 타워가 모두 기절했는지 확인
    const aliveTowers = this.towers.filter(t => !t.isFainted);
    
    if (aliveTowers.length === 0 && this.towers.length > 0) {
      // 모든 타워가 기절 - 큰 라이프 손실
      const livesLost = Math.max(3, Math.floor(this.wave * 0.5));
      this.lives -= livesLost;
      moneyEarned = Math.floor((100 + this.wave * 10) * 0.3);
      this.money += moneyEarned;
    } else if (towerPower >= wavePower) {
      // 완전 승리
      moneyEarned = 100 + this.wave * 10;
      this.money += moneyEarned;
    } else {
      // 부분 승리
      const powerDeficit = wavePower - towerPower;
      const livesLost = Math.max(1, Math.floor((powerDeficit / wavePower) * 10));
      
      this.lives -= livesLost;
      moneyEarned = Math.floor((100 + this.wave * 10) * (towerPower / wavePower));
      this.money += moneyEarned;
    }
    
    if (this.lives <= 0) {
      this.lives = 0;
      this.isAlive = false;
      multiplayerService.playerDefeated(this.roomId, this.playerId);
      this.stop();
      return;
    }

    this.runWaveEndLogic();

    if (this.isAlive) {
      multiplayerService.updatePlayerState(this.roomId, this.playerId, { 
        money: this.money,
        lives: this.lives
      });
    }
  }

  private tryStartWave() {
    if (this.isWaveActive || !this.isAlive) {
      return;
    }

    const aliveTowers = this.towers.filter(t => !t.isFainted);
    const faintedTowers = this.towers.filter(t => t.isFainted);
    
    // 난이도에 따른 최소 타워 개수
    const minTowers = this.difficulty === 'easy' ? 0 : this.difficulty === 'normal' ? 1 : 2;
    
    // 기본 조건: 최소 타워 개수
    if (aliveTowers.length < minTowers && this.wave > 0) {
      return;
    }

    // 전략적 대기: 기절한 타워가 많으면 부활을 기다림
    if (this.wave > 5) {
      const totalTowers = this.towers.length;
      if (totalTowers > 0) {
        const faintedRatio = faintedTowers.length / totalTowers;
        
        // 기절한 타워가 50% 이상이면 웨이브 시작 보류 (부활 대기)
        if (faintedRatio >= 0.5 && this.difficulty !== 'easy') {
          return;
        }
      }
    }

    // 타워들의 평균 체력 확인 (너무 낮으면 대기)
    if (aliveTowers.length > 0 && this.wave > 3) {
      const avgHpRatio = aliveTowers.reduce((sum, t) => sum + (t.currentHp / t.maxHp), 0) / aliveTowers.length;
      
      // 평균 체력이 40% 미만이면 회복 대기 (hard 난이도에서만)
      if (avgHpRatio < 0.4 && this.difficulty === 'hard') {
        return;
      }
    }

    this.isWaveActive = true;
    this.wave++;
    multiplayerService.updatePlayerState(this.roomId, this.playerId, { wave: this.wave });
    
    this.simulateWaveCombat();
  }

  private tryReviveFaintedPokemon() {
    if (!this.isAlive) return;
    
    const faintedTowers = this.towers.filter(t => t.isFainted);
    if (faintedTowers.length === 0) return;

    // 레벨과 희귀도가 높은 타워를 우선 부활
    faintedTowers.sort((a, b) => {
      const scoreA = b.level * RARITY_SCORE[b.rarity || 'Bronze'];
      const scoreB = a.level * RARITY_SCORE[a.rarity || 'Bronze'];
      return scoreA - scoreB;
    });

    let changed = false;
    
    // 가장 가치있는 타워부터 부활 시도
    for (const target of faintedTowers) {
      const reviveCost = target.level * 10;
      
      // 골드가 충분하고, 전체 골드의 30% 이상을 사용하지 않는 선에서 부활
      const maxSpendable = this.money * 0.3;
      
      if (this.money >= reviveCost && reviveCost <= maxSpendable) {
        this.money -= reviveCost;
        target.isFainted = false;
        target.currentHp = target.maxHp * 0.5;
        changed = true;
        
        // 난이도에 따라 한 번에 부활시키는 개수 제한
        if (this.difficulty === 'easy') break; // easy는 한 번에 1개만
        // normal, hard는 골드가 허락하는 한 여러 개 부활
      }
    }
    
    if (changed) {
      multiplayerService.updatePlayerState(this.roomId, this.playerId, { money: this.money });
      this.updateTowerDetails();
    }
  }

  private async tryPurchasePokemon() {
    const entryFee = 20;
    
    // 기본 조건 체크
    if (this.isWaveActive || !this.isAlive || this.towers.length >= 6) {
      return;
    }

    // 전략적 골드 관리
    const faintedCount = this.towers.filter(t => t.isFainted).length;
    const reviveCostEstimate = faintedCount * 50; // 대략적인 부활 비용
    
    // 기절한 타워가 많으면 구매 보류 (부활에 집중)
    if (faintedCount >= 2 && this.money < (reviveCostEstimate + 300 + entryFee)) {
      return;
    }

    // 최소 구매 금액 계산 (초반/후반 전략)
    const isEarlyGame = this.wave <= 10;
    const minMoneyForPurchase = isEarlyGame ? 200 : 400;
    
    if (this.money < (minMoneyForPurchase + entryFee)) {
      return;
    }

    try {
      this.money -= entryFee;
      multiplayerService.updatePlayerState(this.roomId, this.playerId, { money: this.money });

      const id1 = await pokeAPI.getRandomPokemonIdWithRarity();
      const id2 = await pokeAPI.getRandomPokemonIdWithRarity();
      const id3 = await pokeAPI.getRandomPokemonIdWithRarity();

      const data = await Promise.all([
        pokeAPI.getPokemon(id1),
        pokeAPI.getPokemon(id2),
        pokeAPI.getPokemon(id3)
      ]);

      const choices: AIChoice[] = await Promise.all(data.map(async (p) => {
        const statTotal = p.stats.hp + p.stats.attack + p.stats.defense + 
                         p.stats.specialAttack + p.stats.specialDefense + p.stats.speed;
        const cost = Math.floor(25 + (statTotal / 600) * 200);
        const rarity = await pokeAPI.getRarity(p.id);
        return { data: p, cost, rarity };
      }));

      const affordableChoices = choices.filter(c => c.cost <= this.money);
      if (affordableChoices.length === 0) {
        return;
      }

      let selectedChoice: AIChoice;
      
      // 난이도 및 게임 단계에 따른 전략
      if (this.difficulty === 'easy') {
        // Easy: 항상 가장 저렴한 것
        selectedChoice = affordableChoices.reduce((prev, curr) => (prev.cost < curr.cost ? prev : curr));
      } else if (this.difficulty === 'normal') {
        // Normal: 초반에는 가성비, 후반에는 희귀도
        if (isEarlyGame || this.towers.length < 3) {
          // 가성비 좋은 선택 (희귀도/비용 비율)
          selectedChoice = affordableChoices.sort((a, b) => {
            const ratioA = RARITY_SCORE[a.rarity] / (a.cost + 1);
            const ratioB = RARITY_SCORE[b.rarity] / (b.cost + 1);
            return ratioB - ratioA;
          })[0];
        } else {
          // 희귀도 우선
          selectedChoice = affordableChoices.sort((a, b) => 
            RARITY_SCORE[b.rarity] - RARITY_SCORE[a.rarity]
          )[0];
        }
      } else {
        // Hard: 항상 최고 희귀도, 단 초반에는 타워 개수 우선
        if (isEarlyGame && this.towers.length < 4) {
          selectedChoice = affordableChoices.sort((a, b) => {
            const ratioA = RARITY_SCORE[a.rarity] / (a.cost + 1);
            const ratioB = RARITY_SCORE[b.rarity] / (b.cost + 1);
            return ratioB - ratioA;
          })[0];
        } else {
          selectedChoice = affordableChoices.sort((a, b) => 
            RARITY_SCORE[b.rarity] - RARITY_SCORE[a.rarity]
          )[0];
        }
      }
      
      this.money -= selectedChoice.cost;
      multiplayerService.updatePlayerState(this.roomId, this.playerId, { money: this.money });

      const pokemonData = selectedChoice.data;
      const emptyTile = this.findEmptyTile();
      if (!emptyTile) {
        this.money += selectedChoice.cost;
        multiplayerService.updatePlayerState(this.roomId, this.playerId, { money: this.money });
        return;
      }

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
        usableMove = {
          name: 'tackle',
          displayName: '몸통박치기',
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
        isAOE: false,
        manualCast: false,
      }];

      const newTower: GamePokemon = {
        id: `ai-tower-${Date.now()}-${Math.random()}`,
        pokemonId: pokemonData.id,
        name: pokemonData.name,
        displayName: pokemonData.displayName,
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
        range: 3,
        equippedMoves: equippedMoves, 
        types: pokemonData.types,
        sprite: pokemonData.sprite,
        isFainted: false,
        targetEnemyId: null,
        sellValue: 50,
        kills: 0,
        damageDealt: 0,
        gender: 'genderless',
        ability: undefined,
        rejectedMoves: [],
        rarity: selectedChoice.rarity,
      };

      this.towers.push(newTower);

      multiplayerService.updatePlayerState(this.roomId, this.playerId, { towers: this.towers.length });
      this.updateTowerDetails();

    } catch (error) {
      this.money += entryFee;
      multiplayerService.updatePlayerState(this.roomId, this.playerId, { money: this.money });
    }
  }

  private isPathTile = (x: number, y: number): boolean => {
    if (!this.mapData) return false;
    for (const path of this.mapData.paths) {
      for (let i = 0; i < path.length - 1; i++) {
        const start = path[i];
        const end = path[i + 1];

        const minX = Math.min(start.x, end.x) - TILE_SIZE / 2;
        const maxX = Math.max(start.x, end.x) + TILE_SIZE / 2;
        const minY = Math.min(start.y, end.y) - TILE_SIZE / 2;
        const maxY = Math.max(start.y, end.y) + TILE_SIZE / 2;

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          return true;
        }
      }
    }
    return false;
  };

  private isValidPlacement = (x: number, y: number): boolean => {
    if (x < 0 || x >= MAP_WIDTH * TILE_SIZE || y < 0 || y >= MAP_HEIGHT * TILE_SIZE) {
      return false;
    }
    if (this.isPathTile(x, y)) {
      return false;
    }
    for (const tower of this.towers) {
      const dx = Math.abs(tower.position.x - x);
      const dy = Math.abs(tower.position.y - y);
      if (dx < TILE_SIZE / 2 && dy < TILE_SIZE / 2) {
        return false;
      }
    }
    return true;
  };

  private findEmptyTile(): Position | null {
    const maxAttempts = 50;
    for (let i = 0; i < maxAttempts; i++) {
      const gridX = Math.floor(Math.random() * MAP_WIDTH);
      const gridY = Math.floor(Math.random() * MAP_HEIGHT);
      const x = gridX * TILE_SIZE + TILE_SIZE / 2;
      const y = gridY * TILE_SIZE + TILE_SIZE / 2;

      if (this.isValidPlacement(x, y)) {
        return { x, y };
      }
    }
    
    for (let gridX = 0; gridX < MAP_WIDTH; gridX++) {
      for (let gridY = 0; gridY < MAP_HEIGHT; gridY++) {
        const x = gridX * TILE_SIZE + TILE_SIZE / 2;
        const y = gridY * TILE_SIZE + TILE_SIZE / 2;
        if (this.isValidPlacement(x, y)) {
          return { x, y };
        }
      }
    }

    return null;
  }
}

class AIPlayerManager {
  private aiPlayers: Map<string, AIPlayer> = new Map();

  startAI(roomId: string, playerId: string, difficulty: AIDifficulty, mapId: string) {
    if (this.aiPlayers.has(playerId)) {
      return;
    }

    const aiPlayer = new AIPlayer(roomId, playerId, difficulty, mapId);
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