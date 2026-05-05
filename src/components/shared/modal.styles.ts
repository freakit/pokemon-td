// src/components/shared/modal.styles.ts
// ──────────────────────────────────────────────────────────────────────────────
// 🎮 Pokemon Aegis — 공통 모달 디자인 시스템
//
// 이 파일을 단일 소스로 삼아 모든 모달/오버레이 컴포넌트에서 import 한다.
//
// Exports:
//  ① 애니메이션  — modalFadeIn, modalSlideUp
//  ② 디자인 토큰 — MODAL_ACCENT (컬러 팔레트), modalBoxCss (CSS 믹스인)
//  ③ 공통 쉘    — ModalOverlay, ModalBox
//  ④ 헤더 세트  — ModalHeader, ModalTitle, ModalCloseBtn
//  ⑤ 레이아웃   — ModalBody, ModalScrollBody, ModalFooter, ModalDivider
// ──────────────────────────────────────────────────────────────────────────────

import styled, { keyframes, css } from 'styled-components';
import { lMedia, media } from '../../utils/responsive.utils';

// ═══════════════════════════════════════════════════════════════════════════════
// ① 애니메이션
// ═══════════════════════════════════════════════════════════════════════════════

export const modalFadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

export const modalSlideUp = keyframes`
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ② 디자인 토큰
// ═══════════════════════════════════════════════════════════════════════════════

const BG      = 'linear-gradient(160deg, #0d1117 0%, #080c14 100%)';
const BORDER  = 'rgba(255,255,255,0.10)';
const SHADOW  = '0 32px 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)';
const DIVIDER = 'rgba(255,255,255,0.07)';

/** 모달별 고유 상단 액센트 컬러 팔레트 */
export const MODAL_ACCENT = {
  gold:    '#FFD700',   // 업적·전당·진화·웨이브클리어
  cyan:    '#4fc3f7',   // 랭킹·설정·튜토리얼(타워)
  green:   '#2ecc71',   // 웨이브보상
  purple:  '#9b59b6',   // 스킬픽커·튜토리얼(멀티)
  blue:    '#4cafff',   // 포켓몬관리·멀티플레이어
  red:     '#e74c3c',   // 게임오버
  neutral: 'rgba(255,255,255,0.25)',
} as const;

/**
 * CSS 믹스인 — 포지셔닝이 필요한 패널(SkillPicker 등)에서
 * ModalBox 시각 스타일을 인라인으로 적용할 때 사용
 */
export const modalBoxCss = (accent: string = MODAL_ACCENT.neutral) => css`
  background: ${BG};
  border: 1px solid ${BORDER};
  border-top: 3px solid ${accent};
  box-shadow: ${SHADOW};
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ③ 공통 쉘
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ModalOverlay
 * - position:fixed 전체화면 딤 오버레이
 * - $zIndex : 기본 1000, 필요 시 덮어쓰기
 *
 * 반응형:
 *   데스크탑(>768px 세로)  : 가운데 정렬, padding 16px
 *   태블릿/모바일 세로(≤768px): 가운데 유지, padding 12px (공간 충분)
 *   모바일 세로(≤480px)    : 상단 정렬 + 스크롤
 *   태블릿 가로(≤1024px L) : 가운데 유지, padding 10px
 *   폰 가로(≤768px L)      : 상단 정렬 + 스크롤
 *   소형 폰 가로(높이≤520px L) : 상단 정렬 + 스크롤 + padding 최소화
 */
export const ModalOverlay = styled.div<{ $zIndex?: number }>`
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: ${p => p.$zIndex ?? 1000};
  padding: 16px;
  animation: ${modalFadeIn} 0.22s ease;

  /* 태블릿 세로 — 가운데 유지, 패딩 줄임 */
  ${media.tablet}  { padding: 12px; }
  /* 모바일 세로 — 상단 정렬 + 스크롤 */
  ${media.mobile}  { align-items: flex-start; padding: 10px; overflow-y: auto; }
  /* 태블릿 가로 — 가운데 유지 */
  ${lMedia.tablet} { align-items: center; padding: 10px; }
  /* 폰 가로 — 상단 정렬 + 스크롤 */
  ${lMedia.phone}  { align-items: flex-start; padding: 8px; overflow-y: auto; }
  /* 소형 폰 가로 */
  ${lMedia.phoneSm}{ align-items: flex-start; padding: 6px; overflow-y: auto; }
`;

