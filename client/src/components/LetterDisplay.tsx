import { motion } from 'framer-motion';

interface LetterDisplayProps {
  letter: string;
  round: number;
  totalRounds: number;
}

export function LetterDisplay({ letter, round, totalRounds }: LetterDisplayProps) {
  return (
    <div className="flex flex-col items-center relative z-20">
      {/* Main Letter Card */}
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: -6 }}
        whileHover={{ scale: 1.1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
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
            transition={{ delay: 0.3, type: 'spring' }}
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
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Round Badge */}
      <motion.div
        className="absolute -bottom-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-[#2e1065] px-5 py-1.5 rounded-full border-[3px] border-[#4c1d95] font-bold text-lg shadow-[3px_3px_0_0_#2e1065,_0_0_15px_rgba(251,191,36,0.3)] font-pixel-text whitespace-nowrap rotate-[2deg] z-10"
        initial={{ y: 20, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: 'spring' }}
        whileHover={{ scale: 1.05 }}
      >
        جولة {round} / {totalRounds}
      </motion.div>
    </div>
  );
}
