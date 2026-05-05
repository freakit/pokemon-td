// src/components/modals/Rankings.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { lMedia, media } from '../../utils/responsive.utils';
import { databaseService, APRankingEntry } from '../../services/DatabaseService';
import { LeaderboardEntry } from '../../types/multiplayer';
import { MAPS } from '../../data/maps';
import { useTranslation } from '../../i18n';
import {
  ModalOverlay, ModalBox, ModalHeader, ModalTitle, ModalCloseBtn,
  ModalBody, ModalSectionPad, MODAL_ACCENT,
} from '../shared/modal.styles';

type MainTab = 'map' | 'ap';

interface RankingsProps { onClose: () => void; }

export const Rankings = ({ onClose }: RankingsProps) => {
  const { t } = useTranslation();

  // ── 메인 탭 ──
  const [mainTab, setMainTab] = useState<MainTab>('map');

  // ── 맵 랭킹 상태 ──
  const [selectedMap, setSelectedMap] = useState(MAPS[0].id);
  const [sortBy, setSortBy] = useState<'clearTime' | 'highestWave'>('clearTime');
  const [mapRankings, setMapRankings] = useState<LeaderboardEntry[]>([]);
  const [myMapRank, setMyMapRank] = useState<number | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  // ── AP 랭킹 상태 ──
  const [apRankings, setApRankings] = useState<APRankingEntry[]>([]);
  const [myApRank, setMyApRank] = useState<number | null>(null);
  const [apLoading, setApLoading] = useState(false);

  useEffect(() => {
    if (mainTab === 'map') loadMapRankings();
  }, [selectedMap, sortBy, mainTab]);

  useEffect(() => {
    if (mainTab === 'ap') loadApRankings();
  }, [mainTab]);

  const loadMapRankings = async () => {
    setMapLoading(true);
    try {
      const [data, rank] = await Promise.all([
        databaseService.getMapLeaderboard(selectedMap, sortBy),
        databaseService.getUserRankForMap(selectedMap, sortBy),
      ]);
      setMapRankings(data);
      setMyMapRank(rank);
    } catch (err) { console.error(err); }
    finally { setMapLoading(false); }
  };

  const loadApRankings = async () => {
    setApLoading(true);
    try {
      const [data, rank] = await Promise.all([
        databaseService.getAPRanking(100),
        databaseService.getMyAPRank(),
      ]);
      setApRankings(data);
      setMyApRank(rank);
    } catch (err) { console.error(err); }
    finally { setApLoading(false); }
  };

  const formatTime = (ms: number | undefined) => {
    if (!ms) return '-';
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalBox $size="md" $accent={MODAL_ACCENT.cyan} onClick={(e) => e.stopPropagation()}>

        <ModalHeader>
          <ModalTitle>🏆 {t('rankings.title')}</ModalTitle>
          <ModalCloseBtn onClick={onClose}>✕</ModalCloseBtn>
        </ModalHeader>

        {/* ── 메인 탭 ── */}
        <MainTabRow>
          <MainTabBtn $active={mainTab === 'map'} onClick={() => setMainTab('map')}>
            🗺️ {t('rankings.tabMap') ?? '맵 기록'}
          </MainTabBtn>
          <MainTabBtn $active={mainTab === 'ap'} onClick={() => setMainTab('ap')}>
            ⭐ {t('rankings.tabAP') ?? 'AP 랭킹'}
          </MainTabBtn>
        </MainTabRow>

        {/* ══ 맵 랭킹 탭 ══ */}
        {mainTab === 'map' && (
          <>
            <ModalSectionPad>
              <Controls>
                <MapRow>
                  <ControlLabel>{t('rankings.mapLabel')}</ControlLabel>
                  <StyledSelect value={selectedMap} onChange={(e) => setSelectedMap(e.target.value)}>
                    {MAPS.map(map => (
                      <option key={map.id} value={map.id}>
                        {t(`mapData.${map.id}.name`) !== `mapData.${map.id}.name`
                          ? t(`mapData.${map.id}.name`) : map.name}
                      </option>
                    ))}
                  </StyledSelect>
                </MapRow>
                <SortRow>
                  <SortBtn $active={sortBy === 'clearTime'} onClick={() => setSortBy('clearTime')}>
                    ⏱️ {t('rankings.tabClearTime')}
                  </SortBtn>
                  <SortBtn $active={sortBy === 'highestWave'} onClick={() => setSortBy('highestWave')}>
                    🌊 {t('rankings.tabHighestWave')}
                  </SortBtn>
                </SortRow>
              </Controls>
              {myMapRank && (
                <MyRankBadge>🎯 {t('rankings.myRank', { rank: myMapRank })}</MyRankBadge>
              )}
            </ModalSectionPad>

            <ModalBody>
              {mapLoading ? (
                <StatusMsg>{t('rankings.loading')}</StatusMsg>
              ) : mapRankings.length === 0 ? (
                <StatusMsg $dimmed>{t('rankings.empty')}</StatusMsg>
              ) : (
                <RankingTable>
                  <TableHead>
                    <ColRank>{t('rankings.colRank')}</ColRank>
                    <ColPlayer>{t('rankings.colPlayer')}</ColPlayer>
                    <ColRating>{t('rankings.colRating')}</ColRating>
                    <ColScore>
                      {sortBy === 'clearTime' ? t('rankings.colClearTime') : t('rankings.colHighestWave')}
                    </ColScore>
                  </TableHead>
                  {mapRankings.map((entry, index) => (
                    <TableRow key={`${entry.userId}_${entry.mapId}`} $top={index < 3}>
                      <ColRank $idx={index}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉'
                          : t('rankings.rankSuffix', { rank: index + 1 })}
                      </ColRank>
                      <ColPlayer>{entry.userName}</ColPlayer>
                      <ColRating>⭐ {entry.rating}</ColRating>
                      <ColScore $accent>
                        {sortBy === 'clearTime' ? formatTime(entry.clearTime) : t('rankings.waveSuffix', { wave: entry.highestWave })}
                      </ColScore>
                    </TableRow>
                  ))}
                </RankingTable>
              )}
            </ModalBody>
          </>
        )}

        {/* ══ AP 랭킹 탭 ══ */}
        {mainTab === 'ap' && (
          <>
            {myApRank && (
              <ModalSectionPad>
                <MyRankBadge>🎯 {t('rankings.myRank', { rank: myApRank })}</MyRankBadge>
              </ModalSectionPad>
            )}
            <ModalBody>
              {apLoading ? (
                <StatusMsg>{t('rankings.loading')}</StatusMsg>
              ) : apRankings.length === 0 ? (
                <StatusMsg $dimmed>{t('rankings.empty')}</StatusMsg>
              ) : (
                <RankingTable>
                  <TableHead>
                    <ColRank>{t('rankings.colRank')}</ColRank>
                    <ColPlayer>{t('rankings.colPlayer')}</ColPlayer>
                    <ColRating>{t('rankings.colAchCount') ?? '달성 수'}</ColRating>
                    <ColScore>{t('rankings.colAP') ?? 'AP'}</ColScore>
                  </TableHead>
                  {apRankings.map((entry, index) => (
                    <TableRow key={entry.userId} $top={index < 3}>
                      <ColRank $idx={index}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉'
                          : t('rankings.rankSuffix', { rank: index + 1 })}
                      </ColRank>
                      <ColPlayer>{entry.userName ?? '???'}</ColPlayer>
                      <ColRating>🏅 {entry.achievementCount}</ColRating>
                      <ColScore $accent>{entry.totalAP.toLocaleString()} AP</ColScore>
                    </TableRow>
                  ))}
                </RankingTable>
              )}
            </ModalBody>
          </>
        )}

      </ModalBox>
    </ModalOverlay>
  );
};

