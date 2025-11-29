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

// 미디어 쿼리 헬퍼
export const media = {
  mobile: `@media (max-width: ${breakpoints.mobile}px)`,
  tablet: `@media (max-width: ${breakpoints.tablet}px)`,
  desktop: `@media (min-width: ${breakpoints.desktop}px)`,
  wide: `@media (min-width: ${breakpoints.wide}px)`,
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