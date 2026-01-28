import { motion, AnimatePresence } from 'framer-motion';

interface BanishNotificationProps {
  show: boolean;
  banishedBy?: string;
  isBanished?: boolean;
}

export function BanishNotification({ show, banishedBy, isBanished }: BanishNotificationProps) {
  const smokeParticles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.3,
    duration: 2 + Math.random() * 1.5,
    size: 30 + Math.random() * 60,
  }));

  return (
    <AnimatePresence>
      {show && isBanished && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Smoke effect background */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

          {/* Smoke particles */}
          {smokeParticles.map(particle => (
            <motion.div
              key={particle.id}
              className="absolute pointer-events-none rounded-full"
              style={{
                left: `${particle.left}%`,
                width: particle.size,
                height: particle.size,
                background: `radial-gradient(circle, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 70%)`,
                bottom: '-50px',
              }}
              initial={{ y: 0, opacity: 0.6 }}
              animate={{
                y: [0, -300],
                opacity: [0.6, 0],
                scale: [1, 1.5],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Main notification card */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }}
            className="bg-gradient-to-b from-red-900 via-red-700 to-red-900 text-white px-12 py-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 backdrop-blur-md border-2 border-red-500/50 relative"
          >
            {/* Glowing effect */}
            <motion.div
              className="absolute -inset-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl blur-xl opacity-30"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            <motion.div
              className="relative z-10 text-6xl"
              animate={{ rotate: [0, -20, 20, -20, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              💀
            </motion.div>

            <motion.span
              className="font-black text-4xl relative z-10 text-center"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              تم طردك!
            </motion.span>

            {banishedBy && (
              <motion.span
                className="text-sm font-bold relative z-10 text-red-200 text-center"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                من قبل <span className="text-yellow-300">{banishedBy}</span>
              </motion.span>
            )}

            {/* Ghost animation */}
            <motion.div
              className="relative z-10 text-4xl"
              animate={{
                y: [0, -10, 0],
                x: [-5, 5, -5],
                opacity: [1, 0.5, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              👻
            </motion.div>

            <motion.span
              className="text-xs font-semibold relative z-10 text-red-100 text-center mt-2 italic"
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              الجولة القادمة ستعود للعبة ✨
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
