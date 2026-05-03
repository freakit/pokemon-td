// src/data/storyChapters.ts
// Pokemon Aegis — 어둠의 감시자 (The Dark Watchers) Story Mode Data

export interface DialogueLine {
  speaker: string;
  speakerEn: string;
  text: string;
  pokemonId?: number; // for sprite
}

export interface StoryChapter {
  id: string;
  chapterNumber: number;
  mapId: string; // references MAPS[].id
  title: string;
  subtitle: string;
  location: string;
  theme: {
    primary: string;   // CSS color — chapter card accent
    secondary: string;
    bg: string;
  };
  openingDialogue: DialogueLine[];
  endingDialogue: DialogueLine[];
  // Pool of pokemon IDs that get priority in the shop (weighted ~40%)
  heroPool: number[];
  // Enemy pokemon IDs that spawn as "Watchers" in this chapter
  enemyTypes: string[]; // type names for enemy bias
  bossName?: string;
  bossWave: number; // wave number when boss appears (0 = no boss)
  unlockCondition: string; // flavour text for locked state
}

export const AEGIS_STORY_CHAPTERS: StoryChapter[] = [
  // ─── Chapter 1 ──────────────────────────────────────────────────────────────
  {
    id: 'ch1_pallet_plains',
    chapterNumber: 1,
    mapId: 'easiest_straight',
    title: '첫 번째 경보',
    subtitle: '팔레트 평원의 성역',
    location: '팔레트 평원 · 암베라 서부',
    theme: {
      primary: '#4ade80',
      secondary: '#166534',
      bg: 'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
    },
    openingDialogue: [
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '여기가 첫 번째 성역이야. 팔레트 평원의 봉인석.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '어젯밤부터 이상한 기척이 느껴진다. 감시자들이 이쪽으로 오고 있어. 서두르자.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '이 직선 통로가 유일한 침입 경로야. 지금 당장 방어 태세를 갖춰.',
      },
    ],
    endingDialogue: [
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '잘 막아냈어. 하지만 이건 시작에 불과해.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '군주는 더 많은 성역을 노리고 있다. Aegis — 우리 저항군의 이름처럼, 우리가 이 세계의 방패가 되어야 해.',
      },
    ],
    heroPool: [25, 1, 4, 7, 133], // 피카츄, 이상해씨, 파이리, 꼬부기, 이브이
    enemyTypes: ['normal', 'bug', 'flying'],
    bossWave: 0,
    unlockCondition: '게임을 시작하면 해금됩니다.',
  },

  // ─── Chapter 2 ──────────────────────────────────────────────────────────────
  {
    id: 'ch2_viridian_walls',
    chapterNumber: 2,
    mapId: 'easy_loop',
    title: '포위된 마을',
    subtitle: '비리디안 외성 순환로',
    location: '비리디안 시티 외곽 · 암베라 서부',
    theme: {
      primary: '#86efac',
      secondary: '#15803d',
      bg: 'linear-gradient(135deg, #052e16 0%, #064e3b 100%)',
    },
    openingDialogue: [
      {
        speaker: '스라크',
        speakerEn: 'Scyther',
        pokemonId: 123,
        text: '감시자들이 마을을 빙 둘러쌌다. 전방위 포위야.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '놈들은 순환 경로를 따라 움직인다. 마을 내부가 뚫리면 주민들이 위험해.',
      },
      {
        speaker: '스라크',
        speakerEn: 'Scyther',
        pokemonId: 123,
        text: '내가 직접 방어 지점을 지휘하겠다. 경로를 빈틈없이 막아라!',
      },
    ],
    endingDialogue: [
      {
        speaker: '스라크',
        speakerEn: 'Scyther',
        pokemonId: 123,
        text: '마을을 지켰다. 하지만 저것들 중에 고스트 타입 강화 개체가 섞여 있었어.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '군주가 직접 개입하기 시작한 거야. 다음 성역은 더 험할 거야.',
      },
    ],
    heroPool: [3, 6, 9, 136, 197, 94], // 이상해꽃, 리자드, 거북왕, 부스터, 블래키, 팬텀
    enemyTypes: ['ghost', 'psychic', 'poison'],
    bossWave: 20,
    bossName: '어둠의 감시자 선봉 — 강화 팬텀',
    unlockCondition: '챕터 1을 클리어하면 해금됩니다.',
  },

  // ─── Chapter 3 ──────────────────────────────────────────────────────────────
  {
    id: 'ch3_altomare_coast',
    chapterNumber: 3,
    mapId: 'extreme_aggro_shortcut',
    title: '바다의 침략',
    subtitle: '알토마레 해안 성역',
    location: '알토마레 해안 · 암베라 남부',
    theme: {
      primary: '#38bdf8',
      secondary: '#0369a1',
      bg: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
    },
    openingDialogue: [
      {
        speaker: '라티아스',
        speakerEn: 'Latias',
        pokemonId: 380,
        text: '해류가... 이상해. 저 바다 밑에서 뭔가가 깨어나고 있어.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '바다 성역이 표적이야. 기다란 해안 경로를 통해 감시자들이 밀려온다.',
      },
      {
        speaker: '라티아스',
        speakerEn: 'Latias',
        pokemonId: 380,
        text: '이 성역이 파괴되면 암베라의 바다 전체가 위험해져. 내가 함께 싸울게.',
      },
    ],
    endingDialogue: [
      {
        speaker: '라티아스',
        speakerEn: 'Latias',
        pokemonId: 380,
        text: '바다의 봉인을 지켰어. 루기아도 우리의 싸움을 알게 됐어.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '군주는 지하에서 움직인다. 다음 목표는 동굴 깊은 곳의 성역이야.',
      },
    ],
    heroPool: [249, 380, 382, 130, 54, 131], // 루기아, 라티아스, 가이오가, 갸라도스, 고라파덕, 라프라스
    enemyTypes: ['water', 'poison', 'ice'],
    bossWave: 25,
    bossName: '어둠의 폭류 — 거대 어둠 갸라도스',
    unlockCondition: '챕터 2를 클리어하면 해금됩니다.',
  },

  // ─── Chapter 4 ──────────────────────────────────────────────────────────────
  {
    id: 'ch4_dark_cave',
    chapterNumber: 4,
    mapId: 'medium_multi_s',
    title: '지하의 울부짖음',
    subtitle: '심연의 동굴 성역',
    location: '어둠 동굴 심층 · 암베라 지하',
    theme: {
      primary: '#a78bfa',
      secondary: '#6d28d9',
      bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    },
    openingDialogue: [
      {
        speaker: '레지락',
        speakerEn: 'Regirock',
        pokemonId: 377,
        text: '...나는 수천 년을 이 어둠 속에서 기다렸다.',
      },
      {
        speaker: '레지락',
        speakerEn: 'Regirock',
        pokemonId: 377,
        text: '네가 이 성역을 지킨다면, 나는 너와 함께한다.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '구불구불한 동굴 경로를 막아야 해. 어둠을 이용해 침투하는 바위 타입 감시자들이 온다.',
      },
    ],
    endingDialogue: [
      {
        speaker: '레지락',
        speakerEn: 'Regirock',
        pokemonId: 377,
        text: '...동굴의 봉인은 건재하다. 잘 싸웠다.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '레지락이 우리 편이야. 이제 사막의 성역으로. 그곳에서 처음으로 섀도우 개체를 마주하게 될 거야.',
      },
    ],
    heroPool: [377, 219, 237, 169, 461], // 레지락, 마그카르고, 카포에라, 크로뱃, 포푸니라
    enemyTypes: ['rock', 'ground', 'poison', 'dark'],
    bossWave: 30,
    bossName: '동굴의 파견대장 — 어둠의 레지락 복제',
    unlockCondition: '챕터 3을 클리어하면 해금됩니다.',
  },

  // ─── Chapter 5 ──────────────────────────────────────────────────────────────
  {
    id: 'ch5_orre_desert',
    chapterNumber: 5,
    mapId: 'medium_merge',
    title: '두 바람의 맹세',
    subtitle: '오레 사막 성역',
    location: '오레 사막 협곡 · 암베라 동부',
    theme: {
      primary: '#fb923c',
      secondary: '#c2410c',
      bg: 'linear-gradient(135deg, #431407 0%, #7c2d12 100%)',
    },
    openingDialogue: [
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '사막 협곡이야. 두 방향에서 동시에 감시자들이 몰려온다.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '그리고... 저것들 중 일부는 단순한 감시자가 아니야. 눈이 보랏빛이야.',
      },
      {
        speaker: '스라크',
        speakerEn: 'Scyther',
        pokemonId: 123,
        text: '섀도우화가 진행된 포켓몬들이다. 군주가 직접 손을 댄 거야. 조심해.',
      },
    ],
    endingDialogue: [
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '섀도우 마기라스를 쓰러뜨렸어. 군주가 본격적으로 움직이기 시작한 신호야.',
      },
      {
        speaker: '스라크',
        speakerEn: 'Scyther',
        pokemonId: 123,
        text: '다음 성역은 사바나야. 군주가 대규모 공세를 준비하고 있어.',
      },
    ],
    heroPool: [645, 637, 214, 359, 248], // 랜드로스, 불카모스, 해루미, 앱솔, 마기라스
    enemyTypes: ['rock', 'ground', 'fire', 'dark'],
    bossWave: 30,
    bossName: '섀도우 마기라스 — 군주의 첫 번째 전령',
    unlockCondition: '챕터 4를 클리어하면 해금됩니다.',
  },

  // ─── Chapter 6 ──────────────────────────────────────────────────────────────
  {
    id: 'ch6_safari_savanna',
    chapterNumber: 6,
    mapId: 'hard_straight_wide',
    title: '대평원의 대진격',
    subtitle: '사파리 성역 대공세',
    location: '사파리 사바나 · 암베라 중부',
    theme: {
      primary: '#a3e635',
      secondary: '#4d7c0f',
      bg: 'linear-gradient(135deg, #1a2e05 0%, #365314 100%)',
    },
    openingDialogue: [
      {
        speaker: '에르레이드',
        speakerEn: 'Gallade',
        pokemonId: 475,
        text: '이건... 이전과 차원이 달라. 3줄 동시 진격이야.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '군주가 본격적으로 움직이기 시작했어. 여기를 잃으면 나머지 성역도 연쇄적으로 위험해진다.',
      },
      {
        speaker: '에르레이드',
        speakerEn: 'Gallade',
        pokemonId: 475,
        text: '물러서지 마라. 이 평원에는 우리가 지켜야 할 것들이 있다.',
      },
    ],
    endingDialogue: [
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '대공세를 막아냈어. 하지만 군주의 전력은 아직 건재해.',
      },
      {
        speaker: '에르레이드',
        speakerEn: 'Gallade',
        pokemonId: 475,
        text: '앞으로 두 개의 성역이 남았어. 설산과... 군주의 성소.',
      },
    ],
    heroPool: [475, 103, 452, 197, 149], // 에르레이드, 나시, 드래피온, 블래키, 망나뇽
    enemyTypes: ['normal', 'grass', 'fighting', 'dark'],
    bossWave: 35,
    bossName: '세 개의 머리 — 섀도우 삼삼바우',
    unlockCondition: '챕터 5를 클리어하면 해금됩니다.',
  },

  // ─── Chapter 7 ──────────────────────────────────────────────────────────────
  {
    id: 'ch7_snowpeak_twins',
    chapterNumber: 7,
    mapId: 'hard_dual_path',
    title: '두 전선',
    subtitle: '눈설왕 산맥 분단 작전',
    location: '눈설왕 산맥 · 암베라 북부',
    theme: {
      primary: '#7dd3fc',
      secondary: '#0284c7',
      bg: 'linear-gradient(135deg, #0c2948 0%, #164e63 100%)',
    },
    openingDialogue: [
      {
        speaker: '레지아이스',
        speakerEn: 'Regice',
        pokemonId: 378,
        text: '...이 설산 너머에 있다. 나는 오래전부터 그 존재를 느꼈다.',
      },
      {
        speaker: '프리져',
        speakerEn: 'Articuno',
        pokemonId: 144,
        text: '군주가 지형을 이용했어. 두 경로가 완전히 분리되어 있어. 전력을 나눠야 해.',
      },
      {
        speaker: '레지아이스',
        speakerEn: 'Regice',
        pokemonId: 378,
        text: '하지만 이 성역을 지키면 군주의 힘을 제한할 수 있어. 봉인이 살아있는 한.',
      },
    ],
    endingDialogue: [
      {
        speaker: '프리져',
        speakerEn: 'Articuno',
        pokemonId: 144,
        text: '양쪽 모두 지켜냈어. 이제 마지막 성역만 남았어.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '군주의 성소야. 거기서 모든 게 끝난다. Aegis 전원 집결 — 최후의 전투다.',
      },
    ],
    heroPool: [378, 144, 460, 478, 473], // 레지아이스, 프리져, 눈설왕, 눈여아, 맘모꾸리
    enemyTypes: ['ice', 'steel', 'dark', 'ghost'],
    bossWave: 40,
    bossName: '쌍둥이 감시자 — 섀도우 눈설왕 ×2 (양쪽 동시)',
    unlockCondition: '챕터 6을 클리어하면 해금됩니다.',
  },

  // ─── Chapter 8 ──────────────────────────────────────────────────────────────
  {
    id: 'ch8_masters_sanctum',
    chapterNumber: 8,
    mapId: 'extreme_central',
    title: '최후의 봉인',
    subtitle: '군주의 성소',
    location: '차원의 제단 · 암베라 심연',
    theme: {
      primary: '#f59e0b',
      secondary: '#92400e',
      bg: 'linear-gradient(135deg, #1c0a00 0%, #431407 50%, #0f0720 100%)',
    },
    openingDialogue: [
      {
        speaker: '군주',
        speakerEn: 'The Master',
        pokemonId: 487, // 기라티나
        text: '어리석은 저항군들. 이 봉인은 이미 금이 갔다.',
      },
      {
        speaker: '군주',
        speakerEn: 'The Master',
        pokemonId: 487,
        text: '10,000년의 기다림이 끝났어. 너희가 이 성역을 지키든 말든, 나는 반드시 깨어난다.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '틀렸어. 우리는 이미 7개의 봉인을 지켰다. 너의 힘은 갈라졌어. — 여기서 끝낸다.',
      },
    ],
    endingDialogue: [
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '봉인이... 복원됐어. 군주의 힘이 사라지고 있어.',
      },
      {
        speaker: '스라크',
        speakerEn: 'Scyther',
        pokemonId: 123,
        text: 'Aegis가 해냈어. 8개의 성역 모두 지켜냈다.',
      },
      {
        speaker: '루카리오',
        speakerEn: 'Lucario',
        pokemonId: 448,
        text: '암베라는 다시 평화를 찾을 거야. 하지만 우리의 방패 — Aegis — 는 항상 깨어 있어야 해.',
      },
    ],
    heroPool: [487, 484, 483, 150, 151, 448], // 기라티나, 팔키아, 디아루가, 뮤츠, 뮤, 루카리오
    enemyTypes: ['ghost', 'dragon', 'dark', 'psychic'],
    bossWave: 50,
    bossName: '군주 · 어둠의 화신 — 타락한 기라티나 (Origin Forme)',
    unlockCondition: '챕터 7을 클리어하면 해금됩니다.',
  },
];

export const getChapterById = (id: string) =>
  AEGIS_STORY_CHAPTERS.find((c) => c.id === id);

export const getChapterByMapId = (mapId: string) =>
  AEGIS_STORY_CHAPTERS.find((c) => c.mapId === mapId);