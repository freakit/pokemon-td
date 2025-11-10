// src/components/Modals/Pokedex.tsx

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from '../../i18n';
import { databaseService } from '../../services/DatabaseService';
import { PokedexEntry } from '../../types/multiplayer';

export const Pokedex: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const [pokedexData, setPokedexData] = useState<PokedexEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPokedex = async () => {
      setLoading(true);
      try {
        const data = await databaseService.getUserPokedex();
        setPokedexData(data);
      } catch (err) {
        console.error("Failed to load pokedex:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPokedex();
  }, []);

  return (
    <Overlay>
      <Modal>
        <h2>📖 {t('pokedex.title')}</h2>
        <p>{t('pokedex.collected', { count: pokedexData.length })}</p>
        
        {loading ? (
          <LoadingMessage>도감 정보를 불러오는 중...</LoadingMessage>
        ) : (
          <Grid>
            {/* 9. PokedexEntry 객체 배열을 순회 */}
            {pokedexData.map(entry => (
              <Entry key={entry.pokemonId}>
                <EntryID>#{entry.pokemonId}</EntryID>
                <EntryName>{entry.name}</EntryName>
              </Entry>
            ))}
          </Grid>
        )}
        
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

const LoadingMessage = styled.div`
  text-align: center;
  padding: 40px;
  font-size: 16px;
  color: #888;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  margin: 24px 0;
`;

const Entry = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  text-align: center;
  font-weight: bold;
`;

const EntryID = styled.div`
  font-size: 14px;
  color: #777;
`;

const EntryName = styled.div`
  font-size: 16px;
  color: #333;
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