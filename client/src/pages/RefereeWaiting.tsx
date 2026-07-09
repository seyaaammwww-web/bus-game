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
                <div className="w-28 h-28 bg-[#FF8A50] rounded-sm flex items-center justify-center shadow-pixel-lg border-4 border-[#350D7A]">
                    <Gavel className="w-14 h-14 text-[#350D7A]" strokeWidth={2.5} />
                </div>
            </motion.div>

            {/* Title */}
            <motion.h1
                className="text-3xl font-pixel-title text-white mb-2 drop-shadow-lg"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                أنت الحكم!
            </motion.h1>

            <p className="text-[#FFFDCC] font-pixel-text text-base mb-6 max-w-xs">
                انتظر اللاعبين حتى ينتهوا من الإجابة، ثم ستراجع إجاباتهم
            </p>

            {/* Round info */}
            <div className="flex gap-4 mb-8">
                <div className="bg-[#350D7A] border-[3px] border-[#350D7A] rounded-sm px-5 py-3 shadow-pixel">
                    <p className="text-[10px] font-pixel-text text-[#FFFDCC] mb-1">الحرف</p>
                    <p className="text-3xl font-pixel-title text-[#FFC48B]">{letter}</p>
                </div>
                <div className="bg-[#350D7A] border-[3px] border-[#350D7A] rounded-sm px-5 py-3 shadow-pixel">
                    <p className="text-[10px] font-pixel-text text-[#FFFDCC] mb-1">أرسلوا</p>
                    <p className="text-3xl font-pixel-title text-[#D3F088]">{submittedCount} / {totalPlayers}</p>
                </div>
                <div className="bg-[#350D7A] border-[3px] border-[#350D7A] rounded-sm px-5 py-3 shadow-pixel">
                    <p className="text-[10px] font-pixel-text text-[#FFFDCC] mb-1">الجولة</p>
                    <p className="text-3xl font-pixel-title text-[#FFFEE2]">{(room?.currentRound || 0) + 1} / {room?.totalRounds || '?'}</p>
                </div>
            </div>

            {/* Player status */}
            {room && room.players.filter(p => p.id !== room.refereeId).length > 0 && (
                <div className="w-full max-w-sm bg-[#FFFEE5] border-[3px] border-[#350D7A] rounded-sm p-4 shadow-pixel">
                    <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-[#6714A8]" />
                        <span className="font-pixel-text text-sm font-bold text-[#350D7A]">حالة اللاعبين</span>
                    </div>
                    <div className="space-y-2">
                        {room.players.filter(p => p.id !== room.refereeId).map(player => {
                            const hasSubmitted = currentRound?.submissions?.some(s => s.playerId === player.id);
                            return (
                                <div key={player.id} className="flex items-center justify-between">
                                    <span className="font-pixel-text text-sm text-[#350D7A] font-bold">{player.name}</span>
                                    {hasSubmitted ? (
                                        <span className="flex items-center gap-1 text-xs font-pixel-text font-bold px-2 py-0.5 rounded-lg bg-[#6714A8]/10 text-[#350D7A] border border-[#6714A8]/30">
                                            <CheckCircle className="w-3 h-3" /> أرسل
                                        </span>
                                    ) : (
                                        <span className="text-xs font-pixel-text font-bold px-2 py-0.5 rounded-lg bg-[#350D7A]/5 text-[#350D7A]/50 border border-[#350D7A]/20">يكتب...</span>
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
