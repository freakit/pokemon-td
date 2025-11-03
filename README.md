# 🎮 포켓몬 타워 디펜스 (Pokemon Tower Defense)

1세대 포켓몬 151마리를 활용한 전략적 타워 디펜스 게임입니다\!

## 🌟 주요 특징

### 🔴 1세대 포켓몬 (151마리)

  - 이상해씨부터 뮤까지 모든 1세대 포켓몬 등장
  - PokeAPI 기반 실제 포켓몬 데이터 사용
  - 정확한 종족값, 타입, 기술 구현

### ⚔️ 전략적 전투 시스템

  - **양방향 전투**: 타워(포켓몬)가 적을 공격하고, 적도 타워를 공격
  - **격자 기반 배치**: 전략적으로 포켓몬 배치 위치 선택
  - **경로 블로킹**: 적의 이동 경로에는 배치 불가
  - **18개 타입 상성**: 최신 세대 기준 타입 상성표 적용
  - **물리/특수 분리**: 기술에 따른 공격 방식 차별화

### 📈 성장 시스템

  - **레벨업**: 경험치를 획득하여 레벨업, 스탯 5% 증가
  - **진화**:
      - 레벨 진화: 특정 레벨 도달 시 자동 진화
      - 돌 진화: 불의 돌, 물의 돌, 천둥의 돌, 리프의 돌, 달의 돌
      - 통신 진화: 연결의 끈 아이템으로 진화 (윤겔라, 근육몬, 고우스트)
  - **기술 학습**: 레벨업 시 새로운 기술 선택 가능

### 🎯 다양한 게임 요소

  - **상태이상**: 화상, 독, 마비, 얼음, 잠듦
  - **광역 기술**: AOE 데미지로 여러 적 동시 타격
  - **크리티컬**: 10% 확률로 1.5배 데미지
  - **기절 시스템**: HP 0이 되면 기절, 기력의 조각으로 부활

### 🏪 상점 시스템

  - **회복 아이템**: 상처약 (HP 50 회복), 고급 상처약 (HP 200 회복)
  - **성장 아이템**: 이상한사탕 (레벨 1 상승)
  - **부활 아이템**: 기력의 조각 (기절한 포켓몬 50% HP로 부활)
  - **진화 아이템**: 각종 진화의 돌, 연결의 끈

### 🎨 고급 UI/UX

  - Unity/Unreal 스타일의 게임 엔진 느낌
  - 네온 글로우 효과와 그라디언트
  - 부드러운 애니메이션과 트랜지션
  - 전체 화면 게임 캔버스
  - 직관적인 하단 컨트롤 패널

## 🚀 시작하기

### 필수 요구사항

  - Node.js 18.x 이상
  - npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone https://github.com/ksiwon/pokemon-td

# 프로젝트 디렉토리로 이동
cd pokemon-td

# 의존성 설치
npm install

# 환경 변수 설정
# .env.example 파일을 .env 파일로 복사합니다.
cp .env.example .env

# .env 파일 내의 환경 변수를 필요에 따라 수정합니다.
# (예: VITE_POKEAPI_BASE_URL=https://pokeapi.co/api/v2)

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

### 🧪 테스트

```bash
# 단위 및 통합 테스트 실행
npm run test
```

## 🎮 게임 방법

### 기본 조작

1.  **맵 선택**: 게임 시작 시 플레이할 맵 선택
2.  **포켓몬 배치**:
      - "➕ 포켓몬" 버튼 클릭 (50원 입장료)
      - 3마리 중 1마리 선택
      - 격자에 클릭하여 배치 (경로 제외)
3.  **웨이브 시작**: "웨이브 시작" 버튼으로 적 소환
4.  **상점 이용**: "🏪 상점" 버튼으로 아이템 구매

### 전략 팁

  - **타입 상성 활용**: 적의 타입에 강한 포켓몬 배치
  - **물리/특수 고려**: 상대 방어력에 따라 기술 선택
  - **경로 막기**: 적의 이동 경로 주변에 집중 배치
  - **진화 타이밍**: 레벨업보다 돌 진화가 더 강력
  - **밸런스**: 공격형/방어형 포켓몬 균형있게 배치

### 돈 획득 방법

  - 적 처치 시 보상 획득
  - 웨이브 클리어 보너스
  - 콤보 시스템 (연속 처치 시 보상 증가)

## 📊 게임 데이터

### 포켓몬 정보

