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
        ? { bg: 'bg-[#FFA168]', text: 'text-[#350D7A]' }
        : { bg: 'bg-[#FF6957]', text: 'text-[#350D7A]' };

    const formatCost = (c: number) => c.toLocaleString('en-US');

    const handleClick = () => {
        if (isUsed || isDisabled) return;

        if (isLocked) {
            playErrorSound();
            toast({
                title: "رصيدك غير كافي!",
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
            <div className="w-32 h-32 md:w-40 md:h-40 bg-[#FFFDCC] border-[3px] border-dashed border-[#350D7A]/40 rounded-sm flex flex-col items-center justify-center relative overflow-hidden opacity-70">
                <span className="font-bold text-[#350D7A]/50 text-xl">مستخدم</span>
            </div>
        );
    }

    return (
        <button
            onClick={handleClick}
            className={cn(
                "relative w-32 h-32 md:w-40 md:h-40 rounded-sm border-[3px] border-[#350D7A] flex flex-col items-center justify-center gap-2 group",
                theme.bg,
                isDisabled ? "opacity-70 grayscale cursor-not-allowed pointer-events-none shadow-pixel-sm" : "shadow-pixel hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-pixel-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-pixel-sm"
            )}
        >
            {/* Price Badge */}
            <div className={cn(
                "absolute -top-3 -right-3 px-2.5 py-1 bg-[#350D7A] border-2 border-[#350D7A] text-[#FFFEE2] text-xs md:text-sm font-bold flex items-center gap-1 shadow-pixel-sm rounded-sm z-20",
                isLocked && "text-[#FF6957]"
            )}>
                <Zap className={cn("w-3 h-3", isLocked ? "text-[#FF6957]" : "text-[#FFC48B] fill-[#FFC48B]")} />
                {formatCost(cost)}
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center">
                <div className="p-3 bg-[#FFFEE2]/30 rounded-sm mb-1">
                    <Icon className={cn("w-10 h-10 md:w-12 md:h-12", theme.text)} />
                </div>
                <span className={cn("font-pixel-title text-lg md:text-xl font-bold", theme.text)}>{title}</span>
            </div>

            {/* Lock Overlay */}
            {isDisabled && (
                <div className="absolute inset-0 bg-[#350D7A]/50 rounded-sm flex items-center justify-center z-10">
                    <Lock className="w-8 h-8 text-[#FFFEE2]/90" />
                </div>
            )}
        </button>
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
        if (currentRound?.powerUpUsedInRound) return 'disabled';
        if (currentRound?.activePowerUp && currentRound.activePowerUp.playerId !== currentPlayer?.id) return 'disabled';

        const points = currentPlayer?.totalEarnedPoints || 0;
        return points >= cost ? 'available' : 'locked';
    };

    return (
        <>
            <Button
                onClick={toggleOpen}
                variant="retro"
                className="h-10 md:h-14 px-4 md:px-6 flex items-center justify-center gap-2 relative overflow-hidden group"
            >
                <div className="relative z-10 flex items-center justify-center">
                    <Zap className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                </div>

                <div className="relative z-10 flex items-center justify-center mt-1">
                    <span className="text-base md:text-xl">مساعدات</span>
                </div>
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#350D7A]/85" style={{ zIndex: 9999 }}>
                        {/* We use Portal to escape stacking context of parent motion divs */}
                        {createPortal(
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#350D7A]/85">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    transition={{ type: "spring", duration: 0.3 }}
                                    className="relative w-full max-w-lg z-[10000]"
                                >
                                    <RetroCard className="shadow-2xl relative overflow-visible">
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="absolute -top-4 -left-4 bg-[#FF6957] text-[#350D7A] p-2 rounded-sm border-[3px] border-[#350D7A] shadow-pixel-sm hover:bg-[#FF8A50] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none z-50"
                                        >
                                            <X className="w-6 h-6 stroke-[3]" />
                                        </button>

                                        <div className="text-center mb-6">
                                            <h2 className="text-3xl font-pixel-title text-[#350D7A] mb-2 flex items-center justify-center gap-2">
                                                <Zap className="w-8 h-8 text-[#FF8A50] fill-[#FF8A50]" />
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
                                            <div className="inline-flex items-center gap-2 bg-[#6714A8] text-[#FFFEE2] px-5 py-2.5 rounded-sm border-[3px] border-[#350D7A] font-bold shadow-pixel-sm">
                                                <span>رصيدك الحالي:</span>
                                                <span className="text-[#FFC48B] font-bold text-xl">{currentPlayer?.totalEarnedPoints || 0}</span>
                                                <Zap className="w-4 h-4 text-[#FFC48B] fill-[#FFC48B]" />
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
