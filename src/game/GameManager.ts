// src/game/GameManager.ts
import { useGameStore } from '../store/gameStore';
import { GamePokemon, Enemy, Projectile, Position, GameMove } from '../types/game';
import { calculateDamage, getTypeEffectiveness, hasSTAB } from '../utils/typeEffectiveness';
import { hasMegaEvolution, hasGigantamax, MEGA_EVOLUTIONS, GIGANTAMAX_FORMS } from '../data/evolution';
import { saveService } from '../services/SaveService';
import { soundService } from '../services/SoundService';
import { getCriticalChance, getAOEDamageMultiplier } from '../utils/abilities';
import { getBuffedStats } from '../utils/synergyManager';
import { databaseService } from '../services/DatabaseService';
import { getMapById } from '../data/maps';
import { pokeAPI } from '../api/pokeapi';
import { multiplayerService } from '../services/MultiplayerService';
import { achievementService } from '../services/AchievementService';

export class GameManager {
  private static instance: GameManager;

  // [수정] checkWaveComplete 중복 실행 방지 플래그
  private isCompletingWave = false;

  // [수정] killEnemy 중복 보상 방지: 이미 처리된 적 ID 추적
  private killedEnemyIds = new Set<string>();

  // [수정] saveService.load() 과다 호출 방지: stats 배치 업데이트
  private pendingStats = {
    enemiesKilled: 0,
    totalMoneyEarned: 0,
    bossesDefeated: 0,
  };
  private statFlushTimer: ReturnType<typeof setTimeout> | null = null;

