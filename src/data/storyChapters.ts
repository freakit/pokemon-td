// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📖 storyChapters.ts — Pokemon Aegis 스토리 모드 데이터 파일
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// ✅ 이 파일에서 수정해도 되는 것:
//   - 각 챕터의 openingDialogue, endingDialogue (대사 내용, 화자, 순서)
//   - title, subtitle, location (챕터 표시 텍스트)
//   - theme.primary 색상 (챕터 분위기 색상)
//
// ❌ 이 파일에서 수정하면 안 되는 것 (게임 시스템과 직결됨):
//   - id, chapterNumber (순서 및 식별자)
//   - mapId (실제 게임 맵 파일과 연결됨)
//   - totalWaves (항상 30 — 게임 엔진 고정값)
//   - heroPool (포켓몬 번호 — 상점 로직과 연결됨)
//   - enemyTypes (적 스폰 로직과 연결됨)
//   - bossWave, bossName (보스 스폰 로직과 연결됨)
//   - theme.secondary, theme.bg (UI 렌더링용)
//   - unlockCondition (챕터 해금 시스템과 연결됨)
//   - interface 정의, export 구문
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌍 세계관 설정 — 암베라(Ambera)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// 인간이 없는 세계 "암베라". 포켓몬들이 마을을 세우고, 탐험대를 꾸리고,
// 저마다의 방식으로 살아간다. 이 세계의 역사는 길고, 기억하는 자는 적다.
//
// ┌─ 군주(The Master) ────────────────────────────────────────────────────────
// │  1만 년 전 아르세우스에 의해 암베라 심연에 봉인된 존재.
// │  차원과 차원 사이에서 태어났기 때문에 이 세계에도, 어디에도 속하지 않는다.
// │  "이질적(異質的)"이라는 이유로 봉인됐지만, 봉인 당시 저항하지 않고 받아들였다.
// │  그 이유는 1만 년이 지난 지금도 아무도 모른다.
// │
// │  봉인 안에서 군주는 꿈처럼 바깥 세상을 내다본다.
// │  잠들어있는 것도, 완전히 깨어있는 것도 아닌 상태로.
// │  1만 년이 지나며 봉인이 서서히 약해졌고, 이제 그 의식이 조금씩 새어나오기
// │  시작했다. 악의가 있어서가 아니다. 그냥 — 그렇게 됐다.
// │
// ├─ 감시자(Watcher) ─────────────────────────────────────────────────────────
// │  군주의 의식이 스며든 포켓몬들. Aegis가 붙인 이름.
// │
// │  봉인이 약해지면서 군주의 파편이 세상으로 흘러나온다. 그 파편은 상처받거나
// │  길을 잃은 포켓몬들 안으로 스며든다. 스며든 순간, 그 포켓몬의 눈에서 빛이
// │  사라진다. 이름도, 두려움도, 기억도 없이 — 그냥 걷는다. 봉인석을 향해.
// │
// │  감시자는 죽은 것이 아니다. 그렇다고 살아있다고 말할 수도 없다.
// │  Aegis의 대원들은 쓰러뜨린 감시자가 한때 이름을 가진 포켓몬이었음을 안다.
// │  그게 이 싸움을 단순하지 않게 만든다.
// │
// └─ Aegis ────────────────────────────────────────────────────────────────────
//    "방패"를 뜻하는 암베라 고어(古語)에서 유래한 이름.
//    봉인을 연구하던 소수의 포켓몬들이 수백 년 전 자발적으로 결성한 조직.
//
//    Aegis의 임무는 단순하다: 8개의 봉인석을 지키는 것.
//    봉인석이 모두 온전하면 군주는 잠든 채로 있다.
//    하나라도 파괴되면 봉인의 균형이 흔들리고, 군주의 각성이 앞당겨진다.
//
//    Aegis는 군주를 처치하거나 몰아내려 하지 않는다.
//    그럴 방법도, 그래야 할 이유도 확실하지 않기 때문이다.
//    그저 오늘 밤 봉인석에 닿으려는 감시자를 막을 뿐이다.
//    그리고 내일 밤도, 그다음 날 밤도.
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎭 등장인물
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// ┌─ 루카리오 (pokemonId: 448) ───────────────────────────────────────────────
// │  Aegis 총사령관. 12년 경력. 아우라로 감시자의 텅 빈 내면을 읽는다.
// │  확신보다 질문을 하는 사람. 잃은 사람이 있다.
// │  말투: 짧고 직접적. "." 으로 끊는다. "......" 침묵이 많다.
// │
// ├─ 스라크 (pokemonId: 123) ─────────────────────────────────────────────────
// │  Aegis 서부 지부 사령관. 냉소적이지만 의리 있다.
// │  회의적으로 질문하고, 스스로 납득하면 끝까지 간다.
// │  말투: 짧음. 감정을 숨기다가 가끔 드러낸다.
// │
// ├─ 라티아스 (pokemonId: 380) ───────────────────────────────────────────────
// │  알토마레 성역 수호자. 오빠 라티오스가 사라졌다.
// │  감정을 직접 드러낸다. 질문을 두려워하지 않는다.
// │  말투: 솔직하고 감성적. "알아."로 끊는 대사가 많다.
// │
// ├─ 라티오스 (pokemonId: 381) ───────────────────────────────────────────────
// │  Ch.3~7 동안 부재. Ch.8 엔딩에서 귀환. 늦은 이유는 바다 쪽에 별도 위협.
// │  말투: 짧고 담담하다.
// │
// ├─ 레지락 (pokemonId: 377) ─────────────────────────────────────────────────
// │  어둠 동굴 자원 수호자. 군주 봉인 현장 목격자.
// │  군주를 악으로 단정 짓지 않는다. "선택이었다."가 핵심 대사.
// │  말투: "......" 으로 시작하는 대사가 많다. 느리고 무겁다.
// │
// ├─ 레지아이스 (pokemonId: 378) ─────────────────────────────────────────────
// │  눈설왕 산맥 수호자. 군주가 봉인될 때 저항하지 않았음을 알고 있다.
// │  "슬픔처럼 보였다"는 군주 관찰이 핵심. 군주를 가장 이해하는 캐릭터.
// │  말투: "......" 많음. 레지락과 비슷하나 더 사유적.
// │
// ├─ 프리져 (pokemonId: 144) ─────────────────────────────────────────────────
// │  눈설왕 산맥 영역 수호자. 레지아이스와 함께 등장.
// │  실용적이고 행동 지향적. 깊은 말보다 상황 정리를 한다.
// │  말투: 명확하고 빠르다.
// │
// ├─ 엘레이드 (pokemonId: 475) ─────────────────────────────────────────────
// │  Aegis 중부 지부장. 철학적 질문을 던지지만 현실주의자.
// │  "오늘 밤에 살아있는 사람이 내일을 걱정할 수 있다" — 작품 전체 주제 대사.
// │  Ch.8에서 이 대사를 다시 반복해 주제를 닫는다.
// │  말투: 조용하지만 핵심을 찌른다.
// │
// └─ 군주 (pokemonId: 487, 기라티나) ─────────────────────────────────────────
//    1만 년 봉인. 차원 사이에서 태어나 아무 데도 속하지 못한 존재.
//    악의가 없다. 두렵고, 이름도 잊었다. 봉인을 받아들인 이유를 스스로도 모른다.
//    Aegis를 적으로 보지 않는다. "잘 싸웠어."라고 말한다.
//    말투: 느리고 무겁다. 질문으로 대화한다.
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 스토리 전체 구조 (챕터별 테마)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  Ch.1  팔레트 평원   — "우리는 무엇을 지키는가"       감시자의 정체에 대한 첫 질문
//  Ch.2  비리디안 외성 — "두려움을 임무라고 부를 때"     루카리오와 스라크의 회의와 공감
//  Ch.3  알토마레 해안 — "사라진 사람을 기다리는 것"     라티아스의 부재와 선택
//  Ch.4  어둠 동굴     — "선택한 것과 강요받은 것"       레지락의 자원 수호와 군주의 실체
//  Ch.5  오레 사막     — "우리가 적을 닮아갈 때"         섀도우화의 공포와 도덕적 딜레마
//  Ch.6  사파리 사바나 — "한 사람이 버틸 수 있는 것"     소진과 엘레이드의 현실주의
//  Ch.7  눈설왕 산맥   — "기억한다는 것의 무게"          레지아이스의 목격자 책임
//  Ch.8  차원의 제단   — "봉인한다는 것은 이해를 포기하는가" 군주와의 대화, 열린 결말
//
//  ✦ Ch.8 엔딩 구조: 엘레이드가 Ch.6의 대사를 다시 반복 → 주제가 고리처럼 닫힘
//  ✦ 라티오스는 Ch.3에서 실종, Ch.8 엔딩에서 귀환 → 서브플롯 완결
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✍️  대사 작성 가이드
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  ▸ 한 대사 = 한 화면. 너무 길면 두 줄로 분리.
//    (화면 폭 기준 약 40자 2줄 = 한 대사의 적정 분량)
//
//  ▸ 감정은 대사 안에 직접 쓰지 않는다. "슬프다" 대신 행동이나 침묵.
//    좋은 예: '......그게 전부야.'
//    나쁜 예: '나는 매우 슬프고 힘들어.'
//
//  ▸ "......" 은 레지락·레지아이스·군주의 대사 앞에 붙이는 침묵 표시.
//    루카리오는 "......" 을 대사 중간에 삽입 (ex: '......맞아.')
//
//  ▸ 챕터 오프닝 대사: 전투 시작 전 상황 설명. 6~12줄 권장.
//  ▸ 챕터 엔딩 대사:   전투 직후 여운. 4~8줄 권장.
//
//  ▸ speaker(한글)와 speakerEn(영문)을 반드시 함께 작성.
//  ▸ pokemonId는 PokeAPI 기준 국가도감번호. 변경 금지.
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 챕터 테마 색상 가이드 (theme.primary만 수정 가능)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  Ch.1 초록  #4ade80  팔레트 초원
//  Ch.2 연초록 #86efac  비리디안 숲
//  Ch.3 하늘  #38bdf8  알토마레 해안
//  Ch.4 보라  #a78bfa  어둠 동굴
//  Ch.5 주황  #fb923c  오레 사막
//  Ch.6 연두  #a3e635  사파리 사바나
//  Ch.7 청색  #7dd3fc  눈설왕 산맥
//  Ch.8 황금  #f59e0b  차원의 제단
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 DialogueLine 형식
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
//  {
//    speaker:   '루카리오',   // 화자 한글 이름 (화면에 표시됨)
//    speakerEn: 'Lucario',   // 화자 영문 이름 (내부 식별용)
//    pokemonId: 448,          // PokeAPI 국가도감번호 (스프라이트 로딩에 사용)
//    text: '대사 내용',       // 실제 화면에 타이프라이터로 출력되는 텍스트
//  }
//
//  pokemonId 주요 목록:
//    448 루카리오  |  123 스라크   |  380 라티아스  |  381 라티오스
//    377 레지락   |  378 레지아이스 |  144 프리져   |  475 엘레이드
//    487 군주(기라티나)
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface DialogueLine {
  speaker: string;    // 화면에 표시되는 화자 이름 (한글)
  speakerEn: string;  // 영문 화자 이름 (내부 식별)
  text: string;       // 대사 본문
  pokemonId?: number; // PokeAPI 국가도감번호 — 캐릭터 스프라이트 지정
}

