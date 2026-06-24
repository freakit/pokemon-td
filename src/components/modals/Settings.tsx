// src/components/modals/Settings.tsx
import React, { useState } from 'react';
import styled from 'styled-components';
import { lMedia, media } from '../../utils/responsive.utils';
import { Emoji } from '../shared/Emoji';
import {
  ModalOverlay, ModalBox, ModalHeader, ModalTitle, ModalCloseBtn,
  ModalScrollBody, MODAL_ACCENT,
} from '../shared/modal.styles';
import { useTranslation } from '../../i18n';
import { saveService } from '../../services/SaveService';
import { soundService } from '../../services/SoundService';
import { BugReport } from './BugReport';

export const Settings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t, language, setLanguage } = useTranslation();

  const saved = saveService.load().settings;
  const [musicVolume, setMusicVolume] = useState(saved.musicVolume);
  const [showDamage, setShowDamage]   = useState(saved.showDamageNumbers);
  const [showGrid, setShowGrid]       = useState(saved.showGrid);
  const [showBugReport, setShowBugReport] = useState(false);

  const handleMusicVolume = (v: number) => {
    setMusicVolume(v);
    soundService.setMusicVolume(v);
    saveService.save({ settings: { ...saveService.load().settings, musicVolume: v } });
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
    <>
      <ModalOverlay onClick={onClose}>
      <ModalBox $size="sm" $accent={MODAL_ACCENT.cyan} onClick={(e) => e.stopPropagation()}>

        <ModalHeader>
          <ModalTitle><Emoji glyph="⚙️" size={16} /> {t('settings.title')}</ModalTitle>
          <ModalCloseBtn onClick={onClose}>✕</ModalCloseBtn>
        </ModalHeader>


        <ModalScrollBody>
          <SettingsList>
          <SettingItem>
            <SettingLabel>
              <LabelIcon><Emoji glyph="🎵" size={15} /></LabelIcon>
              <LabelText>{t('settings.musicVolume')}</LabelText>
            </SettingLabel>
            <SliderWrapper>
              <SliderTrack>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={musicVolume}
                  onChange={(e) => handleMusicVolume(parseFloat(e.target.value))}
                />
              </SliderTrack>
              <SliderVal>{Math.round(musicVolume * 100)}%</SliderVal>
            </SliderWrapper>
          </SettingItem>


          <SettingItem>
            <SettingLabel>
              <LabelIcon><Emoji glyph="🎯" size={15} /></LabelIcon>
              <LabelText>{t('settings.showDamage')}</LabelText>
            </SettingLabel>
            <ToggleWrapper>
              <ToggleSwitch $on={showDamage} onClick={() => handleShowDamage(!showDamage)}>
                <ToggleKnob $on={showDamage} />
              </ToggleSwitch>
              <ToggleLabel $on={showDamage}>{showDamage ? 'ON' : 'OFF'}</ToggleLabel>
            </ToggleWrapper>
          </SettingItem>

          <SettingItem>
            <SettingLabel>
              <LabelIcon><Emoji glyph="🗺️" size={15} /></LabelIcon>
              <LabelText>{t('settings.showGrid')}</LabelText>
            </SettingLabel>
            <ToggleWrapper>
              <ToggleSwitch $on={showGrid} onClick={() => handleShowGrid(!showGrid)}>
                <ToggleKnob $on={showGrid} />
              </ToggleSwitch>
              <ToggleLabel $on={showGrid}>{showGrid ? 'ON' : 'OFF'}</ToggleLabel>
            </ToggleWrapper>
          </SettingItem>

          <SettingItem>
            <SettingLabel>
              <LabelIcon><Emoji glyph="🌐" size={15} /></LabelIcon>
              <LabelText>{t('settings.language')}</LabelText>
            </SettingLabel>
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'ko')}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </Select>
          </SettingItem>
        </SettingsList>

        <BugReportButton onClick={() => setShowBugReport(true)}>
          <Emoji glyph="🐛" size={14} /> {t('settings.bugReport')}
        </BugReportButton>

        <DangerZone>
          <DangerLabel><Emoji glyph="⚠️" size={13} /> 위험 구역</DangerLabel>
          <DangerButton onClick={() => {
            if (confirm(t('alerts.confirmReset'))) {
              saveService.clearSave();
              window.location.reload();
            }
          }}>{t('settings.resetData')}</DangerButton>
        </DangerZone>

          <CloseButton onClick={onClose}>{t('common.close')}</CloseButton>
        </ModalScrollBody>
      </ModalBox>
    </ModalOverlay>
    {showBugReport && <BugReport onClose={() => setShowBugReport(false)} />}
    </>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────

const SettingsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;

  ${media.mobile} { gap: 6px; margin-bottom: 16px; }
  ${lMedia.phoneSm} { gap: 5px; margin-bottom: 12px; }
