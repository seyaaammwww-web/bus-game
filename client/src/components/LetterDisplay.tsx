import { motion } from 'framer-motion';

interface LetterDisplayProps {
  letter: string;
  round: number;
  totalRounds: number;
}

export function LetterDisplay({ letter, round, totalRounds }: LetterDisplayProps) {
  return (
    <div className="flex flex-col items-center relative mb-4 z-20">
      <motion.div
        className="w-32 h-32 bg-[#2C0834] rounded-none flex items-center justify-center shadow-[6px_6px_0_0_#FFFDD1] border-[4px] border-[#FFFDD1] rotate-[-5deg]"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: -5 }}
        whileHover={{ scale: 1.1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.span
          className="text-7xl font-pixel-title text-[#FFFDD1] font-bold drop-shadow-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {letter}
        </motion.span>
      </motion.div>

      <motion.div
        className="absolute -bottom-6 bg-[#ffc800] text-[#2C0834] px-6 py-2 rounded-none border-[3px] border-[#2C0834] font-bold text-xl shadow-[4px_4px_0_0_#2C0834] font-pixel-title whitespace-nowrap rotate-[2deg] z-10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        جولة {round} / {totalRounds}
      </motion.div>
    </div>
  );
}
