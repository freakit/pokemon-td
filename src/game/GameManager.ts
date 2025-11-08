// src/game/GameManager.ts

import { useGameStore } from '../store/gameStore';
import { GamePokemon, Enemy, Projectile, Position, Item, GameMove } from '../types/game';
import { calculateDamage, getTypeEffectiveness, hasSTAB } from '../utils/typeEffectiveness';
import { hasMegaEvolution, hasGigantamax, MEGA_EVOLUTIONS, GIGANTAMAX_FORMS } from '../data/evolution';
import { saveService } from '../services/SaveService';
import { soundService } from '../services/SoundService';
import { getCriticalChance, getAOEDamageMultiplier } from '../utils/abilities';
import { getBuffedStats } from '../utils/synergyManager';
// 🆕 시너지 유틸 임포트

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

  /**
   * 🆕 수정: 적이 타워를 공격할 때
   */
  private enemyAttackTower(enemy: Enemy, tower: GamePokemon) {
    if (enemy.attackCooldown > 0) return;

    const { updateTower, activeSynergies } = useGameStore.getState(); // 🆕 시너지 가져오기
    
    // 🆕 시너지 적용된 방어 스탯 가져오기
    const buffedStats = getBuffedStats(tower, activeSynergies);
    
    const enemyAttackType = enemy.types[0] || 'normal';
    let eff = getTypeEffectiveness(enemyAttackType, tower.types);

    // 🆕 6타입 시너지 방어 로직
    let finalDamageMultiplier = 1.0;
    const sixPieceTypeSynergies = activeSynergies.filter(s => s.id.startsWith('type:') && s.level === 3);

    for (const syn of sixPieceTypeSynergies) {
      const synergyType = syn.id.split(':')[1];
      // 이 타워가 해당 6시너지 타입이고, 그 타입이 2배 약점일 경우
      if (tower.types.includes(synergyType)) {
        const singleTypeEff = getTypeEffectiveness(enemyAttackType, [synergyType]);
        if (singleTypeEff === 2) { 
          finalDamageMultiplier = 0.5; // 최종 데미지 반감
          break; // 버프는 한 번만 적용
        }
      }
    }
    
    const dmg = calculateDamage(enemy.attack, buffedStats.defense, 20, eff, false); // 🆕 buffedStats.defense 사용
    const finalDmg = Math.max(1, Math.floor(dmg * finalDamageMultiplier)); // 🆕 시너지 방어 적용
    
    const newHp = Math.max(0, tower.currentHp - finalDmg); // 🆕 finalDmg 사용
    
    if (newHp <= 0) {
      updateTower(tower.id, { currentHp: 0, isFainted: true });
      enemy.targetTowerId = undefined;
    } else {
      updateTower(tower.id, { currentHp: newHp }); // 🆕 HP 업데이트는 store 액션 사용
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
  
  /**
   * 🆕 수정: 타워가 적을 공격할 때
   */
  private towerAttack(tower: GamePokemon, target: Enemy, move: GameMove) {
    const m = tower.equippedMoves.find(m => m.name === move.name);
    if (m) {
      // 🔴 명중률 체크 추가
      const hitChance = m.accuracy / 100; // accuracy는 0-100 범위
      if (Math.random() > hitChance) {
        // Miss!
        const { addDamageNumber } = useGameStore.getState();
        addDamageNumber({
          id: `miss-${Date.now()}-${Math.random()}`,
          value: 0,
          position: { ...target.position },
          isCrit: false,
          isMiss: true, // 🎯 Miss 표시
          lifetime: 1.0,
        });
        
        // 쿨다운만 적용하고 공격 실패
        const speedMultiplier = Math.max(0.5, 1 - (tower.speed / 300));
        m.currentCooldown = m.cooldown * speedMultiplier;
        return;
      }
      
      // 스피드에 따라 공격 속도 조정 (스피드가 높을수록 쿨다운 짧음)
      // 기본 쿨다운에서 스피드에 비례하여 감소 (최대 50% 감소)
      // 공식: 쿨다운 * (1 - (speed / 300))
      // 스피드 150이면 쿨다운 50% 감소
      // 스피드 240까지 구현. 그 이상은 동일.
      const speedMultiplier = Math.max(0.2, 1 - (tower.speed / 300));
      m.currentCooldown = m.cooldown * speedMultiplier;
    }
    
    // 🆕 시너지 적용된 공격 스탯 가져오기
    const { activeSynergies } = useGameStore.getState();
    const buffedStats = getBuffedStats(tower, activeSynergies);

    const attackPower = move.damageClass === 'physical' ? buffedStats.attack : buffedStats.specialAttack; // 🆕 buffedStats 사용
    
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
      
      attackPower, // 🆕 버프된 attackPower 전달
      damageClass: move.damageClass,
      attackerTypes: tower.types, // 자속 보정을 위한 타입 정보
      attackerId: tower.id, // 🆕 특성 효과 적용을 위한 공격자 ID
    } as any); // attackerId 타입 임시 처리
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
    
    // 공격자 특성 가져오기
    const attacker = proj.attackerId ? towers.find(t => t.id === proj.attackerId) : undefined;
    const critChance = getCriticalChance(attacker?.ability);
    const isCrit = Math.random() < critChance;
    
    // 자속 보정 확인
    const stab = hasSTAB(proj.attackerTypes, proj.type);
    
    const defense = proj.damageClass === 'physical' ? enemy.defense : enemy.specialDefense;
    let dmg = calculateDamage(proj.attackPower, defense, proj.damage, eff, isCrit, stab);
    
    // AOE 특성 배율 적용
    if (proj.isAOE && attacker?.ability) {
      const aoeMultiplier = getAOEDamageMultiplier(attacker.ability);
      dmg = Math.floor(dmg * aoeMultiplier);
    }
    
    enemy.hp = Math.max(0, enemy.hp - dmg);
    
    // 2. 기술 기반 흡혈 효과 적용 (요청사항 반영)
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

    // 1. 상태이상 적용 (확률 API 값 기반)
    if (proj.effect.statusInflict && proj.effect.statusChance != null) {
      if (Math.random() * 100 < proj.effect.statusChance) {
        // 상태이상별 지속시간 차별화
        let duration = 5.0; // 기본 5초 (화상, 독, 마비 등)
        
        // 얼음, 수면은 적을 완전히 멈추므로 2초로 단축
        if (proj.effect.statusInflict === 'freeze' || proj.effect.statusInflict === 'sleep') {
          duration = 2.0;
        }
        
        enemy.statusEffect = {
          type: proj.effect.statusInflict,
          duration: duration,
          tickDamage: (proj.effect.statusInflict === 'poison') ? 10 : undefined,
        };
      }
    }
    
    if (enemy.hp <= 0) this.killEnemy(enemy.id);
  }
  
  private killEnemy(id: string) {
    const { enemies, removeEnemy, addMoney, addXpToTower } = useGameStore.getState();
    const enemy = enemies.find(e => e.id === id);
    if (enemy) {
      const reward = 10; // 고정 보상 10원
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
  
  // 🔴 수정된 부분
  private checkWaveComplete() {
    const { enemies, isWaveActive, healAllTowers, setWaveEndItemPick, towers, isSpawning, wave } = useGameStore.getState();
    
    // 적이 실제로 소환된 적이 있고, 현재 웨이브가 활성화되어 있으며, 모든 적이 사라졌을 때만 보상
    if (isWaveActive && !isSpawning && enemies.length === 0) {
      useGameStore.setState({ isWaveActive: false, combo: 0, isPaused: true });
      healAllTowers();

      // 🔴 웨이브 50 클리어 체크
      if (wave === 50) {
        useGameStore.setState({ wave50Clear: true });
        return; // 웨이브 50 클리어 시 일반 보상 모달 대신 특별 모달 표시
      }

      const itemChoices: Item[] = [
       { id: 'rare_candy', name: 'waveEnd.candyName', type: 'candy', cost: 0, effect: 'waveEnd.candyDesc' },
       { id: 'revive_shard', name: 'waveEnd.reviveName', type: 'revive', cost: 0, effect: 'waveEnd.reviveDesc' },
      ];

      // 🔴 메가스톤 드랍 로직 (10% 확률)
      // 엔트리에 메가진화 가능한 최종진화형이 있는지 확인
      const megaEligiblePokemon = towers.filter(t => hasMegaEvolution(t.pokemonId));
      if (megaEligiblePokemon.length > 0 && Math.random() < 0.1 * megaEligiblePokemon.length) {
        // 10% 확률로 메가스톤 드랍
        const randomPokemon = megaEligiblePokemon[Math.floor(Math.random() * megaEligiblePokemon.length)];
        const megaData = MEGA_EVOLUTIONS.find(m => m.from === randomPokemon.pokemonId);
        
        if (megaData) {
          itemChoices.push({
            id: `mega_stone_${megaData.item}`,
            name: `${randomPokemon.displayName}의 메가스톤`,
            type: 'mega-stone',
            cost: 0,
            effect: `${randomPokemon.displayName}을 메가진화시킵니다`,
            targetPokemonId: randomPokemon.pokemonId,
          });
        }
      }
      
      // 🆕 거다이맥스 버섯 드랍 로직 (10% 확률)
      // 엔트리에 거다이맥스 가능한 포켓몬이 있는지 확인
      const gigantamaxEligiblePokemon = towers.filter(t => hasGigantamax(t.pokemonId));
      if (gigantamaxEligiblePokemon.length > 0 && Math.random() < 0.1 * gigantamaxEligiblePokemon.length) {
        // 10% 확률로 다이버섯 드랍
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