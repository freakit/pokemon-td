// src/components/Modals/TutorialModal.tsx
//
// mode: 'tower' = 싱글플레이 버튼 클릭 시
//       'multi' = 멀티플레이 버튼 클릭 시 (멀티 게임 방식 + TFT 배틀 통합 안내)
//
// Props:
//   onClose   : X버튼 / 오버레이 클릭 / 도움말로 열었을 때 그냥 닫기
//   onProceed : 마지막 "시작하기" 버튼 — 실제 화면 전환이 필요할 때 사용
//              (미전달 시 onClose 호출)

import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';

// ─── localStorage 헬퍼 ───────────────────────────────────────────────────────
const KEYS = {
  tower: 'pokemon-td-tutorial-tower-v1',
  multi: 'pokemon-td-tutorial-multi-v1',
} as const;

export const hasTowerTutorialSeen  = () => localStorage.getItem(KEYS.tower) === 'true';
export const hasMultiTutorialSeen  = () => localStorage.getItem(KEYS.multi) === 'true';
export const markTowerTutorialSeen = () => localStorage.setItem(KEYS.tower, 'true');
export const markMultiTutorialSeen = () => localStorage.setItem(KEYS.multi, 'true');

// ─── 슬라이드 데이터 ─────────────────────────────────────────────────────────
type Slide = {
  icon: string;
  title: string;
  desc: string;
  details: { icon: string; text: string }[];
};

const TOWER_SLIDES: Slide[] = [
  {
    icon: '🏰',
    title: '포켓몬 타워 디펜스',
    desc: '포켓몬을 배치해 밀려오는 적을 막으세요!\n라이프가 0이 되기 전에 웨이브 50을 버텨야 합니다.',
    details: [
      { icon: '❤️', text: '라이프: 적이 끝까지 돌파하면 1씩 감소' },
      { icon: '💰', text: '골드: 적 처치·웨이브 클리어 시 획득' },
      { icon: '🎯', text: '목표: 웨이브 50을 모두 클리어!' },
    ],
  },
  {
    icon: '🛒',
    title: '포켓몬 구매 & 배치',
    desc: '하단 우측 버튼으로 포켓몬을 구매하고,\n초록색 격자칸을 클릭해 배치하세요.',
    details: [
      { icon: '🔵', text: '진입 비용 20G + 등급 비용 차감' },
      { icon: '🚫', text: '경로(어두운 타일) 위에는 배치 불가' },
      { icon: '🔄', text: '웨이브 종료 후 자유롭게 재배치 가능' },
    ],
  },
  {
    icon: '⚡',
    title: '타입 상성 & 시너지',
    desc: '포켓몬 타입 상성으로 더 큰 피해를 주세요!\n같은 타입·세대를 모으면 시너지 보너스 발동!',
    details: [
      { icon: '🔥', text: '약점 타입 공격 시 최대 2배 피해' },
      { icon: '💎', text: '같은 타입 2/4/6마리 → 능력치 버프' },
      { icon: '🧬', text: '진화·메가진화로 더욱 강력하게 성장' },
    ],
  },
  {
    icon: '🎁',
    title: '웨이브 보상',
    desc: '웨이브 클리어 후 보상 아이템을 선택하세요.',
    details: [
      { icon: '🍬', text: '이상한 사탕: 포켓몬 1마리 레벨업' },
      { icon: '💊', text: '기력의 조각: 기절 포켓몬 50% HP로 부활' },
      { icon: '✨', text: '메가스톤/다이버섯: 메가진화·거다이맥스' },
    ],
  },
];

