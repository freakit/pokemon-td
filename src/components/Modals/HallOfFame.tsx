// src/components/Modals/HallOfFame.tsx
import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { databaseService } from '../../services/DatabaseService';
import { HallOfFameEntry, LeaderboardEntry } from '../../types/multiplayer';
import { MAPS } from '../../data/maps';
import { authService } from '../../services/AuthService';

type ViewTab = 'global_clear' | 'global_wave' | 'mine';
type MapFilter = 'all' | string;

interface HallOfFameProps {
  onClose: () => void;
}

const MEDAL = ['🥇', '🥈', '🥉'];

const formatTime = (ms: number | undefined) => {
  if (!ms) return '-';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}분 ${sec.toString().padStart(2, '0')}초`;
};

const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export const HallOfFame = ({ onClose }: HallOfFameProps) => {
  const [tab, setTab] = useState<ViewTab>('global_clear');
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');
  const [globalClearEntries, setGlobalClearEntries] = useState<HallOfFameEntry[]>([]);
  const [globalWaveEntries, setGlobalWaveEntries] = useState<LeaderboardEntry[]>([]);
  const [myEntries, setMyEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const user = authService.getCurrentUser();
  const selectedMapId = mapFilter === 'all' ? undefined : mapFilter;

  useEffect(() => {
    load();
  }, [tab, mapFilter]);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'global_clear') {
        const data = await databaseService.getGlobalHallOfFame(selectedMapId, 'clearTime');
        setGlobalClearEntries(data);
      } else if (tab === 'global_wave') {
        const data = await databaseService.getGlobalHighestWave(selectedMapId);
        setGlobalWaveEntries(data);
      } else {
        const data = await databaseService.getUserHallOfFame();
        setMyEntries(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Overlay onClick={onClose}>
      <Container onClick={e => e.stopPropagation()}>

        {/* ── 헤더 ── */}
        <Header>
          <TitleRow>
            <Title>👑 전당등록</Title>
            <CloseBtn onClick={onClose}>✕</CloseBtn>
          </TitleRow>

          {/* ── 탭 ── */}
          <TabRow>
            <Tab $active={tab === 'global_clear'} onClick={() => setTab('global_clear')}>
              ⏱️ 최단 클리어
            </Tab>
            <Tab $active={tab === 'global_wave'} onClick={() => setTab('global_wave')}>
              🏔️ 최고 웨이브
            </Tab>
            <Tab $active={tab === 'mine'} onClick={() => setTab('mine')}>
              👤 내 기록
            </Tab>
          </TabRow>

          {/* ── 맵 필터 (내 기록 탭 제외) ── */}
          {tab !== 'mine' && (
            <MapFilterRow>
              <FilterChip $active={mapFilter === 'all'} onClick={() => setMapFilter('all')}>
                전체 맵
              </FilterChip>
              {MAPS.map(m => (
                <FilterChip
                  key={m.id}
                  $active={mapFilter === m.id}
                  onClick={() => setMapFilter(m.id)}
                >
                  {m.name}
                </FilterChip>
              ))}
            </MapFilterRow>
          )}
        </Header>

        {/* ── 콘텐츠 ── */}
        <Body>
          {loading ? (
            <CenterMsg>⏳ 로딩 중...</CenterMsg>
          ) : tab === 'global_clear' ? (
            <GlobalClearList entries={globalClearEntries} myUid={user?.uid} />
          ) : tab === 'global_wave' ? (
            <GlobalWaveList entries={globalWaveEntries} myUid={user?.uid} />
          ) : (
            <MyRecordList entries={myEntries} />
          )}
        </Body>

      </Container>
    </Overlay>
  );
};

// ─── 전체 클리어 시간 랭킹 ──────────────────────────────────────────────────

const GlobalClearList = ({
  entries, myUid,
}: { entries: HallOfFameEntry[]; myUid?: string }) => {
  if (entries.length === 0) return <EmptyMsg>🏜️ 아직 클리어 기록이 없습니다.</EmptyMsg>;

  return (
    <Table>
      <thead>
        <tr>
          <Th>순위</Th>
          <Th>플레이어</Th>
          <Th>맵</Th>
          <Th>⏱️ 클리어 시간</Th>
          <Th>포켓몬</Th>
          <Th>날짜</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <Tr key={e.id} $isMe={e.userId === myUid} $rank={i}>
            <Td center>{MEDAL[i] ?? `${i + 1}위`}</Td>
            <Td bold>{e.userName}</Td>
            <Td>{e.mapName}</Td>
            <Td bold accent>{formatTime(e.clearTime)}</Td>
            <PokemonCell>
              {e.pokemonUsed.slice(0, 6).map((name, j) => (
                <PokemonTag key={j}>{name}</PokemonTag>
              ))}
            </PokemonCell>
            <Td small>{formatDate(e.timestamp)}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
};

// ─── 전체 최고 웨이브 랭킹 ──────────────────────────────────────────────────

const GlobalWaveList = ({
  entries, myUid,
}: { entries: LeaderboardEntry[]; myUid?: string }) => {
  if (entries.length === 0) return <EmptyMsg>🏜️ 아직 기록이 없습니다.</EmptyMsg>;

  return (
    <Table>
      <thead>
        <tr>
          <Th>순위</Th>
          <Th>플레이어</Th>
          <Th>맵</Th>
          <Th>🌊 최고 웨이브</Th>
          <Th>⏱️ 클리어 시간</Th>
          <Th>⭐ 레이팅</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <Tr key={`${e.userId}_${e.mapId}`} $isMe={e.userId === myUid} $rank={i}>
            <Td center>{MEDAL[i] ?? `${i + 1}위`}</Td>
            <Td bold>{e.userName}</Td>
            <Td>{e.mapId}</Td>
            <WaveCell>{e.highestWave}</WaveCell>
            <Td>{formatTime(e.clearTime)}</Td>
            <Td>{e.rating}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
};

// ─── 내 기록 ─────────────────────────────────────────────────────────────────

const MyRecordList = ({ entries }: { entries: HallOfFameEntry[] }) => {
  if (entries.length === 0)
    return (
      <EmptyMsg>
        아직 클리어 기록이 없습니다.<br />
        웨이브 50을 클리어하면 이곳에 기록됩니다! 👑
      </EmptyMsg>
    );

  return (
    <CardGrid>
      {entries.map(e => (
        <RecordCard key={e.id}>
          <CardTop>
            <MapBadge>{e.mapName}</MapBadge>
            <WaveBadge>Wave {e.wave}</WaveBadge>
          </CardTop>
          <TimeRow>⏱️ {formatTime(e.clearTime)}</TimeRow>
          <PokemonSection>
            <SectionLabel>사용한 포켓몬</SectionLabel>
            <PokemonGrid>
              {e.pokemonUsed.map((name, i) => (
                <PokemonTag key={i}>{name}</PokemonTag>
              ))}
            </PokemonGrid>
          </PokemonSection>
          <DateRow>{formatDate(e.timestamp)}</DateRow>
        </RecordCard>
      ))}
    </CardGrid>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const fadeIn = keyframes`from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}`;

const Overlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.82);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
`;

