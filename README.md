# 🎮 포켓몬 타워 디펜스 (Pokemon Tower Defense)

1세대 포켓몬 151마리를 활용한 전략적 타워 디펜스 게임입니다!

## 🌟 주요 특징

### 🔴 1세대 포켓몬 (151마리)
- 이상해씨부터 뮤까지 모든 1세대 포켓몬 등장
- PokeAPI 기반 실제 포켓몬 데이터 사용
- 정확한 종족값, 타입, 기술 구현

### ⚔️ 전략적 전투 시스템
- **양방향 전투**: 타워(포켓몬)가 적을 공격하고, 적도 타워를 공격
- **격자 기반 배치**: 전략적으로 포켓몬 배치 위치 선택
- **6마리 제한**: 최대 6마리의 포켓몬만 배치 가능하여 선택과 집중 필요
- **경로 블로킹**: 적의 이동 경로에는 배치 불가
- **18개 타입 상성**: 최신 세대 기준 타입 상성표 적용
- **물리/특수 분리**: 기술에 따른 공격 방식 차별화

### 📈 성장 시스템
- **레벨업**: 경험치를 획득하여 레벨업, 스탯 2% 증가 (레벨 100 제한)
- **진화**:
  - 레벨 진화: 특정 레벨 도달 시 자동 진화
  - 돌 진화: 불의 돌, 물의 돌, 천둥의 돌, 리프의 돌, 달의 돌
  - 통신 진화: 연결의 끈 아이템으로 진화 (윤겔라, 근육몬, 고우스트)
- **기술 학습**: 
  - 포켓몬당 1개의 기술만 보유
  - 레벨업 시 기존 기술 vs 새 기술 비교하여 선택

### 🎲 레어도 시스템
포켓몬은 최종 진화체의 종족값 총합에 따라 6가지 레어도로 분류됩니다:

| 레어도 | 종족값 총합 | 출현 확률 | 색상 |
|--------|-------------|-----------|------|
| 🥉 **Bronze** | < 450 | 가장 높음 | 구리색 |
| 🥈 **Silver** | 450-499 | 높음 | 은색 |
| 🥇 **Gold** | 500-549 | 보통 | 금색 |
| 💎 **Diamond** | 550-599 | 낮음 | 하늘색 |
| 👑 **Master** | 600-649 | 매우 낮음 | 보라색 |
| 🔥 **Legend** | ≥ 650 | 극히 낮음 | 주황색 |

- 상점에서 포켓몬 선택 시 레어도가 이름 옆에 배지로 표시됩니다
- 레어도가 높을수록 출현 확률이 낮지만 최종 진화 시 더 강력합니다

### 💸 경제 시스템
- **포켓몬 구매**: 상점에서 20원 입장료로 3마리 중 1마리 선택
- **포켓몬 판매**: 불필요한 포켓몬을 `레벨 × 20원`에 판매 가능
- **리롤**: 20원으로 포켓몬 선택지 재생성
- **아이템 구매**: 회복, 진화, 성장 아이템 구매
- **적 처치 보상**: 모든 적은 처치 시 **고정 10원** 획득

### 🎯 다양한 게임 요소
- **상태이상**: 화상, 독, 마비, 얼음, 잠듦
  - 화상/독/마비: 5초 지속
  - 얼음/잠듦: 2초 지속 (적을 완전히 멈추므로 밸런스 조정)
- **광역 기술**: AOE 데미지로 여러 적 동시 타격
- **크리티컬**: 4.17% 확률로 1.5배 데미지
- **기절 시스템**: HP 0이 되면 기절, 기력의 조각으로 부활

### 🏪 상점 시스템
- **회복 아이템**: 
  - 상처약 (20원): HP 30 회복
  - 좋은상처약 (100원): HP 150 회복 또는 최대 HP의 10% 회복 (더 큰 값)
  - 고급상처약 (500원): 최대 HP의 50% 회복
- **성장 아이템**: 이상한사탕 (대상 레벨 × 50원): 레벨 1 상승
- **부활 아이템**: 기력의 조각 (대상 레벨 × 10원): 기절한 포켓몬을 최대 HP의 50%로 부활
- **진화 아이템**: 각종 진화의 돌 (300원), 연결의 끈 (300원)

### 🌊 기하급수적 난이도 증가
Wave가 진행될수록 적의 능력치가 기하급수적으로 증가합니다 (1.1^(wave-1)):

| Wave 범위 | 등장 포켓몬 레어도 | 난이도 |
|-----------|-------------------|--------|
| Wave 1-5 | Bronze ~ Silver | 쉬움 |
| Wave 6-10 | Silver ~ Gold | 보통 |
| Wave 11-15 | Gold ~ Diamond | 어려움 |
| Wave 16+ | Diamond ~ Legend | 매우 어려움 |

### 🎨 고급 UI/UX
- Unity/Unreal 스타일의 게임 엔진 느낌
- 네온 글로우 효과와 그라디언트
- 부드러운 애니메이션과 트랜지션
- 전체 화면 게임 캔버스
- 직관적인 하단 컨트롤 패널
- 레어도별 색상 코딩

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

