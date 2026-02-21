import { motion } from 'framer-motion';
import { Gavel } from 'lucide-react';

export default function RefereeWaiting() {
    return (
        <div className="min-h-screen flex items-center justify-center overflow-hidden relative">
            {/* Centered spinning 3D 8-bit gavel icon */}
            <motion.div
                className="relative"
                animate={{
                    rotate: 360
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                }}
            >
                {/* 3D layered effect - shadow layers */}
                <div className="absolute inset-0 translate-x-2 translate-y-2 opacity-30">
                    <div className="w-32 h-32 bg-gradient-to-br from-amber-900 to-amber-950 rounded-2xl"
                        style={{
                            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                            imageRendering: 'pixelated'
                        }}
                    />
                </div>
                <div className="absolute inset-0 translate-x-1 translate-y-1 opacity-50">
                    <div className="w-32 h-32 bg-gradient-to-br from-amber-800 to-amber-900 rounded-2xl"
                        style={{
                            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                            imageRendering: 'pixelated'
                        }}
                    />
                </div>

                {/* Main icon container with 3D effect */}
                <motion.div
                    className="relative w-32 h-32 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl border-4 border-amber-300"
                    style={{
                        imageRendering: 'pixelated',
                        boxShadow: '0 8px 32px rgba(251, 191, 36, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                    animate={{
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    {/* Pixel art style highlights */}
                    <div className="absolute top-2 left-2 w-8 h-8 bg-amber-200 opacity-40 rounded"
                        style={{ imageRendering: 'pixelated' }}
                    />

                    {/* Gavel icon */}
                    <Gavel
                        className="w-16 h-16 text-amber-950 relative z-10"
                        strokeWidth={2.5}
                        style={{
                            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                        }}
                    />
                </motion.div>

                {/* Glowing pulse effect */}
                <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                        background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
                        filter: 'blur(20px)'
                    }}
                    animate={{
                        opacity: [0.5, 0.8, 0.5],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            </motion.div>
        </div>
    );
}

