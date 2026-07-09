import { motion } from 'framer-motion';
import { RetroCard } from '@/components/ui/RetroCard';
import { Trophy, Zap, Star } from 'lucide-react';

export function GameStats({ gameStats }: { gameStats: any }) {
    if (!gameStats) return null;

    return (
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
        >
            <RetroCard>
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-sm">
                        <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-pixel-title text-[#4c1d95] text-base font-bold">إحصائيات المباراة</span>
                </div>
                <div className="space-y-2">
                    {gameStats.fastestPlayer && (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl border-[2px] font-pixel-text text-sm bg-white border-[#4c1d95]/20"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 bg-gradient-to-br from-orange-400 to-amber-500 shadow-sm">
                                <Zap className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-orange-600 font-pixel-text flex items-center gap-1">الأسرع</p>
                                <p className="font-bold text-sm text-[#4c1d95] font-pixel-text truncate">{gameStats.fastestPlayer.name}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 text-orange-600">
                                <span className="text-sm font-bold font-pixel-text tabular-nums">{gameStats.fastestPlayer.fastSubmissions} مرة</span>
                            </div>
                        </motion.div>
                    )}
                    {gameStats.mostUnique && (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl border-[2px] font-pixel-text text-sm bg-white border-[#4c1d95]/20"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 bg-gradient-to-br from-[#7c3aed] to-[#8b5cf6] shadow-sm">
                                <Star className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-[#7c3aed] font-pixel-text flex items-center gap-1">الأكثر إبداعاً</p>
                                <p className="font-bold text-sm text-[#4c1d95] font-pixel-text truncate">{gameStats.mostUnique.name}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 text-[#7c3aed]">
                                <span className="text-sm font-bold font-pixel-text tabular-nums">{gameStats.mostUnique.uniqueAnswers} فريدة</span>
                            </div>
                        </motion.div>
                    )}
                    {gameStats.busChampion && (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl border-[2px] font-pixel-text text-sm bg-white border-[#4c1d95]/20"
                        >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-500 shadow-[2px_2px_0_0_#064e3b] text-base">
                                🚌
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-green-600 font-pixel-text flex items-center gap-1">بطل الباص!</p>
                                <p className="font-bold text-sm text-[#4c1d95] font-pixel-text truncate">{gameStats.busChampion.name}</p>
                            </div>
                            <div className="flex flex-col items-end flex-shrink-0 text-green-600">
                                <span className="text-sm font-bold font-pixel-text tabular-nums">+10 بونص!</span>
                                <span className="text-[10px] text-[#4c1d95]/60 font-pixel-text">{gameStats.busChampion.busStreak} متتالية</span>
                            </div>
                        </motion.div>
                    )}
                </div>
            </RetroCard>
        </motion.div>
    );
}
