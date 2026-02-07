import { motion } from 'framer-motion';

interface LetterDisplayProps {
  letter: string;
  round?: number;
  totalRounds?: number;
}

export function LetterDisplay({ letter, round, totalRounds }: LetterDisplayProps) {
  return (
    <div className="flex flex-col items-center relative z-20">
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: -6 }}
        whileHover={{ scale: 1.1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 80, damping: 20, duration: 1.5 }}
      >
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-[#7c3aed]/30 blur-xl rounded-xl" />

        {/* Card */}
        <div className="relative w-28 h-28 bg-gradient-to-br from-[#4c1d95] to-[#2e1065] rounded-xl flex items-center justify-center shadow-[6px_6px_0_0_rgba(139,92,246,0.5),_0_0_30px_rgba(139,92,246,0.3)] border-[4px] border-[#8b5cf6]">
          {/* Inner Glow */}
          <div className="absolute inset-2 bg-gradient-to-br from-white/10 to-transparent rounded-lg" />

          {/* Letter */}
          <motion.span
            className="relative text-6xl font-pixel-title text-white font-bold drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 60, damping: 15 }}
          >
            {letter}
          </motion.span>

          {/* Sparkle Effect */}
          <motion.div
            className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full"
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      {round && totalRounds && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="absolute -bottom-8 bg-[#4c1d95]/80 px-3 py-1 rounded-full text-xs font-pixel-text text-[#FFFDD1] border border-[#FFFDD1]/30 backdrop-blur-sm"
        >
          جولة {round} من {totalRounds}
        </motion.div>
      )}
    </div>
  );
}


