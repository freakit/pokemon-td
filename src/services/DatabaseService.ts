// src/services/DatabaseService.ts
import {
  doc, setDoc, getDoc, collection, query, where, orderBy,
  limit, getDocs, addDoc, updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { HallOfFameEntry, LeaderboardEntry } from '../types/multiplayer';
import { Achievement } from '../types/game';
import { authService } from './AuthService';

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

    const q = query(
      collection(db, 'leaderboards'),
      where('mapId', '==', mapId),
      orderBy(sortBy, sortBy === 'clearTime' ? 'asc' : 'desc')
    );
    const snapshot = await getDocs(q);
    const rank = snapshot.docs.findIndex(doc => doc.id === userDocRef.id) + 1;
    return rank > 0 ? rank : null;
  }

  async updateUserRating(userId: string, newRating: number): Promise<void> {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, { rating: newRating });
  }

  // ─── [리뉴얼] 업적 저장 — AP 포함 ──────────────────────────────────────────
  async updateUserAchievement(achievement: Achievement, totalAP?: number): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const docRef = doc(db, 'achievements', `${user.uid}_${achievement.id}`);
    await setDoc(docRef, { userId: user.uid, ...achievement }, { merge: true });

    // totalAP가 전달되면 AP 랭킹도 동시에 갱신
    if (totalAP !== undefined) {
      await this.updateAPRanking(totalAP, achievement.completions ?? 1);
    }
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
   * 내 AP 랭킹 문서 갱신 (상위 AP면 업데이트)
   */
  async updateAPRanking(totalAP: number, achievementCount: number): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const docRef = doc(db, 'apRankings', user.uid);
    const docSnap = await getDoc(docRef);

    const entry: APRankingEntry = {
      userId: user.uid,
      userName: user.displayName,
      totalAP,
      achievementCount,
      updatedAt: Date.now(),
    };

    if (!docSnap.exists() || totalAP > (docSnap.data() as APRankingEntry).totalAP) {
      await setDoc(docRef, entry);
    }
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