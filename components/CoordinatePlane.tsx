import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
  Customized,
} from 'recharts';
import { Axis } from '../types';

interface Point { x: number; y: number; }
interface DecoyBase extends Point { isReal: boolean; }
interface MissileState {
  id: number;
  target: Point;
  position: Point;
  angle: number;
  explosionProgress: number | null;
  isHit: boolean;
}

interface CoordinatePlaneProps {
  gameMode: 'classic' | 'decoy';
  symmetryAxis: Axis;
  symmetryValue: number;
  basePoint: { x: number; y: number } | null;
  previewPoint: { x: number; y: number } | null;
  playerTwoPoint: { x: number; y: number } | null;
  playerTwoPreviewPoint: { x: number; y: number } | null;
  correctSymmetricPoint: { x: number; y: number } | null;
  missiles: MissileState[];
  gameStatus: 'idle' | 'fired' | 'result' | 'deploying' | 'pre-start';
  isHit: boolean;
  theme: 'light' | 'dark';
  showGraphics: boolean;
  tankDirection: 'left' | 'right';
  launcherDirection: 'left' | 'right';
  previewLauncherDirection: 'left' | 'right';
  // Decoy mode props
  decoyBases: DecoyBase[];
  decoyPlayerPoints: Point[];
}

const toPersianDigits = (n: number | string): string => {
  const numStr = String(n);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return numStr.replace(/[0-9]/g, (d) => persianDigits[parseInt(d)]);
};

const Tank: React.FC<any> = ({ cx, cy, isDark, direction, isDecoy, isRevealed }) => {
    if (cx == null || cy == null) return null;

    let bodyFill = isDark ? "#15803d" : "#a16207"; // dark: green-600, light: yellow-700
    if (isDecoy) {
      // If it's a decoy and is revealed, use grey for fakes, green for real.
      bodyFill = isRevealed ? (isDark ? "#15803d" : "#a16207") : (isDark ? "#94a3b8" : "#a1a1aa"); 
    }
    const treadFill = isDark ? "#374151" : "#57534e"; // dark: gray-700, light: stone-600
    const barrelFill = isDark ? "#4b5563" : "#78716c"; // dark: gray-600, light: stone-500
    const detailsFill = isDark ? "#1f2937" : "#d6d3d1"; // dark: gray-800, light: stone-300

    const scaleX = direction === 'left' ? -1 : 1;
    const translateX = direction === 'left' ? cx + 22 : cx - 22;

    return (
        <g transform={`translate(${translateX}, ${cy - 18}) scale(${scaleX}, 1) scale(2.0)`} style={{opacity: isDecoy && isRevealed === false ? 0.7 : 1}}>
            <rect x="0" y="9" width="20" height="7" rx="2" fill={treadFill} />
            <circle cx="4" cy="12.5" r="2" fill={detailsFill} />
            <circle cx="10" cy="12.5" r="2" fill={detailsFill} />
            <circle cx="16" cy="12.5" r="2" fill={detailsFill} />
            <path d="M 2 10 C 2 6, 4 5, 8 5 L 18 5 C 19 5, 20 6, 20 7 L 20 10 Z" fill={bodyFill} />
            <rect x="7" y="2" width="6" height="4" rx="1" fill={bodyFill} />
            <rect x="13" y="3" width="10" height="2" fill={barrelFill} />
            <circle cx="9" cy="2" r="1.5" fill={treadFill} stroke={detailsFill} strokeWidth="0.5"/>
        </g>
    );
};

const MissileLauncher: React.FC<any> = ({ cx, cy, isDark, direction }) => {
    if (cx == null || cy == null) return null;

    const bodyFill = isDark ? "#15803d" : "#a16207";
    const wheelFill = isDark ? "#1f2937" : "#44403c";
    const launcherFill = isDark ? "#4b5563" : "#78716c";
    const detailsFill = isDark ? "#374151" : "#57534e";

    const scaleX = direction === 'left' ? -1 : 1;
    const translateX = direction === 'left' ? cx + 24 : cx - 24;
    
    return (
        <g transform={`translate(${translateX}, ${cy - 27}) scale(${scaleX}, 1) scale(2.0)`}>
            <circle cx="4" cy="18" r="3" fill={wheelFill} />
            <circle cx="12" cy="18" r="3" fill={wheelFill} />
            <circle cx="20" cy="18" r="3" fill={wheelFill} />
            <rect x="0" y="12" width="24" height="5" fill={bodyFill} />
            <path d="M 18 12 L 18 6 L 22 6 L 24 12 Z" fill={detailsFill} />
            <g transform="translate(10, 12) rotate(-45)">
                 <rect x="-10" y="-3" width="20" height="6" rx="1" fill={launcherFill} />
                 <path d="M 8 -1.5 L 12 -1.5 L 12 1.5 L 8 1.5 Z" fill="#ef4444" />
            </g>
        </g>
    );
};

