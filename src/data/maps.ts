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
    spawns: [{ x: -T, y: 4.5 * T }],
    objectives: [{ x: 16 * T, y: 4.5 * T }],
    paths: [
      [
        { x: -T, y: 4.5 * T },
        { x: 16 * T, y: 4.5 * T },
      ],
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
  },

  // 4. 다중 S자 맵 (Medium)
  {
    id: "medium_multi_s",
    name: "구불구불 동굴",
    difficulty: "medium",
    description: "경로가 길게 굽이쳐, 타워가 공격할 수 있는 시간이 깁니다.",
    backgroundType: "cave",
    backgroundImage: "/images/maps/medium_multi_s.png",
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
  },

  // 5. 분기 후 합류형 (Medium)
  {
    id: "medium_merge",
    name: "합류 지점",
    difficulty: "medium",
    description: "두 갈래의 길이 중앙에서 합쳐집니다. 초반 방어가 중요합니다.",
    backgroundType: "desert",
    backgroundImage: "/images/maps/medium_merge.png",
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
  },

  // 6. 넓은 직선형 (Hard)
  {
    id: "hard_straight_wide",
    name: "넓은 초원",
    difficulty: "hard",
    description: "중앙의 넓은 통로(폭 3칸)로 적이 지나갑니다. 딜로스에 주의하세요.",
    backgroundType: "grass",
    backgroundImage: "/images/maps/hard_straight_wide.png",
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
  },

  // 7. 듀얼 직선형 (커버 불가능) (Hard)
  {
    id: "hard_dual_path",
    name: "분리된 설원",
    difficulty: "hard",
    description: "두 경로가 완전히 분리되어, 양쪽을 따로 방어해야 합니다.",
    backgroundType: "snow",
    backgroundImage: "/images/maps/hard_dual_path.png",
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
  },

  // 8. 중앙 집중형 (Extreme)
  {
    id: "extreme_central",
    name: "중앙 제단",
    difficulty: "expert",
    description: "네 방향에서 적들이 생성되어 중앙으로 돌격합니다.",
    backgroundType: "cave",
    backgroundImage: "/images/maps/extreme_central.png",
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
  },
];

export const getMapById = (id: string) => MAPS.find((m) => m.id === id);
