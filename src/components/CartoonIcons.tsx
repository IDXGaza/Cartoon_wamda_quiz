import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const CartoonStar: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M24 4L30 18H44L33 27L37 42L24 33L11 42L15 27L4 18H18L24 4Z"
      fill="#F5C518" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round"/>
  </svg>
);

export const CartoonGear: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="11" fill="#FFF8E7" stroke="#0D0D0D" strokeWidth="4"/>
    <path d="M24 2V10M24 38V46M2 24H10M38 24H46M8 8L14 14M34 34L40 40M8 40L14 34M34 14L40 8" stroke="#0D0D0D" strokeWidth="5" strokeLinecap="round"/>
    <circle cx="24" cy="24" r="4" fill="#0D0D0D"/>
  </svg>
);

export const CartoonCheck: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="20" fill="#2DAA4F" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M14 24L21 31L34 17" stroke="#FFF8E7" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CartoonAlert: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M24 6L44 40H4L24 6Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round"/>
    <line x1="24" y1="18" x2="24" y2="30" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="24" cy="36" r="2.5" fill="#0D0D0D"/>
  </svg>
);

export const CartoonBook: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M8 6H40V36H8V6Z" fill="#1E6FD9" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M8 36C8 36 8 42 14 42H40V36H8Z" fill="#FFF8E7" stroke="#0D0D0D" strokeWidth="3"/>
    <line x1="14" y1="12" x2="34" y2="12" stroke="#FFF8E7" strokeWidth="3" strokeLinecap="round"/>
    <line x1="14" y1="20" x2="34" y2="20" stroke="#FFF8E7" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

export const CartoonHome: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M24 4L4 20V42H16V30H32V42H44V20L24 4Z" fill="#D93025" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round"/>
  </svg>
);

export const CartoonLock: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="10" y="20" width="28" height="22" rx="4" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M16 20V14C16 9.58172 19.5817 6 24 6C28.4183 6 32 9.58172 32 14V20" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="24" cy="31" r="3" fill="#0D0D0D"/>
  </svg>
);

export const CartoonRocket: React.FC<IconProps> = ({ size = 32, className = '' }) => {
  const [error, setError] = React.useState(false);

  // Path to the user's uploaded logo
  const logoPath = "/input_file_1.png";

  if (error) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M24 4C24 4 14 14 14 28V40H34V28C34 14 24 4 24 4Z" fill="#D93025" stroke="#0D0D0D" strokeWidth="3"/>
        <path d="M14 32L6 40V44H14V40" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3"/>
        <path d="M34 32L42 40V44H34V40" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3"/>
        <circle cx="24" cy="20" r="4" fill="#5BC8F5" stroke="#0D0D0D" strokeWidth="2"/>
      </svg>
    );
  }

  return (
    <img 
      src={logoPath}
      alt="Logo" 
      width={size} 
      height={size} 
      className={`${className} object-contain`}
      onError={() => setError(true)}
    />
  );
};

export const CartoonHexagon: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M24 4L41.3205 14V34L24 44L6.67949 34V14L24 4Z" fill="#1E6FD9" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round"/>
  </svg>
);

export const CartoonGrid: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="6" y="6" width="16" height="16" rx="2" fill="#5BC8F5" stroke="#0D0D0D" strokeWidth="3"/>
    <rect x="26" y="6" width="16" height="16" rx="2" fill="#5BC8F5" stroke="#0D0D0D" strokeWidth="3"/>
    <rect x="6" y="26" width="16" height="16" rx="2" fill="#5BC8F5" stroke="#0D0D0D" strokeWidth="3"/>
    <rect x="26" y="26" width="16" height="16" rx="2" fill="#5BC8F5" stroke="#0D0D0D" strokeWidth="3"/>
  </svg>
);

export const CartoonLightning: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M30 4L10 26H22L18 44L38 22H26L30 4Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round"/>
  </svg>
);

export const CartoonMysteryBox: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Box Body */}
    <rect x="8" y="14" width="32" height="28" rx="4" fill="#F59E0B" stroke="#0D0D0D" strokeWidth="3.5" />
    {/* Box Lid */}
    <rect x="5" y="8" width="38" height="8" rx="2" fill="#D97706" stroke="#0D0D0D" strokeWidth="3.5" />
    {/* Big decorative Question Mark on the chest */}
    <path d="M24 18C26.5 18 28.5 19.5 28.5 22C28.5 24 26.5 25 25 26.5C24 27.5 24 29 24 29" stroke="#FFF" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="24" cy="34" r="2" fill="#FFF" stroke="#0D0D0D" strokeWidth="1" />
    {/* Corner metal plates */}
    <path d="M8 36V42H14" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M40 36V42H34" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Small cartoon sparkles */}
    <path d="M4 18L6 20M42 18L40 20M24 3V5" stroke="#F5C518" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const CartoonTimer: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="26" r="16" fill="#FFF8E7" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M24 10V6M20 4H28" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round"/>
    <path d="M24 26L30 20" stroke="#D93025" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

