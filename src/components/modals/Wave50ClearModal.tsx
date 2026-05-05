// src/components/modals/Wave50ClearModal.tsx

import React from 'react';
import styled from 'styled-components';
import { ModalOverlay, ModalBox, MODAL_ACCENT } from '../shared/modal.styles';
import { lMedia } from '../../utils/responsive.utils';
import { useTranslation } from '../../i18n';

// ─── 반응형 헬퍼 ──────────────────────────────────────────────────────────────
const L1024 = lMedia.tablet;   // ≤1024px landscape
const L768  = lMedia.phone;    // ≤768px  landscape
const LSm   = lMedia.phoneSm;  // landscape + max-height ≤520px

interface Wave50ClearModalProps {
  onContinue: () => void;
  onRestart: () => void;
}

export const Wave50ClearModal: React.FC<Wave50ClearModalProps> = ({ onContinue, onRestart }) => {
  const { t } = useTranslation();

  return (
    <ModalOverlay $zIndex={1002}>
      <ModalBox $size="sm" $accent={MODAL_ACCENT.gold} $animate="slideUp" $scroll>
        <Header>
          <Title>🎉 {t('waveClear.title')}! 🎉</Title>
        </Header>
        <Content>
          <CongratsText>
            {t('waveClear.subtitle')}
          </CongratsText>
          <Subtitle>
            {t('waveClear.prompt')}
          </Subtitle>
          <ButtonContainer>
            <ContinueBtn onClick={onContinue}>
              🎮 {t('waveClear.continue')}
            </ContinueBtn>
            <RestartBtn onClick={onRestart}>
              🔄 {t('waveClear.restart')}
            </RestartBtn>
          </ButtonContainer>
        </Content>
      </ModalBox>
    </ModalOverlay>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────



const Header = styled.div`
  padding: 40px 32px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  text-align: center;

  ${L1024} { padding: 28px 24px 18px; }
  ${L768}  { padding: 20px 18px 14px; }
  ${LSm}   { padding: 14px 14px 10px; }
`;

const Title = styled.h2`
  font-size: 42px;
  font-weight: 900;
  margin: 0;
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 40px rgba(255, 215, 0, 0.8);
  letter-spacing: 2px;

  ${L1024} { font-size: 32px; letter-spacing: 1.5px; }
  ${L768}  { font-size: 26px; letter-spacing: 1px; }
  ${LSm}   { font-size: 22px; letter-spacing: 0.5px; }
`;

const Content = styled.div`
  padding: 32px;
  text-align: center;

  ${L1024} { padding: 22px; }
  ${L768}  { padding: 16px; }
  ${LSm}   { padding: 12px; }
`;

const CongratsText = styled.p`
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.6);

  ${L1024} { font-size: 20px; margin: 0 0 12px; }
  ${L768}  { font-size: 17px; margin: 0 0 10px; }
  ${LSm}   { font-size: 15px; margin: 0 0 8px; }
`;

const Subtitle = styled.p`
  font-size: 18px;
  margin: 0 0 32px;
  color: #a8b8c8;
  font-weight: 600;

  ${L1024} { font-size: 15px; margin: 0 0 22px; }
  ${L768}  { font-size: 14px; margin: 0 0 16px; }
  ${LSm}   { font-size: 12px; margin: 0 0 12px; }
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;

  ${L1024} { gap: 12px; }
  ${L768}  { gap: 10px; }
  ${LSm}   { gap: 8px; }
`;

const BaseButton = styled.button`
  width: 100%;
  max-width: 400px;
  padding: 20px 32px;
  font-size: 20px;
  font-weight: bold;
  color: #fff;
  border-radius: 14px;
  cursor: pointer;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);

  @media (hover: hover) {
    &:hover { transform: translateY(-2px); }
  }

  ${L1024} { padding: 15px 24px; font-size: 17px; border-radius: 12px; max-width: 360px; }
  ${L768}  { padding: 12px 20px; font-size: 15px; border-radius: 10px; max-width: 320px; }
  ${LSm}   { padding: 10px 16px; font-size: 14px; border-radius: 9px;  max-width: 300px; }
`;

const ContinueBtn = styled(BaseButton)`
  background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
  border: 2px solid rgba(39, 174, 96, 0.5);
  box-shadow: 0 8px 24px rgba(39, 174, 96, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);

  &:hover {
    box-shadow: 0 12px 32px rgba(39, 174, 96, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
`;

const RestartBtn = styled(BaseButton)`
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  border: 2px solid rgba(231, 76, 60, 0.5);
  box-shadow: 0 8px 24px rgba(231, 76, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);

  &:hover {
    box-shadow: 0 12px 32px rgba(231, 76, 60, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }
`;