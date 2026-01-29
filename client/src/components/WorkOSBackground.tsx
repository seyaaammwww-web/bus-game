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

// Purple gradient colors for artistic effect
const purpleGradient = [
    '#7c3aed', // vibrant purple
    '#8b5cf6', // light purple
    '#a78bfa', // lavender
    '#c4b5fd', // soft lavender
    '#6d28d9', // deep purple
    '#5b21b6', // darker purple
    '#4c1d95', // very dark purple
    '#e9d5ff', // pale purple
    '#06b6d4', // cyan accent
    '#22d3ee', // light cyan
];

const WorkOSBackground: React.FC = () => {
    // Generate white stars
    const stars = useMemo(() => {
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
    }, []);

    // Generate MANY micro dots with purple gradient colors
    const microDots = useMemo(() => {
        const generated: MicroDot[] = [];
        for (let i = 0; i < 300; i++) {
            generated.push({
                id: i,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 5,
                size: Math.random() * 2 + 1, // 1-3px
                color: purpleGradient[Math.floor(Math.random() * purpleGradient.length)],
                duration: Math.random() * 3 + 2, // 2-5s
            });
        }
        return generated;
    }, []);

    return (
        <div className="workos-background">
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

            {/* Clouds Layer */}
            <div className="workos-clouds-container">
                <img src="/images/hero/clouds/1.png" className="workos-cloud workos-cloud-1" alt="" />
                <img src="/images/hero/clouds/2.png" className="workos-cloud workos-cloud-2" alt="" />
                <img src="/images/hero/clouds/3.png" className="workos-cloud workos-cloud-3" alt="" />
                <img src="/images/hero/clouds/4.png" className="workos-cloud workos-cloud-4" alt="" />
                <img src="/images/hero/clouds/5.png" className="workos-cloud workos-cloud-5" alt="" />
            </div>

            {/* Vignette */}
            <div className="workos-vignette" />
        </div>
    );
};

export default WorkOSBackground;
