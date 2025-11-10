// src/components/Multiplayer/MultiplayerGameOverModal.tsx
import styled from 'styled-components';
import { PlayerGameState } from '../../types/multiplayer';

interface MultiplayerGameOverModalProps {
  players: PlayerGameState[];
  myUserId: string;
  onClose: () => void;
}

export const MultiplayerGameOverModal = ({ 
  players, 
  myUserId, 
  onClose 
}: MultiplayerGameOverModalProps) => {
  // 플레이어를 순위별로 정렬
  const sortedPlayers = [...players].sort((a, b) => {
    // 생존자가 먼저
    if (a.isAlive && !b.isAlive) return -1;
    if (!a.isAlive && b.isAlive) return 1;
    // 둘 다 탈락했으면 placement로 정렬
    if (!a.isAlive && !b.isAlive) {
      return (a.placement || 999) - (b.placement || 999);
    }
    // 둘 다 생존이면 웨이브로 정렬
    return b.wave - a.wave;
  });

  const myPlayer = sortedPlayers.find(p => p.userId === myUserId);
  const myPlacement = sortedPlayers.findIndex(p => p.userId === myUserId) + 1;

  return (
    <Overlay>
      <Modal>
        <Header>
          <Title>게임 종료!</Title>
          <MyPlacement placement={myPlacement}>
            {myPlacement === 1 ? '🏆' : myPlacement === 2 ? '🥈' : myPlacement === 3 ? '🥉' : '📊'} 
            {myPlacement}등
          </MyPlacement>
        </Header>

        <ResultsTable>
          <TableHeader>
            <HeaderCell>순위</HeaderCell>
            <HeaderCell>플레이어</HeaderCell>
            <HeaderCell>웨이브</HeaderCell>
            <HeaderCell>레이팅</HeaderCell>
            <HeaderCell>변화</HeaderCell>
          </TableHeader>

          {sortedPlayers.map((player, index) => {
            const isMe = player.userId === myUserId;
            const placement = index + 1;
            const ratingChange = player.ratingChange || 0;

            return (
              <PlayerRow key={player.userId} isMe={isMe}>
                <Cell>
                  <Rank placement={placement}>
                    {placement === 1 ? '🏆' : placement === 2 ? '🥈' : placement === 3 ? '🥉' : `${placement}위`}
                  </Rank>
                </Cell>
                <Cell>
                  <PlayerName>{player.userName}</PlayerName>
                </Cell>
                <Cell>
                  <Wave>{player.wave} 웨이브</Wave>
                </Cell>
                <Cell>
                  <Rating>{player.rating}</Rating>
                </Cell>
                <Cell>
                  <RatingChange positive={ratingChange >= 0}>
                    {ratingChange >= 0 ? '+' : ''}{ratingChange}
                  </RatingChange>
                </Cell>
              </PlayerRow>
            );
          })}
        </ResultsTable>

        {myPlayer && (
          <Summary>
            <SummaryTitle>내 전적</SummaryTitle>
            <SummaryStats>
              <SummaryStat>
                <StatLabel>최종 웨이브</StatLabel>
                <StatValue>{myPlayer.wave}</StatValue>
              </SummaryStat>
              <SummaryStat>
                <StatLabel>남은 라이프</StatLabel>
                <StatValue>{myPlayer.lives}</StatValue>
              </SummaryStat>
              <SummaryStat>
                <StatLabel>배치 타워</StatLabel>
                <StatValue>{myPlayer.towers}</StatValue>
              </SummaryStat>
              <SummaryStat>
                <StatLabel>남은 골드</StatLabel>
                <StatValue>{myPlayer.money}</StatValue>
              </SummaryStat>
            </SummaryStats>
          </Summary>
        )}

        <ButtonRow>
          <BackButton onClick={onClose}>
            메인 메뉴로
          </BackButton>
        </ButtonRow>
      </Modal>
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
  z-index: 9999;
  animation: fadeIn 0.5s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Modal = styled.div`
  background: linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%);
  border-radius: 32px;
  padding: 3rem;
  max-width: 900px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  border: 3px solid rgba(76, 175, 255, 0.4);
  box-shadow: 0 25px 80px rgba(76, 175, 255, 0.4), 0 0 100px rgba(76, 175, 255, 0.2);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid rgba(255,255,255,0.1);
`;

const Title = styled.h2`
  font-size: 2.5rem;
  color: white;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(76, 175, 255, 0.6);
`;

const MyPlacement = styled.div<{ placement: number }>`
  font-size: 2rem;
  font-weight: bold;
  color: ${props => {
    if (props.placement === 1) return '#FFD700';
    if (props.placement === 2) return '#C0C0C0';
    if (props.placement === 3) return '#CD7F32';
    return '#4cafff';
  }};
  text-shadow: 0 0 15px ${props => {
    if (props.placement === 1) return 'rgba(255, 215, 0, 0.6)';
    if (props.placement === 2) return 'rgba(192, 192, 192, 0.6)';
    if (props.placement === 3) return 'rgba(205, 127, 50, 0.6)';
    return 'rgba(76, 175, 255, 0.6)';
  }};
`;

const ResultsTable = styled.div`
  margin-bottom: 2rem;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr 1.5fr 1.5fr 1.5fr;
  gap: 1rem;
  padding: 1rem;
  background: rgba(76, 175, 255, 0.1);
  border-radius: 10px 10px 0 0;
  border: 2px solid rgba(76, 175, 255, 0.3);
  border-bottom: none;
`;

const HeaderCell = styled.div`
  font-size: 0.9rem;
  color: rgba(255,255,255,0.7);
  font-weight: bold;
  text-align: center;
`;

const PlayerRow = styled.div<{ isMe: boolean }>`
  display: grid;
  grid-template-columns: 1fr 2fr 1.5fr 1.5fr 1.5fr;
  gap: 1rem;
  padding: 1.25rem 1rem;
  background: ${props => props.isMe ? 'linear-gradient(90deg, rgba(76, 175, 255, 0.2), rgba(76, 175, 255, 0.05))' : 'rgba(255,255,255,0.02)'};
  border: 2px solid ${props => props.isMe ? 'rgba(76, 175, 255, 0.4)' : 'rgba(255,255,255,0.1)'};
  border-top: none;
  transition: all 0.3s;

  &:hover {
    background: ${props => props.isMe ? 'linear-gradient(90deg, rgba(76, 175, 255, 0.3), rgba(76, 175, 255, 0.1))' : 'rgba(255,255,255,0.05)'};
  }

  &:last-child {
    border-radius: 0 0 10px 10px;
  }
`;

const Cell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Rank = styled.div<{ placement: number }>`
  font-size: 1.3rem;
  font-weight: bold;
  color: ${props => {
    if (props.placement === 1) return '#FFD700';
    if (props.placement === 2) return '#C0C0C0';
    if (props.placement === 3) return '#CD7F32';
    return 'white';
  }};
`;

const PlayerName = styled.div`
  font-size: 1.1rem;
  color: white;
  font-weight: 600;
`;

const Wave = styled.div`
  font-size: 1rem;
  color: rgba(255,255,255,0.9);
`;

const Rating = styled.div`
  font-size: 1.1rem;
  color: #ffd700;
  font-weight: bold;
`;

const RatingChange = styled.div<{ positive: boolean }>`
  font-size: 1.1rem;
  font-weight: bold;
  color: ${props => props.positive ? '#4caf50' : '#f44336'};
`;

const Summary = styled.div`
  background: rgba(76, 175, 255, 0.05);
  border: 2px solid rgba(76, 175, 255, 0.3);
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 2rem;
`;

const SummaryTitle = styled.h3`
  font-size: 1.3rem;
  color: white;
  margin-bottom: 1rem;
  font-weight: bold;
`;

const SummaryStats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
`;

const SummaryStat = styled.div`
  text-align: center;
  padding: 1rem;
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: rgba(255,255,255,0.6);
  margin-bottom: 0.5rem;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  color: white;
  font-weight: bold;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
`;

const BackButton = styled.button`
  padding: 1rem 3rem;
  font-size: 1.2rem;
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  color: white;
  border: 3px solid rgba(46, 204, 113, 0.4);
  border-radius: 15px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 8px 32px rgba(46, 204, 113, 0.5);
  transition: all 0.3s;

  &:hover {
    background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(46, 204, 113, 0.6);
  }
`;
