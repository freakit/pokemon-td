// src/App.tsx

import React, { useState, useEffect } from "react";
import { GameCanvas } from "./components/Game/GameCanvas";
import { HUD } from "./components/UI/HUD";
import { PokemonPicker } from "./components/UI/PokemonPicker";
import { PokemonManager } from "./components/UI/PokemonManager";
import { MapSelector } from "./components/UI/MapSelector";
import { Shop } from "./components/UI/Shop";
import { Pokedex } from "./components/Modals/Pokedex";
import { AchievementsPanel } from "./components/Modals/Achievements";
import { Settings } from "./components/Modals/Settings";
import { useGameStore } from "./store/gameStore";
import { WaveSystem } from "./game/WaveSystem";
import { saveService } from "./services/SaveService";
import "./index.css";
import { SkillPicker } from './components/Modals/SkillPicker';
import { WaveEndPicker } from './components/Modals/WaveEndPicker';
import { Wave50ClearModal } from './components/Modals/Wave50ClearModal';
import { EvolutionConfirmModal } from './components/Modals/EvolutionConfirmModal';
import { SynergyTracker } from './components/UI/SynergyTracker';
import { SynergyDetails } from './components/UI/SynergyDetails'; // 🆕 툴팁 컴포넌트 임포트

function App() {
  const [showPicker, setShowPicker] = useState(false);
  const [showPokemonManager, setShowPokemonManager] = useState(false);
  const [showPokedex, setShowPokedex] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(true);
  const {
    nextWave,
    isWaveActive,
    gameOver,
    reset,
    skillChoiceQueue,
    waveEndItemPick,
    spendMoney,
    wave50Clear,
  } = useGameStore((state) => ({
    nextWave: state.nextWave,
    isWaveActive: state.isWaveActive,
    gameOver: state.gameOver,
    reset: state.reset,
    skillChoiceQueue: state.skillChoiceQueue,
    waveEndItemPick: state.waveEndItemPick,
    spendMoney: state.spendMoney,
    wave50Clear: state.wave50Clear,
  }));
  
  const handleOpenPicker = () => {
    if (!spendMoney(20)) {
      alert("돈이 부족합니다! (입장료: 20원)");
      return;
    }
    setShowPicker(true);
  };

  useEffect(() => {
    const data = saveService.load();
    console.log("Loaded save data:", data);
  }, []);

  const handleStartWave = () => {
    if (isWaveActive) return;
    nextWave();
    const wave = useGameStore.getState().wave;
    WaveSystem.getInstance().startWave(wave);
  };
  
  const handleReset = () => {
    reset();
    setShowMapSelector(true);
    window.location.reload();
  };
  
  return (
    <div style={styles.app}>
      {showMapSelector && !isWaveActive ? (
        <MapSelector onSelect={() => setShowMapSelector(false)} />
      ) : (
        <div style={styles.gameLayout}>
          {/* 게임 캔버스 - 전체 화면 */}
          <div style={styles.canvasContainer}>
            <GameCanvas />
          </div>

     
          {/* 하단 컨트롤 패널 */}
          <div style={styles.bottomPanel}>
            <HUD
              onStartWave={handleStartWave}
              onAddPokemon={handleOpenPicker}
              onManagePokemon={() => setShowPokemonManager(true)}
            />

            
            {/* 추가 버튼들 */}
            <div style={styles.extraButtons}>
              <button
                onClick={() => setShowPokedex(true)}
                style={styles.bottomBtn}
              >
                📖 도감
              </button>
              <button
                onClick={() => setShowAchievements(true)}
                style={styles.bottomBtn}
              >
                🏆 업적
              </button>
              <button
                onClick={() => setShowSettings(true)}
                style={styles.bottomBtn}
              >
                ⚙️ 설정
              </button>
            </div>
          </div>

          {/* 우측 상점 사이드바 - 항상 표시 */}
          <Shop />
        </div>
      )}

      {showPicker && <PokemonPicker onClose={() => setShowPicker(false)} />}
      {showPokemonManager && (
        <PokemonManager onClose={() => setShowPokemonManager(false)} />
      )}
   
      {showPokedex && <Pokedex onClose={() => setShowPokedex(false)} />}
      {showAchievements && (
        <AchievementsPanel onClose={() => setShowAchievements(false)} />
      )}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {/* 시너지 트래커 */}
      <SynergyTracker />
      {/* 🆕 시너지 툴팁 */}
      <SynergyDetails />

      {/* 좌측 기술 선택 사이드바 - 레벨업 시 표시 */}
      {skillChoiceQueue && skillChoiceQueue.length > 0 && <SkillPicker />}

      {/* 진화 확인 모달 추가 */}
      <EvolutionConfirmModal />

      {/* 웨이브 종료 시 아이템 선택 모달 */}
      {waveEndItemPick && <WaveEndPicker />}

      {/* 웨이브 50 클리어 모달 */}
      {wave50Clear && (
        <Wave50ClearModal
          onContinue={() => {
            useGameStore.setState({ wave50Clear: false, isPaused: false });
          }}
          onRestart={() => {
            window.location.reload();
          }}
        />
      )}

      {gameOver && (
        <div style={styles.gameOverOverlay}>
          <div style={styles.gameOverModal}>
            <h2 style={styles.gameOverTitle}>💀 게임 오버</h2>
            <p>웨이브 {useGameStore.getState().wave}까지 도달!</p>
            <button onClick={handleReset} style={styles.restartBtn}>
              다시 시작
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 고급 게임 UI 스타일 - 전체 화면 레이아웃
const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    height: "100vh",
    background:
      "radial-gradient(ellipse at top, #1a2332 0%, #0f1419 50%, #000000 100%)",
    color: "#e8edf3",
    position: "relative" as "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as "column",
  },
  gameLayout: {
    display: "flex",
    flexDirection: "column" as "column",
    height: "100vh",
    width: "100vw",
  },
  canvasContainer: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px 16px 0 16px",
    overflow: "hidden",
  },
  bottomPanel: {
    padding: "12px 24px 24px",
    background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.5))",
    backdropFilter: "blur(10px)",
  },
  extraButtons: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    marginTop: "12px",
  },
  bottomBtn: {
    padding: "10px 24px",
    fontSize: "14px",
    cursor: "pointer",
    borderRadius: "12px",
    border: "2px solid rgba(76, 175, 255, 0.3)",
    background:
      "linear-gradient(135deg, rgba(76, 175, 255, 0.15), rgba(76, 175, 255, 0.05))",
    color: "#4cafff",
    fontWeight: "bold",
    boxShadow:
      "0 4px 15px rgba(76, 175, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
    backdropFilter: "blur(5px)",
    textShadow: "0 0 10px rgba(76, 175, 255, 0.5)",
  },
  gameOverOverlay: {
    position: "fixed" as "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      "radial-gradient(circle at center, rgba(231, 76, 60, 0.3), rgba(0,0,0,0.9))",
    backdropFilter: "blur(10px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    animation: "fadeIn 0.5s ease-out",
  },
  gameOverModal: {
    background: "linear-gradient(145deg, #1a1f2e 0%, #0f1419 100%)",
    borderRadius: "32px",
    padding: "64px",
    textAlign: "center" as "center",
    border: "3px solid rgba(231, 76, 60, 0.4)",
    boxShadow:
      "0 25px 80px rgba(231, 76, 60, 0.4), 0 0 100px rgba(231, 76, 60, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)",
    animation: "pulse 2s ease-in-out infinite",
  },
  gameOverTitle: {
    fontSize: "56px",
    marginBottom: "32px",
    color: "#ff6b6b",
    textShadow: "0 0 30px rgba(231, 76, 60, 0.8), 0 4px 8px rgba(0,0,0,0.8)",
    fontWeight: "900",
  },
  restartBtn: {
    padding: "20px 60px",
    fontSize: "22px",
    background: "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)",
    color: "#fff",
    border: "3px solid rgba(46, 204, 113, 0.4)",
    borderRadius: "16px",
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow:
      "0 8px 32px rgba(46, 204, 113, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
    marginTop: "24px",
  },
};

export default App;