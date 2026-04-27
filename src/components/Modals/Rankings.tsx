// src/components/Modals/Rankings.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { media } from '../../utils/responsive.utils';
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
          <Title>{t('rankings.title')}</Title>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </Header>

        <Controls>
          <MapSelector>
            <Label>{t('rankings.mapLabel')}</Label>
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
              ⏱️ {t('rankings.tabClearTime')}
            </TabButton>
            <TabButton
              active={sortBy === 'highestWave'}
              onClick={() => setSortBy('highestWave')}
            >
              🏆 {t('rankings.tabHighestWave')}
            </TabButton>
          </SortSelector>
        </Controls>

        {myRank && (
          <MyRank>
            {t('rankings.myRank', { rank: myRank })}
          </MyRank>
        )}

        {loading ? (
          <Loading>{t('rankings.loading')}</Loading>
        ) : rankings.length === 0 ? (
          <EmptyMessage>
            {t('rankings.empty')}
          </EmptyMessage>
        ) : (
          <RankingList>
            <RankingHeader>
              <Rank>{t('rankings.colRank')}</Rank>
              <PlayerName>{t('rankings.colPlayer')}</PlayerName>
              <Rating>{t('rankings.colRating')}</Rating>
              <Score>{sortBy === 'clearTime' ? t('rankings.colClearTime') : t('rankings.colHighestWave')}</Score>
            </RankingHeader>
            
            {rankings.map((entry, index) => (
              <RankingRow key={`${entry.userId}_${entry.mapId}`}>
                <Rank>
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && t('rankings.rankSuffix', { rank: index + 1 })}
                </Rank>
                <PlayerName>{entry.userName}</PlayerName>
                <Rating>⭐ {entry.rating}</Rating>
                <Score>
                  {sortBy === 'clearTime'
                    ? formatTime(entry.clearTime)
                    : t('rankings.waveSuffix', { wave: entry.highestWave })}
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
  background: #1e1f26;
  padding: 1.5rem 2rem;
  border-radius: 12px;
  max-width: 800px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5);
  position: relative;
  ${media.mobile} {
    padding: 1rem;
    width: 95%;
    border-radius: 8px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const Title = styled.h2`
  font-size: 1.8rem;
  color: #fff;
  font-weight: 700;
  letter-spacing: -0.5px;
  ${media.mobile} {
    font-size: 1.3rem;
  }
`;

const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.05);
  color: #a0a0a0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;

  @media (hover: hover) {
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  }
`;

const Controls = styled.div`
  margin-bottom: 1rem;
  ${media.mobile} {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
`;

const MapSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  ${media.mobile} {
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  color: white;
  font-weight: bold;
`;

const Select = styled.select`
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  background: #2a2c35;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 0.95rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;

  @media (hover: hover) {
    &:hover { border-color: rgba(255, 255, 255, 0.2); }
  }
  ${media.mobile} {
    width: 100%;
    flex: 1;
  }
`;

const SortSelector = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const TabButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 0.6rem;
  background: ${props => props.active ? 'rgba(102, 126, 234, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.active ? '#8a9cff' : '#a0a0a0'};
  font-weight: 600;
  border: 1px solid ${props => props.active ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  font-size: 0.95rem;

  @media (hover: hover) {
    &:hover {
      background: ${props => props.active ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255, 255, 255, 0.08)'};
      color: ${props => props.active ? '#8a9cff' : '#fff'};
    }
  }
`;

const MyRank = styled.div`
  text-align: center;
  background: rgba(102, 126, 234, 0.1);
  padding: 0.8rem;
  border-radius: 8px;
  color: #8a9cff;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1.2rem;
  border: 1px solid rgba(102, 126, 234, 0.2);
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
  background: #14151a;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const RankingHeader = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 140px 160px;
  gap: 1rem;
  padding: 0.8rem 1.2rem;
  background: rgba(255, 255, 255, 0.03);
  font-weight: 600;
  color: #888;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  ${media.tablet} {
    grid-template-columns: 50px 1fr 100px 110px;
    gap: 0.5rem;
    padding: 0.8rem;
    font-size: 0.75rem;
  }
  ${media.mobile} {
    grid-template-columns: 40px 1fr 80px;
    gap: 0.4rem;
    padding: 0.6rem 0.8rem;
    font-size: 0.7rem;
  }
`;

const RankingRow = styled.div`
  display: grid;
  grid-template-columns: 80px 1fr 140px 160px;
  gap: 1rem;
  padding: 0.8rem 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  transition: background 0.2s;
  align-items: center;

  @media (hover: hover) {
    &:hover { background: rgba(255, 255, 255, 0.02); }
  }

  &:last-child {
    border-bottom: none;
  }
  ${media.tablet} {
    grid-template-columns: 50px 1fr 100px 110px;
    gap: 0.5rem;
    padding: 0.8rem;
  }
  ${media.mobile} {
    grid-template-columns: 40px 1fr 80px;
    gap: 0.4rem;
    padding: 0.6rem 0.8rem;
  }
`;

const Rank = styled.div`
  font-size: 1.05rem;
  font-weight: 700;
  color: #a0a0a0;
`;

const PlayerName = styled.div`
  font-size: 1rem;
  color: #e0e0e0;
  font-weight: 500;
`;

const Rating = styled.div`
  font-size: 0.95rem;
  color: #f1c40f;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 500;
  ${media.mobile} {
    display: none;
  }
`;

const Score = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  text-align: right;
  font-variant-numeric: tabular-nums;
`;