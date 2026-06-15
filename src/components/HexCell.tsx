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
        className="hex-polygon transition-all duration-300" 
        style={{
          ...polygonStyle,
          strokeWidth: 5 * scale,
          fill: color || '#FFFFFF',
        }} 
      />

      {/* Clean & Satisfying Glowing Outline for Shielded Cells */}
      {shielded && (
        <polygon 
          points={points} 
          fill="none"
          stroke="#10B981"
          strokeWidth={8 * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none animate-[pulse_2s_infinite]"
          style={{
            filter: `drop-shadow(0 0 ${6 * scale}px rgba(16, 185, 129, 0.8))`
          }}
        />
      )}

      {/* Clean & Satisfying Glowing Outline for Frozen Cells */}
      {frozen > 0 && (
        <polygon 
          points={points} 
          fill="none"
          stroke="#0EA5E9"
          strokeWidth={8 * scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none animate-[pulse_1.5s_infinite]"
          style={{
            filter: `drop-shadow(0 0 ${6 * scale}px rgba(14, 165, 233, 0.8))`
          }}
        />
      )}
      
      <g transform={`translate(${hexHalfWidth}, ${hexHalfHeight})`}>
         <text 
          className="font-display select-none"
          style={{ 
            fill: '#000000', 
            opacity: 0.3,
            transform: `translate(${4 * scale}px, ${4 * scale}px)`,
            fontSize: `${72 * scale}px`,
            fontWeight: '900'
          }} 
          dominantBaseline="middle" 
          textAnchor="middle"
        >
          {question.letter?.replace(/[\u0640]/g, '')}
        </text>
        <text 
          className="font-display select-none"
          style={{ 
            fill: isPlayer0 || isPlayer1 ? '#FFFFFF' : '#6B46C1',
            stroke: '#FFFFFF',
            strokeWidth: 3 * scale,
            paintOrder: 'stroke',
            fontSize: `${72 * scale}px`,
            fontWeight: '900'
          }} 
          dominantBaseline="middle" 
          textAnchor="middle"
        >
          {question.letter?.replace(/[\u0640]/g, '')}
        </text>
      </g>
      
      {/* Corner Badges for active powers that do not block the letter */}
      {shielded && (
        <g transform={`translate(${8 * scale}, ${15 * scale})`} className="pointer-events-none">
          <circle cx={14 * scale} cy={14 * scale} r={14 * scale} fill="#ECFDF5" stroke="#0D0D0D" strokeWidth={2.5 * scale} className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" />
          <g transform={`translate(${5 * scale}, ${5 * scale})`}>
            <CartoonShield size={18 * scale} className="text-emerald-500" />
          </g>
        </g>
      )}

      {frozen > 0 && (
        <g 
          transform={`translate(${130 * scale - (14 * 2 + 8) * scale + 14 * scale}, ${15 * scale + 14 * scale})`} 
          className="pointer-events-none"
        >
          <circle 
            r={14 * scale} 
            fill="#E0F2FE" 
            stroke="#0D0D0D" 
            strokeWidth={2.5 * scale} 
            className="filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" 
          />
          <motion.g 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
          >
            <g transform={`translate(${-10 * scale}, ${-10 * scale})`}>
              <CartoonSnowflake size={20 * scale} className="text-blue-500" />
            </g>
          </motion.g>
        </g>
      )}
    </motion.g>
  );
});

export default HexCell;