export interface StoryChapter {
  // ── 게임 시스템 연결 필드 (수정 금지) ──────────────────────────────────────
  id: string;           // 내부 식별자 (ex: 'ch1_pallet_plains')
  chapterNumber: number; // 1~8 순서 (해금 체인에 사용)
  mapId: string;         // 게임 맵 파일 ID (수정 시 맵 로딩 깨짐)
  totalWaves: number;    // 항상 30 고정
  heroPool: number[];    // 상점 우선 등장 포켓몬 번호 목록
  enemyTypes: string[];  // 적 스폰 타입 편향 목록
  bossName?: string;     // 보스 포켓몬 이름
  bossWave: number;      // 보스가 등장하는 웨이브 번호
  unlockCondition: string; // 해금 조건 텍스트

  // ── 스토리 콘텐츠 필드 (자유롭게 수정 가능) ────────────────────────────────
  title: string;         // 챕터 제목 (ex: '첫 번째 경보')
  subtitle: string;      // 챕터 부제 (ex: '팔레트 평원 · 잠든 봉인 앞에서')
  location: string;      // 장소 텍스트 (화면 좌상단에 표시)
  theme: {
    primary: string;     // 챕터 대표 색상 HEX (UI accent에 사용) — 수정 가능
    secondary: string;   // 보조 색상 — 수정 금지
    bg: string;          // 배경 그라데이션 CSS — 수정 금지
  };
  openingDialogue: DialogueLine[]; // 게임 시작 전 오프닝 대사 배열
  endingDialogue: DialogueLine[];  // 게임 클리어 후 엔딩 대사 배열
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📚 챕터 데이터 — 여기서부터 스토리 내용을 수정하세요
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const AEGIS_STORY_CHAPTERS: StoryChapter[] = [

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 1 — 첫 번째 경보
// │ 테마: "우리는 무엇을 지키는가" — 정체성과 임무의 시작
// │ 등장: 루카리오
// │ 맵:   easiest_straight (직선 경로, 초급)
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:            'ch1_pallet_plains',
  chapterNumber: 1,
  mapId:         'easiest_straight',
  totalWaves:    30,
  heroPool:      [25, 1, 4, 7, 133, 39], // 피카츄·이상해씨·파이리·꼬부기·이브이·푸린
  enemyTypes:    ['normal', 'bug', 'flying'],
  bossWave:      0, // 0 = 보스 없음
  unlockCondition: '게임을 시작하면 해금됩니다.',
  theme: {
    primary:   '#4ade80',
    secondary: '#166534',
    bg:        'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '첫 번째 경보',
  subtitle: '팔레트 평원 · 잠든 봉인 앞에서',
  location: '팔레트 평원 · 암베라 서부',

  openingDialogue: [
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '봐. 저기.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '봉인석이야. 1만 년 동안 아무도 건드리지 않았어. 아르세우스가 새겨넣은 최초의 봉인. 그걸 지금 저것들이 향해 오고 있어.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '감시자(Watcher). Aegis는 그렇게 불러. 눈에서 빛이 사라진 것들. 이름도 없고, 두려움도 없어. 그냥 걷고, 걷고, 또 걷는다.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '처음 봤을 때 나는 그게 뭔지 몰랐어. 야생 포켓몬이 이상하게 보인다고 생각했지. 그런데 아우라를 읽어보려 했더니 — 아무것도 없었어. 텅 비어있었어.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '그 빈 곳이 뭔지 나는 아직도 모르겠어. 죽음인지, 아니면 완전히 다른 무언가인지.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '어쨌든 — 그게 봉인석에 닿으면 안 돼. 이 통로가 유일한 경로야. 여기서 막아야 해. 준비됐어?',
    },
  ],

  endingDialogue: [
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '막았어.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......여기 쓰러진 감시자들 봐. 이게 한때 어떤 포켓몬이었는지 알아? 나는 몇 주 전까지 저 중에 골뱃이 있었다는 걸 알고 있어. 이름이 있었어. 마을 북쪽에서 살던 녀석이었어.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '군주가 보낸 뭔가가 그 포켓몬 안으로 들어간 거야. 골뱃이 사라지고 감시자가 남은 거지. 그게 죽음이냐고? 나는 대답을 모르겠어.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '나머지 봉인들이 있어. 일곱 개가 더 있어. 가자. 생각은 나중에 해.',
    },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 2 — 포위된 마을
// │ 테마: "두려움을 임무라고 부를 때" — 루카리오와 스라크의 회의와 공감
// │ 등장: 루카리오, 스라크
// │ 맵:   easy_loop (순환 경로, 초급)
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:            'ch2_viridian_walls',
  chapterNumber: 2,
  mapId:         'easy_loop',
  totalWaves:    30,
  heroPool:      [3, 6, 9, 136, 197, 94], // 이상해꽃·리자드·거북왕·부스터·블래키·팬텀
  enemyTypes:    ['ghost', 'psychic', 'poison'],
  bossWave:      22,
  bossName:      '어둠의 선봉 — 강화 팬텀',
  unlockCondition: '챕터 1을 클리어하면 해금됩니다.',
  theme: {
    primary:   '#86efac',
    secondary: '#15803d',
    bg:        'linear-gradient(135deg, #052e16 0%, #064e3b 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '포위된 마을',
  subtitle: '비리디안 · 외성의 밤',
  location: '비리디안 시티 외곽 · 암베라 서부',

  openingDialogue: [
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '루카리오.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '스라크. Aegis 서부 지부. 오래간만이야.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '세 달이야. 팔레트 사건 이후로 이쪽에서만 다섯 번 출몰했어. 점점 빨라지고 있어.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '주민들은?',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '대부분 알아. 숨기기엔 이미 너무 많이 봤으니까. 무서워하는 것들은 다 무서워하고 있어. 근데 그게 도움은 안 되잖아.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......맞아.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '루카리오. 솔직하게 물어볼게. 우리가 이길 수 있어? 8개의 봉인을 다 지키면 뭔가 달라져?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......모르겠어. 이기는 게 아닐 수도 있어. 지지 않는 것일 수도 있고.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '그것만으로 충분한지 묻고 싶었는데, 지금은 그럴 때가 아닌 것 같다. 봐 — 외성 전체를 빙 둘러쌌어. 순환 경로야. 저것들은 멈추지 않아.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '경로를 따라 배치해. 빠진 곳 하나 없이.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '알아. 알고 있어. 오늘 밤은 그냥 막자.',
    },
  ],

  endingDialogue: [
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '......했네. 오늘 밤은.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '마지막 물결에 고스트 타입이 섞여 있었어. 지금까지 본 것들과 달랐어. 더 빠르고, 의도가 있는 것처럼 움직였어.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '의도. 감시자한테 의도가 있다고?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '아니면 군주의 의도를 그것들이 빌리고 있거나. 어느 쪽이든 좋지 않아.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '......그 아까 질문, 루카리오. 지지 않는 것이 충분하냐고. 오늘 밤을 보고 나니까 — 일단은 충분한 것 같기도 해.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '오늘 밤만큼은.',
    },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 3 — 바다의 침략
// │ 테마: "사라진 사람을 기다리는 것" — 라티아스의 부재와 선택
// │ 등장: 루카리오, 라티아스 (라티오스는 이 시점에 실종 상태)
// │ 맵:   extreme_aggro_shortcut (해안 우회 + 지름길, 중급)
// │ NOTE: 라티오스의 실종은 Ch.8 엔딩에서 귀환으로 완결됨
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:            'ch3_altomare_coast',
  chapterNumber: 3,
  mapId:         'extreme_aggro_shortcut',
  totalWaves:    30,
  heroPool:      [249, 380, 382, 130, 54, 131], // 루기아·라티아스·가이오가·갸라도스·고라파덕·라프라스
  enemyTypes:    ['water', 'poison', 'ice'],
  bossWave:      25,
  bossName:      '어둠의 폭류 — 어둠 갸라도스',
  unlockCondition: '챕터 2를 클리어하면 해금됩니다.',
  theme: {
    primary:   '#38bdf8',
    secondary: '#0369a1',
    bg:        'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '바다의 침략',
  subtitle: '알토마레 · 돌아오지 않는 파도',
  location: '알토마레 해안 · 암베라 남부',

  openingDialogue: [
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '열흘이 됐어.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '라티오스가?',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '응. 바다 쪽으로 날아갔어. 뭔가 느꼈다고 했어. 내가 따라가려 했더니 혼자 가겠다고 했어. 그게 마지막이야.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '루카리오. 솔직하게 말해줘. 감시자가 된 포켓몬이 돌아온 적 있어?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......없어. 지금까지는.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '그래. 알았어.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '근데 나는 아직도 모르겠어. 사라진 게 죽음인지, 아니면 다른 어딘가로 간 건지. 그 차이가 있는지도.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '라티아스.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '걱정하지 마. 무너지지 않을 거야. 근데 — 이 성역이 내 집이야. 오빠가 지키려 했던 곳이야. 그러니까 내가 지켜야 해. 이유는 그거야.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......해안 경로와 중앙 지름길, 두 방향이야. 준비돼?',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '돼.',
    },
  ],

  endingDialogue: [
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '막았어. 바다 성역은 건재해.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '마지막 놈 쓰러질 때 뭔가 느꼈어. 바다 밑에서 뭔가가 물러가는 느낌. 오빠가 거기 있는 건지, 아니면 그냥 군주의 기운인건지 — 모르겠어.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '루카리오. 너는 Aegis를 얼마 동안 해왔어?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '12년.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '12년 동안 지키면서 잃은 사람이 있어?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......있어.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '그래도 계속했어?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '계속했어.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '......알겠어. 동굴로 가자.',
    },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 4 — 지하의 울부짖음
// │ 테마: "선택한 것과 강요받은 것" — 자유의지와 수호의 의미
// │ 등장: 루카리오, 라티아스, 레지락 (첫 등장)
// │ 맵:   medium_multi_s (S자 굴곡 경로, 중급)
// │ NOTE: 레지락이 군주 봉인 당시의 진실을 처음으로 언급
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:            'ch4_dark_cave',
  chapterNumber: 4,
  mapId:         'medium_multi_s',
  totalWaves:    30,
  heroPool:      [377, 219, 237, 169, 461, 232], // 레지락·마그카르고·카포에라·크로뱃·포푸니라·코리갑
  enemyTypes:    ['rock', 'ground', 'poison', 'dark'],
  bossWave:      25,
  bossName:      '동굴의 파견대장 — 어둠의 레지락 복제',
  unlockCondition: '챕터 3을 클리어하면 해금됩니다.',
  theme: {
    primary:   '#a78bfa',
    secondary: '#6d28d9',
    bg:        'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '지하의 울부짖음',
  subtitle: '어둠 동굴 · 선택과 기다림',
  location: '어둠 동굴 제5층 · 암베라 지하',

  openingDialogue: [
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '.......',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '— 누구야.',
    },
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......나는 레지락이다. 이 성역의 수호자.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '아르세우스가 지정한 거예요?',
    },
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......아니다. 내가 자원했다.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '왜?',
    },
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......군주가 봉인되던 날 나는 여기 있었다. 그 무게가 무엇인지 알고 있어. 그것을 아는 존재가 여기 있어야 한다고 생각했다.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '수천 년 동안 혼자 여기서.',
    },
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......선택이었다. 강요받은 게 아니야.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......그 차이가 그렇게 중요해?',
    },
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......나한테는. 그게 전부야.',
    },
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......감시자들이 구불구불한 터널을 따라 온다. 한 방향으로만. 빠져나갈 공간이 없어. 집중 배치하면 막을 수 있어.',
    },
  ],

  endingDialogue: [
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......건재하다.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '레지락. 군주가 봉인되던 날에 대해 — 더 알고 싶어.',
    },
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......군주는 원래 이 세계의 것이 아니었다. 차원 사이에서 태어난 존재야. 여기도, 어디도 속하지 않는. 아르세우스가 이 세계에 억지로 묶어놓은 거야.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '봉인이 군주를 위한 게 아니라 — 우리를 위한 거였던 거예요?',
    },
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......양쪽 다를 위한 거였다고 생각해. 근데 군주는 그렇게 생각하지 않겠지.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......감시자들이 죽기 싫어서 공격하는 건지, 아니면 그냥 명령을 수행하는 건지. 그것도 모르겠어.',
    },
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......그것도 나는 몰라. 사막으로 가야 해. 오레 협곡 — 거기서 뭔가가 움직이고 있어.',
    },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 5 — 두 바람의 맹세
