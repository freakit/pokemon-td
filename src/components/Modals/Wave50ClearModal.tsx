// src/components/Modals/Wave50ClearModal.tsx

import React from 'react';

interface Wave50ClearModalProps {
  onContinue: () => void;
  onRestart: () => void;
}

export const Wave50ClearModal: React.FC<Wave50ClearModalProps> = ({ onContinue, onRestart }) => {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>🎉 축하합니다! 🎉</h2>
        </div>
        <div style={s.content}>
          <p style={s.congratsText}>
            웨이브 50을 클리어하셨습니다!
          </p>
          <p style={s.subtitle}>
            게임을 계속 진행하시겠습니까?
          </p>
          <div style={s.buttonContainer}>
            <button style={s.continueBtn} onClick={onContinue}>
              🎮 계속하기
            </button>
            <button style={s.restartBtn} onClick={onRestart}>
              🔄 처음부터 시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at center, rgba(255, 215, 0, 0.3), rgba(0,0,0,0.95))',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1002,
    animation: 'fadeIn 0.5s ease-out'
  },
  modal: {
    background: 'linear-gradient(145deg, #2c3e50 0%, #1a252f 100%)',
    color: '#e8edf3',
    borderRadius: '24px',
    padding: '0',
    maxWidth: '600px',
    width: '90%',
    boxShadow: '0 25px 80px rgba(255, 215, 0, 0.6), 0 0 1px 1px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
    border: '3px solid rgba(255, 215, 0, 0.5)',
    animation: 'pulse 2s ease-in-out infinite'
  },
  header: {
    padding: '40px 32px 24px',
    background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.3), transparent)',
    borderBottom: '2px solid rgba(255, 215, 0, 0.4)',
    textAlign: 'center' as 'center'
  },
  title: {
    fontSize: '42px',
    fontWeight: '900',
    margin: 0,
    background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 40px rgba(255, 215, 0, 0.8)',
    letterSpacing: '2px'
  },
  content: {
    padding: '32px',
    textAlign: 'center' as 'center'
  },
  congratsText: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 0 16px',
    color: '#ffd700',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.6)'
  },
  subtitle: {
    fontSize: '18px',
    margin: '0 0 32px',
    color: '#a8b8c8',
    fontWeight: '600'
  },
  buttonContainer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '16px',
    alignItems: 'center'
  },
  continueBtn: {
    width: '100%',
    maxWidth: '400px',
    padding: '20px 32px',
    fontSize: '20px',
    fontWeight: 'bold' as 'bold',
    background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
    color: '#fff',
    border: '2px solid rgba(39, 174, 96, 0.5)',
    borderRadius: '14px',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(39, 174, 96, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
  },
  restartBtn: {
    width: '100%',
    maxWidth: '400px',
    padding: '20px 32px',
    fontSize: '20px',
    fontWeight: 'bold' as 'bold',
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    color: '#fff',
    border: '2px solid rgba(231, 76, 60, 0.5)',
    borderRadius: '14px',
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(231, 76, 60, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
  }
};