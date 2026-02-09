import { motion, AnimatePresence } from 'framer-motion';

interface BanishNotificationProps {
  show: boolean;
  banishedBy?: string;
  isBanished?: boolean;
}

export function BanishNotification({ show, banishedBy, isBanished }: BanishNotificationProps) {
  return (
    <AnimatePresence>
      {show && isBanished && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none grayscale"
        >
          {/* Grayscale overlay */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Main notification card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15, delay: 0.2 }}
            className="bg-gradient-to-b from-[#2e1065] to-[#1a0b3a] px-12 py-10 rounded-2xl shadow-2xl flex flex-col items-center gap-6 border-4 border-[#FFFDD1] relative z-10"
          >
            {/* Glowing effect */}
            <motion.div
              className="absolute -inset-2 bg-gradient-to-r from-[#FFFDD1] to-[#FFD700] rounded-2xl blur-xl opacity-20"
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            <motion.span
              className="font-pixel-title text-5xl relative z-10 text-center text-[#FFFDD1]"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              تم إقصاؤك هذه الجولة
            </motion.span>

            {banishedBy && (
              <motion.span
                className="text-lg font-bold relative z-10 text-[#FFFDD1]/80 text-center"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                بواسطة <span className="text-[#FFD700]">{banishedBy}</span>
              </motion.span>
            )}

            <motion.div
              className="h-1 w-32 bg-gradient-to-r from-transparent via-[#FFFDD1] to-transparent relative z-10"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            <motion.span
              className="text-sm font-semibold relative z-10 text-[#FFFDD1]/70 text-center italic"
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ستعود في الجولة القادمة
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
