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

// Purple gradient colors for artistic effect
const purpleGradient = [
    '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#6d28d9',
    '#5b21b6', '#4c1d95', '#e9d5ff', '#06b6d4', '#22d3ee',
];

interface WorkOSBackgroundProps {
    performanceMode?: boolean;
}

const WorkOSBackground: React.FC<WorkOSBackgroundProps> = ({ performanceMode = false }) => {
    // Generate white stars
    const stars = useMemo(() => {
        if (performanceMode) return [];
        const generated: Star[] = [];
        for (let i = 0; i < 100; i++) {
            generated.push({
                id: i,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 4,
                size: Math.random() > 0.7 ? 3 : 2,
            });
        }
        return generated;
    }, [performanceMode]);

    // Generate MANY micro dots with purple gradient colors
    const microDots = useMemo(() => {
        if (performanceMode) return [];
        const generated: MicroDot[] = [];
        for (let i = 0; i < 300; i++) {
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
    }, [performanceMode]);

    // Generate clouds with RANDOM positions, speeds, and delays
    const clouds = useMemo(() => {
        if (performanceMode) return [];
        const cloudImages = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        const generated: Cloud[] = [];

        // Create 8-10 clouds with random properties
        const numClouds = 8 + Math.floor(Math.random() * 3);

        for (let i = 0; i < numClouds; i++) {
            const cloudNum = cloudImages[Math.floor(Math.random() * cloudImages.length)];
            generated.push({
                id: i,
                src: `/images/hero/clouds/${cloudNum}.png`,
                top: 5 + Math.random() * 50, // Random vertical position 5-55%
                width: 100 + Math.random() * 150, // Random size 100-250px
                opacity: 0.4 + Math.random() * 0.5, // Random opacity 0.4-0.9
                duration: 40 + Math.random() * 60, // Random speed 40-100s
                delay: -Math.random() * 50, // Random start position
            });
        }
        return generated;
    }, [performanceMode]);

    return (
        <div className={`workos-background ${performanceMode ? 'static-mode' : ''}`}>
            {/* Gradient Overlay for depth */}
            <div className="workos-gradient-overlay" />

            {/* Performance Pattern (Only in performance mode) */}
            {performanceMode && <div className="workos-performance-pattern" />}

            {/* Micro Dots Layer - The Art */}
            <div className="workos-micro-dots-container">
                {microDots.map((dot) => (
                    <div
                        key={`dot-${dot.id}`}
                        className="workos-micro-dot"
                        style={{
                            top: `${dot.top}%`,
                            left: `${dot.left}%`,
                            width: dot.size,
                            height: dot.size,
                            backgroundColor: dot.color,
                            boxShadow: `0 0 ${dot.size * 2}px ${dot.color}`,
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

            {/* Moon */}
            <img
                src="/images/hero/moon.png"
                alt=""
                className="workos-moon"
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