// 멀티플레이 + TFT 통합 슬라이드
const MULTI_SLIDES: Slide[] = [
  {
    icon: '👥',
    title: '멀티플레이 모드',
    desc: '최대 8인이 동시에 타워 디펜스를 진행하며\n서로 경쟁하는 PvP 배틀 모드입니다!',

    details: [
      { icon: '🏠', text: '방 만들기 또는 기존 방 참가' },
      { icon: '🤖', text: 'AI 봇으로 인원 자동 채움 가능' },
      { icon: '🚀', text: '모든 플레이어 준비 완료 시 게임 시작' },
    ],
  },
  {
    icon: '🔄',
    title: '페이즈 흐름',
    desc: '쇼핑 → 웨이브 → 배틀, 이 세 페이즈가 매 라운드 반복됩니다.',
    details: [
      { icon: '🛒', text: '쇼핑: 포켓몬 구매·배치·업그레이드' },
      { icon: '🌊', text: '웨이브: 모든 플레이어 동시에 타워 디펜스 진행' },
      { icon: '⚔️', text: '배틀: 무작위 상대와 내 팀 vs 상대 팀 자동 전투' },
    ],
  },
  {
    icon: '💥',
    title: '배틀 & 라이프',
    desc: '배틀에서 지면 상대 생존 포켓몬 수만큼 라이프가 깎입니다.\n라이프 0이 되면 탈락!',
    details: [
      { icon: '❤️', text: '시작 라이프 50 — 배틀 패배마다 감소' },
      { icon: '🏆', text: '마지막까지 라이프가 남은 1인이 우승' },
      { icon: '📈', text: '승패에 따라 레이팅이 변동됨' },
    ],
  },
  {
    icon: '🎮',
    title: 'TFT 배틀 아레나',
    desc: '배틀 페이즈엔 포켓몬들이 7×4 보드 위에서\n직접 이동하며 싸우는 실시간 전투입니다!',
    details: [
      { icon: '🟦', text: '상단 2행: 상대 팀 / 하단 2행: 내 팀' },
      { icon: '👆', text: '배틀 전 준비 시간에 포켓몬 위치 재배치 가능' },
      { icon: '⚡', text: '타입 상성·스탯 그대로 반영 — 시너지 맞출수록 유리!' },
    ],
  },
];

// ─── 모드별 디자인 ────────────────────────────────────────────────────────────
type TutorialMode = 'tower' | 'multi';

