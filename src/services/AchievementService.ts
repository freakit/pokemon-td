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
 *   achievementService.onPokedexAdd(pokedex); // 포켓몬 도감 등록 시
 */

import { saveService } from './SaveService';
import { authService } from './AuthService';

class AchievementService {

  // ─── [BUG-3 FIX] 유저별 localStorage 키 생성 ───────────────────────────
  // 기존: 고정 키('ach_sell_count' 등) → 같은 기기에서 계정 전환 시 카운터 공유
  // 수정: uid를 키에 포함 → 계정별 독립적인 카운터 유지
  private getUserKey(baseKey: string): string {
    const uid = authService.getCurrentUser()?.uid;
    return uid ? `${baseKey}_${uid}` : baseKey;
  }

  // ─── 전투 업적 ────────────────────────────────────────────────────────

  /**
   * @param killOverride  GameManager에서 pendingStats 포함 누적값 전달 시 사용.
   *                      localStorage flush 딜레이(500ms)로 인한 stale read 방지.
   * @param bossOverride  보스 처치 수 누적값 오버라이드.
   */
  onKill(pokemonName: string = '', isBoss: boolean = false, killOverride?: number, bossOverride?: number) {
    const stats = saveService.load().stats;
    // [A2-FIX] pendingStats가 flush 전이면 killOverride로 정확한 누적값 사용
    const kills = killOverride ?? stats.enemiesKilled;

    // [BUG-2 FIX] 처치 업적 임계값 — achievements.ts의 kill50/100/300/500/1000에 맞춤
    // 기존: [100, 500, 1000, 5000] → kill50·kill300 달성 불가, kill5000은 없는 업적
    const killThresholds = [50, 100, 300, 500, 1000];
    for (const t of killThresholds) {
      if (kills >= t) saveService.updateAchievement(`kill${t}`, kills);
    }

    // [BUG-2 FIX] 보스 처치 업적 임계값 — achievements.ts의 boss1/5/15/30에 맞춤
    // 기존: [5, 20, 50] → boss1·boss15·boss30 달성 불가, boss20·boss50은 없는 업적
    if (isBoss) {
      const bosses = bossOverride ?? stats.bossesDefeated;
      const bossThresholds = [1, 5, 15, 30];
      for (const t of bossThresholds) {
        if (bosses >= t) saveService.updateAchievement(`boss${t}`, bosses);
      }
    }

    // 특정 포켓몬 처치 업적 등 추후 확장을 위해 pokemonName 파라미터 사용 가능
    if (pokemonName === 'Mewtwo') {
      // 추후 뮤츠 처치 시 히든 업적 등
    }
  }

  // ─── 경제 업적 ────────────────────────────────────────────────────────

  // [BUG-2 FIX] 골드 업적 ID — achievements.ts의 money5k/20k/50k에 맞춤
  // 기존: [10000, 100000, 500000] → money10k/100k/500k (없는 ID), money5k/20k/50k 달성 불가
  onMoneyEarned(totalEarned: number) {
    if (totalEarned >= 5000)  saveService.updateAchievement('money5k',  totalEarned);
    if (totalEarned >= 20000) saveService.updateAchievement('money20k', totalEarned);
    if (totalEarned >= 50000) saveService.updateAchievement('money50k', totalEarned);
  }

  // [BUG-2 FIX] 판매 업적 임계값 — achievements.ts의 sell5/20/50에 맞춤
  // 기존: [10, 50] → sell5·sell20 달성 불가, sell10은 없는 업적
  // [BUG-3 FIX] getUserKey() 사용 → 계정별 독립 카운터
  onSell() {
    const key = this.getUserKey('ach_sell_count');
    const cur = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(cur));

