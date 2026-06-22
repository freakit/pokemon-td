// src/data/maps.ts

import { MapData } from "../types/game";

const T = 64;

export const MAPS: MapData[] = [
  // 1. 좁은 직선형 (Easiest)
  {
    id: "easiest_straight",
    name: "초보자의 좁은 길",
    difficulty: "easiest",
    description: "폭이 1줄(실제 3칸)인 기본 맵입니다. 화력 집중이 용이합니다.",
    backgroundType: "grass",
    backgroundImage: "/images/maps/easiest_straight.png",
    shopTiles: [{ x: 13, y: 9 }],
    contestTiles: [{ x: 2, y: 0 }],
    teraTiles: [
      { type: "fire", spots: [{ x: 5, y: 3 }, { x: 9, y: 3 }, { x: 3, y: 5 }] },
      { type: "water", spots: [{ x: 10, y: 5 }, { x: 12, y: 3 }, { x: 6, y: 5 }] },
    ],
    spawns: [{ x: -T, y: 4.5 * T }],
    objectives: [{ x: 16 * T, y: 4.5 * T }],
    paths: [
      [
        { x: -T, y: 4.5 * T },
        { x: 16 * T, y: 4.5 * T },
      ],
    ],
    // 길(row4) 위/아래 10칸, 1×1·1×2 섞어 비대칭
    buildZones: [
      { x: 3, y: 3, w: 2, h: 1 }, { x: 6, y: 3, w: 1, h: 1 }, { x: 9, y: 3, w: 1, h: 1 }, { x: 11, y: 3, w: 1, h: 1 },
      { x: 4, y: 5, w: 1, h: 1 }, { x: 6, y: 5, w: 2, h: 1 }, { x: 9, y: 5, w: 1, h: 1 }, { x: 11, y: 5, w: 1, h: 1 },
    ],
  },

  // 2. 외곽 순환형 (Easy)
  {
    id: "easy_loop",
    name: "성벽 순환로",
    difficulty: "easy",
    description: "맵 외곽을 순환합니다. 타워를 배치할 내부 공간이 한정됩니다.",
    backgroundType: "grass",
    backgroundImage: "/images/maps/easy_loop.png",
    shopTiles: [{ x: 5, y: 5 }],
    contestTiles: [{ x: 9, y: 6 }],
    teraTiles: [{ type: "water", spots: [{ x: 7, y: 2 }, { x: 9, y: 2 }, { x: 4, y: 7 }] }],
    spawns: [{ x: -T, y: 1.5 * T }],
    objectives: [{ x: -T, y: 3.5 * T }], // 스폰 바로 아래가 골인
    paths: [
      [
        { x: -T, y: 1.5 * T },
        { x: 13.5 * T, y: 1.5 * T },
        { x: 13.5 * T, y: 8.5 * T },
        { x: 1.5 * T, y: 8.5 * T },
        { x: 1.5 * T, y: 3.5 * T },
        { x: -T, y: 3.5 * T },
      ],
    ],
    // 순환로 안쪽 10칸, 1×1·1×2 섞어 비대칭
    buildZones: [
      { x: 3, y: 2, w: 2, h: 1 }, { x: 7, y: 2, w: 1, h: 1 }, { x: 9, y: 2, w: 1, h: 1 },
      { x: 12, y: 3, w: 1, h: 1 }, { x: 2, y: 6, w: 1, h: 1 },
      { x: 4, y: 7, w: 1, h: 1 }, { x: 6, y: 7, w: 2, h: 1 }, { x: 10, y: 7, w: 1, h: 1 },
    ],
  },

  // 3. 어그로 지름길 (Medium)
  {
    id: "extreme_aggro_shortcut",
    name: "위험한 지름길",
    difficulty: "medium",
    description:
      "기본 경로는 매우 깁니다. 중앙에 타워를 배치해 적의 경로를 바꾸세요.",
    backgroundType: "water",
    backgroundImage: "/images/maps/extreme_aggro_shortcut.png",
    shopTiles: [{ x: 7, y: 4 }],
    contestTiles: [{ x: 4, y: 4 }],
    teraTiles: [{ type: "electric", spots: [{ x: 6, y: 7 }, { x: 8, y: 7 }, { x: 11, y: 4 }] }],
    spawns: [{ x: -T, y: 1.5 * T }],
    objectives: [{ x: 16 * T, y: 1.5 * T }],
    paths: [
      [
        // 맵 하단을 크게 U자로 도는 경로
        { x: -T, y: 1.5 * T },
        { x: 1.5 * T, y: 1.5 * T },
        { x: 1.5 * T, y: 8.5 * T },
        { x: 12.5 * T, y: 8.5 * T },
        { x: 12.5 * T, y: 1.5 * T },
        { x: 16 * T, y: 1.5 * T },
      ],
      // 중앙 (x=3~11, y=2~7)이 비어있어 '어그로 섬' 배치 가능
    ],
    // U자 안쪽 10칸, 1×1·1×2 섞어 비대칭
    buildZones: [
      { x: 2, y: 4, w: 1, h: 2 },
      { x: 3, y: 7, w: 2, h: 1 }, { x: 6, y: 7, w: 1, h: 1 }, { x: 8, y: 7, w: 2, h: 1 },
      { x: 11, y: 3, w: 1, h: 2 }, { x: 11, y: 6, w: 1, h: 1 },
    ],
  },

  // 4. 다중 S자 맵 (Medium)
  {
    id: "medium_multi_s",
    name: "구불구불 동굴",
    difficulty: "medium",
    description: "경로가 길게 굽이쳐, 타워가 공격할 수 있는 시간이 깁니다.",
    backgroundType: "cave",
    backgroundImage: "/images/maps/medium_multi_s.png",
    shopTiles: [{ x: 1, y: 7 }],
    contestTiles: [{ x: 13, y: 0 }],
    teraTiles: [{ type: "ground", spots: [{ x: 7, y: 4 }, { x: 4, y: 2 }, { x: 10, y: 4 }] }],
    spawns: [{ x: -T, y: 1.5 * T }],
    objectives: [{ x: 16 * T, y: 8.5 * T }],
    paths: [
      [
        { x: -T, y: 1.5 * T },
        { x: 12.5 * T, y: 1.5 * T },
        { x: 12.5 * T, y: 3.5 * T },
        { x: 2.5 * T, y: 3.5 * T },
        { x: 2.5 * T, y: 5.5 * T },
        { x: 12.5 * T, y: 5.5 * T },
        { x: 12.5 * T, y: 8.5 * T },
        { x: 16 * T, y: 8.5 * T },
      ],
    ],
    // S자 통로 10칸, 1×1·1×2 섞어 비대칭 (길 코너 인접 회피)
    buildZones: [
      { x: 4, y: 2, w: 1, h: 1 }, { x: 6, y: 2, w: 2, h: 1 }, { x: 9, y: 2, w: 1, h: 1 },
      { x: 5, y: 4, w: 1, h: 1 }, { x: 7, y: 4, w: 2, h: 1 }, { x: 10, y: 4, w: 1, h: 1 },
      { x: 4, y: 6, w: 1, h: 1 }, { x: 6, y: 6, w: 1, h: 1 },
    ],
  },

  // 5. 분기 후 합류형 (Medium)
  {
    id: "medium_merge",
    name: "합류 지점",
    difficulty: "medium",
    description: "두 갈래의 길이 중앙에서 합쳐집니다. 초반 방어가 중요합니다.",
    backgroundType: "desert",
    backgroundImage: "/images/maps/medium_merge.png",
    shopTiles: [{ x: 2, y: 5 }],
    contestTiles: [{ x: 12, y: 0 }],
    teraTiles: [{ type: "water", spots: [{ x: 9, y: 3 }, { x: 3, y: 3 }, { x: 9, y: 5 }] }],
    spawns: [
      { x: -T, y: 2.5 * T },
      { x: -T, y: 7.5 * T },
    ],
    objectives: [{ x: 16 * T, y: 4.5 * T }],
    paths: [
      [
        { x: -T, y: 2.5 * T },
        { x: 7.5 * T, y: 2.5 * T },
        { x: 7.5 * T, y: 4.5 * T },
        { x: 16 * T, y: 4.5 * T },
      ], // 위쪽 경로
      [
        { x: -T, y: 7.5 * T },
        { x: 7.5 * T, y: 7.5 * T },
        { x: 7.5 * T, y: 4.5 * T },
        { x: 16 * T, y: 4.5 * T },
      ], // 아래쪽 경로
    ],
    // 두 갈래·합류 길 10칸, 1×1·1×2 섞어 비대칭 (합류 코너 인접 회피)
    buildZones: [
      { x: 3, y: 1, w: 2, h: 1 }, { x: 3, y: 3, w: 1, h: 1 }, { x: 5, y: 3, w: 1, h: 1 },
      { x: 9, y: 3, w: 1, h: 1 }, { x: 11, y: 3, w: 1, h: 1 }, { x: 9, y: 5, w: 2, h: 1 },
      { x: 3, y: 6, w: 1, h: 1 }, { x: 5, y: 8, w: 1, h: 1 },
    ],
  },

  // 6. 넓은 직선형 (Hard)
  {
    id: "hard_straight_wide",
    name: "넓은 초원",
    difficulty: "hard",
    description: "중앙의 넓은 통로(폭 3칸)로 적이 지나갑니다. 딜로스에 주의하세요.",
    backgroundType: "grass",
    backgroundImage: "/images/maps/hard_straight_wide.png",
    shopTiles: [{ x: 12, y: 9 }],
    contestTiles: [{ x: 2, y: 0 }],
    teraTiles: [
      { type: "fire", spots: [{ x: 8, y: 2 }, { x: 4, y: 2 }, { x: 11, y: 2 }] },
      { type: "grass", spots: [{ x: 8, y: 6 }, { x: 4, y: 6 }, { x: 11, y: 6 }] },
    ],
    spawns: [
      { x: -T, y: 3.5 * T },
      { x: -T, y: 4.5 * T },
      { x: -T, y: 5.5 * T },
    ],
    objectives: [
      { x: 16 * T, y: 3.5 * T },
      { x: 16 * T, y: 4.5 * T },
      { x: 16 * T, y: 5.5 * T },
    ],
    paths: [
      [
        { x: -T, y: 3.5 * T },
        { x: 16 * T, y: 3.5 * T },
      ], // 적들이 이 라인을 따라감
      [
        { x: -T, y: 4.5 * T },
        { x: 16 * T, y: 4.5 * T },
      ], // 적들이 이 라인을 따라감
      [
        { x: -T, y: 5.5 * T },
        { x: 16 * T, y: 5.5 * T },
      ], // 적들이 이 라인을 따라감
    ],
    // 통로(row3~5) 위/아래 10칸, 1×1·1×2 섞어 비대칭
    buildZones: [
      { x: 3, y: 2, w: 2, h: 1 }, { x: 7, y: 2, w: 1, h: 1 }, { x: 9, y: 2, w: 1, h: 1 }, { x: 11, y: 2, w: 1, h: 1 },
      { x: 3, y: 6, w: 1, h: 1 }, { x: 5, y: 6, w: 2, h: 1 }, { x: 8, y: 6, w: 1, h: 1 }, { x: 10, y: 6, w: 1, h: 1 },
    ],
  },

  // 7. 듀얼 직선형 (커버 불가능) (Hard)
  {
    id: "hard_dual_path",
    name: "분리된 설원",
    difficulty: "hard",
    description: "두 경로가 완전히 분리되어, 양쪽을 따로 방어해야 합니다.",
    backgroundType: "snow",
    backgroundImage: "/images/maps/hard_dual_path.png",
    shopTiles: [{ x: 7, y: 4 }],
    contestTiles: [{ x: 7, y: 5 }],
    teraTiles: [
      { type: "fire", spots: [{ x: 8, y: 2 }, { x: 4, y: 2 }, { x: 11, y: 2 }] },
      { type: "ice", spots: [{ x: 8, y: 7 }, { x: 4, y: 7 }, { x: 11, y: 7 }] },
    ],
    spawns: [
      { x: -T, y: 1.5 * T },
      { x: -T, y: 8.5 * T },
    ],
    objectives: [
      { x: 16 * T, y: 1.5 * T },
      { x: 16 * T, y: 8.5 * T },
    ],
    paths: [
      [
        { x: -T, y: 1.5 * T },
        { x: 16 * T, y: 1.5 * T },
      ], // 최상단 경로
      [
        { x: -T, y: 8.5 * T },
        { x: 16 * T, y: 8.5 * T },
      ], // 최하단 경로
    ],
    // 상단(row2)·하단(row7) 양쪽 방어 10칸, 1×1·1×2 섞어 비대칭
    buildZones: [
      { x: 3, y: 2, w: 1, h: 1 }, { x: 5, y: 2, w: 2, h: 1 }, { x: 9, y: 2, w: 1, h: 1 }, { x: 11, y: 2, w: 1, h: 1 },
      { x: 3, y: 7, w: 2, h: 1 }, { x: 7, y: 7, w: 1, h: 1 }, { x: 9, y: 7, w: 1, h: 1 }, { x: 11, y: 7, w: 1, h: 1 },
    ],
  },

  // 8. 중앙 집중형 (Extreme)
  {
    id: "extreme_central",
    name: "중앙 제단",
    difficulty: "expert",
    description: "네 방향에서 적들이 생성되어 중앙으로 돌격합니다.",
    backgroundType: "cave",
    backgroundImage: "/images/maps/extreme_central.png",
    shopTiles: [{ x: 11, y: 7 }],
    contestTiles: [{ x: 3, y: 2 }],
    teraTiles: [
      { type: "fighting", spots: [{ x: 5, y: 3 }, { x: 3, y: 5 }, { x: 11, y: 5 }] },
      { type: "fighting", spots: [{ x: 9, y: 5 }, { x: 11, y: 3 }, { x: 5, y: 5 }] },
    ],
    spawns: [
      { x: -T, y: 4.5 * T },
      { x: 16 * T, y: 4.5 * T },
      { x: 7.5 * T, y: -T },
      { x: 7.5 * T, y: 11 * T },
    ],
    objectives: [{ x: 7.5 * T, y: 4.5 * T }], // 중앙
    paths: [
      [
        { x: -T, y: 4.5 * T },
        { x: 7.5 * T, y: 4.5 * T },
      ], // 서쪽 -> 중앙
      [
        { x: 16 * T, y: 4.5 * T },
        { x: 7.5 * T, y: 4.5 * T },
      ], // 동쪽 -> 중앙
      [
        { x: 7.5 * T, y: -T },
        { x: 7.5 * T, y: 4.5 * T },
      ], // 북쪽 -> 중앙
      [
        { x: 7.5 * T, y: 11 * T },
        { x: 7.5 * T, y: 4.5 * T },
      ], // 남쪽 -> 중앙
    ],
    // 중앙 방어형: 십자 둘레 10칸 밀집(세로/가로 방어), 1×2 좌상·우하로 비대칭
    objectiveKeepout: false,
    buildZones: [
      { x: 3, y: 3, w: 2, h: 1 }, { x: 6, y: 3, w: 1, h: 1 }, { x: 8, y: 3, w: 1, h: 1 }, { x: 10, y: 3, w: 1, h: 1 },
      { x: 4, y: 5, w: 1, h: 1 }, { x: 6, y: 5, w: 1, h: 1 }, { x: 8, y: 5, w: 1, h: 1 }, { x: 10, y: 5, w: 2, h: 1 },
    ],
  },
];

export const getMapById = (id: string) => MAPS.find((m) => m.id === id);

// 테라스탈 타일 위치는 N웨이브마다 후보(spots) 사이로 순환한다.
export const TERA_MOVE_INTERVAL = 5;

/** 현재(또는 곧 시작할) 웨이브 기준 활성 테라 타일 위치를 해석한다.
 *  쉬는 시간(!isWaveActive)엔 다음 웨이브 기준으로 미리 이동시켜 재배치할 시간을 준다. */
export const activeTeraTiles = (
  map: MapData | undefined,
  wave: number,
  isWaveActive: boolean
): { x: number; y: number; type: string }[] => {
  const epoch = Math.floor((isWaveActive ? wave : wave + 1) / TERA_MOVE_INTERVAL);
  return (map?.teraTiles ?? []).map((t) => {
    const s = t.spots[epoch % t.spots.length];
    return { x: s.x, y: s.y, type: t.type };
  });
};