1. **맵 선택**: 게임 시작 시 플레이할 맵 선택
2. **포켓몬 배치**:
   - "➕ 포켓몬" 버튼 클릭 (20원 입장료)
   - 3마리 중 1마리 선택 (레어도 확인 가능)
   - 격자에 클릭하여 배치 (경로 제외)
   - 최대 6마리까지 배치 가능
3. **포켓몬 판매**:
   - "💸 판매" 버튼 클릭하여 판매 모드 활성화
   - 판매할 포켓몬 클릭 (레벨 × 20원 획득)
   - 주황색 점선으로 판매 가능 포켓몬 표시
4. **웨이브 시작**: "🎯 웨이브 시작" 버튼으로 적 소환
5. **상점 이용**: "🏪 상점" 버튼으로 아이템 구매

### 전략 팁

- **타입 상성 활용**: 적의 타입에 강한 포켓몬 배치
- **물리/특수 고려**: 상대 방어력에 따라 기술 선택
- **경로 막기**: 적의 이동 경로 주변에 집중 배치
- **진화 타이밍**: 레벨업보다 돌 진화가 더 강력
- **밸런스**: 공격형/방어형 포켓몬 균형있게 배치
- **레어도 활용**: 초반에는 Bronze/Silver로 버티고, 중후반에 Gold 이상 포켓몬으로 교체
- **6마리 제한**: 신중하게 포켓몬 선택, 약한 포켓몬은 판매하여 자금 확보
- **기술 선택**: 레벨업 시 현재 상황에 맞는 기술 선택

### 돈 획득 방법

- **적 처치**: 모든 적 처치 시 고정 10원 획득
- **콤보 시스템**: 연속 처치 시 콤보 유지 (콤보 자체는 유지되나 보상은 고정 10원)
- **포켓몬 판매**: 불필요한 포켓몬을 레벨 × 20원에 판매
- **시작 골드**: 게임 시작 시 400원 지급

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
│   └── pokeapi.ts              # PokeAPI 연동 (레어도 기반 선택)
├── components/
│   ├── Game/
│   │   └── GameCanvas.tsx      # 게임 캔버스 (격자 시스템, 판매 모드)
│   ├── UI/
│   │   ├── HUD.tsx            # 게임 정보 표시 (포켓몬 수, 판매 버튼)
│   │   ├── PokemonPicker.tsx  # 포켓몬 선택 (레어도 표시)
│   │   ├── Shop.tsx           # 상점
│   │   └── MapSelector.tsx    # 맵 선택
│   └── Modals/
│       ├── SkillPicker.tsx    # 기술 선택 (기존 vs 새 기술 비교)
│       ├── WaveEndPicker.tsx  # 웨이브 보상
│       ├── Pokedex.tsx        # 도감
│       ├── Achievements.tsx   # 업적
│       └── Settings.tsx       # 설정
├── data/
│   ├── evolution.ts           # 진화 데이터 (레어도 시스템)
│   ├── maps.ts               # 맵 데이터
│   └── achievements.ts       # 업적 데이터
├── game/
│   ├── GameManager.ts        # 게임 로직 관리 (적 이동, 전투 계산)
│   └── WaveSystem.ts         # 웨이브 시스템 (기하급수적 난이도)
├── services/
│   ├── SaveService.ts        # 저장/로드
│   └── SoundService.ts       # 사운드
├── store/
│   └── gameStore.ts          # Zustand 상태 관리 (판매 기능)
├── types/
│   └── game.ts               # 타입 정의
├── utils/
│   └── typeEffectiveness.ts  # 타입 상성 계산
├── App.tsx                   # 메인 앱 (판매 모드 상태)
└── main.tsx                  # 진입점
```

## 🔧 기술 스택

### 프론트엔드
- **React 18**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **Zustand**: 상태 관리
- **React Konva**: 캔버스 렌더링
- **Axios**: API 통신

### 개발 도구
- **Vite**: 빌드 도구
- **ESLint**: 코드 품질
- **Prettier**: 코드 포맷팅

### 외부 API
- **PokeAPI**: 포켓몬 데이터

### 🔄 개선 사항

- **밸런스 조정**: 초반은 쉽고 후반은 극도로 어려움
- **전략성 증가**: 제한된 자원으로 최적의 조합 찾기
- **경제 시스템**: 판매를 통한 포켓몬 교체 전략
- **UI/UX 개선**: 레어도 색상, 판매 모드 시각화

## 🐛 버그 리포트

버그를 발견하셨나요? [Issues](https://github.com/ksiwon/pokemon-td/issues)에 제보해주세요!

제보 시 포함할 내용:
- 버그 설명
- 재현 방법
- 예상 동작
- 실제 동작
- 스크린샷 (선택사항)

## 🤝 기여하기

기여는 언제나 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 🙏 감사의 말

- [PokeAPI](https://pokeapi.co) - 포켓몬 데이터 제공
- [React Konva](https://konvajs.org/docs/react/) - 캔버스 렌더링
- 포켓몬스터는 Nintendo/Creatures Inc./GAME FREAK inc.의 등록 상표입니다.

## 📞 연락처

프로젝트 관련 문의: [이메일 주소]

프로젝트 링크: [https://github.com/ksiwon/pokemon-td](https://github.com/ksiwon/pokemon-td)

---

⭐ 이 프로젝트가 마음에 드셨다면 Star를 눌러주세요!

**Made with ❤️ by KAIST ksiwon**