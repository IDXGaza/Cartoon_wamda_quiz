import React, { useCallback } from 'react';
import { motion } from 'motion/react';
import { playSound } from '../utils/sound';
import { Question, Player } from '../types';
import HexCell from './HexCell';

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
  const [scale, setScale] = React.useState(0.6);

  React.useLayoutEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 380) {
        setScale(0.28);
      } else if (width < 480) {
        setScale(0.33);
      } else if (width < 640) {
        setScale(0.4);
      } else if (width < 1024) {
        setScale(0.55);
      } else if (width < 1280) {
        setScale(0.63);
      } else {
        setScale(0.7);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hexWidth = 130 * scale;
  const hexHeight = 150 * scale;
  const hexHorizontalSpacing = 128 * scale; 
  const hexVerticalSpacing = 110 * scale;    
  const hexHalfWidth = hexWidth / 2;
  const hexHalfHeight = hexHeight / 2;
  const rowSizes = [6, 5, 6, 5, 6];

  // Calculate viewBox based on exact grid boundaries to make the letters grid touch the screen borders
  const minX = -hexHorizontalSpacing;
  const maxX = 6 * hexHorizontalSpacing + hexWidth;
  const minY = -hexVerticalSpacing;
  const maxY = 5 * hexVerticalSpacing + hexHeight;

  // Small margin to avoid stroke/shadow clipping
  const margin = 8 * scale;
  const viewBoxX = minX - margin;
  const viewBoxY = minY - margin;
  const viewBoxWidth = maxX - minX + (margin * 2);
  const viewBoxHeight = maxY - minY + (margin * 2);

  const points = `${hexHalfWidth},0 ${hexWidth},${hexHeight * 0.25} ${hexWidth},${hexHeight * 0.75} ${hexHalfWidth},${hexHeight} 0,${hexHeight * 0.75} 0,${hexHeight * 0.25}`;

  const memoizedHandleClick = useCallback((q: Question) => {
    playSound('click');
    handleHexClick(q);
  }, [handleHexClick]);

  return (
    <div className="flex rtl:justify-end ltr:justify-start justify-end items-center w-full h-auto overflow-hidden select-none">
      <svg 
        viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`} 
        className="w-full max-w-none max-h-[82vh] sm:max-h-[86vh] xl:max-h-[90vh] h-auto hex-svg-container drop-shadow-2xl overflow-visible rtl:mr-auto rtl:ml-0 ltr:ml-auto ltr:mr-0 xl:mr-auto xl:ml-0"
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
              className="goal-hex"
              style={{ 
                fill: players[1].color, 
                stroke: players[1].color, 
                strokeWidth: 5 * scale,
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
              className="goal-hex"
              style={{ 
                fill: players[1].color, 
                stroke: players[1].color, 
                strokeWidth: 5 * scale,
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
                className="goal-hex"
                style={{ 
                  fill: players[0].color, 
                  stroke: players[0].color, 
                  strokeWidth: 5 * scale,
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
                className="goal-hex"
                style={{ 
                  fill: players[0].color, 
                  stroke: players[0].color, 
                  strokeWidth: 5 * scale,
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
            const isWinning = winningPath.includes(q.id);

            return (
              <g key={q.id} transform={`translate(${x}, ${y})`}>
                <HexCell
                  question={q}
                  color={color}
                  isPlayer0={isPlayer0}
                  isPlayer1={isPlayer1}
                  isSkipped={isSkipped}
                  isWinning={isWinning}
                  points={points}
                  hexHalfWidth={hexHalfWidth}
                  hexHalfHeight={hexHalfHeight}
                  scale={scale}
                  frozen={frozenCells[q.id] || 0}
                  shielded={!!shieldedCells[q.id]}
                  handleHexClick={memoizedHandleClick}
                  rIdx={rIdx}
                  cIdx={cIdx}
                />
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
};

export default HexGrid;
