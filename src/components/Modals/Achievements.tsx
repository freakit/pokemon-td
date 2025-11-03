// src/components/Modals/Achievements.tsx

import React from 'react';
import { ACHIEVEMENTS } from '../../data/achievements';
import { saveService } from '../../services/SaveService';

export const AchievementsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const data = saveService.load();
  
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h2>🏆 업적</h2>
        <div style={s.list}>
          {ACHIEVEMENTS.map(ach => {
            const progress = data.achievements.find(a => a.id === ach.id);
            return (
              <div key={ach.id} style={s.achievement}>
                <div style={s.icon}>{ach.icon}</div>
                <div style={s.info}>
                  <h3>{ach.name}</h3>
                  <p>{ach.description}</p>
                  <div>진행도: {progress?.progress || 0}/{ach.target}</div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} style={s.btn}>닫기</button>
      </div>
    </div>
  );
};

const s = {
  overlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' as const },
  list: { maxHeight: '500px', overflowY: 'auto' as const, marginBottom: '24px' },
  achievement: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', border: '2px solid #ddd', borderRadius: '12px', marginBottom: '12px' },
  icon: { fontSize: '48px' },
  info: { flex: 1 },
  btn: { width: '100%', padding: '12px', backgroundColor: '#95a5a6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
};
