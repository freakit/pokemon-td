// src/components/Story/StoryOpening.tsx
// 산나비 스타일 비주얼 노벨 오프닝 화면
// StorySelector에서 "시작하기" 클릭 후, 게임 진입 전에 표시

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { StoryChapter, DialogueLine } from '../../data/storyChapters';

interface StoryOpeningProps {
  chapter: StoryChapter;
  onComplete: () => void; // 대사 완료 → 게임 진입 콜백
  onSkip: () => void;     // 스킵 → 바로 게임 진입
}

const CHAR_SPEED = 32; // ms/char (타이프라이터 속도)
const BG_IMAGES: Record<string, string> = {
  // mapId → 배경 이미지 경로
  easiest_straight: '/images/maps/easiest_straight.png',
  easy_loop:        '/images/maps/easy_loop.png',
  extreme_aggro_shortcut: '/images/maps/extreme_aggro_shortcut.png',
  medium_multi_s:   '/images/maps/medium_multi_s.png',
  medium_merge:     '/images/maps/medium_merge.png',
  hard_straight_wide: '/images/maps/hard_straight_wide.png',
  hard_dual_path:   '/images/maps/hard_dual_path.png',
  extreme_central:  '/images/maps/extreme_central.png',
};

const SPEAKER_SPRITES: Record<string, string> = {
  루카리오: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png`,
  스라크:   `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/123.png`,
  라티아스: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/380.png`,
  레지락:   `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/377.png`,
  레지아이스:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/378.png`,
  프리져:   `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/144.png`,
  에르레이드:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/475.png`,
  군주:     `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/487.png`,
};

