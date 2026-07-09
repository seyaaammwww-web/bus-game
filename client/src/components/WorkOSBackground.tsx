import React, { useMemo } from 'react';
import '../styles/WorkOSBackground.css';

interface Star {
    id: number;
    top: number;
    left: number;
    delay: number;
    size: number;
}

interface MicroDot {
    id: number;
    top: number;
    left: number;
    delay: number;
    size: number;
    color: string;
    duration: number;
}

interface Cloud {
    id: number;
    src: string;
    top: number;
    width: number;
    opacity: number;
    duration: number;
    delay: number;
}

// Sparkle colors — strictly the sunset palette (cream + light purple + pink)
const purpleGradient = [
    '#FFFEE2', '#FFFDCC', '#A333D5', '#F640A8', '#FFC48B',
];

interface WorkOSBackgroundProps {
    /** If true, reduces particle count for mobile performance (keeps all visual effects) */
    isMobile?: boolean;
}

const WorkOSBackground: React.FC<WorkOSBackgroundProps> = ({ isMobile = false }) => {
    // Generate white stars — fewer on mobile for performance
    const stars = useMemo(() => {
        const count = isMobile ? 40 : 100;
        const generated: Star[] = [];
        for (let i = 0; i < count; i++) {
            generated.push({
                id: i,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 4,
                size: Math.random() > 0.7 ? 3 : 2,
            });
        }
        return generated;
    }, [isMobile]);

    // Generate micro dots with purple gradient colors — fewer on mobile
    const microDots = useMemo(() => {
        const count = isMobile ? 80 : 300;
        const generated: MicroDot[] = [];
        for (let i = 0; i < count; i++) {
            generated.push({
                id: i,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 5,
                size: Math.random() * 2 + 1,
                color: purpleGradient[Math.floor(Math.random() * purpleGradient.length)],
                duration: Math.random() * 3 + 2,
            });
        }
        return generated;
    }, [isMobile]);

    // Generate clouds with RANDOM positions, speeds, and delays — fewer on mobile
    const clouds = useMemo(() => {
        const cloudImages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        const generated: Cloud[] = [];

        // Mobile: 4 clouds, Desktop: 8-10 clouds
        const numClouds = isMobile ? 4 : 8 + Math.floor(Math.random() * 3);

        for (let i = 0; i < numClouds; i++) {
            const cloudNum = cloudImages[Math.floor(Math.random() * cloudImages.length)];
            generated.push({
                id: i,
                src: `/images/hero/clouds/${cloudNum}.png`,
                top: 5 + Math.random() * 50,
                width: 100 + Math.random() * 150,
                opacity: 0.4 + Math.random() * 0.5,
                // Slower animations on mobile to reduce repaints
                duration: isMobile ? 60 + Math.random() * 40 : 40 + Math.random() * 60,
                delay: -Math.random() * 50,
            });
        }
        return generated;
    }, [isMobile]);

    return (
        <div className={`workos-background${isMobile ? ' mobile-optimized' : ''}`}>
            {/* Gradient Overlay for depth */}
            <div className="workos-gradient-overlay" />

            {/* Micro Dots Layer - The Art */}
            <div className="workos-micro-dots-container">
                {microDots.map((dot) => (
                    <div
                        key={`dot-${dot.id}`}
                        className="workos-micro-dot"
                        style={{
                            top: `${dot.top}%`,
                            left: `${dot.left}%`,
                            width: Math.round(dot.size),
                            height: Math.round(dot.size),
                            backgroundColor: dot.color,
                            animationDelay: `${dot.delay}s`,
                            animationDuration: `${dot.duration}s`,
                        }}
                    />
                ))}
            </div>

            {/* Stars Layer - White twinkles */}
            <div className="workos-stars-container">
                {stars.map((star) => (
                    <div
                        key={`star-${star.id}`}
                        className="workos-star blink"
                        style={{
                            top: `${star.top}%`,
                            left: `${star.left}%`,
                            animationDelay: `${star.delay}s`,
                            width: star.size,
                            height: star.size,
                        }}
                    />
                ))}
            </div>

            {/* Moon - Always visible, smaller on mobile */}
            <img
                src="/images/hero/moon.png"
                alt=""
                className={`workos-moon${isMobile ? ' workos-moon-mobile' : ''}`}
            />

            {/* Clouds Layer - RANDOMIZED */}
            <div className="workos-clouds-container">
                {clouds.map((cloud) => (
                    <img
                        key={`cloud-${cloud.id}`}
                        src={cloud.src}
                        alt=""
                        className="workos-cloud-random"
                        style={{
                            top: `${cloud.top}%`,
                            width: cloud.width,
                            opacity: cloud.opacity,
                            animationDuration: `${cloud.duration}s`,
                            animationDelay: `${cloud.delay}s`,
                        }}
                    />
                ))}
            </div>

            {/* Vignette */}
            <div className="workos-vignette" />
        </div>
    );
};

export default WorkOSBackground;
