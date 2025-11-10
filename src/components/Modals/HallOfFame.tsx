// src/components/Modals/HallOfFame.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { databaseService } from '../../services/DatabaseService';
import { HallOfFameEntry } from '../../types/multiplayer';

interface HallOfFameProps {
  onClose: () => void;
}

export const HallOfFame = ({ onClose }: HallOfFameProps) => {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await databaseService.getUserHallOfFame();
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}분 ${secs}초`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Overlay onClick={onClose}>
      <Container onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>👑 전당등록</Title>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </Header>

        {loading ? (
          <Loading>로딩 중...</Loading>
        ) : entries.length === 0 ? (
          <EmptyMessage>
            아직 클리어 기록이 없습니다.<br/>
            게임을 클리어하면 이곳에 기록됩니다!
          </EmptyMessage>
        ) : (
          <EntriesContainer>
            {entries.map(entry => (
              <EntryCard key={entry.id}>
                <EntryHeader>
                  <MapName>{entry.mapName}</MapName>
                  <Wave>Wave {entry.wave}</Wave>
                </EntryHeader>
                
                <ClearTime>
                  ⏱️ 클리어 시간: {formatTime(entry.clearTime)}
                </ClearTime>

                <PokemonList>
                  <PokemonTitle>사용한 포켓몬:</PokemonTitle>
                  <Pokemon>
                    {entry.pokemonUsed.join(', ')}
                  </Pokemon>
                </PokemonList>

                <EntryDate>{formatDate(entry.timestamp)}</EntryDate>
              </EntryCard>
            ))}
          </EntriesContainer>
        )}
      </Container>
    </Overlay>
  );
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Container = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  border-radius: 20px;
  max-width: 900px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(255,255,255,0.2);
`;

const Title = styled.h2`
  font-size: 2rem;
  color: white;
  font-weight: bold;
`;

const CloseButton = styled.button`
  width: 40px;
  height: 40px;
  background: rgba(255,255,255,0.2);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.5rem;
  transition: all 0.3s;

  &:hover {
    background: rgba(255,255,255,0.3);
  }
`;

const Loading = styled.div`
  text-align: center;
  color: white;
  font-size: 1.2rem;
  padding: 3rem;
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: white;
  font-size: 1.1rem;
  padding: 3rem;
  line-height: 1.6;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
`;

const EntriesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const EntryCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 15px;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  }
`;

const EntryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const MapName = styled.div`
  font-size: 1.3rem;
  font-weight: bold;
  color: #333;
`;

const Wave = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
`;

const ClearTime = styled.div`
  font-size: 1rem;
  color: #666;
  margin-bottom: 1rem;
`;

const PokemonList = styled.div`
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 10px;
  margin-bottom: 1rem;
`;

const PokemonTitle = styled.div`
  font-size: 0.9rem;
  font-weight: bold;
  color: #666;
  margin-bottom: 0.5rem;
`;

const Pokemon = styled.div`
  font-size: 1rem;
  color: #333;
  line-height: 1.5;
`;

const EntryDate = styled.div`
  font-size: 0.9rem;
  color: #999;
  text-align: right;
`;
