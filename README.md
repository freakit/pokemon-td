# 🛡️ Pokemon Aegis (포켓몬 타워 디펜스)

1세대부터 9세대까지, **1025마리의 모든 포켓몬**이 등장하는 차세대 웹 기반 전략 타워 디펜스 게임입니다.

싱글 플레이의 깊이 있는 전략과 멀티 플레이의 숨막히는 실시간 PvP 배틀을 경험하세요.

---

## ✨ 핵심 기능

### 📖 스토리 모드 (Story Mode)
- **시나리오 기반 전개**: 포켓몬스터 세계관을 바탕으로 구성된 챕터와 스테이지 라인업
- **몰입감 있는 연출**: 스테이지 진입 전후 타이핑 애니메이션이 적용된 시나리오 대사 출력
- **특별한 클리어 보상**: 스테이지 클리어에 따른 다음 진행 해금 및 특수 보상 제공

### 🎮 타워 디펜스 및 핵심 플레이
- **전략적 타워 디펜스**: 자유로운 격자 배치와 적의 경로를 방해하는 미로(Maze) 구축
- **완벽한 포켓몬 구현**: PokeAPI 기반 실제 종족값, 타입 상성(18종), 특성(5종), 기술 구현
- **레어도 시스템**: 종족값 총합 기준 6단계 (Bronze / Silver / Gold / Diamond / Master / Legend)
- **상태이상**: 화상, 독, 마비, 냉동, 잠듦, 혼란 6종 — 적과 아군 모두 적용
- **진화 & 성장**: 레벨업, 친밀도, 돌/통신/특수 조건 진화, **메가진화(47종)**, **거다이맥스(31종)**, **합체(6종)**
- **로그라이크 요소**: 매 웨이브 종료 후 **스킬 선택(Skill Picker)** 및 **아이템 보상(WaveEndPicker)** 제공
- **시너지 시스템**: TFT 스타일의 타입(18종) × 세대(9세대) × 특수 조합(23종) 삼중 시너지 효과

### 🗺️ 맵 시스템 (8종)
| 맵 | 난이도 | 특징 |
| :--- | :--- | :--- |
| 초보자의 좁은 길 | Easiest | 단일 직선 경로, 화력 집중 가능 |
| 성벽 순환로 | Easy | 맵 외곽 순환, 내부 배치 공간 한정 |
| 위험한 지름길 | Medium | 우회로 + 어그로 섬 전략 |
| 구불구불 동굴 | Medium | 긴 S자 경로, 공격 시간 극대화 |
| 합류 지점 | Medium | 2갈래 동시 방어 필요 |
| 넓은 초원 | Hard | 폭 3칸 동시 진입 |
| 분리된 설원 | Hard | 상하단 완전 분리 경로 |
| 중앙 제단 | Expert | 4방향 동시 돌격 |

### ⚔️ 멀티플레이어 PvP — 핵심 모드

> 이 게임의 가장 큰 특징. **타워 디펜스 + TFT(팀파이트 택틱스)** 를 결합한 독창적인 PvP 시스템입니다.

#### 🏟️ 기본 구조
- **최대 8인 실시간 대전**: Firebase Realtime Database 기반 끊김 없는 동기화
- **배틀 로얄 서바이벌**: 라이프가 0이 되면 탈락, 최후의 1인이 우승
- **웨이브 루프**: `준비(waiting_wave) → 웨이브(wave) → 전투(battle)` 3단계 반복
  - 웨이브 단계: 자기 맵에서 적을 막는 싱글 플레이와 동일
  - **매 3웨이브마다** PvP 배틀 페이즈 자동 돌입

#### ⚔️ TFT 배틀 아레나
- 각 플레이어의 타워 배치 데이터를 Firebase를 통해 실시간 공유
- **TFTBattleArena**: 자신의 타워가 상대방 필드에 배치되어 자동으로 전투 시뮬레이션
- 배틀 결과에 따라 승자/패자 보상 차등 지급:

| 결과 | 보상 |
| :--- | :--- |
| 승리 | 골드 +80 (기본) + 연승 보너스 최대 +80 + 잔여 포켓몬 보너스 +50 |
| 패배 | 라이프 감소 (2 + 상대 잔여 포켓몬 수) + 연패 위로금 최대 +80 |
| 바이(Bye) | 배틀 없이 다음 라운드 진행, 자동 골드 보너스 지급 |

