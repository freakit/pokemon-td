// src/utils/responsive.utils.ts
export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

export const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= breakpoints.mobile;
};

export const isTablet = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth > breakpoints.mobile && window.innerWidth <= breakpoints.tablet;
};

export const isMobileOrTablet = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= breakpoints.tablet;
};

export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// ─── Portrait 전용 미디어 쿼리 (메인메뉴·로비 등 세로 화면 OK인 페이지용) ───
export const media = {
  mobile: `@media (max-width: ${breakpoints.mobile}px)`,
  tablet: `@media (max-width: ${breakpoints.tablet}px)`,
  desktop: `@media (min-width: ${breakpoints.desktop}px)`,
  wide: `@media (min-width: ${breakpoints.wide}px)`,
};

// ─── Landscape 전용 미디어 쿼리 (게임 화면은 항상 가로 모드) ────────────────
// 이 게임은 가로(landscape) 전용이므로 모든 인게임 컴포넌트는
// lMedia를 사용해야 한다. media.tablet / media.mobile은 가로 모드에서
// 작동하지 않거나 불일치가 발생한다.
//
//  lMedia.tablet  : iPad/태블릿 가로 (≤1024px landscape)
//  lMedia.phone   : 폰 가로 (≤768px landscape)
//  lMedia.phoneSm : 작은 폰 가로 (세로높이 ≤520px — iPhone SE급 이상 포함)
export const lMedia = {
  /** 태블릿 가로 모드 이하 (≤ 1024px landscape) */
  tablet:  `@media (max-width: 1024px) and (orientation: landscape)`,
  /** 폰 가로 모드 이하 (≤ 768px landscape) */
  phone:   `@media (max-width: 768px) and (orientation: landscape)`,
  /** 폰 가로 모드 — 높이 기준 (세로높이 ≤ 520px, 대부분의 스마트폰 가로) */
  phoneSm: `@media (orientation: landscape) and (max-height: 520px)`,
};

// 반응형 값 계산
export const getResponsiveValue = <T,>(mobile: T, tablet: T, desktop: T): T => {
  if (typeof window === 'undefined') return desktop;
  
  if (window.innerWidth <= breakpoints.mobile) return mobile;
  if (window.innerWidth <= breakpoints.tablet) return tablet;
  return desktop;
};

// 패딩 값 계산 (모바일에서 축소)
export const getPadding = (base: number): number => {
  if (isMobile()) return base * 0.4; // 모바일: 40%
  if (isTablet()) return base * 0.6; // 태블릿: 60%
  return base; // 데스크탑: 100%
};

// 폰트 크기 계산
export const getFontSize = (base: number): number => {
  if (isMobile()) return base * 0.75; // 모바일: 75%
  if (isTablet()) return base * 0.85; // 태블릿: 85%
  return base; // 데스크탑: 100%
};