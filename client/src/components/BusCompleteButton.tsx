import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playBusSound } from '@/lib/sounds';

interface BusCompleteButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function BusCompleteButton({ onPress, disabled }: BusCompleteButtonProps) {
  // Use a ref to prevent overlapping sounds if clicked rapidly
  const lastSoundRef = useRef(0);

  const handleClick = () => {
    const now = Date.now();
    if (now - lastSoundRef.current < 2000) return; // 2s cooldown
    lastSoundRef.current = now;
    playBusSound();
    onPress();
  };

  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={{ scale: 0.90 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
      <Button
        onClick={() => {
          if (disabled) {
            import('@/lib/sounds').then(({ playErrorSound }) => playErrorSound());
            // Show hint if clicked while not ready
            import('@/hooks/use-toast').then(({ toast }) => {
              toast({
                title: "إملأ الخانات كلها!",
                description: "",
                variant: "destructive",
                duration: 2000
              });
            });
            return;
          }
          handleClick();
        }}
        variant="primary"
        size="lg"
        className="w-full h-16 text-xl font-bold font-pixel-title shine-effect relative overflow-hidden"
        data-testid="button-bus-complete"
      >
        <Bus className="w-8 h-8 ml-3 absolute right-4" />
        أوتوبيس كومبليت!
      </Button>
    </motion.div>
  );
}
