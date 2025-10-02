import React, { useState } from 'react';
import { playClick } from '../audio';

type Difficulty = 'easy' | 'medium' | 'hard';
type ScreenSize = 'large' | 'medium' | 'small';

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

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    gameMode: 'classic' | 'decoy';
    initialNumPlayers: number;
    initialRoundsPerTurn: number;
    initialTimerDuration: number;
    initialDifficulty: Difficulty;
    initialShowDecoyBaseCoords: boolean;
    initialScreenSize: ScreenSize;
    onApplySettings: (settings: { numPlayers: number; roundsPerTurn: number; timerDuration: number; difficulty: Difficulty; showCoords: boolean; screenSize: ScreenSize; }) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, gameMode, initialNumPlayers, initialRoundsPerTurn, initialTimerDuration, initialDifficulty, initialShowDecoyBaseCoords, initialScreenSize, onApplySettings 
}) => {
    if (!isOpen) return null;

    const [numPlayers, setNumPlayers] = useState(initialNumPlayers);
    const [roundsPerTurn, setRoundsPerTurn] = useState(initialRoundsPerTurn);
    const [timerDuration, setTimerDuration] = useState(initialTimerDuration);
    const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
    const [showCoords, setShowCoords] = useState(initialShowDecoyBaseCoords);
    const [screenSize, setScreenSize] = useState<ScreenSize>(initialScreenSize);

    const handleApplyClick = () => {
        playClick();
        onApplySettings({ numPlayers, roundsPerTurn, timerDuration, difficulty, showCoords, screenSize });
    };

    const handleNumPlayersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitized = sanitizeIntegerInput(e.target.value);
        if (sanitized === '') {
            setNumPlayers(1);
            return;
        }
        let num = parseInt(sanitized, 10);
        num = Math.max(1, Math.min(6, num)); // Clamp between 1 and 6
        setNumPlayers(num);
    };
    
    const handleRoundsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitized = sanitizeIntegerInput(e.target.value);
        if (sanitized === '') {
            setRoundsPerTurn(1);
            return;
        }
        let num = parseInt(sanitized, 10);
        num = Math.max(1, Math.min(99, num)); // Clamp between 1 and 99
        setRoundsPerTurn(num);
    };

    const handleTimerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitized = sanitizeIntegerInput(e.target.value);
        if (sanitized === '') {
            setTimerDuration(5);
            return;
        }
        let num = parseInt(sanitized, 10);
        num = Math.max(5, Math.min(99, num)); // Clamp between 5 and 99
        setTimerDuration(num);
    };
    
    const controlButtonClasses = "w-10 h-10 flex items-center justify-center bg-slate-300 dark:bg-slate-700 rounded-md hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors text-2xl font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed";
    const difficultyButtonClasses = (level: Difficulty) =>
        `flex-1 py-2 text-center rounded-md transition-all font-semibold border-2 ${
        difficulty === level
            ? 'bg-indigo-600 dark:bg-green-600 text-white dark:text-slate-900 border-indigo-500 dark:border-green-500 shadow-lg scale-105'
            : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 border-transparent'
        }`;
    
    const sizeButtonClasses = (size: ScreenSize) =>
        `flex-1 py-2 text-center rounded-md transition-all font-semibold border-2 ${
        screenSize === size
            ? 'bg-indigo-600 dark:bg-green-600 text-white dark:text-slate-900 border-indigo-500 dark:border-green-500 shadow-lg scale-105'
            : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 border-transparent'
        }`;

    const toggleButtonClasses = (isActive: boolean) =>
        `flex-1 py-2 text-center rounded-md transition-all font-semibold border-2 ${
        showCoords === isActive
            ? 'bg-indigo-600 dark:bg-green-600 text-white dark:text-slate-900 border-indigo-500 dark:border-green-500 shadow-lg scale-105'
            : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 border-transparent'
        }`;

    const difficultyDescription = {
        easy: 'پایگاه‌ها نزدیک به خط تقارن قرار می‌گیرند.',
        medium: 'فاصله پایگاه‌ها از خط تقارن متوسط است.',
        hard: 'پایگاه‌ها دور از خط تقارن قرار می‌گیرند.'
    };
    
    const sizeDescription = {
        small: 'حالت کوچک، مناسب برای نمایشگرهای با وضوح پایین.',
        medium: 'حالت متوسط، مناسب برای اکثر نمایشگرها.',
        large: 'حالت بزرگ، صفحه را کاملاً پر می‌کند.'
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
            <div className="bg-stone-200 dark:bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-md m-4 text-slate-800 dark:text-slate-300 border border-stone-400 dark:border-green-500" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-center mb-6 font-orbitron text-stone-800 dark:text-green-400 uppercase">تنظیمات بازی</h2>
                
                {gameMode === 'decoy' ? (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-lg font-medium mb-2 text-center">سطح سختی</label>
                            <div className="flex justify-center gap-2">
                                <button onMouseDown={playClick} onClick={() => setDifficulty('easy')} className={difficultyButtonClasses('easy')}>آسان</button>
                                <button onMouseDown={playClick} onClick={() => setDifficulty('medium')} className={difficultyButtonClasses('medium')}>متوسط</button>
                                <button onMouseDown={playClick} onClick={() => setDifficulty('hard')} className={difficultyButtonClasses('hard')}>سخت</button>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center h-5">{difficultyDescription[difficulty]}</p>
                        </div>
                        
                        <div>
                            <label className="block text-lg font-medium mb-2 text-center">اندازه صفحه</label>
                            <div className="flex justify-center gap-2">
                                <button onMouseDown={playClick} onClick={() => setScreenSize('small')} className={sizeButtonClasses('small')}>کوچک</button>
                                <button onMouseDown={playClick} onClick={() => setScreenSize('medium')} className={sizeButtonClasses('medium')}>متوسط</button>
                                <button onMouseDown={playClick} onClick={() => setScreenSize('large')} className={sizeButtonClasses('large')}>بزرگ</button>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center h-5">{sizeDescription[screenSize]}</p>
                        </div>

                        <div>
                            <label className="block text-lg font-medium mb-2 text-center">نمایش مکان پایگاه روی نقشه</label>
                             <div className="flex justify-center gap-2">
                                <button onMouseDown={playClick} onClick={() => setShowCoords(true)} className={toggleButtonClasses(true)}>
                                    نمایش
                                </button>
                                <button onMouseDown={playClick} onClick={() => setShowCoords(false)} className={toggleButtonClasses(false)}>
                                    مخفی
                                </button>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center h-5">
                                {showCoords ? 'مکان پایگاه دشمن روی نقشه نمایش داده می‌شود.' : 'مکان پایگاه دشمن روی نقشه مخفی می‌ماند.'}
                            </p>
                        </div>

                        <div>
                            <label htmlFor="num-players" className="block text-lg font-medium mb-2 text-center">تعداد گروه ها</label>
                            <div className="flex items-center justify-center gap-2">
                                <button type="button" onMouseDown={playClick} onClick={() => setNumPlayers(Math.max(1, numPlayers - 1))} disabled={numPlayers <= 1} className={controlButtonClasses}>-</button>
                                <input id="num-players" type="text" inputMode="numeric" value={toPersianDigits(numPlayers)} onChange={handleNumPlayersChange}
                                    className="block w-24 text-center px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 text-black dark:text-green-300 font-mono text-3xl font-bold" />
                                <button type="button" onMouseDown={playClick} onClick={() => setNumPlayers(Math.min(6, numPlayers + 1))} disabled={numPlayers >= 6} className={controlButtonClasses}>+</button>
                            </div>
                        </div>
                        
                        <div>
                            <label htmlFor="rounds-per-turn" className="block text-lg font-medium mb-2 text-center">تعداد دور در هر نوبت</label>
                             <div className="flex items-center justify-center gap-2">
                                <button type="button" onMouseDown={playClick} onClick={() => setRoundsPerTurn(Math.max(1, roundsPerTurn - 1))} disabled={roundsPerTurn <= 1} className={controlButtonClasses}>-</button>
                                <input id="rounds-per-turn" type="text" inputMode="numeric" value={toPersianDigits(roundsPerTurn)} onChange={handleRoundsChange}
                                    className="block w-24 text-center px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 text-black dark:text-green-300 font-mono text-3xl font-bold" />
                                <button type="button" onMouseDown={playClick} onClick={() => setRoundsPerTurn(Math.min(99, roundsPerTurn + 1))} disabled={roundsPerTurn >= 99} className={controlButtonClasses}>+</button>
                             </div>
                        </div>

                        <div>
                            <label htmlFor="timer-duration" className="block text-lg font-medium mb-2 text-center">زمان هر دور (ثانیه)</label>
                             <div className="flex items-center justify-center gap-2">
                                <button type="button" onMouseDown={playClick} onClick={() => setTimerDuration(Math.max(5, timerDuration - 1))} disabled={timerDuration <= 5} className={controlButtonClasses}>-</button>
                                <input id="timer-duration" type="text" inputMode="numeric" value={toPersianDigits(timerDuration)} onChange={handleTimerChange}
                                    className="block w-24 text-center px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:border-indigo-500 dark:focus:border-green-500 text-black dark:text-green-300 font-mono text-3xl font-bold" />
                                <button type="button" onMouseDown={playClick} onClick={() => setTimerDuration(Math.min(99, timerDuration + 1))} disabled={timerDuration >= 99} className={controlButtonClasses}>+</button>
                             </div>
                        </div>

                    </div>
                ) : (
                    <p className="text-center text-lg py-8">تنظیمات فقط برای حالت فریب در دسترس است.</p>
                )}

                <div className="mt-8 flex w-full gap-4">
                    <button onClick={onClose} onMouseDown={playClick}
                        className="w-1/2 bg-slate-500 dark:bg-slate-700 text-white dark:text-slate-200 font-bold py-2 px-6 rounded-md hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors uppercase tracking-wider">
                        لغو
                    </button>
                    <button onClick={handleApplyClick} disabled={gameMode !== 'decoy'}
                        className="w-1/2 bg-indigo-600 dark:bg-green-600 text-white dark:text-slate-900 font-bold py-2 px-6 rounded-md hover:bg-indigo-500 dark:hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-200 dark:focus:ring-offset-slate-800 focus:ring-indigo-500 dark:focus:ring-green-500 transition-colors uppercase tracking-wider disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed">
                        اعمال و شروع مجدد
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;