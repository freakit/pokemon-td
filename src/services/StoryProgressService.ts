// src/services/StoryProgressService.ts
// Pokemon Aegis — Story Mode Progress (localStorage persistence)

import { AEGIS_STORY_CHAPTERS } from '../data/storyChapters';

const STORAGE_KEY = 'aegis_story_progress_v1';

export interface ChapterProgress {
  cleared: boolean;
  stars: number;        // 0~3
  bestWave: number;
  clearTimeMs?: number; // fastest clear time
  clearedAt?: number;   // timestamp
}

export interface StoryProgress {
  chapterProgress: Record<string, ChapterProgress>;
  totalStars: number;
  lastPlayedChapterId?: string;
}

const DEFAULT_PROGRESS: StoryProgress = {
  chapterProgress: {},
  totalStars: 0,
};

class StoryProgressService {
  private progress: StoryProgress;

  constructor() {
    this.progress = this.load();
  }

  // ─── Load / Save ────────────────────────────────────────────────────────────

  private load(): StoryProgress {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PROGRESS, chapterProgress: {} };
      const parsed = JSON.parse(raw) as StoryProgress;
      return parsed;
    } catch {
      return { ...DEFAULT_PROGRESS, chapterProgress: {} };
    }
  }

  private save(): void {
    try {
      // Recompute totalStars before saving
      this.progress.totalStars = Object.values(this.progress.chapterProgress)
        .reduce((sum, cp) => sum + (cp.stars ?? 0), 0);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch (e) {
      console.error('[StoryProgressService] save failed:', e);
    }
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  getProgress(): StoryProgress {
    return this.progress;
  }

  getChapterProgress(chapterId: string): ChapterProgress {
    return (
      this.progress.chapterProgress[chapterId] ?? {
        cleared: false,
        stars: 0,
        bestWave: 0,
      }
    );
  }

  isChapterUnlocked(chapterNumber: number): boolean {
    if (chapterNumber === 1) return true;
    // Unlock if previous chapter is cleared
    const prevId = this.getChapterIdByNumber(chapterNumber - 1);
    if (!prevId) return false;
    return this.progress.chapterProgress[prevId]?.cleared ?? false;
  }

  getTotalStars(): number {
    return this.progress.totalStars;
  }

  getLastPlayedChapterId(): string | undefined {
    return this.progress.lastPlayedChapterId;
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────

  /** Call when a chapter is completed */
  markCleared(
    chapterId: string,
    opts: {
      stars: number;
      bestWave: number;
      clearTimeMs?: number;
    }
  ): void {
    const existing = this.progress.chapterProgress[chapterId] ?? {
      cleared: false,
      stars: 0,
      bestWave: 0,
    };

    this.progress.chapterProgress[chapterId] = {
      cleared: true,
      stars: Math.max(existing.stars, opts.stars),
      bestWave: Math.max(existing.bestWave, opts.bestWave),
      clearTimeMs:
        opts.clearTimeMs !== undefined
          ? existing.clearTimeMs === undefined
            ? opts.clearTimeMs
            : Math.min(existing.clearTimeMs, opts.clearTimeMs)
          : existing.clearTimeMs,
      clearedAt: existing.clearedAt ?? Date.now(),
    };

    this.progress.lastPlayedChapterId = chapterId;
    this.save();
  }

  updateLastPlayed(chapterId: string): void {
    this.progress.lastPlayedChapterId = chapterId;
    this.save();
  }

  /** Compute stars based on gameplay performance */
  static computeStars(opts: {
    livesLost: number;
    totalLives: number;
    wavesCleared: number;
    targetWaves: number;
  }): number {
    const { livesLost, totalLives, wavesCleared, targetWaves } = opts;
    if (wavesCleared < targetWaves) return 0;
    if (livesLost === 0) return 3;
    if (livesLost <= Math.floor(totalLives * 0.3)) return 2;
    return 1;
  }

  /** Reset all progress (dev/debug) */
  resetAll(): void {
    this.progress = { ...DEFAULT_PROGRESS, chapterProgress: {} };
    localStorage.removeItem(STORAGE_KEY);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private getChapterIdByNumber(num: number): string | undefined {
    return AEGIS_STORY_CHAPTERS.find(c => c.chapterNumber === num)?.id;
  }
}

export const storyProgressService = new StoryProgressService();