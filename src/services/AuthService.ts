// src/services/AuthService.ts
import {
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithPopup,
  signInAnonymously,  // 추가
  updateProfile       // 추가
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import { User } from '../types/multiplayer';

class AuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('AuthService(onAuthStateChanged):', firebaseUser?.displayName || 'null');
      
      if (firebaseUser) {
        const user = await this.getUserData(firebaseUser);
        this.currentUser = user;
        this.notifyListeners(user);
      } else {
        this.currentUser = null;
        this.notifyListeners(null);
      }
    });
  }

  private async getUserData(firebaseUser: FirebaseUser): Promise<User> {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) {
      // [수정 1] 신규 유저: Firebase Auth의 displayName 우선 사용 (게스트 닉네임 보존)
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Anonymous',
        photoURL: firebaseUser.photoURL || '',
        rating: 1000,
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...newUser,
        lastLogin: serverTimestamp()
      });
      return newUser;
    }
    
    // [수정 2] 기존 유저: Firestore 데이터 기반으로 반환하되,
    // displayName이 비어있거나 'Anonymous'이면 Firebase Auth 값으로 보완
    const userData = userDoc.data() as User;
    const resolvedDisplayName =
      (userData.displayName && userData.displayName !== 'Anonymous')
        ? userData.displayName
        : (firebaseUser.displayName || userData.displayName || 'Anonymous');

    if (resolvedDisplayName !== userData.displayName) {
      // Firestore의 displayName을 최신화
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        displayName: resolvedDisplayName,
        lastLogin: serverTimestamp()
      }, { merge: true });
      return { ...userData, displayName: resolvedDisplayName };
    }

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      lastLogin: serverTimestamp()
    }, { merge: true });
    return userData;
  }

  async signInWithGoogle(): Promise<void> {
    try {
      console.log('AuthService: Popup 로그인 시작');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('AuthService: Popup 로그인 성공:', result.user.displayName);
    } catch (error: any) {
      console.error('AuthService: Popup 로그인 실패:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    // [A3] 로그아웃 전 방 정리 — dynamic import로 순환참조 회피
    const roomId = localStorage.getItem('currentRoomId');
    if (roomId) {
      try {
        const { multiplayerService } = await import('./MultiplayerService');
        await multiplayerService.leaveRoom(roomId).catch(() => {});
      } catch { /* ignore */ }
    }
    localStorage.removeItem('currentRoomId');
    await signOut(auth);
    this.currentUser = null;
  }

  async signInAsGuest(nickname: string): Promise<void> {
    try {
      const result = await signInAnonymously(auth);
      // 닉네임 설정
      await updateProfile(result.user, { displayName: nickname });
      // Firestore에 게스트 유저 저장
      const guestUser: User = {
        uid: result.user.uid,
        email: '',
        displayName: nickname,
        photoURL: '',
        rating: 1000,
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'users', result.user.uid), {
        ...guestUser,
        isGuest: true,
        lastLogin: serverTimestamp()
      });

      // 강제로 상태를 최신화하여 화면에 반영되도록 함
      if (this.currentUser) {
        this.currentUser = { ...this.currentUser, displayName: nickname };
      } else {
        this.currentUser = guestUser;
      }
      this.notifyListeners(this.currentUser);
    } catch (error: any) {
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.push(callback);
    // 즉시 현재 상태 전달
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(user: User | null) {
    this.listeners.forEach(listener => listener(user));
  }
}

export const authService = new AuthService();