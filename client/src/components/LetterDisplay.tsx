import { motion } from 'framer-motion';

interface LetterDisplayProps {
  letter: string;
  round: number;
  totalRounds: number;
}

export function LetterDisplay({ letter, round, totalRounds }: LetterDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        className="w-24 h-24 bg-[#FFFDD1] rounded-xl flex items-center justify-center shadow-xl border-[3px] border-[#2C0834]"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.span
          className="text-5xl font-pixel-title text-[#31093A]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {letter}
        </motion.span>
      </motion.div>

      <motion.div
        className="flex items-center gap-2 font-pixel-text"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <span className="text-white/80 text-xs">الجولة</span>
        <span className="bg-[#FFFDD1] text-[#31093A] px-2 py-1 rounded-lg border-2 border-[#2C0834] font-bold text-xs">
          {round} / {totalRounds}
        </span>
      </motion.div>
    </div>
  );
}
