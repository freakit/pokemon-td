# 🎮 포켓몬 아이기스 (Pokemon Aegis)

1세대부터 9세대까지 모든 포켓몬 1025마리를 활용한 전략적 타워 디펜스 게임입니다!

## 🌟 주요 기능

### 🔴 1-9세대 포켓몬 (1025마리)
- 이상해씨부터 최신 9세대 포켓몬까지 모두 등장
- **PokeAPI 기반 실제 포켓몬 데이터 사용**
- 정확한 종족값, 타입, 기술, **특성** 구현

### 🔐 로그인 및 데이터베이스
- Google 계정 로그인 필수 (Firebase Authentication)
- Firebase Firestore & Realtime Database 연동
- 사용자별 레이팅 시스템
- 클라우드 기반 데이터 저장 (어디서나 확인 가능)
- 실시간 멀티플레이어 동기화

### ⚔️ 전략적 전투 시스템
- **양방향 전투**: 타워(포켓몬)가 적을 공격하고, 적도 타워를 공격
- **격자 기반 배치**: 전략적으로 포켓몬 배치 위치 선택
- **6마리 제한**: 최대 6마리의 포켓몬만 배치 가능하여 선택과 집중 필요
- **경로 블로킹**: 적의 이동 경로에는 배치 불가
- **18개 타입 상성**: 최신 세대 기준 타입 상성표 적용
- **물리/특수 분리**: 기술에 따른 공격 방식 차별화
- **명중률 시스템**: 기술마다 고유의 명중률이 있어 Miss 가능성 존재

### 📈 성장 시스템
- **레벨업**: 경험치 획득, 스탯 5% 증가
- **진화**: 레벨/돌/통신/특수/친밀도 진화
- **메가진화**: 47종 지원
- **거다이맥스**: 31종 지원
- **레어도 시스템**: Bronze, Silver, Gold, Diamond, Master, Legend (종족값 총합 기반 6단계)

### 💎 전략 시스템
- **시너지 시스템**: TFT(전략적 팀 전투) 스타일 (타입별 2/4/6, 세대별 2/4/6)
- **포켓몬 특성**: 크리티컬, 흡혈, 광역, 속도, 탱커 등 실제 특성 구현
- **기술 부가효과**: 화상, 마비, 독, 얼음, 수면, 혼란 등 상태이상
- **광역 기술(AOE)**: 더블배틀 기준 실제 광역기만 적용

### 💸 경제 및 상점
- 포켓몬 구매 (20원), 판매 (레벨 × 20원), 리롤 (20원)
- 적 처치 보상 (고정 10원)
- **일반 상점**: 회복, 성장, 부활 아이템
- **진화 상점**: 진화의 돌, 통신교환, 특수 아이템 (모두 500원)

### 👤 싱글 플레이 기능
- **도감 시스템**: 구매한 모든 포켓몬 기록 및 통계
- **업적 시스템**: 다양한 업적 및 도전과제, 보상
- **전당등록 (Hall of Fame)**: 맵별 클리어 기록 (포켓몬, 시간)
- **랭킹 시스템**: 맵별 최단 클리어 Top 10, 최고 Wave Top 10, 본인 순위 표시

### 👥 멀티플레이어 모드
- 최대 4인 대전, 레이팅 기반 점수 시스템
- 방 생성/참가 및 AI 추가 (Easy, Normal, Hard)
- **4분할 화면**: 4명의 게임 상황(Wave, Lives, Money, Towers) 동시 확인
- **디버프 시스템**: 골드로 즉사, 공속 감소, 보스 투입 등 디버프 아이템 구매

## 📦 설치 방법

### 1. 저장소 클론
```bash
git clone <repository-url>
cd pokemon-aegis
```

### 2. 의존성 설치
```bash
npm install
```

### 3. Firebase 설정
[FIREBASE_SETUP.md](./FIREBASE_SETUP.md) 파일을 참고하여 Firebase 프로젝트 설정

### 4. 환경 변수 설정
```bash
cp .env.example .env
```
`.env` 파일을 열어 Firebase 설정 정보 입력

### 5. 개발 서버 실행
```bash
npm run dev
```

### 6. 빌드
```bash
npm run build
```

## 🎮 게임 방법

### 싱글 플레이
1. Google 계정으로 로그인
2. 메인 메뉴에서 "싱글 플레이" 선택
3. 맵 선택
4. 포켓몬 구매 및 배치
5. Wave 시작
6. 상점에서 아이템 구매 및 포켓몬 성장
7. 50 Wave 달성 목표!

### 멀티 플레이
1. Google 계정으로 로그인
2. 메인 메뉴에서 "멀티 플레이" 선택
3. 방 만들기 또는 기존 방 참가
4. 방장은 AI 추가 가능
5. 모든 플레이어 준비 완료 시 게임 시작
6. 4분할 화면에서 상대 게임 상황 확인
7. 디버프 아이템으로 상대 방해
8. 최후의 1인이 되어 승리!

## 🔧 기술 스택

- **Frontend**: React 18, TypeScript, Styled-components
- **State Management**: Zustand
- **Backend**: Firebase (Authentication, Firestore, Realtime Database)
- **API**: PokeAPI
- **Build Tool**: Vite

## 📂 프로젝트 구조

```
pokemon-aegis/
├── src/
│   ├── api/              # PokeAPI 연동
│   ├── components/
│   │   ├── Auth/         # 로그인 화면
│   │   ├── Game/         # 게임 캔버스
│   │   ├── Menu/         # 메인 메뉴
│   │   ├── Modals/       # 모달 컴포넌트
│   │   ├── Multiplayer/  # 멀티플레이어 UI
│   │   └── UI/           # UI 컴포넌트
│   ├── config/           # Firebase 설정
│   ├── data/             # 게임 데이터
│   ├── game/             # 게임 로직
│   ├── i18n/             # 다국어 지원
│   ├── services/         # 서비스 레이어
│   │   ├── AuthService.ts
│   │   ├── DatabaseService.ts
│   │   ├── MultiplayerService.ts
│   │   ├── SaveService.ts
│   │   └── SoundService.ts
│   ├── store/            # 상태 관리
│   ├── types/            # TypeScript 타입
│   └── utils/            # 유틸리티 함수
├── .env.example          # 환경 변수 예제
├── FIREBASE_SETUP.md     # Firebase 설정 가이드
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🎯 향후 계획

- [ ] 친구 시스템
- [ ] 채팅 기능
- [ ] 커스텀 게임 모드
- [ ] 시즌 랭킹
- [ ] 특별 이벤트
- [ ] 모바일 앱 버전

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 📞 문의

문제가 발생하거나 제안사항이 있으시면 Issue를 생성해주세요.

---

⭐ 이 프로젝트가 마음에 드셨다면 Star를 눌러주세요!

**Made with ❤️ by KAIST ksiwon**