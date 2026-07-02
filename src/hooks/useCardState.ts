// src/hooks/useCardState.ts
import { useSyncExternalStore } from 'react';
import { cardService } from '../services/CardService';
import { CardSaveState } from '../types/cards';

/** CardService의 영속 상태를 구독하는 훅. 지갑·도감·진행도 변경 시 자동 리렌더. */
export function useCardState(): CardSaveState {
  return useSyncExternalStore(
    (cb) => cardService.subscribe(cb),
    () => cardService.getState(),
    () => cardService.getState(),
  );
}
