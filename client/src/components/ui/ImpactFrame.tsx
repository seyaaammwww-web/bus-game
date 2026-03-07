import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ImpactFrameProps {
    show: boolean;
    text: string;
    onComplete?: () => void;
    duration?: number;
}

export function ImpactFrame({ show, text, onComplete, duration = 1500 }: ImpactFrameProps) {
    const [isVisible, setIsVisible] = useState(show);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                onComplete?.();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-purple-900/80 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                >
                    {/* Radial burst lines */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {Array.from({ length: 16 }).map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute left-1/2 top-1/2 h-[200%] w-4 origin-bottom"
                                style={{
                                    background: `linear-gradient(to top, transparent, ${i % 2 ? '#fbbf24' : '#fff'})`,
                                    transform: `translateX(-50%) translateY(-50%) rotate(${i * 22.5}deg)`,
                                }}
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: [0, 1.2, 1] }}
                                transition={{ delay: i * 0.02, duration: 0.3, ease: 'easeOut' }}
                            />
                        ))}
                    </div>

                    {/* Main text with shake */}
                    <motion.div
                        className="relative z-10 px-8 md:px-16 py-6 border-[4px] border-purple-900 shadow-[8px_8px_0_0_#2e1065] overflow-hidden"
                        initial={{ scale: 0, rotate: -15 }}
                        animate={{
                            scale: 1,
                            rotate: 0,
                            x: [0, -5, 5, -5, 5, 0],
                            y: [0, 5, -5, 5, -5, 0],
                        }}
                        transition={{
                            scale: { type: 'spring', stiffness: 400, damping: 15 },
                            rotate: { type: 'spring', stiffness: 400, damping: 15 },
                            x: { delay: 0.1, duration: 0.4, ease: 'easeInOut' },
                            y: { delay: 0.1, duration: 0.4, ease: 'easeInOut' }
                        }}
                    >
                        {/* Diagonal shine background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500" />
                        <motion.div
                            className="absolute inset-0 bg-white/40"
                            initial={{ x: '-100%', skewX: -20 }}
                            animate={{ x: '200%' }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
                        />

                        <span className="relative z-10 font-pixel-title text-4xl md:text-6xl text-purple-900 drop-shadow-[2px_2px_0_#fff]">
                            {text}
                        </span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
