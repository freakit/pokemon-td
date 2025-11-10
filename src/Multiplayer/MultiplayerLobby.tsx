// src/Multiplayer/MultiplayerLobby.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { multiplayerService } from '../services/MultiplayerService';
import { Room, AIDifficulty } from '../types/multiplayer';
import { MAPS } from '../data/maps';
import { authService } from '../services/AuthService';

interface MultiplayerLobbyProps {
  onBack: () => void;
  onStartGame: (roomId: string, mapId: string) => void;
}

export const MultiplayerLobby = ({ onBack, onStartGame }: MultiplayerLobbyProps) => {
  const [view, setView] = useState<'list' | 'create' | 'room'>('list');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedMap, setSelectedMap] = useState(MAPS[0].id);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const user = authService.getCurrentUser();

  useEffect(() => {
    const unsubscribe = multiplayerService.onRoomsUpdate(setRooms);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const roomId = multiplayerService.getCurrentRoomId();
    if (roomId) {
      const unsubscribe = multiplayerService.onRoomUpdate(roomId, (room) => {
        if (!room) {
          setView('list');
          setCurrentRoom(null);
          return;
        }
        setCurrentRoom(room);
        
        if (room.status === 'starting' || room.status === 'playing') {
          onStartGame(room.id, room.mapId);
        }
      });
      return unsubscribe;
    }
  }, [view]);

  const handleCreateRoom = async () => {
    try {
      const map = MAPS.find(m => m.id === selectedMap);
      if (!map) {
        alert('맵을 선택해주세요.');
        return;
      }
      
      await multiplayerService.createRoom(map.id, map.name);

      setView('room');
    } catch (err: any) {
      alert(err.message);
      setView('list');
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      await multiplayerService.joinRoom(roomId);
      setView('room');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLeaveRoom = async () => {
    if (currentRoom) {
      await multiplayerService.leaveRoom(currentRoom.id);
      setView('list');
      setCurrentRoom(null);
    }
  };

  const handleAddAI = async (difficulty: AIDifficulty) => {
    if (currentRoom) {
      try {
        await multiplayerService.addAI(currentRoom.id, difficulty);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleToggleReady = async () => {
    if (currentRoom) {
      await multiplayerService.toggleReady(currentRoom.id);
    }
  };

  const handleStartGame = async () => {
    if (currentRoom) {
      try {
        await multiplayerService.startGame(currentRoom.id);
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  if (view === 'list') {
    return (
      <Overlay>
        <Container>
          <Header>
            <Title>멀티플레이어 로비</Title>
            <BackButton onClick={onBack}>← 뒤로가기</BackButton>
          </Header>

          <ButtonRow>
            <CreateRoomButton onClick={() => setView('create')}>
               ➕ 방 만들기
            </CreateRoomButton>
          </ButtonRow>

          <RoomList>
            {rooms.length === 0 ? (
              <EmptyMessage>생성된 방이 없습니다</EmptyMessage>
            ) : (
               rooms.map(room => (
                <RoomCard key={room.id}>
                  <RoomInfo>
                    <RoomName>{room.name}</RoomName>
                    <RoomDetails>
                     맵: {room.mapName} | 호스트: {room.hostName}
                    </RoomDetails>
                  </RoomInfo>
                  <RoomPlayers>
                    {room.players.length} / {room.maxPlayers}
                  </RoomPlayers>
                  <JoinButton
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={room.players.length >= room.maxPlayers}
                  >
                   참가
                  </JoinButton>
                </RoomCard>
              ))
            )}
          </RoomList>
        </Container>
      </Overlay>
    );
  }

  if (view === 'create') {
    return (
      <Overlay>
        <Container>
          <Header>
            <Title>방 만들기</Title>
            <BackButton onClick={() => setView('list')}>← 뒤로가기</BackButton>
          </Header>

          <Section>
            <SectionTitle>맵 선택</SectionTitle>
             <MapGrid>
              {MAPS.map(map => (
                <MapCard
                  key={map.id}
                  selected={selectedMap === map.id}
                  onClick={() => setSelectedMap(map.id)}
                >
                  <MapName>{map.name}</MapName>
                  <MapDifficulty>난이도: {map.difficulty}</MapDifficulty>
                </MapCard>
              ))}
            </MapGrid>
           </Section>

          <CreateButton onClick={handleCreateRoom}>
            방 만들기
          </CreateButton>
        </Container>
      </Overlay>
    );
  }

  if (view === 'room' && currentRoom) {
    const isHost = currentRoom.hostId === user?.uid;
    const currentPlayer = currentRoom.players.find(p => p.userId === user?.uid);
    const allReady = currentRoom.players.every(p => p.isReady);
    return (
      <Overlay>
        <Container>
          <Header>
            <Title>{currentRoom.name}</Title>
            <BackButton onClick={handleLeaveRoom}>← 나가기</BackButton>
          </Header>

          <Section>
            <SectionTitle>맵: {currentRoom.mapName}</SectionTitle>
          </Section>

           <Section>
            <SectionTitle>플레이어 ({currentRoom.players.length}/{currentRoom.maxPlayers})</SectionTitle>
            <PlayerList>
              {currentRoom.players.map(player => (
                <PlayerCard key={player.userId}>
                  <PlayerName>
                     {player.userName}
                    {player.userId === currentRoom.hostId && ' 👑'}
                    {player.isAI && ' 🤖'}
                  </PlayerName>
                  <PlayerRating>Rating: {player.rating}</PlayerRating>
                   <PlayerStatus ready={player.isReady}>
                    {player.isReady ? '✓ 준비완료' : '대기중'}
                  </PlayerStatus>
                </PlayerCard>
              ))}
            </PlayerList>
          </Section>

           {isHost && currentRoom.players.length < currentRoom.maxPlayers && (
            <Section>
              <SectionTitle>AI 추가</SectionTitle>
              <AIButtons>
                <AIButton onClick={() => handleAddAI('easy')}>Easy AI</AIButton>
                <AIButton onClick={() => handleAddAI('normal')}>Normal AI</AIButton>
                 <AIButton onClick={() => handleAddAI('hard')}>Hard AI</AIButton>
              </AIButtons>
            </Section>
          )}

          <ButtonRow>
            {!isHost && (
              <ReadyButton onClick={handleToggleReady} ready={currentPlayer?.isReady || false}>
                {currentPlayer?.isReady ? '준비 취소' : '준비'}
              </ReadyButton>
            )}
            
            {isHost && (
              <StartButton
                onClick={handleStartGame}
                 disabled={!allReady || currentRoom.players.length < 2}
              >
                게임 시작
              </StartButton>
            )}
          </ButtonRow>
        </Container>
      </Overlay>
    );
  }

  return null;
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
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
`;
const Title = styled.h2`
  font-size: 2rem;
  color: white;
  font-weight: bold;
`;

const BackButton = styled.button`
  padding: 0.5rem 1rem;
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid white;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  &:hover {
    background: rgba(255,255,255,0.3);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;
const CreateRoomButton = styled.button`
  flex: 1;
  padding: 1rem;
  background: white;
  color: #667eea;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  }
`;
const RoomList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: white;
  padding: 2rem;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
`;

const RoomCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 10px;
`;

const RoomInfo = styled.div`
  flex: 1;
`;
const RoomName = styled.div`
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
`;

const RoomDetails = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const RoomPlayers = styled.div`
  font-weight: bold;
  color: #667eea;
  font-size: 1.1rem;
`;
const JoinButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(:disabled) {
    background: #5568d3;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.3rem;
  color: white;
  margin-bottom: 1rem;
`;

const MapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;
const MapCard = styled.div<{ selected: boolean }>`
  padding: 1.5rem;
  background: ${props => props.selected ? 'white' : 'rgba(255,255,255,0.8)'};
  border: 3px solid ${props => props.selected ? '#667eea' : 'transparent'};
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  &:hover {
    transform: translateY(-2px);
  }
`;

const MapName = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
`;
const MapDifficulty = styled.div`
  font-size: 0.9rem;
  color: #666;
`;

const CreateButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: white;
  color: #667eea;
  font-size: 1.2rem;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  }
`;

const PlayerList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
`;

const PlayerCard = styled.div`
  padding: 1rem;
  background: white;
  border-radius: 10px;
`;
const PlayerName = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
`;

const PlayerRating = styled.div`
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
`;

const PlayerStatus = styled.div<{ ready: boolean }>`
  font-weight: bold;
  color: ${props => props.ready ? '#4caf50' : '#ff9800'};
`;

const AIButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;
const AIButton = styled.button`
  flex: 1;
  padding: 0.75rem;
  background: white;
  color: #667eea;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #f0f0f0;
  }
`;
const ReadyButton = styled.button<{ ready: boolean }>`
  flex: 1;
  padding: 1rem;
  background: ${props => props.ready ? '#ff9800' : '#4caf50'};
  color: white;
  font-size: 1.1rem;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  &:hover {
    opacity: 0.9;
  }
`;

const StartButton = styled.button`
  flex: 1;
  padding: 1rem;
  background: #4caf50;
  color: white;
  font-size: 1.1rem;
  font-weight: bold;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
  &:hover:not(:disabled) {
    background: #45a049;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;