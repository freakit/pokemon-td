// src/components/modals/EvolutionConfirmModal.tsx

import React from 'react';
import styled from 'styled-components';
import { lMedia } from '../../utils/responsive.utils';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { ModalOverlay, ModalBox, MODAL_ACCENT } from '../shared/modal.styles';

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
    <ModalOverlay>
      <ModalBox $size="sm" $accent={MODAL_ACCENT.gold} $animate="slideUp" $scroll>
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
      </ModalBox>
    </ModalOverlay>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────



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
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
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