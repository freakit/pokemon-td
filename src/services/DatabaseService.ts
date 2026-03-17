// src/services/DatabaseService.ts
import {
  doc, setDoc, getDoc, collection, query, where, orderBy,
  limit, getDocs, addDoc, updateDoc, increment
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PokedexEntry, HallOfFameEntry, LeaderboardEntry } from '../types/multiplayer';
import { Achievement } from '../types/game';
import { authService } from './AuthService';
import { saveService } from './SaveService';
import { ACHIEVEMENTS } from '../data/achievements';

class DatabaseService {

  // ─── 도감 업적 체크 ───────────────────────────────────────────────
  private async checkPokedexAchievements(currentCount: number) {
    try {
      const achievements = ACHIEVEMENTS.filter(a => a.condition === 'collect');
      for (const ach of achievements) {
        if (currentCount >= ach.target) {
          await saveService.updateAchievement(ach.id, ach.target);
        } else {
          await saveService.updateAchievement(ach.id, currentCount);
        }
      }
    } catch (err) {
      console.error('Failed to check pokedex achievements:', err);
    }
  }

  async addToPokedex(pokemonId: number, name: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const docRef = doc(db, 'pokedex', `${user.uid}_${pokemonId}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // 이미 등록됨 - 횟수만 증가
      await updateDoc(docRef, { timesSeen: increment(1) });
    } else {
      const entry: PokedexEntry = {
        pokemonId,
        name,
        firstSeen: Date.now(),
        timesSeen: 1,
      };
      await setDoc(docRef, { userId: user.uid, ...entry });

      // 새 포켓몬 등록 시에만 업적 체크
      try {
        const pokedex = await this.getUserPokedex();
        await this.checkPokedexAchievements(pokedex.length);
      } catch (err) {
        console.error('Failed to check achievements after adding to pokedex:', err);
      }
    }
  }

  async getUserPokedex(): Promise<PokedexEntry[]> {
    const user = authService.getCurrentUser();
    if (!user) return [];
    const q = query(
      collection(db, 'pokedex'),
      where('userId', '==', user.uid),
      orderBy('pokemonId')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        pokemonId: data.pokemonId,
        name: data.name,
        firstSeen: data.firstSeen,
        timesSeen: data.timesSeen,
      };
    });
  }

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

  /**
   * 전체 유저 전당등록 - 맵별 클리어 시간 Top 20
   * (hallOfFame 컬렉션에 difficulty 필드 없으면 mapId로만 필터)
   */
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

  /**
   * 전체 유저 최고 웨이브 랭킹 (맵별)
   */
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

  /**
   * [수정] 리더보드 갱신 로직 수정:
   * - clearTime 있음 (50웨이브 클리어): clearTime이 더 작으면 갱신
   * - clearTime 없음 (진행 중): highestWave가 더 크면 갱신
   */
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
      // 클리어 기록: 더 빠른 시간 우선
      if (!existing.clearTime || clearTime < existing.clearTime) {
        await setDoc(docRef, newEntry);
      }
    } else {
      // 진행 중: 더 높은 웨이브 우선 (단순 비교)
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

  async updateUserAchievement(achievement: Achievement): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const docRef = doc(db, 'achievements', `${user.uid}_${achievement.id}`);
    await setDoc(docRef, { userId: user.uid, ...achievement }, { merge: true });
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
}

export const databaseService = new DatabaseService();