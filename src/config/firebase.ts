// src/config/firebase.ts
// ──────────────────────────────────────────────────────────────────
// [FIX-4b] Firestore 오프라인 persistence 활성화
//   - enableIndexedDbPersistence → initializeFirestore + persistentLocalCache 로 교체
//   - enableIndexedDbPersistence는 Firebase v9.6+ 에서 deprecated
//   - persistentLocalCache + persistentMultipleTabManager 사용으로
//     멀티탭 환경도 자동 처리 (기존 'failed-precondition' 오류 불필요)
//   - 싱글 플레이 중 인터넷이 끊겨도 전당등록/랭킹/업적 저장이 유실되지 않음

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// [FIX-4b] 최신 방식의 Firestore 오프라인 persistence 활성화
// - persistentLocalCache: IndexedDB 기반 로컬 캐시 (오프라인 읽기/쓰기 지원)
// - persistentMultipleTabManager: 여러 탭에서도 안전하게 persistence 공유
// - 기존 enableIndexedDbPersistence와 달리 예외 처리 불필요
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();