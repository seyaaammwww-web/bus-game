import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export function Confetti({ active, count = 2 }: { active: boolean, count?: number }) {
  useEffect(() => {
    if (active) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: count,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B']
        });
        confetti({
          particleCount: count,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#EF4444', '#3B82F6', '#10B981', '#F59E0B']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [active]);

  return null;
}
