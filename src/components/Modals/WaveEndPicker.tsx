// src/components/Modals/WaveEndPicker.tsx
// ✅ 거다이맥스 버그 수정: evolutionItem = 'max-mushroom' → evolutionItem = item.id

import React, { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { media } from '../../utils/responsive.utils';
import { useTranslation } from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { Item } from '../../types/game';
import { multiplayerService } from '../../services/MultiplayerService';

// 싱글플레이에서만 isPaused:false 해제 (멀티플레이는 BattlePhaseUI가 관리)
function resumeSingleOnly() {
  if (!multiplayerService.getCurrentRoomId()) {
    useGameStore.setState({ isPaused: false });
  }
}

export const WaveEndPicker: React.FC = () => {
  const { t } = useTranslation();
  const { waveEndItemPick, setWaveEndItemPick, useRewardItem, towers, wave } = useGameStore(state => ({
    waveEndItemPick: state.waveEndItemPick,
    setWaveEndItemPick: state.setWaveEndItemPick,
    useRewardItem: state.useRewardItem,
    towers: state.towers,
    wave: state.wave,
  }));
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  if (!waveEndItemPick) return null;

  const handleSelect = (item: Item) => {
    if ((item.type === 'mega-stone' || item.type === 'max-mushroom') && item.targetPokemonId) {
      const targetTower = towers.find(t => t.pokemonId === item.targetPokemonId);
      if (!targetTower) {
        // [A4] 대상 포켓몬 없으면 UI 피드백 후 정리
        console.warn(`[WaveEndPicker] targetPokemonId ${item.targetPokemonId} not found in towers`);
        alert(t('waveEnd.evolveTargetNotFound'));
        setWaveEndItemPick(null);
        resumeSingleOnly();
        return;
      }
      // ✅ 수정: 메가스톤과 거다이맥스 모두 item.id를 그대로 전달
      const evolutionItem = item.id;
      useGameStore.getState().evolvePokemon(targetTower.id, evolutionItem);
      setWaveEndItemPick(null);
      resumeSingleOnly();
      return;
    }

    setSelectedItem(item);
  };


  const handleTargetSelect = (towerId: string) => {
    if (!selectedItem) return;

    if (selectedItem.type === 'candy') {
      useRewardItem('candy', towerId);
    } else if (selectedItem.type === 'heal') {
      const tower = towers.find(t => t.id === towerId);
      if (tower && !tower.isFainted) {
        const newHp = Math.min(tower.maxHp, tower.currentHp + (selectedItem.value || 200));
        useGameStore.getState().updateTower(tower.id, { currentHp: newHp });
      }
    } else if (selectedItem.type === 'revive') {
      useRewardItem('revive', towerId);
    }

    setSelectedItem(null);
    setWaveEndItemPick(null);
    resumeSingleOnly();
  };

  const handleCancelTarget = () => setSelectedItem(null);

  const handleSkip = () => {
    setSelectedItem(null);
    setWaveEndItemPick(null);
    resumeSingleOnly();
  };

  const getItemName = (item: Item) => {
    if (item.type === 'mega-stone' || item.type === 'max-mushroom') return item.name;
    return t(item.name);
  };

  const getItemEffect = (item: Item) => {
    if (item.type === 'mega-stone' || item.type === 'max-mushroom') return item.effect;
    return t(item.effect);
  };

  if (selectedItem) {
    return (
      <Overlay>
        <Modal>
          <Header>
            <Title>🎯 {t('waveEnd.targetTitle', { name: getItemName(selectedItem) })}</Title>
          </Header>
          <Subtitle>
            {selectedItem.type === 'candy'  && t('waveEnd.targetCandy')}
            {selectedItem.type === 'heal'   && t('waveEnd.targetHeal')}
            {selectedItem.type === 'revive' && t('waveEnd.targetRevive')}
          </Subtitle>
          <TowerGrid>
            {towers.map(tower => {
              const isSelectable =
                selectedItem.type === 'revive'
                  ? tower.isFainted
                  : selectedItem.type === 'candy'
                    ? !tower.isFainted && tower.level < 100   // ✅ 레벨 100 미만만 선택 가능
                    : !tower.isFainted;
              return (
                <TowerCard
                  key={tower.id}
                  $isSelectable={isSelectable}
                  onClick={() => isSelectable && handleTargetSelect(tower.id)}
                >
                  <TowerImg src={tower.sprite} alt={tower.displayName} />
                  <TowerName>{tower.displayName}</TowerName>
                  <TowerInfo>Lv.{tower.level}</TowerInfo>
                  <TowerInfo>HP: {Math.floor(tower.currentHp)}/{tower.maxHp}</TowerInfo>
                  {tower.isFainted && <FaintedLabel>{t('manager.fainted')}</FaintedLabel>}
                </TowerCard>
              );
            })}
          </TowerGrid>
          <CancelBtn onClick={handleCancelTarget}>← {t('common.back')}</CancelBtn>
        </Modal>
      </Overlay>
    );
  }

  return (
    <Overlay>
      <Modal>
        <Header>
          <Title>🎉 {t('waveEnd.clearTitle', { wave })}</Title>
        </Header>
        <Subtitle>✨ {t('waveEnd.clearSubtitle')}</Subtitle>
        <Grid>
          {waveEndItemPick.map((item, idx) => {
            const isSpecial = item.type === 'mega-stone' || item.type === 'max-mushroom';
            return (
              <Card key={idx} $isSpecial={isSpecial} onClick={() => handleSelect(item)}>
                <CardGlow />
                <ItemName $isSpecial={isSpecial}>
                  {isSpecial && '✨ '}{getItemName(item)}
                </ItemName>
                <ItemEffect>{getItemEffect(item)}</ItemEffect>
              </Card>
            );
          })}
        </Grid>
        <CancelBtn onClick={handleSkip}>❌ {t('waveEnd.skip')}</CancelBtn>
      </Modal>
    </Overlay>
  );
};

// ─── Styled Components ────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(30px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
`;

const Overlay = styled.div`
  position: fixed; inset: 0;
  background: radial-gradient(circle at center, rgba(46,204,113,0.3), rgba(0,0,0,0.95));
  backdrop-filter: blur(10px);
  display: flex; justify-content: center; align-items: center;
  z-index: 1001;
  animation: ${fadeIn} 0.35s ease-out; 
`;

const Modal = styled.div`
  background: linear-gradient(145deg,#1a1f2e 0%,#0f1419 100%);
  color: #e8edf3; border-radius: 24px; padding: 0;
  max-width: 1000px; width: 90%;
  ${media.mobile} { width: 96%; }
  box-shadow: 0 25px 80px rgba(46,204,113,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
  border: 2px solid rgba(46,204,113,0.3);
  animation: ${slideUp} 0.35s ease-out;    
`;

const Header = styled.div`
  padding: 32px;
  ${media.mobile} { padding: 16px; }
  background: linear-gradient(90deg,rgba(46,204,113,0.2),transparent);
  border-bottom: 2px solid rgba(46,204,113,0.3);
  text-align: center;
`;

const Title = styled.h2`
  font-size: 36px; font-weight: 900; margin: 0;
  ${media.mobile} { font-size: 24px; }
  background: linear-gradient(135deg,#2ecc71,#a8ffb8);
  background-clip: text; -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  font-size: 18px; margin: 24px 32px;
  ${media.mobile} { font-size: 14px; margin: 12px 16px; }
  text-align: center; color: #a8b8c8; font-weight: 600;
`;

const Grid = styled.div`
  display: flex; gap: 20px; padding: 0 32px 32px;
  justify-content: center; flex-wrap: wrap;
  ${media.mobile} { padding: 0 12px 16px; gap: 10px; }
`;

const Card = styled.div<{ $isSpecial: boolean }>`
  flex: 1 1 200px; min-width: 180px; max-width: 220px;
  background: linear-gradient(145deg,rgba(30,40,60,0.9),rgba(15,20,35,0.95));
  border: 2px solid ${p => p.$isSpecial ? '#e040fb' : 'rgba(46,204,113,0.4)'};
  border-radius: 20px; padding: 28px 20px; cursor: pointer;
  transition: transform 0.3s; text-align: center; position: relative; overflow: hidden;
  box-shadow: ${p => p.$isSpecial ? '0 0 30px rgba(224,64,251,0.8)' : '0 8px 32px rgba(0,0,0,0.4)'};
  @media (hover: hover) { &:hover { transform: translateY(-4px); } }
  ${media.mobile} {
    flex: 1 1 140px; min-width: 130px; max-width: 180px;
    padding: 16px 10px; border-radius: 14px;
  }
`;

const CardGlow = styled.div`
  position: absolute; top:-50%; left:-50%; width:200%; height:200%;
  background: radial-gradient(circle,rgba(46,204,113,0.1) 0%,transparent 70%);
  pointer-events: none;
`;

const ItemName = styled.h3<{ $isSpecial: boolean }>`
  font-size: 22px; font-weight: 700; margin-bottom: 12px; position: relative; z-index:1;
  color: ${p => p.$isSpecial ? '#e040fb' : '#2ecc71'};
  text-shadow: ${p => p.$isSpecial ? '0 0 20px rgba(224,64,251,0.8)' : '0 0 15px rgba(46,204,113,0.6)'};
  ${media.mobile} { font-size: 16px; margin-bottom: 8px; }
`;

const ItemEffect = styled.p`
  font-size: 14px; color: #a8b8c8; line-height: 1.6; position: relative; z-index:1;
  ${media.mobile} { font-size: 12px; line-height: 1.4; }
`;

const TowerGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill,minmax(160px,1fr));
  gap: 20px; padding: 24px 32px;
`;

const TowerCard = styled.div<{ $isSelectable: boolean }>`
  background: linear-gradient(145deg,rgba(30,40,60,0.9),rgba(15,20,35,0.95));
  border: 2px solid rgba(52,152,219,0.4); border-radius: 16px; padding: 20px;
  text-align: center; transition: all 0.3s;
  opacity: ${p => p.$isSelectable ? 1 : 0.3};
  cursor: ${p => p.$isSelectable ? 'pointer' : 'not-allowed'};
  ${p => p.$isSelectable && css`&:hover { transform:translateY(-2px); border-color:#4cafff; }`}
`;

const TowerImg = styled.img`
  width:80px; height:80px; image-rendering:pixelated;
  margin-bottom:12px; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.6));
`;
const TowerName = styled.h4`font-size:16px;font-weight:700;margin:8px 0;color:#4cafff;`;
const TowerInfo = styled.p`font-size:14px;margin:4px 0;color:#a8b8c8;`;
const FaintedLabel = styled.p`color:#e74c3c;font-weight:bold;font-size:14px;margin-top:8px;`;

const CancelBtn = styled.button`
  width:calc(100% - 64px); margin:24px 32px 32px;
  padding:16px; font-size:18px; font-weight:bold;
  background:linear-gradient(135deg,#95a5a6,#7f8c8d);
  color:#fff; border:2px solid rgba(149,165,166,0.4);
  border-radius:14px; cursor:pointer;
  &:hover { background:linear-gradient(135deg,#7f8c8d,#6d7b7c); }
`;