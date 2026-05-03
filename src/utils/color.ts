
/**
 * Calculates the luminance of a hex color and returns true if it's "dark".
 * Useful for determining if text on top should be white or black.
 */
export const isColorDark = (color: string): boolean => {
  if (!color) return false;
  
  // Handle named colors if any (rare in this app except maybe 'black')
  if (color.toLowerCase() === 'black' || color.toLowerCase() === 'navy') return true;
  if (color.toLowerCase() === 'white' || color.toLowerCase() === 'yellow') return false;

  const hex = color.replace('#', '');
  if (hex.length !== 6 && hex.length !== 3) return false;

  let r, g, b;
  if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    r = parseInt(hex.substring(0, 1).repeat(2), 16);
    g = parseInt(hex.substring(1, 2).repeat(2), 16);
    b = parseInt(hex.substring(2, 3).repeat(2), 16);
  }

  // standard luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55; // threshold for dark
};
