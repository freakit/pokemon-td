// src/components/Modals/Achievements.tsx
import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  AchievementCategory,
  AchievementWithCategory,
  TIER_META,
} from '../../data/achievements';
import { databaseService, APRankingEntry } from '../../services/DatabaseService';
import { saveService } from '../../services/SaveService';
import { Achievement, AchievementTier, TIER_POINTS } from '../../types/game';
import { useTranslation } from '../../i18n';

// ─── 번역 헬퍼 ───────────────────────────────────────────────────────────────
const GEN_NAMES: Record<number, string> = {
  1:'관동', 2:'성도', 3:'호연', 4:'신오', 5:'하나', 6:'칼로스', 7:'알로라', 8:'가라르', 9:'팔데아',
};

function getAchName(ach: AchievementWithCategory, t: (k: string, p?: Record<string, string | number>) => string): string {
  const direct = t(`achData.${ach.id}.name`);
  if (direct !== `achData.${ach.id}.name`) return direct;

  const id = ach.id;
  if (id.startsWith('syn_type_')) {
    const parts = id.split('_'); // ['syn','type',typeKey,count]
    const typeKey = parts[2];
    const count = parts[3];
    const typeName = t(`types.${typeKey}`);
    return t(`achData.pat_type_${count}.name`, { typeName });
  }
  if (id.startsWith('syn_gen_')) {
    const parts = id.split('_'); // ['syn','gen',genNum,count]
    const genNum = Number(parts[2]);
    const count = parts[3];
    const genName = `${genNum}세대(${GEN_NAMES[genNum] ?? ''})`.trim();
    return t(`achData.pat_gen_${count}.name`, { genName, genNum });
  }
  return ach.name;
}

function getAchDesc(ach: AchievementWithCategory, t: (k: string, p?: Record<string, string | number>) => string): string {
  const direct = t(`achData.${ach.id}.description`);
  if (direct !== `achData.${ach.id}.description`) return direct;

  const id = ach.id;
  if (id.startsWith('syn_type_')) {
    const parts = id.split('_');
    const typeKey = parts[2];
    const count = parts[3];
    const typeName = t(`types.${typeKey}`);
    return t(`achData.pat_type_${count}.description`, { typeName });
  }
  if (id.startsWith('syn_gen_')) {
    const parts = id.split('_');
    const genNum = Number(parts[2]);
    const count = parts[3];
    const genName = `${genNum}세대(${GEN_NAMES[genNum] ?? ''})`.trim();
    return t(`achData.pat_gen_${count}.description`, { genName, genNum });
  }
  return ach.description;
}

type TabKey = 'all' | AchievementCategory;
type SubTab = 'achievements' | 'ranking';

const TIER_ORDER: AchievementTier[] = ['legendary', 'diamond', 'gold', 'silver', 'bronze'];

