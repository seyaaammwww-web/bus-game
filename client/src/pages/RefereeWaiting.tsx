import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Check } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { cn } from '@/lib/utils';
import { playCountdownTick } from '@/lib/sounds';

export default function RefereeWaiting() {
    const { state } = useGame();
    const room = state.room;

    if (!room) return null;

    const playersWithSubmitStatus = room.players.filter(p => p.id !== state.playerId).map(p => ({
        ...p,
        hasSubmitted: !!room.settings?.playerReadyStates?.[p.id]?.hasSubmitted
    }));

    const submittedCount = playersWithSubmitStatus.filter(p => p.hasSubmitted).length;
    const totalPlayers = playersWithSubmitStatus.length;

    useEffect(() => {
        const timer = setInterval(() => {
            playCountdownTick();
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center p-6 bg-[#1a0533] text-white overflow-hidden">
            {/* Heartbeat Background Pulse */}
            <motion.div
                className="absolute inset-0 z-0 bg-[#2e1065]"
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="relative z-10 flex flex-col items-center w-full max-w-md mx-auto">
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-8 relative"
                >
                    {/* Glowing pulse behind gavel */}
                    <motion.div
                        className="absolute inset-0 bg-[#fbbf24] rounded-full blur-3xl opacity-20"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.4, 0.1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <div className="w-32 h-32 md:w-40 md:h-40 relative flex items-center justify-center">
                        <motion.div
                            animate={{ rotate: [-8, 8, -8] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_15px_20px_rgba(0,0,0,0.6)]">
                                {/* Upgraded Wooden Gavel SVG */}
                                {/* Handle */}
                                <rect x="90" y="80" width="20" height="100" rx="10" fill="#8B4513" stroke="#5C2E0A" strokeWidth="4" />
                                <rect x="85" y="160" width="30" height="20" rx="5" fill="#A0522D" stroke="#5C2E0A" strokeWidth="2" />
                                <rect x="92" y="90" width="4" height="80" fill="#D2B48C" opacity="0.3" />

                                {/* Head */}
                                <rect x="40" y="40" width="120" height="40" rx="8" fill="#8B4513" stroke="#5C2E0A" strokeWidth="4" />
                                <rect x="30" y="45" width="20" height="30" rx="5" fill="#D4AF37" stroke="#B8860B" strokeWidth="3" />
                                <rect x="150" y="45" width="20" height="30" rx="5" fill="#D4AF37" stroke="#B8860B" strokeWidth="3" />
                                {/* Head details/shine */}
                                <rect x="45" y="45" width="110" height="4" fill="#D2B48C" opacity="0.4" />
                                <rect x="95" y="40" width="10" height="40" fill="#D4AF37" stroke="#B8860B" strokeWidth="2" />
                            </svg>
                        </motion.div>
                    </div>
                </motion.div>

                <h1 className="font-pixel-title text-4xl md:text-5xl text-center text-[#fbbf24] mb-4 text-shadow-[0_4px_10px_rgba(251,191,36,0.3)]">
                    أنت الحكم!
                </h1>

                <div className="flex items-center gap-3 bg-[#4c1d95]/50 border-[3px] border-[#7c3aed] px-6 py-3 rounded-2xl mb-10 shadow-[0_0_20px_rgba(124,58,237,0.3)] backdrop-blur-sm">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    >
                        <Clock className="w-6 h-6 text-[#fbbf24]" />
                    </motion.div>
                    <p className="font-pixel-text text-lg text-white">في انتظار اللاعبين...</p>
                </div>

                <div className="w-full bg-[#1a0533]/80 border-[3px] border-[#4c1d95] rounded-3xl p-5 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
                    <div className="flex justify-between items-end mb-4 border-b-2 border-[#4c1d95] pb-3">
                        <h2 className="font-pixel-text text-[#fbbf24] font-bold text-lg">حالة اللاعبين</h2>
                        <span className="font-pixel-title text-sm text-[#FFFDD1] bg-[#4c1d95] px-3 py-1.5 rounded-xl border border-[#7c3aed]">
                            {submittedCount} / {totalPlayers} تم
                        </span>
                    </div>

                    <div className="space-y-3">
                        {playersWithSubmitStatus.map((p, i) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-300",
                                    p.hasSubmitted
                                        ? "bg-[#10b981]/10 border-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                        : "bg-white/5 border-white/10 grayscale opacity-60"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <PixelAvatar src={p.avatar} size="sm" />
                                    <span className={cn("font-bold font-pixel-text", p.hasSubmitted ? "text-white" : "text-gray-400")}>
                                        {p.name}
                                    </span>
                                </div>
                                {p.hasSubmitted ? (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring" }}
                                    >
                                        <div className="bg-[#10b981] p-1.5 rounded-full text-white shadow-[0_0_10px_#10b981]">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="flex gap-1.5 px-2">
                                        {[0, 1, 2].map((dot) => (
                                            <motion.div
                                                key={dot}
                                                className="w-1.5 h-1.5 bg-gray-500 rounded-full"
                                                animate={{ y: [0, -4, 0] }}
                                                transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15 }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
