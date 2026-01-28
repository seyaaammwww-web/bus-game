import { motion } from 'framer-motion';

interface LetterDisplayProps {
  letter: string;
  round: number;
  totalRounds: number;
}

export function LetterDisplay({ letter, round, totalRounds }: LetterDisplayProps) {
  return (
    <div className="flex flex-col items-center relative mb-4">
      <motion.div
        className="w-28 h-28 bg-[#FFFDD1] rounded-xl flex items-center justify-center shadow-xl border-[3px] border-[#2C0834]"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.span
          className="text-6xl font-pixel-title text-[#31093A] font-bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {letter}
        </motion.span>
      </motion.div>

      <motion.div
        className="absolute -bottom-4 bg-[#FFFDD1] text-[#31093A] px-4 py-2 rounded-none border-2 border-[#2C0834] font-bold text-lg shadow-[2px_2px_0_0_#2C0834] font-pixel-text whitespace-nowrap"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        جولة {round} / {totalRounds}
      </motion.div>
    </div>
  );
}
