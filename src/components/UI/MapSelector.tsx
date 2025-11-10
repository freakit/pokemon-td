// src/components/UI/MapSelector.tsx
import React, { useState } from "react";
import styled, { css } from "styled-components";
import { useTranslation } from "../../i18n";
import { MAPS } from "../../data/maps";
import { useGameStore } from "../../store/gameStore";
import { Difficulty, MapData } from "../../types/game";

type DifficultyFilter = "easiest" | "easy" | "medium" | "hard" | "expert";

export const MapSelector: React.FC<{ onSelect: () => void }> = ({
  onSelect,
}) => {
  const { t } = useTranslation();
  const setMap = useGameStore((s) => s.setMap);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const [selectedFilter, setSelectedFilter] = useState<DifficultyFilter | null>(
    null
  );

  const handleDifficultyFilter = (difficulty: DifficultyFilter) => {
    setSelectedFilter(difficulty);
    const gameDifficulty: Difficulty =
      difficulty === "medium" ? "normal" : (difficulty as Difficulty);
    setDifficulty(gameDifficulty);
  };

  const handleSelect = (map: MapData) => {
    setMap(map.id);
    const gameDifficulty: Difficulty =
      map.difficulty === "medium" ? "normal" : (map.difficulty as Difficulty);
    setDifficulty(gameDifficulty);
    onSelect();
  };

  const filteredMaps = selectedFilter
    ? MAPS.filter((map) => map.difficulty === selectedFilter)
    : MAPS;

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easiest":
        return {
          bg: "rgba(209, 213, 219, 0.2)",
          border: "#D1D5DB",
          color: "#D1D5DB",
          glow: "rgba(209, 213, 219, 0.4)",
        };
      case "easy":
        return {
          bg: "rgba(46, 204, 113, 0.2)",
          border: "#2ecc71",
          color: "#2ecc71",
          glow: "rgba(46, 204, 113, 0.4)",
        };
      case "medium":
        return {
          bg: "rgba(52, 152, 219, 0.2)",
          border: "#3498db",
          color: "#3498db",
          glow: "rgba(52, 152, 219, 0.4)",
        };
      case "hard":
        return {
          bg: "rgba(243, 156, 18, 0.2)",
          border: "#f39c12",
          color: "#f39c12",
          glow: "rgba(243, 156, 18, 0.4)",
        };
      case "expert":
        return {
          bg: "rgba(231, 76, 60, 0.2)",
          border: "#e74c3c",
          color: "#e74c3c",
          glow: "rgba(231, 76, 60, 0.4)",
        };
      default:
        return {
          bg: "rgba(149, 165, 166, 0.2)",
          border: "#95a5a6",
          color: "#95a5a6",
          glow: "rgba(149, 165, 166, 0.4)",
        };
    }
  };

  const getBackgroundEmoji = (bgType: string) => {
    switch (bgType) {
      case "grass":
        return "🌿";
      case "desert":
        return "🏜️";
      case "snow":
        return "❄️";
      case "cave":
        return "🌋";
      case "water":
        return "🌊";
      default:
        return "🗺️";
    }
  };

  const getDifficultyText = (diff: DifficultyFilter) => {
    switch (diff) {
      case "easiest": return t('mapSelector.easiest');
      case "easy": return t('mapSelector.easy');
      case "medium": return t('mapSelector.medium');
      case "hard": return t('mapSelector.hard');
      case "expert": return t('mapSelector.expert');
      default: return '';
    }
  }

  return (
    <Fullscreen>
      <Container>
        <TitleSection>
          <Logo
            src="/images/pokemon-aegis.png"
            alt="Pokemon Aegis Logo"
            height="240px"
          />
          <Subtitle>{t('mapSelector.subtitle')}</Subtitle>
        </TitleSection>

        <DifficultySelector>
          <DiffBtn
            onClick={() => setSelectedFilter(null)}
            $isActive={selectedFilter === null}
          >
            {t('pokedex.filterAll')}
          </DiffBtn>
          <DiffBtn
            onClick={() => handleDifficultyFilter("easiest")}
            $difficulty="easiest"
            $isActive={selectedFilter === "easiest"}
          >
            ⚪ {t('mapSelector.easiest')}
          </DiffBtn>
          <DiffBtn
            onClick={() => handleDifficultyFilter("easy")}
            $difficulty="easy"
            $isActive={selectedFilter === "easy"}
          >
            🟢 {t('mapSelector.easy')}
          </DiffBtn>
          <DiffBtn
            onClick={() => handleDifficultyFilter("medium")}
            $difficulty="medium"
            $isActive={selectedFilter === "medium"}
          >
            🔵 {t('mapSelector.medium')}
          </DiffBtn>
          <DiffBtn
            onClick={() => handleDifficultyFilter("hard")}
            $difficulty="hard"
            $isActive={selectedFilter === "hard"}
          >
            🟠 {t('mapSelector.hard')}
          </DiffBtn>
          <DiffBtn
            onClick={() => handleDifficultyFilter("expert")}
            $difficulty="expert"
            $isActive={selectedFilter === "expert"}
          >
            🔴 {t('mapSelector.expert')}
          </DiffBtn>
        </DifficultySelector>

        <Grid>
          {filteredMaps.map((map) => {
            const diffColor = getDifficultyColor(map.difficulty);
            return (
              <Card
                key={map.id}
                onClick={() => handleSelect(map)}
                $hoverGlow={diffColor.glow}
              >
                <CardGlow />
                <CardHeader>
                  <BgEmoji>
                    {getBackgroundEmoji(map.backgroundType)}
                  </BgEmoji>
                  <DifficultyBadge
                    $colors={diffColor}
                  >
                    {getDifficultyText(map.difficulty as DifficultyFilter)}
                  </DifficultyBadge>
                </CardHeader>
                <MapName>{map.name}</MapName>
                <MapDescription>{map.description}</MapDescription>
              </Card>
            );
          })}
        </Grid>

        {filteredMaps.length === 0 && (
          <EmptyState>
            <EmptyText>{t('mapSelector.noMaps')}</EmptyText>
          </EmptyState>
        )}
      </Container>
    </Fullscreen>
  );
};