const Container = styled.div`
  background: linear-gradient(160deg, #0f1e35 0%, #1a1040 100%);
  border: 1px solid rgba(255,215,0,0.25);
  border-radius: 20px;
  width: 90%; max-width: 1000px;
  max-height: 90vh;
  display: flex; flex-direction: column;
  animation: ${fadeIn} 0.25s ease-out;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 20px 24px 0;
  background: linear-gradient(135deg, rgba(212,175,55,0.12), transparent);
  border-bottom: 1px solid rgba(255,215,0,0.15);
`;

const TitleRow = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px;
`;

const Title = styled.h2`
  font-size: 1.6rem; font-weight: bold;
  color: #FFD700;
  text-shadow: 0 0 20px rgba(255,215,0,0.5);
`;

const CloseBtn = styled.button`
  width: 36px; height: 36px;
  background: rgba(255,255,255,0.1); color: white;
  border: none; border-radius: 50%; cursor: pointer;
  font-size: 1.2rem; transition: background 0.2s;
  &:hover { background: rgba(255,255,255,0.2); }
`;

const TabRow = styled.div`
  display: flex; gap: 4px; margin-bottom: 10px;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 8px 18px; font-size: 14px; font-weight: bold;
  border: none; border-radius: 10px 10px 0 0; cursor: pointer;
  transition: all 0.2s;
  background: ${p => p.$active ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.06)'};
  color: ${p => p.$active ? '#FFD700' : 'rgba(255,255,255,0.5)'};
  border-bottom: ${p => p.$active ? '2px solid #FFD700' : '2px solid transparent'};
  &:hover { background: rgba(255,215,0,0.12); color: #FFD700; }
`;

const MapFilterRow = styled.div`
  display: flex; gap: 6px; flex-wrap: wrap; padding-bottom: 12px;
`;

const FilterChip = styled.button<{ $active: boolean }>`
  padding: 4px 12px; font-size: 12px; border-radius: 20px; cursor: pointer;
  border: 1px solid ${p => p.$active ? '#FFD700' : 'rgba(255,255,255,0.2)'};
  background: ${p => p.$active ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.05)'};
  color: ${p => p.$active ? '#FFD700' : 'rgba(255,255,255,0.6)'};
  transition: all 0.2s;
  &:hover { border-color: #FFD700; color: #FFD700; }
`;

const Body = styled.div`
  flex: 1; overflow-y: auto; padding: 16px 24px 24px;
`;

const CenterMsg = styled.div`
  text-align: center; color: rgba(255,255,255,0.6);
  padding: 60px 0; font-size: 1.1rem;
`;

const EmptyMsg = styled.div`
  text-align: center; color: rgba(255,255,255,0.5);
  padding: 60px 20px; font-size: 1rem; line-height: 1.8;
`;

// 테이블
const Table = styled.table`
  width: 100%; border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left; padding: 10px 12px;
  font-size: 12px; font-weight: bold;
  color: rgba(255,215,0,0.7);
  border-bottom: 1px solid rgba(255,215,0,0.15);
`;

const Tr = styled.tr<{ $isMe?: boolean; $rank?: number }>`
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: ${p =>
    p.$isMe ? 'rgba(255,215,0,0.08)' :
    p.$rank === 0 ? 'rgba(255,215,0,0.05)' :
    p.$rank === 1 ? 'rgba(192,192,192,0.05)' :
    p.$rank === 2 ? 'rgba(205,127,50,0.05)' : 'transparent'};
  transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.06); }
