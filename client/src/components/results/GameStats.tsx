import { motion } from 'framer-motion';
import { RetroCard } from '@/components/ui/RetroCard';
import { Zap, Star, Bus } from 'lucide-react';

interface StatRowProps {
    label: string;
    name: string;
    value: string;
    icon: React.ReactNode;
    iconBg: string;
    iconShadow: string;
    delay: number;
}

function StatRow({ label, name, value, icon, iconBg, iconShadow, delay }: StatRowProps) {
    return (
        <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay, type: 'spring', stiffness: 300, damping: 24 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-[2px] border-[#4c1d95]/20 bg-white"
        >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg} shadow-[${iconShadow}]`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#7c3aed]/70 font-pixel-text font-bold uppercase tracking-wide">{label}</p>
                <p className="font-bold text-sm text-[#4c1d95] font-pixel-text truncate">{name}</p>
            </div>
            <span className="text-sm font-bold text-[#4c1d95] font-pixel-title tabular-nums flex-shrink-0">{value}</span>
        </motion.div>
    );
}

export function GameStats({ gameStats }: { gameStats: any }) {
    if (!gameStats) return null;

    const rows = [
        gameStats.fastestPlayer && {
            label: 'الأسرع',
            name: gameStats.fastestPlayer.name,
            value: `${gameStats.fastestPlayer.fastSubmissions}×`,
            icon: <Zap className="w-4 h-4 text-white" />,
            iconBg: 'bg-gradient-to-br from-orange-400 to-amber-500',
            iconShadow: '2px_2px_0_0_#92400e',
            delay: 0.1,
        },
        gameStats.mostUnique && {
            label: 'الأكثر تميزاً',
            name: gameStats.mostUnique.name,
            value: `${gameStats.mostUnique.uniqueAnswers} فريدة`,
            icon: <Star className="w-4 h-4 text-white" />,
            iconBg: 'bg-gradient-to-br from-[#7c3aed] to-[#6d28d9]',
            iconShadow: '2px_2px_0_0_#4c1d95',
            delay: 0.18,
        },
        gameStats.busChampion && {
            label: 'بطل الأوتوبيس',
            name: gameStats.busChampion.name,
            value: `${gameStats.busChampion.busStreak} متتالية`,
            icon: <Bus className="w-4 h-4 text-white" />,
            iconBg: 'bg-gradient-to-br from-[#4c1d95] to-[#2e1065]',
            iconShadow: '2px_2px_0_0_#1e1b4b',
            delay: 0.26,
        },
    ].filter(Boolean) as StatRowProps[];

    if (rows.length === 0) return null;

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mb-6"
        >
            <RetroCard>
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-gradient-to-br from-[#4c1d95] to-[#2e1065] rounded-lg flex items-center justify-center shadow-[2px_2px_0_0_#1e1b4b]">
                        <Star className="w-4 h-4 text-[#FFFDD1]" />
                    </div>
                    <span className="font-pixel-title text-[#4c1d95] text-base font-bold">إحصائيات المباراة</span>
                </div>
                <div className="space-y-2">
                    {rows.map((row, i) => (
                        <StatRow key={i} {...row} />
                    ))}
                </div>
            </RetroCard>
        </motion.div>
    );
}