// │ 테마: "우리가 적을 닮아갈 때" — 섀도우화 포켓몬의 도덕적 딜레마
// │ 등장: 루카리오, 스라크, 라티아스, 레지락
// │ 맵:   medium_merge (2경로 합류, 중급)
// │ NOTE: 보라색 눈 섀도우 포켓몬 첫 등장. 군주가 직접 보낸 존재.
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:            'ch5_orre_desert',
  chapterNumber: 5,
  mapId:         'medium_merge',
  totalWaves:    30,
  heroPool:      [645, 637, 214, 359, 248, 445], // 랜드로스·불카모스·해루미·앱솔·마기라스·가브리아스
  enemyTypes:    ['rock', 'ground', 'fire', 'dark'],
  bossWave:      27,
  bossName:      '섀도우 마기라스 — 군주의 첫 번째 전령',
  unlockCondition: '챕터 4를 클리어하면 해금됩니다.',
  theme: {
    primary:   '#fb923c',
    secondary: '#c2410c',
    bg:        'linear-gradient(135deg, #431407 0%, #7c2d12 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '두 바람의 맹세',
  subtitle: '오레 사막 · 보라색 눈의 의미',
  location: '오레 사막 협곡 · 암베라 동부',

  openingDialogue: [
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '루카리오. 저거 봐.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......보라색 눈.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '일반 감시자랑 달라. 저것들은 우릴 보고 있어. 그냥 걷는 게 아니야.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '섀도우화된 포켓몬이에요. 군주가 직접 의식을 불어넣은 거야. 저들은 아직... 조금은 남아있어.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '남아있다는 게 더 위험할 수 있어.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '아니면 구할 수 있다는 말이기도 하고.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......지금은 방법이 없어. 스라크.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '알아. 지금은. 기억해두는 거야. 나중을 위해.',
    },
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......두 방향이다. 협곡 상단과 하단. 합류 지점이 성역 앞이야. 거기서 만나기 전에 막아야 해.',
    },
  ],

  endingDialogue: [
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '섀도우 마기라스. 군주가 직접 보낸 첫 번째 전령.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '의식이 있었어. 우리를 알아봤어. 그냥 명령대로 움직이는 게 아니었어.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '......괴로워보였어. 안에서 뭔가가 싸우고 있는 것처럼.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '그래도 막아야 했어.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '알아. 그래도.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......Aegis가 하는 일이 옳다고 나는 믿어. 근데 그게 쉬운 일이라고 생각한 적은 없어. 사바나로 간다.',
    },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 6 — 대평원의 대진격
