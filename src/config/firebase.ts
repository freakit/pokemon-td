// src/config/firebase.ts
// ──────────────────────────────────────────────────────────────────
// [FIX-4b] Firestore 오프라인 persistence 활성화
//   - enableIndexedDbPersistence → initializeFirestore + persistentLocalCache 로 교체
//   - enableIndexedDbPersistence는 Firebase v9.6+ 에서 deprecated
//   - persistentLocalCache + persistentMultipleTabManager 사용으로
//     멀티탭 환경도 자동 처리 (기존 'failed-precondition' 오류 불필요)
//   - 싱글 플레이 중 인터넷이 끊겨도 전당등록/랭킹/업적 저장이 유실되지 않음
// [FIX-RTDB] RTDB 연결 상태 감시
//   - .info/connected 구독으로 실시간 연결 상태 추적
//   - onRtdbConnected() 유틸로 컴포넌트가 구독 가능
//   - 멀티 플레이 중 끊겼다가 재연결 시 콜백 트리거 → 재구독 처리 지원

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';

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

// ─── [FIX-RTDB] RTDB 연결 상태 감시 ────────────────────────────
// Firebase RTDB는 Firestore와 달리 오프라인 persistence 옵션이 없으므로
// .info/connected 를 구독해 연결/재연결 이벤트를 외부로 노출한다.
// 컴포넌트나 서비스에서 onRtdbConnected(cb)를 사용해 재연결 시 처리 가능.
type ConnectedCallback = (isConnected: boolean) => void;
const connectedListeners = new Set<ConnectedCallback>();
let _rtdbConnected = false;

onValue(ref(rtdb, '.info/connected'), (snap) => {
  _rtdbConnected = snap.val() === true;
  connectedListeners.forEach(cb => cb(_rtdbConnected));
});

/** RTDB 연결 상태 구독. 반환값은 구독 해제 함수. */
export function onRtdbConnected(cb: ConnectedCallback): () => void {
  connectedListeners.add(cb);
  // 즉시 현재 상태 전달
  cb(_rtdbConnected);
  return () => connectedListeners.delete(cb);
}

/** 현재 RTDB 연결 여부 동기 조회 */
export function isRtdbConnected(): boolean {
  return _rtdbConnected;
}