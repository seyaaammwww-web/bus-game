import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';
import { playTimerWarning, playTimerUrgent } from '@/lib/sounds';

interface TimerProps {
  timeLeft: number;
  isRush: boolean;
  /** Max seconds (used to draw the fuse bar). Default 60. */
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

  // ---- colour tokens ----
  const pillBg = isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-[#FFFDD1]';
  const pillBorder = isDanger ? 'border-red-700' : isWarning ? 'border-amber-600' : 'border-[#4c1d95]';
  const pillShadow = isDanger ? 'shadow-[3px_3px_0_0_#7f1d1d]' : isWarning ? 'shadow-[3px_3px_0_0_#92400e]' : 'shadow-[3px_3px_0_0_#2e1065]';
  const numColor = isDanger ? 'text-white' : isWarning ? 'text-[#7c2d12]' : 'text-[#4c1d95]';
  const iconColor = isDanger ? 'text-white' : isWarning ? 'text-[#7c2d12]' : 'text-[#7c3aed]';
  const fuseColor = isDanger ? 'from-red-300 to-white' : isWarning ? 'from-orange-400 to-yellow-300' : 'from-violet-400 to-purple-300';

  const fuseWidth = Math.max(0, Math.min(1, timeLeft / maxTime));

  return (
    <motion.div
      className={`
        relative flex items-center gap-2
        px-3 py-1.5 md:px-4 md:py-2
        rounded-full border-[3px] overflow-hidden
        font-pixel-text
        ${pillBg} ${pillBorder} ${pillShadow}
        ${isDanger ? 'animate-pulse' : ''}
      `}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Fuse bar at bottom */}
      <div
        className={`absolute bottom-0 left-0 h-[3px] bg-gradient-to-r ${fuseColor} transition-all duration-1000 ease-linear`}
        style={{ width: `${fuseWidth * 100}%` }}
      >
        {/* Fire spark at fuse tip */}
        {fuseWidth > 0.02 && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-200 shadow-[0_0_6px_#fbbf24] animate-ping" />
        )}
      </div>

      {/* Icon */}
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

      {/* Number — pops in every tick */}
      <motion.span
        key={timeLeft}
        className={`tabular-nums font-pixel-title text-xl md:text-2xl leading-none ${numColor}`}
        initial={{ scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
      >
        {String(timeLeft).padStart(2, '0')}
      </motion.span>
    </motion.div>
  );
}
