const PALETTE = [
  'bg-blue-100 border-blue-400 text-blue-800',
  'bg-purple-100 border-purple-400 text-purple-800',
  'bg-green-100 border-green-400 text-green-800',
  'bg-amber-100 border-amber-400 text-amber-800',
  'bg-pink-100 border-pink-400 text-pink-800',
  'bg-teal-100 border-teal-400 text-teal-800',
  'bg-orange-100 border-orange-400 text-orange-800',
  'bg-indigo-100 border-indigo-400 text-indigo-800',
];

// Hex versions matching the Tailwind 400 shades above (for SVG / canvas use)
const PALETTE_HEX = [
  '#60a5fa', // blue-400
  '#a78bfa', // purple-400
  '#4ade80', // green-400
  '#fbbf24', // amber-400
  '#f472b6', // pink-400
  '#2dd4bf', // teal-400
  '#fb923c', // orange-400
  '#818cf8', // indigo-400
];

function featureHash(featureId: string): number {
  let hash = 0;
  for (let i = 0; i < featureId.length; i++) {
    hash = (hash * 31 + featureId.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

export function featureColor(featureId: string): string {
  return PALETTE[featureHash(featureId) % PALETTE.length];
}

export function featureColorHex(featureId: string): string {
  return PALETTE_HEX[featureHash(featureId) % PALETTE_HEX.length];
}

/** Preset hex colors for the feature color picker (matching the algorithmic palette). */
export const FEATURE_COLOR_PRESETS = PALETTE_HEX;

/**
 * Returns inline CSS styles for a feature badge given a hex color.
 * Background is 10% opacity, border and text use the full color.
 */
export function featureBadgeStyle(hexColor: string): Record<string, string> {
  return {
    backgroundColor: hexColor + '1A',
    borderColor: hexColor,
    color: hexColor,
  };
}

/**
 * Returns the effective hex color for a feature.
 * Uses stored color when available, falls back to algorithmic hash.
 */
export function resolveFeatureHex(featureId: string, storedColor?: string | null): string {
  if (storedColor) return storedColor;
  return PALETTE_HEX[featureHash(featureId) % PALETTE_HEX.length];
}