`;

const Td = styled.td<{ center?: boolean; bold?: boolean; accent?: boolean; small?: boolean }>`
  padding: 10px 12px;
  font-size: ${p => p.small ? '11px' : '13px'};
  color: ${p => p.accent ? '#4fc3f7' : 'rgba(255,255,255,0.85)'};
  font-weight: ${p => p.bold ? 'bold' : 'normal'};
  text-align: ${p => p.center ? 'center' : 'left'};
`;

const PokemonCell = styled.td`
  padding: 8px 12px;
  display: flex; flex-wrap: wrap; gap: 4px; align-items: center;
`;

const WaveCell = styled.td`
  padding: 10px 12px;
  font-size: 18px; font-weight: bold; color: #FFD700;
`;

const PokemonTag = styled.span`
  font-size: 11px; padding: 2px 8px;
  background: rgba(76,175,255,0.15);
  border: 1px solid rgba(76,175,255,0.3);
  border-radius: 10px; color: #4cafff;
  white-space: nowrap;
`;

// 내 기록 카드
const CardGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
`;

const RecordCard = styled.div`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,215,0,0.2);
  border-radius: 14px; padding: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(255,215,0,0.15); }
`;

const CardTop = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
`;

const MapBadge = styled.div`
  font-size: 13px; font-weight: bold; color: #e8edf3;
`;

const WaveBadge = styled.div`
  font-size: 13px; font-weight: bold; color: #FFD700;
  background: rgba(255,215,0,0.12);
  padding: 2px 10px; border-radius: 12px;
`;

const TimeRow = styled.div`
  font-size: 15px; font-weight: bold; color: #4fc3f7;
  margin-bottom: 12px;
`;

const PokemonSection = styled.div``;

const SectionLabel = styled.div`
  font-size: 11px; color: rgba(255,255,255,0.4);
  margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;
`;

const PokemonGrid = styled.div`
  display: flex; flex-wrap: wrap; gap: 4px;
`;

const DateRow = styled.div`
  margin-top: 12px; font-size: 11px; color: rgba(255,255,255,0.3);
  text-align: right;
`;