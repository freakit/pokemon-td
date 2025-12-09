
import React, { useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { TowerDetail, BattleLogEntry, PvPBattleResult } from '../../types/multiplayer';

interface BattleVisualizerProps {
  myTeam: TowerDetail[];
  opponentTeam: TowerDetail[];
  opponentName: string;
  battleResult: PvPBattleResult;
  onComplete: () => void;
}

interface CombatantState extends TowerDetail {
  displayHp: number;
  isHit: boolean;
  isAttacking: boolean;
  battleId: string;
}

export const BattleVisualizer: React.FC<BattleVisualizerProps> = ({
  myTeam,
  opponentTeam,
  opponentName,
  battleResult,
  onComplete,
}) => {
  const [leftTeam, setLeftTeam] = useState<CombatantState[]>([]);
  const [rightTeam, setRightTeam] = useState<CombatantState[]>([]);
  const [logIndex, setLogIndex] = useState(0);
  const [floatingTexts, setFloatingTexts] = useState<
    Array<{ id: number; text: string; x: number; y: number; color: string }>
  >([]);
  const [isPlaying] = useState(true);
  const [showResult, setShowResult] = useState(false);

  // Initialize teams with battleId
  useEffect(() => {
    setLeftTeam(
      myTeam.map((p, idx) => ({
        ...p,
        displayHp: p.currentHp,
        isHit: false,
        isAttacking: false,
        battleId: `p1-${idx}`,
      }))
    );
    setRightTeam(
      opponentTeam.map((p, idx) => ({
        ...p,
        displayHp: p.currentHp,
        isHit: false,
        isAttacking: false,
        battleId: `p2-${idx}`,
      }))
    );
  }, [myTeam, opponentTeam]);

  // Battle Logic Playback
  useEffect(() => {
    if (!isPlaying || showResult) return;

    if (logIndex >= battleResult.battleLog.length) {
      const timer = setTimeout(() => {
        setShowResult(true);
      }, 1000);
      return () => clearTimeout(timer);
    }

    const entry = battleResult.battleLog[logIndex];
    const delay = 600; // Time between moves

    const timer = setTimeout(() => {
      processLogEntry(entry);
      setLogIndex((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [logIndex, isPlaying, showResult, battleResult.battleLog]);

  const processLogEntry = (entry: BattleLogEntry) => {
    const { attackerId, targetId, damage, isFainted } = entry;

    // Helper to find and update unit
    const updateUnit = (
      _team: CombatantState[],
      setTeam: React.Dispatch<React.SetStateAction<CombatantState[]>>,
      id: string,
      updates: Partial<CombatantState>
    ) => {
      setTeam((prev) =>
        prev.map((unit) => (unit.battleId === id ? { ...unit, ...updates } : unit))
      );
    };

    // Attacker Animation
    const isLeftAttacker = attackerId.startsWith('p1');
    if (isLeftAttacker) {
      updateUnit(leftTeam, setLeftTeam, attackerId, { isAttacking: true });
      setTimeout(() => updateUnit(leftTeam, setLeftTeam, attackerId, { isAttacking: false }), 300);
    } else {
      updateUnit(rightTeam, setRightTeam, attackerId, { isAttacking: true });
      setTimeout(() => updateUnit(rightTeam, setRightTeam, attackerId, { isAttacking: false }), 300);
    }

    // Target Damage & Hit Animation
    const isLeftTarget = targetId.startsWith('p1');
    if (isLeftTarget) {
      // Find unit to get position for floating text (approximate)
      // We can't easily get DOM rect here, so we assume position based on index logic or center
      addFloatingText(`-${damage}`, isLeftTarget);
      
      setLeftTeam((prev) =>
        prev.map((unit) => {
          if (unit.battleId === targetId) {
            return {
              ...unit,
              displayHp: Math.max(0, unit.displayHp - damage),
              isHit: true,
              isFainted: isFainted || unit.displayHp - damage <= 0,
            };
          }
          return unit;
        })
      );
      setTimeout(() => updateUnit(leftTeam, setLeftTeam, targetId, { isHit: false }), 400);
    } else {
      addFloatingText(`-${damage}`, isLeftTarget);
      
      setRightTeam((prev) =>
        prev.map((unit) => {
          if (unit.battleId === targetId) {
            return {
              ...unit,
              displayHp: Math.max(0, unit.displayHp - damage),
              isHit: true,
              isFainted: isFainted || unit.displayHp - damage <= 0,
            };
          }
          return unit;
        })
      );
      setTimeout(() => updateUnit(rightTeam, setRightTeam, targetId, { isHit: false }), 400);
    }
  };

  const addFloatingText = (text: string, isLeft: boolean) => {
     setFloatingTexts(prev => [
         ...prev,
         {
             id: Date.now(),
             text,
             x: isLeft ? 30 : 70, // Percent based
             y: 40 + Math.random() * 20,
             color: '#e74c3c'
         }
     ]);
     setTimeout(() => {
         setFloatingTexts(prev => prev.slice(1));
     }, 1000);
  }

  const handleSkip = () => {
    // Fast forward state
    setLeftTeam(prev => prev.map(u => {
        // Find final state from logs? Too complex.
        // Just show result screen immediately.
        return u; 
    }));
    setShowResult(true);
  };

  return (
    <Container>
      <BattleField>
        {/* Left Team (User) */}
        <TeamContainer>
          <TeamName>My Team</TeamName>
          <UnitsGrid>
            {leftTeam.map((unit) => (
              <UnitCard key={unit.battleId} $isFainted={unit.isFainted} $isHit={unit.isHit} $isAttacking={unit.isAttacking}>
                <HpBar><HpFill style={{ width: `${(unit.displayHp / unit.maxHp) * 100}%` }} /></HpBar>
                <UnitImage src={unit.sprite} />
                <UnitName>{unit.name}</UnitName>
              </UnitCard>
            ))}
          </UnitsGrid>
        </TeamContainer>

        <VS>VS</VS>

        {/* Right Team (Opponent) */}
        <TeamContainer>
            <TeamName>{opponentName}</TeamName>
             <UnitsGrid>
            {rightTeam.map((unit) => (
              <UnitCard key={unit.battleId} $isFainted={unit.isFainted} $isHit={unit.isHit} $isAttacking={unit.isAttacking} $isRight>
                <HpBar><HpFill style={{ width: `${(unit.displayHp / unit.maxHp) * 100}%` }} /></HpBar>
                <UnitImage src={unit.sprite} />
                <UnitName>{unit.name}</UnitName>
              </UnitCard>
            ))}
          </UnitsGrid>
        </TeamContainer>
        
        {/* Floating Texts Overlay */}
        <OverlayLayer>
            {floatingTexts.map(ft => (
                <FloatText key={ft.id} style={{ left: `${ft.x}%`, top: `${ft.y}%` }}>{ft.text}</FloatText>
            ))}
        </OverlayLayer>

      </BattleField>

      <Controls>
        {!showResult && <SkipButton onClick={handleSkip}>Skip Battle ⏩</SkipButton>}
      </Controls>

        {showResult && (
            <ResultOverlay>
                <ResultTitle $won={battleResult.winnerId === battleResult.player1Id}>
                    {battleResult.winnerId === battleResult.player1Id ? "VICTORY" : "DEFEAT"}
                </ResultTitle>
                <CloseButton onClick={onComplete}>Continue</CloseButton>
            </ResultOverlay>
        )}
    </Container>
  );
};

// Styles
const Container = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const BattleField = styled.div`
  display: flex;
  width: 90%;
  max-width: 1000px;
  height: 60%;
  justify-content: space-between;
  align-items: center;
  position: relative;
`;

const TeamContainer = styled.div`
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
`;

const TeamName = styled.h3`
  color: white;
  margin-bottom: 20px;
  font-size: 24px;
`;

const UnitsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  width: 100%;
`;

const shake = keyframes`
  0% { transform: translate(0, 0); }
  25% { transform: translate(5px, 0); }
  50% { transform: translate(-5px, 0); }
  75% { transform: translate(5px, 0); }
  100% { transform: translate(0, 0); }
`;

const lungeRight = keyframes`
   0% { transform: translateX(0); }
   50% { transform: translateX(30px); }
   100% { transform: translateX(0); }
`;

const lungeLeft = keyframes`
   0% { transform: translateX(0); }
   50% { transform: translateX(-30px); }
   100% { transform: translateX(0); }
`;

const UnitCard = styled.div<{ $isFainted: boolean; $isHit: boolean; $isAttacking: boolean; $isRight?: boolean }>`
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: ${props => props.$isFainted ? 0.3 : 1};
  transition: opacity 0.3s;
  border: ${props => props.$isAttacking ? '2px solid yellow' : '1px solid #333'};
  
  ${props => props.$isHit && css`animation: ${shake} 0.3s ease-in-out;`}
  ${props => props.$isAttacking && !props.$isRight && css`animation: ${lungeRight} 0.3s ease-in-out;`}
  ${props => props.$isAttacking && props.$isRight && css`animation: ${lungeLeft} 0.3s ease-in-out;`}
`;

const UnitImage = styled.img`
  width: 64px;
  height: 64px;
  object-fit: contain;
`;

const UnitName = styled.span`
  color: #ddd;
  font-size: 12px;
  margin-top: 5px;
`;

const HpBar = styled.div`
  width: 100%;
  height: 6px;
  background: #333;
  margin-bottom: 5px;
  border-radius: 3px;
  overflow: hidden;
`;

const HpFill = styled.div`
  height: 100%;
  background: #2ecc71;
  transition: width 0.3s linear;
`;

const VS = styled.div`
  font-size: 48px;
  font-weight: bold;
  color: #e74c3c;
  margin: 0 20px;
  text-shadow: 0 0 10px rgba(231, 76, 60, 0.8);
`;

const Controls = styled.div`
  margin-top: 20px;
`;

const SkipButton = styled.button`
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  
  &:hover { background: #2980b9; }
`;

const ResultOverlay = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(5px);
`;

const ResultTitle = styled.h1<{ $won: boolean }>`
  font-size: 72px;
  color: ${props => props.$won ? '#f1c40f' : '#e74c3c'};
  text-shadow: 0 0 20px ${props => props.$won ? 'rgba(241, 196, 15, 0.5)' : 'rgba(231, 76, 60, 0.5)'};
  margin-bottom: 30px;
`;

const CloseButton = styled.button`
  padding: 15px 40px;
  font-size: 24px;
  background: white;
  border: none;
  border-radius: 30px;
  font-weight: bold;
  cursor: pointer;
  
  &:hover { transform: scale(1.05); }
`;

const OverlayLayer = styled.div`
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
`;

const floatUp = keyframes`
    0% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(-50px); opacity: 0; }
`;

const FloatText = styled.div`
    position: absolute;
    font-size: 24px;
    font-weight: bold;
    color: #e74c3c;
    text-shadow: 1px 1px 0 #000;
    animation: ${floatUp} 1s ease-out forwards;
`;