  static getInstance() {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  private loseLife(amount: number) {
    const newLives = Math.max(0, useGameStore.getState().lives - amount);
    useGameStore.setState({ lives: newLives });
  }

  // stats를 배치로 모아서 0.5초마다 한 번에 저장
  private flushStats() {
    if (this.statFlushTimer) clearTimeout(this.statFlushTimer);
    this.statFlushTimer = setTimeout(() => {
      if (
        this.pendingStats.enemiesKilled > 0 ||
        this.pendingStats.totalMoneyEarned > 0 ||
        this.pendingStats.bossesDefeated > 0
      ) {
        const cur = saveService.load().stats;
        saveService.updateStats({
          enemiesKilled: cur.enemiesKilled + this.pendingStats.enemiesKilled,
          totalMoneyEarned: cur.totalMoneyEarned + this.pendingStats.totalMoneyEarned,
          bossesDefeated: cur.bossesDefeated + this.pendingStats.bossesDefeated,
        });
        this.pendingStats = { enemiesKilled: 0, totalMoneyEarned: 0, bossesDefeated: 0 };
      }
    }, 500);
  }

  update(dt: number) {
    const { isPaused, gameOver, gameSpeed } = useGameStore.getState();
    if (isPaused || gameOver) return;

    const delta = dt * gameSpeed;
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

  // [수정] 직접 객체 변이(mutation) 제거 → updateTower / updateEnemy 경유
  private updateStatusEffects(dt: number) {
    const { towers, enemies, updateTower, updateEnemy } = useGameStore.getState();

    towers.forEach(t => {
      if (!t.statusEffect) return;
      const remaining = t.statusEffect.duration - dt;

      if (remaining <= 0) {
        updateTower(t.id, {
          statusEffect: undefined,
          attack: t.statusEffect.type === 'burn' ? t.baseAttack : t.attack,
        });
      } else if (t.statusEffect.tickDamage) {
        const dmg = t.statusEffect.tickDamage * dt;
        const newHp = Math.max(0, t.currentHp - dmg);
        if (newHp <= 0 && !t.isFainted) {
          updateTower(t.id, {
            currentHp: 0,
            isFainted: true,
            statusEffect: { ...t.statusEffect, duration: remaining },
          });
        } else {
          updateTower(t.id, {
            currentHp: newHp,
            statusEffect: { ...t.statusEffect, duration: remaining },
          });
        }
      } else {
        updateTower(t.id, {
          statusEffect: { ...t.statusEffect, duration: remaining },
        });
      }
    });

    enemies.forEach(e => {
      if (!e.statusEffect) return;
      const remaining = e.statusEffect.duration - dt;

      if (remaining <= 0) {
        updateEnemy(e.id, { statusEffect: undefined });
      } else if (e.statusEffect.tickDamage) {
        const dmg = e.statusEffect.tickDamage * dt;
        const newHp = Math.max(0, e.hp - dmg);
        updateEnemy(e.id, {
          hp: newHp,
          statusEffect: { ...e.statusEffect, duration: remaining },
        });
        if (newHp <= 0) this.killEnemy(e.id);
      } else {
        updateEnemy(e.id, {
          statusEffect: { ...e.statusEffect, duration: remaining },
        });
      }
    });
  }

  private updateEnemies(dt: number) {
    const { enemies, lives } = useGameStore.getState();
    if (lives <= 0) return;

    enemies.forEach(enemy => {
      if (enemy.statusEffect?.type === 'sleep' || enemy.statusEffect?.type === 'freeze') return;

      const speedMult = enemy.statusEffect?.type === 'paralysis' ? 0.5 : 1;

      if (enemy.pathIndex < enemy.path.length - 1) {
        const targetPos = enemy.path[enemy.pathIndex + 1];
        const reached = this.moveEnemy(enemy, targetPos, dt, speedMult);
        if (reached) {
          useGameStore.getState().updateEnemy(enemy.id, { pathIndex: enemy.pathIndex + 1 });
        }
      } else {
        // 목표 지점 도달
        useGameStore.getState().removeEnemy(enemy.id);
        console.log(`[GameManager] Enemy reached end. Current lives: ${useGameStore.getState().lives}`);
        this.loseLife(1);
        if (useGameStore.getState().lives <= 0) {
          const multiRoomId = multiplayerService.getCurrentRoomId();
          if (!multiRoomId) {
            useGameStore.setState({ gameOver: true, isWaveActive: false });
            soundService.playDefeatSound();
          }
        }
      }

      // 적이 타워 공격
      if (enemy.attackCooldown > 0) {
        useGameStore.getState().updateEnemy(enemy.id, {
          attackCooldown: Math.max(0, enemy.attackCooldown - dt),
        });
      } else {
        const target = this.findTargetTower(enemy);
        if (target) {
          this.enemyAttackTower(enemy, target);
        }
      }
    });
  }

  private moveEnemy(enemy: Enemy, targetPos: Position, dt: number, speedMult: number): boolean {
    const dx = targetPos.x - enemy.position.x;
    const dy = targetPos.y - enemy.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return true;

    const move = enemy.moveSpeed * speedMult * dt;
    const ratio = Math.min(move / dist, 1);
    useGameStore.getState().updateEnemy(enemy.id, {
      position: {
        x: enemy.position.x + dx * ratio,
        y: enemy.position.y + dy * ratio,
      },
    });
    return false;
  }

  private findTargetTower(enemy: Enemy): GamePokemon | undefined {
    const { towers } = useGameStore.getState();
    let closest: GamePokemon | null = null;
    let minDist = Infinity;

    for (const tower of towers) {
      if (tower.isFainted) continue;
      const dx = tower.position.x - enemy.position.x;
      const dy = tower.position.y - enemy.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist <= enemy.range * 2) {
        minDist = dist;
        closest = tower;
      }
    }
    return closest || undefined;
  }

  private enemyAttackTower(enemy: Enemy, tower: GamePokemon) {
    const { updateTower, activeSynergies } = useGameStore.getState();
    const buffedStats = getBuffedStats(tower, activeSynergies);
    const enemyAttackType = enemy.types[0] || 'normal';
    let eff = getTypeEffectiveness(enemyAttackType, tower.types);

    let finalDamageMultiplier = 1.0;
    const sixPieceTypeSynergies = activeSynergies.filter(
      s => s.id.startsWith('type:') && s.level === 3
    );
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
      useGameStore.getState().updateEnemy(enemy.id, { targetTowerId: undefined });
    } else {
      updateTower(tower.id, { currentHp: newHp });
    }

    useGameStore.getState().updateEnemy(enemy.id, { attackCooldown: 2.0 });
  }

