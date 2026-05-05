import styled, { keyframes } from 'styled-components';
import React, { useMemo } from 'react';

const fall = keyframes`
  0% {
    transform: translate(0, 0) rotate(-45deg);
    opacity: 1;
  }
  20% {
    opacity: 1;
  }
  100% {
    transform: translate(-1000px, 1000px) rotate(-45deg);
    opacity: 0;
  }
`;

const BackingSky = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at top right, #0f172a 0%, #020617 100%);
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
`;

const Star = styled.div<{ $delay: string; $top: string; $left: string; $duration: string }>`
  position: absolute;
  top: ${(props) => props.$top};
  left: ${(props) => props.$left};
  width: 2px;
  height: 2px;
  background: transparent;
  animation: ${fall} ${(props) => props.$duration} linear infinite;
  animation-delay: ${(props) => props.$delay};
  opacity: 0;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 60px;
    height: 1px;
    background: linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0));
  }
`;

export const ShootingStarsBackground: React.FC = () => {
  const starsArray = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 150}vw`,
      top: `${Math.random() * -50}vh`,
      delay: `${Math.random() * 5}s`,
      duration: `${1.5 + Math.random() * 2}s`
    }));
  }, []);

  return (
    <BackingSky>
      {starsArray.map((star) => (
        <Star
          key={star.id}
          $left={star.left}
          $top={star.top}
          $delay={star.delay}
          $duration={star.duration}
        />
      ))}
    </BackingSky>
  );
};