export const CartoonSilent: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M10 18V30H18L28 40V8L18 18H10Z" fill="#5BC8F5" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round"/>
    <line x1="34" y1="18" x2="44" y2="28" stroke="#D93025" strokeWidth="4" strokeLinecap="round"/>
    <line x1="44" y1="18" x2="34" y2="28" stroke="#D93025" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

export const CartoonBot: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="10" y="14" width="28" height="24" rx="4" fill="#5BC8F5" stroke="#0D0D0D" strokeWidth="3"/>
    <circle cx="18" cy="24" r="3" fill="#0D0D0D"/>
    <circle cx="30" cy="24" r="3" fill="#0D0D0D"/>
    <path d="M18 32H30" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round"/>
    <path d="M24 14V8M20 6H28" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

export const CartoonPencil: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M36 6L42 12L16 38L6 42L10 32L36 6Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round"/>
    <line x1="32" y1="10" x2="38" y2="16" stroke="#0D0D0D" strokeWidth="3"/>
  </svg>
);

export const CartoonPlus: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="20" fill="#2DAA4F" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M24 14V34M14 24H34" stroke="#FFF8E7" strokeWidth="5" strokeLinecap="round"/>
  </svg>
);

export const CartoonTrash: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M10 12H38V40C38 42.2091 36.2091 44 34 44H14C11.7909 44 10 42.2091 10 40V12Z" fill="#D93025" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M8 12H40" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round"/>
    <path d="M18 6H30V12H18V6Z" fill="#FFF8E7" stroke="#0D0D0D" strokeWidth="3"/>
  </svg>
);

export const CartoonShield: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Outer Shield Plate */}
    <path d="M24 4L42 9V22C42 33.6 34.3 41.5 24 44C13.7 41.5 6 33.6 6 22V9L24 4Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="4" strokeLinejoin="round"/>
    {/* Inner Shield Plate */}
    <path d="M24 8L38 12.1V22C38 31.4 31.8 37.8 24 40C16.2 37.8 10 31.4 10 22V12.1L24 8Z" fill="#1E6FD9" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round"/>
    {/* Cross emblem / Shine */}
    <path d="M24 12V36M14 24H34" stroke="#FFF8E7" strokeWidth="4.5" strokeLinecap="round"/>
    <path d="M24 12V36M14 24H34" stroke="#0D0D0D" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const CartoonSnowflake: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="5" fill="#E0F2FE" stroke="#0D0D0D" strokeWidth="3.5"/>
    <path d="M24 4V44M4 24H44M10 10L38 38M10 38L38 10" stroke="#0D0D0D" strokeWidth="4.5" strokeLinecap="round"/>
    <path d="M24 6V42M6 24H42M11 11L37 37M11 37L37 11" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Custom inner ice diamond ring or sparkles */}
    <path d="M20 10L24 14L28 10M20 38L24 34L28 38M10 20L14 24L10 28M38 20L34 24L38 28" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 10L24 14L28 10M20 38L24 34L28 38M10 20L14 24L10 28M38 20L34 24L38 28" stroke="#E0F2FE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const CartoonRefresh: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M40 24C40 32.8366 32.8366 40 24 40C15.1634 40 8 32.8366 8 24C8 15.1634 15.1634 8 24 8V4L30 10L24 16V12C17.3726 12 12 17.3726 12 24C12 30.6274 17.3726 36 24 36C30.6274 36 36 30.6274 36 24H40Z" fill="#5BC8F5" stroke="#0D0D0D" strokeWidth="2"/>
  </svg>
);

export const CartoonX: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="24" r="20" fill="#D93025" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M16 16L32 32M32 16L16 32" stroke="#FFF8E7" strokeWidth="5" strokeLinecap="round"/>
  </svg>
);

export const CartoonEye: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M4 24C4 24 12 10 24 10C36 10 44 24 44 24C44 24 36 38 24 38C12 38 4 24 4 24Z" fill="#FFF8E7" stroke="#0D0D0D" strokeWidth="3"/>
    <circle cx="24" cy="24" r="7" fill="#1E6FD9" stroke="#0D0D0D" strokeWidth="2"/>
    <circle cx="24" cy="24" r="3" fill="#0D0D0D"/>
  </svg>
);

export const CartoonSkip: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M10 10L30 24L10 38V10Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round"/>
    <rect x="34" y="10" width="4" height="28" rx="2" fill="#0D0D0D"/>
  </svg>
);