const MODES: Record<TutorialMode, {
  slides: Slide[];
  label: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  btnGrad: string;
  btnShadow: string;
}> = {
  tower: {
    slides: TOWER_SLIDES,
    label: '🏰 싱글 플레이',
    accent: '#4fc3f7',
    accentBg: 'rgba(79,195,247,0.1)',
    accentBorder: 'rgba(79,195,247,0.25)',
    btnGrad: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
    btnShadow: 'rgba(14,165,233,0.45)',
  },
  multi: {
    slides: MULTI_SLIDES,
    label: '👥 멀티 플레이',
    accent: '#34d399',
    accentBg: 'rgba(52,211,153,0.1)',
    accentBorder: 'rgba(52,211,153,0.25)',
    btnGrad: 'linear-gradient(135deg, #10b981, #059669)',
    btnShadow: 'rgba(16,185,129,0.45)',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface TutorialModalProps {
  mode: TutorialMode;
  onClose: () => void;
  onProceed?: () => void;
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────
export const TutorialModal: React.FC<TutorialModalProps> = ({ mode, onClose, onProceed }) => {
  const cfg = MODES[mode];
  const slides = cfg.slides;

  const [page, setPage]         = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const [exiting, setExiting]   = useState(false);
  const [dir, setDir]           = useState<'fwd' | 'bck'>('fwd');

  const isLast = page === slides.length - 1;
  const slide  = slides[page];

  const dismiss = (proceed: boolean) => {
    if (dontShow) {
      if (mode === 'tower') markTowerTutorialSeen();
      else markMultiTutorialSeen();
    }
    setExiting(true);
    setTimeout(() => {
      if (proceed && onProceed) onProceed();
      else onClose();
    }, 260);
  };

  const goNext = () => { if (isLast) { dismiss(true); return; } setDir('fwd'); setPage(p => p + 1); };
  const goPrev = () => { if (page === 0) return; setDir('bck'); setPage(p => p - 1); };
  const goPage = (i: number) => { setDir(i > page ? 'fwd' : 'bck'); setPage(i); };

  return (
    <Overlay $exiting={exiting} onClick={e => e.target === e.currentTarget && dismiss(false)}>
      <Modal $exiting={exiting}>
        <TopBar $accent={cfg.accent} />

        <Header>
          <ModeTag $bg={cfg.accentBg} $border={cfg.accentBorder} $color={cfg.accent}>
            {cfg.label}
          </ModeTag>
          <PageInfo $color={cfg.accent}>{page + 1} / {slides.length}</PageInfo>
          <CloseX onClick={() => dismiss(false)} aria-label="닫기">✕</CloseX>
        </Header>

        <SlideArea key={`${page}-${dir}`} $dir={dir}>
          <SlideIcon>{slide.icon}</SlideIcon>
          <SlideTitle>{slide.title}</SlideTitle>
          <SlideDesc>{slide.desc}</SlideDesc>
          <DetailList>
            {slide.details.map((item, i) => (
              <DetailRow key={i} $delay={i}>
                <DetailIcon>{item.icon}</DetailIcon>
                <DetailText>{item.text}</DetailText>
              </DetailRow>
            ))}
          </DetailList>
        </SlideArea>

        <Dots>
          {slides.map((_, i) => (
            <Dot key={i} $active={i === page} $accent={cfg.accent} onClick={() => goPage(i)} />
          ))}
        </Dots>

        <Footer>
          <DontShowRow>
            <Checkbox
              type="checkbox"
              id={`dontShow-${mode}`}
              checked={dontShow}
              onChange={e => setDontShow(e.target.checked)}
            />
            <label htmlFor={`dontShow-${mode}`}>다시 보지 않기</label>
          </DontShowRow>
          <NavButtons>
            {page > 0 && <PrevBtn onClick={goPrev}>← 이전</PrevBtn>}
            <NextBtn $grad={cfg.btnGrad} $shadow={cfg.btnShadow} $isLast={isLast} onClick={goNext}>
              {isLast ? '시작하기 🚀' : '다음 →'}
            </NextBtn>
          </NavButtons>
        </Footer>
      </Modal>
    </Overlay>
  );
};

// ─── 애니메이션 ───────────────────────────────────────────────────────────────
const fadeIn   = keyframes`from{opacity:0}to{opacity:1}`;
const fadeOut  = keyframes`from{opacity:1}to{opacity:0}`;
const modalIn  = keyframes`from{opacity:0;transform:translateY(28px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}`;
const modalOut = keyframes`from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(20px) scale(.97)}`;
const slideFwd = keyframes`from{opacity:0;transform:translateX(22px)}to{opacity:1;transform:translateX(0)}`;
const slideBck = keyframes`from{opacity:0;transform:translateX(-22px)}to{opacity:1;transform:translateX(0)}`;
const iconFloat = keyframes`0%,100%{transform:translateY(0) scale(1)}45%{transform:translateY(-9px) scale(1.07)}70%{transform:translateY(-3px) scale(1.02)}`;
const rowPop   = keyframes`from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}`;

// ─── Styled ───────────────────────────────────────────────────────────────────
const Overlay = styled.div<{ $exiting: boolean }>`
  position:fixed;inset:0;
  background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);
  display:flex;align-items:center;justify-content:center;
  z-index:9999;padding:16px;
  animation:${p => p.$exiting ? css`${fadeOut} .26s ease forwards` : css`${fadeIn} .22s ease forwards`};
`;

const Modal = styled.div<{ $exiting: boolean }>`
  background:linear-gradient(160deg,#111827 0%,#0c1220 100%);
  border:1px solid rgba(255,255,255,.08);
  border-radius:22px;width:100%;max-width:460px;
  box-shadow:0 40px 100px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.04);
  overflow:hidden;
  animation:${p => p.$exiting ? css`${modalOut} .26s ease forwards` : css`${modalIn} .32s cubic-bezier(.34,1.48,.64,1) forwards`};
`;

const TopBar = styled.div<{ $accent: string }>`
  height:3px;
  background:linear-gradient(90deg,transparent,${p => p.$accent},transparent);
  background-size:200% 100%;
  animation:sweep 2.4s linear infinite;
  @keyframes sweep{0%{background-position:200% 0}100%{background-position:-200% 0}}
`;

const Header = styled.div`
  display:flex;align-items:center;justify-content:space-between;gap:8px;
  padding:14px 18px 0;
`;

const ModeTag = styled.span<{ $bg:string;$border:string;$color:string }>`
  font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:${p => p.$color};background:${p => p.$bg};border:1px solid ${p => p.$border};
  padding:3px 10px;border-radius:20px;white-space:nowrap;
`;

const PageInfo = styled.span<{ $color: string }>`
  font-size:12px;font-weight:600;color:${p => p.$color};
  opacity:.7;margin-left:auto;
`;

const CloseX = styled.button`
  background:none;border:none;color:rgba(255,255,255,.3);font-size:15px;
  cursor:pointer;line-height:1;padding:4px 7px;border-radius:7px;
  transition:color .18s,background .18s;
  &:hover{color:rgba(255,255,255,.75);background:rgba(255,255,255,.08)}
`;

const SlideArea = styled.div<{ $dir:'fwd'|'bck' }>`
  padding:18px 26px 6px;
  display:flex;flex-direction:column;align-items:center;text-align:center;
  animation:${p => p.$dir === 'fwd' ? css`${slideFwd} .22s ease` : css`${slideBck} .22s ease`};
`;

const SlideIcon = styled.div`
  font-size:50px;line-height:1;margin-bottom:13px;
  animation:${iconFloat} 3s ease-in-out infinite;
`;

const SlideTitle = styled.h2`
  font-size:19px;font-weight:800;color:#f1f5f9;margin:0 0 9px;letter-spacing:-.025em;
`;

const SlideDesc = styled.p`
  font-size:13px;color:rgba(255,255,255,.55);line-height:1.7;margin:0 0 16px;white-space:pre-line;
`;

const DetailList = styled.div`width:100%;display:flex;flex-direction:column;gap:7px;`;

const DetailRow = styled.div<{ $delay:number }>`
  display:flex;align-items:flex-start;gap:10px;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
  border-radius:10px;padding:9px 13px;text-align:left;
  animation:${rowPop} .28s ease both;
  animation-delay:${p => p.$delay * .06}s;
`;

const DetailIcon = styled.span`font-size:16px;flex-shrink:0;line-height:1.5;`;
const DetailText = styled.span`font-size:12.5px;color:rgba(255,255,255,.72);line-height:1.55;`;

const Dots = styled.div`
  display:flex;justify-content:center;gap:6px;padding:14px 0 2px;
`;

const Dot = styled.button<{ $active:boolean;$accent:string }>`
  width:${p => p.$active ? '18px' : '6px'};height:6px;
  border-radius:3px;border:none;cursor:pointer;padding:0;
  background:${p => p.$active ? p.$accent : 'rgba(255,255,255,.16)'};
  transition:width .22s ease,background .22s ease;
`;

const Footer = styled.div`
  padding:12px 22px 20px;display:flex;flex-direction:column;gap:10px;
`;

const DontShowRow = styled.div`
  display:flex;align-items:center;gap:7px;
  label{font-size:11.5px;color:rgba(255,255,255,.35);cursor:pointer;user-select:none}
`;

const Checkbox = styled.input`
  width:14px;height:14px;accent-color:#4fc3f7;cursor:pointer;flex-shrink:0;
`;

const NavButtons = styled.div`display:flex;gap:8px;`;

const PrevBtn = styled.button`
  flex:0 0 auto;padding:10px 16px;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
  border-radius:11px;color:rgba(255,255,255,.55);
  font-size:13px;font-weight:600;cursor:pointer;transition:all .18s;
  &:hover{background:rgba(255,255,255,.11);color:#fff;transform:translateY(-1px)}
`;

const NextBtn = styled.button<{ $grad:string;$shadow:string;$isLast:boolean }>`
  flex:1;padding:11px 18px;
  background:${p => p.$isLast ? p.$grad : 'rgba(255,255,255,.08)'};
  border:1px solid ${p => p.$isLast ? 'transparent' : 'rgba(255,255,255,.1)'};
  border-radius:11px;
  color:${p => p.$isLast ? '#fff' : 'rgba(255,255,255,.75)'};
  font-size:13.5px;font-weight:700;cursor:pointer;
  box-shadow:${p => p.$isLast ? `0 4px 18px ${p.$shadow}` : 'none'};
  transition:all .18s;
  &:hover{
    transform:translateY(-1px);
    box-shadow:${p => p.$isLast ? `0 6px 22px ${p.$shadow}` : '0 3px 10px rgba(0,0,0,.25)'};
    filter:brightness(1.08);
  }
`;