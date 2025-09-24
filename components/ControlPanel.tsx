import React, { useState, useEffect } from 'react';
import { Axis } from '../types';
import { playClick } from '../audio';

interface Point { x: number; y: number; }
interface DecoyBase extends Point { isReal: boolean; }

interface ControlPanelProps {
  gameMode: 'classic' | 'decoy';
  axis: Axis;
  value: number;
  gameStatus: 'pre-start' | 'idle' | 'deploying' | 'fired' | 'result';
  isHit: boolean;
  onResetGame: () => void;
  onFullReset: () => void;
  onStartRound: () => void;
  score1: number;
  score2: number;
  currentTurn: number;
  // Classic mode props
  basePoint: Point | null;
  onSetBasePoint: (point: Point) => void;
  onSetBasePointPreview: (point: Point | null) => void;
  onSetPlayerTwoPreviewPoint: (point: Point | null) => void;
  playerTwoConfirmed: boolean;
  onConfirmPlayerTwoPoint: (point: Point) => void;
  onFireMissile: () => void;
  // Decoy mode props
  decoyBases: DecoyBase[];
  timer: number;
  decoyPlayerPoints: Point[];
  onAddDecoyPoint: (point: Point) => void;
  onUpdateDecoyPoint: (index: number, point: Point) => void;
  onDeleteDecoyPoint: (index: number) => void;
  onFireAllMissiles: () => void;
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

const DecoyTargetManager: React.FC<{
    points: Point[],
    onAdd: (point: Point) => void,
    onUpdate: (index: number, point: Point) => void,
    onDelete: (index: number) => void,
    disabled: boolean,
}> = ({ points, onAdd, onUpdate, onDelete, disabled }) => {
    const [x, setX] = useState('');
    const [y, setY] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const handleCoordChange = (coord: 'x' | 'y', value: string) => {
      const setter = coord === 'x' ? setX : setY;
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
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(x.trim() === '' || y.trim() === '') return;
        const point = { x: parseInt(x, 10), y: parseInt(y, 10) };
        
        if (editingIndex !== null) {
            onUpdate(editingIndex, point);
            setEditingIndex(null);
        } else {
            onAdd(point);
        }
        setX('');
        setY('');
    };

    const handleEdit = (index: number) => {
        const point = points[index];
        setX(String(point.x));
        setY(String(point.y));
        setEditingIndex(index);
    };
    
    const handleCancelEdit = () => {
        setX('');
        setY('');
        setEditingIndex(null);
    }

    const isAddingDisabled = points.length >= 3 && editingIndex === null;

    return (
        <div className="space-y-3 p-2 bg-slate-300/50 dark:bg-slate-900/50 rounded-md">
            <form onSubmit={handleSubmit} className="space-y-2">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300 w-12">طول:</label>
                    <input type="text" inputMode="numeric" value={toPersianDigits(x)} onChange={(e) => handleCoordChange('x', e.target.value)}
                        className="block w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 text-center text-black dark:text-green-300 font-mono text-lg disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500" placeholder="۰-۱۶" required disabled={disabled} />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300 w-12">عرض:</label>
                    <input type="text" inputMode="numeric" value={toPersianDigits(y)} onChange={(e) => handleCoordChange('y', e.target.value)}
                        className="block w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 text-center text-black dark:text-green-300 font-mono text-lg disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500" placeholder="۰-۱۰" required disabled={disabled} />
                </div>
                <div className="flex gap-2">
                    {editingIndex !== null && (
                        <button type="button" onClick={handleCancelEdit} className="w-1/3 bg-gray-500 text-white font-bold py-2 px-2 rounded-md hover:bg-gray-400 transition-colors text-sm disabled:opacity-50" disabled={disabled}>لغو</button>
                    )}
                    <button type="submit" className="flex-grow bg-indigo-600 dark:bg-green-600 text-white dark:text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-indigo-500 dark:hover:bg-green-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors" disabled={disabled || isAddingDisabled}>
                        {editingIndex !== null ? 'بروزرسانی هدف' : 'افزودن هدف'}
                    </button>
                </div>
            </form>
            {points.length > 0 && <hr className="border-stone-500/20 dark:border-green-500/20 transition-colors" />}
            <div className="space-y-2">
                {points.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                        <p className="font-mono text-lg text-slate-800 dark:text-slate-200">
                           هدف {toPersianDigits(i + 1)}: ({toPersianDigits(p.x)}, {toPersianDigits(p.y)})
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(i)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50" disabled={disabled || editingIndex === i}>ویرایش</button>
                            <button onClick={() => onDelete(i)} className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50" disabled={disabled}>حذف</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const ControlPanel: React.FC<ControlPanelProps> = (props) => {
  const {
    gameMode, axis, value, basePoint, onSetBasePoint, onSetBasePointPreview, onSetPlayerTwoPreviewPoint,
    playerTwoConfirmed, onConfirmPlayerTwoPoint, gameStatus, isHit, onFireMissile, onResetGame, onFullReset,
    onStartRound, score1, score2, currentTurn, decoyBases, timer, decoyPlayerPoints, onAddDecoyPoint,
    onUpdateDecoyPoint, onDeleteDecoyPoint, onFireAllMissiles
  } = props;
  
  const [p1x, setP1x] = useState('');
  const [p1y, setP1y] = useState('');
  const [p2x, setP2x] = useState('');
  const [p2y, setP2y] = useState('');
  const [clampingWarning, setClampingWarning] = useState<string | null>(null);
  
  const isInteractionDisabled = gameStatus === 'deploying' || gameStatus === 'fired' || gameStatus === 'result' || gameStatus === 'pre-start';
  const p1Disabled = basePoint !== null || isInteractionDisabled;
  const p2Disabled = !basePoint || playerTwoConfirmed || gameStatus !== 'idle' || isInteractionDisabled;
  
  useEffect(() => {
    if (gameStatus === 'pre-start') {
        setP1x(''); setP1y(''); setP2x(''); setP2y('');
    }
  }, [gameStatus]);

  useEffect(() => {
    if (basePoint === null) { setP1x(''); setP1y(''); }
    setP2x(''); setP2y('');
  }, [basePoint, currentTurn]);

  useEffect(() => {
    if (gameMode === 'classic') {
        if (p1x.trim() !== '' && p1y.trim() !== '') {
            const xNum = parseInt(p1x, 10);
            const yNum = parseInt(p1y, 10);
            if (!isNaN(xNum) && !isNaN(yNum)) onSetBasePointPreview({ x: xNum, y: yNum });
        } else {
            onSetBasePointPreview(null);
        }
    }
  }, [p1x, p1y, onSetBasePointPreview, gameMode]);

   useEffect(() => {
    if (gameMode === 'classic') {
        if (p2x.trim() !== '' && p2y.trim() !== '') {
            const xNum = parseInt(p2x, 10);
            const yNum = parseInt(p2y, 10);
            if (!isNaN(xNum) && !isNaN(yNum)) onSetPlayerTwoPreviewPoint({ x: xNum, y: yNum });
        } else {
            onSetPlayerTwoPreviewPoint(null);
        }
    }
  }, [p2x, p2y, onSetPlayerTwoPreviewPoint, gameMode]);

  useEffect(() => {
    if (clampingWarning) {
        const timer = setTimeout(() => setClampingWarning(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [clampingWarning]);

  useEffect(() => { setClampingWarning(null) }, [currentTurn, axis]);

  const updateAndSetP1x = (val: string) => {
    const sanitized = sanitizeIntegerInput(val);
    if (sanitized === '') { setP1x(''); return; }
    let num = parseInt(sanitized, 10), originalNum = num, maxXCoord = 16;
    if (axis === Axis.Y) {
        const minX = Math.max(0, 2 * value - maxXCoord), maxX = Math.min(maxXCoord, 2 * value);
        num = Math.max(minX, Math.min(maxX, num));
        if (num !== originalNum) setClampingWarning(`مقدار طول به ${toPersianDigits(num)} تغییر یافت تا هدف در نقشه بماند.`);
        else setClampingWarning(null);
    } else {
        num = Math.max(0, Math.min(maxXCoord, num));
         if (num !== originalNum) setClampingWarning(`مقدار طول به ${toPersianDigits(num)} تغییر یافت تا در نقشه بماند.`);
        else setClampingWarning(null);
    }
    setP1x(String(num));
  };
  
  const handleP1xChange = (e: React.ChangeEvent<HTMLInputElement>) => updateAndSetP1x(e.target.value);
  
  const updateAndSetP1y = (val: string) => {
    const sanitized = sanitizeIntegerInput(val);
     if (sanitized === '') { setP1y(''); return; }
    let num = parseInt(sanitized, 10), originalNum = num, maxYCoord = 10;
    if (axis === Axis.X) {
        const minY = Math.max(0, 2 * value - maxYCoord), maxY = Math.min(maxYCoord, 2 * value);
        num = Math.max(minY, Math.min(maxY, num));
        if (num !== originalNum) setClampingWarning(`مقدار عرض به ${toPersianDigits(num)} تغییر یافت تا هدف در نقشه بماند.`);
        else setClampingWarning(null);
    } else {
        num = Math.max(0, Math.min(maxYCoord, num));
        if (num !== originalNum) setClampingWarning(`مقدار عرض به ${toPersianDigits(num)} تغییر یافت تا در نقشه بماند.`);
        else setClampingWarning(null);
    }
    setP1y(String(num));
  };

  const handleP1yChange = (e: React.ChangeEvent<HTMLInputElement>) => updateAndSetP1y(e.target.value);

  const handleP1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (p1x.trim() === '' || p1y.trim() === '') return;
    onSetBasePoint({ x: parseInt(p1x, 10), y: parseInt(p1y, 10) });
  };

  const handleP2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (p2x.trim() === '' || p2y.trim() === '') return;
    const xNum = parseInt(p2x, 10), yNum = parseInt(p2y, 10);
    if (!isNaN(xNum) && !isNaN(yNum) && xNum >= 0 && xNum <= 16 && yNum >= 0 && yNum <= 10) {
      onConfirmPlayerTwoPoint({ x: xNum, y: yNum });
    }
  };
  
  const handleP2CoordChange = (coord: 'x' | 'y', value: string) => {
      const setter = coord === 'x' ? setP2x : setP2y;
      const maxVal = coord === 'x' ? 16 : 10;
      const sanitized = sanitizeIntegerInput(value);
      if (sanitized === '') { setter(''); return; }
      let num = parseInt(sanitized, 10);
      num = Math.max(0, Math.min(maxVal, num));
      setter(String(num));
  };

  let turnStatusText = '';
  if (gameStatus === 'pre-start') turnStatusText = 'برای شروع مرحله آماده شوید';
  else if (gameStatus === 'deploying') turnStatusText = 'در حال استقرار یگان‌ها...';
  else if (gameStatus === 'fired') turnStatusText = 'دیده بان در حال شلیک...';
  else if (gameStatus === 'result') turnStatusText = 'مرحله پایان یافت';
  else if (gameMode === 'classic') turnStatusText = !basePoint ? 'نوبت پایگاه: تنظیم موقعیت' : 'نوبت دیده بان: تنظیم هدف';
  else turnStatusText = 'موقعیت پایگاه های دشمن را پیدا کنید';

  const controlButtonClasses = "w-8 h-8 flex items-center justify-center bg-slate-300 dark:bg-slate-700 rounded-md hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors text-xl font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="bg-slate-200/80 dark:bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg border border-stone-500/40 dark:border-green-500/50 shadow-lg w-full shadow-stone-500/20 dark:shadow-green-500/20 flex flex-col gap-2 transition-colors h-full overflow-y-auto">
      
      <div className="text-center bg-slate-300/50 dark:bg-slate-900/50 p-3 rounded-md">
        <h2 className="text-xl font-bold text-stone-800 dark:text-green-400 font-orbitron uppercase tracking-wider mb-1 transition-colors">وضعیت نبرد</h2>
        <div className="flex justify-around text-lg">
            <p className="text-stone-900 dark:text-slate-300">امتیاز گروه ۱: <span className="font-bold text-stone-700 dark:text-green-300 font-mono transition-colors">{toPersianDigits(score1)}</span></p>
            <p className="text-stone-900 dark:text-slate-300">امتیاز گروه ۲: <span className="font-bold text-stone-700 dark:text-green-300 font-mono transition-colors">{toPersianDigits(score2)}</span></p>
        </div>
        <p className="mt-2 text-yellow-600 dark:text-yellow-400 animate-pulse h-6 text-base transition-colors">{turnStatusText}</p>
      </div>

      <hr className="border-stone-500/20 dark:border-green-500/20 transition-colors" />

      {gameStatus !== 'pre-start' && gameMode === 'classic' ? (
        <>
        <div className={`transition-opacity ${p1Disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <h3 className="text-lg font-bold text-stone-800 dark:text-green-400 mb-2 text-center font-orbitron uppercase tracking-wider transition-colors">پایگاه</h3>
        <form onSubmit={handleP1Submit} className="space-y-2">
            <div className="flex items-center gap-2">
              <label htmlFor="x-coord" className="text-base font-medium text-slate-600 dark:text-slate-300 w-28 transition-colors">مختصات طول:</label>
              <div className="flex-grow flex items-center gap-1">
                <button type="button" onMouseDown={playClick} onClick={() => updateAndSetP1x(String(parseInt(p1x || '0', 10) - 1))} className={controlButtonClasses} disabled={p1Disabled}>-</button>
                <input id="x-coord" type="text" inputMode="numeric" value={toPersianDigits(p1x)} onChange={handleP1xChange}
                    className="block w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-2xl disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۵" required disabled={p1Disabled}/>
                <button type="button" onMouseDown={playClick} onClick={() => updateAndSetP1x(String(parseInt(p1x || '0', 10) + 1))} className={controlButtonClasses} disabled={p1Disabled}>+</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="y-coord" className="text-base font-medium text-slate-600 dark:text-slate-300 w-28 transition-colors">مختصات عرض:</label>
              <div className="flex-grow flex items-center gap-1">
                <button type="button" onMouseDown={playClick} onClick={() => updateAndSetP1y(String(parseInt(p1y || '0', 10) - 1))} className={controlButtonClasses} disabled={p1Disabled}>-</button>
                <input id="y-coord" type="text" inputMode="numeric" value={toPersianDigits(p1y)} onChange={handleP1yChange}
                    className="block w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-2xl disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۱۰" required disabled={p1Disabled}/>
                <button type="button" onMouseDown={playClick} onClick={() => updateAndSetP1y(String(parseInt(p1y || '0', 10) + 1))} className={controlButtonClasses} disabled={p1Disabled}>+</button>
              </div>
            </div>
            <div className="h-5 text-sm text-center text-yellow-600 dark:text-yellow-400 transition-opacity duration-300">{clampingWarning}</div>
            <button type="submit" onMouseDown={playClick} className="w-full bg-indigo-600 dark:bg-green-600 text-white dark:text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-indigo-500 dark:hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-800 focus:ring-indigo-500 dark:focus:ring-green-500 transition-colors uppercase tracking-wider text-base disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed" disabled={p1Disabled}>تأیید پایگاه</button>
        </form>
      </div>
      <hr className="border-stone-500/20 dark:border-green-500/20 transition-colors" />
      <div className={`transition-opacity ${p2Disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <h3 className="text-lg font-bold text-stone-800 dark:text-green-400 mb-2 text-center font-orbitron uppercase tracking-wider transition-colors">دیده بان</h3>
        <form onSubmit={handleP2Submit} className="space-y-2">
            <div className="flex items-center gap-2">
                <label htmlFor="p2-x-coord" className="text-base font-medium text-slate-600 dark:text-slate-300 w-28 transition-colors">طول هدف:</label>
                 <div className="flex-grow flex items-center gap-1">
                    <button type="button" onMouseDown={playClick} onClick={() => handleP2CoordChange('x', String(parseInt(p2x || '0', 10) - 1))} className={controlButtonClasses} disabled={p2Disabled || (p2x !== '' && parseInt(p2x, 10) <= 0)}>-</button>
                    <input id="p2-x-coord" type="text" inputMode="numeric" value={toPersianDigits(p2x)} onChange={(e) => handleP2CoordChange('x', e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-2xl disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۷" required disabled={p2Disabled}/>
                    <button type="button" onMouseDown={playClick} onClick={() => handleP2CoordChange('x', String(parseInt(p2x || '0', 10) + 1))} className={controlButtonClasses} disabled={p2Disabled || (p2x !== '' && parseInt(p2x, 10) >= 16)}>+</button>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="p2-y-coord" className="text-base font-medium text-slate-600 dark:text-slate-300 w-28 transition-colors">عرض هدف:</label>
                <div className="flex-grow flex items-center gap-1">
                    <button type="button" onMouseDown={playClick} onClick={() => handleP2CoordChange('y', String(parseInt(p2y || '0', 10) - 1))} className={controlButtonClasses} disabled={p2Disabled || (p2y !== '' && parseInt(p2y, 10) <= 0)}>-</button>
                    <input id="p2-y-coord" type="text" inputMode="numeric" value={toPersianDigits(p2y)} onChange={(e) => handleP2CoordChange('y', e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-green-500 text-center text-black dark:text-green-300 font-mono text-2xl disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 transition-colors" placeholder="مثال: ۱۰" required disabled={p2Disabled}/>
                    <button type="button" onMouseDown={playClick} onClick={() => handleP2CoordChange('y', String(parseInt(p2y || '0', 10) + 1))} className={controlButtonClasses} disabled={p2Disabled || (p2y !== '' && parseInt(p2y, 10) >= 10)}>+</button>
                </div>
            </div>
            <button type="submit" onMouseDown={playClick} className="w-full bg-indigo-600 dark:bg-green-600 text-white dark:text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-indigo-500 dark:hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-800 focus:ring-indigo-500 dark:focus:ring-green-500 transition-colors uppercase tracking-wider text-base disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:text-slate-600 dark:disabled:text-slate-400 disabled:cursor-not-allowed" disabled={p2Disabled}>تأیید هدف</button>
        </form>
      </div>
      </>
      ) : null}

      {gameStatus !== 'pre-start' && gameMode === 'decoy' ? (
      <>
        <div className={`transition-opacity ${isInteractionDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="text-center p-2 mb-2 bg-slate-300/50 dark:bg-slate-900/50 rounded-md">
                <h4 className="text-md font-semibold text-stone-700 dark:text-green-300">پایگاه های احتمالی دشمن</h4>
                 <div className="font-mono text-2xl text-stone-800 dark:text-green-400 tracking-wider flex items-center justify-center gap-4 py-1">
                    {decoyBases.map((b, i) => (
                        <div key={`coord-${i}`} className="flex items-center">
                            <span className="text-5xl font-light select-none">[</span>
                            <div className="flex flex-col text-center px-1">
                                <span className="w-8">{toPersianDigits(b.x)}</span>
                                <span className="w-8">{toPersianDigits(b.y)}</span>
                            </div>
                            <span className="text-5xl font-light select-none">]</span>
                        </div>
                    ))}
                </div>
            </div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-green-400 mb-2 text-center font-orbitron uppercase tracking-wider transition-colors">پرتاب موشک</h3>
            <div className="text-center font-orbitron text-4xl mb-2 p-2 rounded-md bg-slate-300/50 dark:bg-slate-900/50 text-red-600 dark:text-red-500">
                {toPersianDigits(timer)}
            </div>
             <DecoyTargetManager 
                points={decoyPlayerPoints}
                onAdd={onAddDecoyPoint}
                onUpdate={onUpdateDecoyPoint}
                onDelete={onDeleteDecoyPoint}
                disabled={isInteractionDisabled}
            />
        </div>
      </>
      ) : null}

      <div className="min-h-[6rem] flex flex-col items-center justify-center gap-2 mt-auto">
        {gameStatus === 'pre-start' && (
            <button onMouseDown={playClick} onClick={onStartRound} className="w-full bg-green-600 text-white font-bold py-3 px-6 rounded-md border border-green-400 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-900 focus:ring-green-500 transition-all duration-300 text-lg uppercase tracking-wider font-orbitron shadow-[0_0_15px_rgba(34,197,94,0.6)] hover:shadow-[0_0_25px_rgba(34,197,94,0.8)]">
                شروع مرحله
            </button>
        )}
        {gameMode === 'classic' && playerTwoConfirmed && gameStatus === 'idle' && (
          <button onMouseDown={playClick} onClick={onFireMissile} className="w-full bg-red-600 text-white font-bold py-2 px-6 rounded-md border border-red-400 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-900 focus:ring-red-500 transition-all duration-300 text-lg uppercase tracking-wider font-orbitron shadow-[0_0_15px_rgba(239,68,68,0.6)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)]">شلیک موشک 🚀</button>
        )}
        {gameMode === 'decoy' && gameStatus === 'idle' && (
          <button onMouseDown={playClick} onClick={onFireAllMissiles} className="w-full bg-red-600 text-white font-bold py-2 px-6 rounded-md border border-red-400 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-900 focus:ring-red-500 transition-all duration-300 text-lg uppercase tracking-wider font-orbitron shadow-[0_0_15px_rgba(239,68,68,0.6)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)] disabled:opacity-50 disabled:cursor-not-allowed" disabled={isInteractionDisabled || decoyPlayerPoints.length === 0}>شلیک همه موشک ها 🚀</button>
        )}
        {gameStatus === 'deploying' && (<div className="text-center"><p className="text-yellow-600 dark:text-yellow-400 font-orbitron animate-pulse text-xl transition-colors">...در حال استقرار یگان‌ها</p></div>)}
        {gameStatus === 'fired' && (<div className="text-center"><p className="text-yellow-600 dark:text-yellow-400 font-orbitron animate-pulse text-xl transition-colors">...در حال شلیک</p></div>)}
        {gameStatus === 'result' && (
          <div className="text-center w-full flex flex-col items-center gap-1">
            {isHit ? (<p className="text-xl font-bold text-green-600 dark:text-green-400 font-orbitron animate-pulse transition-colors">برخورد موفقیت آمیز بود</p>) : (<p className="text-xl font-bold text-red-600 dark:text-red-500 font-orbitron transition-colors">موشک به هدف برخورد نکرد</p>)}
            <div className="flex gap-2 mt-2 w-full">
              <button onMouseDown={playClick} onClick={onResetGame} className="w-1/2 bg-yellow-500 dark:bg-yellow-600 text-white font-bold py-2 px-3 rounded-md hover:bg-yellow-400 dark:hover:bg-yellow-500 transition-colors text-sm">مرحله بعد</button>
              <button onMouseDown={playClick} onClick={onFullReset} className="w-1/2 bg-indigo-400 dark:bg-slate-600 text-white dark:text-slate-200 font-bold py-2 px-3 rounded-md hover:bg-indigo-300 dark:hover:bg-slate-500 transition-colors text-sm">شروع مجدد</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
