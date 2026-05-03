// src/components/Story/StoryDialogModal.tsx
// Pokemon Aegis — 스토리 대사 컷신 모달

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { DialogueLine } from '../../data/storyChapters';

interface Props {
  lines: DialogueLine[];
  onComplete: () => void;
  type: 'opening' | 'ending';
}

const TYPEWRITER_SPEED = 28; // ms per character

export const StoryDialogModal: React.FC<Props> = ({ lines, onComplete, type }) => {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const currentLine = lines[lineIndex];
  const fullText = currentLine?.text ?? '';

  // Typewriter effect
  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, TYPEWRITER_SPEED);
    return () => clearInterval(interval);
  }, [lineIndex, fullText]);

  const handleAdvance = useCallback(() => {
    if (isTyping) {
      // Skip to full text
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }
    if (lineIndex < lines.length - 1) {
      setLineIndex((p) => p + 1);
    } else {
      onComplete();
    }
  }, [isTyping, lineIndex, lines.length, fullText, onComplete]);

  // Click anywhere or press space/enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') handleAdvance();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleAdvance]);

  if (!currentLine) return null;

  const spriteUrl = currentLine.pokemonId
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${currentLine.pokemonId}.png`
    : null;

  const isLastLine = lineIndex === lines.length - 1;

  return (
    <Overlay onClick={handleAdvance}>
      <BannerContainer $type={type} onClick={(e) => e.stopPropagation()}>
        <TypeLabel $type={type}>
          {type === 'opening' ? '◈ STORY' : '◈ EPILOGUE'}
        </TypeLabel>

        <ContentRow>
          {/* Pokemon sprite */}
          <SpriteBox>
            {spriteUrl && (
              <SpriteImg
                key={currentLine.pokemonId}
                src={spriteUrl}
                alt={currentLine.speakerEn}
              />
            )}
          </SpriteBox>

          {/* Dialogue */}
          <DialogueBox onClick={handleAdvance}>
            <SpeakerName>{currentLine.speaker}</SpeakerName>
            <DialogueText>
              {displayedText}
              {isTyping && <Cursor />}
            </DialogueText>
          </DialogueBox>
        </ContentRow>

        <Footer>
          <ProgressDots>
            {lines.map((_, i) => (
              <Dot key={i} $active={i === lineIndex} $past={i < lineIndex} />
            ))}
          </ProgressDots>
          <AdvanceHint onClick={handleAdvance}>
            {isTyping
              ? '클릭하여 건너뛰기'
              : isLastLine
              ? '▶ 계속하기'
              : '▶ 다음'}
          </AdvanceHint>
        </Footer>
      </BannerContainer>
    </Overlay>
  );
};

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0 }
  to   { opacity: 1 }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(32px) }
  to   { opacity: 1; transform: translateY(0) }
`;

const blink = keyframes`
  0%, 100% { opacity: 1 }
  50%       { opacity: 0 }
`;

const spriteIn = keyframes`
  from { opacity: 0; transform: scale(0.7) translateY(8px) }
  to   { opacity: 1; transform: scale(1) translateY(0) }
`;

// ─── Styled Components ────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 2000;
  animation: ${fadeIn} 0.3s ease;
  padding-bottom: 0;
`;

const BannerContainer = styled.div<{ $type: 'opening' | 'ending' }>`
  width: 100%;
  max-width: 860px;
  background: ${(p) =>
    p.$type === 'opening'
      ? 'linear-gradient(180deg, rgba(10,14,26,0.97) 0%, rgba(8,12,22,1) 100%)'
      : 'linear-gradient(180deg, rgba(20,10,5,0.97) 0%, rgba(10,5,2,1) 100%)'};
  border-top: 2px solid
    ${(p) => (p.$type === 'opening' ? 'rgba(99,179,237,0.4)' : 'rgba(245,158,11,0.4)')};
  padding: 20px 28px 16px;
  animation: ${slideUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;

  @media (max-width: 600px) {
    padding: 16px 16px 12px;
  }
`;

const TypeLabel = styled.div<{ $type: 'opening' | 'ending' }>`
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: ${(p) => (p.$type === 'opening' ? '#63b3ed' : '#f59e0b')};
  margin-bottom: 14px;
  opacity: 0.8;
`;

const ContentRow = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-end;
  margin-bottom: 12px;

  @media (max-width: 480px) {
    gap: 12px;
  }
`;

const SpriteBox = styled.div`
  flex-shrink: 0;
  width: 96px;
  height: 96px;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @media (max-width: 480px) {
    width: 72px;
    height: 72px;
  }
`;

const SpriteImg = styled.img`
  width: 96px;
  height: 96px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.15));
  animation: ${spriteIn} 0.4s ease;

  @media (max-width: 480px) {
    width: 72px;
    height: 72px;
  }
`;

const DialogueBox = styled.div`
  flex: 1;
  cursor: pointer;
`;

const SpeakerName = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const DialogueText = styled.p`
  font-size: 18px;
  line-height: 1.65;
  color: #f0f4f8;
  font-weight: 400;
  margin: 0;
  min-height: 3.3em;

  @media (max-width: 600px) {
    font-size: 15px;
    min-height: 3em;
  }
`;

const Cursor = styled.span`
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background: #63b3ed;
  vertical-align: text-bottom;
  margin-left: 2px;
  animation: ${blink} 0.6s step-end infinite;
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ProgressDots = styled.div`
  display: flex;
  gap: 6px;
`;

const Dot = styled.div<{ $active: boolean; $past: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) =>
    p.$active ? '#63b3ed' : p.$past ? 'rgba(99,179,237,0.35)' : 'rgba(255,255,255,0.12)'};
  transition: background 0.3s;
`;

const AdvanceHint = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  padding: 6px 0;
  transition: color 0.2s;

  &:hover {
    color: rgba(255, 255, 255, 0.8);
  }
`;