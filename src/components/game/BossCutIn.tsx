// src/components/game/BossCutIn.tsx
// 스토리 모드 전용 보스 등장 컷인 연출.
// gameStore의 enemies를 구독해 보스(isBoss) 등장을 감지하면, 해당 웨이브당 1회
// 슬라이드-인 컷인을 띄운다. 게임 루프를 막지 않는 비차단(pointer-events:none) 오버레이.
import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { useGameStore } from '../../store/gameStore';
import { useTranslation } from '../../i18n';

interface BossCutInProps {
  chapterNumber: number | null;
  bossName?: string;
}

// 챕터별 보스 도발 대사 (ko/en). Ch1은 보스 없음.
const BOSS_TAUNT: Record<number, { ko: string; en: string }> = {
  2: { ko: '느려터졌군. 낫 맛 좀 볼래?',        en: 'Too slow. Care for a taste of my blades?' },
  3: { ko: '음메—— 굴러간다아아!',              en: 'Mooo—— here comes the rollout!' },
  4: { ko: '키히히... 그림자에선 못 빠져나가.',   en: "Kihihi... there's no escaping the shadows." },
  5: { ko: '주먹과 물살, 둘 다 못 피한다.',       en: 'Fists and torrents — you dodge neither.' },
  6: { ko: '구오오— 강철은 부서지지 않는다.',     en: 'Graaah— steel does not break.' },
  7: { ko: '눈보라 속에서 그대로 얼어붙어라.',     en: 'Freeze where you stand, in the blizzard.' },
  8: { ko: '심해의 용을 거스를 셈인가.',         en: 'You dare defy the deep-sea dragon?' },
};

const officialArt = (pokemonId: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;

export const BossCutIn: React.FC<BossCutInProps> = ({ chapterNumber, bossName }) => {
  const { language } = useTranslation();
  const enemies = useGameStore(s => s.enemies);
  const wave = useGameStore(s => s.wave);

  const [active, setActive]   = useState(false);
  const [sprite, setSprite]   = useState<string>('');
  const shownWavesRef         = useRef<Set<number>>(new Set());
  const hideTimerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (chapterNumber === null || !bossName) return;
    // 현재 웨이브에서 아직 컷인을 안 띄웠고, 보스가 등장했으면 트리거
    if (shownWavesRef.current.has(wave)) return;
    const boss = enemies.find(e => e.isBoss);
    if (!boss) return;

    shownWavesRef.current.add(wave);
    setSprite(boss.pokemonId ? officialArt(boss.pokemonId) : boss.sprite);
    setActive(true);

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setActive(false), 3400);
  }, [enemies, wave, chapterNumber, bossName]);

  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  if (chapterNumber === null || !bossName || !active) return null;

  const taunt = chapterNumber && BOSS_TAUNT[chapterNumber]
    ? BOSS_TAUNT[chapterNumber][language === 'en' ? 'en' : 'ko']
    : '';
  const warnLabel = language === 'en' ? 'BOSS APPROACHING' : '보스 출현';

  return (
    <Root>
      <Band>
        <Slashes />
        <ArtWrap>
          {sprite && <Art src={sprite} alt={bossName} />}
        </ArtWrap>
        <TextCol>
          <Warn>⚠ {warnLabel}</Warn>
          <BossName>{bossName}</BossName>
          {taunt && <Taunt>“{taunt}”</Taunt>}
        </TextCol>
      </Band>
    </Root>
  );
};

// ── animations ──────────────────────────────────────────────────────
const bandIn = keyframes`
  0%   { transform: translateX(60%) skewX(-8deg); opacity: 0; }
  12%  { transform: translateX(0)   skewX(-8deg); opacity: 1; }
  82%  { transform: translateX(0)   skewX(-8deg); opacity: 1; }
  100% { transform: translateX(60%) skewX(-8deg); opacity: 0; }
`;
const artPop = keyframes`
  0%   { transform: scale(0.6) translateX(40px); opacity: 0; }
  18%  { transform: scale(1.08) translateX(0);   opacity: 1; }
  30%  { transform: scale(1) translateX(0); }
  100% { transform: scale(1) translateX(0); opacity: 1; }
`;
const slashSweep = keyframes`
  0%   { transform: translateX(-120%) skewX(-20deg); }
  100% { transform: translateX(220%)  skewX(-20deg); }
`;
const textRise = keyframes`
  0%  { transform: translateY(14px); opacity: 0; }
  100%{ transform: translateY(0);    opacity: 1; }
`;

const Root = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  pointer-events: none;
  z-index: 1400;
  overflow: hidden;
`;

const Band = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 18px 44px 18px 28px;
  min-width: 460px;
  max-width: 88vw;
  background: linear-gradient(100deg, rgba(120,8,8,0) 0%, rgba(120,8,8,0.92) 14%, rgba(20,4,4,0.96) 100%);
  border-top: 2px solid #f59e0b;
  border-bottom: 2px solid #f59e0b;
  box-shadow: 0 0 40px rgba(245,158,11,0.35), inset 0 0 60px rgba(0,0,0,0.5);
  animation: ${bandIn} 3.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  overflow: hidden;
`;

const Slashes = styled.div`
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 80px;
  background: linear-gradient(90deg, rgba(255,255,255,0.0), rgba(255,255,255,0.55), rgba(255,255,255,0.0));
  filter: blur(2px);
  animation: ${slashSweep} 1.1s ease-out 0.15s both;
`;

const ArtWrap = styled.div`
  flex: 0 0 auto;
  width: 110px;
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Art = styled.img`
  width: 110px;
  height: 110px;
  object-fit: contain;
  filter: drop-shadow(0 6px 10px rgba(0,0,0,0.6)) drop-shadow(0 0 16px rgba(245,158,11,0.4));
  animation: ${artPop} 3.4s cubic-bezier(0.16, 1, 0.3, 1) both;
`;

const TextCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const Warn = styled.div`
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 3px;
  color: #fca5a5;
  text-shadow: 0 0 8px rgba(239,68,68,0.7);
  animation: ${textRise} 0.4s ease-out 0.25s both;
`;

const BossName = styled.div`
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0,0,0,0.8), 0 0 14px rgba(245,158,11,0.5);
  animation: ${textRise} 0.4s ease-out 0.38s both;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Taunt = styled.div`
  font-size: 14px;
  font-style: italic;
  color: #fcd34d;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  animation: ${textRise} 0.4s ease-out 0.52s both;
`;
