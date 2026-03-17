# 🛡️ Pokemon Aegis (포켓몬 타워 디펜스)

1세대부터 9세대까지, **1025마리의 모든 포켓몬**이 등장하는 차세대 웹 기반 전략 타워 디펜스 게임입니다.
싱글 플레이의 깊이 있는 전략과 멀티 플레이의 숨막히는 실시간 PvP 배틀을 경험하세요.

## ✨ 핵심 기능

### 🎮 게임 플레이
- **전략적 타워 디펜스**: 자유로운 격자 배치와 적의 경로를 방해하는 미로(Maze) 구축
- **완벽한 포켓몬 구현**: PokeAPI 기반 실제 종족값, 타입 상성, 특성, 기술 구현
- **진화 & 성장**: 레벨업, 진화(돌/통신/특수), 메가진화(47종), 거다이맥스(31종) 
- **로그라이크 요소**: 매 웨이브 종료 후 또는 레벨업 시 **스킬 선택(Skill Picker)** 및 **아이템 보상**
- **시너지 시스템**: TFT 스타일의 타입/세대별 시너지 효과 (2/4/6 세트)

### ⚔️ 멀티플레이어 PvP
- **최대 4인 실시간 대전**: Firebase Realtime Database 기반의 끊김 없는 동기화
- **배틀 로얄**: 끝까지 살아남는 1인이 승리하는 서바이벌 모드
- **실시간 견제**: 상대방의 화면을 4분할로 실시간 관전하며 디버프/몬스터 공격
- **스마트 AI**: 인원이 부족해도 즐길 수 있는 Easy/Normal/Hard 난이도의 AI 봇 지원
- **페이즈 시스템**: 준비 단계와 전투 단계가 구분된 체계적인 진행

### 🏆 도전과 경쟁
- **랭킹 시스템**: 맵별 최단 클리어 & 최고 웨이브 순위 경쟁
- **전당 등록 (Hall of Fame)**: 클리어 기록 영구 보존
- **업적 & 도감**: 플레이 기록에 따른 다양한 업적 달성과 포켓몬 도감 수집
- **50 Wave 챌린지**: 싱글 플레이의 궁극적 목표 달성

## 🛠️ 기술 스택 (Tech Stack)

이 프로젝트는 최신 웹 기술을 사용하여 높은 성능과 사용자 경험을 제공합니다.

| 분류 | 기술 | 비고 |
| :--- | :--- | :--- |
| **Frontend** | ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript) | Vite 기반 빌드 |
| **State** | ![Zustand](https://img.shields.io/badge/Zustand-4.4-orange) | 가볍고 강력한 상태 관리 |
| **Styling** | ![Styled Components](https://img.shields.io/badge/Styled--Components-6.1-DB7093?logo=styled-components) | 컴포넌트 기반 스타일링 |
| **Graphics** | ![Konva](https://img.shields.io/badge/Konva-Canvas-green) ![React Konva](https://img.shields.io/badge/React--Konva-Latest-green) | 고성능 2D 캔버스 렌더링 |
| **Backend** | ![Firebase](https://img.shields.io/badge/Firebase-12.5-FFCA28?logo=firebase) | Auth, Firestore, Realtime DB |
| **Data** | ![PokeAPI](https://img.shields.io/badge/PokeAPI-v2-EF5350?logo=pokemon) | 포켓몬 데이터 연동 |
| **Audio** | ![Howler.js](https://img.shields.io/badge/Howler.js-2.2-blueviolet) | 사운드 이펙트 및 BGM |

## 📂 프로젝트 구조

```bash
src/
├── api/             # PokeAPI 비동기 데이터 통신
├── Auth/            # 로그인 및 인증 화면
├── components/      # UI 및 게임 컴포넌트
│   ├── Game/        # 메인 게임 캔버스 (Konva)
│   ├── Menu/        # 메인 메뉴 및 로비
│   ├── Modals/      # 도감, 업적, 랭킹, 설정 등 팝업
│   ├── Multiplayer/ # 멀티플레이 전용 뷰 및 UI
│   └── UI/          # HUD, 포켓몬 관리, 상점 등 공통 UI
├── config/          # Firebase 초기화 설정
├── game/            # 핵심 게임 로직 (Wave, Pathfinding)
├── i18n/            # 다국어 지원 (i18next)
├── services/        # 비즈니스 로직 서비스
│   ├── AIPlayer.ts          # AI 봇 로직
│   ├── MultiplayerService.ts # 실시간 멀티플레이 동기화
│   ├── PvPBattleService.ts   # PvP 전투 로직
│   └── SoundService.ts       # 오디오 매니저
├── store/           # Global State (Zustand)
└── utils/           # Helper 함수들
```

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

### 3. 환경 변수 설정 (.env)
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

## 🤝 기여하기 (Contributing)
Pull Request는 언제나 환영합니다! 버그 제보나 기능 제안은 Issue 탭을 이용해주세요.

---
**Note**: This game is a fan-made project and is not affiliated with Nintendo, Game Freak, or The Pokémon Company.