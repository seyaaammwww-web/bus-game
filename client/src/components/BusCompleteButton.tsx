import { motion } from 'framer-motion';
import { Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playBusSound } from '@/lib/sounds';

interface BusCompleteButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export function BusCompleteButton({ onPress, disabled }: BusCompleteButtonProps) {
  const handleClick = () => {
    playBusSound();
    onPress();
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
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
                title: "لسه بدري!",
                description: "لازم تملى كل الخانات الأول!",
                variant: "destructive",
                duration: 2000
              });
            });
            return;
          }
          handleClick();
        }}
        // Cleaned: Removed disabled prop so it stays SOLID color
        className="w-full h-16 text-xl font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg transition-all font-pixel-title shine-effect relative overflow-hidden"
        data-testid="button-bus-complete"
      >
        <Bus className="w-8 h-8 ml-3 absolute right-4" />
        أوتوبيس كومبليت!
      </Button>
    </motion.div>
  );
}
