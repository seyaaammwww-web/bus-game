import { useEffect } from 'react';
import { burstConfetti, burstGold } from '@/lib/juice';

export function Confetti({ active, count = 2, variant = 'celebration' }: {
  active: boolean;
  count?: number;
  variant?: 'celebration' | 'gold' | 'bus';
}) {
  useEffect(() => {
    if (!active) return;

    if (variant === 'gold') {
      burstGold();
      return;
    }

    burstConfetti(variant === 'bus' ? 'medium' : 'low');
  }, [active, count, variant]);

  return null;
}
