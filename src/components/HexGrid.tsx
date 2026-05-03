import React from 'react';
import { motion } from 'framer-motion';
import { playSound } from '../utils/sound';
import { CartoonSnowflake, CartoonShield } from './CartoonIcons';
import { Question, Player, PowerType } from '../types';

interface HexGridProps {
  grid: Question[][];
  players: Player[];
  currentPlayerIndex: number;
  answeredMap: Record<string, string>;
  winningPath: string[];
  frozenCells: Record<string, number>;
  shieldedCells: Record<string, boolean>;
  stolenCells: Record<string, boolean>;
  handleHexClick: (q: Question) => void;
}

const HexGrid: React.FC<HexGridProps> = ({
  grid,
  players,
  currentPlayerIndex,
  answeredMap,
  winningPath,
  frozenCells,
  shieldedCells,
  stolenCells,
  handleHexClick,
}) => {
  const scale = 0.7;
  const hexWidth = 130 * scale;
  const hexHeight = 150 * scale;
  const hexHorizontalSpacing = 128 * scale; 
  const hexVerticalSpacing = 110 * scale;    
  const hexHalfWidth = hexWidth / 2;
  const hexHalfHeight = hexHeight / 2;

  // Calculate viewBox based on grid dimensions + borders
  const rowSizes = [6, 5, 6, 5, 6];
  const maxCols = 6;
  const viewBoxWidth = (maxCols + 1) * hexHorizontalSpacing;
  const viewBoxHeight = (rowSizes.length + 1) * hexVerticalSpacing + (40 * scale);

  const points = `${hexHalfWidth},0 ${hexWidth},${hexHeight * 0.25} ${hexWidth},${hexHeight * 0.75} ${hexHalfWidth},${hexHeight} 0,${hexHeight * 0.75} 0,${hexHeight * 0.25}`;

  return (
    <div className="relative w-full max-w-[min(95vw,900px)] mx-auto overflow-visible">
      <svg 
        viewBox={`-${80 * scale} -${100 * scale} ${viewBoxWidth + (160 * scale)} ${viewBoxHeight + (200 * scale)}`} 
        className="w-full h-auto hex-svg-container drop-shadow-2xl overflow-visible"
      >
        <defs>
          <filter id="scribble-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={4 * scale} />
          </filter>
        </defs>

        {/* --- Goal Borders (Connected Hexes) --- */}
        
        {/* Top Border (Green - Player 1) */}
        {Array.from({ length: 7 }).map((_, i) => (
          <g key={`top-${i}`} transform={`translate(${(i - 1) * hexHorizontalSpacing + hexHalfWidth}, ${-hexVerticalSpacing})`}>
            <polygon 
              points={points} 
              className={`goal-hex ${currentPlayerIndex === 1 ? 'animate-pulse' : ''}`}
              style={{ 
                fill: players[1].color, 
                stroke: players[1].color, 
                strokeWidth: currentPlayerIndex === 1 ? 10 * scale : 5 * scale,
                strokeLinejoin: 'round'
              }} 
            />
          </g>
        ))}

        {/* Bottom Border (Green - Player 1) */}
        {Array.from({ length: 7 }).map((_, i) => (
          <g key={`bottom-${i}`} transform={`translate(${(i - 1) * hexHorizontalSpacing + hexHalfWidth}, ${5 * hexVerticalSpacing})`}>
            <polygon 
              points={points} 
              className={`goal-hex ${currentPlayerIndex === 1 ? 'animate-pulse' : ''}`}
              style={{ 
                fill: players[1].color, 
                stroke: players[1].color, 
                strokeWidth: currentPlayerIndex === 1 ? 10 * scale : 5 * scale,
                strokeLinejoin: 'round'
              }} 
            />
          </g>
        ))}

        {/* Left Border (Red - Player 0) */}
        {rowSizes.map((_, rIdx) => {
          const xOffset = (rIdx % 2 === 1) ? hexHalfWidth : 0;
          return (
            <g key={`left-${rIdx}`} transform={`translate(${-hexHorizontalSpacing + xOffset}, ${rIdx * hexVerticalSpacing})`}>
              <polygon 
                points={points} 
                className={`goal-hex ${currentPlayerIndex === 0 ? 'animate-pulse' : ''}`}
                style={{ 
                  fill: players[0].color, 
                  stroke: players[0].color, 
                  strokeWidth: currentPlayerIndex === 0 ? 10 * scale : 5 * scale,
                  strokeLinejoin: 'round'
                }} 
              />
            </g>
          );
        })}

        {/* Right Border (Red - Player 0) */}
        {rowSizes.map((size, rIdx) => {
          const xOffset = (rIdx % 2 === 1) ? hexHalfWidth : 0;
          return (
            <g key={`right-${rIdx}`} transform={`translate(${size * hexHorizontalSpacing + xOffset}, ${rIdx * hexVerticalSpacing})`}>
              <polygon 
                points={points} 
                className={`goal-hex ${currentPlayerIndex === 0 ? 'animate-pulse' : ''}`}
                style={{ 
                  fill: players[0].color, 
                  stroke: players[0].color, 
                  strokeWidth: currentPlayerIndex === 0 ? 10 * scale : 5 * scale,
                  strokeLinejoin: 'round'
                }} 
              />
            </g>
          );
        })}

        {/* --- Main Grid --- */}
        {grid.map((row, rIdx) => {
          const isOddRow = rIdx % 2 === 1;
          const xOffset = isOddRow ? hexHorizontalSpacing / 2 : 0;
          const y = rIdx * hexVerticalSpacing;

          return row.map((q, cIdx) => {
            const x = cIdx * hexHorizontalSpacing + xOffset;
            const color = answeredMap[q.id];
            
            const isPlayer0 = color?.toLowerCase() === players[0]?.color.toLowerCase();
            const isPlayer1 = color?.toLowerCase() === players[1]?.color.toLowerCase();
            const isSkipped = color === '#475569';
            const activeClass = isSkipped ? 'opacity-40 grayscale' : '';
            const isWinning = winningPath.includes(q.id);
            
            let polygonStyle: React.CSSProperties = { 
              fill: color || '#FFFFFF', 
              stroke: '#000000', 
              strokeWidth: 5 * scale 
            };

            return (
              <g key={q.id} transform={`translate(${x}, ${y})`}>
                <motion.g 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (rIdx * 0.05) + (cIdx * 0.03), type: 'spring' }}
                  className={`hex-group ${activeClass} ${isWinning ? 'animate-win-pulse' : ''} cursor-pointer transition-all duration-300`}
                  onClick={() => {
                    playSound('click');
                    handleHexClick(q);
                  }}
                  style={{ transformOrigin: `${hexHalfWidth}px ${hexHalfHeight}px` }}
                >
                  <polygon 
                    points={points} 
                    className={`hex-polygon transition-all duration-300 ${frozenCells[q.id] > 0 ? 'stroke-blue-400' : ''} ${shieldedCells[q.id] ? 'stroke-emerald-400' : ''}`} 
                    style={{
                      ...polygonStyle,
                      strokeWidth: (frozenCells[q.id] > 0 || shieldedCells[q.id]) ? 15 * scale : 5 * scale,
                      fill: frozenCells[q.id] > 0 ? `${polygonStyle.fill}88` : polygonStyle.fill,
                      filter: (frozenCells[q.id] > 0 || shieldedCells[q.id]) ? `drop-shadow(0 0 ${15 * scale}px currentColor)` : 'none'
                    }} 
                  />
                  
                  {/* Bubbly Letter Styling */}
                  <g transform={`translate(${hexHalfWidth}, ${hexHalfHeight})`}>
                    <text 
                      className="font-display text-6xl select-none"
                      style={{ 
                        fill: '#000000', 
                        opacity: 0.3,
                        transform: `translate(${4 * scale}px, ${4 * scale}px)`
                      }} 
                      dominantBaseline="middle" 
                      textAnchor="middle"
                    >
                      {q.letter}
                    </text>
                    <text 
                      className="font-display text-6xl select-none"
                      style={{ 
                        fill: isPlayer0 || isPlayer1 ? '#FFFFFF' : '#6B46C1',
                        stroke: '#FFFFFF',
                        strokeWidth: 3 * scale,
                        paintOrder: 'stroke'
                      }} 
                      dominantBaseline="middle" 
                      textAnchor="middle"
                    >
                      {q.letter}
                    </text>
                  </g>
                  
                  {frozenCells[q.id] > 0 && (
                    <motion.g animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: `${hexHalfWidth}px ${hexHalfHeight}px` }}>
                      <foreignObject x={15 * scale} y={25 * scale} width={100 * scale} height={100 * scale}>
                        <div className="flex items-center justify-center w-full h-full">
                          <CartoonSnowflake className="w-full h-full text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.9)]" style={{ width: 70 * scale, height: 70 * scale }} />
                        </div>
                      </foreignObject>
                    </motion.g>
                  )}
                  {shieldedCells[q.id] && (
                    <motion.g animate={{ y: [0, -10 * scale, 0], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ transformOrigin: `${hexHalfWidth}px ${hexHalfHeight}px` }}>
                      <foreignObject x={15 * scale} y={25 * scale} width={100 * scale} height={100 * scale}>
                        <div className="flex items-center justify-center w-full h-full">
                          <CartoonShield className="w-full h-full text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.9)]" style={{ width: 70 * scale, height: 70 * scale }} />
                        </div>
                      </foreignObject>
                    </motion.g>
                  )}
                  {/* Cell is now just colored by polygonStyle.fill */}
                </motion.g>
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
};

export default HexGrid;
