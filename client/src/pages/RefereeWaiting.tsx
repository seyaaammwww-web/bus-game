import { motion } from 'framer-motion';
import { Gavel } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { useEffect } from 'react';
import { playCountdownTick } from '@/lib/sounds';

export default function RefereeWaiting() {
    const { state } = useGame();

    useEffect(() => {
        const timer = setInterval(() => {
            playCountdownTick();
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f0a1f] p-6 text-white overflow-hidden">
            {/* Heartbeat Background Pulse */}
            <motion.div
                className="absolute w-[800px] h-[800px] bg-gradient-to-r from-[#7c3aed]/10 to-[#c084fc]/10 rounded-full blur-[100px]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
            />

            <div className="text-center relative z-10">
                <motion.div
                    className="relative mb-12 flex justify-center"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                    {/* 3D layered effect */}
                    <div className="absolute inset-0 translate-x-3 translate-y-3 opacity-30 flex justify-center items-center">
                        <div className="w-40 h-40 bg-gradient-to-br from-amber-900 to-[#2e1065] rounded-3xl"
                            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', imageRendering: 'pixelated' }}
                        />
                    </div>

                    <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 opacity-60 flex justify-center items-center">
                        <div className="w-40 h-40 bg-gradient-to-br from-amber-700 to-[#4c1d95] rounded-3xl"
                            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', imageRendering: 'pixelated' }}
                        />
                    </div>

                    {/* Main icon container */}
                    <div
                        className="relative w-40 h-40 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center border-4 border-amber-300"
                        style={{
                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                            imageRendering: 'pixelated',
                            boxShadow: 'inset 0 4px 12px rgba(255, 255, 255, 0.5), inset 0 -4px 12px rgba(0, 0, 0, 0.4)'
                        }}
                    >
                        {/* Pixel art highlights */}
                        <div className="absolute top-4 left-4 w-10 h-10 bg-amber-200 opacity-50 rounded-sm"
                            style={{ imageRendering: 'pixelated', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                        />

                        {/* Gavel icon */}
                        <Gavel
                            className="w-20 h-20 text-amber-950 relative z-10"
                            strokeWidth={2.5}
                            style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4))' }}
                        />
                    </div>
                </motion.div>

                <p className="text-3xl font-pixel-title text-[#fbbf24] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">الحكم بيراجع...</p>
                <p className="text-[#7c3aed] mt-4 font-pixel-text text-xl">اللاعبين لسه بيكتبوا...</p>
            </div>
        </div>
    );
}
