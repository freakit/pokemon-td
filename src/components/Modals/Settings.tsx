// src/components/Modals/Settings.tsx

import React from 'react';
import { saveService } from '../../services/SaveService';
import { soundService } from '../../services/SoundService';

export const Settings: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const settings = saveService.load().settings;
  
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h2>⚙️ 설정</h2>
        <div style={s.settings}>
          <div style={s.setting}>
            <label>음악 볼륨</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue={settings.musicVolume}
              onChange={(e) => soundService.setMusicVolume(parseFloat(e.target.value))}
            />
          </div>
          <div style={s.setting}>
            <label>효과음 볼륨</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              defaultValue={settings.sfxVolume}
              onChange={(e) => soundService.setSFXVolume(parseFloat(e.target.value))}
            />
          </div>
          <div style={s.setting}>
            <label>데미지 숫자 표시</label>
            <input type="checkbox" defaultChecked={settings.showDamageNumbers} />
          </div>
          <div style={s.setting}>
            <label>그리드 표시</label>
            <input type="checkbox" defaultChecked={settings.showGrid} />
          </div>
          <div style={s.danger}>
            <button onClick={() => {
              if (confirm('정말 모든 데이터를 초기화하시겠습니까?')) {
                saveService.clearSave();
                window.location.reload();
              }
            }} style={s.dangerBtn}>데이터 초기화</button>
          </div>
        </div>
        <button onClick={onClose} style={s.btn}>닫기</button>
      </div>
    </div>
  );
};

const s = {
  overlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '600px' },
  settings: { marginBottom: '24px' },
  setting: { marginBottom: '16px', padding: '12px', border: '1px solid #ddd', borderRadius: '8px' },
  danger: { marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #e74c3c' },
  dangerBtn: { width: '100%', padding: '12px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  btn: { width: '100%', padding: '12px', backgroundColor: '#95a5a6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
};
