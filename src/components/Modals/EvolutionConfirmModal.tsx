// src/components/Modals/EvolutionConfirmModal.tsx

import React from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';

export const EvolutionConfirmModal: React.FC = () => {
  const { t } = useTranslation();
  const evolutionConfirmQueue = useGameStore(state => state.evolutionConfirmQueue || []);
  const towers = useGameStore(state => state.towers);
  const evolvePokemon = useGameStore(state => state.evolvePokemon);

  if (evolutionConfirmQueue.length === 0) return null;

  const current = evolutionConfirmQueue[0];
  const tower = towers.find(t => t.id === current.towerId);

  if (!tower) {
    return null;
  }
  
  const handleEvolve = async (targetId: number) => {
    await evolvePokemon(current.towerId, undefined, targetId);
  };
  
  const handleCancel = () => {
    useGameStore.setState(state => ({
      evolutionConfirmQueue: state.evolutionConfirmQueue.slice(1)
    }));
  };
  
  return (
    <Overlay>
      <Modal>
        <Title>✨ {t('evoConfirm.title')}</Title>
        <Sprite src={tower.sprite} alt={tower.displayName} />
        <Message>
          <strong>{tower.displayName}</strong>{t('evoConfirm.messageSuffix')}
        </Message>
        
        <Options>
          {current.evolutionOptions.map((option) => (
            <EvolveBtn
              key={option.targetId}
              onClick={() => handleEvolve(option.targetId)}
            >
              <EvolveBtnContent>
                <EvolveBtnTitle>✨ {t('evoConfirm.evolveTo', { name: option.targetName })}</EvolveBtnTitle>
                <EvolveBtnMethod>{option.method}</EvolveBtnMethod>
              </EvolveBtnContent>
            </EvolveBtn>
          ))}
        </Options>
        
        <CancelBtn onClick={handleCancel}>
          ❌ {t('evoConfirm.cancel')}
        </CancelBtn>
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
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
`;

const Modal = styled.div`
  background: linear-gradient(145deg, #2a2d3a, #1f2029);
  border-radius: 20px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 215, 0, 0.3);
  animation: slideUp 0.3s ease-out;
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 15px;
  text-align: center;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Sprite = styled.img`
  width: 120px;
  height: 120px;
  display: block;
  margin: 0 auto 15px;
  image-rendering: pixelated;
`;

const Message = styled.p`
  font-size: 18px;
  text-align: center;
  margin-bottom: 20px;
  color: #e0e0e0;

  strong {
    color: #fff;
    font-weight: bold;
  }
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
`;

const EvolveBtn = styled.button`
  padding: 15px;
  font-size: 16px;
  font-weight: bold;
  background: linear-gradient(135deg, #6666ff 0%, #3388ff 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.6);
  }
`;

const EvolveBtnContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const EvolveBtnTitle = styled.span`
  font-size: 18px;
`;

const EvolveBtnMethod = styled.span`
  font-size: 14px;
  opacity: 0.8;
`;

const CancelBtn = styled.button`
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: bold;
  background: #444;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #666;
  }
`;