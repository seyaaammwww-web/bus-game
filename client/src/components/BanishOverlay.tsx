import { motion, AnimatePresence } from 'framer-motion';
import { UserX, X } from 'lucide-react';
import type { Player } from '@shared/schema';
import { memo, useCallback } from 'react';

interface BanishOverlayProps {
  isOpen: boolean;
  players: Player[];
  onSelectPlayer: (playerId: string) => void;
  onClose: () => void;
}

export const BanishOverlay = memo(function BanishOverlay({
  isOpen,
  players,
  onSelectPlayer,
  onClose
}: BanishOverlayProps) {
  const handleSelectPlayer = useCallback((playerId: string) => {
    onSelectPlayer(playerId);
    onClose();
  }, [onSelectPlayer, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Banish Player Selection"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              onClose();
              e.stopPropagation();
            }
          }}
        >
          {/* Main card */}
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 30 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="retro-overlay overflow-hidden max-w-md w-full"
          >
            {/* Header */}
            <div className="bg-[#FF6957] border-b-4 border-[#350D7A] p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute text-red-300"
                    initial={{ x: -100, rotate: 0 }}
                    animate={{ x: 400, rotate: 360 }}
                    transition={{
                      duration: 3 + i,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  >
                    <UserX className="w-8 h-8" />
                  </motion.div>
                ))}
              </div>

              <div className="relative z-10 flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <UserX className="w-8 h-8 text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white">اختر من تطرده!</h2>
              </div>

              <p className="text-red-100 text-sm mt-2 relative z-10">
                اختر لاعب واحد - سيتم طرده من هذه الجولة فقط
              </p>
            </div>

            {/* Players list */}
            <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
              {players.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا يوجد لاعبين آخرين
                </div>
              ) : (
                players.map((player, index) => (
                  <motion.button
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05, x: 5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      handleSelectPlayer(player.id);
                    }}
                    className="w-full p-4 bg-[#FFFDCC] hover:bg-[#FFF3B6] border-[3px] border-[#350D7A] rounded-sm shadow-pixel-sm hover:shadow-pixel transition-none text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-[#350D7A]">
                          {player.name}
                        </p>
                        <p className="text-xs text-[#6714A8]">
                          نقاط: {player.score}
                        </p>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 180 }}
                        className="text-red-400 group-hover:text-red-600"
                      >
                        <UserX className="w-5 h-5" />
                      </motion.div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-red-100 p-4 flex gap-2 bg-gray-50">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-all"
              >
                إلغاء
              </motion.button>
              <div className="text-xs text-gray-500 flex items-center gap-2 flex-1 justify-end">
                <X className="w-4 h-4" />
                أو اضغط Escape
              </div>
            </div>

            {/* Warning message */}
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-red-50 border-t border-red-200 px-6 py-3 text-center text-xs text-red-600 font-semibold"
            >
              هذا الطرد من الجولة الحالية فقط!
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
