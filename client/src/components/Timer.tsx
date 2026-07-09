import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { playTimerWarning, playTimerUrgent } from '@/lib/sounds';

interface TimerProps {
  timeLeft: number;
  isRush: boolean;
  maxTime?: number;
}

export function Timer({ timeLeft, isRush, maxTime = 60 }: TimerProps) {
  const prevTimeRef = useRef(timeLeft);

  useEffect(() => {
    if (prevTimeRef.current !== timeLeft) {
      if (timeLeft <= 5 && timeLeft > 0) {
        playTimerUrgent();
      } else if (timeLeft <= 15 && timeLeft > 5) {
        playTimerWarning();
      }
      prevTimeRef.current = timeLeft;
    }
  }, [timeLeft]);

  const isDanger = timeLeft <= 5;
  const isWarning = timeLeft <= 15;

  const pillBg = isDanger
    ? 'bg-[#FF6957]'
    : isWarning
      ? 'bg-[#FFA168]'
      : 'bg-[#FFFEE5]';
  const pillBorder = 'border-[#350D7A]';
  const pillShadow = 'shadow-pixel-sm';
  const numColor = 'text-[#350D7A]';
  const iconColor = isDanger || isWarning ? 'text-[#350D7A]' : 'text-[#6714A8]';
  const fuseColor = isDanger ? 'bg-[#350D7A]' : isWarning ? 'bg-[#6714A8]' : 'bg-[#F640A8]';

  const fuseWidth = Math.max(0, Math.min(1, timeLeft / maxTime));

  return (
    <motion.div
      className={`
        relative flex items-center gap-2
        px-3 py-1.5 md:px-4 md:py-2
        rounded-sm border-[3px] overflow-hidden
        font-bold
        ${pillBg} ${pillBorder} ${pillShadow}
        ${isDanger ? 'animate-pulse' : ''}
      `}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div
        className={`absolute bottom-0 left-0 h-[3px] ${fuseColor} transition-all duration-1000 ease-linear`}
        style={{ width: `${fuseWidth * 100}%` }}
      />

      <motion.div
        animate={
          isDanger ? { scale: [1, 1.3, 1], rotate: [0, -15, 15, 0] } :
            isWarning ? { scale: [1, 1.1, 1] } : {}
        }
        transition={{ duration: isDanger ? 0.4 : 0.8, repeat: Infinity }}
      >
        {isDanger
          ? <AlertTriangle className={`w-4 h-4 md:w-5 md:h-5 ${iconColor}`} />
          : <Clock className={`w-4 h-4 md:w-5 md:h-5 ${iconColor}`} />
        }
      </motion.div>

      <motion.span
        key={timeLeft}
        className={`tabular-nums font-bold text-xl md:text-2xl leading-none ${numColor}`}
        initial={{ scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        {String(timeLeft).padStart(2, '0')}
      </motion.span>
    </motion.div>
  );
}
