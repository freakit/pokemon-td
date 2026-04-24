// src/components/Modals/Settings.tsx
import React, { useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { saveService } from '../../services/SaveService';
import { soundService } from '../../services/SoundService';

export const Settings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t, language, setLanguage } = useTranslation();

  const saved = saveService.load().settings;
  const [musicVolume, setMusicVolume] = useState(saved.musicVolume);
  const [sfxVolume, setSfxVolume]     = useState(saved.sfxVolume);
  const [showDamage, setShowDamage]   = useState(saved.showDamageNumbers);
  const [showGrid, setShowGrid]       = useState(saved.showGrid);

  const handleMusicVolume = (v: number) => {
    setMusicVolume(v);
    soundService.setMusicVolume(v);
    saveService.save({ settings: { ...saveService.load().settings, musicVolume: v } });
  };

  const handleSfxVolume = (v: number) => {
    setSfxVolume(v);
    soundService.setSFXVolume(v);
    saveService.save({ settings: { ...saveService.load().settings, sfxVolume: v } });
  };

  const handleShowDamage = (v: boolean) => {
    setShowDamage(v);
    saveService.save({ settings: { ...saveService.load().settings, showDamageNumbers: v } });
  };

  const handleShowGrid = (v: boolean) => {
    setShowGrid(v);
    saveService.save({ settings: { ...saveService.load().settings, showGrid: v } });
  };

  return (
    <Overlay>
      <Modal>
        <h2>⚙️ {t('settings.title')}</h2>
        <SettingsList>
          <SettingItem>
            <label>{t('settings.musicVolume')} ({Math.round(musicVolume * 100)}%)</label>
            <input
              type="range" min="0" max="1" step="0.1"
              value={musicVolume}
              onChange={(e) => handleMusicVolume(parseFloat(e.target.value))}
            />
          </SettingItem>
          <SettingItem>
            <label>{t('settings.sfxVolume')} ({Math.round(sfxVolume * 100)}%)</label>
            <input
              type="range" min="0" max="1" step="0.1"
              value={sfxVolume}
              onChange={(e) => handleSfxVolume(parseFloat(e.target.value))}
            />
          </SettingItem>
          <SettingItem>
            <label>{t('settings.showDamage')}</label>
            <input
              type="checkbox"
              checked={showDamage}
              onChange={(e) => handleShowDamage(e.target.checked)}
            />
          </SettingItem>
          <SettingItem>
            <label>{t('settings.showGrid')}</label>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => handleShowGrid(e.target.checked)}
            />
          </SettingItem>
          <SettingItem>
            <label>{t('settings.language')}</label>
            <Select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </Select>
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

const Select = styled.select`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #ddd;
  font-size: 14px;
  cursor: pointer;
  background-color: #fff;
  color: #333;
  outline: none;

  &:focus {
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
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