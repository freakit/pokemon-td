// src/components/Modals/Achievements.tsx

import React from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { ACHIEVEMENTS } from '../../data/achievements';
import { saveService } from '../../services/SaveService';

export const AchievementsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const data = saveService.load();

  return (
    <Overlay>
      <Modal>
        <h2>🏆 {t('nav.achievements')}</h2>
        <List>
          {ACHIEVEMENTS.map(ach => {
            const progress = data.achievements.find(a => a.id === ach.id);
            return (
              <AchievementItem key={ach.id}>
                <Icon>{ach.icon}</Icon>
                <Info>
                  <h3>{t(`achData.${ach.id}.name`)}</h3>
                  <p>{t(`achData.${ach.id}.description`)}</p>
                  <div>{t('achievements.progress', { current: progress?.progress || 0, total: ach.target })}</div>
                </Info>
              </AchievementItem>
            );
          })}
        </List>
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

const List = styled.div`
  max-height: 500px;
  overflow-y: auto;
  margin-bottom: 24px;
`;

const AchievementItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 2px solid #ddd;
  border-radius: 12px;
  margin-bottom: 12px;
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

  div {
    font-size: 12px;
    font-weight: bold;
    color: #007bff;
  }
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