#### 🎯 PvP 심화 시스템
- **실시간 4분할 관전**: `BattlePhaseUI`에서 최대 4명의 상대 맵을 동시에 관전
- **견제 공격**: 관전 중 디버프 또는 몬스터를 상대 필드에 직접 투입
- **ELO 레이팅**: 기본값 1000, 승패·상대 레이팅에 따라 등락
- **연승/연패 보너스**: 2/3/4연속 시 추가 골드 지급으로 역전 기회 제공
- **스마트 AI 봇**: Easy / Normal / Hard — 인원 부족 시 호스트가 추가 가능
- **매치업 공정성**: 과거 대전 기록(`encounterRecord`) 기반으로 중복 매칭 최소화

### 🏆 도전과 경쟁
- **랭킹 시스템**: 맵별 최단 클리어 타임 & 최고 웨이브 Firebase 리더보드
- **전당 등록 (Hall of Fame)**: Wave 50 클리어 시 영구 보존 기록
- **업적 시스템 (Achievement Points)**: 5단계 티어(Bronze/Silver/Gold/Diamond/Legendary), 총 **200종 이상** 업적
  - 웨이브 진행, 전투, 경제, 성장, 시너지(타입/세대/특수), 도전, 멀티플레이 카테고리
  - 각 업적 달성 시 AP(Achievement Points) 누적 지급
- **Wave 50 챌린지**: 싱글 플레이 궁극 목표 — 클리어 시 전당 등록 + 특수 모달

### 🌍 다국어 및 편의성 지원
- **한국어 / 영어** 실시간 전환 (i18next 기반)
- 게임 내 모든 텍스트, 업적명, 아이템명 번역 지원
- **플로팅 설정 (Floating Settings)**: 로비, 게임 중 어디서든 화면 내 설정 버튼을 통해 사운드, 속도, 언어 즉시 변경 가능

---

## 🛠️ 기술 스택 (Tech Stack)