// │ 테마: "한 사람이 버틸 수 있는 것의 한계" — 소진과 엘레이드의 현실주의
// │ 등장: 루카리오, 스라크, 라티아스, 엘레이드 (첫 등장)
// │ 맵:   hard_straight_wide (3줄 동시 진격, 고급)
// │ ★★★ KEY: 엘레이드의 대사 "오늘 밤에 살아있는 사람이 내일을 걱정할 수 있다"
// │          → 이 대사가 Ch.8 엔딩에서 다시 반복되어 주제를 닫는다
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:            'ch6_safari_savanna',
  chapterNumber: 6,
  mapId:         'hard_straight_wide',
  totalWaves:    30,
  heroPool:      [475, 103, 452, 197, 149, 373], // 엘레이드·나시·드래피온·블래키·망나뇽·보만다
  enemyTypes:    ['normal', 'grass', 'fighting', 'dark'],
  bossWave:      28,
  bossName:      '섀도우 삼삼바우',
  unlockCondition: '챕터 5를 클리어하면 해금됩니다.',
  theme: {
    primary:   '#a3e635',
    secondary: '#4d7c0f',
    bg:        'linear-gradient(135deg, #1a2e05 0%, #365314 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '대평원의 대진격',
  subtitle: '사파리 사바나 · 세 갈래의 공세',
  location: '사파리 사바나 · 암베라 중부',

  openingDialogue: [
    {
      speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
      text: '전령이 왔어. 사흘 전부터 지평선에서 뭔가 모이기 시작했다고. 오늘 밤이 그날인 것 같아.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '엘레이드. Aegis 중부. 얼마나 돼?',
    },
    {
      speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
      text: '세는 게 의미 있는 숫자가 아니야. 지평선이 움직이고 있어.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '......',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '세 줄 경로야. 동시에 온다. 병력을 나눠.',
    },
    {
      speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
      text: '루카리오. 질문이 있어. 우리가 봉인을 전부 지킨다고 가정하자. 그러면 군주는 어떻게 돼?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '잠든 채로 있어. 봉인이 복원되니까.',
    },
    {
      speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
      text: '영원히?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......모르겠어. 1만 년 전도 영원히라고 했겠지.',
    },
    {
      speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
      text: '그러면 우리가 하는 게 결국 미룬다는 건데.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......그래.',
    },
    {
      speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
      // ★ 이 대사는 Ch.8 엔딩에서 반복됨. 수정 시 Ch.8도 함께 수정할 것.
      text: '나는 그거면 충분해. 오늘 밤에 살아있는 사람이 내일을 걱정할 수 있잖아. 배치 시작해.',
    },
  ],

  endingDialogue: [
    {
      speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
      text: '막았어.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '......세 줄을 동시에. 처음 해봤어.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '엘레이드. 아까 한 말. 오늘 밤에 살아있는 사람이 내일을 걱정할 수 있다고.',
    },
    {
      speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
      text: '응.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......그게 Aegis가 하는 일이야. 내가 12년 동안 잊고 있던 말을 네가 다시 해줬어.',
    },
    {
      speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
      text: '설마 감사 인사야?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '북쪽으로 가자. 눈설왕 산맥.',
    },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 7 — 두 전선
// │ 테마: "기억한다는 것의 무게" — 레지아이스의 목격자 책임
// │ 등장: 루카리오, 라티아스, 엘레이드, 레지아이스 (첫 등장), 프리져 (첫 등장)
// │ 맵:   hard_dual_path (완전 분리 2경로, 고급)
// │ NOTE: 군주가 봉인 시 저항하지 않았다는 레지아이스의 증언 → Ch.8 군주 이해의 복선
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:            'ch7_snowpeak_twins',
  chapterNumber: 7,
  mapId:         'hard_dual_path',
  totalWaves:    30,
  heroPool:      [378, 144, 460, 478, 473, 471], // 레지아이스·프리져·눈설왕·눈여아·맘모꾸리·글레이시아
  enemyTypes:    ['ice', 'steel', 'dark', 'ghost'],
  bossWave:      30,
  bossName:      '섀도우 눈설왕 ×2 — 쌍둥이 감시자',
  unlockCondition: '챕터 6을 클리어하면 해금됩니다.',
  theme: {
    primary:   '#7dd3fc',
    secondary: '#0284c7',
    bg:        'linear-gradient(135deg, #0c2948 0%, #164e63 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '두 전선',
  subtitle: '눈설왕 산맥 · 기억하는 자',
  location: '눈설왕 산맥 정상부 · 암베라 북부',

  openingDialogue: [
    {
      speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
      text: '......오래 걸렸네.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '기다리고 있었어?',
    },
    {
      speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
      text: '......언젠가 누군가 올 거라고 생각했어. 군주가 다시 움직이면.',
    },
    {
      speaker: '프리져', speakerEn: 'Articuno', pokemonId: 144,
      text: '나도 있어. 이 산은 오래 됐어. 기억이 많이 쌓인 곳이야.',
    },
    {
      speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
      text: '......루카리오. 군주를 봉인할 때 무슨 일이 있었는지 알고 싶어?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '알고 싶어.',
    },
    {
      speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
      text: '......군주는 저항하지 않았어. 봉인될 때. 그냥 — 받아들였어. 아르세우스가 봉인을 새길 때 군주는 눈을 감고 기다렸어.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '......왜요?',
    },
    {
      speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
      text: '......모르겠어. 나는 그 눈을 봤는데 — 슬픔처럼 보였어. 분노가 아니라.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......그리고 지금은 깨어나려 하고 있어.',
    },
    {
      speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
      text: '......그래. 1만 년이 지났어. 뭔가 달라졌는지는 모르겠어. 경로가 둘로 나뉘어. 완전히 분리된 두 봉우리야. 각자 막아야 해.',
    },
    {
      speaker: '프리져', speakerEn: 'Articuno', pokemonId: 144,
      text: '내가 왼쪽. 레지아이스가 오른쪽. 루카리오, 병력 나눠.',
    },
  ],

  endingDialogue: [
    {
      speaker: '프리져', speakerEn: 'Articuno', pokemonId: 144,
      text: '양쪽 다 지켰어.',
    },
    {
      speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
      text: '......루카리오. 아까 군주 이야기. 왜 저항하지 않았는지 — 내 생각을 말해도 될까?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '말해.',
    },
    {
      speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
      text: '......군주는 지쳤던 게 아닐까. 아무 데도 속하지 못하는 게. 봉인을 받아들인 건 — 쉬고 싶었던 것일 수도 있어.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......그리고 지금은 다시 깨어나려 해.',
    },
    {
      speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
      text: '......그게 더 무서운 이유야. 쉬고 싶었던 게 지금은 일어나고 싶을 만큼 뭔가가 달라졌다는 거니까. 성소로 가야 해.',
    },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 8 — 최후의 봉인  ★ 최종 챕터
// │ 테마: "봉인한다는 것은 이해를 포기하는 것인가" — 군주와의 대화, 열린 결말
// │ 등장: 루카리오, 스라크, 라티아스, 엘레이드, 레지락, 레지아이스, 군주, 라티오스(귀환)
// │ 맵:   extreme_central (4방향 동시 진격, 최고급)
// │
// │ ★★★ 구조적 핵심:
// │   - 군주와의 대화: 적의가 아닌 이해와 두려움
// │   - 라티오스 귀환: Ch.3의 서브플롯 완결
// │   - 엘레이드가 Ch.6 대사를 반복 → 주제 고리가 닫힘
// │   - 열린 결말: "나는 없겠지만 Aegis는 있을 거야"
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:            'ch8_masters_sanctum',
  chapterNumber: 8,
  mapId:         'extreme_central',
  totalWaves:    30,
  heroPool:      [487, 484, 483, 150, 151, 448, 381, 380], // 기라티나·팔키아·디아루가·뮤츠·뮤·루카리오·라티오스·라티아스
  enemyTypes:    ['ghost', 'dragon', 'dark', 'psychic'],
  bossWave:      30,
  bossName:      '군주의 화신 — 기라티나 (Origin Forme)',
  unlockCondition: '챕터 7을 클리어하면 해금됩니다.',
  theme: {
    primary:   '#f59e0b',
    secondary: '#92400e',
    bg:        'linear-gradient(135deg, #1c0a00 0%, #431407 50%, #0f0720 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '최후의 봉인',
  subtitle: '차원의 제단 · 이해와 봉인 사이에서',
  location: '차원의 제단 · 암베라 심연',

  openingDialogue: [
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '여기야.',
    },
    {
      speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
      text: '저 호수. 검어지고 있어.',
    },
    {
      speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
      text: '......봉인이 흔들리고 있어. 1만 년 만에 처음으로.',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '......오래 기다렸어.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '— 저 목소리.',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '무서워? 아니면 슬퍼?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......당신이 군주야.',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '그렇게 불리지. 나는 내 이름을 기억 못 해. 1만 년이 지났거든. 너희는 기억해? 1만 년 전의 일을?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '우린 그 자리에 없었어.',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '맞아. 없었지. 그래도 여기 왔어. 지키려고. — 재미있네. 이유를 알아?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '말해.',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '1만 년 전에도 누군가 같은 이유로 같은 자리에 서 있었어. 나를 봉인하기 위해서가 아니라 — 뭔가를 지키기 위해서. 그리고 나는 봉인됐어.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '......그게 뭘 말하려는 건지 모르겠어.',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '나도 몰라. 그냥 기억나는 거야. 그 사람들이 무서워하지 않았어. 나처럼.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '당신도 무서워?',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '......깨어난다는 게 무서워. 1만 년이 지났는데 세상이 여전할까. — 어쨌든 내 것들을 보내줄게. 막아봐. 막을 수 있으면.',
    },
    {
      speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
      text: '......4방향이야.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '전원, 배치.',
    },
  ],

  endingDialogue: [
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '봉인이 복원되고 있어.',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '......그래.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '……질문이 있어. 봉인 안에서 — 잠들어있어? 아니면 깨어있어?',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '......꿈같은 것들을 봐. 여기 있는 것들이 무언가를 하는 걸. 그게 봐진다.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......그러면 당신은 이번에도 봤겠네. 우리가 막는 걸.',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '......봤어. — 잘 막았어.',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '다음에 깨어나도 — 너희가 있을까?',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......모르겠어. 나는 없겠지. 근데 Aegis는 있을 거야.',
    },
    {
      speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
      text: '......그거면 됐어.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '......오빠.',
    },
    {
      speaker: '???', speakerEn: 'Unknown', pokemonId: 381,
      text: '라티아스. 늦었어. 미안.',
    },
    {
      speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
      text: '오빠!! 어디 있었어!!',
    },
    {
      speaker: '라티오스', speakerEn: 'Latios', pokemonId: 381,
      text: '바다 쪽에 하나가 더 있었어. 처리하느라 늦었어. 잘 해냈네. 다들.',
    },
    {
      speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
      text: '......루카리오. 군주가 다음에 깨어나도 너희가 있냐고 물었잖아. 근데 솔직히 — 우리가 막는 게 맞는 건지 지금도 잘 모르겠어. 군주가 그렇게 나쁜 존재인지.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '......나도 몰라. 근데 확실한 건 — 오늘 밤 감시자들한테 달려가던 마을 사람들이 있었어. 그 사람들이 내일도 있어야 해. 그게 이유야.',
    },
    {
      speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
      // ★ Ch.6에서 엘레이드가 처음 한 대사. 여기서 반복되어 주제가 닫힌다.
      text: '오늘 밤에 살아있는 사람이 내일을 걱정할 수 있다.',
    },
    {
      speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
      text: '그래. Aegis는 계속해.',
    },
  ],
},

]; // AEGIS_STORY_CHAPTERS 끝

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 헬퍼 함수 — 수정 금지
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const getChapterById = (id: string) =>
  AEGIS_STORY_CHAPTERS.find((c) => c.id === id);

export const getChapterByMapId = (mapId: string) =>
  AEGIS_STORY_CHAPTERS.find((c) => c.mapId === mapId);