// ─── Local Styled Components ──────────────────────────────────────────────────

const MainTabRow = styled.div`
  display: flex; gap: 0;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
`;

const MainTabBtn = styled.button<{ $active: boolean }>`
  flex: 1; padding: 12px;
  background: ${p => p.$active ? 'rgba(79,195,247,0.10)' : 'transparent'};
  color: ${p => p.$active ? '#4fc3f7' : 'rgba(255,255,255,0.4)'};
  font-weight: 700; font-size: 14px;
  border: none;
  border-bottom: 2px solid ${p => p.$active ? '#4fc3f7' : 'transparent'};
  cursor: pointer; transition: all 0.2s;
  @media (hover:hover) { &:hover { background: rgba(79,195,247,0.06); color: #4fc3f7; } }
  ${media.mobile} { font-size: 13px; padding: 10px; }
`;

const Controls = styled.div`
  display: flex; flex-direction: column; gap: 10px;
  ${media.mobile} { gap: 7px; }
`;

const MapRow = styled.div`
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
`;

const ControlLabel = styled.label`
  font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.5); white-space: nowrap;
`;

const StyledSelect = styled.select`
  flex: 1; min-width: 0; padding: 7px 12px; border-radius: 8px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: #fff; font-size: 13px; cursor: pointer; outline: none;
  option { background: #1a2032; }
  @media (hover:hover) { &:hover { border-color: rgba(255,255,255,0.22); } }
`;