// ─── ModalBox 사이즈 맵 ────────────────────────────────────────────────────────
type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const MAX_W: Record<ModalSize, string> = {
  sm:  '520px',   // Settings, Wave50Clear, EvolutionConfirm, TutorialModal
  md:  '720px',   // Rankings, MultiplayerView
  lg:  '960px',   // Achievements, HallOfFame, PokemonManager, MultiplayerGameOver
  xl:  '1040px',  // WaveEndPicker, PokemonPicker
};

/**
 * ModalBox
 * - 모달 컨테이너 껍데기 (배경, 테두리, 그림자, 반응형)
 * - $size    : 'sm' | 'md' | 'lg' | 'xl'  (기본 'md')
 * - $accent  : 상단 3px 색상 바 (기본 neutral)
 * - $scroll  : true → overflow-y: auto (단순 모달), false → flex 레이아웃
 * - $animate : 'fadeIn' | 'slideUp' (기본 'fadeIn')
 *
 * 반응형:
 *   데스크탑              : border-radius 20px, width 90%
 *   태블릿 세로(≤768px)  : border-radius 16px, width 93%
 *   모바일 세로(≤480px)  : border-radius 14px, width 97%, max-height 96vh
 *   태블릿 가로(≤1024L)  : border-radius 16px, max-height 90vh
 *   폰 가로(≤768L)       : border-radius 12px, width 96%, max-height 94vh
 *   소형 폰 가로(≤520hL) : border-radius 12px, width 97%, max-height 97vh
 */
export const ModalBox = styled.div<{
  $size?:    ModalSize;
  $accent?:  string;
  $scroll?:  boolean;
  $animate?: 'fadeIn' | 'slideUp';
}>`
  background: ${BG};
  border: 1px solid ${BORDER};
  border-top: 3px solid ${p => p.$accent ?? MODAL_ACCENT.neutral};
  border-radius: 20px;
  width: 90%;
  max-width: ${p => MAX_W[p.$size ?? 'md']};
  max-height: 90vh;
  box-shadow: ${SHADOW};
  overflow: ${p => p.$scroll ? 'auto' : 'hidden'};
  display: ${p => p.$scroll ? 'block' : 'flex'};
  flex-direction: column;
  animation: ${p => p.$animate === 'slideUp'
    ? css`${modalSlideUp} 0.28s ease`
    : css`${modalFadeIn} 0.22s ease`};

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }

  /* 태블릿 세로 */
  ${media.tablet}  { border-radius: 16px; width: 93%; }
  /* 모바일 세로 */
  ${media.mobile}  { border-radius: 14px; width: 97%; max-height: 96vh; }
  /* 태블릿 가로 */
  ${lMedia.tablet} { border-radius: 16px; max-height: 90vh; }
  /* 폰 가로 */
  ${lMedia.phone}  { border-radius: 12px; width: 96%; max-height: 94vh; }
  /* 소형 폰 가로 */
  ${lMedia.phoneSm}{ border-radius: 12px; width: 97%; max-height: 97vh; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ④ 헤더 세트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ModalHeader
 * - 모달 최상단 헤더 행 (제목 + 닫기 버튼 레이아웃)
 * - 하단에 구분선 포함, flex-shrink: 0 (스크롤 영역 밖에 고정)
 */
export const ModalHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px 14px;
  border-bottom: 1px solid ${DIVIDER};
  flex-shrink: 0;
  gap: 12px;

  ${media.tablet}  { padding: 16px 20px 12px; }
  ${media.mobile}  { padding: 13px 14px 10px; }
  ${lMedia.tablet} { padding: 14px 20px 10px; }
  ${lMedia.phone}  { padding: 12px 14px 9px;  }
  ${lMedia.phoneSm}{ padding: 10px 12px 8px;  }
`;