const CustomMissile: React.FC<any> = ({ cx, cy, angle }) => {
  if (cx == null || cy == null) return null;
  const rotation = 90 - angle;
  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation}) scale(1.5)`}>
        <path d="M-12 6 L0 -14 L12 6 C8 10, -8 10, -12 6 Z" fill="#94a3b8" stroke="#e2e8f0" strokeWidth="1" />
        <path d="M-7 6 C-4 15, 4 15, 7 6 C 5 6, -5 6, -7 6 Z" fill="#f59e0b" />
    </g>
  );
};

const CustomExplosion: React.FC<any> = ({ cx, cy, progress, isHit }) => {
    if (cx == null || cy == null || progress === null || progress === 0) return null;
    
    const missColor = '#ef4444', hitOuterColor = '#f97316', hitInnerColor = '#f59e0b';
    const outerColor = isHit ? hitOuterColor : missColor;
    const innerColor = isHit ? hitInnerColor : missColor;
    const numSpikes = 8, maxRadius = 50;
    
    const currentRadius = maxRadius * Math.sin(progress * Math.PI);
    const opacity = 1 - progress;

    const points = Array.from({ length: numSpikes * 2 }).map((_, i) => {
        const radius = i % 2 === 0 ? currentRadius : currentRadius / 2;
        const angle = (i / (numSpikes * 2)) * 2 * Math.PI;
        return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
    }).join(' ');

    return (
        <g opacity={opacity}>
            <polygon points={points} fill={outerColor} />
            <circle cx={cx} cy={cy} r={currentRadius / 1.8} fill={innerColor} />
            <circle cx={cx} cy={cy} r={currentRadius / 3} fill="#fff7ed" />
        </g>
    );
};

const renderSymmetryLines = (props: any) => {
  const { xScale, yScale, symmetryAxis, symmetryValue, basePoint, previewPoint, playerTwoPoint, playerTwoPreviewPoint, theme } = props;
  if (!xScale || !yScale) return null;

  const isDark = theme === 'dark', baseLineColor = isDark ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.7)';
  const playerTwoLineColor = isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.7)';
  const lines: React.ReactNode[] = [];

  const drawLine = (point: {x: number, y: number} | null, color: string, isPreview: boolean) => {
    if (!point) return;
    const start = { x: xScale(point.x), y: yScale(point.y) };
    const end = { x: symmetryAxis === Axis.Y ? xScale(symmetryValue) : start.x, y: symmetryAxis === Axis.X ? yScale(symmetryValue) : start.y };
    lines.push(<line key={`line-${point.x}-${point.y}-${isPreview}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={color} strokeWidth={2} strokeDasharray="4 4" opacity={isPreview ? 0.6 : 1} />);
  };
  
  drawLine(previewPoint, baseLineColor, true);
  drawLine(basePoint, baseLineColor, false);
  drawLine(playerTwoPreviewPoint, playerTwoLineColor, true);
  drawLine(playerTwoPoint, playerTwoLineColor, false);
  return <g className="recharts-layer">{lines}</g>;
};

const yTicks = Array.from({ length: 11 }, (_, i) => i);
const xTicks = Array.from({ length: 17 }, (_, i) => i);
type LabelPosition = 'top' | 'bottom' | 'insideBottom' | 'insideLeft' | 'insideRight';