const Fullscreen = styled.div`
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at top, #1a2332 0%, #0f1419 50%, #000000 100%);
  display: flex;
  justify-content: center;
  overflow: auto;
  padding: 24px;
`;

const Container = styled.div`
  max-width: 1400px;
  width: 100%;
  animation: fadeIn 0.5s ease-out;
`;

const TitleSection = styled.div`
  text-align: center;
  margin-bottom: 24px;
`;

const Logo = styled.img`
  filter: drop-shadow(0 0 40px rgba(76, 175, 255, 0.6));
  animation: pulse 3s ease-in-out infinite;
`;

const Subtitle = styled.div`
  font-size: 16px;
  color: #a8b8c8;
  font-weight: 600;
  margin-top: 8px;
`;

const DifficultySelector = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const DiffBtn = styled.button<{ $isActive: boolean, $difficulty?: string }>`
  padding: 12px 24px;
  font-size: 16px;
  font-weight: bold;
  border: 2px solid rgba(76, 175, 255, 0.3);
  border-radius: 16px;
  cursor: pointer;
  background: linear-gradient(145deg, rgba(30, 40, 60, 0.8), rgba(15, 20, 35, 0.9));
  color: #e8edf3;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  ${props => props.$difficulty === 'easy' && `border-color: rgba(46, 204, 113, 0.4);`}
  ${props => props.$difficulty === 'medium' && `border-color: rgba(52, 152, 219, 0.4);`}
  ${props => props.$difficulty === 'hard' && `border-color: rgba(243, 156, 18, 0.4);`}
  ${props => props.$difficulty === 'expert' && `border-color: rgba(231, 76, 60, 0.4);`}
  ${props => props.$difficulty === 'easiest' && `border-color: rgba(209, 213, 219, 0.4);`}

  ${props => props.$isActive && css`
    transform: scale(1.05);
    box-shadow: 0 8px 25px rgba(76, 175, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    background: linear-gradient(135deg, rgba(76, 175, 255, 0.3), rgba(76, 175, 255, 0.1));
  `}
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
`;

const Card = styled.div<{ $hoverGlow: string }>`
  background: linear-gradient(145deg, rgba(26, 35, 50, 0.9), rgba(15, 20, 25, 0.95));
  border: 2px solid rgba(76, 175, 255, 0.3);
  border-radius: 24px;
  padding: 12px 24px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);

  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 20px 40px ${props => props.$hoverGlow}, 0 0 20px ${props => props.$hoverGlow};
  }
`;

const CardGlow = styled.div`
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(76, 175, 255, 0.08) 0%, transparent 70%);
  animation: pulse 4s ease-in-out infinite;
  pointer-events: none;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
`;

const BgEmoji = styled.span`
  font-size: 48px;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
`;

const DifficultyBadge = styled.div<{$colors: { bg: string, border: string, color: string, glow: string }}>`
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: ${props => props.$colors.bg};
  border: 2px solid ${props => props.$colors.border};
  color: ${props => props.$colors.color};
  box-shadow: 0 0 10px ${props => props.$colors.glow};
`;

const MapName = styled.h3`
  font-size: 28px;
  font-weight: 700;
  color: #e8edf3;
  margin: 0 0 12px 0;
  position: relative;
  z-index: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
`;

const MapDescription = styled.p`
  font-size: 16px;
  color: #a8b8c8;
  line-height: 1.6;
  margin: 0 0 20px 0;
  position: relative;
  z-index: 1;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
`;

const EmptyText = styled.p`
  font-size: 20px;
  color: #7f8c8d;
  font-weight: 600;
`;