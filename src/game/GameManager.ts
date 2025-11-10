// src/game/GameManager.ts

import { useGameStore } from '../store/gameStore';
import { GamePokemon, Enemy, Projectile, Position, Item, GameMove } from '../types/game';
import { calculateDamage, getTypeEffectiveness, hasSTAB } from '../utils/typeEffectiveness';
import { hasMegaEvolution, hasGigantamax, MEGA_EVOLUTIONS, GIGANTAMAX_FORMS } from '../data/evolution';
import { saveService } from '../services/SaveService';
import { soundService } from '../services/SoundService';
import { getCriticalChance, getAOEDamageMultiplier } from '../utils/abilities';
import { getBuffedStats } from '../utils/synergyManager';
// 1. 필요한 서비스 및 데이터 임포트
import { databaseService } from '../services/DatabaseService';
import { getMapById } from '../data/maps';
import { pokeAPI } from '../api/pokeapi';


export class GameManager {
  private static instance: GameManager;
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

    // 2. gameTime 업데이트
    useGameStore.getState().incrementGameTime(dt);
    
    this.updateCooldowns(delta);
    this.updateStatusEffects(delta);
    this.updateEnemies(delta);
    this.updateTowers(delta);
    this.updateProjectiles(delta);
    this.updateDamageNumbers(delta);
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
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (!e) continue;

      if (e.statusEffect?.type === 'freeze' || e.statusEffect?.type === 'sleep') continue;
      
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      let speedMult = 1;
      if (e.statusEffect?.type === 'paralysis') speedMult = 0.5;

      let targetTower: GamePokemon |
 undefined = towers.find(t => t.id === e.targetTowerId && !t.isFainted);

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
    const { updateTower, activeSynergies } = useGameStore.getState(); 
    
    const buffedStats = getBuffedStats(tower, activeSynergies);
    const enemyAttackType = enemy.types[0] || 'normal';
    let eff = getTypeEffectiveness(enemyAttackType, tower.types);
    
    let finalDamageMultiplier = 1.0;
    const sixPieceTypeSynergies = activeSynergies.filter(s => s.id.startsWith('type:') && s.level === 3);
    for (const syn of sixPieceTypeSynergies) {
      const synergyType = syn.id.split(':')[1];
      if (tower.types.includes(synergyType)) {
        const singleTypeEff = getTypeEffectiveness(enemyAttackType, [synergyType]);
        if (singleTypeEff === 2) { 
          finalDamageMultiplier = 0.5;
          break;
        }
      }
    }
    
    const dmg = calculateDamage(enemy.attack, buffedStats.defense, 20, eff, false);
    const finalDmg = Math.max(1, Math.floor(dmg * finalDamageMultiplier));
    
    const newHp = Math.max(0, tower.currentHp - finalDmg);
    
    if (newHp <= 0) {
      updateTower(tower.id, { currentHp: 0, isFainted: true });
      enemy.targetTowerId = undefined;
    } else {
      updateTower(tower.id, { currentHp: newHp });
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
  
  private findTarget(tower: GamePokemon, enemies: Enemy[]): Enemy |
  null {
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
    if (m) {
      const hitChance = m.accuracy / 100;
      if (Math.random() > hitChance) {
        const { addDamageNumber } = useGameStore.getState();
        addDamageNumber({
          id: `miss-${Date.now()}-${Math.random()}`,
          value: 0,
          position: { ...target.position },
          isCrit: false,
          isMiss: true, 
          lifetime: 1.0,
        });
        const speedMultiplier = Math.max(0.5, 1 - (tower.speed / 300));
        m.currentCooldown = m.cooldown * speedMultiplier;
        return;
      }
      
      const speedMultiplier = Math.max(0.2, 1 - (tower.speed / 300));
      m.currentCooldown = m.cooldown * speedMultiplier;
    }
    
    const { activeSynergies } = useGameStore.getState();
    const buffedStats = getBuffedStats(tower, activeSynergies);

    const attackPower = move.damageClass === 'physical' ? buffedStats.attack : buffedStats.specialAttack;
    
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
      attackerTypes: tower.types, 
      attackerId: tower.id, 
    } as any);
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
    const { addDamageNumber, towers, updateTower } = useGameStore.getState();
    const eff = getTypeEffectiveness(proj.type, enemy.types);
    
    const attacker = proj.attackerId ?
 towers.find(t => t.id === proj.attackerId) : undefined;
    const critChance = getCriticalChance(attacker?.ability);
    const isCrit = Math.random() < critChance;
    
    const stab = hasSTAB(proj.attackerTypes, proj.type);
    
    const defense = proj.damageClass === 'physical' ?
 enemy.defense : enemy.specialDefense;
    let dmg = calculateDamage(proj.attackPower, defense, proj.damage, eff, isCrit, stab);
    
    if (proj.isAOE && attacker?.ability) {
      const aoeMultiplier = getAOEDamageMultiplier(attacker.ability);
      dmg = Math.floor(dmg * aoeMultiplier);
    }
    
    enemy.hp = Math.max(0, enemy.hp - dmg);
    
    if (attacker && !attacker.isFainted && proj.effect.drainPercent) {
      const healAmount = Math.floor(dmg * proj.effect.drainPercent);
      const newHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
      updateTower(attacker.id, { currentHp: newHp });
    }
    
    addDamageNumber({
      id: `dmg-${Date.now()}-${Math.random()}`,
      value: dmg,
      position: { ...enemy.position },
      isCrit,
      lifetime: 1.0,
    });
    
