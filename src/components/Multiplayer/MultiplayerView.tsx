// src/components/Multiplayer/MultiplayerView.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { multiplayerService } from '../../services/MultiplayerService';
import { PlayerGameState, DebuffItem } from '../../types/multiplayer';
import { authService } from '../../services/AuthService';
import { useGameStore } from '../../store/gameStore';

interface MultiplayerViewProps {
  roomId: string;
  onClose: () => void;
}

interface TowerDetail {
  pokemonId: number;
  name: string;
  level: number;
  sprite: string;
  position: { x: number; y: number };
}

export const MultiplayerView = ({ roomId, onClose }: MultiplayerViewProps) => {
  const [players, setPlayers] = useState<PlayerGameState[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [viewingPlayer, setViewingPlayer] = useState<string | null>(null);
  const [viewingPlayerTowers, setViewingPlayerTowers] = useState<TowerDetail[]>([]);
  const [debuffItems] = useState<DebuffItem[]>(multiplayerService.getDebuffItems());
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

  // 내 타워 정보 실시간 동기화
  const towers = useGameStore((state) => state.towers);
  useEffect(() => {
    if (!user || !roomId) return;

    const towerDetails: TowerDetail[] = towers
      .filter(t => !t.isFainted)
      .map(t => ({
        pokemonId: t.pokemonId,
        name: t.name,
        level: t.level,
        sprite: t.sprite,
        position: t.position
      }));

    multiplayerService.updatePlayerTowerDetails(roomId, towerDetails);
  }, [towers, roomId, user]);

  // 관전 중인 플레이어의 타워 정보 구독
  useEffect(() => {
    if (!viewingPlayer) {
      setViewingPlayerTowers([]);
      return;
    }

    const unsubscribe = multiplayerService.onTowerDetailsUpdate(
      roomId,
      viewingPlayer,
      (towers) => {
        setViewingPlayerTowers(towers);
      }
    );

    return unsubscribe;
  }, [roomId, viewingPlayer]);

  const handleBuyDebuff = async (debuff: DebuffItem, targetUserId: string) => {
    if (!user) return;
    
    const myState = players.find(p => p.userId === user.uid);
    if (!myState || myState.money < debuff.cost) {
      alert('골드가 부족합니다!');
      return;
    }

    if (!myState.isAlive) {
      alert('이미 탈락했습니다!');
      return;
    }

    try {
      await multiplayerService.applyDebuff(roomId, targetUserId, debuff);
      useGameStore.getState().spendMoney(debuff.cost);
      alert(`${debuff.name}을(를) 사용했습니다!`);
      setSelectedPlayer(null);
    } catch (err: any) {
      alert(err.message || '디버프 사용에 실패했습니다.');
    }
  };

  const myState = players.find(p => p.userId === user?.uid);

  return (
    <Overlay onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <Container>
        <Header>
          <Title>멀티플레이어 전황</Title>
          <MyGold>내 골드: {myState?.money || 0}G</MyGold>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </Header>

        <GridContainer>
          {players.map(player => (
            <PlayerBox
              key={player.userId}
              isMe={player.userId === user?.uid}
              isDead={!player.isAlive}
            >
              <PlayerHeader>
                <PlayerName>
                  {player.userName}
                  {player.userId === user?.uid && ' (나)'}
                  {player.placement && ` - ${player.placement}등`}
                </PlayerName>
                <PlayerRating>⭐ {player.rating}</PlayerRating>
              </PlayerHeader>
              
              <PlayerStats>
                <Stat>
                  <StatLabel>Wave</StatLabel>
                  <StatValue>{player.wave}</StatValue>
                </Stat>
                <Stat>
                  <StatLabel>Lives</StatLabel>
                  <StatValue>{player.lives}</StatValue>
                </Stat>
                <Stat>
                  <StatLabel>Gold</StatLabel>
                  <StatValue>{player.money}</StatValue>
                </Stat>
                <Stat>
                  <StatLabel>Towers</StatLabel>
                  <StatValue>{player.towers}</StatValue>
                </Stat>
              </PlayerStats>

              {player.userId !== user?.uid && player.isAlive && myState?.isAlive && (
                <ButtonRow>
                  <AttackButton onClick={() => setSelectedPlayer(player.userId)}>
                    🎯 공격
                  </AttackButton>
                  <ViewButton onClick={() => setViewingPlayer(player.userId)}>
                    👁️ 보기
                  </ViewButton>
                </ButtonRow>
              )}

              {!player.isAlive && (
                <DefeatedBadge>탈락</DefeatedBadge>
              )}
            </PlayerBox>
          ))}
        </GridContainer>

        {selectedPlayer && (
          <DebuffShop>
            <ShopHeader>
              <ShopTitle>
                {players.find(p => p.userId === selectedPlayer)?.userName}에게 디버프 사용
              </ShopTitle>
              <ShopClose onClick={() => setSelectedPlayer(null)}>✕</ShopClose>
            </ShopHeader>
            
            <DebuffGrid>
              {debuffItems.map(debuff => (
                <DebuffCard key={debuff.id}>
                  <DebuffName>{debuff.name}</DebuffName>
                  <DebuffDesc>{debuff.description}</DebuffDesc>
                  <DebuffCost>{debuff.cost}G</DebuffCost>
                  <BuyButton
                    onClick={() => handleBuyDebuff(debuff, selectedPlayer)}
                    disabled={!myState || myState.money < debuff.cost}
                  >
                    구매
                  </BuyButton>
                </DebuffCard>
              ))}
            </DebuffGrid>
          </DebuffShop>
        )}

        {viewingPlayer && (
          <ViewerModal>
            <ViewerHeader>
              <ViewerTitle>
                {players.find(p => p.userId === viewingPlayer)?.userName}의 게임 화면
              </ViewerTitle>
              <ViewerClose onClick={() => setViewingPlayer(null)}>✕</ViewerClose>
            </ViewerHeader>
            <ViewerContent>
              {players.find(p => p.userId === viewingPlayer) && (
                <>
                  <DetailedStats>
                    <DetailStat>
                      <DetailLabel>웨이브</DetailLabel>
                      <DetailValue>{players.find(p => p.userId === viewingPlayer)?.wave}</DetailValue>
                    </DetailStat>
                    <DetailStat>
                      <DetailLabel>라이프</DetailLabel>
                      <DetailValue>{players.find(p => p.userId === viewingPlayer)?.lives}</DetailValue>
                    </DetailStat>
                    <DetailStat>
                      <DetailLabel>골드</DetailLabel>
                      <DetailValue>{players.find(p => p.userId === viewingPlayer)?.money}</DetailValue>
                    </DetailStat>
                    <DetailStat>
                      <DetailLabel>타워</DetailLabel>
                      <DetailValue>{players.find(p => p.userId === viewingPlayer)?.towers}</DetailValue>
                    </DetailStat>
                    <DetailStat>
                      <DetailLabel>레이팅</DetailLabel>
                      <DetailValue>{players.find(p => p.userId === viewingPlayer)?.rating}</DetailValue>
                    </DetailStat>
                    <DetailStat>
                      <DetailLabel>상태</DetailLabel>
                      <DetailValue>
                        {players.find(p => p.userId === viewingPlayer)?.isAlive ? '✅ 생존' : '❌ 탈락'}
                      </DetailValue>
                    </DetailStat>
                  </DetailedStats>

                  <PokemonSection>
                    <SectionTitle>배치된 포켓몬</SectionTitle>
                    {viewingPlayerTowers.length === 0 ? (
                      <EmptyMessage>아직 배치된 포켓몬이 없습니다</EmptyMessage>
                    ) : (
                      <PokemonGrid>
                        {viewingPlayerTowers.map((tower, idx) => (
                          <PokemonCard key={idx}>
                            <PokemonSprite
                              src={tower.sprite || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${tower.pokemonId}.png`}
                              alt={tower.name}
                              onError={(e) => {
                                e.currentTarget.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
                              }}
                            />
                            <PokemonInfo>
                              <PokemonName>{tower.name}</PokemonName>
                              <PokemonLevel>Lv. {tower.level}</PokemonLevel>
                            </PokemonInfo>
                          </PokemonCard>
                        ))}
                      </PokemonGrid>
                    )}
                  </PokemonSection>
                </>
              )}
            </ViewerContent>
          </ViewerModal>
        )}
      </Container>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const Container = styled.div`
  background: #1a1a2e;
  padding: 2rem;
  border-radius: 20px;
  max-width: 1400px;
  width: 95%;
  max-height: 95vh;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(255,255,255,0.1);
`;

const Title = styled.h2`
  font-size: 1.8rem;
  color: white;
  font-weight: bold;
`;

const MyGold = styled.div`
  font-size: 1.2rem;
  color: #ffd700;
  font-weight: bold;
`;

const CloseButton = styled.button`
  width: 40px;
  height: 40px;
  background: rgba(255,255,255,0.1);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.5rem;
  transition: all 0.3s;

  &:hover {
    background: rgba(255,255,255,0.2);
  }
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const PlayerBox = styled.div<{ isMe: boolean; isDead: boolean }>`
  padding: 1.5rem;
  background: ${props => props.isMe ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#2d2d44'};
  border: 3px solid ${props => props.isMe ? '#ffd700' : 'transparent'};
  border-radius: 15px;
  opacity: ${props => props.isDead ? 0.5 : 1};
  position: relative;
`;

const PlayerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const PlayerName = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
  color: white;
`;

const PlayerRating = styled.div`
  font-size: 1rem;
  color: #ffd700;
  font-weight: bold;
`;

const PlayerStats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const Stat = styled.div`
  text-align: center;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: rgba(255,255,255,0.6);
  margin-bottom: 0.25rem;
`;

const StatValue = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
  color: white;
`;

const ButtonRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
`;

const AttackButton = styled.button`
  padding: 0.75rem;
  background: #f44336;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #d32f2f;
    transform: translateY(-2px);
  }
`;

const ViewButton = styled.button`
  padding: 0.75rem;
  background: #2196F3;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #1976D2;
    transform: translateY(-2px);
  }
`;

const DefeatedBadge = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  font-weight: bold;
  color: #f44336;
  background: rgba(0,0,0,0.8);
  padding: 1rem 2rem;
  border-radius: 10px;
`;

const DebuffShop = styled.div`
  background: #2d2d44;
  padding: 1.5rem;
  border-radius: 15px;
  margin-top: 2rem;
`;

const ShopHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(255,255,255,0.1);
`;

const ShopTitle = styled.h3`
  font-size: 1.3rem;
  color: white;
  font-weight: bold;
`;

const ShopClose = styled.button`
  width: 30px;
  height: 30px;
  background: rgba(255,255,255,0.1);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s;

  &:hover {
    background: rgba(255,255,255,0.2);
  }
`;

const DebuffGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

const DebuffCard = styled.div`
  padding: 1rem;
  background: #1a1a2e;
  border-radius: 10px;
  border: 2px solid rgba(255,255,255,0.1);
`;

const DebuffName = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  color: white;
  margin-bottom: 0.5rem;
`;

const DebuffDesc = styled.div`
  font-size: 0.9rem;
  color: rgba(255,255,255,0.7);
  margin-bottom: 0.75rem;
  line-height: 1.4;
`;

const DebuffCost = styled.div`
  font-size: 1rem;
  color: #ffd700;
  font-weight: bold;
  margin-bottom: 0.75rem;
`;

const BuyButton = styled.button`
  width: 100%;
  padding: 0.5rem;
  background: #4caf50;
  color: white;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    background: #45a049;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ViewerModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #1a1a2e;
  padding: 2rem;
  border-radius: 20px;
  max-width: 800px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  z-index: 3000;
  border: 3px solid #2196F3;
`;

const ViewerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(255,255,255,0.1);
`;

const ViewerTitle = styled.h3`
  font-size: 1.5rem;
  color: white;
  font-weight: bold;
`;

const ViewerClose = styled.button`
  width: 35px;
  height: 35px;
  background: rgba(255,255,255,0.1);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.3rem;
  transition: all 0.3s;

  &:hover {
    background: rgba(255,255,255,0.2);
  }
`;

const ViewerContent = styled.div`
  color: white;
`;

const DetailedStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
`;

const DetailStat = styled.div`
  background: #2d2d44;
  padding: 1rem;
  border-radius: 10px;
  text-align: center;
`;

const DetailLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255,255,255,0.6);
  margin-bottom: 0.5rem;
`;

const DetailValue = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
`;

const PokemonSection = styled.div`
  background: #2d2d44;
  padding: 1.5rem;
  border-radius: 15px;
`;

const SectionTitle = styled.h4`
  font-size: 1.2rem;
  color: white;
  margin-bottom: 1rem;
  font-weight: bold;
`;

const PokemonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
`;

const PokemonCard = styled.div`
  background: #1a1a2e;
  padding: 0.75rem;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid rgba(76, 175, 255, 0.3);
  transition: all 0.3s;

  &:hover {
    border-color: rgba(76, 175, 255, 0.6);
    transform: translateY(-2px);
  }
`;

const PokemonSprite = styled.img`
  width: 64px;
  height: 64px;
  image-rendering: pixelated;
  margin-bottom: 0.5rem;
`;

const PokemonInfo = styled.div`
  text-align: center;
  width: 100%;
`;

const PokemonName = styled.div`
  font-size: 0.9rem;
  color: white;
  font-weight: bold;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const PokemonLevel = styled.div`
  font-size: 0.8rem;
  color: #ffd700;
  font-weight: bold;
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: rgba(255,255,255,0.5);
  padding: 2rem;
  font-size: 1rem;
`;
