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
// │ CHAPTER 1 — 방패가 태어난 밤
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:             'ch1_pallet_plains',
  chapterNumber:  1,
  mapId:          'easiest_straight',
  totalWaves:     30,
  heroPool:       [25, 1, 4, 7, 133, 39],
  enemyTypes:     ['normal', 'bug', 'flying'],
  bossWave:       0,
  unlockCondition: '게임을 시작하면 해금됩니다.',
  theme: {
    primary:   '#4ade80',
    secondary: '#166534',
    bg:        'linear-gradient(135deg, #052e16 0%, #14532d 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '방패가 태어난 밤',
  subtitle: '팔레트 평원 · 이름 없는 첫 물결',
  location: '팔레트 평원 · 최초 봉인석',

  openingDialogue: [
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '피카츄, 이브이. 오늘 밤부터 너희는 Aegis의 견습 대원이다.',
      },
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: 'Aegis...? 그게 우리 팀 이름이야?',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '방패라는 뜻이다. 우리는 8개의 봉인석을 지키기 위해 모인 포켓몬들의 조직.',
      },
      {
        speaker: '이브이', speakerEn: 'Eevee', pokemonId: 133,
        text: '봉인석을 지킨다는 건... 저 돌을 지킨다는 거지? 그런데 뭘 막는 거야?',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '군주. 1만 년 전 아르세우스가 세계의 심연에 봉인한 존재다.',
      },
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: '군주라면... 왕 같은 거야? 아니면 괴물?',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '아직은 둘 다 아니다. 차원과 차원 사이에서 태어난, 어디에도 속하지 못한 포켓몬.',
      },
      {
        speaker: '이브이', speakerEn: 'Eevee', pokemonId: 133,
        text: '그런데 왜 봉인된 거야?',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '모른다. Aegis가 아는 건 하나뿐이다. 봉인이 약해지면, 군주의 꿈이 새어 나온다.',
      },
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: '꿈이 새어 나오면 어떻게 되는데?',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '그 꿈은 길을 잃은 포켓몬에게 스며든다. 이름도 기억도 빼앗고, 봉인석까지 걷게 만든다.',
      },
      {
        speaker: '이브이', speakerEn: 'Eevee', pokemonId: 133,
        text: '그게... 감시자야?',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '그래. 감시자는 적이 아니다. 한때 이름을 가진 포켓몬이다. 그래서 더 정확하게 막아야 한다.',
      },
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: '미워하지 말고 막는다. 쓰러뜨리는 게 아니라, 봉인석에 닿지 못하게 하는 거네.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '맞아. 오늘 밤 우리가 지키는 건 돌이 아니다. 아직 빼앗기지 않은 모든 이름이다.',
      },
      {
        speaker: '이브이', speakerEn: 'Eevee', pokemonId: 133,
        text: '알겠어. 무서워도 도망치지 않을게. 나도... 방패가 될게.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '통로는 하나. 망설임도 하나만 허락한다. 시작 전까지. 시작하면, 방패가 되어.',
      },
  ],

  endingDialogue: [
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: '해냈어! 봉인석이 살아있어, 루카리오!',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '......그래. 오늘 밤은 우리가 이겼다.',
      },
      {
        speaker: '이브이', speakerEn: 'Eevee', pokemonId: 133,
        text: '그런데 마지막 감시자가 쓰러질 때, 잠깐 눈빛이 돌아온 것 같았어.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '......봤어. 골뱃이었다. 북쪽 숲에서 별을 세던 녀석.',
      },
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: '우리가 구한 거야? 아니면 더 멀리 보내버린 거야?',
      },
      {
        speaker: '이브이', speakerEn: 'Eevee', pokemonId: 133,
        text: '모르겠어. 근데 한 가지는 알아. 봉인석이 무너졌으면 그 골뱃은 영영 돌아오지 못했을 거야.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '그래서 막는 거야. 오늘 밤의 방패가 내일의 이름을 지킨다.',
      },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 2 — 초록 성벽의 새벽전선
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:             'ch2_viridian_walls',
  chapterNumber:  2,
  mapId:          'easy_loop',
  totalWaves:     30,
  heroPool:       [3, 6, 9, 136, 197, 94],
  enemyTypes:     ['ghost', 'psychic', 'poison'],
  bossWave:       22,
  bossName:       '어둠의 선봉 — 강화 팬텀',
  unlockCondition: '챕터 1을 클리어하면 해금됩니다.',
  theme: {
    primary:   '#86efac',
    secondary: '#15803d',
    bg:        'linear-gradient(135deg, #052e16 0%, #064e3b 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '초록 성벽의 새벽전선',
  subtitle: '비리디안 외성 · 두려움을 임무라 부르는 법',
  location: '비리디안 외성 순환로',

  openingDialogue: [
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '늦었군, 총사령관. 외성의 나무문은 벌써 세 번 울었다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '주민 대피는?',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '끝냈다. 겁먹은 애들은 지하 저장고에, 버티겠다는 애들은 성벽 뒤에.',
      },
      {
        speaker: '팬텀', speakerEn: 'Gengar', pokemonId: 94,
        text: '크크... 뒤쪽 그림자도 내가 봤어. 이번엔 고스트 타입이 섞여 있더라.',
      },
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: '고스트면 벽을 돌아서 들어오는 거야?',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '아니. 더 싫은 방식이지. 성벽을 빙글빙글 돌면서 우리 집중력을 갉아먹는다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '순환 경로. 반복되는 공포는 실제 공격보다 오래 남는다. 저 눈이 보이나 — 빛이 없어.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '그래서 묻고 싶었다. 우리는 포켓몬들을 구하러 온 건가, 아니면 기억을 덮으러 온 건가.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '......둘 다 못 할 수도 있다. 그래도 오늘은 성문을 지킨다.',
      },
      {
        speaker: '팬텀', speakerEn: 'Gengar', pokemonId: 94,
        text: '좋아. 내가 그림자를 묶을게. 대신 멋진 대사는 너희가 해.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '대사는 필요 없어. 칼날이 성벽보다 먼저 닿으면 된다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '배치해. 두려움이 성벽 안으로 들어오기 전에.',
      },
  ],

  endingDialogue: [
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: '마지막 팬텀이 사라졌어! 성벽 안쪽엔 아무것도 없어!',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '성벽은 버텼다. 하지만 저 팬텀... 마지막까지 웃고 있었어.',
      },
      {
        speaker: '팬텀', speakerEn: 'Gengar', pokemonId: 94,
        text: '웃음이 아니야. 입이 그렇게 생겼을 뿐이지. 그 안쪽은 비어 있었어.',
      },
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: '우리를 시험하는 것처럼?',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '시험이면 답안지를 찢어버리면 돼. 그런데 이건... 누가 답인지도 모르겠군.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '군주의 파편이 더 선명해지고 있어. 단순한 행진이 아니라 압박이다. 하지만 오늘은 마을을 지켰어.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '흥. 그런 말은 마음에 안 드는데, 이상하게 따라가고 싶어지네.',
      },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 3 — 바다 끝에서 울리는 남매의 맹세
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:             'ch3_altomare_coast',
  chapterNumber:  3,
  mapId:          'extreme_aggro_shortcut',
  totalWaves:     30,
  heroPool:       [249, 380, 382, 130, 54, 131],
  enemyTypes:     ['water', 'poison', 'ice'],
  bossWave:       25,
  bossName:       '어둠의 폭류 — 어둠 갸라도스',
  unlockCondition: '챕터 2를 클리어하면 해금됩니다.',
  theme: {
    primary:   '#38bdf8',
    secondary: '#0369a1',
    bg:        'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '바다 끝에서 울리는 남매의 맹세',
  subtitle: '알토마레 해안 · 돌아오지 않는 푸른 날개',
  location: '알토마레 해안 방파제',

  openingDialogue: [
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '열흘째야. 오빠가 돌아오지 않은 지.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '라티오스는 마지막으로 어디서 사라졌지?',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '저 수평선. 바다가 하늘보다 검어지는 곳. 뭔가가 부른다고 했어.',
      },
      {
        speaker: '라프라스', speakerEn: 'Lapras', pokemonId: 131,
        text: '물길도 변했어. 어제까지 있던 조류가 오늘은 봉인석 쪽으로 거꾸로 흘러.',
      },
      {
        speaker: '고라파덕', speakerEn: 'Psyduck', pokemonId: 54,
        text: '머리 아파... 파도 소리가 말처럼 들려. “열어.” 계속 그렇게 말해.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '듣지 마. 그건 바다가 아니야.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '해안 경로와 중앙 지름길. 두 곳 모두 비우면 안 돼.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '알아. 그런데 싸우는 동안 오빠의 신호를 놓치면?',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '지키는 동안에도 기다릴 수 있다. 기다림이 약한 선택은 아니야.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '...알아. 그래도 오늘은 내가 성역의 날개가 될게. 오빠가 돌아올 자리를 남겨둘 거야.',
      },
      {
        speaker: '라프라스', speakerEn: 'Lapras', pokemonId: 131,
        text: '파도가 올라온다. 첫 물결은 독을 품었어.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '전원, 방파제 뒤로. 바다가 기억을 삼키기 전에 막는다.',
      },
  ],

  endingDialogue: [
      {
        speaker: '라프라스', speakerEn: 'Lapras', pokemonId: 131,
        text: '검은 조류가 물러갔어. 방파제가 살아있어!',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '마지막 갸라도스가 쓰러질 때... 바다 밑에서 누가 내 이름을 불렀어.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '라티오스였나?',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '모르겠어. 오빠의 목소리 같았는데, 너무 멀었어. 너무 차가웠어.',
      },
      {
        speaker: '고라파덕', speakerEn: 'Psyduck', pokemonId: 54,
        text: '머리는 덜 아파. 대신 마음이 아파.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '알아. 그래도 오늘은 우리가 해안을 지켰어. 오빠가 돌아올 자리를 남겼어.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '네가 지킨 자리가 돌아올 길이 된다. 동굴로 간다.',
      },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 4 — 암석 수호자의 오래된 죄
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:             'ch4_dark_cave',
  chapterNumber:  4,
  mapId:          'medium_multi_s',
  totalWaves:     30,
  heroPool:       [377, 219, 237, 169, 461, 232],
  enemyTypes:     ['rock', 'ground', 'poison', 'dark'],
  bossWave:       25,
  bossName:       '동굴의 파견대장 — 어둠의 레지락 복제',
  unlockCondition: '챕터 3을 클리어하면 해금됩니다.',
  theme: {
    primary:   '#a78bfa',
    secondary: '#6d28d9',
    bg:        'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '암석 수호자의 오래된 죄',
  subtitle: '어둠 동굴 · 선택한 침묵과 강요된 봉인',
  location: '어둠 동굴 제5층 봉인 회랑',

  openingDialogue: [
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......발소리가 많다. 산 자의 것과, 산 자였던 것의 것.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '레지락. 이 동굴의 수호자라고 들었다.',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......수호자라기보다 증인이다. 나는 군주가 봉인되던 날, 돌 하나가 되어 여기에 서 있었다.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '아르세우스가 당신을 세운 거예요?',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......아니다. 선택이었다. 누구도 내게 남으라 하지 않았다.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '수천 년을 동굴 안에서? 그걸 선택이라고 부를 수 있나.',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......강요와 선택의 차이는 작다. 그러나 그 작음이 나를 버티게 했다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '군주는 정말 악이었나?',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......아니. 이질적이었다. 세계는 이해하지 못하는 것을 위험이라 부른다.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '그럼 우리가 지금 지키는 봉인은... 누구를 위한 거죠?',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......양쪽 모두를 위한 것이었다고 믿고 싶다. 믿지 않으면, 나는 여기서 너무 오래 서 있었다.',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '감시자들이 S자 회랑으로 들어온다. 돌은 길을 기억한다. 너희는 그 길을 끊어라.',
      },
  ],

  endingDialogue: [
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '회랑 봉쇄 성공. 동굴 봉인석은 온전해.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '저건 레지락의 복제였나. 아니면 군주가 네 기억으로 만든 허수아비였나.',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......둘 다다. 군주는 꿈속에서 보는 것을 흉내 낸다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '그러면 우리도 이미 보고 있다는 뜻이군.',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......그래. 너희의 망설임도, 분노도, 미안함도. 그리고... 오늘의 의지도.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '그런 걸 보고도 군주는 왜 말하지 않죠?',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......오래 갇힌 존재는 말하는 법보다 꿈꾸는 법을 먼저 잊는다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '사막으로 간다. 군주가 꿈을 흉내 낸다면, 다음엔 악몽을 보낼 거야.',
      },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 5 — 보라색 눈동자의 사막
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:             'ch5_orre_desert',
  chapterNumber:  5,
  mapId:          'medium_merge',
  totalWaves:     30,
  heroPool:       [645, 637, 214, 359, 248, 445],
  enemyTypes:     ['rock', 'ground', 'fire', 'dark'],
  bossWave:       27,
  bossName:       '섀도우 마기라스 — 군주의 첫 번째 전령',
  unlockCondition: '챕터 4를 클리어하면 해금됩니다.',
  theme: {
    primary:   '#fb923c',
    secondary: '#c2410c',
    bg:        'linear-gradient(135deg, #431407 0%, #7c2d12 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '보라색 눈동자의 사막',
  subtitle: '오레 협곡 · 우리가 적을 닮아가는 순간',
  location: '오레 사막 쌍풍 협곡',

  openingDialogue: [
      {
        speaker: '앱솔', speakerEn: 'Absol', pokemonId: 359,
        text: '재앙의 냄새가 난다. 모래가 타오르기 전에 피처럼 식어 있어.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '좋은 예언이군. 이미 최악이라는 뜻이니까.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '저기... 눈이 보라색이야. 감시자보다 더 선명해. 몸에서 열기가 나.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '섀도우화. 군주가 직접 의식을 찢어 넣은 흔적이다.',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......저들은 비어 있지 않다. 남아 있기 때문에 괴로워한다.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '남아 있다면 구할 수 있나?',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '지금은 막는 법밖에 모른다.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '그 대답이 점점 싫어진다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '나도 그래.',
      },
      {
        speaker: '앱솔', speakerEn: 'Absol', pokemonId: 359,
        text: '두 바람이 합류한다. 위쪽은 빠르고, 아래쪽은 무겁다. 놓치면 성역 앞에서 하나가 된다.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '그 전에 끊자. 저 아이들이 완전히 사라지기 전에.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: 'Aegis, 전개. 오늘 우리는 방패이고, 동시에 칼날이다.',
      },
  ],

  endingDialogue: [
      {
        speaker: '앱솔', speakerEn: 'Absol', pokemonId: 359,
        text: '협곡을 봉쇄했어. 두 물결 모두 끊었다.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '섀도우 마기라스가 마지막에 손을 멈췄다. 아주 잠깐.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '들었어. “미안해.” 그렇게 말했어. 목소리는 없었는데 들렸어.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '......',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '우리가 저들과 달라지는 선은 어디지? 더 효율적으로 막기 시작하는 순간?',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......선을 묻는 자는 아직 선 밖에 있다.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '우리가 잊지 않으면, 아직 닮아간 건 아니야. 알아.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '잊지 마. 사바나로 간다.',
      },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 6 — 세 갈래 지평선과 검의 대답
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:             'ch6_safari_savanna',
  chapterNumber:  6,
  mapId:          'hard_straight_wide',
  totalWaves:     30,
  heroPool:       [475, 103, 452, 197, 149, 373],
  enemyTypes:     ['normal', 'grass', 'fighting', 'dark'],
  bossWave:       28,
  bossName:       '섀도우 삼삼바우',
  unlockCondition: '챕터 5를 클리어하면 해금됩니다.',
  theme: {
    primary:   '#a3e635',
    secondary: '#4d7c0f',
    bg:        'linear-gradient(135deg, #1a2e05 0%, #365314 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '세 갈래 지평선과 검의 대답',
  subtitle: '사파리 사바나 · 버티는 자들의 작전회의',
  location: '사파리 사바나 삼중 전선',

  openingDialogue: [
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '지평선이 셋으로 갈라졌다. 아니, 정확히는 셋 모두 지평선이 됐다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '숫자는?',
      },
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '세는 순간 늦어. 오늘은 수량전이 아니라 분산전이다.',
      },
      {
        speaker: '망나뇽', speakerEn: 'Dragonite', pokemonId: 149,
        text: '하늘에서 봐도 끝이 안 보여. 하지만 겁먹은 대열은 아니야. 너무 조용해.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '조용한 군대가 제일 싫다. 이쪽 비명까지 대신 들리거든.',
      },
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '루카리오. 하나 물어보자. 봉인을 전부 지키면 군주는 다시 잠든다. 그다음은?',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '다음 약화가 올 때까지 버틴다.',
      },
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '결국 미루는 거군.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '그래. 살아남는 일의 대부분은 미루는 일이다.',
      },
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '좋아. 그럼 나는 그 미룸에 찬성한다.',
      },
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '오늘 밤에 살아있는 사람이 내일을 걱정할 수 있다. 이 문장은 전술보다 강해.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '세 줄을 동시에 막는다. 중앙은 내가. 좌우는 엘레이드와 스라크. 하늘은 망나뇽.',
      },
      {
        speaker: '망나뇽', speakerEn: 'Dragonite', pokemonId: 149,
        text: '알았어. 지평선이 움직이면, 내가 먼저 움직일게.',
      },
  ],

  endingDialogue: [
      {
        speaker: '망나뇽', speakerEn: 'Dragonite', pokemonId: 149,
        text: '끝났어! 세 갈래 전선 전부 막았어. 지평선이 다시 선이 됐다!',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '세 갈래를 동시에 막는 건 미친 짓이었어. 그러니까 성공했겠지.',
      },
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '오늘 밤에 살아있는 사람이 내일을 걱정할 수 있다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '12년 동안 나는 “언젠가”를 지키고 있다고 생각했다. 사실은 “내일”이었군.',
      },
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '거창하게 부르면 지친다. 내일 정도면 들고 갈 수 있어.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '북쪽에서 눈바람이 와. 차갑지만... 누군가 기다리는 느낌이야.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '눈설왕 산맥으로 간다. 오래된 증인이 우리를 부르고 있어.',
      },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 7 — 눈의 왕좌와 얼어붙은 증언
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:             'ch7_snowpeak_twins',
  chapterNumber:  7,
  mapId:          'hard_dual_path',
  totalWaves:     30,
  heroPool:       [378, 144, 460, 478, 473, 471],
  enemyTypes:     ['ice', 'steel', 'dark', 'ghost'],
  bossWave:       30,
  bossName:       '섀도우 눈설왕 ×2 — 쌍둥이 감시자',
  unlockCondition: '챕터 6을 클리어하면 해금됩니다.',
  theme: {
    primary:   '#7dd3fc',
    secondary: '#0284c7',
    bg:        'linear-gradient(135deg, #0c2948 0%, #164e63 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '눈의 왕좌와 얼어붙은 증언',
  subtitle: '눈설왕 산맥 · 기억한다는 것의 무게',
  location: '눈설왕 산맥 쌍둥이 봉우리',

  openingDialogue: [
      {
        speaker: '프리져', speakerEn: 'Articuno', pokemonId: 144,
        text: '발을 낮춰. 이 산에서는 오만한 소리부터 얼어붙어.',
      },
      {
        speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
        text: '......왔구나. 봉인이 흔들릴 때마다 눈은 먼저 기억한다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '레지아이스. 군주가 봉인되던 날을 봤다고 들었다.',
      },
      {
        speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
        text: '......봤다. 그리고 아무에게도 충분히 말하지 못했다.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '왜요?',
      },
      {
        speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
        text: '......말하면 편해질까 봐. 증인은 편해지면 안 된다고 생각했다.',
      },
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '그건 책임이 아니라 형벌에 가깝군.',
      },
      {
        speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
        text: '......군주는 저항하지 않았다. 아르세우스의 빛이 몸을 가를 때도, 그저 눈을 감았다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '분노가 아니었다고?',
      },
      {
        speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
        text: '......슬픔에 가까웠다. 너무 오래 떠돌다 마침내 멈춘 자의 얼굴.',
      },
      {
        speaker: '프리져', speakerEn: 'Articuno', pokemonId: 144,
        text: '감상은 여기까지. 경로는 둘이다. 왼쪽 봉우리와 오른쪽 봉우리는 서로 돕지 못한다.',
      },
      {
        speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
        text: '......기억도 둘로 갈라진다. 어느 쪽도 버리지 마라.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '전선을 나눈다. 오늘은 누구도 혼자 오래 견디게 두지 않는다.',
      },
  ],

  endingDialogue: [
      {
        speaker: '프리져', speakerEn: 'Articuno', pokemonId: 144,
        text: '쌍둥이 봉우리 둘 다 지켰어. 두 전선 모두 버텼다.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '둘이 동시에 무너질 때, 서로를 찾는 것 같았어.',
      },
      {
        speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
        text: '......기억은 차갑다. 하지만 차가워야 썩지 않는다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '군주가 쉬고 싶어서 봉인을 받아들였다면, 왜 지금 깨어나려 하지?',
      },
      {
        speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
        text: '......쉬는 동안에도 꿈은 자란다. 외로움은 얼음 밑에서도 뿌리를 내린다.',
      },
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '이해한다고 해서 열어줄 수는 없다.',
      },
      {
        speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
        text: '......그래. 이해는 열쇠가 아니다. 때로는 더 무거운 자물쇠다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '차원의 제단으로 간다. 이제 군주가 직접 말할 차례야.',
      },
  ],
},