    if (proj.effect.statusInflict && proj.effect.statusChance != null) {
      if (Math.random() * 100 < proj.effect.statusChance) {
        
        let duration = 5.0;
        if (proj.effect.statusInflict === 'freeze' || proj.effect.statusInflict === 'sleep') {
          duration = 2.0;
        }
        
        enemy.statusEffect = {
          type: proj.effect.statusInflict,
          duration: duration,
          tickDamage: (proj.effect.statusInflict === 'poison') ?
 10 : undefined,
        };
      }
    }
    
    if (enemy.hp <= 0) this.killEnemy(enemy.id);
  }
  
  private killEnemy(id: string) {
    const { enemies, removeEnemy, addMoney, addXpToTower } = useGameStore.getState();
    const enemy = enemies.find(e => e.id === id);
    if (enemy) {
      const reward = 10;
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
  
  // 3. checkWaveComplete 대폭 수정
  private async checkWaveComplete() {
    const { enemies, isWaveActive, healAllTowers, setWaveEndItemPick, towers, isSpawning, wave, gameTime, currentMap, lives } = useGameStore.getState();
    
    if (isWaveActive && !isSpawning && enemies.length === 0) {
      useGameStore.setState({ isWaveActive: false, combo: 0, isPaused: true });
      healAllTowers();

      // 3a. 50 웨이브 클리어 시 DB 저장
      if (wave === 50) {
        useGameStore.setState({ wave50Clear: true });

        try {
          const map = getMapById(currentMap);
          const pokemonUsed = towers.map(t => t.displayName);

          // 명예의 전당 기록
          await databaseService.addHallOfFameEntry(
            currentMap,
            map?.name || 'Unknown Map',
            wave,
            pokemonUsed,
            gameTime
          );

          // 랭킹 기록
          await databaseService.updateLeaderboard(currentMap, gameTime, wave);

          // 사용한 포켓몬 도감에 등록
          for (const tower of towers) {
            // (이미 게임 중 addToPokedex가 호출되지만, 확인 차원)
            await databaseService.addToPokedex(tower.pokemonId, tower.displayName);
          }

          // 50웨이브 업적
          saveService.updateAchievement('wave50', 50);

        } catch (err) {
          console.error("Failed to save Wave 50 clear data:", err);
        }
  
        return; // 웨이브 50 클리어 시 일반 보상 모달 대신 특별 모달 표시
      }

      // 3b. 기타 업적 체크 (50웨이브가 아닐 때)
      try {
        // 'perfect' (Wave 10)
        if (wave === 10 && lives === 50) {
          saveService.updateAchievement('perfect', 1);
        }

        // 'speedrun' (Wave 20)
        if (wave === 20 && gameTime <= 1800000) { // 30분 = 1800 * 1000 ms
          saveService.updateAchievement('speedrun', 1);
        }

        // 'nolosses' (Wave 30)
        if (wave === 30) {
          // healAllTowers는 기절한 포켓몬을 부활시키지 않으므로, 이 시점에 fainted 여부 체크 가능
          const noLosses = towers.every(t => !t.isFainted);
          if (noLosses) {
            saveService.updateAchievement('nolosses', 1);
          }
        }

        // 'legendary' (any wave)
        let hasLegend = false;
        for (const tower of towers) {
          if (!tower.isFainted) {
            const rarity = await pokeAPI.getRarity(tower.pokemonId);
            if (rarity === 'Legend') {
              hasLegend = true;
              break;
            }
          }
        }
        if (hasLegend) {
          saveService.updateAchievement('legendary', 1);
        }
      } catch (err) {
         console.error("Failed to check achievements:", err);
      }


      // 3c. 일반 보상
      const itemChoices: Item[] = [
       { id: 'rare_candy', name: 'waveEnd.candyName', type: 'candy', cost: 0, effect: 'waveEnd.candyDesc' },
       { id: 'revive_shard', name: 'waveEnd.reviveName', type: 'revive', cost: 0, effect: 'waveEnd.reviveDesc' },
      ];
      
      const megaEligiblePokemon = towers.filter(t => hasMegaEvolution(t.pokemonId));
      if (megaEligiblePokemon.length > 0 && Math.random() < 0.1 * megaEligiblePokemon.length) {
        
        const randomPokemon = megaEligiblePokemon[Math.floor(Math.random() * megaEligiblePokemon.length)];
        const megaData = MEGA_EVOLUTIONS.find(m => m.from === randomPokemon.pokemonId);
        
        if (megaData) {
          itemChoices.push({
            id: `mega_stone_${megaData.item}`,
            name: `${randomPokemon.displayName}의 메가스톤`,
            type: 'mega-stone',
            cost: 0,
            effect: `${randomPokemon.displayName}을 메가진화시킵니다`,
            targetPokemonId: 
 randomPokemon.pokemonId,
          });
        }
      }
      
      const gigantamaxEligiblePokemon = towers.filter(t => hasGigantamax(t.pokemonId));
      if (gigantamaxEligiblePokemon.length > 0 && Math.random() < 0.1 * gigantamaxEligiblePokemon.length) {
        
        const randomPokemon = gigantamaxEligiblePokemon[Math.floor(Math.random() * gigantamaxEligiblePokemon.length)];
        const gigantamaxData = GIGANTAMAX_FORMS.find(g => g.from === randomPokemon.pokemonId);
        
        if (gigantamaxData) {
          itemChoices.push({
            id: `max_mushroom_${randomPokemon.pokemonId}`,
            name: `${randomPokemon.displayName}의 다이버섯`,
            type: 'max-mushroom' as any,
            cost: 0,
            effect: `${randomPokemon.displayName}을 거다이맥스시킵니다`,
           
            targetPokemonId: randomPokemon.pokemonId,
          });
        }
      }
      
      setWaveEndItemPick(itemChoices);
    }
  }
}