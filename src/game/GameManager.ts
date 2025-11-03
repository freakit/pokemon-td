// src/game/GameManager.ts

import { useGameStore } from '../store/gameStore';
import { GamePokemon, Enemy, Projectile, Position, Item, GameMove } from '../types/game';
import { calculateDamage, getTypeEffectiveness } from '../utils/typeEffectiveness';
import { canEvolve, EVOLUTION_STAT_BOOST } from '../data/evolution';
import { pokeAPI } from '../api/pokeapi';
import { saveService } from '../services/SaveService';
import { soundService } from '../services/SoundService';

export class GameManager {
  private static instance: GameManager;
  private waveEnemiesSpawned = false; // 🔴 추가: 웨이브 적 소환 플래그
  
  static getInstance() {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }
  
  update(dt: number) {
    const { isPaused, gameOver, gameSpeed } = useGameStore.getState();
    if (isPaused || gameOver) return;
    
    const delta = dt * gameSpeed;
    
    this.updateCooldowns(delta);
    this.updateStatusEffects(delta);
    this.updateEnemies(delta);
    this.updateTowers(delta);
    this.updateProjectiles(delta);
    this.updateDamageNumbers(delta);
    this.checkEvolutions();
    this.checkWaveComplete();
  }
  
  private updateCooldowns(dt: number) {
    const { towers } = useGameStore.getState();
    towers.forEach(tower => {
      if (tower.isFainted) return;
      tower.equippedMoves.forEach(m => {
        m.currentCooldown = Math.max(0, m.currentCooldown - dt);
      });
    });
  }
  
  private updateStatusEffects(dt: number) {
    const { towers, enemies } = useGameStore.getState();
    
    towers.forEach(t => {
      if (t.statusEffect) {
        const eff = t.statusEffect;
        eff.duration -= dt;
        if (eff.duration <= 0) {
          t.statusEffect = undefined;
          if (eff.type === 'burn') t.attack = t.baseAttack;
        } else if (eff.tickDamage) {
          t.currentHp = Math.max(0, t.currentHp - (eff.tickDamage * dt));
        }
      }
    });

    enemies.forEach(e => {
      if (e.statusEffect) {
        const eff = e.statusEffect;
        eff.duration -= dt;
        
        if (eff.type === 'burn') {
          e.attack = e.baseAttack * 0.5;
        }

        if (eff.duration <= 0) {
          e.statusEffect = undefined;
          if (eff.type === 'burn') e.attack = e.baseAttack;
        } else if (eff.tickDamage) {
          e.hp = Math.max(0, e.hp - (eff.tickDamage * dt));
          if (e.hp <= 0) this.killEnemy(e.id);
        }
      }
    });
  }

  private updateEnemies(dt: number) {
    const { enemies, towers, removeEnemy } = useGameStore.getState();
    
    // 🔴 추가: 적이 소환되었음을 표시
    if (enemies.length > 0) {
      this.waveEnemiesSpawned = true;
    }
    
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e) continue;

      if (e.statusEffect?.type === 'freeze' || e.statusEffect?.type === 'sleep') continue;
      
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      let speedMult = 1;
      if (e.statusEffect?.type === 'paralysis') speedMult = 0.5;

      let targetTower: GamePokemon | undefined = towers.find(t => t.id === e.targetTowerId && !t.isFainted);

      if (!targetTower) {
        targetTower = this.findTargetTower(e);
        e.targetTowerId = targetTower ? targetTower.id : undefined;
      }
      
