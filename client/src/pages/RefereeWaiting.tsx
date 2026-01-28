import { motion } from 'framer-motion';
import { Gavel, Timer, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGame } from '@/lib/gameContext';
import ArcadeBackground from '@/components/ArcadeBackground';
import { RetroCard } from '@/components/ui/RetroCard';

export default function RefereeWaiting() {
    const { state, currentRound, disconnect } = useGame();

    const room = state.room!;
    const round = currentRound;
    const letter = round?.letter || room.letters[room.currentRound];

    const activePlayers = room.refereeId
        ? room.players.filter(p => p.id !== room.refereeId)
        : room.players;
    const submittedCount = round?.submissions.length || 0;
    const totalPlayers = activePlayers.length;

    return (
        <div className="min-h-screen p-4 overflow-hidden relative text-white font-pixel-text">
            <ArcadeBackground />
            <div className="max-w-lg mx-auto relative z-10">
                <div className="flex justify-between items-center mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={disconnect}
                        className="text-white hover:bg-white/10"
                        data-testid="button-exit-referee-waiting"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                    <span className="text-[12px] text-[#2C0834] font-pixel-text tracking-tight animate-pulse font-bold">BY MOHAMED SEYAM</span>
                </div>

                <motion.div
                    className="text-center mb-8"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    <motion.div
                        className="w-24 h-24 bg-[#2C0834] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-[#FFFDD1]"
                        animate={{
                            scale: [1, 1.05, 1],
                            rotate: [0, 5, -5, 0]
                        }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                        <Gavel className="w-12 h-12 text-[#FFFDD1]" />
                    </motion.div>

                    <h1 className="text-3xl font-pixel-title mb-2 text-white">
                        أنت الحكم! 👨‍⚖️
                    </h1>
                    <p className="text-[#FFFDD1] font-bold font-pixel-text">
                        استنى اللاعبين يخلصوا الجولة وبعدين هتراجع إجاباتهم
                    </p>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <RetroCard className="mb-6">
                        <div className="flex items-center justify-between mb-4 font-pixel-text">
                            <span className="text-[#31093A]/60">الجولة {room.currentRound + 1}</span>
                            <motion.div
                                className="w-14 h-14 bg-[#31093A] rounded-xl flex items-center justify-center shadow-lg"
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                <span className="text-2xl font-pixel-title text-white">{letter}</span>
                            </motion.div>
                        </div>

                        <div className="space-y-4 font-pixel-text">
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2 text-[#31093A]">
                                    <Users className="w-4 h-4 text-primary" />
                                    اللاعبين المرسلين
                                </span>
                                <span className="font-bold text-[#31093A]">
                                    {submittedCount} / {totalPlayers}
                                </span>
                            </div>

                            <div className="w-full bg-[#31093A]/10 rounded-full h-3 overflow-hidden">
                                <motion.div
                                    className="h-full bg-[#31093A] rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(submittedCount / totalPlayers) * 100}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {activePlayers.map((player) => {
                                    const hasSubmitted = round?.submissions.some(s => s.playerId === player.id);
                                    return (
                                        <motion.div
                                            key={player.id}
                                            className={`flex items-center gap-2 p-2 rounded-lg transition-all border-2 ${hasSubmitted
                                                ? 'bg-green-500/10 border-green-500/30'
                                                : 'bg-white/50 border-[#31093A]/5'
                                                }`}
                                            animate={hasSubmitted ? { scale: [1, 1.05, 1] } : {}}
                                        >
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${hasSubmitted ? 'bg-green-500 text-white' : 'bg-[#31093A]/10 text-[#31093A]/40'
                                                }`}>
                                                {hasSubmitted ? '✓' : player.name.charAt(0)}
                                            </div>
                                            <span className={`text-[10px] ${hasSubmitted ? 'text-green-600 font-bold' : 'text-[#31093A]/50'}`}>
                                                {player.name}
                                            </span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    </RetroCard>
                </motion.div>

                <motion.div
                    className="text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="flex items-center justify-center gap-2 text-[#FFFDD1] font-bold font-pixel-text">
                        <Timer className="w-4 h-4" />
                        <span className="text-sm">الوقت المتبقي: </span>
                        <motion.span
                            className={`font-bold text-xl ${state.timeLeft <= 10 ? 'text-orange-400' : 'text-white'}`}
                            animate={state.timeLeft <= 10 ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ repeat: state.timeLeft <= 10 ? Infinity : 0, duration: 0.5 }}
                        >
                            {state.timeLeft}
                        </motion.span>
                        <span className="text-sm">ثانية</span>
                    </div>
                </motion.div>

                <motion.div
                    className="mt-8 text-center"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <p className="text-[#FFFDD1] text-[10px] font-pixel-text">
                        ⏳ بانتظار انتهاء الجولة...
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