const CoordinatePlane: React.FC<CoordinatePlaneProps> = ({ 
  gameMode, symmetryAxis, symmetryValue, basePoint, previewPoint, playerTwoPoint, playerTwoPreviewPoint,
  correctSymmetricPoint, missiles, gameStatus, isHit, theme, showGraphics, tankDirection,
  launcherDirection, previewLauncherDirection, decoyBases, decoyPlayerPoints
}) => {
  const yDomain: [number, number] = [0, 10];
  const xDomain: [number, number] = [0, 16];
  const isDark = theme === 'dark';

  const gridColor = isDark ? 'rgba(203, 213, 225, 0.7)' : 'rgba(0, 0, 0, 0.8)';
  const axisTextColor = isDark ? '#cbd5e1' : '#3f3f46';
  const axisLineColor = isDark ? '#9ca3af' : '#000000';

  const arePointsClose = (p1: Point | null, p2: Point | null) => {
    if (!p1 || !p2) return false;
    return Math.abs(p1.x - p2.x) < 3.5 && Math.abs(p1.y - p2.y) < 3.5;
  };

  let baseLabel = { position: 'top' as LabelPosition, dy: -20 };
  let playerTwoLabel = { position: 'top' as LabelPosition, dy: -22 };
  let correctPointLabel = { position: 'top' as LabelPosition, dy: -12 };

  if (arePointsClose(basePoint, playerTwoPoint)) {
    playerTwoLabel = { position: 'bottom', dy: 28 };
  }
  if (correctSymmetricPoint && gameStatus === 'result' && !isHit) {
    if (arePointsClose(correctSymmetricPoint, basePoint) && baseLabel.position === 'top') correctPointLabel = { position: 'bottom', dy: 20 };
    else if (arePointsClose(correctSymmetricPoint, playerTwoPoint) && playerTwoLabel.position === 'top') correctPointLabel = { position: 'bottom', dy: 20 };
    if (arePointsClose(correctSymmetricPoint, playerTwoPoint) && correctPointLabel.position === playerTwoLabel.position) {
       correctPointLabel = { position: playerTwoLabel.position === 'top' ? 'bottom' : 'top', dy: playerTwoLabel.position === 'top' ? 20 : -12 };
    }
  }

  return (
    <div className="missile-chart-container bg-slate-200/60 dark:bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg border border-stone-500/40 dark:border-green-500/50 shadow-lg w-full h-full shadow-stone-500/20 dark:shadow-green-500/20 flex items-center justify-center">
      <div className="w-full max-h-full aspect-square">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <CartesianGrid stroke={gridColor} strokeWidth={1.5} />
            
            <Customized component={renderSymmetryLines} symmetryAxis={symmetryAxis} symmetryValue={symmetryValue} basePoint={basePoint} previewPoint={previewPoint} playerTwoPoint={playerTwoPoint} playerTwoPreviewPoint={playerTwoPreviewPoint} theme={theme} />
            
            <XAxis type="number" dataKey="x" name="طول" domain={xDomain} ticks={xTicks} interval={0} tickFormatter={(tick) => toPersianDigits(tick)} tick={{ fill: axisTextColor, fontSize: 24, dy: 10 }} stroke={axisLineColor} allowDataOverflow={true} axisLine={symmetryAxis === Axis.X && symmetryValue === 0 ? false : { stroke: axisLineColor, strokeWidth: 1.5 }} />
            <YAxis type="number" dataKey="y" name="عرض" domain={yDomain} ticks={yTicks} interval={0} tickFormatter={(tick) => toPersianDigits(tick)} tick={{ fill: axisTextColor, fontSize: 24, dx: -25 }} stroke={axisLineColor} allowDataOverflow={true} axisLine={symmetryAxis === Axis.Y && symmetryValue === 0 ? false : { stroke: axisLineColor, strokeWidth: 1.5 }} />

            {symmetryAxis === Axis.Y && (<ReferenceLine x={symmetryValue} stroke="#f43f5e" strokeWidth={3} ifOverflow="visible" />)}
            {symmetryAxis === Axis.X && (<ReferenceLine y={symmetryValue} stroke="#f43f5e" strokeWidth={3} ifOverflow="visible" />)}

            {/* --- Classic Mode Points --- */}
            {gameMode === 'classic' && !basePoint && previewPoint && (
                <ReferenceDot x={previewPoint.x} y={previewPoint.y} r={10} fill={isDark ? 'rgba(248, 113, 113, 0.5)' : 'rgba(220, 38, 38, 0.5)'} ifOverflow="visible" label={{ value: `پایگاه`, position: 'top', dy: -20, fill: isDark ? 'rgba(248, 113, 113, 0.6)' : 'rgba(239, 68, 68, 0.6)', fontWeight: 'bold', fontSize: 20, style: { textShadow: `0 0 5px ${isDark ? 'black' : 'rgba(255,255,255,0.7)'}` } }} />
            )}
            {gameMode === 'classic' && basePoint && (
              <ReferenceDot x={basePoint.x} y={basePoint.y} r={showGraphics ? 0 : 8} fill={isDark ? '#f87171' : '#dc2626'} ifOverflow="visible" shape={showGraphics ? (props: any) => <Tank {...props} isDark={isDark} direction={tankDirection} /> : undefined} label={{ value: `پایگاه`, position: baseLabel.position, dy: baseLabel.dy, fill: '#ef4444', fontWeight: 'bold', fontSize: 20, style: { textShadow: `0 0 5px ${isDark ? 'black' : 'rgba(255,255,255,0.7)'}` } }} />
            )}
            {gameMode === 'classic' && !playerTwoPoint && playerTwoPreviewPoint && basePoint && (
                <ReferenceDot x={playerTwoPreviewPoint.x} y={playerTwoPreviewPoint.y} r={10} fill={isDark ? 'rgba(96, 165, 250, 0.5)' : 'rgba(37, 99, 235, 0.5)'} ifOverflow="visible" label={{ value: `دیده بان`, position: 'top', dy: -22, fill: isDark ? 'rgba(96, 165, 250, 0.6)' : 'rgba(37, 99, 235, 0.6)', fontWeight: 'bold', fontSize: 20, style: { textShadow: `0 0 5px ${isDark ? 'black' : 'rgba(255,255,255,0.7)'}` } }} />
            )}
            {gameMode === 'classic' && playerTwoPoint && (
              <ReferenceDot x={playerTwoPoint.x} y={playerTwoPoint.y} r={showGraphics ? 0 : 8} fill={isDark ? '#60a5fa' : '#2563eb'} ifOverflow="visible" shape={showGraphics ? (props: any) => <MissileLauncher {...props} isDark={isDark} direction={launcherDirection} /> : undefined} label={{ value: `دیده بان`, position: playerTwoLabel.position, dy: playerTwoLabel.dy, fill: '#3b82f6', fontWeight: 'bold', fontSize: 20, style: { textShadow: `0 0 5px ${isDark ? 'black' : 'rgba(255,255,255,0.7)'}` } }} />
            )}
             {gameMode === 'classic' && gameStatus === 'result' && !isHit && correctSymmetricPoint && (
               <ReferenceDot x={correctSymmetricPoint.x} y={correctSymmetricPoint.y} r={8} fill="#22c55e" stroke={isDark ? "#1e293b" : "#f1f5f9"} strokeWidth={2} ifOverflow="visible" label={{ value: 'نقطه صحیح', position: correctPointLabel.position, dy: correctPointLabel.dy, fill: isDark ? '#4ade80' : '#16a34a', fontWeight: 'bold', fontSize: 18, style: { textShadow: `0 0 5px ${isDark ? 'black' : 'rgba(255,255,255,0.7)'}` }}} />
            )}
            
            {/* --- Decoy Mode Points --- */}
            {gameMode === 'decoy' && gameStatus === 'result' && decoyBases.map((base, i) => (
                <ReferenceDot key={`base-${i}`} x={base.x} y={base.y} r={showGraphics ? 0 : 8} fill={isDark ? '#f87171' : '#dc2626'} ifOverflow="visible" shape={(props: any) => <Tank {...props} isDark={isDark} direction={base.x < symmetryValue ? 'right' : 'left'} isDecoy={true} isRevealed={base.isReal} />} label={base.isReal ? { value: 'پایگاه اصلی', position: 'top', dy: -20, fill: '#22c55e', fontWeight: 'bold' } : undefined} />
            ))}
            {gameMode === 'decoy' && decoyPlayerPoints.map((p, i) => (
                <ReferenceDot key={`decoy-p2-${i}`} x={p.x} y={p.y} r={showGraphics ? 0 : 8} fill={isDark ? '#60a5fa' : '#2563eb'} ifOverflow="visible" shape={(props: any) => <MissileLauncher {...props} isDark={isDark} direction={p.x < symmetryValue ? 'right' : 'left'} />} label={{value: `هدف ${toPersianDigits(i+1)}`, position: 'top', dy: -22, fill: '#3b82f6'}} />
            ))}

            {/* --- Missile & Explosion Animations (for both modes) --- */}
            {missiles.map(m => (
              <React.Fragment key={m.id}>
                {gameStatus === 'fired' && <ReferenceDot x={m.position.x} y={m.position.y} r={0} ifOverflow="visible" shape={(props: any) => <CustomMissile {...props} angle={m.angle} />} />}
                {gameStatus === 'result' && <ReferenceDot x={m.target.x} y={m.target.y} r={0} ifOverflow="visible" shape={(props: any) => <CustomExplosion {...props} progress={m.explosionProgress} isHit={m.isHit} />} />}
              </React.Fragment>
            ))}
            
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CoordinatePlane;
