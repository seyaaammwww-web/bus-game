import { motion } from "framer-motion";

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

export function FloatingShapes() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {/* Generate multiple floating shapes */}
            {Array.from({ length: 15 }).map((_, i) => {
                const shape = shapes[i % shapes.length];
                const randomLeft = `${Math.random() * 100}%`;
                const randomTop = `${Math.random() * 100}%`;
                const randomDelay = Math.random() * 5;
                const randomDuration = 10 + Math.random() * 10;

                return (
                    <motion.div
                        key={i}
                        className="absolute w-8 h-8 opacity-20"
                        style={{ left: randomLeft, top: randomTop }}
                        animate={{
                            y: [0, -100, 0],
                            rotate: [0, 180, 360],
                            scale: [1, 1.2, 1]
                        }}
                        transition={{
                            duration: randomDuration,
                            repeat: Infinity,
                            delay: randomDelay,
                            ease: "easeInOut"
                        }}
                    >
                        {shape.svg}
                    </motion.div>
                );
            })}
        </div>
    );
}
