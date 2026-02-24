import { motion, useMotionValue, useAnimation, useTransform } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import type { Category } from '@shared/schema';

interface TicketCardProps {
    category: Category;
    word: string;
    playerName: string;
    playerId: string;
    onVote: (vote: 'yes' | 'no') => void;
    disabled: boolean;
    timeLeft: number;
}

/** Returns swipe threshold: 32% of viewport, clamped 90–160px */
function getSwipeThreshold(): number {
    return Math.max(90, Math.min(160, window.innerWidth * 0.32));
}

export function TicketCard({ category, word, playerName, onVote, disabled, timeLeft }: TicketCardProps) {
    const x = useMotionValue(0);
    const controls = useAnimation();
    const [threshold, setThreshold] = useState(getSwipeThreshold);
    const [isExpired, setIsExpired] = useState(false);

    // Recalculate threshold on orientation/resize changes
    useEffect(() => {
        const handler = () => setThreshold(getSwipeThreshold());
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    useEffect(() => {
        if (disabled) {
            setIsExpired(true);
            controls.start({ filter: 'grayscale(1)', scale: 0.95, transition: { duration: 0.4 } });
        }
    }, [disabled, controls]);

    // Neon hint arrows — opacity based on drag distance
    const leftArrowOpacity = useTransform(x, [-threshold, 0], [1, 0.15]);
    const rightArrowOpacity = useTransform(x, [0, threshold], [0.15, 1]);

    const handleDrag = useCallback((_: any, info: { offset: { x: number } }) => {
        if (disabled) return;
        const intensity = Math.min(Math.abs(info.offset.x) / (threshold * 2), 0.6);
        document.documentElement.style.setProperty('--glitch-intensity', intensity.toString());
    }, [disabled, threshold]);

    const handleDragEnd = useCallback((_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
        if (disabled) return;
        document.documentElement.style.setProperty('--glitch-intensity', '0');

        // Velocity boost: fast swipe counts as full threshold
        const velocityBoost = Math.abs(info.velocity.x) > 600 ? 1.4 : 1;
        const effectiveOffset = Math.abs(info.offset.x) * velocityBoost;

        if (effectiveOffset > threshold) {
            const vote = info.offset.x > 0 ? 'yes' : 'no';

            if (window.navigator?.vibrate) {
                window.navigator.vibrate(vote === 'yes' ? [30, 30, 30] : [50]);
            }

            controls.start({
                x: vote === 'yes' ? window.innerWidth * 1.5 : -window.innerWidth * 1.5,
                rotate: vote === 'yes' ? 25 : -25,
                opacity: 0,
                transition: { duration: 0.28, ease: 'easeIn' },
            }).then(() => onVote(vote));
        } else {
            controls.start({ x: 0, rotate: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
        }
    }, [disabled, threshold, controls, onVote]);

    return (
        <div className="relative w-full max-w-sm mx-auto" style={{ touchAction: 'none' }}>
            {/* Left hint arrow — glows brighter as you drag left */}
            <motion.div
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 text-[#ff0055] font-pixel-title text-2xl pointer-events-none z-20"
                style={{ opacity: leftArrowOpacity, filter: 'drop-shadow(0 0 8px #ff0055)' }}
            >
                ◀
            </motion.div>

            {/* Right hint arrow */}
            <motion.div
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 text-[#00ffaa] font-pixel-title text-2xl pointer-events-none z-20"
                style={{ opacity: rightArrowOpacity, filter: 'drop-shadow(0 0 8px #00ffaa)' }}
            >
                ▶
            </motion.div>

            {/* The ticket itself */}
            <motion.div
                className="pixel-ticket relative w-full aspect-[1/1.5] flex flex-col items-center justify-between p-6 overflow-hidden rounded-xl"
                style={{
                    x,
                    boxShadow: disabled ? 'none' : '0 0 20px #00f0ff, inset 0 0 10px #ff00ff',
                    background: disabled ? '#222' : '#0a0a0a',
                    borderColor: disabled ? '#555' : '#00f0ff',
                    borderWidth: 4,
                }}
                drag={disabled ? false : 'x'}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                dragMomentum={false}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                animate={controls}
            >
                <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />

                {/* Header */}
                <div className="w-full text-center border-b-[3px] border-[#00f0ff]/30 pb-4">
                    <h3 className="font-pixel-title text-sm text-[#00f0ff] uppercase tracking-widest">{category}</h3>
                    <p className="font-pixel-text text-xs text-[#00f0ff]/70 mt-2">لاعب: {playerName}</p>
                </div>

                {/* Word */}
                <div className="flex-1 flex items-center justify-center w-full">
                    <h2 className="font-pixel-title text-3xl text-white break-words text-center [text-shadow:3px_3px_0_#ff00ff]">
                        {word}
                    </h2>
                </div>

                {/* Footer — timer dots */}
                <div className="w-full border-t-[3px] border-[#00f0ff]/30 pt-4">
                    <div className="flex justify-between w-full mb-3 px-2">
                        <span className="text-[#ff0055] font-pixel-text text-[10px] [text-shadow:0_0_5px_#ff0055]">رفض - اسحب يسار</span>
                        <span className="text-[#00ffaa] font-pixel-text text-[10px] [text-shadow:0_0_5px_#00ffaa]">يمين - قبول</span>
                    </div>
                    <div className="flex justify-center gap-1.5">
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-2.5 h-2.5 rounded-full border-2 transition-colors duration-500 ${i < timeLeft ? 'bg-[#ff00ff] border-[#00f0ff]' : 'bg-transparent border-[#444]'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Expired stamp */}
                {isExpired && (
                    <motion.div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                        initial={{ scale: 0, rotate: -20, opacity: 0 }}
                        animate={{ scale: 1.2, rotate: -15, opacity: 1 }}
                        transition={{ type: 'spring', damping: 15 }}
                    >
                        <div className="border-4 border-red-500 text-red-500 font-pixel-title text-4xl p-4 rotate-12 backdrop-blur-sm bg-black/50">
                            منتهية!
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
