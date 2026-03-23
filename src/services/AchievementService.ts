// src/services/AchievementService.ts
/**
 * 업적 체크를 중앙에서 처리합니다.
 * 모든 게임 이벤트(적 처치, 진화, 시너지 등)는 이 서비스를 통해 업적을 갱신합니다.
 *
 * 사용법:
 *   import { achievementService } from './AchievementService';
 *   achievementService.onKill(isBoss);        // 적 처치 시
 *   achievementService.onMoneyEarned(amount); // 골드 획득 시
 *   achievementService.onEvolve('mega');      // 진화 시
 *   achievementService.onSell();              // 판매 시
 *   achievementService.onSynergyUpdate(synergies); // 시너지 변경 시
 *   achievementService.onMultiWin(rating);    // 멀티 승리 시
 */

import { saveService } from './SaveService';

class AchievementService {

  // ─── 누적 카운터 (게임 세션 내) ───────────────────────────────────────
  // 이 값들은 gameStore.stats가 아닌 SaveService를 통해 로컬스토리지에 영속 저장됨
  // (이미 saveService.updateStats로 저장 중 → 여기서는 업적 체크만)

  // ─── 전투 업적 ────────────────────────────────────────────────────────

  onKill(isBoss: boolean) {
    const stats = saveService.load().stats;
    const kills = stats.enemiesKilled; // killEnemy에서 이미 +1된 값

    // 일반 처치 업적
    const killThresholds = [100, 500, 1000, 5000];
    for (const t of killThresholds) {
      if (kills >= t) saveService.updateAchievement(`kill${t}`, kills);
    }

    // 보스 처치 업적
    if (isBoss) {
      const bosses = stats.bossesDefeated;
      const bossThresholds = [5, 20, 50];
      for (const t of bossThresholds) {
        if (bosses >= t) saveService.updateAchievement(`boss${t}`, bosses);
      }
    }
  }

  // ─── 경제 업적 ────────────────────────────────────────────────────────

  onMoneyEarned(totalEarned: number) {
    const thresholds = [10000, 100000, 500000];
    for (const t of thresholds) {
      if (totalEarned >= t) saveService.updateAchievement(`money${t >= 500000 ? '500k' : t >= 100000 ? '100k' : '10k'}`, totalEarned);
    }
  }

  onSell() {
    const key = 'ach_sell_count';
    const cur = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(cur));

