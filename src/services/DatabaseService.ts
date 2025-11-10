// src/services/DatabaseService.ts
import { doc, setDoc, getDoc, collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import { PokedexEntry, HallOfFameEntry, LeaderboardEntry } from '../types/multiplayer';
import { Achievement } from '../types/game';
import { authService } from './AuthService';
// 1. 업적 데이터 임포트
import { saveService } from './SaveService';
import { ACHIEVEMENTS } from '../data/achievements';

class DatabaseService {

  // 2. 도감 업적 체크 헬퍼
  private async checkPokedexAchievements(currentCount: number) {
    try {
      const achievements = ACHIEVEMENTS.filter(a => a.condition === 'collect');
      for (const ach of achievements) {
        if (currentCount >= ach.target) {
          // saveService.updateAchievement가 로컬 저장 및 DB 저장을 모두 처리
          await saveService.updateAchievement(ach.id, ach.target);
        } else {
          // 진행도만 업데이트 (선택적, UI 표시용)
          await saveService.updateAchievement(ach.id, currentCount);
        }
      }
    } catch (err) {
      console.error("Failed to check pokedex achievements:", err);
    }
  }

  async addToPokedex(pokemonId: number, name: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const docRef = doc(db, 'pokedex', `${user.uid}_${pokemonId}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      await updateDoc(docRef, {
        timesSeen: increment(1)
      });
    } else {
      const entry: PokedexEntry = {
        pokemonId,
        name,
        firstSeen: Date.now(),
        timesSeen: 1
      };
      await setDoc(docRef, {
        userId: user.uid,
        ...entry
      });

      // 3. 새 포켓몬 등록 시 업적 체크
      try {
        const pokedex = await this.getUserPokedex();
        await this.checkPokedexAchievements(pokedex.length);
      } catch (err) {
        console.error("Failed to check achievements after adding to pokedex:", err);
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
        timesSeen: data.timesSeen
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
      timestamp: Date.now()
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
      ...doc.data()
    } as HallOfFameEntry));
  }

  async updateLeaderboard(mapId: string, clearTime: number | undefined, highestWave: number): Promise<void> {
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
      rating: user.rating
    };
    if (docSnap.exists()) {
      const existing = docSnap.data() as LeaderboardEntry;
      if ((clearTime && (!existing.clearTime || clearTime < existing.clearTime)) ||
          (!clearTime && highestWave > existing.highestWave)) {
        await setDoc(docRef, newEntry);
      }
    } else {
      await setDoc(docRef, newEntry);
    }
  }

  async getMapLeaderboard(mapId: string, sortBy: 'clearTime' | 'highestWave'): Promise<LeaderboardEntry[]> {
    const q = query(
      collection(db, 'leaderboards'),
      where('mapId', '==', mapId),
      orderBy(sortBy, sortBy === 'clearTime' ? 'asc' : 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as LeaderboardEntry);
  }

  async getUserRankForMap(mapId: string, sortBy: 'clearTime' | 'highestWave'): Promise<number | null> {
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
    
    return rank > 0 ?
 rank : null;
  }

  async updateUserRating(userId: string, newRating: number): Promise<void> {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, { rating: newRating });
  }

  async updateUserAchievement(achievement: Achievement): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    const docRef = doc(db, 'achievements', `${user.uid}_${achievement.id}`);
    const dataToSave = {
      userId: user.uid,
      ...achievement
    };
    await setDoc(docRef, dataToSave, { merge: true });
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