모든 포켓몬 데이터는 [PokeAPI](https://pokeapi.co)에서 실시간으로 가져옵니다.

```typescript
// 포켓몬 데이터 구조
{
  id: number;              // 도감 번호
  name: string;            // 이름
  types: string[];         // 타입 (예: ['fire', 'flying'])
  stats: {
    hp: number;            // 체력
    attack: number;        // 공격
    defense: number;       // 방어
    specialAttack: number; // 특수공격
    specialDefense: number;// 특수방어
    speed: number;         // 스피드
  };
  sprite: string;          // 이미지 URL
  moves: string[];         // 기술 목록
}
```

### 타입 상성

18개 타입의 최신 상성표 적용:

  - Normal, Fire, Water, Electric, Grass, Ice
  - Fighting, Poison, Ground, Flying, Psychic
  - Bug, Rock, Ghost, Dragon
  - **Dark, Steel, Fairy** (2세대 이후 타입 포함)

### 진화 데이터

  - **레벨 진화**: 40+ 진화 라인
  - **돌 진화**: 15+ 진화 라인
  - **통신 진화**: 3개 (연결의 끈 사용)

## 🏗️ 프로젝트 구조

```
src/
├── api/
│   └── pokeapi.ts              # PokeAPI 연동
├── components/
│   ├── Game/
│   │   └── GameCanvas.tsx      # 게임 캔버스 (격자 시스템)
│   ├── UI/
│   │   ├── HUD.tsx            # 게임 정보 표시
│   │   ├── PokemonPicker.tsx  # 포켓몬 선택
│   │   ├── Shop.tsx           # 상점
│   │   └── MapSelector.tsx    # 맵 선택
│   └── Modals/
│       ├── SkillPicker.tsx    # 기술 선택
│       ├── WaveEndPicker.tsx  # 웨이브 보상
│       ├── Pokedex.tsx        # 도감
│       ├── Achievements.tsx   # 업적
│       └── Settings.tsx       # 설정
├── data/
│   ├── evolution.ts           # 진화 데이터
│   ├── maps.ts               # 맵 데이터
│   └── achievements.ts       # 업적 데이터
├── game/
│   ├── GameManager.ts        # 게임 로직 관리 (적 이동, 전투 계산)
│   └── WaveSystem.ts         # 웨이브 시스템
├── services/
│   ├── SaveService.ts        # 저장/로드
│   └── SoundService.ts       # 사운드
├── store/
│   └── gameStore.ts          # Zustand 상태 관리 (플레이어 HP, 돈, 웨이브 등)
├── types/
│   └── game.ts               # 타입 정의
├── utils/
│   └── typeEffectiveness.ts  # 타입 상성 계산
├── App.tsx                   # 메인 앱
└── main.tsx                  # 진입점
```

## 🔧 기술 스택

### 프론트엔드

  - **React 18**: UI 라이브러리
  - **TypeScript**: 타입 안정성
  - **Zustand**: 상태 관리
  - **React Konva**: 캔버스 렌더링
  - **Axios**: API 통신
  - **(추정) Styled-Components / Emotion**: 고급 UI/UX를 위한 CSS-in-JS

### 개발 도구

  - **Vite**: 빌드 도구
  - **ESLint**: 코드 품질
  - **Prettier**: 코드 포맷팅
  - **(추정) Vitest**: 단위 및 통합 테스트
  - **(추정) React Testing Library**: 컴포넌트 테스트

### 외부 API

  - **PokeAPI**: 포켓몬 데이터

## 🎯 향후 계획

### 단기 계획

  - [ ] 사운드 효과 추가
  - [ ] 배경 음악
  - [ ] 파티클 효과
  - [ ] 애니메이션 개선
  - [ ] 모바일 최적화
  - [ ] 테스트 커버리지 향상

### 중기 계획

  - [ ] 2세대 포켓몬 추가 (152-251)
  - [ ] 3세대 포켓몬 추가 (252-386)
  - [ ] 멀티플레이어 모드
  - [ ] 랭킹 시스템
  - [ ] 도전 과제 시스템

### 장기 계획

  - [ ] 커스텀 맵 에디터
  - [ ] 포켓몬 특성 시스템
  - [ ] 날씨 시스템
  - [ ] 배지 수집
  - [ ] 스토리 모드

## 🐛 버그 리포트

버그를 발견하셨나요? [Issues](https://www.google.com/search?q=https://github.com/ksiwon/pokemon-td/issues)에 제보해주세요\!

제보 시 포함할 내용:

  - 버그 설명
  - 재현 방법
  - 예상 동작
  - 실제 동작
  - 스크린샷 (선택사항)

## 🤝 기여하기

기여는 언제나 환영합니다\!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 🙏 감사의 말

  - [PokeAPI](https://pokeapi.co) - 포켓몬 데이터 제공
  - [React Konva](https://konvajs.org/docs/react/) - 캔버스 렌더링
  - 포켓몬스터는 Nintendo/Creatures Inc./GAME FREAK inc.의 등록 상표입니다.

## 📞 연락처

프로젝트 관련 문의: [이메일 주소]

프로젝트 링크: [https://github.com/ksiwon/pokemon-td](https://www.google.com/url?sa=E&source=gmail&q=https://github.com/ksiwon/pokemon-td)

-----

⭐ 이 프로젝트가 마음에 드셨다면 Star를 눌러주세요\!

**Made with ❤️ by KAIST ksiwon**