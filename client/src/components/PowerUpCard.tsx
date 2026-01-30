import { motion } from 'framer-motion';
import { Lock, Zap, Skull, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PowerUpCardProps {
    type: 'wildcard' | 'banish';
    title: string;
    description: string;
    cost: number;
    isUnlocked: boolean;
    isUsed: boolean;
    isDisabled: boolean;
    onActivate: () => void;
    icon: React.ElementType;
    className?: string;
}

export function PowerUpCard({
    type,
    title,
    cost,
    isUnlocked,
    isUsed,
    isDisabled,
    onActivate,
    icon: Icon,
    className
}: PowerUpCardProps) {

    // Used state - burnt/empty slot
    if (isUsed) {
        return (
            <div className={cn(
                "w-8 h-11 md:w-12 md:h-16 rounded-md border border-dashed border-white/20 bg-black/20 flex items-center justify-center opacity-40",
                className
            )}>
                <span className="text-[6px] md:text-[8px] text-white/40 font-bold">✓</span>
            </div>
        );
    }

    const cardStyles = {
        wildcard: {
            bg: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-400',
            border: 'border-amber-500',
            shadow: 'shadow-[0_4px_15px_rgba(251,191,36,0.4)]',
            glow: 'hover:shadow-[0_0_20px_rgba(251,191,36,0.6)]',
            iconColor: 'text-amber-800'
        },
        banish: {
            bg: 'bg-gradient-to-br from-red-400 via-rose-500 to-red-600',
            border: 'border-red-600',
            shadow: 'shadow-[0_4px_15px_rgba(239,68,68,0.4)]',
            glow: 'hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]',
            iconColor: 'text-red-900'
        }
    };

    const style = cardStyles[type];
    const canUse = isUnlocked && !isDisabled;

    return (
        <motion.button
            onClick={() => canUse && onActivate()}
            disabled={!canUse}
            className={cn(
                // Base card shape - small playing card style
                "relative w-9 h-12 md:w-14 md:h-20 rounded-lg overflow-hidden transition-all duration-200",
                // Border
                "border-2",
                // Conditional styling
                canUse ? [
                    style.bg,
                    style.border,
                    style.shadow,
                    style.glow,
                    "cursor-pointer hover:scale-110 hover:-translate-y-1 active:scale-95"
                ] : [
                    "bg-gray-600/80 border-gray-500 cursor-not-allowed grayscale opacity-60"
                ],
                className
            )}
            whileHover={canUse ? { rotate: [-1, 1, -1], transition: { repeat: Infinity, duration: 0.3 } } : {}}
            whileTap={canUse ? { scale: 0.9 } : {}}
        >
            {/* Card Face Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-0.5 md:p-1">
                {/* Cost Badge - Top */}
                <div className="absolute top-0.5 left-0.5 md:top-1 md:left-1 flex items-center gap-0.5 bg-black/20 px-1.5 py-0.5 md:px-2 md:py-1 rounded-full z-20 border border-white/10 shadow-sm backdrop-blur-[1px]">
                    <span className="text-[6px] md:text-[8px] font-bold font-pixel-text text-white drop-shadow-md">{cost}</span>
                    <Zap className="w-2 h-2 md:w-2.5 md:h-2.5 fill-yellow-300 text-yellow-300 drop-shadow-sm" />
                </div>

                {/* Icon - Center */}
                {!isUnlocked ? (
                    <Lock className="w-4 h-4 md:w-6 md:h-6 text-gray-400 mt-2" />
                ) : (
                    <Icon className={cn("w-5 h-5 md:w-7 md:h-7 mt-2", style.iconColor)} />
                )}

                {/* Title - Bottom */}
                <div className="absolute bottom-1 md:bottom-2 z-20 w-full px-1">
                    <h3 className={cn(
                        "text-[6px] md:text-[9px] font-bold font-pixel-title text-center py-0.5 md:py-1 rounded-md shadow-sm border border-white/10",
                        isUnlocked ? "text-white bg-black/20 backdrop-blur-[1px]" : "text-gray-400 bg-gray-800/10"
                    )}>
                        {title}
                    </h3>
                </div>
            </div>

            {/* Shine Effect */}
            {canUse && (
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
            )}

            {/* Locked Overlay */}
            {!isUnlocked && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Lock className="w-3 h-3 md:w-4 md:h-4 text-white/60" />
                </div>
            )}

            {/* Disabled State (Round Locked) */}
            {isUnlocked && isDisabled && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[1px]">
                    <Lock className="w-3 h-3 text-white/80" />
                </div>
            )}
        </motion.button>
    );
}
