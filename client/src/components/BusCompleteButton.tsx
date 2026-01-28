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
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Button
        onClick={handleClick}
        disabled={disabled}
        className="w-full h-16 text-xl font-bold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg"
        data-testid="button-bus-complete"
      >
        <Bus className="w-8 h-8 ml-3" />
        أوتوبيس كومبليت!
      </Button>
    </motion.div>
  );
}
