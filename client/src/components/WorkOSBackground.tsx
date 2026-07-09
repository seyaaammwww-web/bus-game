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

/* Pixel bus built from plain divs — crisp, palette-locked, zero assets */
const PixelBus: React.FC = () => (
    <div className="workos-bus-body relative" style={{ width: 152, height: 76 }}>
        {/* Exhaust puffs (trail behind, bus drives left-to-right) */}
        <div className="workos-bus-puff" />
        <div className="workos-bus-puff" />
        {/* Body */}
        <div className="absolute" style={{ left: 0, top: 8, width: 152, height: 48, backgroundColor: '#FF8A50', border: '4px solid #350D7A' }} />
        {/* Roof stripe */}
        <div className="absolute" style={{ left: 6, top: 14, width: 140, height: 8, backgroundColor: '#FFC48B' }} />
        {/* Passenger windows */}
        {[16, 50, 84].map((x) => (
            <div key={x} className="absolute" style={{ left: x, top: 26, width: 22, height: 16, backgroundColor: '#FFFEE5', border: '3px solid #350D7A' }} />
        ))}
        {/* Door line */}
        <div className="absolute" style={{ left: 112, top: 26, width: 3, height: 26, backgroundColor: '#350D7A' }} />
        {/* Windshield (front) */}
        <div className="absolute" style={{ left: 122, top: 26, width: 20, height: 18, backgroundColor: '#FFFEE5', border: '3px solid #350D7A' }} />
        {/* Headlight */}
        <div className="absolute" style={{ left: 146, top: 42, width: 6, height: 8, backgroundColor: '#FFF3B6', border: '2px solid #350D7A' }} />
        {/* Wheels */}
        {[22, 104].map((x) => (
            <div key={x} className="absolute" style={{ left: x, top: 52, width: 24, height: 24, backgroundColor: '#350D7A', border: '4px solid #1B0645' }}>
                <div className="absolute" style={{ left: 5, top: 5, width: 6, height: 6, backgroundColor: '#FFFEE5' }} />
            </div>
        ))}
    </div>
);

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

            {/* Road Scene — pixel road with the always-driving bus */}
            <div className="workos-road-scene">
                <div className="workos-bus">
                    <PixelBus />
                </div>
                {/* Second bus offset by half a cycle so the road is never empty */}
                <div className="workos-bus workos-bus-second">
                    <PixelBus />
                </div>
                <div className="workos-road-curb" />
                <div className="workos-road-asphalt">
                    <div className="workos-road-dashes" />
                    <div className="workos-road-edge" />
                </div>
            </div>

            {/* Vignette */}
            <div className="workos-vignette" />
        </div>
    );
};

export default WorkOSBackground;
