// src/components/Modals/Rankings.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { databaseService } from '../../services/DatabaseService';
import { LeaderboardEntry } from '../../types/multiplayer';
import { MAPS } from '../../data/maps';
import { useTranslation } from '../../i18n';

interface RankingsProps {
  onClose: () => void;
}

export const Rankings = ({ onClose }: RankingsProps) => {
  const { t } = useTranslation();
  const [selectedMap, setSelectedMap] = useState(MAPS[0].id);
  const [sortBy, setSortBy] = useState<'clearTime' | 'highestWave'>('clearTime');
  const [rankings, setRankings] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRankings();
  }, [selectedMap, sortBy]);

  const loadRankings = async () => {
    setLoading(true);
    try {
      const [data, rank] = await Promise.all([
        databaseService.getMapLeaderboard(selectedMap, sortBy),
        databaseService.getUserRankForMap(selectedMap, sortBy)
      ]);
      setRankings(data);
      setMyRank(rank);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number | undefined) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Overlay onClick={onClose}>
      <Container onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>📊 랭킹</Title>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </Header>

        <Controls>
          <MapSelector>
            <Label>맵 선택:</Label>
            <Select value={selectedMap} onChange={(e) => setSelectedMap(e.target.value)}>
              {MAPS.map(map => (
                <option key={map.id} value={map.id}>
                  {t(`mapData.${map.id}.name`) !== `mapData.${map.id}.name` ? t(`mapData.${map.id}.name`) : map.name}
                </option>
              ))}
            </Select>
          </MapSelector>

          <SortSelector>
            <TabButton
              active={sortBy === 'clearTime'}
              onClick={() => setSortBy('clearTime')}
            >
              ⏱️ 최단 클리어
            </TabButton>
            <TabButton
              active={sortBy === 'highestWave'}
              onClick={() => setSortBy('highestWave')}
            >
              🏆 최고 Wave
            </TabButton>
          </SortSelector>
        </Controls>

        {myRank && (
          <MyRank>
            내 순위: {myRank}위
          </MyRank>
        )}

        {loading ? (
          <Loading>로딩 중...</Loading>
        ) : rankings.length === 0 ? (
          <EmptyMessage>
            아직 랭킹 데이터가 없습니다
          </EmptyMessage>
        ) : (
          <RankingList>
            <RankingHeader>
              <Rank>순위</Rank>
              <PlayerName>플레이어</PlayerName>
              <Rating>레이팅</Rating>
              <Score>{sortBy === 'clearTime' ? '클리어 시간' : '최고 Wave'}</Score>
            </RankingHeader>
            
            {rankings.map((entry, index) => (
              <RankingRow key={`${entry.userId}_${entry.mapId}`}>
                <Rank>
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && `${index + 1}위`}
                </Rank>
                <PlayerName>{entry.userName}</PlayerName>
                <Rating>⭐ {entry.rating}</Rating>
                <Score>
                  {sortBy === 'clearTime' 
                    ? formatTime(entry.clearTime) 
                    : `Wave ${entry.highestWave}`}
                </Score>
              </RankingRow>
            ))}
          </RankingList>
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
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Container = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  border-radius: 20px;
  max-width: 900px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(255,255,255,0.2);
`;

const Title = styled.h2`
  font-size: 2rem;
  color: white;
  font-weight: bold;
`;

const CloseButton = styled.button`
  width: 40px;
  height: 40px;
  background: rgba(255,255,255,0.2);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.5rem;
  transition: all 0.3s;

  &:hover {
    background: rgba(255,255,255,0.3);
  }
`;

const Controls = styled.div`
  margin-bottom: 1.5rem;
`;

const MapSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Label = styled.label`
  color: white;
  font-weight: bold;
`;

const Select = styled.select`
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: none;
  font-size: 1rem;
  cursor: pointer;
`;

const SortSelector = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const TabButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 0.75rem;
  background: ${props => props.active ? 'white' : 'rgba(255,255,255,0.2)'};
  color: ${props => props.active ? '#667eea' : 'white'};
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: ${props => props.active ? 'white' : 'rgba(255,255,255,0.3)'};
  }
`;

const MyRank = styled.div`
  text-align: center;
  background: rgba(255,255,255,0.2);
  padding: 1rem;
  border-radius: 10px;
  color: white;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
`;

const Loading = styled.div`
  text-align: center;
  color: white;
  font-size: 1.2rem;
  padding: 3rem;
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: white;
  font-size: 1.1rem;
  padding: 3rem;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
`;

const RankingList = styled.div`
  background: white;
  border-radius: 15px;
  overflow: hidden;
`;

const RankingHeader = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr 150px 200px;
  gap: 1rem;
  padding: 1rem;
  background: #f5f5f5;
  font-weight: bold;
  color: #333;
  border-bottom: 2px solid #ddd;
`;

const RankingRow = styled.div`
  display: grid;
  grid-template-columns: 100px 1fr 150px 200px;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  transition: all 0.3s;

  &:hover {
    background: #f9f9f9;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const Rank = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  color: #667eea;
`;

const PlayerName = styled.div`
  font-size: 1rem;
  color: #333;
`;

const Rating = styled.div`
  font-size: 1rem;
  color: #666;
`;

const Score = styled.div`
  font-size: 1rem;
  font-weight: bold;
  color: #333;
  text-align: right;
`;
