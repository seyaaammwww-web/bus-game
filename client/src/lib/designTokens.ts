import type { Category } from '@shared/schema';

export const brand = {
  primary: '#6714A8',
  primaryLight: '#871BB7',
  primaryDark: '#350D7A',
  primaryDarker: '#350D7A',
  cream: '#FFFDD1',
  creamAlt: '#FEFADE',
  gold: '#FFA168',
  goldDark: '#FF8A50',
} as const;

export const elevationShadow = 'shadow-card';
export const elevationShadowSm = 'shadow-sm';
export const elevationShadowHover = 'shadow-card-hover';
export const cardBorder = 'border border-purple-200/50';

/** @deprecated use elevationShadow */
export const pixelShadow = elevationShadow;
/** @deprecated use elevationShadow */
export const pixelShadowSm = 'shadow-sm';
/** @deprecated use cardBorder */
export const pixelBorder = cardBorder;

export const defaultAvatar = (seed: string) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`;

export const categoryGradients: Record<Category, string> = {
  'ولد': 'category-boy',
  'بنت': 'category-girl',
  'بلد': 'category-country',
  'حيوان': 'category-animal',
  'جماد': 'category-thing',
};

export const rankStyles = {
  gold: 'bg-gradient-to-br from-amber-300 to-yellow-500 border-amber-400/50',
  silver: 'bg-gradient-to-br from-gray-200 to-gray-400 border-gray-300/50',
  bronze: 'bg-gradient-to-br from-amber-500 to-amber-700 border-amber-600/50',
} as const;

export const cardBase = `bg-white/95 ${cardBorder} ${elevationShadowSm} rounded-2xl backdrop-blur-md`;

export const confettiColors = [
  brand.primary,
  brand.gold,
  brand.cream,
  brand.primaryDark,
  '#10b981',
] as const;

export const motionPresets = {
  pageEnter: { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } },
  pop: { type: 'spring' as const, stiffness: 500, damping: 16 },
  bounce: { type: 'spring' as const, stiffness: 300, damping: 12 },
  stagger: (i: number) => ({ delay: i * 0.06 }),
} as const;
