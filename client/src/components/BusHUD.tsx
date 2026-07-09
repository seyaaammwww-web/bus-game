import { useGame } from '@/lib/gameContext';
import { Bus, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function BusHUD() {
    const { state } = useGame();

    if (!state.room) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="fixed top-4 right-4 z-50 flex items-center gap-2 md:gap-3 bg-[#2e1065]/85 border border-amber-400/40 shadow-[0_4px_24px_rgba(251,191,36,0.25)] rounded-2xl p-2 backdrop-blur-lg"
            >
                <div className="flex items-center gap-1.5 bg-[#1a0533]/80 px-2 md:px-3 py-1 md:py-1.5 rounded-xl border border-[#fbbf24]/50">
                    <Bus className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#fbbf24]" />
                    <span className="font-pixel-title text-[#FFFDD1] text-xs md:text-sm pt-1">
                        {state.room.currentRound + 1}/{state.room.totalRounds}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#1a0533]/80 px-2 md:px-3 py-1 md:py-1.5 rounded-xl border border-[#fbbf24]/50">
                    <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#fbbf24]" />
                    <span className="font-pixel-text text-[#FFFDD1] text-xs md:text-sm pt-0.5 font-bold">
                        {state.room.players.length}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