  private updateTowers(_dt: number) {
    const { towers, enemies, updateTower } = useGameStore.getState();
    towers.forEach(tower => {
      if (tower.currentHp <= 0 && !tower.isFainted) {
        updateTower(tower.id, { currentHp: 0, isFainted: true });
        return;
      }
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
    let closest: Enemy | null = null;
    let minDist = Infinity;

    for (const enemy of enemies) {
      const dx = enemy.position.x - tower.position.x;
      const dy = enemy.position.y - tower.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= range && dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    }
    return closest;
  }

  private towerAttack(tower: GamePokemon, target: Enemy, move: GameMove) {
    const m = tower.equippedMoves.find(m => m.name === move.name);
    if (m) {
      const hitChance = m.accuracy / 100;
      if (Math.random() > hitChance) {
        useGameStore.getState().addDamageNumber({
          id: `miss-${Date.now()}-${Math.random()}`,
          value: 0,
          position: { ...target.position },
          isCrit: false,
          isMiss: true,
          lifetime: 1.0,
        });
        const speedMultiplier = Math.max(0.5, 1 - tower.speed / 300);
        m.currentCooldown = m.cooldown * speedMultiplier;
        return;
      }
      const speedMultiplier = Math.max(0.2, 1 - tower.speed / 300);
      m.currentCooldown = m.cooldown * speedMultiplier;
    }

    const { activeSynergies } = useGameStore.getState();
    const buffedStats = getBuffedStats(tower, activeSynergies);
    const attackPower =
      move.damageClass === 'physical' ? buffedStats.attack : buffedStats.specialAttack;

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
    const affected = enemies.filter(e => {
      const dx = e.position.x - center.x;
      const dy = e.position.y - center.y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
    affected.forEach(e => this.applyDamage(proj, e));
  }

  private applyDamage(proj: Projectile, enemy: Enemy) {
    const { addDamageNumber, towers, updateTower } = useGameStore.getState();
    const eff = getTypeEffectiveness(proj.type, enemy.types);

    const attacker = proj.attackerId
      ? towers.find(t => t.id === proj.attackerId)
      : undefined;
    const critChance = getCriticalChance(attacker?.ability);
    const isCrit = Math.random() < critChance;
    const stab = hasSTAB(proj.attackerTypes, proj.type);

    const defense =
      proj.damageClass === 'physical' ? enemy.defense : enemy.specialDefense;
    let dmg = calculateDamage(proj.attackPower, defense, proj.damage, eff, isCrit, stab);

    if (proj.isAOE && attacker?.ability) {
      const aoeMultiplier = getAOEDamageMultiplier(attacker.ability);
      dmg = Math.floor(dmg * aoeMultiplier);
    }

    const newHp = Math.max(0, enemy.hp - dmg);
    useGameStore.getState().updateEnemy(enemy.id, { hp: newHp });

    // 흡혈
    if (attacker && !attacker.isFainted && proj.effect.drainPercent) {
      const healAmount = Math.floor(dmg * proj.effect.drainPercent);
      const newTowerHp = Math.min(attacker.maxHp, attacker.currentHp + healAmount);
      updateTower(attacker.id, { currentHp: newTowerHp });
    }

    addDamageNumber({
      id: `dmg-${Date.now()}-${Math.random()}`,
      value: dmg,
      position: { ...enemy.position },
      isCrit,
      lifetime: 1.0,
    });

    // 상태이상 부여
    if (proj.effect.statusInflict && proj.effect.statusChance != null) {
      if (Math.random() * 100 < proj.effect.statusChance) {
        const duration =
          proj.effect.statusInflict === 'freeze' ||
          proj.effect.statusInflict === 'sleep'
            ? 2.0
            : 5.0;
        useGameStore.getState().updateEnemy(enemy.id, {
          statusEffect: {
            type: proj.effect.statusInflict,
            duration,
            tickDamage:
              proj.effect.statusInflict === 'poison' ? 10 : undefined,
          },
        });
      }
    }

    if (newHp <= 0) this.killEnemy(enemy.id);
  }

  // [수정] 중복 보상 방지: killedEnemyIds로 이미 처리된 적 추적
  private killEnemy(id: string) {
    if (this.killedEnemyIds.has(id)) return;
    this.killedEnemyIds.add(id);

    const { enemies, removeEnemy, addMoney, addXpToTower } = useGameStore.getState();
    const enemy = enemies.find(e => e.id === id);
    if (!enemy) return;

    const reward = enemy.reward ?? 10;
    addMoney(reward);
    removeEnemy(id);
    useGameStore.setState(state => ({ combo: state.combo + 1 }));

    const xpAmount = enemy.isBoss ? 50 : 10;
    useGameStore.getState().towers.forEach(t => {
      addXpToTower(t.id, xpAmount);
    });

    // [수정] 배치 업데이트로 변경 (매 호출마다 localStorage 파싱 안 함)
    this.pendingStats.enemiesKilled++;
    this.pendingStats.totalMoneyEarned += reward;
    if (enemy.isBoss) this.pendingStats.bossesDefeated++;
    this.flushStats();

    // 업적 체크 (flushStats 이후 stats가 갱신되었으므로 여기서 체크)
    achievementService.onKill(enemy.isBoss);

    // 웨이브 종료 후 killedEnemyIds 정리
    setTimeout(() => this.killedEnemyIds.delete(id), 5000);
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

  // [수정] checkWaveComplete: isCompletingWave 플래그로 중복 실행 방지
  // [수정] 멀티플레이에서 isPaused: true 설정 안 함 (BattlePhaseUI가 페이즈 전환 담당)
  private async checkWaveComplete() {
    const { enemies, isWaveActive, isSpawning } = useGameStore.getState();

    if (!isWaveActive || isSpawning || enemies.length !== 0) return;
    if (this.isCompletingWave) return;

    this.isCompletingWave = true;

    try {
      const { healAllTowers, setWaveEndItemPick, towers, wave, gameTime, currentMap, lives, difficulty } =
        useGameStore.getState();

      const multiRoomId = multiplayerService.getCurrentRoomId();
      const isMultiplayer = !!multiRoomId;

      // 웨이브 종료 처리
      // 멀티플레이: isPaused 설정 안 함 (BattlePhaseUI가 카운트다운 관리)
      // 싱글플레이: isPaused: true로 설정
      useGameStore.setState({
        isWaveActive: false,
        combo: 0,
        isPaused: !isMultiplayer,
      });

      healAllTowers();
      const itemChoices = this.buildWaveEndItems(towers, wave);
      setWaveEndItemPick(itemChoices);

      // 50웨이브 클리어 (싱글플레이 전용)
      if (!isMultiplayer && wave === 50) {
        useGameStore.setState({ wave50Clear: true });
        try {
          const map = getMapById(currentMap);
          const pokemonUsed = towers.map(t => t.displayName);
          await databaseService.addHallOfFameEntry(
            currentMap,
            map?.name || 'Unknown Map',
            wave,
            pokemonUsed,
            gameTime
          );
          await databaseService.updateLeaderboard(currentMap, gameTime, wave);
          for (const tower of towers) {
            await databaseService.addToPokedex(tower.pokemonId, tower.displayName);
          }
          saveService.updateAchievement('wave50', 50);
        } catch (err) {
          console.error('Failed to save Wave 50 clear data:', err);
        }
        return;
      }

      // 싱글플레이 업적 체크
      if (!isMultiplayer) {
        try {
          // 도전 업적 (퍼펙트/스피드런/불패/난이도/속도) → AchievementService 위임
          achievementService.onWaveComplete(wave, lives, 50, gameTime, difficulty, towers);

          // 전설 포켓몬 수집 업적
          for (const tower of towers) {
            if (!tower.isFainted) {
              const rarity = await pokeAPI.getRarity(tower.pokemonId);
              if (rarity === 'Legend') {
                saveService.updateAchievement('legendary', 1);
                break;
              }
            }
          }

          // 누적 골드 업적
          const totalMoney = saveService.load().stats.totalMoneyEarned;
          achievementService.onMoneyEarned(totalMoney);

          // 시너지 업적 (현재 활성 시너지 기준)
          const { activeSynergies } = useGameStore.getState();
          achievementService.onSynergyUpdate(activeSynergies);

        } catch (err) {
          console.error('Failed to check achievements:', err);
        }

        // 웨이브 업적
        saveService.updateAchievement(`wave${wave}`, wave);

        // 랭킹 업데이트 (싱글플레이, 매 웨이브)
        try {
          await databaseService.updateLeaderboard(currentMap, undefined, wave);
        } catch {
          // 무시
        }
      }
    } finally {
      this.isCompletingWave = false;
      // 다음 웨이브를 위해 killedEnemyIds 초기화
      this.killedEnemyIds.clear();
    }
  }

  private buildWaveEndItems(towers: GamePokemon[], _wave: number) {
    const { hasMegaEvolution: _hasMega, hasGigantamax: _hasGiga } = { hasMegaEvolution, hasGigantamax };
    const itemChoices = [
      {
        id: 'rare_candy',
        name: 'waveEnd.candyName',
        type: 'candy' as const,
        cost: 0,
        effect: 'waveEnd.candyDesc',
      },
      {
        id: 'revive_shard',
        name: 'waveEnd.reviveName',
        type: 'revive' as const,
        cost: 0,
        effect: 'waveEnd.reviveDesc',
      },
    ];

    const megaEligible = towers.filter(t => hasMegaEvolution(t.pokemonId));
    if (megaEligible.length > 0 && Math.random() < 0.1 * megaEligible.length) {
      const randomPokemon = megaEligible[Math.floor(Math.random() * megaEligible.length)];
      const megaData = MEGA_EVOLUTIONS.find(m => m.from === randomPokemon.pokemonId);
      if (megaData) {
        itemChoices.push({
          id: `mega_stone_${megaData.item}`,
          name: `${randomPokemon.displayName}의 메가스톤`,
          type: 'mega-stone' as any,
          cost: 0,
          effect: `${randomPokemon.displayName}을 메가진화시킵니다`,
          targetPokemonId: randomPokemon.pokemonId,
        } as any);
      }
    }

    const gigaEligible = towers.filter(t => hasGigantamax(t.pokemonId));
    if (gigaEligible.length > 0 && Math.random() < 0.1 * gigaEligible.length) {
      const randomPokemon = gigaEligible[Math.floor(Math.random() * gigaEligible.length)];
      const gigaData = GIGANTAMAX_FORMS.find(g => g.from === randomPokemon.pokemonId);
      if (gigaData) {
        itemChoices.push({
          id: `max_mushroom_${randomPokemon.pokemonId}`,
          name: `${randomPokemon.displayName}의 다이버섯`,
          type: 'max-mushroom' as any,
          cost: 0,
          effect: `${randomPokemon.displayName}을 거다이맥스시킵니다`,
          targetPokemonId: randomPokemon.pokemonId,
        } as any);
      }
    }

    return itemChoices;
  }
}