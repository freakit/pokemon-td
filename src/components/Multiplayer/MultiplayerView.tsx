// src/components/Multiplayer/MultiplayerView.tsx
// 멀티플레이어 현황 뷰 - 플레이어 체력 순 정렬
// [수정] 상대 포켓몬 정보를 주기적으로 새로고침 (3초마다 Firebase 직접 fetch)

import { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { multiplayerService } from '../../services/MultiplayerService';
import { PlayerGameState, TowerDetail } from '../../types/multiplayer';
import { authService } from '../../services/AuthService';
import { useGameStore } from '../../store/gameStore';
import { media } from '../../utils/responsive.utils';

interface MultiplayerViewProps {
  roomId: string;
  onClose: () => void;
}

const REFRESH_INTERVAL_MS = 3000; // 3초마다 강제 새로고침

export const MultiplayerView = ({ roomId, onClose }: MultiplayerViewProps) => {
  const [players, setPlayers] = useState<PlayerGameState[]>([]);
  const [allTowerDetails, setAllTowerDetails] = useState<Map<string, TowerDetail[]>>(new Map());
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const user = authService.getCurrentUser();

  const localMoney = useGameStore(s => s.money);
  const localLives = useGameStore(s => s.lives);
  const localWave = useGameStore(s => s.wave);
  const towers = useGameStore(s => s.towers);

  // ─── Firebase에서 타워 데이터 강제 fetch ─────────────────────────
  const fetchTowerDetails = useCallback(async () => {
    if (!roomId) return;
    try {
      setIsRefreshing(true);
      const allTowers = await multiplayerService.getAllTowerDetailsOnce(roomId);
      setAllTowerDetails(allTowers);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('[MultiplayerView] fetchTowerDetails error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [roomId]);

  // ─── Firebase 게임 상태 구독 (플레이어 목록) ──────────────────────
  useEffect(() => {
    try {
      const unsubscribe = multiplayerService.onGameStateUpdate(roomId, (updatedPlayers) => {
        setPlayers(updatedPlayers);
      });
      return unsubscribe;
    } catch (error) {
      console.error('Failed to subscribe to game state:', error);
    }
  }, [roomId]);

  // ─── 타워 상세 실시간 구독 (Firebase onValue 리스너) ─────────────
  useEffect(() => {
    if (!roomId) return;
    const unsub = multiplayerService.onAllTowerDetailsUpdate(roomId, (allTowers) => {
      setAllTowerDetails(new Map(allTowers));
      setLastRefreshed(new Date());
    });
    return () => unsub();
  }, [roomId]);

  // ─── 마운트 시 즉시 + 3초마다 주기적 강제 fetch ─────────────────
  useEffect(() => {
    // 마운트 즉시 1회 fetch
    fetchTowerDetails();

    // 3초마다 강제 새로고침
    refreshTimerRef.current = setInterval(() => {
      fetchTowerDetails();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchTowerDetails]);

  // ─── 내 타워 정보 Firebase에 즉시 업로드 ─────────────────────────
  // (GameLayout에서도 하지만 멀티뷰가 열렸을 때 최신 데이터 보장)
  useEffect(() => {
    if (!user || !roomId) return;

    const towerDetails: TowerDetail[] = towers.map(t => ({
      pokemonId: t.pokemonId,
      name: t.displayName,
      level: t.level,
      sprite: t.sprite,
      position: t.position,
      currentHp: t.currentHp,
      maxHp: t.maxHp,
      isFainted: t.isFainted,
      attack: t.attack,
      defense: t.defense,
      specialAttack: t.specialAttack,
      specialDefense: t.specialDefense,
      speed: t.speed,
      types: t.types,
    }));

    multiplayerService.updatePlayerTowerDetails(roomId, user.uid, towerDetails);
  }, [towers, roomId, user]);

  // ─── 정렬: 생존자 우선, 라이프 내림차순 ─────────────────────────
  const sortedPlayers = [...players]
    .map(p => {
      if (p.userId === user?.uid) {
        return { ...p, money: localMoney, lives: localLives, wave: localWave };
      }
      return p;
    })
    .sort((a, b) => {
      if (a.isAlive !== b.isAlive) return b.isAlive ? 1 : -1;
      return b.lives - a.lives;
    });

  const refreshedTimeStr = lastRefreshed.toLocaleTimeString('ko-KR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <Overlay onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Container>
        <Header>
          <Title>🏆 플레이어 순위</Title>
          <HeaderRight>
            <RefreshInfo $refreshing={isRefreshing}>
              {isRefreshing ? '🔄 새로고침 중...' : `⏱ ${refreshedTimeStr}`}
            </RefreshInfo>
            <ManualRefreshBtn onClick={fetchTowerDetails} disabled={isRefreshing} title="수동 새로고침">
              🔃
            </ManualRefreshBtn>
            <CloseButton onClick={onClose}>✕</CloseButton>
          </HeaderRight>
        </Header>

        <PlayerList>
          {sortedPlayers.map((player, index) => {
            const playerTowers: (TowerDetail & { name: string })[] =
              player.userId === user?.uid
                ? towers.map(t => ({ ...t, name: t.displayName, sprite: t.sprite ?? '' }))
                : (allTowerDetails.get(player.userId) || []).map(t => ({ ...t }));

            const alivePokemon = playerTowers.filter(t => !t.isFainted).length;
            const totalPokemon = playerTowers.length;

            return (
              <PlayerRow
                key={player.userId}
                $isMe={player.userId === user?.uid}
                $isDead={!player.isAlive}
              >
                <RankBadge $rank={index + 1}>{index + 1}</RankBadge>

                <PlayerInfo>
                  <PlayerNameRow>
                    {player.userName}
                    {player.userId === user?.uid && <MeTag>(나)</MeTag>}
                  </PlayerNameRow>
                  <PlayerStats>
                    <StatIcon>❤️ {player.lives}</StatIcon>
                    <StatIcon>💰 {player.money}</StatIcon>
                    <StatIcon>🌊 {player.wave}</StatIcon>
                  </PlayerStats>
                </PlayerInfo>

                <PokemonSection>
                  <PokemonCount>
                    ⚔️ {alivePokemon}/{totalPokemon}
                    {totalPokemon === 0 && player.userId !== user?.uid && (
                      <LoadingDot>···</LoadingDot>
                    )}
                  </PokemonCount>
                  <PokemonIcons>
                    {playerTowers.length === 0 && player.userId !== user?.uid ? (
                      // 데이터 없음 — 로딩 플레이스홀더
                      Array.from({ length: 3 }).map((_, i) => (
                        <PokemonPlaceholder key={i} />
                      ))
                    ) : (
                      playerTowers.slice(0, 6).map((tower, idx) => (
                        <PokemonIconWrapper key={idx}>
                          <PokemonIcon
                            src={tower.sprite}
                            alt={tower.name}
                            $isFainted={tower.isFainted}
                            title={`${tower.name} Lv.${tower.level}${tower.isFainted ? ' (기절)' : ''}`}
                          />
                          {/* HP 바 */}
                          <MiniHpBar>
                            <MiniHpFill
                              $pct={Math.max(0, (tower.currentHp / Math.max(tower.maxHp, 1)) * 100)}
                              $fainted={tower.isFainted}
                            />
                          </MiniHpBar>
                          {/* 레벨 뱃지 */}
                          <LvBadge>Lv{tower.level}</LvBadge>
                        </PokemonIconWrapper>
                      ))
                    )}
                  </PokemonIcons>
                </PokemonSection>

                {!player.isAlive && <DeadBadge>💀 탈락</DeadBadge>}
              </PlayerRow>
            );
          })}
        </PlayerList>

        <Footer>
          <FooterNote>📡 {REFRESH_INTERVAL_MS / 1000}초마다 자동 새로고침</FooterNote>
        </Footer>
      </Container>
    </Overlay>
  );
};

// ─── 애니메이션 ───────────────────────────────────────────────────────────────
const shimmer = keyframes`
  0%{background-position:-200% 0}
  100%{background-position:200% 0}
`;
const blink = keyframes`0%,100%{opacity:0.3}50%{opacity:1}`;

// ─── Styled Components ────────────────────────────────────────────────────────
const Overlay = styled.div`
  position:fixed;top:0;left:0;width:100vw;height:100vh;
  background:rgba(0,0,0,0.9);
  display:flex;align-items:center;justify-content:center;
  z-index:2000;
`;

const Container = styled.div`
  background:linear-gradient(145deg,#1a1a2e,#16213e);
  padding:1.5rem;border-radius:20px;
  max-width:620px;width:95%;max-height:85vh;overflow-y:auto;
  border:2px solid rgba(255,215,0,0.3);
  box-shadow:0 0 30px rgba(255,215,0,0.15);
  ${media.mobile}{padding:1rem;max-height:95vh;}
`;

const Header = styled.div`
  display:flex;justify-content:space-between;align-items:center;
  margin-bottom:1.5rem;padding-bottom:0.8rem;
  border-bottom:2px solid rgba(255,255,255,0.1);
  gap:8px;
`;

const Title = styled.h2`
  color:#ffd700;margin:0;font-size:1.4rem;
  ${media.mobile}{font-size:1.2rem;}
`;

const HeaderRight = styled.div`
  display:flex;align-items:center;gap:8px;flex-shrink:0;
`;

const RefreshInfo = styled.span<{ $refreshing: boolean }>`
  font-size:11px;
  color:${p => p.$refreshing ? '#4fc3f7' : 'rgba(255,255,255,0.4)'};
  white-space:nowrap;
`;

const ManualRefreshBtn = styled.button`
  background:rgba(255,255,255,0.1);border:none;
  color:#fff;width:32px;height:32px;border-radius:50%;
  cursor:pointer;font-size:14px;transition:all 0.2s;
  &:hover:not(:disabled){background:rgba(79,195,247,0.3);}
  &:disabled{opacity:0.4;cursor:not-allowed;}
`;

const CloseButton = styled.button`
  background:rgba(255,255,255,0.1);border:none;color:#fff;
  width:36px;height:36px;border-radius:50%;cursor:pointer;
  font-size:1.2rem;transition:all 0.2s;
  &:hover{background:rgba(255,107,107,0.3);}
`;

const PlayerList = styled.div`display:flex;flex-direction:column;gap:0.75rem;`;

const PlayerRow = styled.div<{ $isMe:boolean;$isDead:boolean }>`
  display:flex;align-items:center;gap:1rem;padding:1rem;
  background:${p=>p.$isMe
    ?'linear-gradient(135deg,rgba(52,152,219,0.2),rgba(52,152,219,0.1))'
    :'rgba(255,255,255,0.05)'};
  border-radius:12px;
  border:2px solid ${p=>p.$isMe?'rgba(52,152,219,0.4)':'transparent'};
  opacity:${p=>p.$isDead?0.5:1};position:relative;
  ${media.mobile}{padding:0.75rem;gap:0.75rem;flex-wrap:wrap;}
`;

const RankBadge = styled.div<{ $rank:number }>`
  width:32px;height:32px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-weight:bold;font-size:1rem;flex-shrink:0;
  background:${p=>{
    if(p.$rank===1)return'linear-gradient(135deg,#ffd700,#ff8c00)';
    if(p.$rank===2)return'linear-gradient(135deg,#c0c0c0,#a0a0a0)';
    if(p.$rank===3)return'linear-gradient(135deg,#cd7f32,#a0522d)';
    return'rgba(255,255,255,0.1)';
  }};
  color:${p=>p.$rank<=3?'#000':'#fff'};
`;

const PlayerInfo = styled.div`flex:1;min-width:0;`;

const PlayerNameRow = styled.div`
  font-size:1rem;font-weight:bold;color:white;
  display:flex;align-items:center;gap:0.5rem;
`;

const MeTag = styled.span`font-size:0.8rem;color:#4cafff;font-weight:normal;`;

const PlayerStats = styled.div`display:flex;gap:0.75rem;margin-top:0.25rem;`;

const StatIcon = styled.span`font-size:0.85rem;color:rgba(255,255,255,0.8);`;

const PokemonSection = styled.div`
  display:flex;flex-direction:column;align-items:flex-end;gap:0.4rem;
`;

const PokemonCount = styled.div`
  font-size:0.8rem;color:rgba(255,255,255,0.6);
  display:flex;align-items:center;gap:4px;
`;

const LoadingDot = styled.span`
  font-size:0.75rem;color:#4fc3f7;
  animation:${blink} 1.2s ease infinite;
`;

const PokemonIcons = styled.div`
  display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;
`;

const PokemonIconWrapper = styled.div`
  position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;
`;

const PokemonIcon = styled.img<{ $isFainted:boolean }>`
  width:38px;height:38px;border-radius:6px;
  background:rgba(0,0,0,0.3);object-fit:contain;
  filter:${p=>p.$isFainted?'grayscale(100%) opacity(0.35)':'none'};
  image-rendering:pixelated;
  border:1px solid rgba(255,255,255,0.1);
`;

const MiniHpBar = styled.div`
  width:38px;height:3px;background:rgba(0,0,0,0.4);border-radius:2px;overflow:hidden;
`;

const MiniHpFill = styled.div<{ $pct:number;$fainted:boolean }>`
  height:100%;border-radius:2px;
  width:${p=>p.$pct}%;
  background:${p=>p.$fainted?'#555':p.$pct>50?'#2ecc71':p.$pct>25?'#f39c12':'#e74c3c'};
  transition:width 0.4s ease;
`;

const LvBadge = styled.div`
  font-size:8px;color:rgba(255,255,255,0.5);line-height:1;
`;

const PokemonPlaceholder = styled.div`
  width:38px;height:38px;border-radius:6px;
  background:linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.1) 50%,rgba(255,255,255,0.05) 75%);
  background-size:200% 100%;
  animation:${shimmer} 1.5s infinite;
  border:1px solid rgba(255,255,255,0.07);
`;

const DeadBadge = styled.div`
  position:absolute;top:0.5rem;right:0.5rem;
  font-size:0.75rem;color:#ff6b6b;
  background:rgba(255,107,107,0.1);
  padding:2px 8px;border-radius:10px;
  border:1px solid rgba(255,107,107,0.3);
`;

const Footer = styled.div`
  margin-top:1rem;padding-top:0.6rem;
  border-top:1px solid rgba(255,255,255,0.07);
  text-align:center;
`;

const FooterNote = styled.div`
  font-size:11px;color:rgba(255,255,255,0.3);
`;