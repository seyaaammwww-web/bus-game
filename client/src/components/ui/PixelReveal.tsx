
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PixelRevealProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    duration?: number;
    pixelSize?: 4 | 6; // Matching WorkOS ps-4 and ps-6 classes
}

export function PixelReveal({
    children,
    className,
    delay = 0,
    duration = 0.8,
    pixelSize = 4
}: PixelRevealProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, delay * 1000);
        return () => clearTimeout(timer);
    }, [delay]);

    // SVG Data URIs extracted from WorkOS source
    // These are pixelated vertical bars that create the wipe effect when used as a mask
    const maskImagePs4 = `url("data:image/svg+xml,%3Csvg width='28' height='212' viewBox='0 0 28 212' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='4' height='4' fill='black'/%3E%3Crect x='8' width='4' height='4' fill='black'/%3E%3Crect x='20' width='4' height='4' fill='black'/%3E%3Crect y='4' width='28' height='204' fill='black'/%3E%3Crect y='208' width='4' height='4' fill='black'/%3E%3Crect x='8' y='208' width='4' height='4' fill='black'/%3E%3Crect x='20' y='208' width='4' height='4' fill='black'/%3E%3C/svg%3E")`;

    const maskImagePs6 = `url("data:image/svg+xml,%3Csvg width='42' height='212' viewBox='0 0 42 212' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='6' height='6' fill='black'/%3E%3Crect x='12' width='6' height='6' fill='black'/%3E%3Crect x='30' width='6' height='6' fill='black'/%3E%3Crect y='6' width='42' height='200' fill='black'/%3E%3Crect y='206' width='6' height='6' fill='black'/%3E%3Crect x='12' y='206' width='6' height='6' fill='black'/%3E%3Crect x='30' y='206' width='6' height='6' fill='black'/%3E%3C/svg%3E")`;

    const maskImage = pixelSize === 6 ? maskImagePs6 : maskImagePs4;
    const maskSize = pixelSize === 6 ? '42px 212px' : '28px 212px';

    return (
        <div
            className={cn("relative overflow-hidden", className)}
        >
            <motion.div
                initial={{
                    opacity: 0,
                    maskPosition: '0% 212px',
                    webkitMaskPosition: '0% 212px'
                }}
                animate={isVisible ? {
                    opacity: 1,
                    maskPosition: '0% 0px',
                    webkitMaskPosition: '0% 0px'
                } : {}}
                transition={{
                    duration: duration,
                    ease: [0.76, 0, 0.24, 1] // WorkOS custom bezier
                }}
                style={{
                    maskImage: maskImage,
                    WebkitMaskImage: maskImage,
                    maskSize: maskSize,
                    WebkitMaskSize: maskSize,
                    maskRepeat: 'repeat-x',
                    WebkitMaskRepeat: 'repeat-x',
                }}
            >
                {children}
            </motion.div>
        </div>
    );
}
