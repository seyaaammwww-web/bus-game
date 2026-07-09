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
                className="fixed top-4 right-4 z-50 flex items-center gap-2 md:gap-3 bg-[#350D7A] border-[3px] border-[#350D7A] shadow-pixel rounded-sm p-2"
            >
                <div className="flex items-center gap-1.5 bg-[#4E0994] px-2 md:px-3 py-1 md:py-1.5 rounded-sm border-2 border-[#FFA168]">
                    <Bus className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#FFA168]" />
                    <span className="font-pixel-title text-[#FFFEE2] text-xs md:text-sm pt-1">
                        {state.room.currentRound + 1}/{state.room.totalRounds}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 bg-[#4E0994] px-2 md:px-3 py-1 md:py-1.5 rounded-sm border-2 border-[#FFA168]">
                    <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#FFA168]" />
                    <span className="font-pixel-text text-[#FFFEE2] text-xs md:text-sm pt-0.5 font-bold">
                        {state.room.players.length}
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
