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
import { WaveSystem } from './WaveSystem'; // [버그3 수정] 추가

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

  // [FIX-MUT] 직접 변이(mutation) 제거 → setState를 통한 불변 업데이트
  private updateCooldowns(dt: number) {
    useGameStore.setState(state => ({
      towers: state.towers.map(tower => {
        if (tower.isFainted) return tower;
        const needsUpdate = tower.equippedMoves.some(m => m.currentCooldown > 0);
        if (!needsUpdate) return tower;
        return {
          ...tower,
          equippedMoves: tower.equippedMoves.map(m =>
            m.currentCooldown > 0
              ? { ...m, currentCooldown: Math.max(0, m.currentCooldown - dt) }
              : m
          ),
        };
      }),
    }));
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
    const { updateTower, activeSynergies, towers, addDamageNumber } = useGameStore.getState();
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

    const dmg = calculateDamage(enemy.attack, buffedStats.defense, 40, eff, false);
    // 적 딜 20% 감소 (난이도 조정)
    const finalDmg = Math.max(1, Math.floor(dmg * finalDamageMultiplier * 0.8));
    const newHp = Math.max(0, tower.currentHp - finalDmg);

    if (newHp <= 0) {
      updateTower(tower.id, { currentHp: 0, isFainted: true });
      useGameStore.getState().updateEnemy(enemy.id, { targetTowerId: undefined });
    } else {
      updateTower(tower.id, { currentHp: newHp });
    }

    // 인접 타워 광역 피해: 주 피격 타워 주변 100px(약 1.5타일) 이내 타워에 주 피해의 30%
    const splashRadius = 100;
    const splashDmg = Math.floor(finalDmg * 0.3);
    if (splashDmg > 0) {
      towers.forEach(otherTower => {
        if (otherTower.id === tower.id || otherTower.isFainted) return;
        const dx = otherTower.position.x - tower.position.x;
        const dy = otherTower.position.y - tower.position.y;
        if (Math.sqrt(dx * dx + dy * dy) > splashRadius) return;

        const otherNewHp = Math.max(0, otherTower.currentHp - splashDmg);
        updateTower(otherTower.id, { currentHp: otherNewHp, isFainted: otherNewHp <= 0 });

        // 스플래시 피해 수치 표시
        addDamageNumber({
          id: `splash-${Date.now()}-${Math.random()}`,
          value: splashDmg,
          position: { ...otherTower.position },
          isCrit: false,
          lifetime: 0.8,
        });
      });
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
    // [FIX] miss/hit 쿨다운 계산식 통일 (기존: miss=0.5, hit=0.2 → 모두 0.2)
    const speedMultiplier = Math.max(0.2, 1 - tower.speed / 300);

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
        // [FIX-MUT] 직접 변이 제거 → updateTower 경유
        useGameStore.getState().updateTower(tower.id, {
          equippedMoves: tower.equippedMoves.map(mv =>
            mv.name === move.name
              ? { ...mv, currentCooldown: mv.cooldown * speedMultiplier }
              : mv
          ),
        });
        return;
      }
      // [FIX-MUT] 직접 변이 제거 → updateTower 경유
      useGameStore.getState().updateTower(tower.id, {
        equippedMoves: tower.equippedMoves.map(mv =>
          mv.name === move.name
            ? { ...mv, currentCooldown: mv.cooldown * speedMultiplier }
            : mv
        ),
      });
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
      effectiveness: eff,
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
  // [수정 5] 업적 체크 시 pendingStats의 미저장 값도 포함하여 올바른 누적치로 체크
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

    // [BUG-1 FIX] isFainted 타워는 XP 지급 제외
    // 쓰러진 상태에서 레벨이 오르는 비정상 동작 방지
    const xpAmount = enemy.isBoss ? 50 : 10;
    useGameStore.getState().towers
      .filter(t => !t.isFainted)
      .forEach(t => {
        addXpToTower(t.id, xpAmount);
      });

    // [수정 5] pendingStats 증가
    this.pendingStats.enemiesKilled++;
    this.pendingStats.totalMoneyEarned += reward;
    if (enemy.isBoss) this.pendingStats.bossesDefeated++;
    this.flushStats();

    // [A2-FIX] pendingStats flush 딜레이(500ms)로 인해 localStorage가 stale일 수 있음.
    //   저장값 + 미flush 누적값 합산 → 정확한 현재 처치 수를 onKill에 직접 전달.
    const savedStats = saveService.load().stats;
    const accumulatedKills = savedStats.enemiesKilled + this.pendingStats.enemiesKilled;
    const accumulatedBosses = savedStats.bossesDefeated + this.pendingStats.bossesDefeated;
    achievementService.onKill(enemy.name, enemy.isBoss, accumulatedKills, accumulatedBosses);
    // [FIX-6] setTimeout 5초 딜레이 클리어 제거 — checkWaveComplete.finally에서
    // killedEnemyIds.clear()가 일괄 처리하므로 개별 setTimeout 불필요 (타이밍 중복 방지)
  }

  // [FIX-MUT] 직접 변이(mutation) 제거 → setState를 통한 불변 업데이트
  // 만료된 항목 필터링과 position/lifetime 갱신을 단일 setState로 처리
  private updateDamageNumbers(dt: number) {
    useGameStore.setState(state => {
      if (state.damageNumbers.length === 0) return state;
      return {
        damageNumbers: state.damageNumbers
          .filter(dmg => dmg.lifetime > dt)
          .map(dmg => ({
            ...dmg,
            lifetime: dmg.lifetime - dt,
            position: { x: dmg.position.x, y: dmg.position.y - 20 * dt },
          })),
      };
    });
  }

  // [수정] checkWaveComplete: isCompletingWave 플래그로 중복 실행 방지
  // [수정] 멀티플레이에서 isPaused: true 설정 안 함 (BattlePhaseUI가 페이즈 전환 담당)
  // [FIX] 보스뿐 아니라 일반 적의 async 스폰도 완료될 때까지 웨이브 종료 방지
  private async checkWaveComplete() {
    const { enemies, isWaveActive, isSpawning, lives } = useGameStore.getState();

    // [FIX] hasPendingSpawns: 보스 + 일반 적의 async 스폰 모두 체크
    const waveSystem = WaveSystem.getInstance();
    if (!isWaveActive || isSpawning || enemies.length !== 0 || waveSystem.hasPendingSpawns) return;
    if (this.isCompletingWave) return;

    // [FIX-3] 멀티플레이에서 라이프가 0이 된 경우(탈락 상태) 웨이브 완료 처리 방지
    // GameLayout의 defeatedRef 구독이 처리하기 전에 markWaveCompleted가 호출되는
    // 레이스 컨디션을 방지. 탈락자가 아직 살아있는 것으로 카운트되면 안 됨.
    const multiRoomId = multiplayerService.getCurrentRoomId();
    if (multiRoomId && lives <= 0) return;

    this.isCompletingWave = true;

    try {
      const { healAllTowers, setWaveEndItemPick, towers, wave, gameTime, currentMap, lives: currentLives, difficulty } =
        useGameStore.getState();

      const isMultiplayer = !!multiRoomId; // 위에서 선언한 multiRoomId 재사용

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
          achievementService.onWaveComplete(wave, currentLives, 50, gameTime, difficulty, towers);

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