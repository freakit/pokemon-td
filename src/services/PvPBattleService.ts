// src/services/PvPBattleService.ts
// TFT 스타일 PvP 대전 시스템
// [수정] 풀리그 방식 매칭: 모든 생존자와 동일 횟수를 만나기 전까지 아직 안 만난 상대 우선

import { TowerDetail, PvPBattleResult, RoundMatchup, EncounterRecord, PlayerGameState, BattleLogEntry } from '../types/multiplayer';
import { getTypeEffectiveness } from '../utils/typeEffectiveness';

class PvPBattleService {
  /**
   * [수정] 풀리그 방식 매칭
   * 
   * 규칙:
   * 1. 모든 생존자와 동일한 횟수를 만나기 전까지, 아직 만나지 않은 상대와 우선 매칭
   * 2. 모든 상대를 만났으면 가장 적게 만난 상대부터 다시 매칭
   * 3. 홀수 플레이어일 경우:
   *    - 직전 라운드에 쉰 플레이어는 연속 스킵 방지를 위해 제외
   *    - 나머지 중 총 대전 횟수가 가장 많은(= 가장 덜 쉰) 플레이어가 쉼
   *    - 동점이면 라이프가 가장 낮은 플레이어가 쉼
   */
  generateMatchups(
    players: PlayerGameState[],
    encounterRecord: EncounterRecord,
    roundNumber: number,
    lastSkipPlayerId?: string | null
  ): RoundMatchup {
    // 생존 플레이어만 필터링
    const alivePlayers = players.filter(p => p.isAlive);
    
    // 홀수인 경우 스킵 플레이어 결정
    let skipPlayerId: string | undefined;
    let playersToMatch = [...alivePlayers];
    
    if (alivePlayers.length % 2 !== 0) {
      // 직전 라운드에 쉰 플레이어는 후보에서 제외 (연속 스킵 방지)
      const candidates = lastSkipPlayerId
        ? alivePlayers.filter(p => p.userId !== lastSkipPlayerId)
        : alivePlayers;
      
      // 후보가 없으면 (2인 중 1인이 전에 쉬었을 때) 전체에서 선택
      const pool = candidates.length > 0 ? candidates : alivePlayers;

      // 각 플레이어의 총 대전 횟수 계산
      const totalEncounters = pool.map(p => {
        let total = 0;
        for (const other of alivePlayers) {
          if (other.userId === p.userId) continue;
          total += this.getEncounterCount(encounterRecord, p.userId, other.userId);
        }
        return { player: p, total };
      });

      // 총 대전 횟수가 가장 많은 플레이어 (동점이면 라이프 최저)
      totalEncounters.sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.player.lives - b.player.lives;
      });