    if (cur >= 10) saveService.updateAchievement('sell10', cur);
    if (cur >= 50) saveService.updateAchievement('sell50', cur);
  }

  // ─── 성장 업적 ────────────────────────────────────────────────────────

  onEvolve(type: 'normal' | 'mega' | 'gigamax' | 'fusion') {
    const stats = saveService.load().stats;
    const evoCount = stats.evolutionsAchieved; // evolvePokemon에서 이미 +1

    if (type === 'normal') {
      const thresholds = [1, 10, 50];
      for (const t of thresholds) {
        if (evoCount >= t) saveService.updateAchievement(`evolve${t}`, evoCount);
      }
    }

    if (type === 'mega') {
      const key = 'ach_mega_count';
      const cur = parseInt(localStorage.getItem(key) || '0', 10) + 1;
      localStorage.setItem(key, String(cur));
      if (cur >= 1) saveService.updateAchievement('mega1', cur);
      if (cur >= 5) saveService.updateAchievement('mega5', cur);
    }

    if (type === 'gigamax') {
      saveService.updateAchievement('gigamax1', 1);
    }

    if (type === 'fusion') {
      saveService.updateAchievement('fusion1', 1);
    }
  }

  onLevel100() {
    saveService.updateAchievement('level100', 1);
  }

  onTeamAllLevel50() {
    saveService.updateAchievement('max_team', 1);
  }

  // ─── 시너지 업적 ──────────────────────────────────────────────────────

  onSynergyUpdate(activeSynergies: Array<{ id: string; level: number; count: number }>) {
    // 복합 시너지 수 체크
    const synergyCount = activeSynergies.length;
    if (synergyCount >= 3) saveService.updateAchievement('synergy_multi3', synergyCount);
    if (synergyCount >= 5) saveService.updateAchievement('synergy_multi5', synergyCount);

    for (const syn of activeSynergies) {
      // syn.id 형식: "type:fire" 또는 "gen:1"
      const [kind, value] = syn.id.split(':');

      if (kind === 'type') {
        // 2단계(level=1: count=2), 4단계(level=2: count=4), 6단계(level=3: count=6)
        if (syn.count >= 2) saveService.updateAchievement(`syn_type_${value}_2`, 1);
        if (syn.count >= 4) saveService.updateAchievement(`syn_type_${value}_4`, 1);
        if (syn.count >= 6) saveService.updateAchievement(`syn_type_${value}_6`, 1);
      }

      if (kind === 'gen') {
        if (syn.count >= 2) saveService.updateAchievement(`syn_gen_${value}_2`, 1);
        if (syn.count >= 4) saveService.updateAchievement(`syn_gen_${value}_4`, 1);
        if (syn.count >= 6) saveService.updateAchievement(`syn_gen_${value}_6`, 1);
      }
    }
  }

  // ─── 도전 업적 ────────────────────────────────────────────────────────

  onWaveComplete(wave: number, lives: number, initialLives: number, gameTime: number, difficulty: string, towers: Array<{ isFainted: boolean }>) {
    // [수정] wave 업적: 항상 현재 진행도를 업데이트 (프로그레스 바 표시)
    const waveThresholds = [5, 10, 20, 30, 50];
    for (const threshold of waveThresholds) {
      saveService.updateAchievement(`wave${threshold}`, wave);
    }

    // 퍼펙트 방어 (라이프 손실 없이 웨이브 10)
    // [수정] === 대신 >= 사용 (초기 라이프보다 많을 수 없지만 방어적 코딩)
    if (wave === 10 && lives >= initialLives) {
      saveService.updateAchievement('perfect', 1);
    }

    // 스피드런 (웨이브 20을 30분 내)
    if (wave === 20 && gameTime <= 30 * 60 * 1000) {
      saveService.updateAchievement('speedrun', 1);
    }

    // 불패신화 (기절 없이 웨이브 30)
    if (wave === 30 && towers.every(t => !t.isFainted)) {
      saveService.updateAchievement('nolosses', 1);
    }

    // 난이도 클리어 (웨이브 30+)
    if (wave >= 30) {
      if (difficulty === 'hard') saveService.updateAchievement('hard_clear', 1);
      if (difficulty === 'expert') saveService.updateAchievement('expert_clear', 1);
    }

    // 50파 스피드런 (웨이브 50을 60분 내)
    if (wave === 50 && gameTime <= 60 * 60 * 1000) {
      saveService.updateAchievement('speed50', 1);
    }
  }

  onAllMapsClear() {
    saveService.updateAchievement('all_maps', 1);
  }

  // ─── 멀티플레이 업적 ──────────────────────────────────────────────────

  /** 배틀 매치 1승 획득 시 호출 */
  onMultiWin(currentRating: number) {
    const key = 'ach_multi_wins';
    const cur = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(cur));

    if (cur >= 1)  saveService.updateAchievement('multi_first_win', cur);
    if (cur >= 5)  saveService.updateAchievement('multi_5wins', cur);
    if (cur >= 20) saveService.updateAchievement('multi_20wins', cur);

    // 레이팅 업적은 현재 레이팅 기준으로도 체크 (임시값)
    this.onRatingUpdate(currentRating);
  }

  /** 레이팅 확정 후 정확한 레이팅 업적 체크 */
  onRatingUpdate(newRating: number) {
    if (newRating >= 1200) saveService.updateAchievement('rating1200', newRating);
    if (newRating >= 1500) saveService.updateAchievement('rating1500', newRating);
  }

  // ─── 세션 리셋 (게임 재시작 시 localStorage 카운터는 유지) ────────────
  // sell/mega/multi 카운터는 localStorage에 영속 저장되므로 별도 리셋 불필요
}

export const achievementService = new AchievementService();