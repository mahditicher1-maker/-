import React, { useState, useEffect, useCallback } from 'react';
import { Axis } from './types';
import CoordinatePlane from './components/CoordinatePlane';
import ControlPanel from './components/ControlPanel';

const App: React.FC = () => {
  const [axis, setAxis] = useState<Axis>(Axis.Y);
  const [value, setValue] = useState<number>(8); // Default to 8 for Y-axis
  const [basePoint, setBasePoint] = useState<{ x: number; y: number } | null>(null);
  const [previewPoint, setPreviewPoint] = useState<{ x: number; y: number } | null>(null);
  const [playerTwoPoint, setPlayerTwoPoint] = useState<{ x: number; y: number } | null>(null);
  const [playerTwoPreviewPoint, setPlayerTwoPreviewPoint] = useState<{ x: number; y: number } | null>(null);
  const [missileTargetPoint, setMissileTargetPoint] = useState<{ x: number; y: number } | null>(null);
  const [correctSymmetricPoint, setCorrectSymmetricPoint] = useState<{ x: number; y: number } | null>(null);
  const [gameStatus, setGameStatus] = useState<'idle' | 'deploying' | 'fired' | 'result'>('idle');
  const [playerTwoConfirmed, setPlayerTwoConfirmed] = useState<boolean>(false);
  const [missilePosition, setMissilePosition] = useState<{ x: number; y: number } | null>(null);
  const [missileAngle, setMissileAngle] = useState<number>(0);
  const [explosionProgress, setExplosionProgress] = useState<number | null>(null);
  const [showGraphics, setShowGraphics] = useState<boolean>(false);

  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [currentTurn, setCurrentTurn] = useState(1);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const resetBoardForNextTurn = useCallback(() => {
    setBasePoint(null);
    setPreviewPoint(null);
    setPlayerTwoPoint(null);
    setPlayerTwoPreviewPoint(null);
    setCorrectSymmetricPoint(null);
    setGameStatus('idle');
    setPlayerTwoConfirmed(false);
    setMissilePosition(null);
    setExplosionProgress(null);
    setMissileTargetPoint(null);
    setShowGraphics(false);
  }, []);

  const handleNextStage = useCallback(() => {
    setCurrentTurn(turn => turn === 1 ? 2 : 1);
    resetBoardForNextTurn();
  }, [resetBoardForNextTurn]);
  
  const handleFullReset = useCallback(() => {
    setScore1(0);
    setScore2(0);
    setCurrentTurn(1);
    resetBoardForNextTurn();
  }, [resetBoardForNextTurn]);

  const handleAxisChange = useCallback((newAxis: Axis) => {
    setAxis(newAxis);
    // Set the fixed value based on the new axis
    const newValue = newAxis === Axis.Y ? 8 : 5;
    setValue(newValue);

    if(basePoint || previewPoint) {
        setBasePoint(null); 
        setPreviewPoint(null);
        setPlayerTwoPoint(null);
        setPlayerTwoPreviewPoint(null);
        setPlayerTwoConfirmed(false);
    }
  }, [basePoint, previewPoint]);

  const handleSetBasePointPreview = useCallback((point: { x: number; y: number } | null) => {
      if (!basePoint) {
          setPreviewPoint(point);
      }
  }, [basePoint]);
  
  const handleSetPlayerTwoPreviewPoint = useCallback((point: { x: number; y: number } | null) => {
      if (!playerTwoPoint) { // Only show preview if the point is not confirmed
          setPlayerTwoPreviewPoint(point);
      }
  }, [playerTwoPoint]);

  const handleSetBasePoint = useCallback((point: { x: number; y: number }) => {
    setBasePoint(point);
    setPreviewPoint(null);
    setPlayerTwoPoint(null);
    setPlayerTwoPreviewPoint(null);
    setCorrectSymmetricPoint(null);
    setGameStatus('idle');
    setPlayerTwoConfirmed(false);
    setMissilePosition(null);
    setExplosionProgress(null);
    setMissileTargetPoint(null);
  }, []);
  
  const handleConfirmPlayerTwoPoint = useCallback((point: { x: number; y: number }) => {
    if (!basePoint) return;
    setPlayerTwoPoint(point);
    setPlayerTwoPreviewPoint(null);
    
    const correctTarget = axis === Axis.Y
      ? { x: 2 * value - basePoint.x, y: basePoint.y }
      : { x: basePoint.x, y: 2 * value - basePoint.y };
    setCorrectSymmetricPoint(correctTarget);

    setPlayerTwoConfirmed(true);
  }, [basePoint, axis, value]);
  
  const handleFireMissile = useCallback(() => {
    if (!playerTwoPoint || !basePoint) return;
    setShowGraphics(true);
    setExplosionProgress(null);
    setGameStatus('deploying');

    setTimeout(() => {
        const target = axis === Axis.Y
          ? { x: 2 * value - playerTwoPoint.x, y: playerTwoPoint.y }
          : { x: playerTwoPoint.x, y: 2 * value - playerTwoPoint.y };
        
        setMissileTargetPoint(target);
        setMissilePosition(playerTwoPoint);
        setGameStatus('fired');

        // --- Animation logic using a Cubic Bezier curve ---
        const start = playerTwoPoint;
        const end = target;
        const duration = 2500; // ms
        const startTime = performance.now();
        
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Control points for vertical launch and landing effect
        const controlPointHeight = Math.max(2, distance / 4);

        const P0 = start;
        const P3 = end;
        // P1 is above the start point for vertical launch effect
        const P1 = { x: start.x, y: start.y + controlPointHeight };
        // P2 is above the end point for vertical landing effect
        const P2 = { x: end.x, y: end.y + controlPointHeight };

        // Bezier curve function to get position at time t
        const getCubicBezierPoint = (t: number, p0: any, p1: any, p2: any, p3: any) => {
            const u = 1 - t;
            const tt = t * t;
            const uu = u * u;
            const uuu = uu * u;
            const ttt = tt * t;

            let p = { x: 0, y: 0 };
            p.x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
            p.y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
            return p;
        };
        
        // Derivative of the Bezier curve to find the tangent (for angle)
        const getCubicBezierDerivative = (t: number, p0: any, p1: any, p2: any, p3: any) => {
            const u = 1 - t;
            const uu = u * u;
            const tt = t * t;
            
            let p = { x: 0, y: 0 };
            p.x = 3 * uu * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * tt * (p3.x - p2.x);
            p.y = 3 * uu * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * tt * (p3.y - p2.y);
            return p;
        };

        const animateMissile = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentPos = getCubicBezierPoint(progress, P0, P1, P2, P3);
            setMissilePosition(currentPos);

            // Angle calculation for trajectory using the derivative
            const derivative = getCubicBezierDerivative(progress, P0, P1, P2, P3);
            const newAngle = Math.atan2(derivative.y, derivative.x) * (180 / Math.PI);
            setMissileAngle(newAngle);
            
            if (progress < 1) {
                requestAnimationFrame(animateMissile);
            } else {
                setMissilePosition(end); // Ensure missile lands at the exact target
                setGameStatus('result');
                const isHit = Math.round(target.x) === Math.round(basePoint.x) && Math.round(target.y) === Math.round(basePoint.y);
                
                if (isHit) {
                    // Attacker is the other player
                    const attacker = currentTurn === 1 ? 2 : 1;
                    if (attacker === 1) setScore1(s => s + 1);
                    else setScore2(s => s + 1);
                }

                // Explosion animation
                const explosionDuration = 1000;
                const explosionStart = performance.now();
                const animateExplosion = (time: number) => {
                    const elapsed = time - explosionStart;
                    const progress = Math.min(elapsed / explosionDuration, 1);
                    setExplosionProgress(progress);
                    if (progress < 1) {
                        requestAnimationFrame(animateExplosion);
                    }
                };
                requestAnimationFrame(animateExplosion);
            }
        };
        requestAnimationFrame(animateMissile);
    }, 1000); // Deploy time
  }, [playerTwoPoint, basePoint, axis, value, currentTurn]);

  const isHit = gameStatus === 'result' && !!missileTargetPoint && !!basePoint &&
    Math.round(missileTargetPoint.x) === basePoint.x &&
    Math.round(missileTargetPoint.y) === basePoint.y;

  // For Y-axis symmetry, the tank's direction depends on which side of the symmetry line it is.
  // We assume 'right' is the default direction for X-axis symmetry.
  const tankDirection = basePoint && axis === Axis.Y ? (basePoint.x < value ? 'right' : 'left') : 'right';
  const launcherDirection = playerTwoPoint && axis === Axis.Y ? (playerTwoPoint.x < value ? 'right' : 'left') : 'right';
  const previewLauncherDirection = playerTwoPreviewPoint && axis === Axis.Y ? (playerTwoPreviewPoint.x < value ? 'right' : 'left') : 'right';


  const isResultState = gameStatus === 'result';
  const effectClasses = isResultState 
    ? `flashing-effect ${isHit ? 'hit-success' : 'hit-miss'}` 
    : '';

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
            axis={axis}
            value={value}
            onAxisChange={handleAxisChange}
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
            score1={score1}
            score2={score2}
            currentTurn={currentTurn}
          />
        </div>
        <div className="flex-grow min-w-0">
          <CoordinatePlane
            symmetryAxis={axis}
            symmetryValue={value}
            basePoint={basePoint}
            previewPoint={previewPoint}
            playerTwoPoint={playerTwoPoint}
            playerTwoPreviewPoint={playerTwoPreviewPoint}
            missileTargetPoint={missileTargetPoint}
            correctSymmetricPoint={correctSymmetricPoint}
            gameStatus={gameStatus}
            missilePosition={missilePosition}
            missileAngle={missileAngle}
            explosionProgress={explosionProgress}
            isHit={isHit}
            theme={theme}
            showGraphics={showGraphics}
            tankDirection={tankDirection}
            launcherDirection={launcherDirection}
            previewLauncherDirection={previewLauncherDirection}
          />
        </div>
      </main>

       <footer className="text-center text-sm text-slate-500 dark:text-slate-400 p-2 flex-shrink-0">
        <button onClick={toggleTheme} className="absolute top-4 right-4 p-2 rounded-full bg-indigo-100 dark:bg-slate-800 hover:bg-indigo-200 dark:hover:bg-slate-700 transition-colors">
            {theme === 'light' ? '🌙' : '☀️'}
        </button>
      برای آموزش بهتر ❤️
      </footer>
    </div>
  );
};

export default App;