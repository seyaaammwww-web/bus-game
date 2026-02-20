import { motion, useAnimation } from 'framer-motion';
import { Lock, Zap, Skull, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RetroCard } from './ui/RetroCard';
import { toast } from '@/hooks/use-toast';
import { playClick, playWrong } from '@/lib/sounds';

// --- Constants & Config ---
const TEXTS = {
    lockedTitle: "محتاج نقط أكتر! ❌",
    lockedDesc: "تحتاج {cost} نقطة لتفعيل {title}",
    disabledTitle: "غير متاح حالياً 🔒",
    disabledDesc: "البطاقة غير متاحة للاستخدام الآن",
    usedLabel: "تم"
} as const;

const THEMES = {
    wildcard: {
        bg: 'bg-pixel-amber',
        border: 'border-pixel-amber-border',
        shadow: 'md:shadow-[4px_4px_0px_theme(colors.pixel.amber.shadow)]',
        text: 'text-pixel-amber-text',
        iconColor: 'text-pixel-amber-text'
    },
    banish: {
        bg: 'bg-pixel-red',
        border: 'border-pixel-red-border',
        shadow: 'md:shadow-[4px_4px_0px_theme(colors.pixel.red.shadow)]',
        text: 'text-pixel-red-text',
        iconColor: 'text-pixel-red-text'
    }
} as const;

export type PowerUpStatus = 'locked' | 'available' | 'used' | 'disabled';

interface PowerUpCardProps {
    type: 'wildcard' | 'banish';
    title: string;
    description: string;
    cost: number;
    status: PowerUpStatus;
    onActivate: () => void;
    icon: React.ElementType;
    className?: string;
}

export function PowerUpCard({
    type,
    title,
    cost,
    status,
    onActivate,
    icon: Icon,
    className
}: PowerUpCardProps) {
    const controls = useAnimation();
    const theme = THEMES[type];

    // Helper booleans for render logic
    const isUsed = status === 'used';
    const isDisabled = status === 'disabled';
    const isLocked = status === 'locked';
    const isAvailable = status === 'available';

    const handleClick = async () => {
        if (isUsed || isDisabled) return;

        if (isLocked) {
            playWrong();
            // Trigger Shake Animation
            controls.start({
                x: [0, -5, 5, -5, 5, 0],
                transition: { duration: 0.4 }
            });

            toast({
                title: TEXTS.lockedTitle,
                description: TEXTS.lockedDesc.replace('{cost}', cost.toString()).replace('{title}', title),
                variant: "destructive",
                duration: 1500,
            });
            return;
        }

        // Success
        playClick();
        onActivate();
    };

    // Burnt/Used State - Animated Scanlines
    if (isUsed) {
        return (
            <button
                disabled
                className={cn(
                    "w-10 h-14 md:w-16 md:h-24 bg-black/40 border-2 border-dashed border-white/20 flex flex-col items-center justify-center relative overflow-hidden grayscale opacity-60 cursor-not-allowed",
                    className
                )}
                aria-label={`${title} (Used)`}
            >
                {/* Animated Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-50 animate-scanline" />
                <span className="text-[8px] md:text-[10px] text-white/50 font-bold font-pixel-text z-10">{TEXTS.usedLabel}</span>
            </button>
        );
    }

    return (
        <motion.button
            onClick={handleClick}
            className={cn(
                "relative group",
                "w-11 h-16 md:w-16 md:h-24", // Compact Pixel Card Size
                "border-2 md:border-[3px]",
                "flex flex-col items-center justify-between p-1",
                "rounded-sm",
                "transition-transform active:translate-y-1 active:shadow-none", // Mechanical click feel

                [
                    theme.bg,
                    theme.border,
                    "shadow-[2px_2px_0px_rgba(0,0,0,0.5)]",
                    theme.shadow,
                    "cursor-pointer",
                    "hover:-translate-y-1"
                ],
                // Visual disable logic
                isDisabled ? "opacity-80 grayscale contrast-125 cursor-not-allowed hover:translate-y-0" : "",

                className
            )}
            animate={controls}
            whileTap={!isDisabled && !isLocked ? { scale: 0.95 } : {}}
            aria-disabled={isDisabled || isLocked}
        >
            {/* Price Tag - Pixel Badge */}
            <div className="absolute -top-1.5 -right-1.5 z-20">
                <div className={cn(
                    "flex items-center gap-0.5 px-1 pb-0.5 pt-1 bg-black border border-white/50 shadow-sm",
                    "text-[8px] md:text-[10px] font-bold font-pixel-text text-white leading-none",
                    isLocked && "text-red-400" // Highlight cost if not enough
                )}>
                    <Zap className={cn("w-2 h-2", !isLocked ? "text-yellow-400 fill-yellow-400" : "text-red-400")} />
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

            {/* Disabled Round Overlay */}
            {isDisabled && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-sm">
                    <Lock className="w-5 h-5 text-white/70" />
                </div>
            )}

        </motion.button>
    );
}