      skipPlayerId = totalEncounters[0]?.player.userId;
      playersToMatch = alivePlayers.filter(p => p.userId !== skipPlayerId);
    }
    
    // ── 풀리그 기반 매칭 ──
    // 모든 가능한 페어의 만남 횟수를 계산하고, 만남이 적은 페어부터 매칭
    const matches: Array<{ player1Id: string; player2Id: string }> = [];
    const matched = new Set<string>();

    type Pair = { p1: string; p2: string; encounters: number };
    const pairs: Pair[] = [];

    for (let i = 0; i < playersToMatch.length; i++) {
      for (let j = i + 1; j < playersToMatch.length; j++) {
        const p1 = playersToMatch[i].userId;
        const p2 = playersToMatch[j].userId;
        pairs.push({
          p1, p2,
          encounters: this.getEncounterCount(encounterRecord, p1, p2)
        });
      }
    }

    // 만남 횟수가 적은 페어부터 매칭 (풀리그 보장)
    pairs.sort((a, b) => a.encounters - b.encounters);

    for (const pair of pairs) {
      if (matched.has(pair.p1) || matched.has(pair.p2)) continue;
      matches.push({ player1Id: pair.p1, player2Id: pair.p2 });
      matched.add(pair.p1);
      matched.add(pair.p2);
    }
    
    return {
      roundNumber,
      matches,
      skipPlayerId: skipPlayerId || null, // Firebase는 undefined를 허용하지 않음
      timestamp: Date.now()
    };
  }
  
  /**
   * 두 플레이어 간의 만남 횟수 조회
   */
  private getEncounterCount(record: EncounterRecord, p1: string, p2: string): number {
    return (record[p1]?.[p2] ?? 0) + (record[p2]?.[p1] ?? 0);
  }
  
  /**
   * 만남 기록 업데이트
   */
  updateEncounterRecord(
    record: EncounterRecord,
    player1Id: string,
    player2Id: string
  ): EncounterRecord {
    const newRecord = { ...record };
    
    if (!newRecord[player1Id]) newRecord[player1Id] = {};
    if (!newRecord[player2Id]) newRecord[player2Id] = {};
    
    newRecord[player1Id][player2Id] = (newRecord[player1Id][player2Id] ?? 0) + 1;
    newRecord[player2Id][player1Id] = (newRecord[player2Id][player1Id] ?? 0) + 1;
    
    return newRecord;
  }
  

  /**
   * PvP 대전 시뮬레이션
   * 한 쪽 포켓몬이 전멸할 때까지 대전 (로그 기록)
   */
  simulateBattle(
    team1: TowerDetail[],
    team2: TowerDetail[],
    player1Id: string,
    player2Id: string,
    roundNumber: number
  ): PvPBattleResult {
    const battleLog: BattleLogEntry[] = [];
    const safeTeam1 = Array.isArray(team1) ? team1 : [];
    const safeTeam2 = Array.isArray(team2) ? team2 : [];
    
    // 살아있는 포켓몬만 복사하여 대전
    // ID 할당 (p1-0, p1-1... / p2-0, p2-1...)
    const team1Battle = safeTeam1  // ✅ team1 → safeTeam1
      .filter(p => !p.isFainted && p.currentHp > 0)
      .map((p, idx) => ({ ...p, battleId: `p1-${idx}` }));
    const team2Battle = safeTeam2  // ✅ team2 → safeTeam2
      .filter(p => !p.isFainted && p.currentHp > 0)
      .map((p, idx) => ({ ...p, battleId: `p2-${idx}` }));
    
    // 대전 시뮬레이션 (턴제)
    let turn = 0;
    const maxTurns = 100; // 무한루프 방지

    // Guard: If any team is empty (e.g. data load failure), return immediate result to avoid freeze
    if (team1Battle.length === 0 || team2Battle.length === 0) {
      console.warn(`[PvPBattleService] Empty team detected! P1: ${team1Battle.length}, P2: ${team2Battle.length}`);
    }
    
    while (
      team1Battle.some(p => p.currentHp > 0) &&
      team2Battle.some(p => p.currentHp > 0) &&
      turn < maxTurns
    ) {
      turn++;
      
      // 각 팀에서 살아있는 포켓몬들이 공격
      // 공격자, 방어자 명시
      this.executeTurnWithLog(team1Battle, team2Battle, turn, battleLog);
      if (team2Battle.some(p => p.currentHp > 0)) {
         this.executeTurnWithLog(team2Battle, team1Battle, turn, battleLog);
      }
    }
    
    // 결과 계산
    const team1Remaining = team1Battle.filter(p => p.currentHp > 0).length;
    const team2Remaining = team2Battle.filter(p => p.currentHp > 0).length;
    
    let winnerId: string;
    let lifeLost: number;
    
    if (team1Remaining > 0 && team2Remaining === 0) {
      winnerId = player1Id;
      lifeLost = team1Remaining; 
    } else if (team2Remaining > 0 && team1Remaining === 0) {
      winnerId = player2Id;
      lifeLost = team2Remaining;
    } else {
      // 둘 다 전멸 또는 시간초과 - HP 비율로 판정
      const team1HpRatio = team1Battle.reduce((sum, p) => sum + Math.max(0, p.currentHp), 0) /
                          team1Battle.reduce((sum, p) => sum + p.maxHp, 0);
      const team2HpRatio = team2Battle.reduce((sum, p) => sum + Math.max(0, p.currentHp), 0) /
                          team2Battle.reduce((sum, p) => sum + p.maxHp, 0);
      
      if (team1HpRatio > team2HpRatio) {
        winnerId = player1Id;
        lifeLost = 1;
      } else if (team2HpRatio > team1HpRatio) {
        winnerId = player2Id;
        lifeLost = 1;
      } else {
        winnerId = player1Id;
        lifeLost = 1;
      }
    }
    
    return {
      matchId: `${roundNumber}-${player1Id}-${player2Id}-${Date.now()}`,
      roundNumber,
      player1Id,
      player2Id,
      winnerId,
      player1RemainingPokemon: team1Remaining,
      player2RemainingPokemon: team2Remaining,
      lifeLost,
      battleLog, // [UPDATED] Add log
      timestamp: Date.now()
    };
  }
  
  /**
   * 한 턴 실행 (로그 기록 포함)
   */
  private executeTurnWithLog(
    attackers: (TowerDetail & { battleId: string })[], 
    defenders: (TowerDetail & { battleId: string })[],
    turn: number,
    log: BattleLogEntry[]
  ): void {
    const aliveAttackers = attackers.filter(p => p.currentHp > 0);
    
    // 스피드 순으로 정렬
    aliveAttackers.sort((a, b) => (b.speed ?? 100) - (a.speed ?? 100));
    
    for (const attacker of aliveAttackers) {
      if (attacker.currentHp <= 0) continue; // 턴 도중 기절할 수도 있음

      const livingDefenders = defenders.filter(p => p.currentHp > 0);
      if (livingDefenders.length === 0) break;
      
      // 가장 체력이 낮은 방어자 타겟팅
      const target = livingDefenders.reduce((min, p) => 
        p.currentHp < min.currentHp ? p : min
      );
      
      // 데미지 계산
      const damage = this.calculateBattleDamage(attacker, target);
      target.currentHp -= damage;

      const isFainted = target.currentHp <= 0;
      
      // 로그 기록
      log.push({
        turn,
        attackerId: attacker.battleId,
        targetId: target.battleId,
        action: 'attack',
        damage,
        isCrit: false, // TODO: 랜덤 요소 추가 시 반영
        isMiss: false,
        isFainted,
        moveName: 'Attack',
        timestamp: Date.now()
      });
    }
  }

  /**
   * 대전 데미지 계산 (타입 상성 포함)
   */
  private calculateBattleDamage(attacker: TowerDetail, defender: TowerDetail): number {
    const attackStat = attacker.attack ?? attacker.level * 10;
    const defenseStat = defender.defense ?? defender.level * 5;
    const attackerTypes = attacker.types ?? [];
    const defenderTypes = defender.types ?? [];
    
    // 기본 데미지 공식
    const basePower = 50 + attacker.level;
    const level = attacker.level;
    
    // 첫 번째 타입으로 상성 계산
    const attackType = attackerTypes[0] ?? 'normal';
    const typeEff = getTypeEffectiveness(attackType, defenderTypes);
    
    // 포켓몬 공식 기반 데미지 계산
    const base = ((2 * level / 5 + 2) * basePower * attackStat / defenseStat / 50 + 2);
    const damage = base * typeEff;
    
    // 랜덤 요소 (0.85 ~ 1.0)
    const randomFactor = 0.85 + Math.random() * 0.15;
    
    return Math.max(1, Math.floor(damage * randomFactor));
  }
}

export const pvpBattleService = new PvPBattleService();