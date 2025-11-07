// src/components/Modals/Wave50ClearModal.tsx

import React from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';

interface Wave50ClearModalProps {
  onContinue: () => void;
  onRestart: () => void;
}

export const Wave50ClearModal: React.FC<Wave50ClearModalProps> = ({ onContinue, onRestart }) => {
  const { t } = useTranslation();

  return (
    <Overlay>
      <Modal>
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
  background: radial-gradient(circle at center, rgba(255, 215, 0, 0.3), rgba(0, 0, 0, 0.95));
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1002;
  animation: fadeIn 0.5s ease-out;
`;

const Modal = styled.div`
  background: linear-gradient(145deg, #2c3e50 0%, #1a252f 100%);
  color: #e8edf3;
  border-radius: 24px;
  padding: 0;
  max-width: 600px;
  width: 90%;
  box-shadow: 0 25px 80px rgba(255, 215, 0, 0.6), 0 0 1px 1px rgba(255, 215, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 3px solid rgba(255, 215, 0, 0.5);
  animation: pulse 2s ease-in-out infinite;
`;

const Header = styled.div`
  padding: 40px 32px 24px;
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.3), transparent);
  border-bottom: 2px solid rgba(255, 215, 0, 0.4);
  text-align: center;
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
`;

const Content = styled.div`
  padding: 32px;
  text-align: center;
`;

const CongratsText = styled.p`
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
`;

const Subtitle = styled.p`
  font-size: 18px;
  margin: 0 0 32px;
  color: #a8b8c8;
  font-weight: 600;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
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

  &:hover {
    transform: translateY(-2px);
  }
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