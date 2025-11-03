// src/components/UI/PokemonPicker.tsx

import React, { useState, useEffect } from 'react';
import { pokeAPI } from '../../api/pokeapi';
import { useGameStore } from '../../store/gameStore';
import { GameMove, StatusEffectType, MoveEffect } from '../../types/game';

// 타입별 상태이상 매핑
const TYPE_TO_STATUS: Record<string, StatusEffectType> = {
  fire: 'burn',
  electric: 'paralysis',
  ice: 'freeze',
  poison: 'poison',
  grass: 'poison',
  psychic: 'sleep',
};

const REROLL_COST = 20;

interface PokemonChoice {
  data: any;
  cost: number;
}

export const PokemonPicker: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [choices, setChoices] = useState<PokemonChoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const setPokemonToPlace = useGameStore(state => state.setPokemonToPlace);
  const { money, spendMoney } = useGameStore(state => ({
    money: state.money,
    spendMoney: state.spendMoney,
  }));
  
  const loadChoices = async () => {
    setIsLoading(true);
    const ids = [pokeAPI.getRandomPokemonId(), pokeAPI.getRandomPokemonId(), pokeAPI.getRandomPokemonId()];
    const data = await Promise.all(ids.map(id => pokeAPI.getPokemon(id)));
    
    // 종족값 총합으로 가격 계산 (100 ~ 300원)
    const withCost = data.map(p => {
      const statTotal = p.stats.hp + p.stats.attack + p.stats.defense + 
                       p.stats.specialAttack + p.stats.specialDefense + p.stats.speed;
      const cost = Math.floor(25 + (statTotal / 600) * 200);
      return { data: p, cost };
    });
    
    setChoices(withCost);
    setIsLoading(false);
  };
  
  useEffect(() => {
    loadChoices();
  }, []);

  const handleSelect = async (choice: PokemonChoice) => {
    if (isLoading) return;
    
    setIsLoading(true);

    try {
      const poke = choice.data;
      // 'status' 기술 제외하고 4개 필터링
      const moveNames = poke.moves.slice(0, 20); // 20개 탐색
      let usableMoves: any[] = [];
      
      for (const name of moveNames) {
        if (usableMoves.length >= 4) break;
        const move = await pokeAPI.getMove(name);
        if (move.damageClass !== 'status') {
          usableMoves.push(move);
        }
      }
      
      const equippedMoves: GameMove[] = usableMoves.map(m => {
        const effect: MoveEffect = { type: 'damage' };
        
        // 30% 확률로 타입에 맞는 상태이상 부여
        const status = TYPE_TO_STATUS[m.type];
        if (status && Math.random() < 0.3) {
          effect.statusInflict = status;
          effect.statusChance = 30; // 30%
        }

        // 20% 확률로 광역기(AOE) 부여
        const isAOE = Math.random() < 0.2;

        return {
          name: m.name,
          type: m.type,
          power: m.power || 40, // 기본값 40
          accuracy: m.accuracy || 100,
          damageClass: m.damageClass,
          effect: effect,
          cooldown: 2.0,
          currentCooldown: 0,
          isAOE: isAOE,
          aoeRadius: isAOE ? 100 : undefined, // 100px 반경
          manualCast: false,
        };
      });
      
      setPokemonToPlace({
        ...poke,
        equippedMoves: equippedMoves,
        cost: choice.cost,
      });
      
    } catch (error) {
      console.error("Failed to fetch moves:", error);
      alert("기술을 불러오는 데 실패했습니다.");
    }

    setIsLoading(false);
    onClose();
  };
  
  const handleReroll = () => {
    if (!spendMoney(REROLL_COST)) {
      alert(`돈이 부족합니다! (리롤: ${REROLL_COST}원)`);
      return;
    }
    loadChoices();
  };
  
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>{isLoading ? '⏳ 기술 정보 로딩 중...' : '🎲 포켓몬 선택'}</h2>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        <p style={s.money}>보유 금액: 💰 {money}원</p>
        <div style={s.grid}>
          {choices.map((choice, idx) => (
            <div key={idx} style={s.card} onClick={() => handleSelect(choice)}>
              <div style={s.cardInner}>
                <img src={choice.data.sprite} alt={choice.data.name} style={s.img} />
                <h3 style={s.pokeName}>{choice.data.name}</h3>
                <div style={s.statsGrid}>
                  <div style={s.statItem}>
                    <span style={s.statLabel}>HP</span>
                    <span style={s.statValue}>{choice.data.stats.hp}</span>
                  </div>
                  <div style={s.statItem}>
                    <span style={s.statLabel}>공격</span>
                    <span style={s.statValue}>{choice.data.stats.attack}</span>
                  </div>
                  <div style={s.statItem}>
                    <span style={s.statLabel}>방어</span>
                    <span style={s.statValue}>{choice.data.stats.defense}</span>
                  </div>
                  <div style={s.statItem}>
                    <span style={s.statLabel}>특공</span>
                    <span style={s.statValue}>{choice.data.stats.specialAttack}</span>
                  </div>
                  <div style={s.statItem}>
                    <span style={s.statLabel}>특방</span>
                    <span style={s.statValue}>{choice.data.stats.specialDefense}</span>
                  </div>
                  <div style={s.statItem}>
                    <span style={s.statLabel}>스피드</span>
                    <span style={s.statValue}>{choice.data.stats.speed}</span>
                  </div>
                </div>
                <div style={s.price}>💰 {choice.cost}원</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={handleReroll} style={s.btnReroll} disabled={isLoading}>
          🔄 리롤 ({REROLL_COST}원)
        </button>
      </div>
    </div>
  );
};

// 고급 게임 UI 스타일
const s: Record<string, React.CSSProperties> = {
  overlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    background: 'radial-gradient(circle at center, rgba(0,0,0,0.85), rgba(0,0,0,0.95))', 
    backdropFilter: 'blur(8px)',
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease-out'
  },
  modal: { 
    background: 'linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%)',
    color: '#e8edf3', 
    borderRadius: '24px', 
    padding: '0',
    maxWidth: '900px', 
    width: '90%',
    boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 1px 1px rgba(76, 175, 255, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)', 
    border: '2px solid rgba(76, 175, 255, 0.2)',
    position: 'relative',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    background: 'linear-gradient(90deg, rgba(76, 175, 255, 0.15), transparent)',
    borderBottom: '2px solid rgba(76, 175, 255, 0.2)'
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    margin: 0,
    textShadow: '0 0 20px rgba(76, 175, 255, 0.6), 0 2px 4px rgba(0,0,0,0.8)',
    background: 'linear-gradient(135deg, #4cafff, #00d4ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '1px'
  },
  closeBtn: {
    width: '48px',
    height: '48px',
    fontSize: '24px',
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    color: '#ff6b6b',
    border: '2px solid rgba(231, 76, 60, 0.4)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)'
  },
  money: { 
    fontSize: '22px', 
    fontWeight: 'bold', 
    color: '#ffd700', 
    margin: '20px 32px',
    textAlign: 'center',
    textShadow: '0 0 15px rgba(255, 215, 0, 0.7), 0 2px 4px rgba(0,0,0,0.8)',
    padding: '16px',
    background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent)',
    borderRadius: '12px'
  },
  grid: { 
    display: 'flex', 
    gap: '24px', 
    margin: '0 32px 32px',
    justifyContent: 'center'
  },
  card: { 
    flex: 1, 
    minWidth: '200px',
    maxWidth: '250px',
    background: 'linear-gradient(145deg, rgba(30, 40, 60, 0.9), rgba(15, 20, 35, 0.95))',
    border: '2px solid rgba(76, 175, 255, 0.3)',
    borderRadius: '20px', 
    padding: '0',
    cursor: 'pointer', 
    textAlign: 'center', 
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as 'relative',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
  },
  cardInner: {
    padding: '24px',
    position: 'relative' as 'relative',
    zIndex: 1
  },
  img: { 
    width: '120px', 
    height: '120px', 
    imageRendering: 'pixelated' as 'pixelated',
    marginBottom: '16px',
    filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.6))',
    transition: 'transform 0.3s ease'
  },
  pokeName: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '12px',
    textTransform: 'capitalize' as 'capitalize',
    color: '#e8edf3',
    textShadow: '0 2px 8px rgba(0,0,0,0.8)'
  },
  stats: { 
    display: 'flex', 
    justifyContent: 'space-around', 
    fontSize: '15px', 
    marginTop: '12px',
    padding: '12px',
    background: 'rgba(76, 175, 255, 0.08)',
    borderRadius: '10px',
    gap: '12px',
    fontWeight: '600'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginTop: '12px',
    padding: '12px',
    background: 'rgba(76, 175, 255, 0.08)',
    borderRadius: '10px'
  },
  statItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 8px',
    background: 'rgba(30, 40, 60, 0.5)',
    borderRadius: '6px',
    fontSize: '13px'
  },
  statLabel: {
    color: '#a8b8c8',
    fontWeight: '600',
    fontSize: '12px'
  },
  statValue: {
    color: '#4cafff',
    fontWeight: '700',
    fontSize: '14px'
  },
  price: { 
    marginTop: '16px', 
    fontSize: '20px', 
    fontWeight: 'bold', 
    color: '#ffd700',
    textShadow: '0 0 10px rgba(255, 215, 0, 0.6)',
    padding: '12px',
    background: 'linear-gradient(90deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.1))',
    borderRadius: '12px',
    border: '1px solid rgba(255, 215, 0, 0.3)'
  },
  btnReroll: { 
    width: 'calc(100% - 64px)',
    margin: '0 32px 32px',
    padding: '18px',
    fontSize: '18px',
    background: 'linear-gradient(135deg, #4cafff 0%, #0088cc 100%)',
    color: '#fff',
    border: '2px solid rgba(76, 175, 255, 0.4)',
    borderRadius: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.3s ease',
    boxShadow: '0 8px 24px rgba(76, 175, 255, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
  },
};