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
        whileHover={{ rotate: 0 }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      >
        {/* Card — flat pixel tile with hard shadow */}
        <div className="relative w-28 h-28 bg-[#6714A8] rounded-sm flex items-center justify-center shadow-pixel-lg border-4 border-[#350D7A]">
          {/* Letter */}
          <motion.span
            className="relative text-6xl font-pixel-title text-[#FFFEE2]"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 60, damping: 15 }}
          >
            {letter}
          </motion.span>

          {/* Pixel sparkle — square, stepped blink */}
          <motion.div
            className="absolute top-2 right-2 w-2 h-2 bg-[#FFFEE2]"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'steps(2)' }}
          />
        </div>
      </motion.div>

      {round && totalRounds && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="absolute -bottom-8 bg-[#FFFEE5] px-3 py-1 rounded-sm text-xs font-pixel-text text-[#350D7A] border-2 border-[#350D7A] shadow-pixel-sm font-bold"
        >
          جولة {round} من {totalRounds}
        </motion.div>
      )}
    </div>
  );
}
