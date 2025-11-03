// src/components/Modals/Pokedex.tsx

import React from 'react';
import { saveService } from '../../services/SaveService';

export const Pokedex: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const data = saveService.load();
  
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <h2>📖 포켓몬 도감</h2>
        <p>수집한 포켓몬: {data.pokedex.length}마리</p>
        <div style={s.grid}>
          {data.pokedex.map(id => (
            <div key={id} style={s.entry}>#{id}</div>
          ))}
        </div>
        <button onClick={onClose} style={s.btn}>닫기</button>
      </div>
    </div>
  );
};

const s = {
  overlay: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' as const },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', margin: '24px 0' },
  entry: { padding: '12px', border: '2px solid #ddd', borderRadius: '8px', textAlign: 'center' as const },
  btn: { width: '100%', padding: '12px', backgroundColor: '#95a5a6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
};