| 분류 | 기술 | 비고 |
| :--- | :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript) | Vite 5 기반 빌드 |
| **State** | ![Zustand](https://img.shields.io/badge/Zustand-4.4-orange) | 단일 `gameStore.ts`로 전체 게임 상태 관리 |
| **Styling** | ![Styled Components](https://img.shields.io/badge/Styled--Components-6.1-DB7093?logo=styled-components) | 컴포넌트 기반 스타일링 |
| **Graphics** | ![Konva](https://img.shields.io/badge/Konva-9.2-green) ![React Konva](https://img.shields.io/badge/React--Konva-18.2-green) | 고성능 2D 캔버스 렌더링 |
| **Backend** | ![Firebase](https://img.shields.io/badge/Firebase-12.5-FFCA28?logo=firebase) | Auth + Firestore + Realtime Database |
| **Data** | ![PokeAPI](https://img.shields.io/badge/PokeAPI-v2-EF5350) | 1025마리 포켓몬 데이터 캐시 및 레어도 산출 |
| **Audio** | ![Howler.js](https://img.shields.io/badge/Howler.js-2.2-blueviolet) | BGM & 타입별 SFX |
| **Routing** | ![React Router](https://img.shields.io/badge/React--Router-7.9-CA4245?logo=reactrouter) | SPA 라우팅 |
| **HTTP** | ![Axios](https://img.shields.io/badge/Axios-1.6-5A29E4) | PokeAPI 통신 |
| **i18n** | i18next | 한국어/영어 다국어 지원 |

---

## 📂 프로젝트 구조

```
src/
├── api/
│   └── pokeapi.ts           # PokeAPI 통신 + 1025마리 레어도 캐시 + 프리로딩
├── components/
│   ├── auth/
│   │   ├── LoginScreen.tsx      # Firebase Auth 로그인 화면 (Google/이메일)
│   │   └── ProtectedRoute.tsx   # 인증 라우트 가드
│   ├── game/
│   │   ├── GameCanvas.tsx       # 메인 게임 캔버스 (Konva 기반 렌더링)
│   │   └── GameLayout.tsx       # 싱글/멀티/스토리 전환 레이아웃 + 게임루프 제어
│   ├── menu/
│   │   └── MainMenu.tsx         # 메인 메뉴 (싱글/멀티/스토리/랭킹/업적 진입)
│   ├── modals/
│   │   ├── Achievements.tsx          # 업적 목록 (카테고리 필터, AP 표시)
│   │   ├── EvolutionConfirmModal.tsx # 진화 확인 모달
│   │   ├── HallOfFame.tsx            # 전당 등록 기록
│   │   ├── Rankings.tsx              # 맵별 리더보드
│   │   ├── Settings.tsx              # 음악/효과음/속도/언어 설정
│   │   ├── SkillPicker.tsx           # 레벨업 스킬 선택
│   │   ├── TutorialModal.tsx         # 게임 튜토리얼
│   │   ├── Wave50ClearModal.tsx      # 웨이브 50 클리어 모달
│   │   └── WaveEndPicker.tsx         # 웨이브 종료 아이템 보상 선택
│   ├── multiplayer/
│   │   ├── BattlePhaseUI.tsx         # PvP 배틀 페이즈 UI (4분할 관전 + 디버프)
│   │   ├── MultiplayerGameOverModal.tsx # 멀티 게임 오버/순위 모달
│   │   ├── MultiplayerLobby.tsx      # 로비 (방 생성/참가/AI 추가)
│   │   ├── MultiplayerView.tsx       # 멀티 게임 뷰 (상대방 미니뷰 포함)
│   │   └── TFTBattleArena.tsx        # TFT 스타일 배틀 아레나 시뮬레이션
│   ├── shared/
│   │   └── modal.styles.ts           # 공통 모달 스타일
│   ├── story/                        # 스토리 모드
│   │   ├── StoryEnding.tsx           # 스토리 스테이지 클리어/엔딩 연출
│   │   ├── StoryOpening.tsx          # 스토리 오프닝 대사 (타이핑 효과)
│   │   └── StorySelector.tsx         # 챕터 및 스테이지 선택 UI
│   └── ui/
│       ├── FloatingSettings.tsx      # 플로팅 설정 버튼
│       ├── HUD.tsx                   # 게임 HUD (라이프/골드/웨이브/속도)
│       ├── MapSelector.tsx           # 맵 선택 화면 (8종 맵 카드)
│       ├── PokemonManager.tsx        # 배치된 포켓몬 관리 패널
│       ├── PokemonPicker.tsx         # 포켓몬 뽑기/구매 (레어도별 확률)
│       ├── ShootingStarsBackground.tsx # 별똥별 배경 애니메이션
│       ├── Shop.tsx                  # 인게임 상점 (아이템 구매/판매)
│       ├── SynergyDetails.tsx        # 시너지 상세 툴팁
│       └── SynergyTracker.tsx        # 활성 시너지 트래커
├── config/
│   └── firebase.ts          # Firebase 초기화 + serverNow() + Presence
├── data/
│   ├── achievements.ts      # 200종+ 업적 정의 (5티어, 8카테고리)
│   ├── evolution.ts         # 진화 체인 + 메가진화(47종) + 거다이맥스(31종) + 합체(6종)
│   ├── evolutionItems.ts    # 진화 아이템 정의
│   ├── maps.ts              # 8종 맵 데이터 (경로, 스폰, 오브젝티브)
│   └── storyChapters.ts     # 스토리 모드 챕터, 대사, 보상, 난이도 데이터
├── game/
│   ├── GameManager.ts       # 핵심 게임 루프 (적 이동, 타워 공격, 투사체, 웨이브 관리)
│   └── WaveSystem.ts        # 웨이브 적 스폰 시스템 (보스 포함)
├── i18n/
│   ├── I18nProvider.tsx     # i18next 프로바이더
│   ├── index.ts             # i18n 초기화 설정
│   └── translations/
│       ├── en.json          # 영어 번역
│       └── ko.json          # 한국어 번역
├── services/
│   ├── AIPlayer.ts          # AI 봇 로직 (Easy/Normal/Hard 전략)
│   ├── AchievementService.ts # 업적 이벤트 중앙 처리기
│   ├── AuthService.ts       # Firebase Auth 래퍼
│   ├── DatabaseService.ts   # Firestore (리더보드, 전당 등록)
│   ├── MultiplayerService.ts # Firebase RTDB 기반 멀티플레이 동기화 (V7)
│   ├── PvPBattleService.ts  # PvP 매치업 생성 및 배틀 결과 계산
│   ├── SaveService.ts       # LocalStorage 저장/불러오기 (업적, 통계)
│   ├── SoundService.ts      # Howler.js 오디오 매니저
│   └── StoryProgressService.ts # 스토리 모드 진행 상태 관리
├── store/
│   └── gameStore.ts         # Zustand 전역 게임 상태
├── types/
│   ├── game.ts              # 핵심 타입 (GamePokemon, Enemy, Item, Achievement 등)
│   └── multiplayer.ts       # 멀티플레이 타입 (Room, PlayerGameState, GamePhase 등)
└── utils/
    ├── abilities.ts         # 특성 효과 계산 (크리티컬, 흡혈, AOE, 속도, 탱크)
    ├── responsive.utils.ts  # 반응형 유틸리티
    ├── synergyManager.ts    # 시너지 계산 (타입/세대/특수 23종) + 스탯 버프 적용
    └── typeEffectiveness.ts # 18종 타입 상성 + STAB + 데미지 계산
```

---

## 🔥 시너지 시스템 상세

### 타입 시너지 (18종 × 3단계)
| 마리 수 | 효과 |
| :--- | :--- |
| 2마리 | 해당 타입 스탯 **×1.1배** |
| 4마리 | 해당 타입 스탯 **×1.3배** |
| 6마리 | 스탯 **×1.3배** + 해당 타입 **약점 데미지 0.5배** (피격 감소) |

### 세대 시너지 (9세대 × 3단계)
| 마리 수 | 효과 |
| :--- | :--- |
| 2마리 | 해당 세대 스탯 **×1.1배** |
| 4마리 | 해당 세대 스탯 **×1.2배** |
| 6마리 | 해당 세대 스탯 **×1.3배** |

### 특수 시너지 (23종)
베이비 포켓몬, 전설의 새/개/해파리, 카푸 4형제, 울트라비스트, 레지 시리즈, 지우의 팀, 화석 포켓몬, 사흉수 등 스페셜 그룹 — 2마리 이상 배치 시 **×1.1~1.5배** 보너스.

> 스탯 버프는 **타입 × 세대 × 특수** 3종 모두 누적 곱산됩니다.

---

## 🚀 설치 및 실행 방법

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd pokemon-td
```

### 2. 패키지 설치
```bash
npm install
```

### 3. 환경 변수 설정 (`.env`)
Firebase 프로젝트 설정이 필요합니다. `.env` 파일을 생성하고 아래 내용을 입력하세요.
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 프로덕션 빌드
```bash
npm run build
```

### 6. 배포 (Netlify)
`netlify.toml` 설정이 포함되어 있어 Netlify에 자동 배포가 가능합니다.

---

## 🗺️ 화면 라우팅

| 경로 | 컴포넌트 | 설명 |
| :--- | :--- | :--- |
| `/login` | `LoginScreen` | Firebase 로그인 |
| `/` | `MainMenu` | 메인 메뉴 (싱글/멀티/스토리/랭킹 등) |
| `/map-select` | `MapSelector` | 싱글 플레이 맵 선택 |
| `/story` | `StorySelector` | 스토리 챕터 및 스테이지 선택 |
| `/lobby` | `MultiplayerLobby` | 멀티플레이 로비 |
| `/game` | `GameLayout` | 실제 게임 화면 (싱글/멀티/스토리 공통) |

> 모든 라우트는 `ProtectedRoute`로 보호되며, 비인증 사용자는 `/login`으로 리다이렉트됩니다.

---

## 🧩 멀티플레이어 아키텍처

```
클라이언트 (Host)          Firebase RTDB            클라이언트 (Guest)
      │                         │                         │
      ├─ createRoom() ─────────►│                         │
      │                         │◄──── joinRoom() ────────┤
      ├─ addAI(difficulty) ────►│                         │
      ├─ startGame() ──────────►│                         │
      │                         │ initializePvPGameState  │
      │   markPlayerLoaded() ──►│◄── markPlayerLoaded() ──┤
      │                         │  (모두 로딩 완료 시)     │
      │                         │  currentPhase: waiting_wave
      │                  ┌──────┴──────┐
      │                  │  웨이브 루프  │
      │                  │  Wave ──────► WaveEnd ──► Battle (매 3웨이브)
      │                  └──────┬──────┘
      │   submitBattleResult() ►│ (배틀 결과 + 보상 트랜잭션)
      │   playerDefeated() ────►│ (탈락 처리)
      └─ finalizeGame() ───────►│ (게임 종료 + 레이팅 업데이트)
```

**주요 Firebase 경로:**
- `rooms/{roomId}` — 방 메타데이터, 플레이어 목록
- `gameStates/{roomId}` — 게임 진행 상태 (페이즈, 라이프, 골드, 순위)
- `towerDetails/{roomId}/{userId}` — 타워 배치 상세 (배틀 시뮬레이션용)
- `battleResults/{roomId}` — 라운드별 배틀 결과
- `presence/{roomId}` — 연결 상태 (접속 끊김 감지)

---

## 🤝 기여하기 (Contributing)
Pull Request는 언제나 환영합니다! 버그 제보나 기능 제안은 Issue 탭을 이용해주세요.

---

**Note**: This game is a fan-made project and is not affiliated with Nintendo, Game Freak, or The Pokémon Company.