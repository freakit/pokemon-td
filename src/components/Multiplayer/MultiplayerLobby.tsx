// src/components/Multiplayer/MultiplayerLobby.tsx
// ──────────────────────────────────────────────────────────────────
// [V5-FIX-LB-1] 나가기 확인 모달 — 게임 진행 중 실수로 나가기 방지
// [V5-FIX-LB-2] AI가 호스트가 되는 경우에 대한 안전 장치
//   - MultiplayerService.leaveRoom이 비AI 플레이어 우선 호스트로 승격하므로
//     일반적으로 AI가 호스트가 되지 않지만, 방에 AI만 남았을 때는 방 자동 삭제

import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { media } from '../../utils/responsive.utils';
import { multiplayerService } from '../../services/MultiplayerService';
import { Room, AIDifficulty } from '../../types/multiplayer';
import { MAPS } from '../../data/maps';
import { authService } from '../../services/AuthService';
import { useTranslation } from '../../i18n';

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
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const startingRef = useRef(false);
  const user = authService.getCurrentUser();

  const [showAchievements, setShowAchievements] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showRankings, setShowRankings] = useState(false);

  useEffect(() => {
    const checkRejoin = async () => {
      const savedRoomId = multiplayerService.getCurrentRoomId();
      if (savedRoomId) {
        try {
          const { room, canRejoin } = await multiplayerService.rejoinRoom(savedRoomId);
          if (canRejoin && room) setRejoinableRoom(room);
          else multiplayerService.clearCurrentRoom();
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

  // [V5-FIX-LB-1] 나가기 확인 모달
  const handleLeaveRoomRequest = () => {
    if (!currentRoom) return;
    setLeaveConfirmOpen(true);
  };

  const handleLeaveRoomConfirmed = async () => {
    setLeaveConfirmOpen(false);
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
    if (currentRoom) await multiplayerService.toggleReady(currentRoom.id);
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
    return <Overlay><Container><LoadingText>{t('lobby.checkingRejoin')}</LoadingText></Container></Overlay>;
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
              <Title>{t('lobby.title')}</Title>
              <BackButton onClick={onBack}>← {t('lobby.back')}</BackButton>
            </Header>

            <ButtonRow>
              <CreateRoomButton onClick={() => setView('create')}>
                ➕ {t('lobby.createRoom')}
              </CreateRoomButton>
            </ButtonRow>

            <RoomList>
              {rooms.length === 0 ? (
                <EmptyMessage>{t('lobby.emptyList')}</EmptyMessage>
              ) : (
                rooms.map(room => (
                  <RoomCard key={room.id}>
                    <RoomInfo>
                      <RoomName>{room.name}</RoomName>
                      <RoomDetails>
                        {t('lobby.map')}: {t(`mapData.${room.mapId}.name`) !== `mapData.${room.mapId}.name`
                          ? t(`mapData.${room.mapId}.name`)
                          : room.mapName} | {t('lobby.host')}: {room.hostName}
                      </RoomDetails>
                    </RoomInfo>
                    <RoomPlayers>{room.players.length} / {room.maxPlayers}</RoomPlayers>
                    <JoinButton
                      onClick={() => handleJoinRoom(room.id)}
                      disabled={room.players.length >= room.maxPlayers}
                    >
                      {t('lobby.join')}
                    </JoinButton>
                  </RoomCard>
                ))
              )}
            </RoomList>
          </Container>
        </Overlay>

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
              <Title>{t('lobby.createTitle')}</Title>
              <BackButton onClick={() => setView('list')}>← {t('lobby.back')}</BackButton>
            </Header>

            <Section>
              <SectionTitle>{t('lobby.selectMap')}</SectionTitle>
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
                    <MapDifficulty>{t('lobby.difficulty')}: {map.difficulty}</MapDifficulty>
                  </MapCard>
                ))}
              </MapGrid>
            </Section>

            <CreateButton onClick={handleCreateRoom}>{t('lobby.createRoomAction')}</CreateButton>
          </Container>
        </Overlay>

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

    return (
      <>
        <Overlay>
          <Container>
            <Header>
              <Title>{currentRoom.name}</Title>
              <BackButton onClick={handleLeaveRoomRequest}>← {t('lobby.leave')}</BackButton>
            </Header>

            <Section>
              <SectionTitle>
                {t('lobby.map')}: {t(`mapData.${currentRoom.mapId}.name`) !== `mapData.${currentRoom.mapId}.name`
                  ? t(`mapData.${currentRoom.mapId}.name`)
                  : currentRoom.mapName}
              </SectionTitle>
            </Section>

            <Section>
              <SectionTitle>
                {t('lobby.players')} ({currentRoom.players.length}/{currentRoom.maxPlayers})
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
                    <PlayerStatus $ready={player.isReady}>
                      {player.isReady ? `✓ ${t('lobby.readyOn')}` : t('lobby.readyWait')}
                    </PlayerStatus>
                  </PlayerCard>
                ))}
              </PlayerList>
            </Section>

            {isHost && currentRoom.players.length < currentRoom.maxPlayers && (
              <Section>
                <SectionTitle>{t('lobby.addAI')}</SectionTitle>
                <AIButtons>
                  <AIButton onClick={() => handleAddAI('easy')}>Easy AI</AIButton>
                  <AIButton onClick={() => handleAddAI('normal')}>Normal AI</AIButton>
                  <AIButton onClick={() => handleAddAI('hard')}>Hard AI</AIButton>
                </AIButtons>
              </Section>
            )}

            <ButtonRow>
              {!isHost && (
                <ReadyButton
                  onClick={handleToggleReady}
                  $ready={currentPlayer?.isReady || false}
                >
                  {currentPlayer?.isReady ? t('lobby.btnReadyCancel') : t('lobby.btnReady')}
                </ReadyButton>
              )}

              {isHost && (
                <StartButton
                  onClick={handleStartGame}
                  disabled={!allReady || currentRoom.players.length < 2}
                >
                  {t('lobby.btnStart')}
                </StartButton>
              )}
            </ButtonRow>
          </Container>
        </Overlay>

        {/* [V5-FIX-LB-1] 나가기 확인 모달 */}
        {leaveConfirmOpen && (
          <ConfirmOverlay onClick={() => setLeaveConfirmOpen(false)}>
            <ConfirmContainer onClick={e => e.stopPropagation()}>
              <ConfirmTitle>{t('lobby.confirmLeaveTitle')}</ConfirmTitle>
              <ConfirmText>
                {t('lobby.confirmLeaveMsg')}<br />
                {isHost && t('lobby.confirmLeaveHostMsg')}
              </ConfirmText>
              <ConfirmButtons>
                <CancelButton onClick={() => setLeaveConfirmOpen(false)}>{t('lobby.btnCancel')}</CancelButton>
                <ConfirmLeaveButton onClick={handleLeaveRoomConfirmed}>{t('lobby.btnLeave')}</ConfirmLeaveButton>
              </ConfirmButtons>
            </ConfirmContainer>
          </ConfirmOverlay>
        )}

        {showAchievements && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
        {showHallOfFame && <HallOfFame onClose={() => setShowHallOfFame(false)} />}
        {showRankings && <Rankings onClose={() => setShowRankings(false)} />}
      </>
    );
  }

  return null;
};

