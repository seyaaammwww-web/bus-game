import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Crown, Skull, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RetroCard } from '@/components/ui/RetroCard';
import { useGame } from '@/lib/gameContext';
import { cn } from '@/lib/utils';
import { playClickSound, playErrorSound } from '@/lib/sounds';
import { POWER_UP_COSTS, categories } from '@shared/schema';

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
    const [showLockedMsg, setShowLockedMsg] = useState(false);
    const [shaking, setShaking] = useState(false);

    const theme = type === 'wildcard'
        ? { bg: 'bg-[#fbbf24]', text: 'text-[#78350f]' }
        : { bg: 'bg-[#f87171]', text: 'text-[#7f1d1d]' };

    const formatCost = (c: number) => c.toLocaleString('en-US');

    const handleClick = () => {
        if (isUsed || isDisabled) return;

        if (isLocked) {
            playErrorSound();
            // Show inline locked message + shake
            setShaking(true);
            setShowLockedMsg(true);
            setTimeout(() => setShaking(false), 500);
            setTimeout(() => setShowLockedMsg(false), 2500);
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
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={handleClick}
                className={cn(
                    "relative w-32 h-32 md:w-40 md:h-40 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all active:scale-95",
                    theme.bg,
                    shaking && "animate-shake",
                    isLocked && "opacity-80 grayscale-[30%]",
                    isDisabled ? "opacity-70 grayscale cursor-not-allowed pointer-events-none" : "hover:scale-105 hover:-translate-y-1 hover:brightness-110 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] border-[3px]"
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

                {/* Lock Overlay for locked state */}
                {isLocked && (
                    <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center z-10">
                        <Lock className="w-6 h-6 text-white/80" />
                    </div>
                )}

                {/* Lock Overlay for disabled */}
                {isDisabled && (
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center z-10">
                        <Lock className="w-8 h-8 text-white/80" />
                    </div>
                )}
            </button>

            {/* Inline error message when clicking without enough points */}
            {showLockedMsg && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-red-500 text-white px-3 py-1.5 rounded-lg font-pixel-text text-xs md:text-sm text-center border-2 border-red-700 shadow-[2px_2px_0_0_#7f1d1d] max-w-[140px]"
                >
                    محتاج {formatCost(cost)} نقطة! ⚡
                </motion.div>
            )}
        </div>
    );
}

// ✅ NEW: Category Selection Overlay for Wildcard
function WildcardCategoryOverlay({
    isOpen,
    onClose,
    onSelect
}: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (category: string) => void;
}) {
    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-gradient-to-b from-white to-[#faf5ff] p-6 border-[4px] border-[#4c1d95] shadow-[6px_6px_0_0_#2e1065] max-w-md w-full"
            >
                <h3 className="text-2xl font-pixel-title text-[#4c1d95] mb-4 text-center">
                    اختر الفئة للجوكر
                </h3>
                <p className="font-pixel-text text-[#7c3aed] mb-4 text-center text-sm">
                    سيتم توليد كلمة صحيحة تلقائياً
                </p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => {
                                onSelect(cat);
                                onClose();
                            }}
                            className="p-4 bg-gradient-to-b from-amber-200 to-amber-300 border-[3px] border-[#78350f] text-[#78350f] font-pixel-title text-lg hover:brightness-110 active:translate-y-[2px] transition-all shadow-[3px_3px_0_0_#78350f]"
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-2 bg-gray-200 border-[2px] border-gray-400 text-gray-700 font-pixel-text hover:bg-gray-300 transition-colors"
                >
                    إلغاء
                </button>
            </motion.div>
        </motion.div>
    );
}

export function PowerUpMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [showWildcardOverlay, setShowWildcardOverlay] = useState(false);
    const { currentPlayer, activatePowerUp, currentRound, setBanishOverlay } = useGame();

    useEffect(() => {
        console.log('[PowerUpMenu] Mounted');
        return () => console.log('[PowerUpMenu] Unmounted');
    }, []);

    useEffect(() => {
        console.log('[PowerUpMenu] isOpen changed to:', isOpen);
    }, [isOpen]);

    const toggleOpen = () => {
        playClickSound();
        setIsOpen(!isOpen);
    };

    const getStatus = (cost: number, used: boolean) => {
        try {
            if (used) return 'used';
            // If someone else has active wildcard, disable mine
            if (currentRound?.activePowerUp && currentRound.activePowerUp.playerId !== currentPlayer?.id) {
                return 'disabled';
            }

            const points = currentPlayer?.totalEarnedPoints ?? 0;
            return points >= (cost || 0) ? 'available' : 'locked';
        } catch (e) {
            console.error('[PowerUpMenu] Error in getStatus:', e);
            return 'locked';
        }
    };

    const handleWildcardSelect = (category: string) => {
        // ✅ FIX: Send category with the power-up activation
        activatePowerUp('wildcard', undefined, category);
        setIsOpen(false);
    };

    return (
        <>
            <Button
                onClick={toggleOpen}
                className="retro-action-btn h-10 md:h-14 px-4 md:px-6 flex items-center justify-center gap-2 font-pixel-title relative overflow-hidden bg-gradient-to-b from-[#fbbf24] to-[#f59e0b] text-[#78350f] group rounded-xl !shadow-[3px_3px_0_0_#78350f] !border-[#78350f] hover:brightness-110"
            >
                {/* Shimmer Effect */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 w-[40%]"
                    animate={{ left: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear", repeatDelay: 1 }}
                />

                <div className="relative z-10 flex items-center justify-center">
                    <Zap className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                </div>

                <div className="relative z-10 flex items-center justify-center mt-1">
                    <span className="text-base md:text-xl">مساعدات</span>
                </div>

                <div className="absolute right-1 top-1 w-1 h-1 bg-white/60 rounded-full animate-pulse" />
                <div className="absolute left-2 bottom-1 w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse delay-700" />
            </Button>

            <AnimatePresence>
                {isOpen && createPortal(
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
                                        cost={POWER_UP_COSTS.wildcard}
                                        icon={Crown}
                                        status={getStatus(POWER_UP_COSTS.wildcard, currentPlayer?.usedPowerUps?.wildcard || false)}
                                        onActivate={() => {
                                            // ✅ FIX: Show category selection overlay first
                                            setShowWildcardOverlay(true);
                                        }}
                                    />

                                    <SquarePowerUp
                                        type="banish"
                                        title="طرد"
                                        cost={POWER_UP_COSTS.banish}
                                        icon={Skull}
                                        status={getStatus(POWER_UP_COSTS.banish, currentPlayer?.usedPowerUps?.banish || false)}
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
            </AnimatePresence>

            {/* ✅ NEW: Wildcard Category Selection Overlay */}
            <AnimatePresence>
                {showWildcardOverlay && createPortal(
                    <WildcardCategoryOverlay
                        isOpen={showWildcardOverlay}
                        onClose={() => setShowWildcardOverlay(false)}
                        onSelect={handleWildcardSelect}
                    />,
                    document.body
                )}
            </AnimatePresence>
        </>
    );
}
