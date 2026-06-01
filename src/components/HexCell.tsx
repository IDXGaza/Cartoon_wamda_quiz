import React from 'react';
import { motion } from 'motion/react';
import { playSound } from '../utils/sound';
import { CartoonSnowflake, CartoonShield } from './CartoonIcons';
import { Question } from '../types';

interface HexCellProps {
  question: Question;
  color: string;
  isPlayer0: boolean;
  isPlayer1: boolean;
  isSkipped: boolean;
  isWinning: boolean;
  points: string; // The polygon points
  hexHalfWidth: number;
  hexHalfHeight: number;
  scale: number;
  frozen: number;
  shielded: boolean;
  handleHexClick: (q: Question) => void;
  rIdx: number;
  cIdx: number;
}

const HexCell: React.FC<HexCellProps> = React.memo(({
  question,
  color,
  isPlayer0,
  isPlayer1,
  isSkipped,
  isWinning,
  points,
  hexHalfWidth,
  hexHalfHeight,
  scale,
  frozen,
  shielded,
  handleHexClick,
  rIdx,
  cIdx
}) => {
  const activeClass = isSkipped ? 'opacity-40 grayscale' : '';
  
  let polygonStyle: React.CSSProperties = { 
    fill: color || '#FFFFFF', 
    stroke: '#000000', 
    strokeWidth: 5 * scale 
  };

  return (
    <motion.g 
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: (rIdx * 0.05) + (cIdx * 0.03), type: 'spring' }}
      className={`hex-group ${activeClass} ${isWinning ? 'animate-win-pulse' : ''} cursor-pointer transition-all duration-300`}
      onClick={() => {
        playSound('click');
        handleHexClick(question);
      }}
      style={{ transformOrigin: `${hexHalfWidth}px ${hexHalfHeight}px` }}
    >
      <polygon 
        points={points} 
        className={`hex-polygon transition-all duration-300 ${frozen > 0 ? 'stroke-blue-400' : ''} ${shielded ? 'stroke-emerald-400' : ''}`} 
        style={{
          ...polygonStyle,
          strokeWidth: (frozen > 0 || shielded) ? 15 * scale : 5 * scale,
          fill: frozen > 0 ? `${polygonStyle.fill}88` : polygonStyle.fill,
          filter: (frozen > 0 || shielded) ? `drop-shadow(0 0 ${15 * scale}px currentColor)` : 'none'
        }} 
      />
      
      <g transform={`translate(${hexHalfWidth}, ${hexHalfHeight})`}>
        <text 
          className="font-display text-4xl md:text-6xl select-none"
          style={{ 
            fill: '#000000', 
            opacity: 0.3,
            transform: `translate(${4 * scale}px, ${4 * scale}px)`
          }} 
          dominantBaseline="middle" 
          textAnchor="middle"
        >
          {question.letter?.replace(/[\u0640]/g, '')}
        </text>
        <text 
          className="font-display text-4xl md:text-6xl select-none"
          style={{ 
            fill: isPlayer0 || isPlayer1 ? '#FFFFFF' : '#6B46C1',
            stroke: '#FFFFFF',
            strokeWidth: 3 * scale,
            paintOrder: 'stroke'
          }} 
          dominantBaseline="middle" 
          textAnchor="middle"
        >
          {question.letter?.replace(/[\u0640]/g, '')}
        </text>
      </g>
      
      {frozen > 0 && (
        <motion.g animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: `${hexHalfWidth}px ${hexHalfHeight}px` }}>
          <g transform={`translate(${hexHalfWidth - 35 * scale}, ${hexHalfHeight - 35 * scale})`}>
            <CartoonSnowflake className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.9)]" size={70 * scale} />
          </g>
        </motion.g>
      )}
      {shielded && (
        <motion.g animate={{ y: [0, -10 * scale, 0], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ transformOrigin: `${hexHalfWidth}px ${hexHalfHeight}px` }}>
          <g transform={`translate(${hexHalfWidth - 35 * scale}, ${hexHalfHeight - 35 * scale})`}>
            <CartoonShield className="text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.9)]" size={70 * scale} />
          </g>
        </motion.g>
      )}
    </motion.g>
  );
});

export default HexCell;
