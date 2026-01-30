import { motion } from 'framer-motion';
import { Lock, Zap, Skull, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RetroCard } from './ui/RetroCard';
import { toast } from '@/hooks/use-toast';

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

    const canUse = isUnlocked && !isDisabled; // Only true if points enough AND not disabled by game
    const hasPoints = isUnlocked; // Helper to know if we have points

    const handleClick = () => {
        if (!hasPoints) {
            // Show temporary small error
            toast({ // Using global toast
                title: "محتاج نقط أكتر! ❌",
                description: `تحتاج ${cost} نقطة لتفعيل ${title}`,
                variant: "destructive",
                duration: 1500,
            });
            return;
        }

        if (isDisabled) {
            // Maybe show message "Not your turn / Already active"
            toast({
                title: "غير متاح حالياً 🔒",
                description: "البطاقة غير متاحة للاستخدام الآن",
                variant: "destructive",
                duration: 1500,
            });
            return;
        }

        onActivate();
    };

    return (
        <motion.button
            onClick={handleClick}
            // decoding: removed disabled={!canUse} to allow click for error message
            className={cn(
                "relative group",
                "w-11 h-16 md:w-16 md:h-24", // Compact Pixel Card Size
                "border-2 md:border-[3px]",
                "flex flex-col items-center justify-between p-1",
                "rounded-sm", // Sharp corners for pixel feel (or slight round)
                "transition-transform active:translate-y-1 active:shadow-none", // Mechanical click feel

                // Always render colored theme unless strictly DISABLED by game logic (not points)
                // Actually user said "make them solid like they are open".
                // So even if !hasPoints, we render THEME.
                [
                    theme.bg,
                    theme.border,
                    "shadow-[2px_2px_0px_rgba(0,0,0,0.5)]", // Mobile Shadow
                    theme.shadow, // Desktop Deep Shadow
                    "cursor-pointer",
                    "hover:-translate-y-1" // Lift up 
                ],
                // We only gray out if 'isDisabled' which might be 'banished' or 'active by other'
                isDisabled ? "opacity-80 grayscale contrast-125" : "",

                className
            )}
            whileTap={{ scale: 0.95 }}
        >
            {/* Price Tag - Pixel Badge */}
            <div className="absolute -top-1.5 -right-1.5 z-20">
                <div className={cn(
                    "flex items-center gap-0.5 px-1 pb-0.5 pt-1 bg-black border border-white/50 shadow-sm",
                    "text-[8px] md:text-[10px] font-bold font-pixel-text text-white leading-none",
                    !hasPoints && "text-red-400" // Highlight cost if not enough
                )}>
                    <Zap className={cn("w-2 h-2", hasPoints ? "text-yellow-400 fill-yellow-400" : "text-red-400")} />
                    <span>{cost}</span>
                </div>
            </div>

            {/* Icon Area */}
            <div className="flex-1 flex items-center justify-center w-full mt-2">
                <Icon className={cn("w-6 h-6 md:w-8 md:h-8 drop-shadow-sm", theme.iconColor)} />
            </div>

            {/* Title - Pixel Font */}
            <div className="w-full text-center pb-1">
                <span className={cn(
                    "text-[8px] md:text-[10px] font-bold font-pixel-title tracking-normal",
                    theme.text
                )}>
                    {title}
                </span>
            </div>

            {/* Disabled Round Overlay (Only for game logic disable, NOT points) */}
            {isDisabled && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-sm">
                    <Lock className="w-5 h-5 text-white/70" />
                </div>
            )}

        </motion.button>
    );
}
