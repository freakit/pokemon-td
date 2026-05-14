// src/services/DatabaseService.ts
// [FREE-TIER] Firestore 쿼터 절감을 위한 데이터 정리 로직 추가
//   - hallOfFame: 맵당 최대 50개 유지, 30일 이상 된 항목 삭제
//   - 정리는 게임 클리어 후 20% 확률로 실행 (쿼터 낭비 방지)
import {
  doc, setDoc, getDoc, collection, query, where, orderBy,
  limit, getDocs, addDoc, updateDoc, deleteDoc, writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { HallOfFameEntry, LeaderboardEntry } from '../types/multiplayer';
import { Achievement } from '../types/game';
import { authService } from './AuthService';

// [FREE-TIER] 무료 플랜 데이터 보존 한도
const HALL_OF_FAME_MAX_AGE_DAYS = 60;  // 이 일수보다 오래된 자신의 기록은 삭제 후보

// ─── AP 랭킹 엔트리 타입 ──────────────────────────────────────────────────────
export interface APRankingEntry {
  userId: string;
  userName: string | null;
  totalAP: number;
  achievementCount: number; // 달성 횟수 합산
  updatedAt: number;
}

class DatabaseService {


  async addHallOfFameEntry(
    mapId: string,
    mapName: string,
    wave: number,
    pokemonUsed: string[],
    clearTime: number
  ): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const entry: Omit<HallOfFameEntry, 'id'> = {
      userId: user.uid,
      userName: user.displayName,
      mapId,
      mapName,
      wave,
      pokemonUsed,
      clearTime,
      timestamp: Date.now(),
    };
    await addDoc(collection(db, 'hallOfFame'), entry);

    // [FREE-TIER] 20% 확률로 오래된 기록 정리 (매번 실행 시 Firestore 쿼터 낭비)
    if (Math.random() < 0.2) {
      this.cleanupOldHallOfFame(mapId).catch(() => {});
    }
  }

  /**
   * [FREE-TIER] 현재 유저의 오래된/초과된 전당 기록을 삭제하여 Firestore 용량/쿼터 절감.
   *
   * ★ Firestore 보안 룰: delete는 resource.data.userId == request.auth.uid 만 허용.
   *   → 반드시 자신의 기록만 쿼리·삭제해야 함. 타 유저 항목 삭제 시도 시 permission-denied.
   *
   * 보존 정책:
   *   - clearTime 기준 상위(빠른) 10개는 날짜에 관계없이 영구 보존
   *   - 11위 이하이면서 60일이 지난 기록만 삭제 대상
   *   - 한 번에 최대 5개만 삭제 (Firestore 쓰기 쿼터 보호)
   *
   * composite index 없이 동작하도록 Firestore에서는 == 필터만 사용,
   * clearTime 정렬은 메모리에서 수행.
   */
  private async cleanupOldHallOfFame(mapId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    try {
      const cutoffMs = Date.now() - HALL_OF_FAME_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
      const TOP_K = 10; // 상위 K개는 날짜와 무관하게 영구 보존

      // == 필터만 사용 → composite index 불필요 (orderBy 제거)
      const q = query(
        collection(db, 'hallOfFame'),
        where('userId', '==', user.uid),
        where('mapId', '==', mapId),
        limit(100) // 유저당 맵당 현실적 상한
      );
      const snap = await getDocs(q);

      // clearTime 오름차순 정렬 (빠를수록 상위)
      const sorted = snap.docs
        .slice()
        .sort((a, b) =>
          (a.data() as HallOfFameEntry).clearTime -
          (b.data() as HallOfFameEntry).clearTime
        );

      // 상위 TOP_K 개의 ID를 보호 목록에 등록
      const protectedIds = new Set(sorted.slice(0, TOP_K).map(d => d.id));

      // TOP_K 밖이면서 60일 초과된 기록만 삭제 후보
      const toDelete: string[] = [];
      for (const d of sorted.slice(TOP_K)) {
        const ts = (d.data() as HallOfFameEntry).timestamp;
        if (!protectedIds.has(d.id) && ts < cutoffMs) {
          toDelete.push(d.id);
        }
      }

      // 최대 5개씩만 삭제 (Firestore 쓰기 쿼터 보호)
      const batch = toDelete.slice(0, 5);
      await Promise.all(batch.map(id => deleteDoc(doc(db, 'hallOfFame', id))));

      if (batch.length > 0) {
        console.log(`[DB] cleanupOldHallOfFame: deleted ${batch.length} own entries for map ${mapId}`);
      }
    } catch (err) {
      // 정리 실패는 무시 (게임 진행에 영향 없음)
      console.warn('[DB] cleanupOldHallOfFame failed:', err);
    }
  }

  async getUserHallOfFame(): Promise<HallOfFameEntry[]> {
    const user = authService.getCurrentUser();
    if (!user) return [];

    const q = query(
      collection(db, 'hallOfFame'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as HallOfFameEntry));
  }

  async getGlobalHallOfFame(
    mapId?: string,
    sortBy: 'clearTime' | 'timestamp' = 'clearTime'
  ): Promise<HallOfFameEntry[]> {
    try {
      let q;
      if (mapId) {
        q = query(
          collection(db, 'hallOfFame'),
          where('mapId', '==', mapId),
          orderBy(sortBy, 'asc'),
          limit(20)
        );
      } else {
        q = query(
          collection(db, 'hallOfFame'),
          orderBy(sortBy, 'asc'),
          limit(20)
        );
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as HallOfFameEntry));
    } catch {
      return [];
    }
  }

  async getGlobalHighestWave(mapId?: string): Promise<LeaderboardEntry[]> {
    try {
      let q;
      if (mapId) {
        q = query(
          collection(db, 'leaderboards'),
          where('mapId', '==', mapId),
          orderBy('highestWave', 'desc'),
          limit(20)
        );
      } else {
        q = query(
          collection(db, 'leaderboards'),
          orderBy('highestWave', 'desc'),
          limit(20)
        );
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
    } catch {
      return [];
    }
  }

  async updateLeaderboard(
    mapId: string,
    clearTime: number | undefined,
    highestWave: number
  ): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const docRef = doc(db, 'leaderboards', `${user.uid}_${mapId}`);
    const docSnap = await getDoc(docRef);

    const newEntry: LeaderboardEntry = {
      userId: user.uid,
      userName: user.displayName,
      mapId,
      clearTime,
      highestWave,
      timestamp: Date.now(),
      rating: user.rating,
    };

    if (!docSnap.exists()) {
      await setDoc(docRef, newEntry);
      return;
    }

    const existing = docSnap.data() as LeaderboardEntry;

    if (clearTime !== undefined) {
      if (!existing.clearTime || clearTime < existing.clearTime) {
        await setDoc(docRef, newEntry);
      }
    } else {
      if (highestWave > (existing.highestWave ?? 0)) {
        await setDoc(docRef, { ...existing, highestWave, timestamp: Date.now() });
      }
    }
  }

  async getMapLeaderboard(
    mapId: string,
    sortBy: 'clearTime' | 'highestWave'
  ): Promise<LeaderboardEntry[]> {
    const q = query(
      collection(db, 'leaderboards'),
      where('mapId', '==', mapId),
      orderBy(sortBy, sortBy === 'clearTime' ? 'asc' : 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
  }

  async getUserRankForMap(
    mapId: string,
    sortBy: 'clearTime' | 'highestWave'
  ): Promise<number | null> {
    const user = authService.getCurrentUser();
    if (!user) return null;

    const userDocRef = doc(db, 'leaderboards', `${user.uid}_${mapId}`);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) return null;

    const userData = userDoc.data() as LeaderboardEntry;
    const userValue = sortBy === 'clearTime' ? userData.clearTime : userData.highestWave;
    if (!userValue) return null;

    // [FIX-QUOTA] 전체 컬렉션 스캔 대신 "나보다 나은 기록" 수만 쿼리 (limit 500).
    // clearTime: 낮을수록 좋음 → 내 값보다 작은 것이 나보다 앞 순위
    // highestWave: 높을수록 좋음 → 내 값보다 큰 것이 나보다 앞 순위
    const betterOp = sortBy === 'clearTime' ? '<' : '>' as const;
    const q = query(
      collection(db, 'leaderboards'),
      where('mapId', '==', mapId),
      where(sortBy, betterOp as any, userValue),
      limit(500)
    );
    const snapshot = await getDocs(q);
    return snapshot.size + 1;
  }

  async updateUserRating(userId: string, newRating: number): Promise<void> {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, { rating: newRating });
  }

  // ─── [리뉴얼] 업적 저장 — AP 포함 (WriteBatch로 원자적 처리) ───────────────
  // [FIX-QUOTA] 업적 쓰기 + AP 랭킹 갱신을 단일 WriteBatch로 묶어 Firestore 쓰기 횟수 절반 절감.
  // 업적은 단조 증가(취소 불가)이므로 AP 랭킹도 항상 최신값으로 덮어써도 안전.
  // updateAPRanking의 불필요한 read(getDoc)도 제거 — AP가 낮아지는 경우는 없기 때문.
  async updateUserAchievement(achievement: Achievement, totalAP?: number): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const batch = writeBatch(db);

    // 1) 업적 문서 병합 쓰기
    const achRef = doc(db, 'achievements', `${user.uid}_${achievement.id}`);
    batch.set(achRef, { userId: user.uid, ...achievement }, { merge: true });

    // 2) AP 랭킹 덮어쓰기 (totalAP가 전달된 경우만)
    //    업적은 단조 증가이므로 기존값 확인 없이 항상 overwrite해도 안전
    if (totalAP !== undefined) {
      const apRef = doc(db, 'apRankings', user.uid);
      const apEntry: APRankingEntry = {
        userId: user.uid,
        userName: user.displayName,
        totalAP,
        achievementCount: achievement.completions ?? 1,
        updatedAt: Date.now(),
      };
      batch.set(apRef, apEntry);
    }

    await batch.commit();
  }

  async getUserAchievements(): Promise<Achievement[]> {
    const user = authService.getCurrentUser();
    if (!user) return [];
    const q = query(
      collection(db, 'achievements'),
      where('userId', '==', user.uid)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Achievement);
  }

  // ─── AP 랭킹 ─────────────────────────────────────────────────────────────

  /**
   * 내 AP 랭킹 문서 갱신.
   * [FIX-QUOTA] updateUserAchievement의 WriteBatch에서 일괄 처리되므로,
   * 이 메서드는 외부(SaveService 등)에서 독립적으로 호출될 때만 사용.
   * 업적은 단조 증가이므로 기존값 read 없이 항상 overwrite.
   */
  async updateAPRanking(totalAP: number, achievementCount: number): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const entry: APRankingEntry = {
      userId: user.uid,
      userName: user.displayName,
      totalAP,
      achievementCount,
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'apRankings', user.uid), entry);
  }

  /**
   * 전체 AP 랭킹 Top 100 조회
   */
  async getAPRanking(limitCount = 100): Promise<APRankingEntry[]> {
    try {
      const q = query(
        collection(db, 'apRankings'),
        orderBy('totalAP', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as APRankingEntry);
    } catch {
      return [];
    }
  }

  /**
   * 내 AP 랭킹 순위 조회
   */
  async getMyAPRank(): Promise<number | null> {
    const user = authService.getCurrentUser();
    if (!user) return null;

    try {
      const myDoc = await getDoc(doc(db, 'apRankings', user.uid));
      if (!myDoc.exists()) return null;

      const myAP = (myDoc.data() as APRankingEntry).totalAP;
      // 나보다 AP 높은 사람 수 + 1 = 내 순위
      const q = query(
        collection(db, 'apRankings'),
        where('totalAP', '>', myAP)
      );
      const snapshot = await getDocs(q);
      return snapshot.size + 1;
    } catch {
      return null;
    }
  }
}




export const databaseService = new DatabaseService();