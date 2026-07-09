import confetti from 'canvas-confetti';
import { brand } from './designTokens';

export const confettiColors = [
  brand.primary,
  brand.gold,
  brand.cream,
  brand.primaryDark,
  '#10b981',
] as const;

type BurstIntensity = 'low' | 'medium' | 'high';

export function burstConfetti(intensity: BurstIntensity = 'medium', origin?: { x: number; y: number }) {
  const ox = origin?.x ?? 0.5;
  const oy = origin?.y ?? 0.6;
  const counts = { low: 12, medium: 28, high: 55 } as const;

  confetti({
    particleCount: counts[intensity],
    spread: intensity === 'high' ? 80 : 55,
    startVelocity: intensity === 'high' ? 45 : 30,
    origin: { x: ox, y: oy },
    colors: [...confettiColors],
    ticks: 200,
    gravity: 1.1,
    scalar: 1.1,
  });

  if (intensity !== 'low') {
    confetti({
      particleCount: Math.floor(counts[intensity] * 0.6),
      angle: 60,
      spread: 45,
      origin: { x: 0.1, y: oy },
      colors: [...confettiColors],
    });
    confetti({
      particleCount: Math.floor(counts[intensity] * 0.6),
      angle: 120,
      spread: 45,
      origin: { x: 0.9, y: oy },
      colors: [...confettiColors],
    });
  }
}

export function burstGold(origin?: { x: number; y: number }) {
  confetti({
    particleCount: 40,
    spread: 70,
    origin: origin ?? { x: 0.5, y: 0.4 },
    colors: [brand.gold, '#fcd34d', brand.cream, '#f59e0b'],
    startVelocity: 35,
    scalar: 1.2,
  });
}
