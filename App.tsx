import React, { useState, useEffect } from 'react';
import { Axis } from './types';
import CoordinatePlane from './components/CoordinatePlane';
import ControlPanel from './components/ControlPanel';

const App: React.FC = () => {
  const [axis, setAxis] = useState<Axis>(Axis.Y);
  const [value, setValue] = useState<number>(10);
  const [basePoint, setBasePoint] = useState<{ x: number; y: number } | null>(null);
  const [playerTwoPoint, setPlayerTwoPoint] = useState<{ x: number; y: number } | null>(null);
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
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

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

  const resetBoardForNextTurn = () => {
    setBasePoint(null);
    setPlayerTwoPoint(null);
    setCorrectSymmetricPoint(null);
    setGameStatus('idle');
    setPlayerTwoConfirmed(false);
    setMissilePosition(null);
    setExplosionProgress(null);
    setMissileTargetPoint(null);
    setShowGraphics(false);
  };

  const handleNextStage = () => {
    setCurrentTurn(turn => turn === 1 ? 2 : 1);
    resetBoardForNextTurn();
  };
  
  const handleFullReset = () => {
    setScore1(0);
    setScore2(0);
    setCurrentTurn(1);
    resetBoardForNextTurn();
  }

  const handleAxisChange = (newAxis: Axis) => {
    setAxis(newAxis);
    if(basePoint) {
        setBasePoint(null); 
        setPlayerTwoPoint(null);
        setPlayerTwoConfirmed(false);
    }
  };

  const handleValueChange = (newValue: number) => {
    if(basePoint) {
        setBasePoint(null);
        setPlayerTwoPoint(null);
        setPlayerTwoConfirmed(false);
    }
    
    if (isNaN(newValue)) {
        setValue(1);
        return;
    }
    
    const clampedValue = Math.max(1, Math.min(19, newValue));
    setValue(clampedValue);
  };

  const handleSetBasePoint = (point: { x: number; y: number }) => {
    setBasePoint(point);
    setPlayerTwoPoint(null);
    setCorrectSymmetricPoint(null);
    setGameStatus('idle');
    setPlayerTwoConfirmed(false);
    setMissilePosition(null);
    setExplosionProgress(null);
    setMissileTargetPoint(null);
  };
  
  const handleConfirmPlayerTwoPoint = (point: { x: number; y: number }) => {
    if (!basePoint) return;
    
    setPlayerTwoPoint(point);
    
    const correctTarget = axis === Axis.Y
      ? { x: 2 * value - basePoint.x, y: basePoint.y }
      : { x: basePoint.x, y: 2 * value - basePoint.y };
    setCorrectSymmetricPoint(correctTarget);

    setPlayerTwoConfirmed(true);
  };
  
  const handleFireMissile = () => {
    if (!playerTwoPoint) return;
    setExplosionProgress(null);
    setShowGraphics(true);
    setGameStatus('deploying');

    setTimeout(() => {
        const target = axis === Axis.Y
          ? { x: 2 * value - playerTwoPoint.x, y: playerTwoPoint.y }
          : { x: playerTwoPoint.x, y: 2 * value - playerTwoPoint.y };
        setMissileTargetPoint(target);
        setGameStatus('fired');
    }, 5000);
  };

  // --- Smart Direction Logic ---
  const tankDirection = basePoint && basePoint.x > 10 ? 'left' : 'right';
  
  let launcherDirection: 'left' | 'right' = 'right'; // Default direction
  if (playerTwoPoint) {
    if (axis === Axis.Y) { // Vertical symmetry line
      // Face towards the symmetry line
      launcherDirection = playerTwoPoint.x < value ? 'right' : 'left';
    } else { // Horizontal symmetry line
      // Face towards the center of the map
      launcherDirection = playerTwoPoint.x > 10 ? 'left' : 'right';
    }
  }
  
  useEffect(() => {
    if (gameStatus === 'fired' && playerTwoPoint && missileTargetPoint) {
      const startPointOffsetX = launcherDirection === 'left' ? -0.4 : 0.4;
      const startPointOffsetY = -0.4; // Tip of the launcher is slightly above the center
      const startPoint = { x: playerTwoPoint.x + startPointOffsetX, y: playerTwoPoint.y + startPointOffsetY };

      let animationFrameId: number;
      const duration = 2000;
      const startTime = performance.now();
      
      const distance = Math.sqrt(
          Math.pow(missileTargetPoint.x - startPoint.x, 2) +
          Math.pow(missileTargetPoint.y - startPoint.y, 2)
      );

      const arcHeight = Math.max(8, distance / 2); 
      const arcYScalar = 1; // Positive for downward trajectory
      const arcXScalar = 0;

      const isMovingRight = missileTargetPoint.x > startPoint.x;

      const animate = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        const linearX = startPoint.x + (missileTargetPoint.x - startPoint.x) * progress;
        const linearY = startPoint.y + (missileTargetPoint.y - startPoint.y) * progress;
        
        const arcDisplacement = arcHeight * Math.sin(progress * Math.PI);
        const currentX = linearX + arcXScalar * arcDisplacement;
        const currentY = linearY + arcYScalar * arcDisplacement;
        
        // Dynamic Scripted rotation: Up -> (Left or Right) -> Down
        const startAngle = -90; // Up
        const midAngle = isMovingRight ? 0 : -180;  // Right or Left
        const endAngle = isMovingRight ? 90 : -270;   // Down

        let angleDeg;
        if (progress < 0.5) {
          // Animate from Up to Midpoint
          const halfProgress = progress * 2;
          angleDeg = startAngle + (midAngle - startAngle) * halfProgress;
        } else {
          // Animate from Midpoint to Down
          const halfProgress = (progress - 0.5) * 2;
          angleDeg = midAngle + (endAngle - midAngle) * halfProgress;
        }
        
        setMissileAngle(angleDeg);
        setMissilePosition({ x: currentX, y: currentY });

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          setMissilePosition(null);
          setGameStatus('result');
        }
      };

      animationFrameId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animationFrameId);
        setMissilePosition(null);
      };
    }
  }, [gameStatus, missileTargetPoint, playerTwoPoint, axis, value, launcherDirection]);

  useEffect(() => {
    if (gameStatus === 'result') {
      const wasHit = missileTargetPoint && basePoint &&
        Math.abs(missileTargetPoint.x - basePoint.x) < 0.01 &&
        Math.abs(missileTargetPoint.y - basePoint.y) < 0.01;

      if (wasHit) {
        const attacker = currentTurn === 1 ? 2 : 1;
        if (attacker === 1) {
          setScore1(s => s + 1);
        } else {
          setScore2(s => s + 1);
        }
      }

      let animationFrameId: number;
      const duration = 800;
      const startTime = performance.now();

      const animateExplosion = (currentTime: number) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        setExplosionProgress(progress);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animateExplosion);
        }
      };
      
      animationFrameId = requestAnimationFrame(animateExplosion);

      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [gameStatus, basePoint, missileTargetPoint, currentTurn]);

  const isHit = missileTargetPoint && basePoint &&
    Math.abs(missileTargetPoint.x - basePoint.x) < 0.01 &&
    Math.abs(missileTargetPoint.y - basePoint.y) < 0.01;

  const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
    </svg>
  );

  const MoonIcon = () => (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
  );

  return (
    <div className="min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto">
        <header className="text-center mb-8 relative">
          <div className="absolute top-0 right-0">
            <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-stone-500 dark:focus:ring-green-500 transition-colors">
              {theme === 'light' ? <MoonIcon /> : <SunIcon />}
            </button>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 dark:text-green-400 font-orbitron tracking-widest uppercase transition-colors">
            نبرد تقارن
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-2xl mx-auto transition-colors">
            گروه‌ها به نوبت پایگاه خود را مشخص می‌کنند. گروه دیگر باید نقطه متقارن را برای هدف‌گیری و کسب امتیاز پیدا کند.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 w-full">
            <ControlPanel
              axis={axis}
              value={value}
              onAxisChange={handleAxisChange}
              onValueChange={handleValueChange}
              basePoint={basePoint}
              onSetBasePoint={handleSetBasePoint}
              playerTwoConfirmed={playerTwoConfirmed}
              onConfirmPlayerTwoPoint={handleConfirmPlayerTwoPoint}
              gameStatus={gameStatus}
              isHit={!!isHit}
              onFireMissile={handleFireMissile}
              onResetGame={handleNextStage}
              onFullReset={handleFullReset}
              score1={score1}
              score2={score2}
              currentTurn={currentTurn}
            />
          </div>
          <div className="lg:col-span-2 w-full">
             <CoordinatePlane 
                symmetryAxis={axis} 
                symmetryValue={value} 
                basePoint={basePoint}
                playerTwoPoint={playerTwoPoint}
                missileTargetPoint={missileTargetPoint}
                correctSymmetricPoint={correctSymmetricPoint}
                missilePosition={missilePosition}
                missileAngle={missileAngle}
                explosionProgress={explosionProgress}
                gameStatus={gameStatus}
                isHit={!!isHit}
                theme={theme}
                showGraphics={showGraphics}
                tankDirection={tankDirection}
                launcherDirection={launcherDirection}
              />
          </div>
        </main>
        
        <footer className="text-center mt-12 text-sm text-slate-500 dark:text-slate-500 transition-colors">
            <p>ترمینال نبرد تقارن</p>
        </footer>
      </div>
    </div>
  );
};

export default App;