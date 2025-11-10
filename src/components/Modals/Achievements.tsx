// src/components/Modals/Achievements.tsx

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { ACHIEVEMENTS } from '../../data/achievements';
import { databaseService } from '../../services/DatabaseService';
import { Achievement } from '../../types/game';

export const AchievementsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  
  const [progressData, setProgressData] = useState<Map<string, Achievement>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAchievements = async () => {
      setLoading(true);
      try {
        const dbAchievements = await databaseService.getUserAchievements();
        const progressMap = new Map(dbAchievements.map(ach => [ach.id, ach]));
        setProgressData(progressMap);
      } catch (err) {
        console.error("Failed to load achievements:", err);
      } finally {
        setLoading(false);
      }
    };
    loadAchievements();
  }, []);

  return (
    <Overlay>
      <Modal>
        <h2>🏆 {t('nav.achievements')}</h2>
        
        {loading ? (
          <LoadingMessage>업적 정보를 불러오는 중...</LoadingMessage>
        ) : (
          <List>
            {ACHIEVEMENTS.map(ach => {
              const progress = progressData.get(ach.id);
              const currentProgress = progress?.progress || 0;
              const isUnlocked = progress?.unlocked || false;

              return (
                <AchievementItem key={ach.id} $unlocked={isUnlocked}>
                  <Icon>{ach.icon}</Icon>
                  <Info>
                    <h3>{t(`achData.${ach.id}.name`)}</h3>
                    <p>{t(`achData.${ach.id}.description`)}</p>
                    {isUnlocked ? (
                      <UnlockedLabel>달성 완료!</UnlockedLabel>
                    ) : (
                      <ProgressLabel>{t('achievements.progress', { current: currentProgress, total: ach.target })}</ProgressLabel>
                    )}
                  </Info>
                </AchievementItem>
              );
            })}
          </List>
        )}
        
        <CloseButton onClick={onClose}>{t('common.close')}</CloseButton>
      </Modal>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
`;

const Modal = styled.div`
  background-color: #fff;
  border-radius: 16px;
  padding: 32px;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  color: #333;
  h2 {
    color: #000;
    margin-bottom: 16px;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  font-size: 16px;
  color: #888;
`;

const List = styled.div`
  max-height: 500px;
  overflow-y: auto;
  margin-bottom: 24px;
`;

const AchievementItem = styled.div<{ $unlocked: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid ${props => props.$unlocked ? '#FFD700' : '#ddd'};
  background: ${props => props.$unlocked ? '#fffbeb' : 'transparent'};
  border-radius: 12px;
  margin-bottom: 12px;
  opacity: ${props => props.$unlocked ? 1 : 0.7};
`;

const Icon = styled.div`
  font-size: 48px;
`;

const Info = styled.div`
  flex: 1;
  h3 {
    margin-bottom: 4px;
  }
  p {
    margin-bottom: 8px;
    font-size: 14px;
    color: #555;
  }
`;

const ProgressLabel = styled.div`
  font-size: 12px;
  font-weight: bold;
  color: #007bff;
`;

const UnlockedLabel = styled.div`
  font-size: 12px;
  font-weight: bold;
  color: #D4AF37;
`;

const CloseButton = styled.button`
  width: 100%;
  padding: 12px;
  background-color: #95a5a6;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  &:hover {
    background-color: #7f8c8d;
  }
`;