/**
 * ModalTitle
 * - 모달 메인 타이틀 (h2)
 * - 아이콘 + 텍스트를 flex gap 8px 로 나란히 배치
 */
export const ModalTitle = styled.h2`
  font-size: 20px; font-weight: 800; color: #fff; margin: 0;
  letter-spacing: -0.3px;
  display: flex; align-items: center; gap: 8px;
  flex: 1; min-width: 0;

  ${media.tablet}  { font-size: 18px; }
  ${media.mobile}  { font-size: 16px; }
  ${lMedia.tablet} { font-size: 17px; }
  ${lMedia.phone}  { font-size: 16px; }
  ${lMedia.phoneSm}{ font-size: 15px; }
`;

/**
 * ModalCloseBtn
 * - 32×32 정사각형 닫기 버튼 (hover: 빨간 틴트)
 */
export const ModalCloseBtn = styled.button`
  width: 32px; height: 32px; flex-shrink: 0;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 8px;
  color: rgba(255,255,255,0.45);
  cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s, color 0.2s, border-color 0.2s;

  @media (hover: hover) {
    &:hover {
      background: rgba(220, 60, 60, 0.22);
      border-color: rgba(220, 60, 60, 0.40);
      color: #fff;
    }
  }

  ${media.mobile}  { width: 30px; height: 30px; font-size: 13px; }
  ${lMedia.phoneSm}{ width: 28px; height: 28px; font-size: 12px; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// ⑤ 레이아웃 보조
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ModalBody
 * - flex: 1 스크롤 영역 (패딩 없음 — 컨텐츠가 직접 패딩 지정)
 */
export const ModalBody = styled.div`
  flex: 1; overflow-y: auto; min-height: 0;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }
`;

/**
 * ModalScrollBody
 * - 패딩이 포함된 스크롤 본문 영역
 * - $pad : 커스텀 패딩 (기본 '18px 24px')
 */
export const ModalScrollBody = styled.div<{ $pad?: string }>`
  flex: 1; overflow-y: auto; min-height: 0;
  padding: ${p => p.$pad ?? '18px 24px'};

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }

  ${media.tablet}  { padding: ${p => p.$pad ?? '14px 18px'}; }
  ${media.mobile}  { padding: ${p => p.$pad ?? '12px 14px'}; }
  ${lMedia.tablet} { padding: ${p => p.$pad ?? '12px 18px'}; }
  ${lMedia.phone}  { padding: ${p => p.$pad ?? '10px 14px'}; }
  ${lMedia.phoneSm}{ padding: ${p => p.$pad ?? '8px 12px'};  }
`;

/**
 * ModalFooter
 * - 하단 고정 영역 (상단 구분선 + 버튼 행)
 */
export const ModalFooter = styled.div`
  border-top: 1px solid ${DIVIDER};
  padding: 14px 24px 18px;
  flex-shrink: 0;
  display: flex; gap: 10px; align-items: center; justify-content: flex-end;

  ${media.mobile}  { padding: 12px 14px 14px; gap: 8px; }
  ${lMedia.phone}  { padding: 10px 14px 12px; gap: 8px; }
  ${lMedia.phoneSm}{ padding: 8px 12px 10px;  gap: 6px; }
`;

/**
 * ModalDivider
 * - 내부 섹션 구분용 1px 가로선
 */
export const ModalDivider = styled.div`
  height: 1px;
  background: ${DIVIDER};
  flex-shrink: 0;
  margin: 0;
`;

/**
 * ModalSectionPad
 * - 섹션 내 표준 패딩 래퍼 (Header 아래 컨트롤 영역 등)
 */
export const ModalSectionPad = styled.div`
  padding: 14px 24px;
  flex-shrink: 0;

  ${media.mobile}  { padding: 10px 14px; }
  ${lMedia.tablet} { padding: 12px 20px; }
  ${lMedia.phone}  { padding: 10px 14px; }
  ${lMedia.phoneSm}{ padding: 8px 12px;  }
`;