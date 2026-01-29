import { motion } from "framer-motion";
import { useMemo } from "react";

// SVG Shapes extracted from reference or recreated
const shapes = [
    {
        // Pixel Coin
        id: 'coin',
        svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="0" width="16" height="24" fill="#FFC800" />
                <rect x="0" y="4" width="24" height="16" fill="#FFC800" />
                <rect x="8" y="6" width="4" height="12" fill="#FFA000" />
            </svg>
        ),
        color: "#FFC800"
    },
    {
        // Pixel Star
        id: 'star',
        svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="0" width="8" height="24" fill="#6AD3F6" />
                <rect x="0" y="8" width="24" height="8" fill="#6AD3F6" />
            </svg>
        ),
        color: "#6AD3F6"
    },
    {
        // Pixel Heart
        id: 'heart',
        svg: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="4" height="4" fill="#FF6957" />
                <rect x="8" y="0" width="4" height="4" fill="#FF6957" />
                <rect x="12" y="0" width="4" height="4" fill="#FF6957" />
                <rect x="16" y="4" width="4" height="4" fill="#FF6957" />
                <rect x="0" y="8" width="4" height="8" fill="#FF6957" />
                <rect x="20" y="8" width="4" height="8" fill="#FF6957" />
                <rect x="4" y="16" width="4" height="4" fill="#FF6957" />
                <rect x="16" y="16" width="4" height="4" fill="#FF6957" />
                <rect x="8" y="20" width="8" height="4" fill="#FF6957" />
            </svg>
        ),
        color: "#FF6957"
    }
];

// Grid-based positions to prevent overlap - 12 fixed zones
const gridPositions = [
    { left: '5%', top: '10%' },
    { left: '30%', top: '5%' },
    { left: '55%', top: '15%' },
    { left: '80%', top: '8%' },
    { left: '10%', top: '35%' },
    { left: '45%', top: '40%' },
    { left: '75%', top: '32%' },
    { left: '8%', top: '60%' },
    { left: '35%', top: '65%' },
    { left: '65%', top: '58%' },
    { left: '88%', top: '62%' },
    { left: '20%', top: '85%' },
    { left: '50%', top: '88%' },
    { left: '78%', top: '82%' },
    { left: '92%', top: '45%' },
];

export function FloatingShapes() {
    // Memoize random values so they don't change on re-render
    const shapeConfigs = useMemo(() => {
        return gridPositions.map((pos, i) => ({
            shape: shapes[i % shapes.length],
            position: pos,
            // SLOW animations: 30-50 seconds duration
            duration: 30 + (i * 3) % 20,
            delay: i * 2,
            // Small, gentle movement
            yOffset: 20 + (i % 3) * 10,
        }));
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {shapeConfigs.map((config, i) => (
                <motion.div
                    key={i}
                    className="absolute w-6 h-6 opacity-15"
                    style={{ left: config.position.left, top: config.position.top }}
                    animate={{
                        y: [0, -config.yOffset, 0],
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        duration: config.duration,
                        repeat: Infinity,
                        delay: config.delay,
                        ease: "linear"
                    }}
                >
                    {config.shape.svg}
                </motion.div>
            ))}
        </div>
    );
}
