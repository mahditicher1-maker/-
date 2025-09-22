import React, { useState, useEffect } from 'react';
import { Axis } from '../types';

interface ControlPanelProps {
  axis: Axis;
  value: number;
  onAxisChange: (axis: Axis) => void;
  basePoint: { x: number; y: number } | null;
  onSetBasePoint: (point: { x: number; y: number }) => void;
  onSetBasePointPreview: (point: { x: number; y: number } | null) => void;
  onSetPlayerTwoPreviewPoint: (point: { x: number; y: number } | null) => void;
  playerTwoConfirmed: boolean;
  onConfirmPlayerTwoPoint: (point: { x: number; y: number }) => void;
  gameStatus: 'idle' | 'deploying' | 'fired' | 'result';
  isHit: boolean;
  onFireMissile: () => void;
  onResetGame: () => void;
  onFullReset: () => void;
  score1: number;
  score2: number;
  currentTurn: number;
}

const toEnglishDigits = (s: string): string => {
  if (!s) return '';
  const persianDigits = /[\u06F0-\u06F9]/g;
  const arabicDigits = /[\u0660-\u0669]/g;
  return s
    .replace(persianDigits, (d) => String(d.charCodeAt(0) - 1776))
    .replace(arabicDigits, (d) => String(d.charCodeAt(0) - 1632));
};

const toPersianDigits = (n: number | string): string => {
    if (n === '' || n === null || n === undefined) return '';
    const numStr = String(n);
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return numStr.replace(/[0-9]/g, (d) => persianDigits[parseInt(d)]);
};

const sanitizeIntegerInput = (input: string): string => {
    if (input === null || input === undefined) return '';
    const englishVal = toEnglishDigits(String(input));
    return englishVal.replace(/[^0-9]/g, '');
};


