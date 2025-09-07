import React, { useState, useEffect } from 'react';
import { Axis } from '../types';

interface ControlPanelProps {
  axis: Axis;
  value: number;
  onAxisChange: (axis: Axis) => void;
  onValueChange: (value: number) => void;
  basePoint: { x: number; y: number } | null;
  onSetBasePoint: (point: { x: number; y: number }) => void;
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
  onValueChange,
  basePoint,
  onSetBasePoint,
  playerTwoConfirmed,
  onConfirmPlayerTwoPoint,
  gameStatus,
  isHit,
  onFireMissile,
  onResetGame,
  onFullReset,
  score1,
  score2,
  currentTurn
}) => {
  const [p1x, setP1x] = useState('');
  const [p1y, setP1y] = useState('');
  const [p2x, setP2x] = useState('');
  const [p2y, setP2y] = useState('');
  const [clampingWarning, setClampingWarning] = useState<string | null>(null);
  
  const defender = currentTurn;
  const attacker = currentTurn === 1 ? 2 : 1;

  const p1Disabled = basePoint !== null;
  const p2Disabled = !basePoint || playerTwoConfirmed || gameStatus !== 'idle';
  
  useEffect(() => {
    if (basePoint === null) {
      setP1x('');
      setP1y('');
    }
    setP2x('');
    setP2y('');
  }, [basePoint, currentTurn]);

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

  const handleP1xChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeIntegerInput(e.target.value);
    if (sanitized === '') {
        setP1x('');
        return;
    }

    let num = parseInt(sanitized, 10);
    const originalNum = num;

    if (axis === Axis.Y) {
        // Symmetric point must be within [0, 20] -> 0 <= 2*value - x <= 20
        const minX = Math.max(0, 2 * value - 20);
        const maxX = Math.min(20, 2 * value);
        num = Math.max(minX, Math.min(maxX, num));
        if (num !== originalNum) {
             setClampingWarning(`مقدار طول به ${toPersianDigits(num)} تغییر یافت تا هدف در نقشه بماند.`);
        }
    } else {
        // No symmetry constraint on X, just map boundary
        num = Math.max(0, Math.min(20, num));
         if (num !== originalNum) {
            setClampingWarning(`مقدار طول به ${toPersianDigits(num)} تغییر یافت تا در نقشه بماند.`);
        }
    }

    setP1x(String(num));
  };
  
  const handleP1yChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeIntegerInput(e.target.value);
     if (sanitized === '') {
        setP1y('');
        return;
    }
    let num = parseInt(sanitized, 10);
    const originalNum = num;
    
    if (axis === Axis.X) {
        // Symmetric point must be within [0, 20] -> 0 <= 2*value - y <= 20
        const minY = Math.max(0, 2 * value - 20);
        const maxY = Math.min(20, 2 * value);
        num = Math.max(minY, Math.min(maxY, num));
        if (num !== originalNum) {
            setClampingWarning(`مقدار عرض به ${toPersianDigits(num)} تغییر یافت تا هدف در نقشه بماند.`);
        }
    } else {
         // No symmetry constraint on Y, just map boundary
        num = Math.max(0, Math.min(20, num));
        if (num !== originalNum) {
            setClampingWarning(`مقدار عرض به ${toPersianDigits(num)} تغییر یافت تا در نقشه بماند.`);
        }
    }
    setP1y(String(num));
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
    const xNum = parseInt(p2x, 10);
    const yNum = parseInt(p2y, 10);
    if (!isNaN(xNum) && !isNaN(yNum) && xNum >= 0 && xNum <= 20 && yNum >= 0 && yNum <= 20) {
      onConfirmPlayerTwoPoint({ x: xNum, y: yNum });
    }
  };

  const handleValueInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeIntegerInput(e.target.value);
    const num = parseInt(sanitized, 10);
    onValueChange(num);
  };

  let turnStatusText = '';
  if (gameStatus === 'deploying') {
    turnStatusText = 'در حال استقرار یگان‌ها...';
  } else if (gameStatus === 'fired') {
    turnStatusText = `گروه ${toPersianDigits(attacker)} در حال شلیک...`;
  } else if (gameStatus === 'result') {
    turnStatusText = 'مرحله پایان یافت';
  } else if (!basePoint) {
    turnStatusText = `نوبت گروه ${toPersianDigits(defender)}: تنظیم پایگاه`;
  } else {
    turnStatusText = `نوبت گروه ${toPersianDigits(attacker)}: شلیک`;
  }

  return (
    <div className="bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg border border-stone-500/30 dark:border-green-500/30 shadow-lg w-full max-w-sm mx-auto shadow-stone-500/10 dark:shadow-green-500/10 flex flex-col gap-2 transition-colors">
      
      {/* --- Battle Status --- */}
      <div className="text-center bg-slate-300/50 dark:bg-slate-900/50 p-2 rounded-md">
        <h2 className="text-lg font-bold text-stone-800 dark:text-green-400 font-orbitron uppercase tracking-wider mb-1 transition-colors">وضعیت نبرد</h2>
        <div className="flex justify-around text-base">
            <p className="text-stone-900 dark:text-slate-300">امتیاز گروه ۱: <span className="font-bold text-stone-700 dark:text-green-300 font-mono transition-colors">{toPersianDigits(score1)}</span></p>
            <p className="text-stone-900 dark:text-slate-300">امتیاز گروه ۲: <span className="font-bold text-stone-700 dark:text-green-300 font-mono transition-colors">{toPersianDigits(score2)}</span></p>
        </div>
        <p className="mt-1 text-yellow-600 dark:text-yellow-400 animate-pulse h-5 text-sm transition-colors">{turnStatusText}</p>
      </div>

      {/* --- Symmetry Controls --- */}
      <div>
        <h3 className="text-md font-bold text-stone-800 dark:text-green-400 mb-1 text-center font-orbitron uppercase tracking-wider transition-colors">محور تقارن</h3>
        <div className="space-y-2">
          <div className="flex justify-around items-center bg-slate-300/50 dark:bg-slate-900/50 p-1 rounded-md transition-colors">
            <label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-stone-500/10 dark:hover:bg-green-500/10 w-1/2 justify-center text-sm">
              <input type="radio" name="axis" value={Axis.Y} checked={axis === Axis.Y} onChange={() => onAxisChange(Axis.Y)} className="h-4 w-4 accent-stone-600 dark:accent-green-500 bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-600 focus:ring-stone-500 dark:focus:ring-green-500"/>
              <span className="text-slate-800 dark:text-slate-300">محور طول</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-stone-500/10 dark:hover:bg-green-500/10 w-1/2 justify-center text-sm">
              <input type="radio" name="axis" value={Axis.X} checked={axis === Axis.X} onChange={() => onAxisChange(Axis.X)} className="h-4 w-4 accent-stone-600 dark:accent-green-500 bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-600 focus:ring-stone-500 dark:focus:ring-green-500"/>
              <span className="text-slate-800 dark:text-slate-300">محور عرض</span>
            </label>
          </div>
          <input id="value-input" type="text" inputMode="numeric" min="1" max="19" value={toPersianDigits(value)} onChange={handleValueInputChange}
            className="block w-full px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md text-sm shadow-sm focus:outline-none focus:border-stone-500 dark:focus:border-green-500 focus:ring-1 focus:ring-stone-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-base transition-colors"
            placeholder="مقدار بین ۱ تا ۱۹"
          />
        </div>
      </div>

      <hr className="border-stone-500/20 dark:border-green-500/20 transition-colors" />

      {/* --- Player 1 Input --- */}
      <div className={`transition-opacity ${p1Disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <h3 className="text-md font-bold text-stone-800 dark:text-green-400 mb-1 text-center font-orbitron uppercase tracking-wider transition-colors">پایگاه گروه {toPersianDigits(defender)}</h3>
        <form onSubmit={handleP1Submit} className="space-y-2">
            <div className="flex items-center gap-2">
              <label htmlFor="x-coord" className="text-sm font-medium text-slate-600 dark:text-slate-400 w-24 transition-colors">مختصات طول:</label>
              <input id="x-coord" type="text" inputMode="numeric" value={toPersianDigits(p1x)} onChange={handleP1xChange}
                  className="block w-full px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md text-sm shadow-sm focus:outline-none focus:border-stone-500 dark:focus:border-green-500 focus:ring-1 focus:ring-stone-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-base disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۵" required disabled={p1Disabled}/>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="y-coord" className="text-sm font-medium text-slate-600 dark:text-slate-400 w-24 transition-colors">مختصات عرض:</label>
              <input id="y-coord" type="text" inputMode="numeric" value={toPersianDigits(p1y)} onChange={handleP1yChange}
                  className="block w-full px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md text-sm shadow-sm focus:outline-none focus:border-stone-500 dark:focus:border-green-500 focus:ring-1 focus:ring-stone-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-base disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۱۰" required disabled={p1Disabled}/>
            </div>
            <div className="h-4 text-xs text-center text-yellow-600 dark:text-yellow-400 transition-opacity duration-300">
              {clampingWarning}
            </div>
            <button type="submit" className="w-full bg-stone-700 dark:bg-green-600 text-white dark:text-slate-900 font-bold py-1 px-4 rounded-md hover:bg-stone-600 dark:hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-800 focus:ring-stone-500 dark:focus:ring-green-500 transition-colors uppercase tracking-wider text-sm disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed" disabled={p1Disabled}>
            تأیید پایگاه
            </button>
        </form>
      </div>

      <hr className="border-stone-500/20 dark:border-green-500/20 transition-colors" />

      {/* --- Player 2 Input --- */}
      <div className={`transition-opacity ${p2Disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <h3 className="text-md font-bold text-stone-800 dark:text-green-400 mb-1 text-center font-orbitron uppercase tracking-wider transition-colors">شلیک گروه {toPersianDigits(attacker)}</h3>
        <form onSubmit={handleP2Submit} className="space-y-2">
            <div className="flex items-center gap-2">
                <label htmlFor="p2-x-coord" className="text-sm font-medium text-slate-600 dark:text-slate-400 w-24 transition-colors">طول هدف:</label>
                <input id="p2-x-coord" type="text" inputMode="numeric" value={toPersianDigits(p2x)} onChange={(e) => setP2x(sanitizeIntegerInput(e.target.value))}
                className="block w-full px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md text-sm shadow-sm focus:outline-none focus:border-stone-500 dark:focus:border-green-500 focus:ring-1 focus:ring-stone-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-base disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۱۵" required disabled={p2Disabled}/>
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="p2-y-coord" className="text-sm font-medium text-slate-600 dark:text-slate-400 w-24 transition-colors">عرض هدف:</label>
                <input id="p2-y-coord" type="text" inputMode="numeric" value={toPersianDigits(p2y)} onChange={(e) => setP2y(sanitizeIntegerInput(e.target.value))}
                className="block w-full px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md text-sm shadow-sm focus:outline-none focus:border-stone-500 dark:focus:border-green-500 focus:ring-1 focus:ring-stone-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-base disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۱۰" required disabled={p2Disabled}/>
            </div>
            <button type="submit" className="w-full bg-stone-700 dark:bg-green-600 text-white dark:text-slate-900 font-bold py-1 px-4 rounded-md hover:bg-stone-600 dark:hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-800 focus:ring-stone-500 dark:focus:ring-green-500 transition-colors uppercase tracking-wider text-sm disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed" disabled={p2Disabled}>
            تأیید هدف
            </button>
        </form>
      </div>

      {/* --- Actions & Results --- */}
      <div className="h-20 flex flex-col items-center justify-center gap-1">
        {playerTwoConfirmed && gameStatus === 'idle' && (
          <button onClick={onFireMissile} className="w-full bg-red-600 text-white font-bold py-2 px-6 rounded-md border border-red-400 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-900 focus:ring-red-500 transition-all duration-300 text-base uppercase tracking-wider font-orbitron shadow-[0_0_15px_rgba(239,68,68,0.6)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)]">
            شلیک موشک 🚀
          </button>
        )}

        {gameStatus === 'deploying' && (
           <div className="text-center">
             <p className="text-yellow-600 dark:text-yellow-400 font-orbitron animate-pulse text-lg transition-colors">...در حال استقرار یگان‌ها</p>
           </div>
        )}

        {gameStatus === 'fired' && (
          <div className="text-center">
            <p className="text-yellow-600 dark:text-yellow-400 font-orbitron animate-pulse text-lg transition-colors">...در حال شلیک</p>
          </div>
        )}
        
        {gameStatus === 'result' && (
          <div className="text-center w-full flex flex-col items-center gap-1">
            {isHit ? (
              <p className="text-xl font-bold text-green-600 dark:text-green-400 font-orbitron animate-pulse transition-colors">!اصابت</p>
            ) : (
              <p className="text-xl font-bold text-red-600 dark:text-red-500 font-orbitron transition-colors">!خطا</p>
            )}
            <div className="flex gap-2 mt-1 w-full">
              <button onClick={onResetGame} className="w-1/2 bg-yellow-500 dark:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md hover:bg-yellow-400 dark:hover:bg-yellow-500 transition-colors text-xs">
                مرحله بعد
              </button>
              <button onClick={onFullReset} className="w-1/2 bg-slate-500 dark:bg-slate-600 text-slate-100 dark:text-slate-200 font-bold py-1 px-3 rounded-md hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors text-xs">
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