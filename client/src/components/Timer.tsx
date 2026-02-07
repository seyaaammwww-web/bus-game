import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, Zap } from 'lucide-react';
import { playTimerWarning, playTimerUrgent } from '@/lib/sounds';

interface TimerProps {
  timeLeft: number;
  isRush: boolean;
}

export function Timer({ timeLeft, isRush }: TimerProps) {
  const prevTimeRef = useRef(timeLeft);

  useEffect(() => {
    if (prevTimeRef.current !== timeLeft) {
      // Play a tick sound every second when time is low
      if (timeLeft <= 5 && timeLeft > 0) {
        playTimerUrgent(); // Urgent tick
      } else if (timeLeft <= 15 && timeLeft > 5) {
        playTimerWarning(); // Standard tick
      }
      prevTimeRef.current = timeLeft;
    }
  }, [timeLeft]);

  const getTimerClass = () => {
    if (timeLeft <= 5) return 'text-red-600';
    if (timeLeft <= 15) return 'text-amber-500';
    return 'text-primary';
  };

  const getTimerBg = () => {
    if (timeLeft <= 5) return 'from-red-100 to-red-50';
    if (timeLeft <= 15) return 'from-amber-100 to-amber-50';
    return 'from-blue-100 to-blue-50';
  };

  const isDanger = timeLeft <= 5;
  const isWarning = timeLeft <= 15;

  return (
    <motion.div
      className={`flex items-center justify-center gap-4 p-4 rounded-xl bg-[#FFFDD1] border-[3px] ${isDanger ? 'border-red-500' : isWarning ? 'border-orange-500' : 'border-[#2e1065]'
        } shadow-lg relative overflow-hidden font-pixel-text`}
      initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      {/* Pulsing background effect */}
      {isDanger && (
        <motion.div
          className="absolute inset-0 bg-red-500 opacity-10"
          animate={{ opacity: [0.05, 0.2, 0.05] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      )}

      {/* Icon with animation */}
      <motion.div
        animate={
          isDanger
            ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, -10, 0] }
            : isWarning
              ? { scale: [1, 1.1, 1] }
              : {}
        }
        transition={{
          duration: isDanger ? 0.5 : 1,
          repeat: Infinity,
        }}
      >
        {isDanger ? (
          <AlertTriangle className="w-8 h-8 text-red-600" />
        ) : (
          <Clock className={`w-8 h-8 ${getTimerClass()}`} />
        )}
      </motion.div>

      {/* Timer number with relative positioning */}
      <motion.div
        className="relative"
        key={timeLeft}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
      >
        <span className={`text-4xl font-pixel-title tabular-nums ${isDanger ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-[#4c1d95]'} relative z-10`}>
          {String(timeLeft).padStart(2, '0')}
        </span>
        {isDanger && (
          <motion.div
            className="absolute inset-0 text-red-400 text-6xl font-black opacity-30"
            animate={{ scale: [1, 1.2] }}
            transition={{ duration: 0.3, repeat: Infinity }}
          >
            {String(timeLeft).padStart(2, '0')}
          </motion.div>
        )}
      </motion.div>

      {/* Rush mode indicator */}
      {isRush && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-black flex items-center gap-2 shadow-lg"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Zap className="w-4 h-4" />
          </motion.div>
          RAAAASH!
        </motion.div>
      )}
    </motion.div>
  );
}

