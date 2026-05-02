// src/components/Modals/EvolutionConfirmModal.tsx

import React from 'react';
import styled from 'styled-components';
import { lMedia } from '../../utils/responsive.utils';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';

// ─── 반응형 헬퍼 ──────────────────────────────────────────────────────────────
const L1024 = lMedia.tablet;   // ≤1024px landscape
const L768  = lMedia.phone;    // ≤768px  landscape
const LSm   = lMedia.phoneSm;  // landscape + max-height ≤520px

export const EvolutionConfirmModal: React.FC = () => {
  const { t } = useTranslation();
  const evolutionConfirmQueue = useGameStore(state => state.evolutionConfirmQueue || []);
  const towers = useGameStore(state => state.towers);
  const evolvePokemon = useGameStore(state => state.evolvePokemon);

  if (evolutionConfirmQueue.length === 0) return null;

  const current = evolutionConfirmQueue[0];
  const tower = towers.find(t => t.id === current.towerId);

  if (!tower) return null;

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

// ─── Styled Components ────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
  padding: 16px;
  overflow-y: auto;

  /* 가로 모드에서 모달 높이 초과 시 스크롤 가능 */
  ${L768} { align-items: flex-start; padding: 10px; }
  ${LSm}  { padding: 8px; }
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

  ${L1024} { padding: 22px; border-radius: 16px; max-width: 440px; }
  ${L768}  { padding: 16px; border-radius: 12px; max-width: 400px; width: 94%; }
  ${LSm}   { padding: 14px; border-radius: 10px; width: 96%; }
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 15px;
  text-align: center;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  background-clip: text;
  -webkit-text-fill-color: transparent;

  ${L1024} { font-size: 24px; margin-bottom: 12px; }
  ${L768}  { font-size: 20px; margin-bottom: 10px; }
  ${LSm}   { font-size: 18px; margin-bottom: 8px; }
`;

const Sprite = styled.img`
  width: 120px;
  height: 120px;
  display: block;
  margin: 0 auto 15px;
  image-rendering: pixelated;

  ${L1024} { width: 96px;  height: 96px;  margin-bottom: 12px; }
  ${L768}  { width: 80px;  height: 80px;  margin-bottom: 10px; }
  ${LSm}   { width: 64px;  height: 64px;  margin-bottom: 8px; }
`;

const Message = styled.p`
  font-size: 18px;
  text-align: center;
  margin-bottom: 20px;
  color: #e0e0e0;

  strong { color: #fff; font-weight: bold; }

  ${L1024} { font-size: 16px; margin-bottom: 16px; }
  ${L768}  { font-size: 14px; margin-bottom: 12px; }
  ${LSm}   { font-size: 13px; margin-bottom: 10px; }
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;

  ${L1024} { gap: 10px; margin-bottom: 16px; }
  ${L768}  { gap: 8px;  margin-bottom: 12px; }
  ${LSm}   { gap: 7px;  margin-bottom: 10px; }
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

  ${L1024} { padding: 12px; border-radius: 10px; }
  ${L768}  { padding: 10px; border-radius: 8px; }
  ${LSm}   { padding: 8px;  border-radius: 7px; }
`;

const EvolveBtnContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  ${L768} { gap: 3px; }
`;

const EvolveBtnTitle = styled.span`
  font-size: 18px;

  ${L1024} { font-size: 16px; }
  ${L768}  { font-size: 14px; }
  ${LSm}   { font-size: 13px; }
`;

const EvolveBtnMethod = styled.span`
  font-size: 14px;
  opacity: 0.8;

  ${L768} { font-size: 12px; }
  ${LSm}  { font-size: 11px; }
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

  &:hover { background: #666; }

  ${L1024} { padding: 10px; font-size: 14px; border-radius: 10px; }
  ${L768}  { padding: 9px;  font-size: 13px; border-radius: 8px; }
  ${LSm}   { padding: 8px;  font-size: 12px; }
`;