const SortRow = styled.div`display:flex;gap:8px;`;

const SortBtn = styled.button<{ $active: boolean }>`
  flex:1; padding: 8px 12px;
  background: ${p => p.$active ? 'rgba(79,195,247,0.14)' : 'rgba(255,255,255,0.04)'};
  color: ${p => p.$active ? '#4fc3f7' : 'rgba(255,255,255,0.45)'};
  font-weight: 700; font-size: 13px;
  border: 1px solid ${p => p.$active ? 'rgba(79,195,247,0.40)' : 'rgba(255,255,255,0.08)'};
  border-radius: 8px; cursor: pointer; transition: background 0.2s, color 0.2s;
  @media (hover:hover) { &:hover { background: rgba(79,195,247,0.12); color: #4fc3f7; } }
  ${media.mobile} { font-size: 12px; padding: 6px 8px; }
`;

const MyRankBadge = styled.div`
  display: flex; align-items: center; gap: 8px;
  margin-top: 10px; padding: 9px 14px;
  background: rgba(79,195,247,0.08); border: 1px solid rgba(79,195,247,0.22);
  border-radius: 8px; color: #4fc3f7; font-size: 14px; font-weight: 700;
  ${media.mobile} { font-size: 13px; padding: 7px 12px; margin-top: 7px; }
`;

const StatusMsg = styled.div<{ $dimmed?: boolean }>`
  display: flex; align-items: center; justify-content: center;
  color: ${p => p.$dimmed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)'};
  font-size: 15px; padding: 48px;
  ${media.mobile} { padding: 32px; font-size: 13px; }
`;

const COLS_D = '72px 1fr 130px 150px';
const COLS_T = '56px 1fr 100px 110px';
const COLS_M = '40px 1fr 90px';

const RankingTable = styled.div`
  margin: 0 24px 20px;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; overflow: hidden;
  ${media.mobile} { margin: 0 14px 16px; border-radius: 10px; }
`;

const TableHead = styled.div`
  display: grid; grid-template-columns: ${COLS_D};
  gap: 12px; padding: 10px 16px;
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.07);
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.35);
  text-transform: uppercase; letter-spacing: 0.08em;
  ${media.tablet} { grid-template-columns: ${COLS_T}; gap: 8px; }
  ${media.mobile} { grid-template-columns: ${COLS_M}; gap: 6px; padding: 8px 12px; font-size: 10px; }
  ${lMedia.phone} { grid-template-columns: ${COLS_T}; gap: 8px; }
  ${lMedia.phoneSm} { grid-template-columns: ${COLS_M}; gap: 6px; font-size: 10px; }
`;

const TableRow = styled.div<{ $top?: boolean }>`
  display: grid; grid-template-columns: ${COLS_D};
  gap: 12px; padding: 10px 16px; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  background: ${p => p.$top ? 'rgba(255,215,0,0.025)' : 'transparent'};
  transition: background 0.15s;
  @media (hover:hover) { &:hover { background: rgba(255,255,255,0.04); } }
  &:last-child { border-bottom: none; }
  ${media.tablet} { grid-template-columns: ${COLS_T}; gap: 8px; }
  ${media.mobile} { grid-template-columns: ${COLS_M}; gap: 6px; padding: 8px 12px; }
  ${lMedia.phone} { grid-template-columns: ${COLS_T}; gap: 8px; }
  ${lMedia.phoneSm} { grid-template-columns: ${COLS_M}; gap: 6px; padding: 7px 10px; }
`;

const ColRank = styled.div<{ $idx?: number }>`
  font-size: ${p => (p.$idx !== undefined && p.$idx < 3) ? '18px' : '13px'};
  font-weight: 700;
  color: ${p => (p.$idx !== undefined && p.$idx < 3) ? '#FFD700' : 'rgba(255,255,255,0.4)'};
  ${media.mobile} { font-size: 13px; }
`;

const ColPlayer = styled.div`
  font-size: 14px; font-weight: 600; color: #e8edf3;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  ${media.mobile} { font-size: 13px; }
`;

const ColRating = styled.div`
  font-size: 13px; color: #f1c40f; font-weight: 600;
  ${media.mobile} { display: none; }
  ${lMedia.phoneSm} { display: none; }
`;

const ColScore = styled.div<{ $accent?: boolean }>`
  font-size: 14px; font-weight: 800; text-align: right;
  color: ${p => p.$accent ? '#4fc3f7' : 'rgba(255,255,255,0.7)'};
  font-variant-numeric: tabular-nums;
  ${media.mobile} { font-size: 13px; }
`;