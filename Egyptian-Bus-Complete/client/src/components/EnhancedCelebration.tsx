import { motion, AnimatePresence } from 'framer-motion';

interface CelebrationEffect {
  id: string;
  emoji: string;
  x: number;
  y: number;
  delay?: number;
}

interface EnhancedCelebrationProps {
  isActive: boolean;
  winner?: string;
  position?: 'top' | 'center' | 'full';
}

export function EnhancedCelebration({
  isActive,
  winner,
  position = 'full',
}: EnhancedCelebrationProps) {
  // Generate celebration effects
  const celebrationEmojis = ['🎉', '⭐', '🎊', '🏆', '👑', '💎', '🌟', '🎁', '🎯', '🚀'];
  
  const effects: CelebrationEffect[] = Array.from({ length: 20 }).map((_, i) => ({
    id: `effect-${i}`,
    emoji: celebrationEmojis[i % celebrationEmojis.length],
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 0.5,
  }));

  const containerClass = position === 'center'
    ? 'fixed inset-0 flex items-center justify-center'
    : 'fixed inset-0';

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className={containerClass}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ pointerEvents: 'none' }}
        >
          {/* Celebration particles */}
          {effects.map((effect) => (
            <motion.div
              key={effect.id}
              className="absolute text-4xl"
              style={{
                left: `${effect.x}%`,
                top: `${effect.y}%`,
                pointerEvents: 'none',
              }}
              initial={{
                opacity: 1,
                y: 0,
                rotate: 0,
                scale: 1,
              }}
              animate={{
                opacity: 0,
                y: -300,
                rotate: 360,
                scale: [1, 1.2, 0.8],
              }}
              transition={{
                duration: 2.5,
                delay: effect.delay,
                ease: 'easeOut',
              }}
            >
              {effect.emoji}
            </motion.div>
          ))}

          {/* Center text if provided */}
          {winner && position === 'center' && (
            <motion.div
              className="z-10 text-center"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 100,
                damping: 15,
              }}
            >
              <motion.h1
                className="text-6xl font-black text-yellow-400 drop-shadow-2xl mb-4"
                animate={{
                  scale: [1, 1.1, 1],
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                🏆 {winner} 🏆
              </motion.h1>
              <motion.p
                className="text-3xl text-white drop-shadow-2xl font-bold"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                }}
              >
                فائز الجولة!
              </motion.p>
            </motion.div>
          )}

          {/* Rainbow sweep effect */}
          {position === 'full' && (
            <motion.div
              className="absolute inset-0 opacity-0"
              style={{
                background: 'linear-gradient(90deg, rgb(239, 68, 68), rgb(245, 158, 11), rgb(34, 197, 94))',
              }}
              initial={{ opacity: 0, x: '-100%' }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{
                duration: 2,
                repeat: isActive ? Infinity : 0,
                repeatDelay: 1,
              }}
            />
          )}

          {/* Glitter effect */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(255,255,0,0.3) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: isActive ? Infinity : 0,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
