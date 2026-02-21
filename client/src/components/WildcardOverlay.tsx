import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Sparkles } from 'lucide-react';

interface WildcardOverlayProps {
  isActive: boolean;
  playerName?: string;
  message?: string;
}

export function WildcardOverlay({ isActive, playerName, message }: WildcardOverlayProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-amber-500/5 pointer-events-none flex items-center justify-center overflow-hidden backdrop-blur-sm"
        >
          {/* Sparkle particles background */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-200/10 via-transparent to-amber-200/10 opacity-30"></div>

          {/* Animated sparkles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-amber-300 opacity-40"
              initial={{
                x: Math.cos((i / 12) * Math.PI * 2) * 100,
                y: Math.sin((i / 12) * Math.PI * 2) * 100,
                scale: 0,
              }}
              animate={{
                x: Math.cos((i / 12) * Math.PI * 2) * 200,
                y: Math.sin((i / 12) * Math.PI * 2) * 200,
                scale: 1,
                rotate: 360,
              }}
              transition={{
                duration: 1.5 + (i * 0.1),
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
          ))}

          <motion.div
            className="relative z-10 text-center"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <div
              className="retro-overlay p-8 max-w-md border-amber-300 shadow-[8px_8px_0_0_#d97706]"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex justify-center mb-4"
              >
                <Wand2 className="w-16 h-16 text-amber-500" />
              </motion.div>

              <h3 className="text-2xl font-bold text-amber-600 mb-2">استخدمت الجوكر! 🃏</h3>
              <p className="text-gray-700 font-semibold text-lg mb-2">
                ✨ تم ملء جميع الخانات بإجابات صحيحة! ✨
              </p>
              <p className="text-gray-600 text-sm leading-relaxed">
                {message || 'تم تقديم إجاباتك تلقائياً. استمتع بالمزايا!'}
              </p>
              {playerName && (
                <p className="text-xs text-amber-600 mt-3 font-semibold">
                  ({playerName})
                </p>
              )}
            </div>
          </motion.div>

          {/* Magic effect lines */}
          <motion.svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
            preserveAspectRatio="none"
          >
            {[...Array(3)].map((_, i) => (
              <motion.path
                key={i}
                d={`M 0 ${50 + i * 30} Q ${window.innerWidth / 2} ${30 + i * 30} ${window.innerWidth} ${50 + i * 30}`}
                stroke="url(#gradient)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 2,
                  delay: i * 0.3,
                  repeat: Infinity,
                }}
              />
            ))}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(217, 119, 6)" />
                <stop offset="50%" stopColor="rgb(251, 191, 36)" />
                <stop offset="100%" stopColor="rgb(217, 119, 6)" />
              </linearGradient>
            </defs>
          </motion.svg>

          {/* Confetti burst */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`confetti-${i}`}
              className="absolute w-2 h-2 bg-amber-400 rounded-full"
              initial={{
                x: 0,
                y: 0,
                opacity: 1,
              }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
                opacity: 0,
              }}
              transition={{
                duration: 2,
                ease: 'easeOut',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
