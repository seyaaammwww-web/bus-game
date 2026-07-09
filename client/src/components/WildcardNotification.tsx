import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface WildcardNotificationProps {
  show: boolean;
  playerName?: string;
}

export function WildcardNotification({ show, playerName }: WildcardNotificationProps) {
  // Generate random sparkles
  const sparkles = Array.from({ length: 10 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 0.8,
    size: 4 + Math.random() * 6,
  }));

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, opacity: 0, rotate: -180 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0, opacity: 0, rotate: 180 }}
          transition={{ type: 'spring', stiffness: 150, damping: 20 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-80 pointer-events-none"
        >
          {/* Sparkle particles */}
          {sparkles.map(sparkle => (
            <motion.div
              key={sparkle.id}
              className="absolute pointer-events-none rounded-full"
              style={{
                left: `${sparkle.left}%`,
                top: `${sparkle.top}%`,
                width: sparkle.size,
                height: sparkle.size,
                background: `linear-gradient(135deg, #FFA168, #FF8A50)`,
              }}
              initial={{ scale: 1, opacity: 1 }}
              animate={{
                scale: [1, 0.5, 0],
                opacity: [1, 0.8, 0],
                y: [-20, 30],
              }}
              transition={{
                duration: 2,
                delay: sparkle.delay,
                ease: 'easeOut',
              }}
            />
          ))}

          <motion.div
            className="bg-[#FF8A50] text-[#350D7A] px-8 py-5 rounded-sm shadow-pixel-lg flex flex-col items-center gap-2 border-4 border-[#350D7A] relative overflow-hidden"
          >
            <motion.div
              className="relative z-10"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Sparkles className="w-8 h-8" />
            </motion.div>

            <div className="relative z-10 text-center">
              <motion.span
                className="font-black text-xl block"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                ✨ WILDCARD! 🃏
              </motion.span>
              {playerName && (
                <span className="text-xs opacity-95 font-bold block mt-1">{playerName}</span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
