import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Generate random pixels for the effect
const generatePixels = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 10 + 4, // 4px to 14px
        duration: Math.random() * 20 + 10, // 10s to 30s
        delay: Math.random() * 5,
        opacity: Math.random() * 0.5 + 0.1,
    }));
};

export default function ArcadeBackground() {
    const [pixels, setPixels] = useState<any[]>([]);

    useEffect(() => {
        setPixels(generatePixels(50));
    }, []);

    return (
        <div className="fixed inset-0 -z-50 overflow-hidden bg-gradient-to-b from-[#4a0080] via-[#b000b0] to-[#00e5ff]">
            {/* Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 perspective-grid" />

            {/* Parallax Pixels */}
            {pixels.map((pixel) => (
                <motion.div
                    key={pixel.id}
                    className="absolute bg-white/20 blur-[1px]"
                    style={{
                        left: `${pixel.left}%`,
                        width: pixel.size,
                        height: pixel.size,
                        opacity: pixel.opacity,
                    }}
                    initial={{ top: '110%' }}
                    animate={{ top: '-10%' }}
                    transition={{
                        duration: pixel.duration,
                        repeat: Infinity,
                        delay: pixel.delay,
                        ease: 'linear',
                    }}
                />
            ))}

            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[size:100%_4px,6px_100%] pointer-events-none" />

            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,rgba(0,0,0,0.4)_100%)]" />
        </div>
    );
}
