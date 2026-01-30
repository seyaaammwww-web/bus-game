import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Zap, Skull, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface PowerUpCardProps {
    type: 'wildcard' | 'banish';
    title: string;
    description: string;
    cost: number;
    isUnlocked: boolean;
    isUsed: boolean;
    isDisabled: boolean; // Globally disabled (round locked)
    onActivate: () => void;
    icon: React.ElementType;
    className?: string; // Allow overrides
}

export function PowerUpCard({
    type,
    title,
    description,
    cost,
    isUnlocked,
    isUsed,
    isDisabled,
    onActivate,
    icon: Icon,
    className
}: PowerUpCardProps) {

    // If used, show empty/burnt slot
    if (isUsed) {
        return (
            <div className="w-24 h-32 md:w-32 md:h-44 rounded-xl border-2 border-dashed border-gray-400/30 bg-black/10 flex flex-col items-center justify-center p-2 opacity-50 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20" />
                <span className="text-xs text-white/50 font-bold font-pixel-text z-10">تم الاستخدام</span>
            </div>
        );
    }

    const borderColors = {
        wildcard: 'border-[#F9D794]', // Gold
        banish: 'border-[#ef4444]',   // Red
    };

    const bgColors = {
        wildcard: 'bg-gradient-to-b from-[#FFFDD1] to-[#F9D794]',
        banish: 'bg-gradient-to-b from-red-100 to-red-200',
    };

    const shadowColors = {
        wildcard: 'shadow-[4px_4px_0_0_#b45309]',
        banish: 'shadow-[4px_4px_0_0_#991b1b]',
    };

    return (
        <motion.div
            className={cn(
                "relative w-24 h-32 md:w-32 md:h-44 rounded-xl border-[3px] transition-all flex flex-col items-center justify-between p-2 overflow-hidden group select-none",
                isUnlocked && !isDisabled ? `${borderColors[type]} ${bgColors[type]} ${shadowColors[type]} cursor-pointer hover:-translate-y-2 hover:shadow-[6px_6px_0_0_rgba(0,0,0,0.3)]` : "border-gray-500 bg-gray-300 cursor-not-allowed grayscale",
                isDisabled && isUnlocked && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => {
                if (isUnlocked && !isDisabled) onActivate();
            }}
            whileTap={isUnlocked && !isDisabled ? { scale: 0.95 } : {}}
        >
            {/* Shine Effect Overlay */}
            {isUnlocked && !isDisabled && (
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent translate-x-[-150%] group-hover:animate-shimmer z-10 pointer-events-none" />
            )}

            {/* Header Cost */}
            <div className="flex items-center gap-1 bg-black/10 px-2 py-0.5 rounded-full z-20">
                <span className="text-[10px] md:text-xs font-bold font-pixel-text text-black/80">{cost}</span>
                <Zap className="w-3 h-3 text-yellow-600 fill-yellow-600" />
            </div>

            {/* Icon */}
            <div className="relative z-20">
                {!isUnlocked ? (
                    <Lock className="w-8 h-8 md:w-12 md:h-12 text-gray-500" />
                ) : (
                    <Icon className={cn("w-8 h-8 md:w-12 md:h-12", type === 'wildcard' ? 'text-yellow-700' : 'text-red-700')} />
                )}
            </div>

            {/* Title */}
            <div className="text-center z-20">
                <h3 className={cn("text-[10px] md:text-xs font-bold font-pixel-title", !isUnlocked ? "text-gray-600" : "text-black")}>
                    {title}
                </h3>
                {isUnlocked && (
                    <p className="text-[8px] md:text-[9px] font-pixel-text leading-tight text-black/60 hidden md:block">
                        {description}
                    </p>
                )}
            </div>

            {/* Locked Overlay Text */}
            {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-30">
                    <span className="text-[10px] font-bold text-gray-700 font-pixel-text bg-white/50 px-2 py-1 rounded">
                        مغلق
                    </span>
                </div>
            )}

            {/* Disabled Overlay (Round Locked) */}
            {isUnlocked && isDisabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30">
                    <Lock className="w-6 h-6 text-white" />
                </div>
            )}

        </motion.div>
    );
}
