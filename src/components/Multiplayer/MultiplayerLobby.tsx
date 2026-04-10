// src/components/Multiplayer/MultiplayerLobby.tsx
import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { multiplayerService } from '../../services/MultiplayerService';
import { Room, AIDifficulty } from '../../types/multiplayer';
import { MAPS } from '../../data/maps';
import { authService } from '../../services/AuthService';
import { useTranslation } from '../../i18n';

import { Pokedex } from '../Modals/Pokedex';
import { AchievementsPanel } from '../Modals/Achievements';
import { HallOfFame } from '../Modals/HallOfFame';
import { Rankings } from '../Modals/Rankings';

interface MultiplayerLobbyProps {
  onBack: () => void;
  onStartGame: (roomId: string, mapId: string) => void;
}

export const MultiplayerLobby = ({ onBack, onStartGame }: MultiplayerLobbyProps) => {
  const { t } = useTranslation();
  const [view, setView] = useState<'list' | 'create' | 'room'>('list');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedMap, setSelectedMap] = useState(MAPS[0].id);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [isCheckingRejoin, setIsCheckingRejoin] = useState(true);
  const [rejoinableRoom, setRejoinableRoom] = useState<Room | null>(null);
  const startingRef = useRef(false);
  const user = authService.getCurrentUser();

  const [showPokedex, setShowPokedex] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showRankings, setShowRankings] = useState(false);

  useEffect(() => {
    const checkRejoin = async () => {
      const savedRoomId = multiplayerService.getCurrentRoomId();
      if (savedRoomId) {
        try {
          const { room, canRejoin } = await multiplayerService.rejoinRoom(savedRoomId);
          if (canRejoin && room) {
            setRejoinableRoom(room);
          } else {
            multiplayerService.clearCurrentRoom();
          }
        } catch (error) {
          console.error('Failed to check rejoin room:', error);
          multiplayerService.clearCurrentRoom();
        }
      }
      setIsCheckingRejoin(false);
    };
    checkRejoin();
  }, []);

  useEffect(() => {
    if (!isCheckingRejoin && !rejoinableRoom) {
      const unsubscribe = multiplayerService.onRoomsUpdate(setRooms);
      return unsubscribe;
    }
  }, [isCheckingRejoin, rejoinableRoom]);

  useEffect(() => {
    const roomId = multiplayerService.getCurrentRoomId();
    if (roomId && view === 'room' && !startingRef.current) {
      const unsubscribe = multiplayerService.onRoomUpdate(roomId, (room) => {
        if (!room) {
          setView('list');
          setCurrentRoom(null);
          return;
        }
        setCurrentRoom(room);
        if ((room.status === 'starting' || room.status === 'playing') && !startingRef.current) {
          startingRef.current = true;
          onStartGame(room.id, room.mapId);
        }
      });
      return unsubscribe;
    }
  }, [view, onStartGame]);

  const handleCreateRoom = async () => {
    try {
      const selectedMapData = MAPS.find(m => m.id === selectedMap);
      if (!selectedMapData) throw new Error('Invalid map');
      const roomId = await multiplayerService.createRoom(selectedMap, selectedMapData.name);
      const room = await multiplayerService.rejoinRoom(roomId);
      setCurrentRoom(room.room);
      setView('room');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      await multiplayerService.joinRoom(roomId);
      const room = await multiplayerService.rejoinRoom(roomId);
      setCurrentRoom(room.room);
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

  const handleBackToCreate = () => {
    if (currentRoom) {
      multiplayerService.leaveRoom(currentRoom.id);
      setCurrentRoom(null);
    }
    setView('create');
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

  const handleRejoin = () => {
    if (!rejoinableRoom) return;
    if (rejoinableRoom.status === 'playing' || rejoinableRoom.status === 'starting') {
      onStartGame(rejoinableRoom.id, rejoinableRoom.mapId);
    } else {
      setCurrentRoom(rejoinableRoom);
      setView('room');
    }
    setRejoinableRoom(null);
  };

  const handleAbandon = async () => {
    if (!rejoinableRoom) return;
    try {
      await multiplayerService.leaveRoom(rejoinableRoom.id);
    } catch (err) {
      console.error('Failed to leave room:', err);
      multiplayerService.clearCurrentRoom();
    }
    setRejoinableRoom(null);
    setView('list');
  };

  if (isCheckingRejoin) {
    return (
      <Overlay>
        <Container>
          <LoadingText>재접속 확인 중...</LoadingText>
        </Container>
      </Overlay>
    );
  }

  if (rejoinableRoom) {
    return (
      <RejoinPrompt
        roomName={rejoinableRoom.name}
        onRejoin={handleRejoin}
        onAbandon={handleAbandon}
      />
    );
  }

  if (view === 'list') {
    return (
      <>
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
                        맵: {t(`mapData.${room.mapId}.name`) !== `mapData.${room.mapId}.name`
                          ? t(`mapData.${room.mapId}.name`)
                          : room.mapName} | 호스트: {room.hostName}
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
        {showPokedex && <Pokedex onClose={() => setShowPokedex(false)} />}
        {showAchievements && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
        {showHallOfFame && <HallOfFame onClose={() => setShowHallOfFame(false)} />}
        {showRankings && <Rankings onClose={() => setShowRankings(false)} />}
      </>
    );
  }

  if (view === 'create') {
    return (
      <>
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
                    $selected={selectedMap === map.id}
                    onClick={() => setSelectedMap(map.id)}
                  >
                    <MapName>
                      {t(`mapData.${map.id}.name`) !== `mapData.${map.id}.name`
                        ? t(`mapData.${map.id}.name`)
                        : map.name}
                    </MapName>
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
        {showPokedex && <Pokedex onClose={() => setShowPokedex(false)} />}
        {showAchievements && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
        {showHallOfFame && <HallOfFame onClose={() => setShowHallOfFame(false)} />}
        {showRankings && <Rankings onClose={() => setShowRankings(false)} />}
      </>
    );
  }

  if (view === 'room' && currentRoom) {
    const isHost = currentRoom.hostId === user?.uid;
    const currentPlayer = currentRoom.players.find(p => p.userId === user?.uid);
    const allReady = currentRoom.players.every(p => p.isReady);
    const backAction = currentRoom.hostId === user?.uid ? handleBackToCreate : handleLeaveRoom;

    return (
      <>
        <Overlay>
          <Container>
            <Header>
              <Title>{currentRoom.name}</Title>
              <BackButton onClick={backAction}>← 나가기</BackButton>
            </Header>

            <Section>
              <SectionTitle>
                맵: {t(`mapData.${currentRoom.mapId}.name`) !== `mapData.${currentRoom.mapId}.name`
                  ? t(`mapData.${currentRoom.mapId}.name`)
                  : currentRoom.mapName}
              </SectionTitle>
            </Section>

            <Section>
              <SectionTitle>
                플레이어 ({currentRoom.players.length}/{currentRoom.maxPlayers})
              </SectionTitle>
              <PlayerList>
                {currentRoom.players.map(player => (
                  <PlayerCard key={player.userId}>
                    <PlayerName>
                      {player.userName}
                      {player.userId === currentRoom.hostId && ' 👑'}
                      {player.isAI && ' 🤖'}
                    </PlayerName>
                    <PlayerRating>Rating: {player.rating}</PlayerRating>
                    {/* $ready transient prop — DOM에 전달 안 됨 */}
                    <PlayerStatus $ready={player.isReady}>
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
                /* $ready transient prop — DOM에 전달 안 됨 */
                <ReadyButton
                  onClick={handleToggleReady}
                  $ready={currentPlayer?.isReady || false}
                >
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
        {showPokedex && <Pokedex onClose={() => setShowPokedex(false)} />}
        {showAchievements && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
        {showHallOfFame && <HallOfFame onClose={() => setShowHallOfFame(false)} />}
        {showRankings && <Rankings onClose={() => setShowRankings(false)} />}
      </>
    );
  }

  return null;
};

// ─── Styled Components ────────────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

const Container = styled.div`
  background: rgba(26, 27, 33, 0.95);
  padding: 2.5rem;
  border-radius: 12px;
  max-width: 900px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 48px rgba(0,0,0,0.4);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  font-size: 1.8rem;
  color: white;
  font-weight: 700;
`;

const BackButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  color: #a0a0a0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.05); color: white; }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const CreateRoomButton = styled.button`
  flex: 1;
  padding: 1rem;
  background: #23252e;
  color: #e0e0e0;
  font-weight: 600;
  font-size: 1.05rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: #2a2d36;
  }
`;

const RoomList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const EmptyMessage = styled.div`
  text-align: center;
  color: #a0a0a0;
  padding: 2.5rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const RoomCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: white;
`;

const RoomInfo = styled.div`flex: 1;`;

const RoomName = styled.div`
  font-size: 1.15rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const RoomDetails = styled.div`
  font-size: 0.9rem;
  color: #a0a0a0;
`;

const RoomPlayers = styled.div`
  font-weight: 600;
  color: #2563eb;
  font-size: 1.1rem;
`;

const JoinButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  &:hover:not(:disabled) { background: #1d4ed8; }
  &:disabled { opacity: 0.5; background: #3f3f46; cursor: not-allowed; }
`;

const Section = styled.div`margin-bottom: 2rem;`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  color: #e0e0e0;
  margin-bottom: 1rem;
  font-weight: 500;
`;

const MapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

// ✅ selected → $selected (transient prop, DOM에 전달 안 됨)
const MapCard = styled.div<{ $selected: boolean }>`
  padding: 1.2rem;
  background: ${p => p.$selected ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${p => p.$selected ? '#2563eb' : 'rgba(255, 255, 255, 0.05)'};
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: white;
  &:hover { background: rgba(37, 99, 235, 0.05); }
`;

const MapName = styled.div`
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const MapDifficulty = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
`;

const CreateButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: #2563eb;
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover {
    background: #1d4ed8;
  }
`;

const PlayerList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
`;

const PlayerCard = styled.div`
  padding: 1rem 1.5rem;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
  color: white;
`;

const PlayerName = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.4rem;
`;

const PlayerRating = styled.div`
  font-size: 0.85rem;
  color: #a0a0a0;
  margin-bottom: 0.5rem;
`;

// ✅ ready → $ready (transient prop, DOM에 전달 안 됨)
const PlayerStatus = styled.div<{ $ready: boolean }>`
  font-weight: 600;
  color: ${p => p.$ready ? '#10b981' : '#f59e0b'};
`;

const AIButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const AIButton = styled.button`
  flex: 1;
  padding: 0.75rem;
  background: #23252e;
  color: #e0e0e0;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: #2a2d36; }
`;

// ✅ ready → $ready (transient prop, DOM에 전달 안 됨)
const ReadyButton = styled.button<{ $ready: boolean }>`
  flex: 1;
  padding: 1rem;
  background: ${p => p.$ready ? '#d97706' : '#10b981'};
  color: white;
  font-size: 1.05rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { opacity: 0.9; }
`;

const StartButton = styled.button`
  flex: 1;
  padding: 1rem;
  background: #10b981;
  color: white;
  font-size: 1.05rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover:not(:disabled) { background: #059669; }
  &:disabled { opacity: 0.5; background: #3f3f46; cursor: not-allowed; }
`;

const LoadingText = styled.div`
  text-align: center;
  color: white;
  font-size: 1.5rem;
  padding: 2rem;
`;

// ─── Rejoin Prompt ────────────────────────────────────────────────────────────

const PromptOverlay = styled(Overlay)`
  z-index: 2000;
  background: rgba(0, 0, 0, 0.95);
`;

const PromptContainer = styled(Container)`
  max-width: 500px;
  text-align: center;
  background: rgba(26, 27, 33, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PromptTitle = styled.h2`
  color: white;
  font-size: 1.8rem;
  margin-bottom: 1rem;
`;

const PromptText = styled.p`
  color: #e0e0e0;
  font-size: 1.1rem;
  margin-bottom: 2rem;
  line-height: 1.5;
`;

const PromptButtonRow = styled.div`
  display: flex;
  gap: 1rem;
`;

const RejoinButton = styled(CreateRoomButton)`
  background: #10b981;
  border: none;
  color: white;
  &:hover { background: #059669; }
`;

const AbandonButton = styled(CreateRoomButton)`
  background: #ef4444;
  border: none;
  color: white;
  &:hover { background: #dc2626; }
`;

interface RejoinPromptProps {
  roomName: string;
  onRejoin: () => void;
  onAbandon: () => void;
}

const RejoinPrompt: React.FC<RejoinPromptProps> = ({ roomName, onRejoin, onAbandon }) => {
  return (
    <PromptOverlay>
      <PromptContainer>
        <PromptTitle>진행 중인 게임 발견</PromptTitle>
        <PromptText>
          '{roomName}' 방에 참여 중인 기록이 있습니다.<br />
          이어서 플레이하시겠습니까?
        </PromptText>
        <PromptButtonRow>
          <AbandonButton onClick={onAbandon}>아니오 (방 나가기)</AbandonButton>
          <RejoinButton onClick={onRejoin}>예 (다시 참가)</RejoinButton>
        </PromptButtonRow>
      </PromptContainer>
    </PromptOverlay>
  );
};