const ControlPanel: React.FC<ControlPanelProps> = ({
  axis,
  value,
  onAxisChange,
  basePoint,
  onSetBasePoint,
  onSetBasePointPreview,
  onSetPlayerTwoPreviewPoint,
  playerTwoConfirmed,
  onConfirmPlayerTwoPoint,
  gameStatus,
  isHit,
  onFireMissile,
  onResetGame,
  onFullReset,
  score1,
  score2,
  currentTurn,
}) => {
  const [p1x, setP1x] = useState('');
  const [p1y, setP1y] = useState('');
  const [p2x, setP2x] = useState('');
  const [p2y, setP2y] = useState('');
  const [clampingWarning, setClampingWarning] = useState<string | null>(null);
  
  const isInteractionDisabled = gameStatus === 'deploying' || gameStatus === 'fired' || gameStatus === 'result';
  const p1Disabled = basePoint !== null || isInteractionDisabled;
  const p2Disabled = !basePoint || playerTwoConfirmed || gameStatus !== 'idle' || isInteractionDisabled;
  
  useEffect(() => {
    if (basePoint === null) {
      setP1x('');
      setP1y('');
    }
    setP2x('');
    setP2y('');
  }, [basePoint, currentTurn]);

  useEffect(() => {
    if (p1x.trim() !== '' && p1y.trim() !== '') {
        const xNum = parseInt(p1x, 10);
        const yNum = parseInt(p1y, 10);
        if (!isNaN(xNum) && !isNaN(yNum)) {
            onSetBasePointPreview({ x: xNum, y: yNum });
        }
    } else {
        onSetBasePointPreview(null);
    }
  }, [p1x, p1y, onSetBasePointPreview]);

   useEffect(() => {
    if (p2x.trim() !== '' && p2y.trim() !== '') {
        const xNum = parseInt(p2x, 10);
        const yNum = parseInt(p2y, 10);
        if (!isNaN(xNum) && !isNaN(yNum)) {
            onSetPlayerTwoPreviewPoint({ x: xNum, y: yNum });
        }
    } else {
        onSetPlayerTwoPreviewPoint(null);
    }
  }, [p2x, p2y, onSetPlayerTwoPreviewPoint]);

  useEffect(() => {
    if (clampingWarning) {
        const timer = setTimeout(() => {
            setClampingWarning(null);
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [clampingWarning]);

  // Clear warning on turn change
  useEffect(() => {
    setClampingWarning(null);
  }, [currentTurn, axis]);

  const updateAndSetP1x = (val: string) => {
    const sanitized = sanitizeIntegerInput(val);
    if (sanitized === '') {
        setP1x('');
        return;
    }

    let num = parseInt(sanitized, 10);
    const originalNum = num;
    const maxXCoord = 16;

    if (axis === Axis.Y) {
        // Symmetric point must be within [0, 16] -> 0 <= 2*value - x <= 16
        const minX = Math.max(0, 2 * value - maxXCoord);
        const maxX = Math.min(maxXCoord, 2 * value);
        num = Math.max(minX, Math.min(maxX, num));
        if (num !== originalNum) {
             setClampingWarning(`مقدار طول به ${toPersianDigits(num)} تغییر یافت تا هدف در نقشه بماند.`);
        } else {
             setClampingWarning(null);
        }
    } else {
        // No symmetry constraint on X, just map boundary
        num = Math.max(0, Math.min(maxXCoord, num));
         if (num !== originalNum) {
            setClampingWarning(`مقدار طول به ${toPersianDigits(num)} تغییر یافت تا در نقشه بماند.`);
        } else {
            setClampingWarning(null);
        }
    }
    setP1x(String(num));
  };
  
  const handleP1xChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAndSetP1x(e.target.value);
  };
  
  const updateAndSetP1y = (val: string) => {
    const sanitized = sanitizeIntegerInput(val);
     if (sanitized === '') {
        setP1y('');
        return;
    }
    let num = parseInt(sanitized, 10);
    const originalNum = num;
    const maxYCoord = 10;
    
    if (axis === Axis.X) {
        // Symmetric point must be within [0, 10] -> 0 <= 2*value - y <= 10
        const minY = Math.max(0, 2 * value - maxYCoord);
        const maxY = Math.min(maxYCoord, 2 * value);
        num = Math.max(minY, Math.min(maxY, num));
        if (num !== originalNum) {
            setClampingWarning(`مقدار عرض به ${toPersianDigits(num)} تغییر یافت تا هدف در نقشه بماند.`);
        } else {
            setClampingWarning(null);
        }
    } else {
         // No symmetry constraint on Y, just map boundary
        num = Math.max(0, Math.min(maxYCoord, num));
        if (num !== originalNum) {
            setClampingWarning(`مقدار عرض به ${toPersianDigits(num)} تغییر یافت تا در نقشه بماند.`);
        } else {
            setClampingWarning(null);
        }
    }
    setP1y(String(num));
  };

  const handleP1yChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateAndSetP1y(e.target.value);
  };

  const handleP1Submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (p1x.trim() === '' || p1y.trim() === '') {
        return;
    }

    const xNum = parseInt(p1x, 10);
    const yNum = parseInt(p1y, 10);
    
    onSetBasePoint({ x: xNum, y: yNum });
  };

  const handleP2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (p2x.trim() === '' || p2y.trim() === '') {
        return;
    }
    const xNum = parseInt(p2x, 10);
    const yNum = parseInt(p2y, 10);
    if (!isNaN(xNum) && !isNaN(yNum) && xNum >= 0 && xNum <= 16 && yNum >= 0 && yNum <= 10) {
      onConfirmPlayerTwoPoint({ x: xNum, y: yNum });
    }
  };
  
  const handleP2CoordChange = (coord: 'x' | 'y', value: string) => {
      const setter = coord === 'x' ? setP2x : setP2y;
      const maxVal = coord === 'x' ? 16 : 10;
      
      const sanitized = sanitizeIntegerInput(value);
      if (sanitized === '') {
          setter('');
          return;
      }
      let num = parseInt(sanitized, 10);
      num = Math.max(0, Math.min(maxVal, num));
      setter(String(num));
  };

  let turnStatusText = '';
  if (gameStatus === 'deploying') {
    turnStatusText = 'در حال استقرار یگان‌ها...';
  } else if (gameStatus === 'fired') {
    turnStatusText = 'دیده بان در حال شلیک...';
  } else if (gameStatus === 'result') {
    turnStatusText = 'مرحله پایان یافت';
  } else if (!basePoint) {
    turnStatusText = 'نوبت پایگاه: تنظیم موقعیت';
  } else {
    turnStatusText = 'نوبت دیده بان: تنظیم هدف';
  }
  
  const controlButtonClasses = "w-8 h-8 flex items-center justify-center bg-slate-300 dark:bg-slate-700 rounded-md hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors text-xl font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg border border-stone-500/40 dark:border-green-500/50 shadow-lg w-full shadow-stone-500/20 dark:shadow-green-500/20 flex flex-col gap-2 transition-colors h-full overflow-y-auto">
      
      {/* --- Battle Status --- */}
      <div className="text-center bg-slate-300/50 dark:bg-slate-900/50 p-3 rounded-md">
        <h2 className="text-xl font-bold text-stone-800 dark:text-green-400 font-orbitron uppercase tracking-wider mb-1 transition-colors">وضعیت نبرد</h2>
        <div className="flex justify-around text-lg">
            <p className="text-stone-900 dark:text-slate-300">امتیاز گروه ۱: <span className="font-bold text-stone-700 dark:text-green-300 font-mono transition-colors">{toPersianDigits(score1)}</span></p>
            <p className="text-stone-900 dark:text-slate-300">امتیاز گروه ۲: <span className="font-bold text-stone-700 dark:text-green-300 font-mono transition-colors">{toPersianDigits(score2)}</span></p>
        </div>
        <p className="mt-2 text-yellow-600 dark:text-yellow-400 animate-pulse h-6 text-base transition-colors">{turnStatusText}</p>
      </div>

      {/* --- Symmetry Controls --- */}
      <div>
        <h3 className="text-lg font-bold text-stone-800 dark:text-green-400 mb-2 text-center font-orbitron uppercase tracking-wider transition-colors">محور تقارن</h3>
        <div className="space-y-2">
          <div className="flex justify-around items-center bg-slate-300/50 dark:bg-slate-900/50 p-1 rounded-md transition-colors">
            <label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-stone-500/10 dark:hover:bg-green-500/10 w-1/2 justify-center text-base">
              <input type="radio" name="axis" value={Axis.Y} checked={axis === Axis.Y} onChange={() => onAxisChange(Axis.Y)} className="h-4 w-4 accent-indigo-600 dark:accent-green-500 bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-green-500" disabled={isInteractionDisabled}/>
              <span className="text-slate-800 dark:text-slate-300">محور طول</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-stone-500/10 dark:hover:bg-green-500/10 w-1/2 justify-center text-base">
              <input type="radio" name="axis" value={Axis.X} checked={axis === Axis.X} onChange={() => onAxisChange(Axis.X)} className="h-4 w-4 accent-indigo-600 dark:accent-green-500 bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-600 focus:ring-indigo-500 dark:focus:ring-green-500" disabled={isInteractionDisabled}/>
              <span className="text-slate-800 dark:text-slate-300">محور عرض</span>
            </label>
          </div>
        </div>
      </div>

      <hr className="border-stone-500/20 dark:border-green-500/20 transition-colors" />

      {/* --- Player 1 Input --- */}
      <div className={`transition-opacity ${p1Disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <h3 className="text-lg font-bold text-stone-800 dark:text-green-400 mb-2 text-center font-orbitron uppercase tracking-wider transition-colors">پایگاه</h3>
        <form onSubmit={handleP1Submit} className="space-y-2">
            <div className="flex items-center gap-2">
              <label htmlFor="x-coord" className="text-base font-medium text-slate-600 dark:text-slate-300 w-28 transition-colors">مختصات طول:</label>
              <div className="flex-grow flex items-center gap-1">
                <button type="button" onClick={() => updateAndSetP1x(String(parseInt(p1x || '0', 10) - 1))} className={controlButtonClasses} disabled={p1Disabled}>-</button>
                <input id="x-coord" type="text" inputMode="numeric" value={toPersianDigits(p1x)} onChange={handleP1xChange}
                    className="block w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-2xl disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۵" required disabled={p1Disabled}/>
                <button type="button" onClick={() => updateAndSetP1x(String(parseInt(p1x || '0', 10) + 1))} className={controlButtonClasses} disabled={p1Disabled}>+</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="y-coord" className="text-base font-medium text-slate-600 dark:text-slate-300 w-28 transition-colors">مختصات عرض:</label>
              <div className="flex-grow flex items-center gap-1">
                <button type="button" onClick={() => updateAndSetP1y(String(parseInt(p1y || '0', 10) - 1))} className={controlButtonClasses} disabled={p1Disabled}>-</button>
                <input id="y-coord" type="text" inputMode="numeric" value={toPersianDigits(p1y)} onChange={handleP1yChange}
                    className="block w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-2xl disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۱۰" required disabled={p1Disabled}/>
                <button type="button" onClick={() => updateAndSetP1y(String(parseInt(p1y || '0', 10) + 1))} className={controlButtonClasses} disabled={p1Disabled}>+</button>
              </div>
            </div>
            <div className="h-5 text-sm text-center text-yellow-600 dark:text-yellow-400 transition-opacity duration-300">
              {clampingWarning}
            </div>
            <button type="submit" className="w-full bg-indigo-600 dark:bg-green-600 text-white dark:text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-indigo-500 dark:hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-800 focus:ring-indigo-500 dark:focus:ring-green-500 transition-colors uppercase tracking-wider text-base disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed" disabled={p1Disabled}>
            تأیید پایگاه
            </button>
        </form>
      </div>

      <hr className="border-stone-500/20 dark:border-green-500/20 transition-colors" />

      {/* --- Player 2 Input --- */}
      <div className={`transition-opacity ${p2Disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <h3 className="text-lg font-bold text-stone-800 dark:text-green-400 mb-2 text-center font-orbitron uppercase tracking-wider transition-colors">دیده بان</h3>
        <form onSubmit={handleP2Submit} className="space-y-2">
            <div className="flex items-center gap-2">
                <label htmlFor="p2-x-coord" className="text-base font-medium text-slate-600 dark:text-slate-300 w-28 transition-colors">طول هدف:</label>
                 <div className="flex-grow flex items-center gap-1">
                    <button type="button" onClick={() => handleP2CoordChange('x', String(parseInt(p2x || '0', 10) - 1))} className={controlButtonClasses} disabled={p2Disabled || (p2x !== '' && parseInt(p2x, 10) <= 0)}>-</button>
                    <input id="p2-x-coord" type="text" inputMode="numeric" value={toPersianDigits(p2x)} onChange={(e) => handleP2CoordChange('x', e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-2xl disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۷" required disabled={p2Disabled}/>
                    <button type="button" onClick={() => handleP2CoordChange('x', String(parseInt(p2x || '0', 10) + 1))} className={controlButtonClasses} disabled={p2Disabled || (p2x !== '' && parseInt(p2x, 10) >= 16)}>+</button>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="p2-y-coord" className="text-base font-medium text-slate-600 dark:text-slate-300 w-28 transition-colors">عرض هدف:</label>
                <div className="flex-grow flex items-center gap-1">
                    <button type="button" onClick={() => handleP2CoordChange('y', String(parseInt(p2y || '0', 10) - 1))} className={controlButtonClasses} disabled={p2Disabled || (p2y !== '' && parseInt(p2y, 10) <= 0)}>-</button>
                    <input id="p2-y-coord" type="text" inputMode="numeric" value={toPersianDigits(p2y)} onChange={(e) => handleP2CoordChange('y', e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-2xl disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۱۰" required disabled={p2Disabled}/>
                    <button type="button" onClick={() => handleP2CoordChange('y', String(parseInt(p2y || '0', 10) + 1))} className={controlButtonClasses} disabled={p2Disabled || (p2y !== '' && parseInt(p2y, 10) >= 10)}>+</button>
                </div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 dark:bg-green-600 text-white dark:text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-indigo-500 dark:hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-800 focus:ring-indigo-500 dark:focus:ring-green-500 transition-colors uppercase tracking-wider text-base disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed" disabled={p2Disabled}>
            تأیید هدف
            </button>
        </form>
      </div>

      {/* --- Actions & Results --- */}
      <div className="min-h-[6rem] flex flex-col items-center justify-center gap-2">
        {playerTwoConfirmed && gameStatus === 'idle' && (
          <button onClick={onFireMissile} className="w-full bg-red-600 text-white font-bold py-2 px-6 rounded-md border border-red-400 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-900 focus:ring-red-500 transition-all duration-300 text-lg uppercase tracking-wider font-orbitron shadow-[0_0_15px_rgba(239,68,68,0.6)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)]">
            شلیک موشک 🚀
          </button>
        )}

        {gameStatus === 'deploying' && (
           <div className="text-center">
             <p className="text-yellow-600 dark:text-yellow-400 font-orbitron animate-pulse text-xl transition-colors">...در حال استقرار یگان‌ها</p>
           </div>
        )}

        {gameStatus === 'fired' && (
          <div className="text-center">
            <p className="text-yellow-600 dark:text-yellow-400 font-orbitron animate-pulse text-xl transition-colors">...در حال شلیک</p>
          </div>
        )}
        
        {gameStatus === 'result' && (
          <div className="text-center w-full flex flex-col items-center gap-1">
            {isHit ? (
              <p className="text-xl font-bold text-green-600 dark:text-green-400 font-orbitron animate-pulse transition-colors">برخورد موفقیت آمیز بود</p>
            ) : (
              <p className="text-xl font-bold text-red-600 dark:text-red-500 font-orbitron transition-colors">موشک به هدف برخورد نکرد</p>
            )}
            <div className="flex gap-2 mt-2 w-full">
              <button onClick={onResetGame} className="w-1/2 bg-yellow-500 dark:bg-yellow-600 text-white font-bold py-2 px-3 rounded-md hover:bg-yellow-400 dark:hover:bg-yellow-500 transition-colors text-sm">
                مرحله بعد
              </button>
              <button onClick={onFullReset} className="w-1/2 bg-indigo-400 dark:bg-slate-600 text-white dark:text-slate-200 font-bold py-2 px-3 rounded-md hover:bg-indigo-300 dark:hover:bg-slate-500 transition-colors text-sm">
                شروع مجدد
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;