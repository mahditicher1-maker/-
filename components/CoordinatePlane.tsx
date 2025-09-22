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

interface CoordinatePlaneProps {
  symmetryAxis: Axis;
  symmetryValue: number;
  basePoint: { x: number; y: number } | null;
  previewPoint: { x: number; y: number } | null;
  playerTwoPoint: { x: number; y: number } | null;
  playerTwoPreviewPoint: { x: number; y: number } | null;
  missileTargetPoint: { x: number; y: number } | null;
  correctSymmetricPoint: { x: number; y: number } | null;
  missilePosition: { x: number; y: number } | null;
  missileAngle: number;
  explosionProgress: number | null;
  gameStatus: 'idle' | 'fired' | 'result' | 'deploying';
  isHit: boolean;
  theme: 'light' | 'dark';
  showGraphics: boolean;
  tankDirection: 'left' | 'right';
  launcherDirection: 'left' | 'right';
  previewLauncherDirection: 'left' | 'right';
}

const toPersianDigits = (n: number | string): string => {
  const numStr = String(n);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return numStr.replace(/[0-9]/g, (d) => persianDigits[parseInt(d)]);
};

const Tank: React.FC<any> = ({ cx, cy, isDark, direction }) => {
    if (cx == null || cy == null) return null;

    const bodyFill = isDark ? "#15803d" : "#a16207"; // dark: green-600, light: yellow-700
    const treadFill = isDark ? "#374151" : "#57534e"; // dark: gray-700, light: stone-600
    const barrelFill = isDark ? "#4b5563" : "#78716c"; // dark: gray-600, light: stone-500
    const detailsFill = isDark ? "#1f2937" : "#d6d3d1"; // dark: gray-800, light: stone-300

    const scaleX = direction === 'left' ? -1 : 1;
    // Adjust translateX to keep the tank centered after flipping
    const translateX = direction === 'left' ? cx + 22 : cx - 22;

    return (
        <g transform={`translate(${translateX}, ${cy - 18}) scale(${scaleX}, 1) scale(2.0)`}>
            {/* Treads */}
            <rect x="0" y="9" width="20" height="7" rx="2" fill={treadFill} />
            <circle cx="4" cy="12.5" r="2" fill={detailsFill} />
            <circle cx="10" cy="12.5" r="2" fill={detailsFill} />
            <circle cx="16" cy="12.5" r="2" fill={detailsFill} />
            
            {/* Body */}
            <path d="M 2 10 C 2 6, 4 5, 8 5 L 18 5 C 19 5, 20 6, 20 7 L 20 10 Z" fill={bodyFill} />
            
            {/* Turret */}
            <rect x="7" y="2" width="6" height="4" rx="1" fill={bodyFill} />
            
            {/* Barrel */}
            <rect x="13" y="3" width="10" height="2" fill={barrelFill} />

             {/* Hatch */}
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

    // Base SVG is drawn facing right. Flip it if the direction is 'left'.
    const scaleX = direction === 'left' ? -1 : 1;
    const translateX = direction === 'left' ? cx + 24 : cx - 24;
    
    return (
        <g transform={`translate(${translateX}, ${cy - 27}) scale(${scaleX}, 1) scale(2.0)`}>
            {/* Wheels */}
            <circle cx="4" cy="18" r="3" fill={wheelFill} />
            <circle cx="12" cy="18" r="3" fill={wheelFill} />
            <circle cx="20" cy="18" r="3" fill={wheelFill} />

            {/* Chassis */}
            <rect x="0" y="12" width="24" height="5" fill={bodyFill} />

            {/* Cabin - Drawn on the right side */}
            <path d="M 18 12 L 18 6 L 22 6 L 24 12 Z" fill={detailsFill} />

            {/* Launcher Box - Drawn on the left, angled up and to the right */}
            <g transform="translate(10, 12) rotate(-45)">
                 <rect x="-10" y="-3" width="20" height="6" rx="1" fill={launcherFill} />
                 {/* Missile tip visible */}
                 <path d="M 8 -1.5 L 12 -1.5 L 12 1.5 L 8 1.5 Z" fill="#ef4444" />
            </g>
        </g>
    );
};


// Custom component for the missile graphic
const CustomMissile: React.FC<any> = ({ cx, cy, angle }) => {
  if (cx == null || cy == null) return null; // Guard against null/undefined coordinates

  const x = cx;
  const y = cy;

  // SVG path for the missile shape. Centered at (0,0). Tip is at (0, -14), so it points UP.
  const missilePath = "M-12 6 L0 -14 L12 6 C8 10, -8 10, -12 6 Z";
  const flamePath = "M-7 6 C-4 15, 4 15, 7 6 C 5 6, -5 6, -7 6 Z";
  
  // Convert angle for correct SVG rotation.
  // The missile SVG path points UP. The 'angle' is from atan2 (CCW, 0 is right).
  // SVG rotation is CW. The formula `90 - angle` correctly aligns the UP-pointing missile
  // with the trajectory angle.
  const rotation = 90 - angle;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation}) scale(1.5)`}>
        <path d={missilePath} fill="#94a3b8" stroke="#e2e8f0" strokeWidth="1" />
        <path d={flamePath} fill="#f59e0b" />
    </g>
  );
};

// Custom component for the explosion animation
const CustomExplosion: React.FC<any> = ({ cx, cy, progress, isHit }) => {
    if (cx == null || cy == null) return null; // Guard against null/undefined coordinates
    
    const x = cx;
    const y = cy;
      
    if (progress === null || progress === 0) return null;

    const missColor = '#ef4444'; // red-500
    const hitOuterColor = '#f97316'; // orange-500
    const hitInnerColor = '#f59e0b'; // amber-500

    const outerColor = isHit ? hitOuterColor : missColor;
    const innerColor = isHit ? hitInnerColor : missColor;

    const numSpikes = 8;
    const maxRadius = 50;
    
    // Animation: expand then fade
    const currentRadius = maxRadius * Math.sin(progress * Math.PI);
    const opacity = 1 - progress;

    const points = Array.from({ length: numSpikes * 2 }).map((_, i) => {
        const radius = i % 2 === 0 ? currentRadius : currentRadius / 2;
        const angle = (i / (numSpikes * 2)) * 2 * Math.PI;
        const pointX = x + radius * Math.cos(angle);
        const pointY = y + radius * Math.sin(angle);
        return `${pointX},${pointY}`;
    }).join(' ');

    return (
        <g opacity={opacity} style={{ transformOrigin: `${x}px ${y}px` }}>
            <polygon points={points} fill={outerColor} />
            <circle cx={x} cy={y} r={currentRadius / 1.8} fill={innerColor} />
            <circle cx={x} cy={y} r={currentRadius / 3} fill="#fff7ed" />
        </g>
    );
};

const renderSymmetryLines = (props: any) => {
  const { 
    xScale, yScale, 
    symmetryAxis, symmetryValue, 
    basePoint, previewPoint, 
    playerTwoPoint, playerTwoPreviewPoint, 
    theme 
  } = props;

  if (!xScale || !yScale) {
    return null;
  }

  const isDark = theme === 'dark';
  const baseLineColor = isDark ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.7)';
  const playerTwoLineColor = isDark ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.7)';
  const previewOpacity = 0.6;

  const lines: React.ReactNode[] = [];

  const drawLine = (point: {x: number, y: number} | null, color: string, isPreview: boolean) => {
    if (!point) return;

    const start = {
      x: xScale(point.x),
      y: yScale(point.y),
    };

    const end = {
      x: symmetryAxis === Axis.Y ? xScale(symmetryValue) : start.x,
      y: symmetryAxis === Axis.X ? yScale(symmetryValue) : start.y,
    };
    
    lines.push(
      <line
        key={`line-${point.x}-${point.y}-${isPreview}`}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="4 4"
        opacity={isPreview ? previewOpacity : 1}
      />
    );
  };
  
  drawLine(previewPoint, baseLineColor, true);
  drawLine(basePoint, baseLineColor, false);
  drawLine(playerTwoPreviewPoint, playerTwoLineColor, true);
  drawLine(playerTwoPoint, playerTwoLineColor, false);
  
  return <g className="recharts-layer">{lines}</g>;
};

// Ticks array is defined outside the component to prevent re-creation on each render.
const yTicks = Array.from({ length: 11 }, (_, i) => i); // 0-10 for Y axis
const xTicks = Array.from({ length: 17 }, (_, i) => i); // 0-16 for X axis

// FIX: Define LabelPosition as it is not exported from recharts.
type LabelPosition = 'top' | 'bottom' | 'insideBottom' | 'insideLeft' | 'insideRight';

const CoordinatePlane: React.FC<CoordinatePlaneProps> = ({ 
  symmetryAxis, 
  symmetryValue, 
  basePoint,
  previewPoint,
  playerTwoPoint,
  playerTwoPreviewPoint,
  missileTargetPoint,
  correctSymmetricPoint,
  missilePosition,
  missileAngle,
  explosionProgress,
  gameStatus,
  isHit,
  theme,
  showGraphics,
  tankDirection,
  launcherDirection,
  previewLauncherDirection
}) => {
  const yDomain: [number, number] = [0, 10];
  const xDomain: [number, number] = [0, 16];
  const isDark = theme === 'dark';

  // Theme-based colors
  const gridColor = isDark ? 'rgba(203, 213, 225, 0.7)' : 'rgba(0, 0, 0, 0.8)';
  const axisTextColor = isDark ? '#cbd5e1' : '#3f3f46';
  const axisLineColor = isDark ? '#9ca3af' : '#000000'; // dark: gray-400, light: black

  // --- Smart Label Positioning Logic ---
  const arePointsClose = (p1: { x: number; y: number } | null, p2: { x: number; y: number } | null) => {
    if (!p1 || !p2) return false;
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return dx < 3.5 && dy < 3.5;
  };

  let baseLabel = { position: 'top' as LabelPosition, dy: -20 };
  let playerTwoLabel = { position: 'top' as LabelPosition, dy: -22 };
  let correctPointLabel = { position: 'top' as LabelPosition, dy: -12 };

  // Resolve base vs playerTwo conflict
  if (arePointsClose(basePoint, playerTwoPoint)) {
    playerTwoLabel = { position: 'bottom', dy: 28 };
  }

  // Resolve correct point conflicts
  if (correctSymmetricPoint && gameStatus === 'result' && !isHit) {
    const isCloseToBase = arePointsClose(correctSymmetricPoint, basePoint);
    const isCloseToP2 = arePointsClose(correctSymmetricPoint, playerTwoPoint);

    if (isCloseToBase && baseLabel.position === 'top') {
      // Base is top, so correct must go bottom.
      correctPointLabel = { position: 'bottom', dy: 20 };
    } else if (isCloseToP2 && playerTwoLabel.position === 'top') {
      // P2 is top, so correct must go bottom.
      correctPointLabel = { position: 'bottom', dy: 20 };
    }
    
    // If the resolved position of 'correct' conflicts with the resolved position of 'playerTwo'.
    // This happens if basePoint is far away, but p2 and correct are close (both would try for 'top').
    // Or if all three are close, base is top, p2 is bottom, and correct also wants to be bottom.
    if (isCloseToP2 && correctPointLabel.position === playerTwoLabel.position) {
       // Conflict! They both want 'top' or 'bottom'.
       // Let P2 keep its spot, and force 'correct' to the opposite side.
       if (playerTwoLabel.position === 'top') {
          correctPointLabel = { position: 'bottom', dy: 20 };
       } else { // playerTwoLabel.position is 'bottom'
          correctPointLabel = { position: 'top', dy: -12 };
       }
    }
  }
  // --- End of Smart Label Logic ---

  return (
    <div className="missile-chart-container bg-slate-200/60 dark:bg-gray-900/80 backdrop-blur-sm p-4 rounded-lg border border-stone-500/40 dark:border-green-500/50 shadow-lg w-full h-full shadow-stone-500/20 dark:shadow-green-500/20 flex items-center justify-center">
      <div className="w-full max-h-full aspect-square">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{
              top: 20,
              right: 30,
              bottom: 20,
              left: 30,
            }}
          >
            <CartesianGrid stroke={gridColor} strokeWidth={1.5} />

            {/* Symmetry Visualization Lines */}
            <Customized
              component={renderSymmetryLines}
              symmetryAxis={symmetryAxis}
              symmetryValue={symmetryValue}
              basePoint={basePoint}
              previewPoint={previewPoint}
              playerTwoPoint={playerTwoPoint}
              playerTwoPreviewPoint={playerTwoPreviewPoint}
              theme={theme}
            />
            
            <XAxis
              type="number"
              dataKey="x"
              name="طول"
              domain={xDomain}
              ticks={xTicks}
              interval={0}
              tickFormatter={(tick) => toPersianDigits(tick)}
              tick={{ fill: axisTextColor, fontSize: 24, dy: 10 }}
              stroke={axisLineColor}
              allowDataOverflow={true}
              axisLine={symmetryAxis === Axis.X && symmetryValue === 0 ? false : { stroke: axisLineColor, strokeWidth: 1.5 }}
            />
              
            <YAxis
              type="number"
              dataKey="y"
              name="عرض"
              domain={yDomain}
              ticks={yTicks}
              interval={0}
              tickFormatter={(tick) => toPersianDigits(tick)}
              tick={{ fill: axisTextColor, fontSize: 24, dx: -25 }}
              stroke={axisLineColor}
              allowDataOverflow={true}
              axisLine={symmetryAxis === Axis.Y && symmetryValue === 0 ? false : { stroke: axisLineColor, strokeWidth: 1.5 }}
            />

            {/* Line of Symmetry */}
            {symmetryAxis === Axis.Y && (
              <ReferenceLine
                x={symmetryValue}
                stroke="#f43f5e"
                strokeWidth={3}
                ifOverflow="visible"
              />
            )}
            {symmetryAxis === Axis.X && (
              <ReferenceLine
                y={symmetryValue}
                stroke="#f43f5e"
                strokeWidth={3}
                ifOverflow="visible"
              />
            )}

            {/* Preview for Player 1's Base */}
            {!basePoint && previewPoint && (
                <ReferenceDot
                    x={previewPoint.x}
                    y={previewPoint.y}
                    r={10}
                    fill={isDark ? 'rgba(248, 113, 113, 0.5)' : 'rgba(220, 38, 38, 0.5)'}
                    ifOverflow="visible"
                    label={{
                        value: `پایگاه`,
                        position: 'top',
                        dy: -20,
                        fill: isDark ? 'rgba(248, 113, 113, 0.6)' : 'rgba(239, 68, 68, 0.6)',
                        fontWeight: 'bold',
                        fontSize: 20,
                        style: { textShadow: `0 0 5px ${isDark ? 'black' : 'rgba(255,255,255,0.7)'}` }
                    }}
                />
            )}

            {/* War Base Point (Player 1) */}
            {basePoint && (
              <ReferenceDot
                x={basePoint.x}
                y={basePoint.y}
                r={showGraphics ? 0 : 8}
                fill={isDark ? '#f87171' : '#dc2626'}
                ifOverflow="visible"
                shape={showGraphics ? (props: any) => <Tank {...props} isDark={isDark} direction={tankDirection} /> : undefined}
                label={{
                  value: `پایگاه`,
                  position: baseLabel.position,
                  dy: baseLabel.dy,
                  fill: '#ef4444',
                  fontWeight: 'bold',
                  fontSize: 20,
                  style: { textShadow: `0 0 5px ${isDark ? 'black' : 'rgba(255,255,255,0.7)'}` }
                }}
              />
            )}

            {/* Preview for Player 2's Shot Point */}
            {!playerTwoPoint && playerTwoPreviewPoint && basePoint && (
                <ReferenceDot
                    x={playerTwoPreviewPoint.x}
                    y={playerTwoPreviewPoint.y}
                    r={10}
                    fill={isDark ? 'rgba(96, 165, 250, 0.5)' : 'rgba(37, 99, 235, 0.5)'}
                    ifOverflow="visible"
                    label={{
                        value: `دیده بان`,
                        position: 'top',
                        dy: -22,
                        fill: isDark ? 'rgba(96, 165, 250, 0.6)' : 'rgba(37, 99, 235, 0.6)',
                        fontWeight: 'bold',
                        fontSize: 20,
                        style: { textShadow: `0 0 5px ${isDark ? 'black' : 'rgba(255,255,255,0.7)'}` }
                    }}
                />
            )}
            
            {/* Player 2's Shot Point */}
            {playerTwoPoint && (
              <ReferenceDot
                x={playerTwoPoint.x}
                y={playerTwoPoint.y}
                r={showGraphics ? 0 : 8}
                fill={isDark ? '#60a5fa' : '#2563eb'}
                ifOverflow="visible"
                shape={showGraphics ? (props: any) => <MissileLauncher {...props} isDark={isDark} direction={launcherDirection} /> : undefined}
                label={{
                  value: `دیده بان`,
                  position: playerTwoLabel.position,
                  dy: playerTwoLabel.dy,
                  fill: '#3b82f6',
                  fontWeight: 'bold',
                  fontSize: 20,
                  style: { textShadow: `0 0 5px ${isDark ? 'black' : 'rgba(255,255,255,0.7)'}` }
                }}
              />
            )}

            {/* Missile Animation */}
            {gameStatus === 'fired' && missilePosition && (
               <ReferenceDot
                x={missilePosition.x}
                y={missilePosition.y}
                r={0}
                ifOverflow="visible"
                shape={(props: any) => <CustomMissile {...props} angle={missileAngle} />}
              />
            )}

            {/* Explosion / Impact Animation */}
            {gameStatus === 'result' && missileTargetPoint && explosionProgress !== null && (
               <ReferenceDot
                  x={missileTargetPoint.x}
                  y={missileTargetPoint.y}
                  r={0}
                  ifOverflow="visible"
                  shape={(props: any) => <CustomExplosion {...props} progress={explosionProgress} isHit={isHit} />}
               />
            )}
            
            {/* Correct Symmetric Point on Miss */}
            {gameStatus === 'result' && !isHit && correctSymmetricPoint && (
               <ReferenceDot
                x={correctSymmetricPoint.x}
                y={correctSymmetricPoint.y}
                r={8}
                fill="#22c55e"
                stroke={isDark ? "#1e293b" : "#f1f5f9"}
                strokeWidth={2}
                ifOverflow="visible"
                label={{
                  value: 'نقطه صحیح',
                  position: correctPointLabel.position,
                  dy: correctPointLabel.dy,
                  fill: isDark ? '#4ade80' : '#16a34a',
                  fontWeight: 'bold',
                  fontSize: 18,
                  style: { textShadow: `0 0 5px ${isDark ? 'black' : 'rgba(255,255,255,0.7)'}` }
                }}
              />
            )}

          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CoordinatePlane;