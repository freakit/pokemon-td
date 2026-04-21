// src/config/firebase.ts
// ──────────────────────────────────────────────────────────────────
// [FIX-4b] Firestore 오프라인 persistence 활성화
// [FIX-RTDB] RTDB 연결 상태 감시
// [FIX-V5] 서버 시간 동기 노출, 재연결 훅 단일화, onDisconnect 헬퍼 제공

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import {
  getDatabase, ref, onValue, onDisconnect, set, serverTimestamp,
} from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// ─── [FIX-RTDB] RTDB 연결 상태 감시 ────────────────────────────
type ConnectedCallback = (isConnected: boolean) => void;
const connectedListeners = new Set<ConnectedCallback>();
let _rtdbConnected = false;
let _serverTimeOffset = 0;

onValue(ref(rtdb, '.info/connected'), (snap) => {
  const prev = _rtdbConnected;
  _rtdbConnected = snap.val() === true;
  if (prev !== _rtdbConnected) {
    console.log(`[firebase] RTDB connected: ${_rtdbConnected}`);
  }
  connectedListeners.forEach(cb => {
    try { cb(_rtdbConnected); } catch (e) { console.error(e); }
  });
});

// [FIX-V5] 서버 시간 오프셋을 전역으로 관리 (모든 서비스가 동일한 값을 보도록)
onValue(ref(rtdb, '.info/serverTimeOffset'), (snap) => {
  _serverTimeOffset = snap.val() || 0;
});

/** RTDB 연결 상태 구독. 반환값은 구독 해제 함수. */
export function onRtdbConnected(cb: ConnectedCallback): () => void {
  connectedListeners.add(cb);
  // 즉시 현재 상태 전달
  try { cb(_rtdbConnected); } catch (e) { console.error(e); }
  return () => { connectedListeners.delete(cb); };
}

/** 현재 RTDB 연결 여부 동기 조회 */
export function isRtdbConnected(): boolean {
  return _rtdbConnected;
}

/** 서버 시간 오프셋 (ms). 클라이언트 시각 → 서버 시각 보정용 */
export function getServerTimeOffset(): number {
  return _serverTimeOffset;
}

/** 서버 기준 현재 시각 (ms) */
export function serverNow(): number {
  return Date.now() + _serverTimeOffset;
}

/**
 * [FIX-V5] 플레이어 Presence 등록.
 * 유저가 브라우저를 닫거나 네트워크가 끊기면 자동으로 Firebase가
 * presencePath를 `{ online: false, lastSeen: <serverTimestamp> }` 로 업데이트하고,
 * `disconnectCleanupPath` 를 준비된 값으로 교체합니다.
 *
 * 반환: 수동으로 해제(로그아웃 등)할 때 호출하는 함수.
 */
export function registerPresence(
  presencePath: string,
  payloadOnline: Record<string, unknown> = { online: true },
  payloadOffline: Record<string, unknown> = { online: false, lastSeen: serverTimestamp() },
): () => void {
  const presRef = ref(rtdb, presencePath);
  const connectedRef = ref(rtdb, '.info/connected');

  const unsubscribe = onValue(connectedRef, async (snap) => {
    if (snap.val() !== true) return;
    try {
      // 먼저 disconnect 훅을 설정 (반드시 online write 전에)
      await onDisconnect(presRef).set(payloadOffline);
      await set(presRef, payloadOnline);
    } catch (err) {
      console.warn('[firebase] registerPresence failed:', err);
    }
  });

  return () => {
    try {
      // 즉시 offline 처리
      set(presRef, payloadOffline).catch(() => {});
      // onDisconnect 취소
      onDisconnect(presRef).cancel().catch(() => {});
    } catch (e) { /* ignore */ }
    unsubscribe();
  };
}