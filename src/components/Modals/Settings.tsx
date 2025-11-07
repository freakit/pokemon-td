// src/components/Modals/Settings.tsx

import React from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { saveService } from '../../services/SaveService';
import { soundService } from '../../services/SoundService';

export const Settings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const settings = saveService.load().settings;

  return (
    <Overlay>
      <Modal>
        <h2>⚙️ {t('settings.title')}</h2>
        <SettingsList>
          <SettingItem>
            <label>{t('settings.musicVolume')}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue={settings.musicVolume}
              onChange={(e) => soundService.setMusicVolume(parseFloat(e.target.value))}
            />
          </SettingItem>
          <SettingItem>
            <label>{t('settings.sfxVolume')}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue={settings.sfxVolume}
              onChange={(e) => soundService.setSFXVolume(parseFloat(e.target.value))}
            />
          </SettingItem>
          <SettingItem>
            <label>{t('settings.showDamage')}</label>
            <input type="checkbox" defaultChecked={settings.showDamageNumbers} />
          </SettingItem>
          <SettingItem>
            <label>{t('settings.showGrid')}</label>
            <input type="checkbox" defaultChecked={settings.showGrid} />
          </SettingItem>
          <DangerZone>
            <DangerButton onClick={() => {
              if (confirm(t('alerts.confirmReset'))) {
                saveService.clearSave();
                window.location.reload();
              }
            }}>{t('settings.resetData')}</DangerButton>
          </DangerZone>
        </SettingsList>
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
  max-width: 600px;
  color: #333;

  h2 {
    color: #000;
    margin-bottom: 16px;
  }
`;

const SettingsList = styled.div`
  margin-bottom: 24px;
`;

const SettingItem = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  label {
    font-weight: bold;
  }
`;

const DangerZone = styled.div`
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid #e74c3c;
`;

const DangerButton = styled.button`
  width: 100%;
  padding: 12px;
  background-color: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 16px;

  &:hover {
    background-color: #c0392b;
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