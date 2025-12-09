// src/services/PvPBattleService.ts
// TFT 스타일 PvP 대전 시스템

import { TowerDetail, PvPBattleResult, RoundMatchup, EncounterRecord, PlayerGameState, BattleLogEntry } from '../types/multiplayer';
import { getTypeEffectiveness } from '../utils/typeEffectiveness';

class PvPBattleService {
  /**
   * 만남 횟수가 가장 적은 플레이어들 중 랜덤 매칭
   * 홀수 플레이어일 경우 꼴지(라이프 최저)는 스킵
   */
  generateMatchups(
    players: PlayerGameState[],
    encounterRecord: EncounterRecord,
    roundNumber: number
  ): RoundMatchup {
    // 생존 플레이어만 필터링
    const alivePlayers = players.filter(p => p.isAlive);
    
    // 홀수인 경우 꼴지(라이프 최저) 스킵
    let skipPlayerId: string | undefined;
    let playersToMatch = [...alivePlayers];
    
    if (alivePlayers.length % 2 !== 0) {
      // 라이프가 가장 낮은 플레이어 찾기 (동점이면 랜덤)
      const minLives = Math.min(...alivePlayers.map(p => p.lives));
      const lastPlacePlayers = alivePlayers.filter(p => p.lives === minLives);
      const skipPlayer = lastPlacePlayers[Math.floor(Math.random() * lastPlacePlayers.length)];
      skipPlayerId = skipPlayer.userId;
      playersToMatch = alivePlayers.filter(p => p.userId !== skipPlayerId);
    }
    
    // 만남 횟수 기반 매칭
    const matches: Array<{ player1Id: string; player2Id: string }> = [];
    const matched = new Set<string>();
    
    while (playersToMatch.filter(p => !matched.has(p.userId)).length >= 2) {
      const unmatched = playersToMatch.filter(p => !matched.has(p.userId));
      
      // 첫 번째 플레이어 랜덤 선택
      const player1 = unmatched[Math.floor(Math.random() * unmatched.length)];
      matched.add(player1.userId);
      
      // 나머지 플레이어 중 만남 횟수가 가장 적은 플레이어들 찾기
      const remainingPlayers = unmatched.filter(p => p.userId !== player1.userId);
      const encounterCounts = remainingPlayers.map(p => ({
        player: p,
        count: this.getEncounterCount(encounterRecord, player1.userId, p.userId)
      }));
      
      const minEncounters = Math.min(...encounterCounts.map(e => e.count));
      const leastEncountered = encounterCounts.filter(e => e.count === minEncounters);
      
      // 최소 만남 횟수인 플레이어들 중 랜덤 선택
      const player2 = leastEncountered[Math.floor(Math.random() * leastEncountered.length)].player;
      matched.add(player2.userId);
      
      matches.push({ player1Id: player1.userId, player2Id: player2.userId });
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
    
    // 살아있는 포켓몬만 복사하여 대전
    // ID 할당 (p1-0, p1-1... / p2-0, p2-1...)
    const team1Battle = team1
      .filter(p => !p.isFainted && p.currentHp > 0)
      .map((p, idx) => ({ ...p, battleId: `p1-${idx}` }));
    const team2Battle = team2
      .filter(p => !p.isFainted && p.currentHp > 0)
      .map((p, idx) => ({ ...p, battleId: `p2-${idx}` }));
    
    // 대전 시뮬레이션 (턴제)
    let turn = 0;
    const maxTurns = 100; // 무한루프 방지

    // Guard: If any team is empty (e.g. data load failure), return immediate result to avoid freeze
    if (team1Battle.length === 0 || team2Battle.length === 0) {
      console.warn(`[PvPBattleService] Empty team detected! P1: ${team1Battle.length}, P2: ${team2Battle.length}`);
      // return immediate result handled by following logic naturally? 
      // Nope, loop won't run, result logic below handles it (0 remaining).
      // But verify if result logic handles 0 vs 0 correctly.
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
