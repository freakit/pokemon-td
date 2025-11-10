// src/services/AuthService.ts
import {
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithPopup
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
    
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      lastLogin: serverTimestamp()
    }, { merge: true });
    return userDoc.data() as User;
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
    await signOut(auth);
    this.currentUser = null;
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