import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Crown, Skull, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RetroCard } from '@/components/ui/RetroCard';
import { useGame } from '@/lib/gameContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { playClickSound, playErrorSound } from '@/lib/sounds';

interface SquarePowerUpProps {
    type: 'wildcard' | 'banish';
    title: string;
    cost: number;
    icon: React.ElementType;
    status: 'locked' | 'available' | 'used' | 'disabled';
    onActivate: () => void;
}

function SquarePowerUp({ type, title, cost, icon: Icon, status, onActivate }: SquarePowerUpProps) {
    const isLocked = status === 'locked';
    const isUsed = status === 'used';
    const isDisabled = status === 'disabled';

    const theme = type === 'wildcard'
        ? { bg: 'bg-[#fbbf24]', border: 'border-[#b45309]', shadow: 'shadow-[#78350f]', text: 'text-[#78350f]' }
        : { bg: 'bg-[#f87171]', border: 'border-[#991b1b]', shadow: 'shadow-[#7f1d1d]', text: 'text-[#7f1d1d]' };

    const formatCost = (c: number) => c.toLocaleString('en-US');

    const handleClick = () => {
        if (isUsed || isDisabled) return;

        if (isLocked) {
            playErrorSound();
            toast({
                title: "رصيدك غير كافي! ❌",
                description: `محتاج ${cost} نقطة عشان تستخدم ${title}`,
                variant: "destructive",
            });
            return;
        }

        playClickSound();
        onActivate();
    };

    if (isUsed) {
        return (
            <div className="w-32 h-32 md:w-40 md:h-40 bg-black/40 border-4 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center grayscale relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-50" />
                <span className="font-pixel-title text-white/50 text-xl">مستخدم</span>
            </div>
        );
    }

    return (
        <motion.button
            onClick={handleClick}
            whileHover={!isDisabled && !isLocked ? { scale: 1.05, y: -4 } : {}}
            whileTap={!isDisabled && !isLocked ? { scale: 0.95 } : {}}
            className={cn(
                "relative w-32 h-32 md:w-40 md:h-40 rounded-xl border-4 flex flex-col items-center justify-center gap-2 transition-all group",
                theme.bg,
                theme.border,
                `shadow-[4px_4px_0_0_${type === 'wildcard' ? '#78350f' : '#7f1d1d'}]`,
                isDisabled ? "opacity-70 grayscale cursor-not-allowed" : "cursor-pointer"
            )}
        >
            {/* Price Badge */}
            <div className={cn(
                "absolute -top-3 -right-3 px-2 py-1 bg-black border-2 border-white/50 text-white font-pixel-text text-xs md:text-sm font-bold flex items-center gap-1 shadow-sm z-20",
                isLocked && "text-red-400 border-red-400"
            )}>
                <Zap className={cn("w-3 h-3", isLocked ? "text-red-400" : "text-yellow-400 fill-yellow-400")} />
                {formatCost(cost)}
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">
                <div className="p-3 bg-white/20 rounded-lg mb-1">
                    <Icon className={cn("w-10 h-10 md:w-12 md:h-12", theme.text)} />
                </div>
                <span className={cn("font-pixel-title text-lg md:text-xl font-bold", theme.text)}>{title}</span>
            </div>

            {/* Lock Overlay */}
            {isDisabled && (
                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center z-10">
                    <Lock className="w-8 h-8 text-white/80" />
                </div>
            )}
        </motion.button>
    );
}

export function PowerUpMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const { currentPlayer, activatePowerUp, currentRound, setBanishOverlay } = useGame();

    const toggleOpen = () => {
        playClickSound();
        setIsOpen(!isOpen);
    };

    const getStatus = (cost: number, used: boolean) => {
        if (used) return 'used';
        // If someone else has active wildcard, disable mine
        if (currentRound?.activePowerUp && currentRound.activePowerUp.playerId !== currentPlayer?.id) return 'disabled';

        const points = currentPlayer?.totalEarnedPoints || 0;
        return points >= cost ? 'available' : 'locked';
    };

    return (
        <>
            <Button
                onClick={toggleOpen}
                variant="primary" // Reusing our updated primary button style (no glow)
                className="h-10 md:h-14 px-3 md:px-6 flex items-center gap-2 font-pixel-title relative"
            >
                <div className="bg-yellow-400 text-[#4c1d95] p-1 rounded-sm border-2 border-[#4c1d95]">
                    <Zap className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                </div>
                <span className="hidden md:inline text-lg">مساعدات</span>
                {/* Mobile Icon Only or condensed text */}
                <span className="md:hidden text-sm">مساعدات</span>
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" style={{ zIndex: 9999 }}>
                        {/* We use Portal to escape stacking context of parent motion divs */}
                        {createPortal(
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    transition={{ type: "spring", duration: 0.3 }}
                                    className="relative w-full max-w-lg z-[10000]"
                                >
                                    <RetroCard className="border-[4px] shadow-2xl relative overflow-visible">
                                        {/* Close Button */}
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="absolute -top-5 -left-5 bg-red-500 text-white p-2 rounded-lg border-[3px] border-[#7f1d1d] shadow-[3px_3px_0_0_#4a0404] hover:scale-105 active:scale-95 transition-transform z-50"
                                        >
                                            <X className="w-6 h-6 stroke-[3]" />
                                        </button>

                                        <div className="text-center mb-6">
                                            <h2 className="text-3xl font-pixel-title text-[#4c1d95] mb-2 flex items-center justify-center gap-2">
                                                <Zap className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                                                المساعدات
                                            </h2>
                                            <p className="font-pixel-text text-lg text-muted-foreground">اختار مساعدة عشان تكسب الجولة!</p>
                                        </div>

                                        <div className="flex justify-center gap-4 md:gap-8 p-4">
                                            <SquarePowerUp
                                                type="wildcard"
                                                title="جوكر"
                                                cost={600}
                                                icon={Crown}
                                                status={getStatus(600, currentPlayer?.usedPowerUps?.wildcard || false)}
                                                onActivate={() => {
                                                    activatePowerUp('wildcard');
                                                    setIsOpen(false);
                                                }}
                                            />

                                            <SquarePowerUp
                                                type="banish"
                                                title="طرد"
                                                cost={350}
                                                icon={Skull}
                                                status={getStatus(350, currentPlayer?.usedPowerUps?.banish || false)}
                                                onActivate={() => {
                                                    setBanishOverlay(true);
                                                    setIsOpen(false);
                                                }}
                                            />
                                        </div>

                                        <div className="mt-4 text-center">
                                            <div className="inline-flex items-center gap-2 bg-[#4c1d95] text-white px-4 py-2 rounded-lg font-pixel-text border-2 border-[#2e1065]">
                                                <span>رصيدك الحالي:</span>
                                                <span className="text-yellow-400 font-bold text-xl">{currentPlayer?.totalEarnedPoints || 0}</span>
                                                <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            </div>
                                        </div>

                                    </RetroCard>
                                </motion.div>
                            </div>,
                            document.body
                        )}
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