      if (targetTower) {
        const dx = targetTower.position.x - e.position.x;
        const dy = targetTower.position.y - e.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= e.range) {
          this.enemyAttackTower(e, targetTower);
        } else {
          this.moveEnemy(e, targetTower.position, dt, speedMult);
        }
      } else {
        if (e.pathIndex < e.path.length) {
          const targetPos = e.path[e.pathIndex];
          if (this.moveEnemy(e, targetPos, dt, speedMult)) {
            e.pathIndex += 1;
          }
        } else {
          removeEnemy(e.id);
          useGameStore.setState(state => ({ lives: state.lives - 1 }));
          if (useGameStore.getState().lives <= 0) {
            useGameStore.setState({ gameOver: true, isWaveActive: false });
            soundService.playDefeatSound();
          }
        }
      }
    }
  }

  private moveEnemy(enemy: Enemy, targetPos: Position, dt: number, speedMult: number): boolean {
    const dx = targetPos.x - enemy.position.x;
    const dy = targetPos.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 5) {
      return true;
    }
    
    const move = enemy.moveSpeed * speedMult * dt;
    const ratio = Math.min(move / dist, 1);
    enemy.position.x += dx * ratio;
    enemy.position.y += dy * ratio;
    return false;
  }

  private findTargetTower(enemy: Enemy): GamePokemon | undefined {
    const { towers } = useGameStore.getState();
    let closestTower: GamePokemon | null = null;
    let minDiff = Infinity;

    for (const tower of towers) {
      if (tower.isFainted) continue;
      const dx = tower.position.x - enemy.position.x;
      const dy = tower.position.y - enemy.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDiff && dist <= enemy.range * 2) {
        minDiff = dist;
        closestTower = tower;
      }
    }
    return closestTower || undefined;
  }

  private enemyAttackTower(enemy: Enemy, tower: GamePokemon) {
    if (enemy.attackCooldown > 0) return;

    const { updateTower } = useGameStore.getState();
    const dmg = calculateDamage(enemy.attack, tower.defense, 20, 1, false); // 30 → 20으로 감소
    const newHp = Math.max(0, tower.currentHp - dmg);
    
    if (newHp <= 0) {
      updateTower(tower.id, { currentHp: 0, isFainted: true });
      enemy.targetTowerId = undefined;
    } else {
      tower.currentHp = newHp;
    }
    
    enemy.attackCooldown = 2.0;
  }
  
  private updateTowers(_dt: number) {
    const { towers, enemies } = useGameStore.getState();
    towers.forEach(tower => {
      if (tower.isFainted) return;
      
      const target = this.findTarget(tower, enemies);
      if (target) {
        const move = tower.equippedMoves.find(m => m.currentCooldown <= 0);
        if (move) {
          this.towerAttack(tower, target, move);
          soundService.playAttackSound(move.type);
        }
      }
    });
  }
  
  private findTarget(tower: GamePokemon, enemies: Enemy[]): Enemy | null {
    const range = tower.range * 64;
    let closestEnemy: Enemy | null = null;
    let minDiff = Infinity; 

    for (const enemy of enemies) {
        const dx = enemy.position.x - tower.position.x;
        const dy = enemy.position.y - tower.position.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist <= range && dist < minDiff) {
            minDiff = dist;
            closestEnemy = enemy;
        }
    }
    return closestEnemy;
  }
  
  private towerAttack(tower: GamePokemon, target: Enemy, move: GameMove) {
    const m = tower.equippedMoves.find(m => m.name === move.name);
    if (m) m.currentCooldown = m.cooldown;
    
    const attackPower = move.damageClass === 'physical' ? tower.attack : tower.specialAttack;
    
    useGameStore.getState().addProjectile({
      id: `proj-${Date.now()}-${Math.random()}`,
      from: { ...tower.position },
      to: { ...target.position },
      current: { ...tower.position },
      damage: move.power,
      type: move.type,
      effect: move.effect,
      speed: 400,
      targetId: target.id,
      isAOE: move.isAOE,
      aoeRadius: move.aoeRadius,
      attackPower,
      damageClass: move.damageClass,
    });
  }
  
  private updateProjectiles(dt: number) {
    const { projectiles, enemies, removeProjectile } = useGameStore.getState();
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      if (!proj) continue;

      const target = enemies.find(e => e.id === proj.targetId);
      if (!target) {
        removeProjectile(proj.id);
        continue;
      }
      
      const dx = target.position.x - proj.current.x;
      const dy = target.position.y - proj.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 10) {
        this.projectileHit(proj, target);
        removeProjectile(proj.id);
      } else {
        const move = proj.speed * dt;
        const ratio = Math.min(move / dist, 1);
        proj.current.x += dx * ratio;
        proj.current.y += dy * ratio;
      }
    }
  }
  
  private projectileHit(proj: Projectile, enemy: Enemy) {
    if (proj.isAOE && proj.aoeRadius) {
      this.applyAOEDamage(proj.current, proj.aoeRadius, proj);
    } else {
      this.applyDamage(proj, enemy);
    }
  }

  private applyAOEDamage(center: Position, radius: number, proj: Projectile) {
    const { enemies } = useGameStore.getState();
    const affectedEnemies = enemies.filter(e => {
      const dx = e.position.x - center.x;
      const dy = e.position.y - center.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
    
    affectedEnemies.forEach(e => this.applyDamage(proj, e));
  }

  private applyDamage(proj: Projectile, enemy: Enemy) {
    const { addDamageNumber } = useGameStore.getState();
    const eff = getTypeEffectiveness(proj.type, enemy.types);
    const isCrit = Math.random() < 0.1;
    
    const defense = proj.damageClass === 'physical' ? enemy.defense : enemy.specialDefense;
    const dmg = calculateDamage(proj.attackPower, defense, proj.damage, eff, isCrit);
    
    enemy.hp = Math.max(0, enemy.hp - dmg);
    
    addDamageNumber({
      id: `dmg-${Date.now()}-${Math.random()}`,
      value: dmg,
      position: { ...enemy.position },
      isCrit,
      lifetime: 1.0,
    });

    if (proj.effect.statusInflict && proj.effect.statusChance) {
      if (Math.random() * 100 < proj.effect.statusChance) {
        enemy.statusEffect = {
          type: proj.effect.statusInflict,
          duration: 5.0,
          tickDamage: (proj.effect.statusInflict === 'poison') ? 10 : undefined,
        };
      }
    }
    
    if (enemy.hp <= 0) this.killEnemy(enemy.id);
  }
  
  private killEnemy(id: string) {
    const { enemies, removeEnemy, addMoney, combo, addXpToTower } = useGameStore.getState();
    const enemy = enemies.find(e => e.id === id);
    if (enemy) {
      const reward = Math.floor(enemy.reward * (1 + combo * 0.1));
      addMoney(reward);
      removeEnemy(id);
      useGameStore.setState(state => ({ combo: state.combo + 1 }));
      
      const xpAmount = enemy.isBoss ? 50 : 10;
      useGameStore.getState().towers.forEach(t => {
        addXpToTower(t.id, xpAmount);
      });
      
      saveService.updateStats({
        enemiesKilled: saveService.load().stats.enemiesKilled + 1,
        totalMoneyEarned: saveService.load().stats.totalMoneyEarned + reward,
      });
    }
  }
  
  private updateDamageNumbers(dt: number) {
    const { damageNumbers, removeDamageNumber } = useGameStore.getState();
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
      const dmg = damageNumbers[i];
      if (!dmg) continue;
      dmg.lifetime -= dt;
      dmg.position.y -= 20 * dt;
      if (dmg.lifetime <= 0) {
        removeDamageNumber(dmg.id);
      }
    }
  }
  
  private checkEvolutions() {
    const { towers, updateTower } = useGameStore.getState();
    towers.forEach(async tower => {
      const evo = canEvolve(tower.pokemonId, tower.level);
      if (evo) {
        try {
          const newData = await pokeAPI.getPokemon(evo.to);
          updateTower(tower.id, {
            pokemonId: evo.to,
            name: newData.name,
            sprite: newData.sprite,
            types: newData.types,
            maxHp: Math.floor(tower.maxHp * EVOLUTION_STAT_BOOST.hp),
            currentHp: Math.floor(tower.currentHp * EVOLUTION_STAT_BOOST.hp),
            baseAttack: Math.floor(tower.baseAttack * EVOLUTION_STAT_BOOST.attack),
            attack: Math.floor(tower.attack * EVOLUTION_STAT_BOOST.attack),
            defense: Math.floor(tower.defense * EVOLUTION_STAT_BOOST.defense),
          });
          soundService.playEvolutionSound();
          saveService.updateStats({
            evolutionsAchieved: saveService.load().stats.evolutionsAchieved + 1,
          });
        } catch (e) {
          console.error('Evolution failed:', e);
        }
      }
    });
  }
  
  // 🔴 수정된 부분
  private checkWaveComplete() {
    const { enemies, isWaveActive, healAllTowers, setWaveEndItemPick } = useGameStore.getState();
    
    // 적이 실제로 소환된 적이 있고, 현재 웨이브가 활성화되어 있으며, 모든 적이 사라졌을 때만 보상
    if (isWaveActive && this.waveEnemiesSpawned && enemies.length === 0) {
      useGameStore.setState({ isWaveActive: false, combo: 0, isPaused: true });
      
      healAllTowers();

      const itemChoices: Item[] = [
        { id: 'gold_100', name: '100 골드', type: 'gold', cost: 0, effect: '즉시 100골드 획득', value: 100 },
        { id: 'rare_candy', name: '이상한사탕', type: 'candy', cost: 0, effect: '아군 1레벨 업' },
        { id: 'revive_shard', name: '기력의 조각', type: 'revive', cost: 0, effect: '기절한 아군 1마리를 50% HP로 부활' },
      ];
      setWaveEndItemPick(itemChoices);
      
      // 플래그 초기화
      this.waveEnemiesSpawned = false;
    }
  }
}