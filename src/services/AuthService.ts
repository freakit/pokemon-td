// src/services/AuthService.ts
import {
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';
import { User } from '../types/multiplayer';

class AuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          console.log("Redirect result processed.");
        }
      })
      .catch((error) => {
        console.error("Auth Redirect Error:", error);
      });

    onAuthStateChanged(auth, async (firebaseUser) => {
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
    await signInWithRedirect(auth, googleProvider);
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