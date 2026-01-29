import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Sparkle {
    id: number;
    x: number;
    y: number;
    size: number;
    color: string;
}

const colors = ['#FFD700', '#FF69B4', '#00FFFF', '#FFF'];

export const MouseSparkles = () => {
    const [sparkles, setSparkles] = useState<Sparkle[]>([]);

    useEffect(() => {
        let count = 0;
        const handleMouseMove = (e: MouseEvent) => {
            // Throttle creation for performance
            if (Math.random() > 0.3) return;

            const newSparkle: Sparkle = {
                id: count++,
                x: e.clientX,
                y: e.clientY,
                size: Math.random() * 8 + 4, // 4px to 12px
                color: colors[Math.floor(Math.random() * colors.length)]
            };

            setSparkles(prev => [...prev.slice(-20), newSparkle]); // Keep max 20 particles
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Cleanup old sparkles automatically handled by AnimatePresence on removal?
    // Actually, we need to remove them from state after animation or just keep a rolling buffer.
    // Better: Remove from state after timeout.

    useEffect(() => {
        const interval = setInterval(() => {
            if (sparkles.length > 0) {
                // Remove oldest
                setSparkles(prev => prev.slice(1));
            }
        }, 100);
        return () => clearInterval(interval);
    }, [sparkles.length]);

    return (
        <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
            <AnimatePresence>
                {sparkles.map((sparkle) => (
                    <motion.div
                        key={sparkle.id}
                        initial={{ opacity: 1, scale: 0, x: sparkle.x, y: sparkle.y }}
                        animate={{
                            opacity: 0,
                            scale: 1,
                            y: sparkle.y + 20, // Fall down slightly
                            x: sparkle.x + (Math.random() - 0.5) * 20
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{
                            position: 'absolute',
                            width: sparkle.size,
                            height: sparkle.size,
                            backgroundColor: sparkle.color,
                            boxShadow: `0 0 ${sparkle.size}px ${sparkle.color}`,
                            borderRadius: '50%', // Or '0%' for square pixels
                        }}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};
