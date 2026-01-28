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
        className="w-32 h-32 bg-gradient-to-br from-primary to-primary/80 rounded-3xl flex items-center justify-center shadow-xl"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.span
          className="text-7xl font-bold text-primary-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {letter}
        </motion.span>
      </motion.div>
      
      <motion.div
        className="flex items-center gap-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <span className="text-muted-foreground">الجولة</span>
        <span className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full font-bold">
          {round} / {totalRounds}
        </span>
      </motion.div>
    </div>
  );
}
