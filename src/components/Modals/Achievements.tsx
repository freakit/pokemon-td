// src/components/Modals/Achievements.tsx
import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useTranslation } from '../../i18n';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  AchievementCategory,
  AchievementWithCategory,
} from '../../data/achievements';
import { databaseService } from '../../services/DatabaseService';
import { Achievement } from '../../types/game';

type TabKey = 'all' | AchievementCategory;

export const AchievementsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const [progressData, setProgressData] = useState<Map<string, Achievement>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const dbAchievements = await databaseService.getUserAchievements();
        setProgressData(new Map(dbAchievements.map(a => [a.id, a])));
      } catch (err) {
        console.error('Failed to load achievements:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visibleAchievements: AchievementWithCategory[] = ACHIEVEMENTS.filter(ach => {
    if (ach.hidden && !showHidden) {
      const saved = progressData.get(ach.id);
      if (!saved?.unlocked) return false;
    }
    if (activeTab !== 'all' && ach.category !== activeTab) return false;
    return true;
  });

  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter(a => progressData.get(a.id)?.unlocked).length;
  const pct = Math.floor((unlockedCount / totalCount) * 100);

  const categoryStats = (cat: AchievementCategory) => {
    const catAchs = ACHIEVEMENTS.filter(a => a.category === cat);
    const done = catAchs.filter(a => progressData.get(a.id)?.unlocked).length;
    return { done, total: catAchs.length };
  };

  return (
    <Overlay>
      <Modal>
        <ModalHeader>
          <HeaderLeft>
            <ModalTitle>🏆 {t('nav.achievements')}</ModalTitle>
            <OverallProgress>
              <OverallText>{unlockedCount} / {totalCount} 달성 ({pct}%)</OverallText>
              <OverallBar><OverallFill $pct={pct} /></OverallBar>
            </OverallProgress>
          </HeaderLeft>
          <HeaderRight>
            <HiddenToggle onClick={() => setShowHidden(v => !v)}>
              {showHidden ? '🙈 히든 숨기기' : '👁 히든 보기'}
            </HiddenToggle>
            <CloseBtn onClick={onClose}>{t('common.close')}</CloseBtn>
          </HeaderRight>
        </ModalHeader>

        <TabRow>
          <TabBtn $active={activeTab === 'all'} onClick={() => setActiveTab('all')}>
            📋 전체 <TabCount>{unlockedCount}/{totalCount}</TabCount>
          </TabBtn>
          {(Object.keys(ACHIEVEMENT_CATEGORIES) as AchievementCategory[]).map(cat => {
            const { done, total } = categoryStats(cat);
            const { label, icon } = ACHIEVEMENT_CATEGORIES[cat];
            return (
              <TabBtn key={cat} $active={activeTab === cat} onClick={() => setActiveTab(cat)}>
                {icon} {label} <TabCount>{done}/{total}</TabCount>
              </TabBtn>
            );
          })}
        </TabRow>

        {loading ? (
          <LoadingMsg>{t('achievements.loading')}</LoadingMsg>
        ) : (
          <AchievementGrid>
            {visibleAchievements.length === 0 ? (
              <EmptyMsg>이 카테고리에 달성 가능한 업적이 없습니다.</EmptyMsg>
            ) : (
              visibleAchievements.map(ach => {
                const saved = progressData.get(ach.id);
                const currentProgress = saved?.progress ?? 0;
                const isUnlocked = saved?.unlocked ?? false;
                const progressPct = Math.min(100, Math.floor((currentProgress / ach.target) * 100));

                return (
                  <AchievementCard key={ach.id} $unlocked={isUnlocked} $hidden={!!ach.hidden}>
                    <CardLeft>
                      <AchIcon $unlocked={isUnlocked}>{ach.icon}</AchIcon>
                    </CardLeft>
                    <CardRight>
                      <NameRow>
                        <AchName $unlocked={isUnlocked}>
                          {ach.hidden && !isUnlocked ? '???' : ach.name}
                        </AchName>
                        {ach.hidden && <HiddenBadge>히든</HiddenBadge>}
                        {isUnlocked && <UnlockedBadge>✓ 달성</UnlockedBadge>}
                      </NameRow>
                      <AchDesc>
                        {ach.hidden && !isUnlocked
                          ? '숨겨진 업적입니다.'
                          : ach.description}
                      </AchDesc>
                      <BottomRow>
                        {!isUnlocked ? (
                          <>
                            <ProgressBarWrap>
                              <ProgressFill $pct={progressPct} />
                            </ProgressBarWrap>
                            <ProgressText>
                              {currentProgress.toLocaleString()} / {ach.target.toLocaleString()}
                            </ProgressText>
                          </>
                        ) : (
                          <RewardText>🎁 보상: {ach.reward.toLocaleString()}원</RewardText>
                        )}
                      </BottomRow>
                    </CardRight>
                  </AchievementCard>
                );
              })
            )}
          </AchievementGrid>
        )}
      </Modal>
    </Overlay>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const fadeIn = keyframes`from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)}`;

const Overlay = styled.div`
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.82);
  display: flex; justify-content: center; align-items: center;
  z-index: 1001;
`;

const Modal = styled.div`
  background: linear-gradient(160deg, #0f1e35 0%, #1a1040 100%);
  border: 1px solid rgba(255,215,0,0.2);
  border-radius: 20px;
  width: 92%; max-width: 860px; max-height: 92vh;
  display: flex; flex-direction: column;
  animation: ${fadeIn} 0.2s ease-out;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 18px 24px 12px;
  display: flex; justify-content: space-between; align-items: flex-start;
  background: linear-gradient(135deg, rgba(212,175,55,0.1), transparent);
  border-bottom: 1px solid rgba(255,215,0,0.12);
  flex-shrink: 0;
`;

const HeaderLeft = styled.div`display:flex;flex-direction:column;gap:8px;`;
const HeaderRight = styled.div`display:flex;gap:10px;align-items:center;`;

const ModalTitle = styled.h2`
  font-size: 1.5rem; font-weight: bold; color: #FFD700;
  text-shadow: 0 0 16px rgba(255,215,0,0.4);
`;

const OverallProgress = styled.div`display:flex;align-items:center;gap:10px;`;
const OverallText = styled.span`font-size:13px;color:rgba(255,255,255,0.7);white-space:nowrap;`;

const OverallBar = styled.div`
  width: 140px; height: 6px;
  background: rgba(255,255,255,0.12); border-radius: 3px; overflow: hidden;
`;

const OverallFill = styled.div<{ $pct: number }>`
  height: 100%; width: ${p => p.$pct}%;
  background: linear-gradient(90deg, #FFD700, #FFA500);
  border-radius: 3px; transition: width 0.5s ease;
`;

const HiddenToggle = styled.button`
  padding: 6px 14px; font-size: 12px; border-radius: 20px; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7);
  transition: all 0.2s;
  &:hover { background: rgba(255,255,255,0.12); }
`;

const CloseBtn = styled.button`
  padding: 7px 18px; font-size: 13px; border-radius: 10px; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8);
  transition: all 0.2s;
  &:hover { background: rgba(255,255,255,0.15); }
`;

const TabRow = styled.div`
  display: flex; gap: 2px; overflow-x: auto; padding: 8px 16px 0;
  flex-shrink: 0;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,215,0,0.3); border-radius: 2px; }
`;

const TabBtn = styled.button<{ $active: boolean }>`
  display: flex; align-items: center; gap: 4px; white-space: nowrap;
  padding: 7px 14px; font-size: 12px; font-weight: bold;
  border: none; border-radius: 10px 10px 0 0; cursor: pointer;
  transition: all 0.2s;
  background: ${p => p.$active ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)'};
  color: ${p => p.$active ? '#FFD700' : 'rgba(255,255,255,0.5)'};
  border-bottom: ${p => p.$active ? '2px solid #FFD700' : '2px solid transparent'};
  &:hover { background: rgba(255,215,0,0.1); color: #FFD700; }
`;

const TabCount = styled.span`
  font-size: 10px; padding: 1px 6px;
  background: rgba(255,255,255,0.1); border-radius: 8px;
`;

const AchievementGrid = styled.div`
  flex: 1; overflow-y: auto; padding: 14px 20px 20px;
  display: flex; flex-direction: column; gap: 8px;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,215,0,0.3); border-radius: 3px; }
`;

const LoadingMsg = styled.div`
  flex: 1; display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.5); font-size: 1rem; padding: 40px;
`;

const EmptyMsg = styled.div`
  text-align: center; color: rgba(255,255,255,0.4);
  padding: 40px; font-size: 0.95rem;
`;

const AchievementCard = styled.div<{ $unlocked: boolean; $hidden: boolean }>`
  display: flex; gap: 14px; padding: 14px 16px;
  border-radius: 12px; border: 1px solid;
  border-color: ${p =>
    p.$unlocked ? 'rgba(255,215,0,0.4)' :
    p.$hidden ? 'rgba(150,100,220,0.3)' :
    'rgba(255,255,255,0.1)'};
  background: ${p =>
    p.$unlocked ? 'rgba(255,215,0,0.07)' :
    p.$hidden ? 'rgba(150,100,220,0.05)' :
    'rgba(255,255,255,0.04)'};
  opacity: ${p => p.$unlocked ? 1 : 0.75};
  transition: transform 0.15s, box-shadow 0.15s;
  &:hover { transform: translateX(3px); box-shadow: 0 2px 12px rgba(0,0,0,0.3); }
`;

const CardLeft = styled.div`flex-shrink: 0;`;

const AchIcon = styled.div<{ $unlocked: boolean }>`
  width: 48px; height: 48px; font-size: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px;
  background: ${p => p.$unlocked ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.06)'};
  filter: ${p => p.$unlocked ? 'none' : 'grayscale(60%)'};
`;

const CardRight = styled.div`flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px;`;

const NameRow = styled.div`display: flex; align-items: center; gap: 6px; flex-wrap: wrap;`;

const AchName = styled.span<{ $unlocked: boolean }>`
  font-size: 14px; font-weight: bold;
  color: ${p => p.$unlocked ? '#FFD700' : 'rgba(255,255,255,0.9)'};
`;

const HiddenBadge = styled.span`
  font-size: 10px; padding: 1px 6px; border-radius: 6px;
  background: rgba(150,100,220,0.25); color: #b39ddb;
`;

const UnlockedBadge = styled.span`
  font-size: 10px; padding: 1px 7px; border-radius: 6px;
  background: rgba(255,215,0,0.2); color: #FFD700;
`;

const AchDesc = styled.div`font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.4;`;

const BottomRow = styled.div`display: flex; align-items: center; gap: 8px; margin-top: 4px;`;

const ProgressBarWrap = styled.div`
  flex: 1; max-width: 200px; height: 5px;
  background: rgba(255,255,255,0.12); border-radius: 3px; overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number }>`
  height: 100%; width: ${p => p.$pct}%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  border-radius: 3px; transition: width 0.4s ease;
`;

const ProgressText = styled.span`font-size: 11px; color: rgba(255,255,255,0.45); white-space: nowrap;`;
const RewardText = styled.span`font-size: 11px; color: #4fc3f7;`;