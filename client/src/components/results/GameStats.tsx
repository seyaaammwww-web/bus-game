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
                    <div className="w-7 h-7 bg-[#FF8A50] rounded-sm border-2 border-[#350D7A] flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-[#350D7A]" />
                    </div>
                    <span className="font-pixel-title text-[#350D7A] text-base font-bold">إحصائيات المباراة</span>
                </div>
                <div className="space-y-2">
                    {gameStats.fastestPlayer && (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="flex items-center gap-3 px-3 py-2 rounded-sm border-2 font-pixel-text text-sm bg-[#FFFEE5] border-[#350D7A]"
                        >
                            <div className="w-8 h-8 rounded-sm flex items-center justify-center font-bold flex-shrink-0 bg-[#FF8A50] border-2 border-[#350D7A]">
                                <Zap className="w-4 h-4 text-[#350D7A]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-[#FF6957] font-pixel-text flex items-center gap-1">الأسرع</p>
                                <p className="font-bold text-sm text-[#350D7A] font-pixel-text truncate">{gameStats.fastestPlayer.name}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 text-[#FF6957]">
                                <span className="text-sm font-bold font-pixel-text tabular-nums">{gameStats.fastestPlayer.fastSubmissions} مرة</span>
                            </div>
                        </motion.div>
                    )}
                    {gameStats.mostUnique && (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-3 px-3 py-2 rounded-sm border-2 font-pixel-text text-sm bg-[#FFFEE5] border-[#350D7A]"
                        >
                            <div className="w-8 h-8 rounded-sm flex items-center justify-center font-bold flex-shrink-0 bg-[#6714A8] border-2 border-[#350D7A]">
                                <Star className="w-4 h-4 text-[#FFFEE2]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-[#6714A8] font-pixel-text flex items-center gap-1">الأكثر إبداعاً</p>
                                <p className="font-bold text-sm text-[#350D7A] font-pixel-text truncate">{gameStats.mostUnique.name}</p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 text-[#6714A8]">
                                <span className="text-sm font-bold font-pixel-text tabular-nums">{gameStats.mostUnique.uniqueAnswers} فريدة</span>
                            </div>
                        </motion.div>
                    )}
                    {gameStats.busChampion && (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-3 px-3 py-2 rounded-sm border-2 font-pixel-text text-sm bg-[#FFFEE5] border-[#350D7A]"
                        >
                            <div className="w-8 h-8 rounded-sm flex items-center justify-center font-bold flex-shrink-0 bg-[#44AF00] border-2 border-[#350D7A] text-base">
                                🚌
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-[#44AF00] font-pixel-text flex items-center gap-1">بطل الباص!</p>
                                <p className="font-bold text-sm text-[#350D7A] font-pixel-text truncate">{gameStats.busChampion.name}</p>
                            </div>
                            <div className="flex flex-col items-end flex-shrink-0 text-[#44AF00]">
                                <span className="text-sm font-bold font-pixel-text tabular-nums">+10 بونص!</span>
                                <span className="text-[10px] text-[#350D7A]/60 font-pixel-text">{gameStats.busChampion.busStreak} متتالية</span>
                            </div>
                        </motion.div>
                    )}
                </div>
            </RetroCard>
        </motion.div>
    );
}
