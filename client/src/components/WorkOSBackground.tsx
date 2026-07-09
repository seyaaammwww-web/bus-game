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

// Sky band boundaries — each upper band dithers down into the next one.
// pos = % where the band below starts; color = the UPPER band's color.
const bandBoundaries = [
    { pos: 10, color: '#350D7A' },
    { pos: 19, color: '#4E0994' },
    { pos: 27, color: '#6714A8' },
    { pos: 34, color: '#871BB7' },
    { pos: 40, color: '#A333D5' },
    { pos: 46, color: '#F640A8' },
    { pos: 52, color: '#FF6957' },
    { pos: 59, color: '#FF8A50' },
    { pos: 66, color: '#FFA168' },
    { pos: 74, color: '#FFC48B' },
    { pos: 85, color: '#FFFDCC' },
];

interface Sparkle {
    id: number;
    top: number;
    left: number;
    delay: number;
    size: number;
    duration: number;
}

interface Balloon {
    id: number;
    left: number;
    bodyColor: string;
    delay: number;
    duration: number;
    scale: number;
}

const balloonColors = ['#F640A8', '#FF8A50', '#FFC48B', '#A333D5'];

/* Pixel balloon — tiny hand-drawn SVG with a wavy string */
const PixelBalloon: React.FC<{ color: string }> = ({ color }) => (
    <svg width="24" height="52" viewBox="0 0 24 52" shapeRendering="crispEdges" aria-hidden="true">
        {/* Balloon body (pixel oval) */}
        <rect x="6" y="2" width="12" height="4" fill={color} />
        <rect x="4" y="6" width="16" height="10" fill={color} />
        <rect x="6" y="16" width="12" height="4" fill={color} />
        {/* Shine pixel */}
        <rect x="7" y="5" width="4" height="4" fill="#FFFEE5" opacity="0.8" />
        {/* Knot */}
        <rect x="10" y="20" width="4" height="3" fill={color} />
        {/* Wavy string */}
        <rect x="11" y="23" width="2" height="6" fill="#FFFEE5" opacity="0.9" />
        <rect x="9" y="29" width="2" height="6" fill="#FFFEE5" opacity="0.9" />
        <rect x="11" y="35" width="2" height="6" fill="#FFFEE5" opacity="0.9" />
        <rect x="13" y="41" width="2" height="6" fill="#FFFEE5" opacity="0.9" />
    </svg>
);

interface WorkOSBackgroundProps {
    /** If true, reduces particle count for mobile performance (keeps all visual effects) */
    isMobile?: boolean;
}

/* ============================================================
   PIXEL BUS — hand-drawn pixel-art SVG, palette-locked.
   Body bobs on its suspension while wheels stay planted and spin.
   Ink: #350D7A / #1B0645 · Body: #FF8A50 / #FFC48B / #FF6957
   Glass: #FFFEE5 / #FFFDCC · Accent: #6714A8 · Light: #FFF3B6
   ============================================================ */