// ─── 메인 패널 ───────────────────────────────────────────────────────────────
export const AchievementsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<SubTab>('achievements');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [showHidden, setShowHidden] = useState(false);
  const [progressData, setProgressData] = useState<Map<string, Achievement>>(new Map());
  const [loading, setLoading] = useState(true);
  const [myAP, setMyAP] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [ranking, setRanking] = useState<APRankingEntry[]>([]);
  const [rankLoading, setRankLoading] = useState(false);

  // 업적 데이터 로드 (localStorage 우선, DB 보조 병합)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const localData = saveService.load();
        const localMap = new Map<string, Achievement>(localData.achievements.map(a => [a.id, a]));

        try {
          const dbAchs = await databaseService.getUserAchievements();
          for (const dbAch of dbAchs) {
            const local = localMap.get(dbAch.id);
            const dbComp = dbAch.completions ?? 0;
            const localComp = local?.completions ?? 0;
            if (!local || dbComp > localComp) {
              localMap.set(dbAch.id, { ...(local ?? dbAch), ...dbAch });
            }
          }
        } catch { /* DB 실패 시 로컬만 사용 */ }

        setProgressData(localMap);
        setMyAP(localData.totalAP ?? 0);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 랭킹 탭 진입 시 로드
  useEffect(() => {
    if (subTab !== 'ranking') return;
    setRankLoading(true);
    Promise.all([
      databaseService.getAPRanking(100),
      databaseService.getMyAPRank(),
    ]).then(([entries, rank]) => {
      setRanking(entries);
      setMyRank(rank);
    }).catch(() => {}).finally(() => setRankLoading(false));
  }, [subTab]);

  // 통계 계산
  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter(a => (progressData.get(a.id)?.completions ?? 0) > 0).length;
  const totalCompletions = Array.from(progressData.values()).reduce((s, a) => s + (a.completions ?? 0), 0);
  const pct = Math.floor((unlockedCount / totalCount) * 100);

  // 카테고리 통계
  const categoryStats = (cat: AchievementCategory) => {
    const catAchs = ACHIEVEMENTS.filter(a => a.category === cat);
    const done = catAchs.filter(a => (progressData.get(a.id)?.completions ?? 0) > 0).length;
    return { done, total: catAchs.length };
  };

  // 필터링된 업적 (숨김 여부, 탭)
  const filteredAchs: AchievementWithCategory[] = ACHIEVEMENTS.filter(ach => {
    if (ach.hidden && !showHidden) {
      if (!((progressData.get(ach.id)?.completions ?? 0) > 0)) return false;
    }
    if (activeTab !== 'all' && ach.category !== activeTab) return false;
    return true;
  });

  // 티어별 그룹화
  const groupedByTier = TIER_ORDER.map(tier => ({
    tier,
    achs: filteredAchs.filter(a => a.tier === tier),
  })).filter(g => g.achs.length > 0);

  return (
    <Overlay>
      <Modal>
        {/* ── 헤더 ── */}
        <ModalHeader>
          <HeaderTop>
            <TitleArea>
              <ModalTitle>{t('achievementsPanel.title')}</ModalTitle>
              <APBadge>{t('achievementsPanel.apBadge', { ap: myAP.toLocaleString() })}</APBadge>
            </TitleArea>
            <HeaderActions>
              <HiddenToggle onClick={() => setShowHidden(v => !v)}>
                {showHidden ? t('achievementsPanel.hideHidden') : t('achievementsPanel.showHidden')}
              </HiddenToggle>
              <CloseBtn onClick={onClose}>✕</CloseBtn>
            </HeaderActions>
          </HeaderTop>

          {/* 전체 진행 바 */}
          <ProgressArea>
            <ProgressStats>
              <span>{t('achievementsPanel.progressStats', { unlocked: unlockedCount, total: totalCount })}</span>
              <span>{t('achievementsPanel.progressTotalCompletions', { count: totalCompletions })}</span>
              <span>{pct}%</span>
            </ProgressStats>
            <ProgressBarOuter>
              <ProgressBarInner $pct={pct} />
            </ProgressBarOuter>
          </ProgressArea>

          {/* 서브탭 (업적 / 랭킹) */}
          <SubTabRow>
            <SubTabBtn $active={subTab === 'achievements'} onClick={() => setSubTab('achievements')}>
              {t('achievementsPanel.tabAchievements')}
            </SubTabBtn>
            <SubTabBtn $active={subTab === 'ranking'} onClick={() => setSubTab('ranking')}>
              {t('achievementsPanel.tabRanking')} {myRank !== null && <RankBadge>{t('achievementsPanel.myRankBadge', { rank: myRank })}</RankBadge>}
            </SubTabBtn>
          </SubTabRow>
        </ModalHeader>

        {/* ── 업적 탭 ── */}
        {subTab === 'achievements' && (
          <>
            {/* 카테고리 탭 */}
            <CategoryTabRow>
              <CatTab $active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
                {t('achievementsPanel.catAll')} <TabBadge>{unlockedCount}/{totalCount}</TabBadge>
              </CatTab>
              {(Object.keys(ACHIEVEMENT_CATEGORIES) as AchievementCategory[]).map(cat => {
                const { done, total } = categoryStats(cat);
                const { label, icon } = ACHIEVEMENT_CATEGORIES[cat];
                return (
                  <CatTab key={cat} $active={activeTab === cat} onClick={() => setActiveTab(cat)}>
                    {icon} {label} <TabBadge>{done}/{total}</TabBadge>
                  </CatTab>
                );
              })}
            </CategoryTabRow>

            {/* 업적 목록 */}
            <AchievementScroll>
              {loading ? (
                <LoadingMsg>{t('achievementsPanel.loading')}</LoadingMsg>
              ) : groupedByTier.length === 0 ? (
                <EmptyMsg>{t('achievementsPanel.empty')}</EmptyMsg>
              ) : (
                groupedByTier.map(({ tier, achs }) => {
                  const meta = TIER_META[tier];
                  return (
                    <TierSection key={tier}>
                      <TierHeader $color={meta.color}>
                        <TierLabel>{meta.label}</TierLabel>
                        <TierPts>{t('achievementsPanel.apPerCompletion', { pts: TIER_POINTS[tier as AchievementTier] })}</TierPts>
                      </TierHeader>
                      <TierGrid>
                        {achs.map(ach => {
                          const saved = progressData.get(ach.id);
                          const completions = saved?.completions ?? 0;
                          const progress = saved?.progress ?? 0;
                          const totalPoints = saved?.totalPoints ?? 0;
                          const isUnlocked = completions > 0;
                          const progressPct = Math.min(100, Math.floor((progress / ach.target) * 100));

                          return (
                            <AchCard
                              key={ach.id}
                              $unlocked={isUnlocked}
                              $tier={tier}
                              $borderColor={meta.border}
                              $bgColor={meta.bg}
                            >
                              <CardIcon $unlocked={isUnlocked} $tier={tier} $color={meta.color}>
                                {ach.icon}
                              </CardIcon>
                              <CardBody>
                                <CardNameRow>
                                  <CardName $unlocked={isUnlocked} $color={meta.color}>
                                    {ach.hidden && !isUnlocked ? '???' : getAchName(ach, t)}
                                  </CardName>
                                  {isUnlocked && completions > 1 && (
                                    <CompletionBadge $color={meta.color}>×{completions}</CompletionBadge>
                                  )}
                                  {isUnlocked && <UnlockedMark $color={meta.color}>✓</UnlockedMark>}
                                </CardNameRow>
                                <CardDesc>
                                  {ach.hidden && !isUnlocked ? t('achievementsPanel.hiddenDesc') : getAchDesc(ach, t)}
                                </CardDesc>
                                <CardBottom>
                                  {!isUnlocked ? (
                                    <>
                                      <MiniBar>
                                        <MiniFill $pct={progressPct} $color={meta.color} />
                                      </MiniBar>
                                      <ProgressTxt>
                                        {progress.toLocaleString()} / {ach.target.toLocaleString()}
                                      </ProgressTxt>
                                    </>
                                  ) : (
                                    <APEarned $color={meta.color}>
                                      {t('achievementsPanel.apEarned', { pts: totalPoints.toLocaleString() })}
                                    </APEarned>
                                  )}
                                </CardBottom>
                              </CardBody>
                            </AchCard>
                          );
                        })}
                      </TierGrid>
                    </TierSection>
                  );
                })
              )}
            </AchievementScroll>
          </>
        )}

        {/* ── 랭킹 탭 ── */}
        {subTab === 'ranking' && (
          <RankingScroll>
            {rankLoading ? (
              <LoadingMsg>{t('achievementsPanel.rankingLoading')}</LoadingMsg>
            ) : ranking.length === 0 ? (
              <EmptyMsg>{t('achievementsPanel.rankingEmpty')}</EmptyMsg>
            ) : (
              <>
                <RankingHeader>
                  <span>{t('achievementsPanel.rankingColRank')}</span>
                  <span>{t('achievementsPanel.rankingColTrainer')}</span>
                  <span>{t('achievementsPanel.rankingColCount')}</span>
                  <span>{t('achievementsPanel.rankingColAP')}</span>
                </RankingHeader>
                {ranking.map((entry, idx) => {
                  const rank = idx + 1;
                  const isMe = myRank === rank;
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                  return (
                    <RankRow key={entry.userId} $isMe={isMe} $rank={rank}>
                      <RankNum $rank={rank}>{medal ?? `#${rank}`}</RankNum>
                      <RankName $isMe={isMe}>
                        {entry.userName ?? t('achievementsPanel.rankingColTrainer')}
                        {isMe && <MeTag>{t('achievementsPanel.rankingMe')}</MeTag>}
                      </RankName>
                      <RankStat>{t('achievementsPanel.rankingCountSuffix', { count: entry.achievementCount.toLocaleString() })}</RankStat>
                      <RankAP>⚡ {entry.totalAP.toLocaleString()}</RankAP>
                    </RankRow>
                  );
                })}
              </>
            )}
          </RankingScroll>
        )}
      </Modal>
    </Overlay>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const fadeIn = keyframes`from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}`;

const Overlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex; justify-content: center; align-items: center;
  z-index: 1001; backdrop-filter: blur(6px);
`;

const Modal = styled.div`
  background: linear-gradient(160deg, #0c1824 0%, #0f0c22 100%);
  border: 1px solid rgba(255,215,0,0.18);
  border-radius: 20px;
  width: 94%; max-width: 920px; max-height: 94vh;
  display: flex; flex-direction: column;
  animation: ${fadeIn} 0.2s ease-out;
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,215,0,0.08);
`;

// ── 헤더
const ModalHeader = styled.div`
  padding: 18px 22px 0;
  background: linear-gradient(135deg, rgba(255,215,0,0.07), transparent);
  border-bottom: 1px solid rgba(255,215,0,0.10);
  flex-shrink: 0;
`;

const HeaderTop = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
`;

const TitleArea = styled.div`display:flex;align-items:center;gap:12px;`;

const ModalTitle = styled.h2`
  font-size: 1.4rem; font-weight: 800; color: #FFD700;
  text-shadow: 0 0 20px rgba(255,215,0,0.4);
`;

const APBadge = styled.div`
  padding: 4px 12px; border-radius: 20px;
  background: rgba(255,215,0,0.12); border: 1px solid rgba(255,215,0,0.35);
  color: #FFD700; font-size: 13px; font-weight: 700;
  text-shadow: 0 0 8px rgba(255,215,0,0.4);
`;

const HeaderActions = styled.div`display:flex;gap:8px;align-items:center;`;

const HiddenToggle = styled.button`
  padding: 5px 12px; font-size: 11px; border-radius: 16px; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
  transition: all 0.2s;
  &:hover { background: rgba(255,255,255,0.10); color: #fff; }
`;

const CloseBtn = styled.button`
  width: 30px; height: 30px; border-radius: 50%; border: none;
  background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7);
  cursor: pointer; font-size: 14px; display:flex;align-items:center;justify-content:center;
  transition: all 0.2s;
  &:hover { background: rgba(255,100,100,0.3); color:#fff; }
`;

// ── 진행 바
const ProgressArea = styled.div`margin-bottom: 10px;`;
const ProgressStats = styled.div`
  display: flex; justify-content: space-between;
  font-size: 11px; color: rgba(255,255,255,0.45); margin-bottom: 4px;
`;
const ProgressBarOuter = styled.div`
  height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden;
`;
const ProgressBarInner = styled.div<{ $pct: number }>`
  height: 100%; width: ${p => p.$pct}%;
  background: linear-gradient(90deg, #FFD700, #FF8C00);
  border-radius: 3px; transition: width 0.6s ease;
`;

// ── 서브탭
const SubTabRow = styled.div`display:flex;gap:4px;padding-top:8px;`;
const SubTabBtn = styled.button<{ $active: boolean }>`
  padding: 7px 18px; font-size: 13px; font-weight: 700; cursor: pointer;
  border: none; border-bottom: 2px solid ${p => p.$active ? '#FFD700' : 'transparent'};
  background: ${p => p.$active ? 'rgba(255,215,0,0.10)' : 'transparent'};
  color: ${p => p.$active ? '#FFD700' : 'rgba(255,255,255,0.4)'};
  border-radius: 8px 8px 0 0; transition: all 0.2s; display:flex;align-items:center;gap:6px;
  &:hover { color: #FFD700; }
`;
const RankBadge = styled.span`
  font-size: 10px; padding: 1px 6px; border-radius: 10px;
  background: rgba(255,215,0,0.2); color: #FFD700;
`;

// ── 카테고리 탭
const CategoryTabRow = styled.div`
  display:flex; gap:2px; overflow-x:auto; padding:10px 16px 0;
  flex-shrink:0;
  &::-webkit-scrollbar { height:3px; }
  &::-webkit-scrollbar-thumb { background:rgba(255,215,0,0.3); border-radius:2px; }
`;
const CatTab = styled.button<{ $active: boolean }>`
  display:flex;align-items:center;gap:4px; white-space:nowrap;
  padding: 6px 12px; font-size: 11px; font-weight: 700;
  border:none; border-radius:8px 8px 0 0; cursor:pointer; transition:all 0.2s;
  background: ${p => p.$active ? 'rgba(255,255,255,0.08)' : 'transparent'};
  color: ${p => p.$active ? '#fff' : 'rgba(255,255,255,0.35)'};
  border-bottom: 2px solid ${p => p.$active ? 'rgba(255,255,255,0.4)' : 'transparent'};
  &:hover { color:#fff; }
`;
const TabBadge = styled.span`
  font-size: 9px; padding: 1px 5px; background:rgba(255,255,255,0.10); border-radius:6px;
`;

// ── 업적 스크롤
const AchievementScroll = styled.div`
  flex:1; overflow-y:auto; padding:12px 16px 20px;
  display:flex; flex-direction:column; gap:16px;
  &::-webkit-scrollbar { width:5px; }
  &::-webkit-scrollbar-thumb { background:rgba(255,215,0,0.25); border-radius:3px; }
`;

const LoadingMsg = styled.div`
  display:flex;align-items:center;justify-content:center;
  color:rgba(255,255,255,0.35);font-size:14px;padding:60px;
`;
const EmptyMsg = styled.div`
  text-align:center;color:rgba(255,255,255,0.3);padding:40px;font-size:14px;
`;

// ── 티어 섹션
const TierSection = styled.div`display:flex;flex-direction:column;gap:8px;`;
const TierHeader = styled.div<{ $color: string }>`
  display:flex;align-items:center;justify-content:space-between;
  padding: 4px 8px;
  border-left: 3px solid ${p => p.$color};
  padding-left: 12px;
`;
const TierLabel = styled.span`font-size:13px;font-weight:800;color:rgba(255,255,255,0.85);`;
const TierPts = styled.span`font-size:11px;color:rgba(255,255,255,0.35);`;

const TierGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 8px;
`;

// ── 업적 카드
const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const AchCard = styled.div<{
  $unlocked: boolean;
  $tier: string;
  $borderColor: string;
  $bgColor: string;
}>`
  display:flex; gap:12px; padding:12px 14px;
  border-radius:12px;
  border: 1px solid ${p => p.$unlocked ? p.$borderColor : 'rgba(255,255,255,0.07)'};
  background: ${p => p.$unlocked ? p.$bgColor : 'rgba(255,255,255,0.025)'};
  opacity: ${p => p.$unlocked ? 1 : 0.65};
  transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
  position: relative; overflow: hidden;

  ${p => p.$unlocked && css`
    &::before {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(
        105deg,
        transparent 40%,
        rgba(255,255,255,0.04) 50%,
        transparent 60%
      );
      background-size: 200% 100%;
      animation: ${shimmer} 3s linear infinite;
    }
  `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    opacity: 1;
  }
`;

const CardIcon = styled.div<{ $unlocked: boolean; $tier: string; $color: string }>`
  flex-shrink:0;
  width:44px; height:44px; font-size:24px;
  display:flex; align-items:center; justify-content:center;
  border-radius:10px;
  background: ${p => p.$unlocked
    ? `rgba(${p.$color.replace('#','').match(/.{2}/g)!.map(h=>parseInt(h,16)).join(',')}, 0.15)`
    : 'rgba(255,255,255,0.05)'};
  filter: ${p => p.$unlocked ? 'none' : 'grayscale(70%)'};
`;

const CardBody = styled.div`flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;`;
const CardNameRow = styled.div`display:flex;align-items:center;gap:6px;flex-wrap:wrap;`;

const CardName = styled.span<{ $unlocked: boolean; $color: string }>`
  font-size:13px; font-weight:700;
  color: ${p => p.$unlocked ? p.$color : 'rgba(255,255,255,0.7)'};
`;

const CompletionBadge = styled.span<{ $color: string }>`
  font-size:11px; font-weight:800; padding:1px 7px; border-radius:10px;
  background:rgba(255,255,255,0.08); color: ${p => p.$color};
  border: 1px solid ${p => p.$color}44;
`;

const UnlockedMark = styled.span<{ $color: string }>`
  font-size:11px; font-weight:700;
  color: ${p => p.$color}; opacity:0.8;
`;

const CardDesc = styled.div`font-size:11px;color:rgba(255,255,255,0.4);line-height:1.4;`;

const CardBottom = styled.div`display:flex;align-items:center;gap:8px;margin-top:4px;`;

const MiniBar = styled.div`
  flex:1; max-width:140px; height:4px;
  background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;
`;
const MiniFill = styled.div<{ $pct: number; $color: string }>`
  height:100%; width:${p => p.$pct}%;
  background:${p => p.$color}; border-radius:2px; transition:width 0.4s ease;
`;
const ProgressTxt = styled.span`font-size:10px;color:rgba(255,255,255,0.3);`;
const APEarned = styled.span<{ $color: string }>`
  font-size:11px;font-weight:700;color:${p => p.$color};
  text-shadow:0 0 8px ${p => p.$color}66;
`;

// ── 랭킹
const RankingScroll = styled.div`
  flex:1; overflow-y:auto; padding:12px 16px 20px;
  display:flex; flex-direction:column; gap:4px;
  &::-webkit-scrollbar { width:5px; }
  &::-webkit-scrollbar-thumb { background:rgba(255,215,0,0.25); border-radius:3px; }
`;

const RankingHeader = styled.div`
  display:grid; grid-template-columns:60px 1fr 100px 100px;
  padding:6px 14px; font-size:11px; font-weight:700;
  color:rgba(255,255,255,0.3); border-bottom:1px solid rgba(255,255,255,0.08);
  margin-bottom:4px;
`;

const RankRow = styled.div<{ $isMe: boolean; $rank: number }>`
  display:grid; grid-template-columns:60px 1fr 100px 100px;
  padding:10px 14px; border-radius:10px; align-items:center;
  background: ${p =>
    p.$isMe ? 'rgba(255,215,0,0.10)' :
    p.$rank <= 3 ? 'rgba(255,255,255,0.04)' :
    'rgba(255,255,255,0.02)'};
  border: 1px solid ${p => p.$isMe ? 'rgba(255,215,0,0.35)' : 'rgba(255,255,255,0.05)'};
  transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.06); }
`;

const RankNum = styled.div<{ $rank: number }>`
  font-size:${p => p.$rank <= 3 ? '18px' : '13px'};
  font-weight:800;
  color:${p => p.$rank === 1 ? '#FFD700' : p.$rank === 2 ? '#C0C0C0' : p.$rank === 3 ? '#CD7F32' : 'rgba(255,255,255,0.5)'};
`;

const RankName = styled.div<{ $isMe: boolean }>`
  font-size:13px; font-weight:${p => p.$isMe ? 700 : 500};
  color:${p => p.$isMe ? '#FFD700' : 'rgba(255,255,255,0.8)'};
  display:flex;align-items:center;gap:6px;
`;

const MeTag = styled.span`
  font-size:10px; padding:1px 6px; border-radius:8px;
  background:rgba(255,215,0,0.2); color:#FFD700; font-weight:700;
`;

const RankStat = styled.div`font-size:12px;color:rgba(255,255,255,0.45);text-align:right;`;
const RankAP = styled.div`
  font-size:13px;font-weight:700;color:#FFD700;
  text-shadow:0 0 8px rgba(255,215,0,0.4);text-align:right;
`;