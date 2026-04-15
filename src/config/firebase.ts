// src/config/firebase.ts
// ──────────────────────────────────────────────────────────────────
// [FIX-4b] Firestore 오프라인 persistence 활성화
//   - enableIndexedDbPersistence로 오프라인에서도 Firestore 쓰기를 로컬에 큐잉
//   - 온라인 복구 시 자동으로 서버에 전송
//   - 싱글 플레이 중 인터넷이 끊겨도 전당등록/랭킹/업적 저장이 유실되지 않음

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
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
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// [FIX-4b] Firestore 오프라인 캐시 활성화
// - 오프라인 상태에서도 이전에 로드한 데이터 접근 가능
// - 쓰기 작업은 로컬에 큐잉되고 온라인 복구 시 자동 전송
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // 여러 탭이 열려 있으면 하나의 탭에서만 persistence 활성화 가능
    console.warn('[Firebase] Offline persistence failed: multiple tabs open. Only one tab can enable persistence at a time.');
  } else if (err.code === 'unimplemented') {
    // 현재 브라우저가 IndexedDB를 지원하지 않음
    console.warn('[Firebase] Offline persistence not supported in this browser.');
  }
});