import { motion } from 'framer-motion';
import { Gavel, Eye, CheckCircle } from 'lucide-react';
import { useGame } from '@/lib/gameContext';

export default function RefereeWaiting() {
    const { state } = useGame();
    const room = state.room;
    const currentRound = room?.rounds[room?.currentRound || 0];
    const letter = currentRound?.letter || room?.letters?.[room?.currentRound || 0] || '?';
    const banishedId = currentRound?.banishedPlayerId;
    const submittedCount = currentRound?.submissions?.filter(
        s => s.playerId !== room?.refereeId && s.playerId !== banishedId
    ).length || 0;
    const totalPlayers = room?.players?.filter(p => p.id !== room.refereeId && p.id !== banishedId).length || 0;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden relative p-6 text-center">

            {/* Animated gavel */}
            <motion.div
                className="relative mb-8"
                animate={{ rotate: [0, -15, 15, -10, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
            >
                <div className="w-28 h-28 bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-[0_8px_32px_rgba(251,191,36,0.4)] border border-amber-500/40">
                    <Gavel className="w-14 h-14 text-amber-950" strokeWidth={2.5} />
                </div>
                {/* Glow */}
                <motion.div
                    className="absolute inset-0 rounded-lg"
                    style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)', filter: 'blur(16px)' }}
                    animate={{ opacity: [0.4, 0.9, 0.4], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            </motion.div>

            {/* Title */}
            <motion.h1
                className="text-3xl font-pixel-title text-white mb-2 drop-shadow-lg"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                أنت الحكم!
            </motion.h1>

            <p className="text-[#e9d5ff] font-pixel-text text-base mb-6 max-w-xs">
                انتظر اللاعبين حتى ينتهوا من الإجابة، ثم ستراجع إجاباتهم
            </p>

            {/* Round info */}
            <div className="flex gap-4 mb-8">
                <div className="bg-[#4c1d95]/90 backdrop-blur-md border border-purple-400/30 rounded-xl px-5 py-3 shadow-lg">
                    <p className="text-[10px] font-pixel-text text-[#e9d5ff] mb-1">الحرف</p>
                    <p className="text-3xl font-pixel-title text-amber-300">{letter}</p>
                </div>
                <div className="bg-[#4c1d95]/90 backdrop-blur-md border border-purple-400/30 rounded-xl px-5 py-3 shadow-lg">
                    <p className="text-[10px] font-pixel-text text-[#e9d5ff] mb-1">أرسلوا</p>
                    <p className="text-3xl font-pixel-title text-emerald-300">{submittedCount} / {totalPlayers}</p>
                </div>
                <div className="bg-[#4c1d95]/90 backdrop-blur-md border border-purple-400/30 rounded-xl px-5 py-3 shadow-lg">
                    <p className="text-[10px] font-pixel-text text-[#e9d5ff] mb-1">الجولة</p>
                    <p className="text-3xl font-pixel-title text-white">{(room?.currentRound || 0) + 1} / {room?.totalRounds || '?'}</p>
                </div>
            </div>

            {/* Player status */}
            {room && room.players.filter(p => p.id !== room.refereeId).length > 0 && (
                <div className="w-full max-w-sm bg-white/95 backdrop-blur-md border border-purple-200/50 rounded-2xl p-4 shadow-card">
                    <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-[#7c3aed]" />
                        <span className="font-pixel-text text-sm font-bold text-[#4c1d95]">حالة اللاعبين</span>
                    </div>
                    <div className="space-y-2">
                        {room.players.filter(p => p.id !== room.refereeId).map(player => {
                            const hasSubmitted = currentRound?.submissions?.some(s => s.playerId === player.id);
                            return (
                                <div key={player.id} className="flex items-center justify-between">
                                    <span className="font-pixel-text text-sm text-[#4c1d95] font-bold">{player.name}</span>
                                    {hasSubmitted ? (
                                        <span className="flex items-center gap-1 text-xs font-pixel-text font-bold px-2 py-0.5 rounded-lg bg-[#7c3aed]/10 text-[#4c1d95] border border-[#7c3aed]/30">
                                            <CheckCircle className="w-3 h-3" /> أرسل
                                        </span>
                                    ) : (
                                        <span className="text-xs font-pixel-text font-bold px-2 py-0.5 rounded-lg bg-[#4c1d95]/5 text-[#4c1d95]/50 border border-[#4c1d95]/20">يكتب...</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
