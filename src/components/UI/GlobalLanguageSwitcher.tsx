// src/components/UI/GlobalLanguageSwitcher.tsx
import React from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';

const SwitcherContainer = styled.div`
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 1001;
  display: flex;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
`;

const LangButton = styled.button<{ $isActive: boolean }>`
  padding: 4px 10px;
  border: none;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  
  background-color: ${props => props.$isActive ? 'rgba(76, 175, 255, 0.9)' : 'transparent'};
  color: ${props => props.$isActive ? 'white' : '#4b5563'};
  
  &:hover {
    background-color: ${props => props.$isActive ? 'rgba(76, 175, 255, 0.7)' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const GlobalLanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  return (
    <SwitcherContainer>
      <LangButton 
        $isActive={language === 'ko'} 
        onClick={() => setLanguage('ko')}
        aria-label="Switch to Korean"
      >
        KO
      </LangButton>
      <LangButton 
        $isActive={language === 'en'} 
        onClick={() => setLanguage('en')}
        aria-label="Switch to English"
      >
        EN
      </LangButton>
    </SwitcherContainer>
  );
};

export default GlobalLanguageSwitcher;
