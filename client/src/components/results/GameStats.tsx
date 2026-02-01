import { motion } from 'framer-motion';
import { RetroCard } from '@/components/ui/RetroCard';
import { Award, Zap, Star } from 'lucide-react';

export function GameStats({ gameStats }: { gameStats: any }) {
    if (!gameStats) return null;

    return (
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
        >
            <RetroCard className="mb-6">
                <div className="flex items-center gap-3 mb-5 font-pixel-title text-[#4c1d95] text-xl">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-md">
                        <Award className="w-5 h-5 text-white" />
                    </div>
                    إحصائيات المباراة
                </div>
                <div className="space-y-4">
                    {gameStats.fastestPlayer && (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-base text-orange-600 font-bold font-pixel-text">الأسرع</p>
                                <p className="font-bold text-xl text-[#4c1d95] font-pixel-text">{gameStats.fastestPlayer.name}</p>
                            </div>
                            <span className="text-base bg-orange-500 text-white px-4 py-2 rounded-full font-pixel-text font-bold shadow-md">{gameStats.fastestPlayer.fastSubmissions} مرة</span>
                        </div>
                    )}
                    {gameStats.mostUnique && (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#8b5cf6] rounded-xl flex items-center justify-center shadow-md">
                                <Star className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-base text-[#7c3aed] font-bold font-pixel-text">الأكثر إبداعاً</p>
                                <p className="font-bold text-xl text-[#4c1d95] font-pixel-text">{gameStats.mostUnique.name}</p>
                            </div>
                            <span className="text-base bg-[#7c3aed] text-white px-4 py-2 rounded-full font-pixel-text font-bold shadow-md">{gameStats.mostUnique.uniqueAnswers} فريدة</span>
                        </div>
                    )}
                    {gameStats.busChampion && (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md text-2xl">
                                🚌
                            </div>
                            <div className="flex-1">
                                <p className="text-base text-green-600 font-bold font-pixel-text">بطل الباص!</p>
                                <p className="font-bold text-xl text-[#4c1d95] font-pixel-text">{gameStats.busChampion.name}</p>
                            </div>
                            <div className="text-left">
                                <p className="text-lg font-bold text-green-600 font-pixel-text">+10 بونص!</p>
                                <p className="text-sm text-[#4c1d95]/60 font-pixel-text">{gameStats.busChampion.busStreak} متتالية</p>
                            </div>
                        </div>
                    )}
                </div>
            </RetroCard>
        </motion.div>
    );
}
