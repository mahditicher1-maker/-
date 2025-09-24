import React, { useState, useEffect, useCallback } from 'react';
import { Axis } from './types';
import CoordinatePlane from './components/CoordinatePlane';
import ControlPanel from './components/ControlPanel';
import * as Sfx from './audio';

// --- Type Definitions ---
interface Point { x: number; y: number; }
interface DecoyBase extends Point { isReal: boolean; }
interface MissileState {
  id: number;
  start: Point;
  target: Point;
  position: Point;
  angle: number;
  explosionProgress: number | null;
  isHit: boolean;
  startTime: number;
}
type GameMode = 'classic' | 'decoy';
type GameStatus = 'pre-start' | 'idle' | 'deploying' | 'fired' | 'result';


const getRandomLine = () => {
    const axis = Math.random() < 0.5 ? Axis.X : Axis.Y;
    const value = axis === Axis.Y 
        ? Math.floor(Math.random() * 13) + 2 // x from 2 to 14
        : Math.floor(Math.random() * 7) + 2;   // y from 2 to 8
    return { axis, value };
};

const getDistance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

const App: React.FC = () => {
  // --- Core Game State ---
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [symmetryAxis, setSymmetryAxis] = useState<Axis>(Axis.Y);
  const [symmetryValue, setSymmetryValue] = useState<number>(8);
  const [gameStatus, setGameStatus] = useState<GameStatus>('pre-start');
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [showGraphics, setShowGraphics] = useState<boolean>(false);
  
  // --- Classic Mode State ---
  const [basePoint, setBasePoint] = useState<Point | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [playerTwoPoint, setPlayerTwoPoint] = useState<Point | null>(null);
  const [playerTwoPreviewPoint, setPlayerTwoPreviewPoint] = useState<Point | null>(null);
  const [playerTwoConfirmed, setPlayerTwoConfirmed] = useState<boolean>(false);
  const [correctSymmetricPoint, setCorrectSymmetricPoint] = useState<Point | null>(null);

  // --- Decoy Mode State ---
  const [decoyBases, setDecoyBases] = useState<DecoyBase[]>([]);
  const [decoyPlayerPoints, setDecoyPlayerPoints] = useState<Point[]>([]);
  const [timer, setTimer] = useState(60);

  // --- Shared Animation State ---
  const [missiles, setMissiles] = useState<MissileState[]>([]);

  // --- UI State ---
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMuted, setIsMuted] = useState(true);

  // --- Effects ---
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  
  // Initialize game on first load or game mode change
  useEffect(() => {
    handleFullReset();
  }, [gameMode]); 

  // Timer logic for decoy mode
  useEffect(() => {
    if (gameMode === 'decoy' && gameStatus === 'idle' && timer > 0) {
      const interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (gameMode === 'decoy' && gameStatus === 'idle' && timer === 0) {
      handleFireAllMissiles();
    }
  }, [gameMode, gameStatus, timer]);


  // --- UI Handlers ---
  const toggleTheme = () => {
    Sfx.playClick();
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleMute = () => {
    const newMuteState = Sfx.toggleMute();
    setIsMuted(newMuteState);
  };
  
  const toggleGameMode = () => {
    Sfx.playClick();
    setGameMode(prev => prev === 'classic' ? 'decoy' : 'classic');
  };

  // --- Game Flow & Logic ---

  const getSymmetricPoint = useCallback((point: Point) => {
    return symmetryAxis === Axis.Y
      ? { x: 2 * symmetryValue - point.x, y: point.y }
      : { x: point.x, y: 2 * symmetryValue - point.y };
  }, [symmetryAxis, symmetryValue]);

  const resetCommonState = useCallback(() => {
    const { axis, value } = getRandomLine();
    setSymmetryAxis(axis);
    setSymmetryValue(value);
    setMissiles([]);
    setShowGraphics(false);
    setGameStatus('pre-start');

    // Reset classic mode state
    setBasePoint(null);
    setPreviewPoint(null);
    setPlayerTwoPoint(null);
    setPlayerTwoPreviewPoint(null);
    setCorrectSymmetricPoint(null);
    setPlayerTwoConfirmed(false);
    
    // Reset decoy mode state
    setDecoyBases([]);
    setDecoyPlayerPoints([]);
    setTimer(60);
  }, []);

  const setupClassicRound = useCallback(() => {
    // State is already clean from resetCommonState, just change status
    setGameStatus('idle');
  }, []);
  
  const setupDecoyRound = useCallback(() => {
    const tempBases: Point[] = [];
    const maxX = 16, maxY = 10;
    const MIN_DISTANCE_BASES = 4.0;
    const MIN_DISTANCE_LAUNCHER = 4.0; // Min distance between a base and a potential launcher spot (its symmetric point)
    let attempts = 0;
    
    while(tempBases.length < 3 && attempts < 200) {
      attempts++;
      const p = { x: Math.floor(Math.random() * (maxX + 1)), y: Math.floor(Math.random() * (maxY + 1)) };
      const s = getSymmetricPoint(p);

      // 1. Symmetric point must be on the board
      const isSymValid = s.x >= 0 && s.x <= maxX && s.y >= 0 && s.y <= maxY;
      if(!isSymValid) continue;

      // 2. Base and its own symmetric point (launcher area) must not be too close
      if (getDistance(p, s) < MIN_DISTANCE_LAUNCHER) continue;

      // 3. New base must be far enough from other existing bases
      const isFarEnough = tempBases.every(b => getDistance(p, b) >= MIN_DISTANCE_BASES);
      if(!isFarEnough) continue;

      tempBases.push(p);
    }
    // If we failed to find 3 points, fallback to just taking the last valid ones
    if (tempBases.length < 3) {
      console.warn("Failed to generate 3 well-spaced decoy bases. The round might be cramped.");
    }


    const realIndex = Math.floor(Math.random() * tempBases.length);
    const finalBases = tempBases.map((p, i) => ({ ...p, isReal: i === realIndex }));
    
    setDecoyBases(finalBases.sort(() => Math.random() - 0.5)); // Shuffle for display
    setGameStatus('idle');
  }, [getSymmetricPoint]);
  
  const handleStartRound = () => {
    Sfx.playClick();
    if (gameMode === 'classic') {
        setupClassicRound();
    } else {
        setupDecoyRound();
    }
  };

  const handleNextStage = useCallback(() => {
    Sfx.playNewRound();
    setCurrentTurn(turn => turn === 1 ? 2 : 1);
    resetCommonState();
  }, [resetCommonState]);

  const handleFullReset = useCallback(() => {
    Sfx.playNewRound();
    setScore1(0);
    setScore2(0);
    setCurrentTurn(1);
    resetCommonState();
  }, [resetCommonState]);

  // --- Animation ---
  const animateMissiles = useCallback((missileData: MissileState[]) => {
      const duration = 2500;
      
      const animationStep = (currentTime: number) => {
          let allMissilesFinished = true;
          
          const updatedMissiles = missileData.map(m => {
              const individualProgress = Math.min((currentTime - m.startTime) / duration, 1);
              if (individualProgress < 1) allMissilesFinished = false;

              const start = m.start;
              const end = m.target;
              const controlHeight = Math.max(2, Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)) / 4);
              const p0 = start, p3 = end;
              const p1 = { x: start.x, y: start.y + controlHeight };
              const p2 = { x: end.x, y: end.y + controlHeight };

              const t = individualProgress;
              const u = 1 - t, tt = t*t, uu = u*u, uuu = uu*u, ttt = tt*t;
              const pos = {
                  x: uuu*p0.x + 3*uu*t*p1.x + 3*u*tt*p2.x + ttt*p3.x,
                  y: uuu*p0.y + 3*uu*t*p1.y + 3*u*tt*p2.y + ttt*p3.y,
              };
              const deriv = {
                  x: 3*uu*(p1.x-p0.x) + 6*u*t*(p2.x-p1.x) + 3*tt*(p3.x-p2.x),
                  y: 3*uu*(p1.y-p0.y) + 6*u*t*(p2.y-p1.y) + 3*tt*(p3.y-p2.y),
              };

              return { ...m, position: pos, angle: Math.atan2(deriv.y, deriv.x) * (180 / Math.PI) };
          });

          setMissiles(updatedMissiles);

          if (!allMissilesFinished) {
              requestAnimationFrame(animationStep);
          } else {
              setGameStatus('result');
              const explosionDuration = 1000;
              const explosionStart = performance.now();
              const animateExplosion = (time: number) => {
                  const explosionElapsed = time - explosionStart;
                  const explosionProgress = Math.min(explosionElapsed / explosionDuration, 1);
                  setMissiles(currentMissiles => currentMissiles.map(m => ({ ...m, explosionProgress })));
                  if (explosionProgress < 1) requestAnimationFrame(animateExplosion);
              };
              requestAnimationFrame(animateExplosion);

              const anyHit = updatedMissiles.some(m => m.isHit);
              if (anyHit) {
                  Sfx.playHit();
                   const attacker = currentTurn === 1 ? 2 : 1;
                   if (attacker === 1) setScore1(s => s + 1);
                   else setScore2(s => s + 1);
              } else {
                  Sfx.playMiss();
              }
          }
      };
      requestAnimationFrame(animationStep);
  }, [currentTurn]);

  // --- Classic Mode Handlers ---
  const handleSetBasePointPreview = useCallback((p: Point | null) => {!basePoint && setPreviewPoint(p)}, [basePoint]);
  const handleSetPlayerTwoPreviewPoint = useCallback((p: Point | null) => {!playerTwoPoint && setPlayerTwoPreviewPoint(p)}, [playerTwoPoint]);
  const handleSetBasePoint = useCallback((p: Point) => {
    Sfx.playConfirm();
    setBasePoint(p);
    setPreviewPoint(null);
    setPlayerTwoPoint(null);
    setPlayerTwoPreviewPoint(null);
    setCorrectSymmetricPoint(null);
    setPlayerTwoConfirmed(false);
  }, []);
  const handleConfirmPlayerTwoPoint = useCallback((p: Point) => {
    if (!basePoint) return;
    Sfx.playConfirm();
    setPlayerTwoPoint(p);
    setPlayerTwoPreviewPoint(null);
    setCorrectSymmetricPoint(getSymmetricPoint(basePoint));
    setPlayerTwoConfirmed(true);
  }, [basePoint, getSymmetricPoint]);
  const handleFireMissile = useCallback(() => {
    if (!playerTwoPoint || !basePoint) return;
    setShowGraphics(true);
    setGameStatus('deploying');
    
    setTimeout(() => {
        Sfx.playLaunch();
        const target = getSymmetricPoint(playerTwoPoint);
        const isHit = Math.round(target.x) === Math.round(basePoint.x) && Math.round(target.y) === Math.round(basePoint.y);
        
        const newMissile: MissileState = {
          id: 1,
          start: playerTwoPoint,
          target: target,
          position: playerTwoPoint,
          angle: 0,
          explosionProgress: null,
          isHit,
          startTime: performance.now()
        };
        
        setMissiles([newMissile]);
        setGameStatus('fired');
        animateMissiles([newMissile]);
    }, 1000);
  }, [playerTwoPoint, basePoint, getSymmetricPoint, animateMissiles]);

  // --- Decoy Mode Handlers ---
  const handleAddDecoyPoint = useCallback((point: Point) => {
    if (decoyPlayerPoints.length < 3) {
      Sfx.playClick();
      setDecoyPlayerPoints(current => [...current, point]);
    }
  }, [decoyPlayerPoints.length]);

  const handleUpdateDecoyPoint = useCallback((index: number, point: Point) => {
    Sfx.playClick();
    setDecoyPlayerPoints(current => {
      const newPoints = [...current];
      if (index >= 0 && index < newPoints.length) {
        newPoints[index] = point;
      }
      return newPoints;
    });
  }, []);

  const handleDeleteDecoyPoint = useCallback((index: number) => {
    Sfx.playMiss();
    setDecoyPlayerPoints(current => current.filter((_, i) => i !== index));
  }, []);


  const handleFireAllMissiles = useCallback(() => {
    if (gameStatus !== 'idle' || gameMode !== 'decoy') return;
    
    setShowGraphics(true);
    setGameStatus('deploying');
    setTimer(0); // Stop timer

    const realBase = decoyBases.find(b => b.isReal);
    if (!realBase) return;

    setTimeout(() => {
        Sfx.playLaunch();
        const launchTime = performance.now();
        const newMissiles: MissileState[] = decoyPlayerPoints.map((startPoint, i) => {
            const target = getSymmetricPoint(startPoint);
            const isHit = Math.round(target.x) === Math.round(realBase.x) && Math.round(target.y) === Math.round(realBase.y);
            return {
                id: i,
                start: startPoint,
                target,
                position: startPoint,
                angle: 0,
                explosionProgress: null,
                isHit,
                startTime: launchTime + i * 150 // Stagger launch slightly
            };
        });
        
        setMissiles(newMissiles);
        if (newMissiles.length > 0) {
            setGameStatus('fired');
            animateMissiles(newMissiles);
        } else {
             setGameStatus('result');
             Sfx.playMiss();
        }
    }, 1000);
  }, [gameStatus, gameMode, decoyPlayerPoints, decoyBases, getSymmetricPoint, animateMissiles]);

  // --- Render Logic ---
  const isHit = gameStatus === 'result' && missiles.some(m => m.isHit);
  const isResultState = gameStatus === 'result';
  const effectClasses = isResultState ? `flashing-effect ${isHit ? 'hit-success' : 'hit-miss'}` : '';

  const tankDirection = basePoint && symmetryAxis === Axis.Y ? (basePoint.x < symmetryValue ? 'right' : 'left') : 'right';
  const launcherDirection = playerTwoPoint && symmetryAxis === Axis.Y ? (playerTwoPoint.x < symmetryValue ? 'right' : 'left') : 'right';
  const previewLauncherDirection = playerTwoPreviewPoint && symmetryAxis === Axis.Y ? (playerTwoPreviewPoint.x < symmetryValue ? 'right' : 'left') : 'right';

  return (
    <div className={`flex flex-col h-screen bg-stone-200 dark:bg-slate-900 font-sans p-2 sm:p-4 gap-4 ${effectClasses}`}>
      <header className="flex-shrink-0">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-stone-800 dark:text-green-400 font-orbitron uppercase tracking-widest">
          نبرد تقارن
        </h1>
        <p className="text-center text-lg sm:text-xl text-stone-600 dark:text-slate-400 mt-4">
          با استفاده از تقارن، دشمن را نابود کنید!
        </p>
      </header>

      <main className="flex-grow flex flex-col md:flex-row gap-4 min-h-0">
        <div className="md:w-1/3 lg:w-1/4 flex-shrink-0">
           <ControlPanel
            gameMode={gameMode}
            axis={symmetryAxis}
            value={symmetryValue}
            basePoint={basePoint}
            onSetBasePoint={handleSetBasePoint}
            onSetBasePointPreview={handleSetBasePointPreview}
            onSetPlayerTwoPreviewPoint={handleSetPlayerTwoPreviewPoint}
            playerTwoConfirmed={playerTwoConfirmed}
            onConfirmPlayerTwoPoint={handleConfirmPlayerTwoPoint}
            gameStatus={gameStatus}
            isHit={isHit}
            onFireMissile={handleFireMissile}
            onResetGame={handleNextStage}
            onFullReset={handleFullReset}
            onStartRound={handleStartRound}
            score1={score1}
            score2={score2}
            currentTurn={currentTurn}
            // Decoy Mode Props
            decoyBases={decoyBases}
            timer={timer}
            decoyPlayerPoints={decoyPlayerPoints}
            onAddDecoyPoint={handleAddDecoyPoint}
            onUpdateDecoyPoint={handleUpdateDecoyPoint}
            onDeleteDecoyPoint={handleDeleteDecoyPoint}
            onFireAllMissiles={handleFireAllMissiles}
          />
        </div>
        <div className="flex-grow min-w-0">
          <CoordinatePlane
            gameMode={gameMode}
            symmetryAxis={symmetryAxis}
            symmetryValue={symmetryValue}
            basePoint={basePoint}
            previewPoint={previewPoint}
            playerTwoPoint={playerTwoPoint}
            playerTwoPreviewPoint={playerTwoPreviewPoint}
            correctSymmetricPoint={correctSymmetricPoint}
            gameStatus={gameStatus}
            missiles={missiles}
            isHit={isHit}
            theme={theme}
            showGraphics={showGraphics}
            tankDirection={tankDirection}
            launcherDirection={launcherDirection}
            previewLauncherDirection={previewLauncherDirection}
            // Decoy Mode Props
            decoyBases={decoyBases}
            decoyPlayerPoints={decoyPlayerPoints}
          />
        </div>
      </main>

       <footer className="text-center text-sm text-slate-500 dark:text-slate-400 p-2 flex-shrink-0">
        <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={toggleGameMode} title={gameMode === 'classic' ? "حالت فریب" : "حالت کلاسیک"} className="p-2 rounded-full bg-indigo-100 dark:bg-slate-800 hover:bg-indigo-200 dark:hover:bg-slate-700 transition-colors text-xl">
                {gameMode === 'classic' ? '🎯' : '🎮'}
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-full bg-indigo-100 dark:bg-slate-800 hover:bg-indigo-200 dark:hover:bg-slate-700 transition-colors">
                {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button onClick={toggleMute} className="p-2 rounded-full bg-indigo-100 dark:bg-slate-800 hover:bg-indigo-200 dark:hover:bg-slate-700 transition-colors text-xl">
                {isMuted ? '🔇' : '🔊'}
            </button>
        </div>
      برای آموزش بهتر ❤️
      </footer>
    </div>
  );
};

export default App;