// ┌─────────────────────────────────────────────────────────────────────────────
// │ CHAPTER 8 — 차원 제단의 마지막 대본
// └─────────────────────────────────────────────────────────────────────────────
{
  // ── 시스템 필드 (수정 금지) ───────────────────────────────────────────────
  id:             'ch8_masters_sanctum',
  chapterNumber:  8,
  mapId:          'extreme_central',
  totalWaves:     30,
  heroPool:       [487, 484, 483, 150, 151, 448, 381, 380],
  enemyTypes:     ['ghost', 'dragon', 'dark', 'psychic'],
  bossWave:       30,
  bossName:       '군주의 화신 — 기라티나 (Origin Forme)',
  unlockCondition: '챕터 7을 클리어하면 해금됩니다.',
  theme: {
    primary:   '#f59e0b',
    secondary: '#92400e',
    bg:        'linear-gradient(135deg, #1c0a00 0%, #431407 50%, #0f0720 100%)',
  },

  // ── 스토리 콘텐츠 (자유롭게 수정 가능) ──────────────────────────────────
  title:    '차원 제단의 마지막 대본',
  subtitle: '암베라 심연 · 이해와 봉인 사이에서',
  location: '차원의 제단 중앙 성소',

  openingDialogue: [
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: '여기가... 제단이야? 공기가 달라. 숨이 무거워.',
      },
      {
        speaker: '이브이', speakerEn: 'Eevee', pokemonId: 133,
        text: '팔레트 평원에서 처음 싸우던 날이 기억나. 그때랑 같은 무서움이야. 근데 도망치고 싶지 않아.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '그 마음이 방패야. 여기다. 네 방향의 길이 모두 제단으로 모인다.',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......돌이 떨고 있다. 1만 년 만에 처음으로 두려움을 배웠다.',
      },
      {
        speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
        text: '......얼음도 녹지 않고 울 수 있다는 걸 오늘 알았다.',
      },
      {
        speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
        text: '......너희는 여전히 시끄럽구나. 살아있는 것들은 늘 이름을 부르며 온다.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '기다리고 있었나, 군주.',
      },
      {
        speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
        text: '기다림인지, 꿈인지, 벌인지. 너무 오래 지나서 구분이 안 돼.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '라티오스는 어디 있어? 바다에서 당신 목소리가 들렸어.',
      },
      {
        speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
        text: '푸른 날개 하나가 내 꿈의 가장자리에서 싸우고 있다. 잃지 않으려 애쓰더구나.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '오빠는 살아 있어.',
      },
      {
        speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
        text: '살아있다는 말은 아름답다. 그래서 잔인하지.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '군주. 당신은 이 세계를 부수고 싶은 건가?',
      },
      {
        speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
        text: '모르겠어. 나는 나를 꺼내고 싶은 건지, 나를 끝내고 싶은 건지도 기억하지 못한다.',
      },
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '그 모름 때문에 다른 이들의 내일을 가져갈 수는 없다.',
      },
      {
        speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
        text: '그래서 너희가 왔구나. 방패를 들고, 이해라는 칼을 숨긴 채.',
      },
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: '숨기지 않아. 이해하고 싶어. 그래도 봉인석을 지킬 거야.',
      },
      {
        speaker: '프리져', speakerEn: 'Articuno', pokemonId: 144,
        text: '네 방향에서 온다. 말은 충분해.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: 'Aegis 전원. 마지막 배치. 봉인석이 아니라, 내일을 지킨다.',
      },
      {
        speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
        text: '......좋아. 막아봐. 너희의 이름이 내 꿈보다 오래가는지 보자.',
      },
  ],

  endingDialogue: [
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '봉인이 복원되고 있어. 빛이 다시 제단 아래로 내려간다.',
      },
      {
        speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
        text: '......따뜻하구나. 봉인은 차가운 것인 줄 알았는데.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '군주. 바다의 가장자리에서 싸우는 푸른 날개... 지금 어디야?',
      },
      {
        speaker: '???', speakerEn: 'Unknown', pokemonId: 381,
        text: '여기. 늦어서 미안.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '오빠! 정말... 정말 너야?',
      },
      {
        speaker: '라티오스', speakerEn: 'Latios', pokemonId: 381,
        text: '응. 꿈의 바깥쪽을 막고 있었어. 네가 안쪽을 지켜줄 거라고 믿었으니까.',
      },
      {
        speaker: '스라크', speakerEn: 'Scyther', pokemonId: 123,
        text: '이걸 승리라고 불러도 되나? 군주는 악이 아니었고, 우리는 다시 가둔 거잖아.',
      },
      {
        speaker: '레지락', speakerEn: 'Regirock', pokemonId: 377,
        text: '......가둔 것이 아니라, 오늘의 균열을 닫았다. 그 차이는 작지만 중요하다.',
      },
      {
        speaker: '레지아이스', speakerEn: 'Regice', pokemonId: 378,
        text: '......그리고 우리는 봤다. 이해하려는 자들이 봉인 앞에 설 수도 있다는 걸.',
      },
      {
        speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
        text: '루카리오. 다음에 내가 깨어나면, 너희가 또 있을까?',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '나는 없을 거야. 스라크도, 라티아스도, 오늘의 우리는 언젠가 사라진다.',
      },
      {
        speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
        text: '그럼 누가 나를 기억하지?',
      },
      {
        speaker: '엘레이드', speakerEn: 'Gallade', pokemonId: 475,
        text: '오늘 밤에 살아있는 사람이 내일을 걱정할 수 있다.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: '그 내일의 누군가가 기억할 거야. 군주가 적이기 전에, 이름을 잃은 존재였다는 걸.',
      },
      {
        speaker: '군주', speakerEn: 'The Master', pokemonId: 487,
        text: '......잘 싸웠어. 방패의 아이들.',
      },
      {
        speaker: '라티오스', speakerEn: 'Latios', pokemonId: 381,
        text: '돌아가자, 라티아스. 네가 지킨 길로.',
      },
      {
        speaker: '라티아스', speakerEn: 'Latias', pokemonId: 380,
        text: '응. 알아. 오늘은 울어도 되는 날이야.',
      },
      {
        speaker: '피카츄', speakerEn: 'Pikachu', pokemonId: 25,
        text: '루카리오. 우리, 방패가 됐지?',
      },
      {
        speaker: '이브이', speakerEn: 'Eevee', pokemonId: 133,
        text: '그래. 내일도. 그 다음 날도.',
      },
      {
        speaker: '루카리오', speakerEn: 'Lucario', pokemonId: 448,
        text: 'Aegis는 계속한다. 승리해서가 아니라, 내일이 아직 우리를 기다리니까.',
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