export const StoryOpening: React.FC<StoryOpeningProps> = ({
  chapter,
  onComplete,
  onSkip,
}) => {
  const lines = chapter.openingDialogue;
  const [phase, setPhase] = useState<'title' | 'dialogue' | 'done'>('title');
  const [lineIdx, setLineIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [typing, setTyping] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  const bgSrc = BG_IMAGES[chapter.mapId] ?? '';
  const currentLine: DialogueLine | undefined = lines[lineIdx];
  const spriteUrl = currentLine
    ? SPEAKER_SPRITES[currentLine.speaker]
      ?? (currentLine.pokemonId
        ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${currentLine.pokemonId}.png`
        : null)
    : null;

  // 타이틀 → 대화 전환
  useEffect(() => {
    setFadeIn(true);
    const t = setTimeout(() => setPhase('dialogue'), 2800);
    return () => clearTimeout(t);
  }, []);

  // 타이프라이터
  useEffect(() => {
    if (phase !== 'dialogue' || !currentLine) return;
    setDisplayed('');
    setTyping(true);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(currentLine.text.slice(0, i));
      if (i >= currentLine.text.length) {
        clearInterval(id);
        setTyping(false);
      }
    }, CHAR_SPEED);
    return () => clearInterval(id);
  }, [phase, lineIdx]);

  const advance = useCallback(() => {
    if (phase === 'title') {
      setPhase('dialogue');
      return;
    }
    if (phase === 'dialogue') {
      if (typing) {
        // 스킵: 전체 텍스트 즉시 표시
        setDisplayed(currentLine?.text ?? '');
        setTyping(false);
        return;
      }
      if (lineIdx < lines.length - 1) {
        setLineIdx(p => p + 1);
      } else {
        setPhase('done');
        onComplete();
      }
    }
  }, [phase, typing, lineIdx, lines.length, currentLine, onComplete]);

  // 키보드
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') advance();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advance]);

  return (
    <Root onClick={advance} $fade={fadeIn}>
      {/* 배경 */}
      <BgLayer
        src={bgSrc}
        onLoad={() => setBgLoaded(true)}
        $loaded={bgLoaded}
      />
      <BgDim />
      <BgVignette />

      {/* 챕터 번호 & 위치 (상단 좌측) */}
      <TopInfo $visible={phase === 'dialogue'}>
        <ChapterBadge>
          CHAPTER {String(chapter.chapterNumber).padStart(2, '0')}
        </ChapterBadge>
        <LocationText>{chapter.location}</LocationText>
      </TopInfo>

      {/* 스킵 버튼 */}
      <SkipBtn onClick={e => { e.stopPropagation(); onSkip(); }}>
        SKIP ▶
      </SkipBtn>

      {/* ── 타이틀 화면 ── */}
      {phase === 'title' && (
        <TitleScreen>
          <TitleChNum>CHAPTER {String(chapter.chapterNumber).padStart(2, '0')}</TitleChNum>
          <TitleName $accent={chapter.theme.primary}>{chapter.title}</TitleName>
          <TitleSub>{chapter.subtitle}</TitleSub>
          <TitleCue>클릭 또는 스페이스바로 계속</TitleCue>
        </TitleScreen>
      )}

      {/* ── 대화 화면 ── */}
      {phase === 'dialogue' && currentLine && (
        <>
          {/* 캐릭터 스프라이트 */}
          <CharacterArea>
            {spriteUrl && (
              <CharSprite
                key={currentLine.speaker}
                src={spriteUrl}
                alt={currentLine.speaker}
              />
            )}
          </CharacterArea>

          {/* 텍스트 박스 (화면 하단) */}
          <TextBox onClick={advance}>
            <TextBoxInner>
              <SpeakerLabel $isDark={chapter.chapterNumber === 8}>
                {currentLine.speaker}
              </SpeakerLabel>
              <DialogueText>
                {displayed}
                {typing && <Cursor />}
              </DialogueText>
            </TextBoxInner>
            <ProgressRow>
              {lines.map((_, i) => (
                <ProgDot key={i} $active={i === lineIdx} $past={i < lineIdx} />
              ))}
              <AdvanceCue>{typing ? '' : lineIdx < lines.length - 1 ? '다음 ▶' : '시작 ▶'}</AdvanceCue>
            </ProgressRow>
          </TextBox>
        </>
      )}
    </Root>
  );
};

// ─── Animations ───────────────────────────────────────────────────────────────


const slideUpText = keyframes`
  from { opacity: 0; transform: translateY(24px) }
  to   { opacity: 1; transform: translateY(0) }
`;

const titleReveal = keyframes`
  0%   { opacity: 0; transform: scale(0.96) translateY(12px) }
  100% { opacity: 1; transform: scale(1)    translateY(0) }
`;

const blink = keyframes`
  0%, 100% { opacity: 1 }
  50%       { opacity: 0 }
`;

const charSlideIn = keyframes`
  from { opacity: 0; transform: translateX(-24px) scale(0.9) }
  to   { opacity: 1; transform: translateX(0)     scale(1) }
`;

const panBg = keyframes`
  from { transform: scale(1.08) }
  to   { transform: scale(1.0) }
`;

// ─── Styled Components ────────────────────────────────────────────────────────

const Root = styled.div<{ $fade: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 3000;
  cursor: pointer;
  user-select: none;
  opacity: ${p => p.$fade ? 1 : 0};
  transition: opacity 0.6s ease;
  overflow: hidden;
`;

const BgLayer = styled.img<{ $loaded: boolean }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${p => p.$loaded ? 0.55 : 0};
  transition: opacity 1.2s ease;
  animation: ${panBg} 20s ease-out both;
  pointer-events: none;
`;

const BgDim = styled.div`
  position: absolute; inset: 0;
  background: rgba(0, 0, 0, 0.62);
  pointer-events: none;
`;

const BgVignette = styled.div`
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.85) 100%);
  pointer-events: none;
`;

const TopInfo = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 28px; left: 36px;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.5s ease 0.3s;
  pointer-events: none;
`;

const ChapterBadge = styled.div`
  font-size: 11px; font-weight: 800; letter-spacing: 0.3em;
  color: rgba(245, 158, 11, 0.75);
  margin-bottom: 4px;
`;

const LocationText = styled.div`
  font-size: 13px; color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.04em;
`;

const SkipBtn = styled.button`
  position: absolute;
  top: 24px; right: 32px;
  background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px; color: rgba(255,255,255,0.4);
  padding: 7px 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
  cursor: pointer; transition: all 0.2s; z-index: 10;
  &:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
`;

// ── Title Screen ──────────────────────────────────────────────────────────────

const TitleScreen = styled.div`
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  animation: ${titleReveal} 1.2s ease both;
`;

const TitleChNum = styled.div`
  font-size: 12px; font-weight: 800; letter-spacing: 0.4em;
  color: rgba(245, 158, 11, 0.65); margin-bottom: 20px;
  animation: ${slideUpText} 0.8s ease both;
`;

const TitleName = styled.h1<{ $accent: string }>`
  font-size: clamp(36px, 7vw, 72px); font-weight: 900;
  letter-spacing: -0.02em; color: #fff; margin: 0 0 12px;
  text-shadow: 0 0 60px ${p => p.$accent}55, 0 4px 20px rgba(0,0,0,0.7);
  animation: ${slideUpText} 1s ease 0.2s both;
  text-align: center;
`;

const TitleSub = styled.div`
  font-size: clamp(14px, 2vw, 18px); color: rgba(255,255,255,0.45);
  letter-spacing: 0.08em; margin-bottom: 48px;
  animation: ${slideUpText} 1s ease 0.4s both;
  text-align: center;
`;

const TitleCue = styled.div`
  font-size: 13px; color: rgba(255,255,255,0.2);
  letter-spacing: 0.1em; animation: ${blink} 2s ease-in-out infinite;
`;

// ── Dialogue Screen ───────────────────────────────────────────────────────────

const CharacterArea = styled.div`
  position: absolute;
  bottom: 200px; left: 50%;
  transform: translateX(-50%);
  display: flex; align-items: flex-end; justify-content: center;
  pointer-events: none;

  @media (max-height: 600px) { bottom: 180px; }
`;

const CharSprite = styled.img`
  height: clamp(220px, 35vh, 360px);
  object-fit: contain;
  filter: drop-shadow(0 8px 32px rgba(0,0,0,0.8));
  animation: ${charSlideIn} 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  pointer-events: none;
`;

const TextBox = styled.div`
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: linear-gradient(180deg, rgba(5,8,16,0.0) 0%, rgba(5,8,16,0.96) 12%);
  padding: 20px 0 0;
  pointer-events: all;
`;

const TextBoxInner = styled.div`
  max-width: 900px; margin: 0 auto;
  padding: 0 48px 20px;
  border-top: 1px solid rgba(255,255,255,0.07);
  padding-top: 24px;

  @media (max-width: 600px) { padding: 0 24px 16px; padding-top: 18px; }
`;

const SpeakerLabel = styled.div<{ $isDark: boolean }>`
  font-size: 13px; font-weight: 800; letter-spacing: 0.14em;
  color: ${p => p.$isDark ? '#f87171' : 'rgba(245,158,11,0.85)'};
  text-transform: uppercase; margin-bottom: 12px;
`;

const DialogueText = styled.p`
  font-size: clamp(16px, 2.2vw, 20px);
  line-height: 1.75; color: #f0f4f8; margin: 0;
  font-weight: 400; min-height: 3.5em;
  letter-spacing: 0.01em;
`;

const Cursor = styled.span`
  display: inline-block; width: 2px; height: 1.1em;
  background: rgba(245, 158, 11, 0.8);
  vertical-align: text-bottom; margin-left: 3px;
  animation: ${blink} 0.55s step-end infinite;
`;

const ProgressRow = styled.div`
  display: flex; align-items: center; gap: 6px;
  max-width: 900px; margin: 0 auto;
  padding: 12px 48px 20px;
  @media (max-width: 600px) { padding: 10px 24px 16px; }
`;

const ProgDot = styled.div<{ $active: boolean; $past: boolean }>`
  width: 6px; height: 6px; border-radius: 50%;
  background: ${p =>
    p.$active ? '#f59e0b' : p.$past ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)'};
  transition: background 0.25s;
`;

const AdvanceCue = styled.div`
  margin-left: auto; font-size: 12px; font-weight: 700;
  color: rgba(255,255,255,0.3); letter-spacing: 0.1em;
`;