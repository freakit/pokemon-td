// src/components/Multiplayer/MultiplayerView.tsx
// 간소화된 멀티플레이어 현황 뷰 - 플레이어 체력 순 정렬

import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { multiplayerService } from '../../services/MultiplayerService';
import { PlayerGameState, TowerDetail } from '../../types/multiplayer';
import { authService } from '../../services/AuthService';
import { useGameStore } from '../../store/gameStore';
import { media } from '../../utils/responsive.utils';

interface MultiplayerViewProps {
  roomId: string;
  onClose: () => void;
}

export const MultiplayerView = ({ roomId, onClose }: MultiplayerViewProps) => {
  const [players, setPlayers] = useState<PlayerGameState[]>([]);
  const [allTowerDetails, setAllTowerDetails] = useState<Map<string, TowerDetail[]>>(new Map());
  
  const user = authService.getCurrentUser();

  useEffect(() => {
    try {
      const unsubscribe = multiplayerService.onGameStateUpdate(roomId, (updatedPlayers) => {
        setPlayers(updatedPlayers);
      });
      return unsubscribe;
    } catch (error) {
      console.error('Failed to subscribe to game state:', error);
    }
  }, [roomId]);

  const towers = useGameStore((state) => state.towers);
  
  useEffect(() => {
    if (!user || !roomId) return;

    const towerDetails: TowerDetail[] = towers
      .map(t => ({
        pokemonId: t.pokemonId,
        name: t.displayName,
        level: t.level,
        sprite: t.sprite,
        position: t.position,
        currentHp: t.currentHp,
        maxHp: t.maxHp,
        isFainted: t.isFainted,
      }));

    multiplayerService.updatePlayerTowerDetails(roomId, user.uid, towerDetails);
  }, [towers, roomId, user]);

  useEffect(() => {
    if (!roomId) return;

    const unsub = multiplayerService.onAllTowerDetailsUpdate(roomId, (allTowers) => {
      setAllTowerDetails(allTowers);
    });

    return () => unsub();
  }, [roomId]);

  // 체력 기준 내림차순 정렬 (생존자 먼저, 탈락자 나중)
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.isAlive !== b.isAlive) return b.isAlive ? 1 : -1;
    return b.lives - a.lives;
  });

  return (
    <Overlay onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <Container>
        <Header>
          <Title>🏆 플레이어 순위</Title>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </Header>

        <PlayerList>
          {sortedPlayers.map((player, index) => {
            const playerTowers = player.userId === user?.uid 
              ? towers.map(t => ({ ...t, name: t.displayName })) 
              : allTowerDetails.get(player.userId) || [];
            const alivePokemon = playerTowers.filter(t => !t.isFainted).length;
            const totalPokemon = playerTowers.length;
            
            return (
              <PlayerRow
                key={player.userId}
                $isMe={player.userId === user?.uid}
                $isDead={!player.isAlive}
              >
                <RankBadge $rank={index + 1}>{index + 1}</RankBadge>
                
                <PlayerInfo>
                  <PlayerName>
                    {player.userName}
                    {player.userId === user?.uid && <MeTag>(나)</MeTag>}
                  </PlayerName>
                  <PlayerStats>
                    <StatIcon>❤️ {player.lives}</StatIcon>
                    <StatIcon>💰 {player.money}</StatIcon>
                    <StatIcon>🌊 {player.wave}</StatIcon>
                  </PlayerStats>
                </PlayerInfo>

                <PokemonSection>
                  <PokemonCount>
                    ⚔️ {alivePokemon}/{totalPokemon}
                  </PokemonCount>
                  <PokemonIcons>
                    {playerTowers.slice(0, 6).map((tower, idx) => (
                      <PokemonIcon 
                        key={idx}
                        src={tower.sprite}
                        alt={tower.name}
                        $isFainted={tower.isFainted}
                        title={`${tower.name} Lv.${tower.level}${tower.isFainted ? ' (기절)' : ''}`}
                      />
                    ))}
                  </PokemonIcons>
                </PokemonSection>

                {!player.isAlive && <DeadBadge>💀 탈락</DeadBadge>}
              </PlayerRow>
            );
          })}
        </PlayerList>
      </Container>
    </Overlay>
  );
};

// Styled Components
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const Container = styled.div`
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  padding: 1.5rem;
  border-radius: 20px;
  max-width: 600px;
  width: 95%;
  max-height: 85vh;
  overflow-y: auto;
  border: 2px solid rgba(255, 215, 0, 0.3);
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.15);

  ${media.mobile} {
    padding: 1rem;
    max-height: 95vh;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 0.8rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h2`
  color: #ffd700;
  margin: 0;
  font-size: 1.4rem;

  ${media.mobile} {
    font-size: 1.2rem;
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 107, 107, 0.3);
  }
`;

const PlayerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PlayerRow = styled.div<{ $isMe: boolean; $isDead: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: ${props => props.$isMe 
    ? 'linear-gradient(135deg, rgba(52, 152, 219, 0.2), rgba(52, 152, 219, 0.1))' 
    : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 12px;
  border: 2px solid ${props => props.$isMe ? 'rgba(52, 152, 219, 0.4)' : 'transparent'};
  opacity: ${props => props.$isDead ? 0.5 : 1};
  position: relative;

  ${media.mobile} {
    padding: 0.75rem;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
`;

const RankBadge = styled.div<{ $rank: number }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1rem;
  background: ${props => {
    if (props.$rank === 1) return 'linear-gradient(135deg, #ffd700, #ff8c00)';
    if (props.$rank === 2) return 'linear-gradient(135deg, #c0c0c0, #a0a0a0)';
    if (props.$rank === 3) return 'linear-gradient(135deg, #cd7f32, #a0522d)';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  color: ${props => props.$rank <= 3 ? '#000' : '#fff'};
  flex-shrink: 0;
`;

const PlayerInfo = styled.div`
  flex: 1;
  min-width: 120px;
`;

const PlayerName = styled.div`
  color: #fff;
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MeTag = styled.span`
  color: #3498db;
  font-size: 0.8rem;
`;

const PlayerStats = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const StatIcon = styled.span`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
`;

const PokemonSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;

  ${media.mobile} {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const PokemonCount = styled.span`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
`;

const PokemonIcons = styled.div`
  display: flex;
  gap: 4px;
`;

const PokemonIcon = styled.img<{ $isFainted: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.3);
  opacity: ${props => props.$isFainted ? 0.4 : 1};
  filter: ${props => props.$isFainted ? 'grayscale(100%)' : 'none'};
  border: 2px solid ${props => props.$isFainted ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)'};

  ${media.mobile} {
    width: 28px;
    height: 28px;
  }
`;

const DeadBadge = styled.div`
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  background: rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: bold;
`;