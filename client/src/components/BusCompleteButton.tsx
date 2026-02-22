import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playBusSound } from '@/lib/sounds';

interface BusCompleteButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function BusCompleteButton({ onPress, disabled }: BusCompleteButtonProps) {
  const [fired, setFired] = useState(false);

  const handleClick = () => {
    playBusSound();
    setFired(true);
    setTimeout(() => setFired(false), 600);
    onPress();
  };

  return (
    <motion.div
      // Polish A: على الضغطة الناجحة، الزرار يعمل rebound أعمق وبعدين overshoot خفيف
      animate={fired ? { scale: [1, 0.86, 1.12, 1] } : {}}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.92 } : {}}
    >
      <Button
        onClick={() => {
          if (disabled) {
            import('@/lib/sounds').then(({ playErrorSound }) => playErrorSound());
            return;
          }
          handleClick();
        }}
        className="w-full h-16 text-xl font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg transition-all font-pixel-title shine-effect relative overflow-hidden"
        data-testid="button-bus-complete"
      >
        <Bus className="w-8 h-8 ml-3 absolute right-4" />
        أوتوبيس كومبليت!
      </Button>
    </motion.div>
  );
}
