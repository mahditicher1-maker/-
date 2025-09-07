import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { Axis } from '../types';

interface CoordinatePlaneProps {
  symmetryAxis: Axis;
  symmetryValue: number;
  basePoint: { x: number; y: number } | null;
  playerTwoPoint: { x: number; y: number } | null;
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
    const translateX = direction === 'left' ? cx + 12 : cx - 12;

    return (
        <g transform={`translate(${translateX}, ${cy - 8}) scale(${scaleX}, 1) scale(1.2)`}>
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
    const translateX = direction === 'left' ? cx + 12 : cx - 12;
    
    return (
        <g transform={`translate(${translateX}, ${cy - 11}) scale(${scaleX}, 1) scale(1.1)`}>
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

  // SVG path for the missile shape. Centered at (0,0).
  const missilePath = "M-12 6 L0 -14 L12 6 C8 10, -8 10, -12 6 Z";
  const flamePath = "M-7 6 C-4 15, 4 15, 7 6 C 5 6, -5 6, -7 6 Z";
  
  // Add 90 degrees because the missile shape is drawn pointing upwards.
  const rotation = angle + 90;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
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

    const color = isHit ? '#22c55e' : '#ef4444';
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
            <polygon points={points} fill={color} />
            <circle cx={x} cy={y} r={currentRadius / 2.5} fill="white" />
        </g>
    );
};

// Ticks array is defined outside the component to prevent re-creation on each render.
const ticks = Array.from({ length: 21 }, (_, i) => i);

// FIX: Define LabelPosition as it is not exported from recharts.
type LabelPosition = 'top' | 'bottom' | 'insideBottom' | 'insideLeft' | 'insideRight';

const CoordinatePlane: React.FC<CoordinatePlaneProps> = ({ 
  symmetryAxis, 
  symmetryValue, 
  basePoint,
  playerTwoPoint,
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
}) => {
  const domain: [number, number] = [0, 20];
  const isDark = theme === 'dark';

  // Theme-based colors
  const gridColor = isDark ? 'rgba(74, 222, 128, 0.2)' : 'rgba(120, 113, 108, 0.2)'; // stone-500
  const axisTextColor = isDark ? '#94a3b8' : '#57534e'; // stone-600
  const axisLineColor = isDark ? '#64748b' : '#a8a29e'; // stone-400
  const axisLabelColor = isDark ? '#64748b' : '#78716c'; // stone-500

  // --- Smart Label Positioning Logic ---
  const arePointsClose = (p1: {x:number, y:number}, p2: {x:number, y:number} | null) => {
    if (!p2) return false;
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return dx < 3 && dy < 3;
  };

  const baseLabel: { position: LabelPosition; dy: number } = { position: 'top', dy: -20 };
  
  let playerTwoLabel: { position: LabelPosition, dy: number } = { position: 'top', dy: -22 };
  if (basePoint && arePointsClose(basePoint, playerTwoPoint)) {
      playerTwoLabel = { position: 'bottom', dy: 28 };
  }
  
  let correctPointLabel: { position: LabelPosition, dy: number } = { position: 'top', dy: -12 };
  if (correctSymmetricPoint) {
      if (arePointsClose(correctSymmetricPoint, basePoint)) {
          correctPointLabel = { position: 'bottom', dy: 20 };
      }
      if (playerTwoLabel.position === 'top' && arePointsClose(correctSymmetricPoint, playerTwoPoint)) {
        correctPointLabel = { position: 'bottom', dy: 20 };
      }
  }
  // --- End of Smart Label Logic ---

  return (
    <div className="missile-chart-container bg-slate-200/60 dark:bg-slate-900/70 backdrop-blur-sm p-4 rounded-lg border border-stone-500/30 dark:border-green-500/30 shadow-lg w-full aspect-square max-w-2xl mx-auto shadow-stone-500/10 dark:shadow-green-500/10">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{
            top: 25,
            right: 25,
            bottom: 25,
            left: 25,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          
          <XAxis
            type="number"
            dataKey="x"
            name="طول"
            domain={domain}
            ticks={ticks}
            interval={0}
            tickFormatter={(tick) => toPersianDigits(tick)}
            tick={{ fill: axisTextColor, fontSize: 10, dy: 5 }}
            label={{ value: 'محور طول', position: 'insideBottom', offset: -5, dy:10, fill: axisLabelColor }}
            stroke={axisLineColor}
            allowDataOverflow={true}
            axisLine={{ stroke: axisLineColor, strokeWidth: 1.5 }}
          />
            
          <YAxis
            type="number"
            dataKey="y"
            name="عرض"
            domain={domain}
            ticks={ticks}
            interval={0}
            tickFormatter={(tick) => toPersianDigits(tick)}
            tick={{ fill: axisTextColor, fontSize: 12, dx: -10 }}
            label={{ value: 'محور عرض', angle: -90, position: 'insideLeft', offset: 0, dx: -5, fill: axisLabelColor, style: {textAnchor: 'middle'} }}
            stroke={axisLineColor}
            allowDataOverflow={true}
            axisLine={{ stroke: axisLineColor, strokeWidth: 1.5 }}
          />

          {/* Line of Symmetry */}
          {symmetryAxis === Axis.Y && (
            <ReferenceLine
              x={symmetryValue}
              stroke="#f43f5e"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: `طول = ${toPersianDigits(symmetryValue)}`, position: 'top', fill: '#f43f5e', fontWeight: 'bold' }}
              ifOverflow="visible"
            />
          )}
          {symmetryAxis === Axis.X && (
            <ReferenceLine
              y={symmetryValue}
              stroke="#f43f5e"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ value: `عرض = ${toPersianDigits(symmetryValue)}`, position: 'insideRight', fill: '#f43f5e', fontWeight: 'bold' }}
              ifOverflow="visible"
            />
          )}

          {/* War Base Point (Player 1) */}
          {basePoint && (
            <ReferenceDot
              x={basePoint.x}
              y={basePoint.y}
              r={showGraphics ? 0 : 8}
              fill={isDark ? '#4ade80' : '#44403c'}
              ifOverflow="visible"
              shape={showGraphics ? <Tank isDark={isDark} direction={tankDirection} /> : undefined}
              label={{
                value: `پایگاه ۱ (${toPersianDigits(basePoint.x)}, ${toPersianDigits(basePoint.y)})`,
                position: baseLabel.position,
                dy: baseLabel.dy,
                fill: isDark ? '#4ade80' : '#44403c', // stone-700
                fontWeight: 'bold',
                fontSize: 12,
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
              fill={isDark ? '#fbbf24' : '#d97706'}
              ifOverflow="visible"
              shape={showGraphics ? <MissileLauncher isDark={isDark} direction={launcherDirection} /> : undefined}
              label={{
                value: `شلیک ۲ (${toPersianDigits(playerTwoPoint.x)}, ${toPersianDigits(playerTwoPoint.y)})`,
                position: playerTwoLabel.position,
                dy: playerTwoLabel.dy,
                fill: isDark ? '#fbbf24' : '#d97706',
                fontWeight: 'bold',
                fontSize: 12,
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
              shape={<CustomMissile angle={missileAngle} />}
            />
          )}

          {/* Explosion / Impact Animation */}
          {gameStatus === 'result' && missileTargetPoint && explosionProgress !== null && (
             <ReferenceDot
                x={missileTargetPoint.x}
                y={missileTargetPoint.y}
                r={0}
                ifOverflow="visible"
                shape={<CustomExplosion progress={explosionProgress} isHit={isHit} />}
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
                value: 'هدف صحیح',
                position: correctPointLabel.position,
                dy: correctPointLabel.dy,
                fill: isDark ? '#4ade80' : '#16a34a',
                fontWeight: 'bold',
                fontSize: 12,
                style: { textShadow: `0 0 5px ${isDark ? 'black' : 'rgba(255,255,255,0.7)'}` }
              }}
            />
          )}

        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CoordinatePlane;