export const CartoonGhost: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Ghost body with purple gradient look */}
    <path d="M10 40V19C10 11 16.5 5 24 5C31.5 5 38 11 38 19V40L32 34L26 40L20 34L14 40L10 40Z" fill="#C084FC" stroke="#0D0D0D" strokeWidth="4" strokeLinejoin="round"/>
    {/* Spooky cute white sheet shine */}
    <path d="M14 16C14 14 17 10 21 9" stroke="#E9D5FF" strokeWidth="2.5" strokeLinecap="round" />
    {/* Glowing cartoon eyes */}
    <circle cx="18" cy="18" r="5" fill="#FFE066" stroke="#0D0D0D" strokeWidth="3"/>
    <circle cx="30" cy="18" r="5" fill="#FFE066" stroke="#0D0D0D" strokeWidth="3"/>
    <circle cx="18" cy="18" r="1.5" fill="#0D0D0D"/>
    <circle cx="30" cy="18" r="1.5" fill="#0D0D0D"/>
    <path d="M21 26C21 26 22 29 24 29C26 29 27 26 27 26" stroke="#0D0D0D" strokeWidth="3.5" strokeLinecap="round"/>
  </svg>
);

export const CartoonTrophy: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 10H36V22C36 28.6274 30.6274 34 24 34C17.3726 34 12 28.6274 12 22V10Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M12 14H6V22C6 25 8 26 12 26V14Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M36 14H42V22C42 25 40 26 36 26V14Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M18 42H30M24 34V42" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

export const CartoonSearch: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="20" cy="20" r="14" fill="#FFF8E7" stroke="#0D0D0D" strokeWidth="3"/>
    <line x1="30" y1="30" x2="42" y2="42" stroke="#0D0D0D" strokeWidth="5" strokeLinecap="round"/>
  </svg>
);

export const CartoonUser: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="24" cy="16" r="8" fill="#5BC8F5" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M10 40C10 32 16 28 24 28C32 28 38 32 38 40" stroke="#0D0D0D" strokeWidth="3" strokeLinecap="round"/>
  </svg>
);

export const CartoonSparkles: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M24 4L27 15L38 18L27 21L24 32L21 21L10 18L21 15L24 4Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="2"/>
    <path d="M38 30L40 36L46 38L40 40L38 46L36 40L30 38L36 36L38 30Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="2"/>
    <path d="M10 32L11 35L14 36L11 37L10 40L9 37L6 36L9 35L10 32Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="2"/>
  </svg>
);

export const CartoonMusic: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="16" cy="36" r="6" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M22 36V10L40 6V18L22 22" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="34" cy="32" r="6" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3"/>
    <path d="M40 32V6" stroke="#0D0D0D" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

export const CartoonRabbit: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Body */}
    <path d="M24 44C34 44 42 36 42 26C42 16 34 8 24 8C14 8 6 16 6 26C6 36 14 44 24 44Z" fill="#E5E7EB" stroke="#0D0D0D" strokeWidth="3.5" />
    {/* Ears */}
    <path d="M16 10C16 10 12 2 15 2C18 2 21 10 21 10" fill="#F9A8D4" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round" />
    <path d="M32 10C32 10 36 2 33 2C30 2 27 10 27 10" fill="#F9A8D4" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round" />
    {/* Face */}
    <circle cx="18" cy="24" r="2.5" fill="#0D0D0D" />
    <circle cx="30" cy="24" r="2.5" fill="#0D0D0D" />
    <path d="M22 30C22 30 23 32 24 32C25 32 26 30 26 30" stroke="#0D0D0D" strokeWidth="2.5" strokeLinecap="round" />
    {/* Nose */}
    <circle cx="24" cy="27" r="1.5" fill="#F472B6" />
  </svg>
);

export const CartoonTurtle: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Legs */}
    <rect x="10" y="32" width="6" height="8" rx="2" fill="#10B981" stroke="#0D0D0D" strokeWidth="2.5" />
    <rect x="32" y="32" width="6" height="8" rx="2" fill="#10B981" stroke="#0D0D0D" strokeWidth="2.5" />
    {/* Shell */}
    <circle cx="24" cy="26" r="16" fill="#78350F" stroke="#0D0D0D" strokeWidth="3.5" />
    <path d="M14 20C14 20 24 12 34 20" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    <path d="M14 32C14 32 24 40 34 32" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
    {/* Head */}
    <path d="M34 22C34 22 44 22 44 28C44 34 38 34 34 34" fill="#10B981" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round" />
    <circle cx="40" cy="26" r="1.5" fill="#0D0D0D" />
  </svg>
);

export const CartoonZap: React.FC<IconProps> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M30 4L10 26H22L18 44L38 22H26L30 4Z" fill="#F5C518" stroke="#0D0D0D" strokeWidth="3" strokeLinejoin="round"/>
  </svg>
);
