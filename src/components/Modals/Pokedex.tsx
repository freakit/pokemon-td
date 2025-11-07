// src/components/Modals/Pokedex.tsx

import React from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { saveService } from '../../services/SaveService';

export const Pokedex: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const data = saveService.load();

  return (
    <Overlay>
      <Modal>
        <h2>📖 {t('pokedex.title')}</h2>
        <p>{t('pokedex.collected', { count: data.pokedex.length })}</p>
        <Grid>
          {data.pokedex.map(id => (
            <Entry key={id}>#{id}</Entry>
          ))}
        </Grid>
        <CloseButton onClick={onClose}>{t('common.close')}</CloseButton>
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
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
`;

const Modal = styled.div`
  background-color: #fff;
  border-radius: 16px;
  padding: 32px;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  color: #333;

  h2 {
    color: #000;
    margin-bottom: 8px;
  }

  p {
    margin-bottom: 16px;
    font-size: 16px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  margin: 24px 0;
`;

const Entry = styled.div`
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  text-align: center;
  font-weight: bold;
`;

const CloseButton = styled.button`
  width: 100%;
  padding: 12px;
  background-color: #95a5a6;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;

  &:hover {
    background-color: #7f8c8d;
  }
`;