    if (cur >= 5)  saveService.updateAchievement('sell5',  cur);
    if (cur >= 20) saveService.updateAchievement('sell20', cur);
    if (cur >= 50) saveService.updateAchievement('sell50', cur);
  }

  // ─── 성장 업적 ────────────────────────────────────────────────────────

  // [BUG-2 FIX] 진화 업적 임계값 — achievements.ts의 evolve1/5/20/50에 맞춤
  // 기존: [1, 10, 50] → evolve5·evolve20 달성 불가, evolve10은 없는 업적
  // [BUG-3 FIX] getUserKey() 사용 → 계정별 독립 카운터 (mega)
  onEvolve(type: 'normal' | 'mega' | 'gigamax' | 'fusion') {
    const stats = saveService.load().stats;
    const evoCount = stats.evolutionsAchieved; // evolvePokemon에서 이미 +1

    if (type === 'normal') {
      const thresholds = [1, 5, 20, 50];
      for (const t of thresholds) {
        if (evoCount >= t) saveService.updateAchievement(`evolve${t}`, evoCount);
      }
    }

    if (type === 'mega') {
      const key = this.getUserKey('ach_mega_count');
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
      // syn.id 형식: "type:fire" 또는 "gen:1" 또는 "special:baby"
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

      if (kind === 'special') {
        // calculateActiveSynergies는 count >= 2일 때만 special 시너지를 반환하므로
        // activeSynergies에 존재한다는 것 자체가 이미 2마리 이상 배치됨을 의미
        saveService.updateAchievement(`syn_special_${value}`, 1);
      }
    }
  }

  // ─── 도전 업적 ────────────────────────────────────────────────────────

  // [BUG-2 FIX] 웨이브 업적 임계값 — achievements.ts의 wave3/5/10/20/30/40/50에 맞춤
  // 기존: [5, 10, 20, 30, 50] → wave3·wave40 달성 불가
  onWaveComplete(wave: number, lives: number, initialLives: number, gameTime: number, difficulty: string, towers: Array<{ isFainted: boolean }>) {
    const waveThresholds = [3, 5, 10, 20, 30, 40, 50];
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

  // ─── 스토리 업적 ──────────────────────────────────────────────────────
  /** 스토리 챕터(1~8) 클리어 시 호출. 챕터별 업적 1개씩 달성. */
  onStoryClear(chapterNumber: number) {
    if (chapterNumber >= 1 && chapterNumber <= 8) {
      saveService.updateAchievement(`story_ch${chapterNumber}`, 1);
    }
  }


  // ─── 멀티플레이 업적 ──────────────────────────────────────────────────

  // [BUG-3 FIX] getUserKey() 사용 → 계정별 독립 카운터
  /** 배틀 매치 1승 획득 시 호출 */
  onMultiWin(currentRating: number) {
    const key = this.getUserKey('ach_multi_wins');
    const cur = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(cur));

    if (cur >= 1)  saveService.updateAchievement('multi_first_win', cur);
    if (cur >= 5)  saveService.updateAchievement('multi_5wins', cur);
    if (cur >= 20) saveService.updateAchievement('multi_20wins', cur);
    if (cur >= 50) saveService.updateAchievement('multi_50wins', cur);

    // 레이팅 업적은 현재 레이팅 기준으로도 체크 (임시값)
    this.onRatingUpdate(currentRating);
  }

  /** 레이팅 확정 후 정확한 레이팅 업적 체크 */
  onRatingUpdate(newRating: number) {
    if (newRating >= 1000) saveService.updateAchievement('rating1000', newRating);
    if (newRating >= 1200) saveService.updateAchievement('rating1200', newRating);
    if (newRating >= 1500) saveService.updateAchievement('rating1500', newRating);
    if (newRating >= 1800) saveService.updateAchievement('rating1800', newRating);
  }

  // ─── 세션 리셋 (게임 재시작 시 localStorage 카운터는 유지) ────────────

  // sell/mega/multi 카운터는 localStorage에 영속 저장되므로 별도 리셋 불필요
}

export const achievementService = new AchievementService();