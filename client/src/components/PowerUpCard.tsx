import { motion } from 'framer-motion';
import { Lock, Zap, Skull, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RetroCard } from './ui/RetroCard';

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

    // Burnt/Used State - Pixelated Glitch Look
    if (isUsed) {
        return (
            <div className={cn(
                "w-10 h-14 md:w-16 md:h-24 bg-black/40 border-2 border-dashed border-white/20 flex flex-col items-center justify-center relative overflow-hidden",
                className
            )}>
                {/* Scanlines Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-50" />
                <span className="text-[8px] md:text-[10px] text-white/50 font-bold font-pixel-text z-10">تم</span>
            </div>
        );
    }

    const theme = {
        wildcard: {
            bg: 'bg-[#fbbf24]', // Amber-400 (Solid Pixel Color)
            border: 'border-[#b45309]', // Amber-700
            shadow: 'md:shadow-[4px_4px_0px_#78350f]', // Amber-900 (Pixel Shadow)
            text: 'text-[#451a03]', // Amber-950
            iconColor: 'text-[#451a03]'
        },
        banish: {
            bg: 'bg-[#f87171]', // Red-400
            border: 'border-[#b91c1c]', // Red-700
            shadow: 'md:shadow-[4px_4px_0px_#7f1d1d]', // Red-900
            text: 'text-[#450a0a]', // Red-950
            iconColor: 'text-[#450a0a]'
        }
    }[type];

    const canUse = isUnlocked && !isDisabled;

    return (
        <motion.button
            onClick={() => canUse && onActivate()}
            disabled={!canUse}
            className={cn(
                "relative group",
                "w-11 h-16 md:w-16 md:h-24", // Compact Pixel Card Size
                "border-2 md:border-[3px]",
                "flex flex-col items-center justify-between p-1",
                "rounded-sm", // Sharp corners for pixel feel (or slight round)
                "transition-transform active:translate-y-1 active:shadow-none", // Mechanical click feel
                canUse ? [
                    theme.bg,
                    theme.border,
                    "shadow-[2px_2px_0px_rgba(0,0,0,0.5)]", // Mobile Shadow
                    theme.shadow, // Desktop Deep Shadow
                    "cursor-pointer",
                    "hover:-translate-y-1" // Lift up 
                ] : [
                    "bg-gray-600 border-gray-700 grayscale opacity-80 cursor-not-allowed shadow-none"
                ],
                className
            )}
            whileTap={canUse ? { scale: 0.95 } : {}}
        >
            {/* Price Tag - Pixel Badge */}
            <div className="absolute -top-1.5 -right-1.5 z-20">
                <div className={cn(
                    "flex items-center gap-0.5 px-1 pb-0.5 pt-1 bg-black border border-white/50 shadow-sm",
                    "text-[8px] md:text-[10px] font-bold font-pixel-text text-white leading-none"
                )}>
                    <Zap className="w-2 h-2 text-yellow-400 fill-yellow-400" />
                    <span>{cost}</span>
                </div>
            </div>

            {/* Icon Area */}
            <div className="flex-1 flex items-center justify-center w-full mt-2">
                {isUnlocked ? (
                    <Icon className={cn("w-6 h-6 md:w-8 md:h-8 drop-shadow-sm", theme.iconColor)} />
                ) : (
                    <Lock className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                )}
            </div>

            {/* Title - Pixel Font */}
            <div className="w-full text-center pb-1">
                <span className={cn(
                    "text-[8px] md:text-[10px] font-bold font-pixel-title tracking-normal",
                    isUnlocked ? theme.text : "text-gray-400"
                )}>
                    {title}
                </span>
            </div>

            {/* Lock Overlay (Pixelated) */}
            {!isUnlocked && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    {/* Just dimming */}
                </div>
            )}
            {/* Disabled Round Overlay */}
            {isUnlocked && isDisabled && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white/50" />
                </div>
            )}

        </motion.button>
    );
}
