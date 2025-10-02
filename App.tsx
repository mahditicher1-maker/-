import React, { useState, useEffect, useCallback } from 'react';
import { Axis } from './types';
import CoordinatePlane from './components/CoordinatePlane';
import ControlPanel from './components/ControlPanel';
import SettingsModal from './components/SettingsModal';
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
interface CounterAttackState {
  id: number;
  start: Point;
  target: Point;
  position: Point;
  startTime: number;
  explosionProgress: number | null;
}
type GameMode = 'classic' | 'decoy';
type GameStatus = 'pre-start' | 'idle' | 'deploying' | 'fired' | 'result';
type Difficulty = 'easy' | 'medium' | 'hard';
type ScreenSize = 'large' | 'medium' | 'small';


const getDistance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

const App: React.FC = () => {
  // --- Core Game State ---
  const [gameMode, setGameMode] = useState<GameMode>('decoy');
  const [symmetryAxis, setSymmetryAxis] = useState<Axis>(Axis.Y);
  const [symmetryValue, setSymmetryValue] = useState<number>(8);
  const [gameStatus, setGameStatus] = useState<GameStatus>('pre-start');
  const [scores, setScores] = useState<number[]>(Array(6).fill(0));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [showGraphics, setShowGraphics] = useState<boolean>(false);
  const [tutorialStep, setTutorialStep] = useState<'inactive' | 'vertical' | 'horizontal'>('inactive');
  
  // --- Classic Mode State ---
  const [basePoint, setBasePoint] = useState<Point | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [playerTwoPoint, setPlayerTwoPoint] = useState<Point | null>(null);
  const [playerTwoPreviewPoint, setPlayerTwoPreviewPoint] = useState<Point | null>(null);
  const [playerTwoConfirmed, setPlayerTwoConfirmed] = useState<boolean>(false);
  const [correctSymmetricPoint, setCorrectSymmetricPoint] = useState<Point | null>(null);

  // --- Decoy Mode State ---
  const [decoyBases, setDecoyBases] = useState<DecoyBase[]>([]);
  const [decoyPlayerPoint, setDecoyPlayerPoint] = useState<Point | null>(null);
  const [timer, setTimer] = useState(30);
  const [roundsCompletedThisTurn, setRoundsCompletedThisTurn] = useState(0);

  // --- Shared Animation State ---
  const [missiles, setMissiles] = useState<MissileState[]>([]);
  const [counterAttack, setCounterAttack] = useState<CounterAttackState | null>(null);
  const [lastRoundScore, setLastRoundScore] = useState<number | null>(null);
  const [showCounterAttackGlow, setShowCounterAttackGlow] = useState<boolean>(false);
  const [isResultAnimationFinished, setIsResultAnimationFinished] = useState<boolean>(false);


  // --- UI State ---
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMuted, setIsMuted] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [numPlayersDecoy, setNumPlayersDecoy] = useState(4);
  const [roundsPerTurnDecoy, setRoundsPerTurnDecoy] = useState(2);
  const [decoyTimerDuration, setDecoyTimerDuration] = useState(30);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showDecoyBaseCoords, setShowDecoyBaseCoords] = useState<boolean>(false);
  const [screenSize, setScreenSize] = useState<ScreenSize>('large');


  // --- Effects ---
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  

  // --- Game Flow & Logic ---

  const getSymmetricPoint = useCallback((point: Point) => {
    return symmetryAxis === Axis.Y
      ? { x: 2 * symmetryValue - point.x, y: point.y }
      : { x: point.x, y: 2 * symmetryValue - point.y };
  }, [symmetryAxis, symmetryValue]);

  // --- Animation ---
  const animateCounterAttack = useCallback((attackData: CounterAttackState) => {
    const duration = 1500; // Tank shell is faster than a missile

    const animationStep = (currentTime: number) => {
        const progress = Math.min((currentTime - attackData.startTime) / duration, 1);
        
        const pos = {
            x: attackData.start.x + (attackData.target.x - attackData.start.x) * progress,
            y: attackData.start.y + (attackData.target.y - attackData.start.y) * progress,
        };

        const updatedAttack = { ...attackData, position: pos };
        setCounterAttack(updatedAttack);

        if (progress < 1) {
            requestAnimationFrame(animationStep);
        } else {
            setShowCounterAttackGlow(true);
            Sfx.playHit(); // Use the existing hit sound for the explosion
            const explosionDuration = 1000;
            const explosionStart = performance.now();
            const animateExplosion = (time: number) => {
                const explosionElapsed = time - explosionStart;
                const explosionProgress = Math.min(explosionElapsed / explosionDuration, 1);
                setCounterAttack(current => current ? { ...current, explosionProgress } : null);
                if (explosionProgress < 1) {
                    requestAnimationFrame(animateExplosion);
                } else {
                    setIsResultAnimationFinished(true);
                }
            };
            requestAnimationFrame(animateExplosion);
        }
    };
    requestAnimationFrame(animationStep);
  }, []);
  
  const handleClassicMiss = useCallback(() => {
    const tank = basePoint;
    const launcher = playerTwoPoint;
    if (tank && launcher) {
        Sfx.playTankFire();
        const launchTime = performance.now();
        const newCounterAttack: CounterAttackState = {
            id: Date.now(),
            start: tank,
            target: launcher,
            position: tank,
            startTime: launchTime,
            explosionProgress: null,
        };
        setCounterAttack(newCounterAttack);
        animateCounterAttack(newCounterAttack);
    } else {
        setIsResultAnimationFinished(true);
    }
  }, [basePoint, playerTwoPoint, animateCounterAttack]);

  const handleDecoyMiss = useCallback(() => {
    const realBase = decoyBases.find(b => b.isReal);
    
    let counterAttackTarget: Point | null = decoyPlayerPoint;
    
    if (!counterAttackTarget) {
      counterAttackTarget = getSymmetricPoint({x: 8, y: 5}); 
    }

    if (realBase && counterAttackTarget) {
        Sfx.playTankFire();
        const launchTime = performance.now();
        const newCounterAttack: CounterAttackState = {
            id: Date.now(),
            start: realBase,
            target: counterAttackTarget,
            position: realBase,
            startTime: launchTime,
            explosionProgress: null,
        };
        setCounterAttack(newCounterAttack);
        animateCounterAttack(newCounterAttack);
    } else {
        setIsResultAnimationFinished(true);
    }
  }, [decoyBases, decoyPlayerPoint, animateCounterAttack, getSymmetricPoint]);

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
              const anyHit = updatedMissiles.some(m => m.isHit);

              const animateExplosion = (time: number) => {
                  const explosionElapsed = time - explosionStart;
                  const explosionProgress = Math.min(explosionElapsed / explosionDuration, 1);
                  setMissiles(currentMissiles => currentMissiles.map(m => ({ ...m, explosionProgress })));
                  
                  if (explosionProgress < 1) {
                      requestAnimationFrame(animateExplosion);
                  } else {
                      if (anyHit) {
                          setIsResultAnimationFinished(true);
                      } else {
                          if (gameMode === 'decoy') {
                              handleDecoyMiss();
                          } else if (gameMode === 'classic') {
                              handleClassicMiss();
                          }
                      }
                  }
              };

              if (anyHit) {
                  Sfx.playHit();
                  const pointsScored = gameMode === 'decoy' ? 10 + timer : 1;
                  setLastRoundScore(pointsScored);

                  setScores(prevScores => {
                      const newScores = [...prevScores];
                      let playerIndexToScore;
                      if (gameMode === 'classic') {
                          const attacker = currentPlayer === 1 ? 2 : 1;
                          playerIndexToScore = attacker - 1;
                      } else {
                          playerIndexToScore = currentPlayer - 1;
                      }
                      
                      if (playerIndexToScore >= 0 && playerIndexToScore < newScores.length) {
                         newScores[playerIndexToScore] += pointsScored;
                      }
                      return newScores;
                  });
              } else {
                  Sfx.playMiss();
                  setLastRoundScore(0);
              }
              
              requestAnimationFrame(animateExplosion);
          }
      };
      requestAnimationFrame(animationStep);
  }, [gameMode, currentPlayer, timer, handleDecoyMiss, handleClassicMiss]);
  
  const handleFireAllMissiles = useCallback(() => {
    if (gameStatus !== 'idle' || gameMode !== 'decoy' || !decoyPlayerPoint) return;
    
    setShowGraphics(true);
    setGameStatus('deploying');

    const realBase = decoyBases.find(b => b.isReal);
    if (!realBase) {
      setGameStatus('result');
      return;
    }

    setTimeout(() => {
        Sfx.playLaunch();
        const launchTime = performance.now();
        const target = getSymmetricPoint(decoyPlayerPoint);
        const isHit = Math.round(target.x) === Math.round(realBase.x) && Math.round(target.y) === Math.round(realBase.y);
        const newMissile: MissileState = {
            id: 0,
            start: decoyPlayerPoint,
            target,
            position: decoyPlayerPoint,
            angle: 0,
            explosionProgress: null,
            isHit,
            startTime: launchTime
        };
        
        setMissiles([newMissile]);
        setGameStatus('fired');
        animateMissiles([newMissile]);
    }, 1000);
  }, [gameStatus, gameMode, decoyPlayerPoint, decoyBases, getSymmetricPoint, animateMissiles]);
    
  const handleTimeout = useCallback(() => {
    if (gameStatus !== 'idle' || gameMode !== 'decoy') return;
    setGameStatus('result');
    setMissiles([]);
    Sfx.playMiss();
    setLastRoundScore(0);
    setTimer(0);
    setTimeout(handleDecoyMiss, 500);
  }, [gameStatus, gameMode, handleDecoyMiss]);


  useEffect(() => {
    if (gameMode === 'decoy' && gameStatus === 'idle' && timer > 0) {
      const interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (gameMode === 'decoy' && gameStatus === 'idle' && timer === 0) {
      if (decoyPlayerPoint) {
        handleFireAllMissiles();
      } else {
        handleTimeout();
      }
    }
  }, [gameMode, gameStatus, timer, decoyPlayerPoint, handleFireAllMissiles, handleTimeout]);

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
    
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && gameMode === 'classic' && playerTwoConfirmed && gameStatus === 'idle') {
        handleFireMissile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameMode, playerTwoConfirmed, gameStatus, handleFireMissile]);


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


  const resetCommonState = useCallback((
    isFullReset: boolean = false, 
    difficultyOverride?: Difficulty,
    axisOverride?: { axis: Axis; value: number }
  ) => {
    const activeDifficulty = difficultyOverride || difficulty;
    
    if (axisOverride) {
      setSymmetryAxis(axisOverride.axis);
      setSymmetryValue(axisOverride.value);
    } else {
      setSymmetryAxis(prevAxis => {
          const isFirstRoundOfPair = isFullReset || roundsCompletedThisTurn % 2 === 0;
          let nextAxis;
          if (isFirstRoundOfPair) {
              nextAxis = Math.random() < 0.5 ? Axis.X : Axis.Y;
          } else {
              nextAxis = prevAxis === Axis.Y ? Axis.X : Axis.Y;
          }
          
          let value;
          if (nextAxis === Axis.Y) {
              let minVal, maxVal;
              switch (activeDifficulty) {
                  case 'hard': minVal = 8; maxVal = 8; break;
                  case 'medium': minVal = 5; maxVal = 11; break;
                  case 'easy': default: minVal = 2; maxVal = 14; break;
              }
              value = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
          } else {
              let minVal, maxVal;
              switch (activeDifficulty) {
                  case 'hard': minVal = 5; maxVal = 5; break;
                  case 'medium': minVal = 3; maxVal = 7; break;
                  case 'easy': default: minVal = 1; maxVal = 9; break;
              }
              value = Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
          }
          
          setSymmetryValue(value);
          return nextAxis;
      });
    }

    setMissiles([]);
    setCounterAttack(null);
    setShowGraphics(false);
    setGameStatus('pre-start');
    setShowCounterAttackGlow(false);
    setIsResultAnimationFinished(false);

    setBasePoint(null);
    setPreviewPoint(null);
    setPlayerTwoPoint(null);
    setPlayerTwoPreviewPoint(null);
    setCorrectSymmetricPoint(null);
    setPlayerTwoConfirmed(false);
    
    setDecoyBases([]);
    setDecoyPlayerPoint(null);
    setTimer(decoyTimerDuration);
    setLastRoundScore(null);
  }, [decoyTimerDuration, difficulty, roundsCompletedThisTurn]);

  const setupClassicRound = useCallback(() => {
    setGameStatus('idle');
  }, []);
  
  const setupDecoyRound = useCallback(() => {
    let distances: number[];
    if (symmetryAxis === Axis.Y) {
        switch (difficulty) {
            case 'easy':   distances = [1, 2]; break;
            case 'medium': distances = [3, 4, 5]; break;
            case 'hard':   distances = [6, 7, 8]; break;
            default:       distances = [3, 4, 5];
        }
    } else {
        switch (difficulty) {
            case 'easy':   distances = [1]; break;
            case 'medium': distances = [2, 3]; break;
            case 'hard':   distances = [4, 5]; break;
            default:       distances = [2, 3];
        }
    }

    const tempBases: Point[] = [];
    const maxX = 16, maxY = 10;
    const MIN_DISTANCE_LAUNCHER = 4.0;
    let attempts = 0;
    
    while(tempBases.length < 1 && attempts < 200) {
      attempts++;
      
      const distance = distances[Math.floor(Math.random() * distances.length)];
      const side = Math.random() < 0.5 ? 1 : -1;
      let p: Point;

      if (symmetryAxis === Axis.Y) {
          p = { x: symmetryValue + side * distance, y: Math.floor(Math.random() * (maxY + 1)) };
      } else {
          p = { x: Math.floor(Math.random() * (maxX + 1)), y: symmetryValue + side * distance };
      }

      const isPointOnBoard = p.x >= 0 && p.x <= maxX && p.y >= 0 && p.y <= maxY;
      if (!isPointOnBoard) continue;
      
      const s = getSymmetricPoint(p);

      const isSymValid = s.x >= 0 && s.x <= maxX && s.y >= 0 && s.y <= maxY;
      if(!isSymValid) continue;

      if (getDistance(p, s) < MIN_DISTANCE_LAUNCHER) continue;

      tempBases.push(p);
    }
    
    if (tempBases.length < 1) {
      console.warn("Failed to generate a valid base for decoy mode after 200 attempts. Check settings.");
      let p: Point, s: Point, isSymValid: boolean;
      do {
        p = { x: Math.floor(Math.random() * (maxX + 1)), y: Math.floor(Math.random() * (maxY + 1)) };
        s = getSymmetricPoint(p);
        isSymValid = s.x >= 0 && s.x <= maxX && s.y >= 0 && s.y <= maxY;
      } while (!isSymValid)
      tempBases.push(p);
    }

    const finalBases = tempBases.map(p => ({ ...p, isReal: true }));
    
    setDecoyBases(finalBases);
    setGameStatus('idle');
  }, [getSymmetricPoint, difficulty, symmetryAxis, symmetryValue]);
  
  const handleStartRound = () => {
    Sfx.playClick();
    if (gameMode === 'classic') {
        setupClassicRound();
    } else {
        setupDecoyRound();
    }
  };

  const setupTutorialStep = useCallback((step: 'vertical' | 'horizontal') => {
    setTutorialStep(step);
    Sfx.playNewRound();

    if (step === 'vertical') {
        setScores(Array(6).fill(0));
        setCurrentPlayer(1);
        setRoundsCompletedThisTurn(0);
    }
    const axisOverride = step === 'vertical'
        ? { axis: Axis.Y, value: 8 }
        : { axis: Axis.X, value: 5 };
    resetCommonState(false, undefined, axisOverride);
  }, [resetCommonState]);

  const handleFullReset = useCallback((difficultyOverride?: Difficulty) => {
    Sfx.playNewRound();
    setTutorialStep('inactive');
    setScores(Array(6).fill(0));
    setCurrentPlayer(1);
    setRoundsCompletedThisTurn(0);
    resetCommonState(true, difficultyOverride);
  }, [resetCommonState]);

  const handleNextStage = useCallback(() => {
    if (tutorialStep === 'vertical') {
        setupTutorialStep('horizontal');
        return;
    }
    if (tutorialStep === 'horizontal') {
        setTutorialStep('inactive');
        handleFullReset();
        return;
    }

    Sfx.playNewRound();
    if (gameMode === 'classic') {
      setCurrentPlayer(p => (p === 1 ? 2 : 1));
    } else {
        const newRoundsCompleted = roundsCompletedThisTurn + 1;
        if (newRoundsCompleted >= roundsPerTurnDecoy) {
            setRoundsCompletedThisTurn(0);
            setCurrentPlayer(p => (p % numPlayersDecoy) + 1);
        } else {
            setRoundsCompletedThisTurn(newRoundsCompleted);
        }
    }
    resetCommonState();
  }, [resetCommonState, gameMode, roundsCompletedThisTurn, roundsPerTurnDecoy, numPlayersDecoy, tutorialStep, setupTutorialStep, handleFullReset]);


  useEffect(() => {
    if (gameMode === 'decoy') {
        setupTutorialStep('vertical');
    } else {
        handleFullReset();
    }
  }, [gameMode, setupTutorialStep, handleFullReset]); 

  const handleApplySettings = (settings: { numPlayers: number; roundsPerTurn: number; timerDuration: number; difficulty: Difficulty; showCoords: boolean; screenSize: ScreenSize; }) => {
    Sfx.playConfirm();
    setNumPlayersDecoy(settings.numPlayers);
    setRoundsPerTurnDecoy(settings.roundsPerTurn);
    setDecoyTimerDuration(settings.timerDuration);
    setDifficulty(settings.difficulty);
    setShowDecoyBaseCoords(settings.showCoords);
    setScreenSize(settings.screenSize);
    setIsSettingsOpen(false);
    handleFullReset(settings.difficulty);
    setTimer(settings.timerDuration);
  };

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

 const handleSetDecoyPoint = useCallback((point: Point | null) => {
    if (gameStatus === 'idle') {
      if(point) Sfx.playClick();
      setDecoyPlayerPoint(point);
    }
  }, [gameStatus]);

  const isHit = gameStatus === 'result' && missiles.some(m => m.isHit);
  const isResultState = gameStatus === 'result';
  
  let effectClasses = '';
  if (isResultState) {
    if (isHit) {
      effectClasses = 'flashing-effect hit-success';
    } else if (gameMode === 'classic' || (gameMode === 'decoy' && !counterAttack)) {
      effectClasses = 'flashing-effect hit-miss';
    }
  }
  if (showCounterAttackGlow) {
    effectClasses = 'flashing-effect hit-miss';
  }


  const tankDirection = basePoint && symmetryAxis === Axis.Y ? (basePoint.x < symmetryValue ? 'right' : 'left') : 'right';
  const launcherDirection = playerTwoPoint && symmetryAxis === Axis.Y ? (playerTwoPoint.x < symmetryValue ? 'right' : 'left') : 'right';
  const previewLauncherDirection = playerTwoPreviewPoint && symmetryAxis === Axis.Y ? (playerTwoPreviewPoint.x < symmetryValue ? 'right' : 'left') : 'right';

  const sizeClasses = {
    large: 'max-w-full',
    medium: 'max-w-screen-xl',
    small: 'max-w-screen-lg',
  };

  return (
    <div className={`flex flex-col h-screen bg-stone-200 dark:bg-slate-900 font-sans p-2 sm:p-4 gap-4 ${effectClasses} ${sizeClasses[screenSize]} ${screenSize !== 'large' ? 'mx-auto' : ''}`}>
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
            scores={scores}
            currentPlayer={currentPlayer}
            tutorialStep={tutorialStep}
            decoyBases={decoyBases}
            timer={timer}
            decoyPlayerPoint={decoyPlayerPoint}
            onSetDecoyPoint={handleSetDecoyPoint}
            onFireAllMissiles={handleFireAllMissiles}
            numPlayersDecoy={numPlayersDecoy}
            roundsPerTurnDecoy={roundsPerTurnDecoy}
            roundsCompletedThisTurn={roundsCompletedThisTurn}
            lastRoundScore={lastRoundScore}
            isResultAnimationFinished={isResultAnimationFinished}
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
            counterAttack={counterAttack}
            isHit={isHit}
            theme={theme}
            showGraphics={showGraphics}
            tankDirection={tankDirection}
            launcherDirection={launcherDirection}
            previewLauncherDirection={previewLauncherDirection}
            decoyBases={decoyBases}
            decoyPlayerPoint={decoyPlayerPoint}
            showDecoyBaseCoords={showDecoyBaseCoords}
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
            <button onClick={() => { Sfx.playClick(); setIsSettingsOpen(true); }} title="تنظیمات" className="p-2 rounded-full bg-indigo-100 dark:bg-slate-800 hover:bg-indigo-200 dark:hover:bg-slate-700 transition-colors text-xl">
              ⚙️
            </button>
            <button onClick={toggleMute} className="p-2 rounded-full bg-indigo-100 dark:bg-slate-800 hover:bg-indigo-200 dark:hover:bg-slate-700 transition-colors text-xl">
                {isMuted ? '🔇' : '🔊'}
            </button>
        </div>
      برای آموزش بهتر ❤️
      </footer>
      {isSettingsOpen && (
        <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            gameMode={gameMode}
            initialNumPlayers={numPlayersDecoy}
            initialRoundsPerTurn={roundsPerTurnDecoy}
            initialTimerDuration={decoyTimerDuration}
            initialDifficulty={difficulty}
            initialShowDecoyBaseCoords={showDecoyBaseCoords}
            initialScreenSize={screenSize}
            onApplySettings={handleApplySettings}
        />
      )}
    </div>
  );
};

export default App;