import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState, useCallback, useMemo } from 'react';

interface GameScoreProps {
    score: number;
    previousScore?: number;
    maxScore?: number;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    hideProgressBar?: boolean;
}

const SIZE_CONFIG = {
    sm: { digit: 'w-6 h-8 text-lg', container: 'gap-0.5', particle: 6 },
    md: { digit: 'w-8 h-10 text-xl', container: 'gap-1', particle: 10 },
    lg: { digit: 'w-12 h-14 text-3xl', container: 'gap-1.5', particle: 16 },
};

export function GameScore({
    score,
    previousScore = 0,
    maxScore = 999,
    showLabel = true,
    size = 'md',
    className = '',
    hideProgressBar = false
}: GameScoreProps) {
    const [displayScore, setDisplayScore] = useState(score);
    const [isAnimating, setIsAnimating] = useState(false);
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([]);

    const config = SIZE_CONFIG[size];

    // Animated progress bar
    const progressPercent = useSpring(0, { stiffness: 100, damping: 20 });
    const progressWidth = useTransform(progressPercent, [0, 100], ['0%', '100%']);

    useEffect(() => {
        progressPercent.set((score / maxScore) * 100);
    }, [score, maxScore, progressPercent]);

    // Score change animation with cascade effect
    useEffect(() => {
        if (score !== displayScore) {
            setIsAnimating(true);

            // Determine if this is a gain or loss
            const isGain = score > displayScore;
            const delta = Math.abs(score - displayScore);

            // Spawn celebration particles for gains
            if (isGain && delta >= 5) {
                const newParticles = Array.from({ length: config.particle }).map((_, i) => ({
                    id: Date.now() + i,
                    x: Math.random() * 120 - 60,
                    y: Math.random() * -80 - 20,
                    color: ['#fbbf24', '#a855f7', '#22c55e', '#f43f5e', '#3b82f6'][Math.floor(Math.random() * 5)],
                    delay: i * 0.05,
                }));
                setParticles(newParticles);
                setTimeout(() => setParticles([]), 1000);
            }

            // Cascade digit update
            const steps = Math.min(delta, 10);
            const stepDuration = 300 / steps;
            let currentStep = 0;

            const interval = setInterval(() => {
                currentStep++;
                const progress = currentStep / steps;
                setDisplayScore(Math.round(displayScore + (score - displayScore) * progress));

                if (currentStep >= steps) {
                    clearInterval(interval);
                    setDisplayScore(score);
                    setIsAnimating(false);
                }
            }, stepDuration);

            return () => clearInterval(interval);
        }
    }, [score, displayScore, config.particle]);

    const digits = useMemo(() => {
        // Determine how many digits to show based on maxScore or current score
        const requiredLength = Math.max(String(maxScore).length, String(displayScore).length, 2); // At least 2 digits

        return String(Math.min(displayScore, maxScore)).padStart(requiredLength, '0').split('');
    }, [displayScore, maxScore]);

    const getDigitColor = useCallback((digitValue: number) => {
        if (displayScore >= maxScore * 0.9) return 'from-amber-300 to-amber-500 text-amber-900 border-amber-900';
        if (displayScore >= maxScore * 0.7) return 'from-emerald-300 to-emerald-500 text-emerald-900 border-emerald-900';
        if (displayScore >= maxScore * 0.5) return 'from-purple-300 to-purple-500 text-purple-900 border-purple-900';
        return 'from-gray-200 to-gray-400 text-gray-700 border-gray-700';
    }, [displayScore, maxScore]);

    return (
        <div className={`relative inline-flex flex-col items-center ${className}`}>
            {/* Label */}
            {showLabel && (
                <motion.span
                    className="font-pixel-text text-sm text-purple-700 mb-2"
                    animate={{ scale: isAnimating ? [1, 1.1, 1] : 1 }}
                    transition={{ duration: 0.3 }}
                >
                    النتيجة
                </motion.span>
            )}

            {/* Score container with particles */}
            <div className={`relative flex ${config.container}`}>
                {/* Celebration particles */}
                <AnimatePresence>
                    {particles.map((particle) => (
                        <motion.div
                            key={particle.id}
                            className="absolute w-3 h-3 rounded-full z-20"
                            style={{
                                background: particle.color,
                                left: '50%',
                                top: '50%',
                            }}
                            initial={{ x: 0, y: 0, scale: 0 }}
                            animate={{
                                x: particle.x,
                                y: particle.y,
                                scale: [0, 1.2, 0.8, 0],
                                rotate: [0, 180, 360],
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                                duration: 0.8,
                                delay: particle.delay,
                                ease: 'easeOut'
                            }}
                        />
                    ))}
                </AnimatePresence>

                {/* Digit display */}
                {digits.map((digit, index) => {
                    const digitColorClass = getDigitColor(parseInt(digit));
                    const borderColor = digitColorClass.split(' ').find(c => c.startsWith('border-'))?.replace('border', 'bg') || 'bg-purple-900';

                    return (
                        <motion.div
                            key={index}
                            className={`relative ${config.digit} overflow-hidden rounded-sm`}
                            animate={isAnimating ? {
                                y: [0, -4, 0],
                            } : {}}
                            transition={{ duration: 0.15, delay: index * 0.02 }}
                        >
                            {/* Digit background with gradient */}
                            <div className={`absolute inset-0 bg-gradient-to-b ${digitColorClass} border-2`} />

                            {/* Hard shadow */}
                            <div className={`absolute inset-0 translate-x-[2px] translate-y-[2px] ${borderColor} -z-10`} />

                            {/* Digit value */}
                            <AnimatePresence mode="popLayout">
                                <motion.span
                                    key={digit}
                                    className="absolute inset-0 flex items-center justify-center font-pixel-title"
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 20, opacity: 0 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                >
                                    {digit}
                                </motion.span>
                            </AnimatePresence>
                        </motion.div>
                    )
                })}
            </div>

            {/* Progress bar */}
            {!hideProgressBar && (
                <div className="w-full h-2 mt-2 bg-purple-200 border border-purple-900 overflow-hidden rounded-sm">
                    <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-amber-400"
                        style={{ width: progressWidth }}
                    />
                </div>
            )}

            {/* Delta indicator */}
            <AnimatePresence>
                {score !== previousScore && isAnimating && (
                    <motion.div
                        className={`absolute -top-4 left-1/2 font-pixel-text text-sm ${score > previousScore ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                        initial={{ opacity: 0, y: 0, x: '-50%' }}
                        animate={{ opacity: 1, y: -20 }}
                        exit={{ opacity: 0, y: -30 }}
                        transition={{ duration: 0.5 }}
                    >
                        {score > previousScore ? '+' : ''}{score - previousScore}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