`;

const SettingItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  transition: background 0.2s;
  @media (hover: hover) { &:hover { background: rgba(255,255,255,0.07); } }

  ${media.mobile} { padding: 10px 14px; flex-wrap: wrap; gap: 10px; }
  ${lMedia.phoneSm} { padding: 8px 12px; flex-wrap: wrap; gap: 8px; }
`;

const SettingLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

const LabelIcon = styled.span`
  font-size: 16px;
  ${lMedia.phoneSm} { font-size: 14px; }
`;

const LabelText = styled.label`
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  cursor: default;

  ${media.mobile} { font-size: 0.85rem; }
  ${lMedia.phoneSm} { font-size: 0.82rem; }
`;

const SliderWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  max-width: 240px;

  ${media.mobile} { max-width: 100%; width: 100%; flex: unset; }
  ${lMedia.phoneSm} { max-width: 100%; width: 100%; flex: unset; }
`;

const SliderTrack = styled.div`
  flex: 1;
  min-width: 0;

  input[type="range"] {
    width: 100%;
    accent-color: #4fc3f7;
    cursor: pointer;
  }
`;

const SliderVal = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
  color: #4fc3f7;
  min-width: 36px;
  text-align: right;
`;

const ToggleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ToggleSwitch = styled.div<{ $on: boolean }>`
  width: 44px; height: 24px;
  border-radius: 12px;
  background: ${p => p.$on ? 'rgba(79,195,247,0.25)' : 'rgba(255,255,255,0.07)'};
  border: 1.5px solid ${p => p.$on ? 'rgba(79,195,247,0.6)' : 'rgba(255,255,255,0.15)'};
  position: relative;
  cursor: pointer;
  transition: background 0.25s, border-color 0.25s;
  flex-shrink: 0;
`;

const ToggleKnob = styled.div<{ $on: boolean }>`
  position: absolute;
  width: 17px; height: 17px;
  border-radius: 50%;
  background: ${p => p.$on ? '#4fc3f7' : 'rgba(255,255,255,0.3)'};
  top: 2px;
  left: ${p => p.$on ? '22px' : '2px'};
  transition: left 0.25s, background 0.25s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
`;

const ToggleLabel = styled.div<{ $on: boolean }>`
  font-size: 11px;
  font-weight: 700;
  color: ${p => p.$on ? '#4fc3f7' : 'rgba(255,255,255,0.3)'};
  min-width: 24px;
  transition: color 0.2s;
`;

const Select = styled.select`
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s, background 0.2s;

  option { background: #1a2032; color: #fff; }

  &:focus {
    border-color: rgba(79, 195, 247, 0.5);
    background: rgba(79, 195, 247, 0.08);
  }

  ${media.mobile} { width: 100%; font-size: 12px; }
`;

const DangerZone = styled.div`
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid rgba(231, 76, 60, 0.22);
  border-radius: 12px;
  background: rgba(231, 76, 60, 0.05);

  ${media.mobile} { padding: 12px; margin-bottom: 12px; }
  ${lMedia.phoneSm} { padding: 10px; margin-bottom: 10px; }
`;

const DangerLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: rgba(231, 76, 60, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;

  ${lMedia.phoneSm} { margin-bottom: 7px; }
`;

const DangerButton = styled.button`
  width: 100%;
  padding: 11px;
  background: rgba(231, 76, 60, 0.1);
  color: #e87060;
  border: 1.5px solid rgba(231, 76, 60, 0.35);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  transition: background 0.2s, border-color 0.2s;
  @media (hover: hover) {
    &:hover { background: rgba(231, 76, 60, 0.2); border-color: rgba(231, 76, 60, 0.6); }
  }

  ${media.mobile} { padding: 9px; font-size: 13px; }
  ${lMedia.phoneSm} { padding: 8px; font-size: 12px; }
`;

const CloseButton = styled.button`
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  transition: background 0.2s, color 0.2s;
  @media (hover: hover) {
    &:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
  }

  ${media.mobile} { padding: 10px; font-size: 13px; }
  ${lMedia.phoneSm} { padding: 8px; font-size: 12px; }
`;

const BugReportButton = styled.button`
  width: 100%;
  padding: 12px;
  background: rgba(79, 195, 247, 0.1);
  color: #4fc3f7;
  border: 1.5px solid rgba(79, 195, 247, 0.35);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 16px;
  letter-spacing: 0.04em;
  transition: background 0.2s, border-color 0.2s;
  @media (hover: hover) {
    &:hover {
      background: rgba(79, 195, 247, 0.2);
      border-color: rgba(79, 195, 247, 0.6);
    }
  }

  ${media.mobile} { padding: 10px; font-size: 13px; }
  ${lMedia.phoneSm} { padding: 8px; font-size: 12px; }
`;