// ─── Styled Components (원본 유지 + 확인 모달) ─────────────────
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
  ${media.tablet} {
    padding: 1.5rem;
  }
  ${media.mobile} {
    padding: 1rem;
    width: 95%;
    border-radius: 8px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  ${media.mobile} {
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }
`;

const Title = styled.h2`
  font-size: 1.8rem;
  color: white;
  font-weight: 700;
  ${media.mobile} {
    font-size: 1.3rem;
  }
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
  ${media.mobile} {
    flex-wrap: wrap;
  }
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
  &:hover { background: #2a2d36; }
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
  ${media.mobile} {
    flex-wrap: wrap;
    padding: 0.75rem 1rem;
    gap: 0.5rem;
  }
`;

const RoomInfo = styled.div`flex: 1;`;
const RoomName = styled.div`font-size: 1.15rem;font-weight: 600;margin-bottom: 0.25rem;`;
const RoomDetails = styled.div`font-size: 0.9rem;color: #a0a0a0;`;
const RoomPlayers = styled.div`font-weight: 600;color: #2563eb;font-size: 1.1rem;`;
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
const SectionTitle = styled.h3`font-size: 1.1rem;color: #e0e0e0;margin-bottom: 1rem;font-weight: 500;`;

const MapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

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

const MapName = styled.div`font-size: 1.05rem;font-weight: 600;margin-bottom: 0.5rem;`;
const MapDifficulty = styled.div`font-size: 0.85rem;color: #a0a0a0;`;

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
  &:hover { background: #1d4ed8; }
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

const PlayerName = styled.div`font-size: 1.1rem;font-weight: 600;margin-bottom: 0.4rem;`;
const PlayerRating = styled.div`font-size: 0.85rem;color: #a0a0a0;margin-bottom: 0.5rem;`;
const PlayerStatus = styled.div<{ $ready: boolean }>`
  font-weight: 600;
  color: ${p => p.$ready ? '#10b981' : '#f59e0b'};
`;

const AIButtons = styled.div`display: flex;gap: 0.5rem;flex-wrap: wrap;`;
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

// ─── Rejoin Prompt ─────────────────────────────
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

const PromptButtonRow = styled.div`display: flex;gap: 1rem;`;

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

// ─── [V5-FIX-LB-1] Leave Confirm Modal ────────────
const ConfirmOverlay = styled.div`
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  display: flex; align-items: center; justify-content: center;
  z-index: 3000;
`;

const ConfirmContainer = styled.div`
  background: rgba(26, 27, 33, 0.98);
  padding: 2rem;
  border-radius: 12px;
  max-width: 420px;
  width: 90%;
  border: 1px solid rgba(239, 68, 68, 0.3);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.6);
`;

const ConfirmTitle = styled.h3`
  color: #f87171;
  font-size: 1.4rem;
  margin-bottom: 1rem;
  text-align: center;
`;

const ConfirmText = styled.p`
  color: #e0e0e0;
  font-size: 1rem;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 1.5rem;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 0.75rem;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 0.75rem;
  background: #3f3f46;
  color: #e0e0e0;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #52525b; }
`;

const ConfirmLeaveButton = styled.button`
  flex: 1;
  padding: 0.75rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #dc2626; }
`;

interface RejoinPromptProps {
  roomName: string;
  onRejoin: () => void;
  onAbandon: () => void;
}

const RejoinPrompt: React.FC<RejoinPromptProps> = ({ roomName, onRejoin, onAbandon }) => {
  const { t } = useTranslation();
  return (
    <PromptOverlay>
      <PromptContainer>
        <PromptTitle>{t('lobby.rejoinTitle')}</PromptTitle>
        <PromptText>
          {t('lobby.rejoinMsg', { name: roomName }).split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i === 0 && <br />}
            </span>
          ))}
        </PromptText>
        <PromptButtonRow>
          <AbandonButton onClick={onAbandon}>{t('lobby.rejoinNo')}</AbandonButton>
          <RejoinButton onClick={onRejoin}>{t('lobby.rejoinYes')}</RejoinButton>
        </PromptButtonRow>
      </PromptContainer>
    </PromptOverlay>
  );
};