const PixelBus: React.FC = () => (
    <div className="relative" style={{ width: 200, height: 120 }}>
        {/* Exhaust puffs (trail behind, bus drives left-to-right) */}
        <div className="workos-bus-puff" />
        <div className="workos-bus-puff" />
        <div className="workos-bus-puff" />
        <svg
            width="200"
            height="120"
            viewBox="0 0 200 120"
            shapeRendering="crispEdges"
            aria-hidden="true"
        >
            {/* Ground shadow (stays put — wheels are planted) */}
            <rect x="10" y="112" width="182" height="6" fill="#1B0645" opacity="0.35" />

            {/* ============ BODY (bobs on suspension) ============ */}
            <g className="workos-bus-suspension">
                {/* Ink silhouette with chamfered corners */}
                <rect x="8" y="20" width="184" height="72" fill="#350D7A" />
                <rect x="4" y="24" width="192" height="68" fill="#350D7A" />
                {/* Orange body fill */}
                <rect x="12" y="24" width="176" height="64" fill="#FF8A50" />
                <rect x="8" y="28" width="184" height="56" fill="#FF8A50" />
                {/* Roof highlight band */}
                <rect x="12" y="24" width="176" height="6" fill="#FFC48B" />
                <rect x="8" y="28" width="184" height="4" fill="#FFC48B" />
                {/* Purple accent stripe under windows */}
                <rect x="8" y="64" width="184" height="8" fill="#6714A8" />
                {/* Lower skirt (darker orange) */}
                <rect x="8" y="72" width="184" height="12" fill="#FF6957" />
                {/* Dark bumper base */}
                <rect x="4" y="86" width="192" height="6" fill="#1B0645" />

                {/* Destination sign on the roof */}
                <rect x="140" y="4" width="52" height="20" fill="#350D7A" />
                <rect x="144" y="8" width="44" height="12" fill="#FFFEE5" />
                <rect x="148" y="11" width="10" height="6" fill="#350D7A" />
                <rect x="162" y="11" width="14" height="6" fill="#350D7A" />
                <rect x="180" y="11" width="4" height="6" fill="#350D7A" />

                {/* Passenger windows x3 — ink frame, glass, bottom shade */}
                {[20, 56, 92].map((x) => (
                    <g key={x}>
                        <rect x={x} y="32" width="28" height="28" fill="#350D7A" />
                        <rect x={x + 4} y="36" width="20" height="20" fill="#FFFEE5" />
                        <rect x={x + 4} y="48" width="20" height="8" fill="#FFFDCC" />
                        {/* diagonal shine pixel */}
                        <rect x={x + 6} y="38" width="4" height="4" fill="#FFFFFF" opacity="0.7" />
                    </g>
                ))}

                {/* Double door — two panes with ink divider */}
                <rect x="128" y="32" width="24" height="52" fill="#350D7A" />
                <rect x="132" y="36" width="16" height="20" fill="#FFFEE5" />
                <rect x="132" y="60" width="16" height="20" fill="#FFFDCC" />
                <rect x="139" y="36" width="2" height="44" fill="#350D7A" />

                {/* Windshield */}
                <rect x="160" y="32" width="28" height="32" fill="#350D7A" />
                <rect x="164" y="36" width="20" height="24" fill="#FFFEE5" />
                <rect x="164" y="50" width="20" height="10" fill="#FFFDCC" />
                <rect x="166" y="38" width="4" height="4" fill="#FFFFFF" opacity="0.7" />

                {/* Side mirror (front) */}
                <rect x="192" y="34" width="6" height="4" fill="#350D7A" />
                <rect x="194" y="26" width="6" height="10" fill="#350D7A" />
                <rect x="196" y="28" width="2" height="6" fill="#FFFEE5" />

                {/* Headlight + turn signal (front) */}
                <rect x="182" y="66" width="12" height="14" fill="#350D7A" />
                <rect x="184" y="68" width="8" height="10" fill="#FFF3B6" />
                {/* Taillight (back) */}
                <rect x="6" y="66" width="10" height="14" fill="#350D7A" />
                <rect x="8" y="68" width="6" height="10" fill="#F640A8" />
            </g>

            {/* ============ WHEELS (planted, spinning) ============ */}
            {[52, 148].map((cx) => (
                <g key={cx}>
                    {/* Wheel well shadow */}
                    <rect x={cx - 22} y="80" width="44" height="12" fill="#1B0645" />
                    {/* Tire */}
                    <circle cx={cx} cy="96" r="17" fill="#1B0645" />
                    <circle cx={cx} cy="96" r="13" fill="#350D7A" />
                    {/* Spinning hub with spokes */}
                    <g className="workos-wheel-hub">
                        <circle cx={cx} cy="96" r="8" fill="#FFC48B" />
                        <rect x={cx - 2} y="88" width="4" height="16" fill="#350D7A" />
                        <rect x={cx - 8} y="94" width="16" height="4" fill="#350D7A" />
                        <rect x={cx - 2} y="94" width="4" height="4" fill="#FFFEE5" />
                    </g>
                </g>
            ))}
        </svg>
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

    // Big 4-point plus-shaped sparkles — the reference's signature detail
    const sparkles = useMemo(() => {
        const count = isMobile ? 8 : 16;
        const generated: Sparkle[] = [];
        for (let i = 0; i < count; i++) {
            generated.push({
                id: i,
                top: Math.random() * 80,
                left: Math.random() * 100,
                delay: Math.random() * 4,
                size: Math.random() > 0.6 ? 4 : 3,
                duration: 1.6 + Math.random() * 2,
            });
        }
        return generated;
    }, [isMobile]);

    // Floating balloons drifting up through the sunset
    const balloons = useMemo(() => {
        const count = isMobile ? 2 : 4;
        const generated: Balloon[] = [];
        for (let i = 0; i < count; i++) {
            generated.push({
                id: i,
                left: 10 + Math.random() * 80,
                bodyColor: balloonColors[i % balloonColors.length],
                delay: -Math.random() * 30,
                duration: 26 + Math.random() * 18,
                scale: 0.8 + Math.random() * 0.6,
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

            {/* Dithered band transitions — checkerboard pixels between sky colors */}
            <div className="workos-dither-container" aria-hidden="true">
                {bandBoundaries.map((band) => (
                    <React.Fragment key={`dither-${band.pos}`}>
                        {/* Dense checker row right at the edge */}
                        <div
                            className="workos-dither-checker"
                            style={{
                                top: `${band.pos}%`,
                                backgroundImage: `repeating-conic-gradient(${band.color} 0% 25%, transparent 0% 50%)`,
                            }}
                        />
                        {/* Sparse pixel row bleeding further down */}
                        <div
                            className="workos-dither-sparse"
                            style={{
                                top: `calc(${band.pos}% + 8px)`,
                                backgroundImage: `repeating-linear-gradient(90deg, ${band.color} 0px, ${band.color} 8px, transparent 8px, transparent 32px)`,
                            }}
                        />
                    </React.Fragment>
                ))}
            </div>

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

            {/* Plus-shaped sparkles — big twinkling pixel stars */}
            <div className="workos-sparkles-container" aria-hidden="true">
                {sparkles.map((s) => (
                    <div
                        key={`sparkle-${s.id}`}
                        className="workos-sparkle"
                        style={{
                            top: `${s.top}%`,
                            left: `${s.left}%`,
                            width: s.size,
                            height: s.size,
                            boxShadow: `0 ${-s.size}px 0 #FFFEE2, 0 ${s.size}px 0 #FFFEE2, ${-s.size}px 0 0 #FFFEE2, ${s.size}px 0 0 #FFFEE2`,
                            animationDelay: `${s.delay}s`,
                            animationDuration: `${s.duration}s`,
                        }}
                    />
                ))}
            </div>

            {/* Floating balloons rising through the sunset */}
            <div className="workos-balloons-container" aria-hidden="true">
                {balloons.map((b) => (
                    <div
                        key={`balloon-${b.id}`}
                        className="workos-balloon"
                        style={{
                            left: `${b.left}%`,
                            scale: `${b.scale}`,
                            animationDelay: `${b.delay}s`,
                            animationDuration: `${b.duration}s`,
                        }}
                    >
                        <div className="workos-balloon-sway">
                            <PixelBalloon color={b.bodyColor} />
                        </div>
                    </div>
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
                {/* Bus stop sign standing on the curb (behind the bus) */}
                <div className="workos-bus-stop" aria-hidden="true">
                    <svg width="48" height="76" viewBox="0 0 48 76" shapeRendering="crispEdges">
                        {/* Post */}
                        <rect x="20" y="20" width="8" height="56" fill="#350D7A" />
                        <rect x="22" y="20" width="2" height="56" fill="#6714A8" />
                        {/* Sign board */}
                        <rect x="2" y="0" width="44" height="30" fill="#350D7A" />
                        <rect x="6" y="4" width="36" height="22" fill="#FFFEE5" />
                        {/* Tiny bus glyph on the sign */}
                        <rect x="12" y="9" width="24" height="10" fill="#FF8A50" />
                        <rect x="14" y="11" width="6" height="4" fill="#FFFEE5" />
                        <rect x="23" y="11" width="6" height="4" fill="#FFFEE5" />
                        <rect x="14" y="19" width="5" height="4" fill="#350D7A" />
                        <rect x="29" y="19" width="5" height="4" fill="#350D7A" />
                    </svg>
                </div>

                <div className="workos-bus">
                    <PixelBus />
                </div>
                {/* Second bus offset by half a cycle so the road is never empty */}
                <div className="workos-bus workos-bus-second">
                    <PixelBus />
                </div>

                <div className="workos-road-curb-highlight" />
                <div className="workos-road-curb" />
                <div className="workos-road-asphalt">
                    <div className="workos-road-edgeline" />
                    <div className="workos-road-dashes" />
                    <div className="workos-road-dashes-far" />
                    <div className="workos-road-edge" />
                </div>
            </div>

            {/* Vignette */}
            <div className="workos-vignette" />
        </div>
    );
};

export default WorkOSBackground;
