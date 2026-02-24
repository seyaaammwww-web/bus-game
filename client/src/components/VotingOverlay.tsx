import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Gavel, Loader2, Bot, ShieldAlert } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { Timer } from '@/components/Timer';
import { useEffect, useState } from 'react';

// Sub-component for each vote item
function VotingItemCard({ item, currentPlayer, castParallelVote, refereeOverride, isReferee, isHost }: any) {
    const isRequester = item.requesterId === currentPlayer?.id;
    const voterIds = item.voterIds || [];
    const hasVoted = voterIds.includes(currentPlayer?.id || '');
    const yesVotes = item.votes?.yes || 0;
    const noVotes = item.votes?.no || 0;
    const totalVotes = yesVotes + noVotes;
    const yesPercent = totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 50;
    const noPercent = totalVotes > 0 ? (noVotes / totalVotes) * 100 : 50;
    const canOverride = isReferee || isHost;

    const canVote = !hasVoted && !isRequester && currentPlayer;
    const [isVoting, setIsVoting] = useState(false); // V3: Prevent double-tap

    const handleVote = (vote: 'yes' | 'no') => {
        if (canVote && !isVoting) {
            setIsVoting(true);
            castParallelVote(item.requesterId, item.category, vote);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-3 bg-[#FFFDD1] border-[3px] border-[#4c1d95] shadow-[3px_3px_0_0_#2e1065] rounded-xl overflow-hidden"
        >
            {/* Requester strip */}
            <div className="bg-[#4c1d95]/10 px-3 py-1.5 flex items-center justify-between border-b border-[#4c1d95]/20">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-pixel-text text-[#4c1d95]/70 font-bold">اللاعب:</span>
                    <span className="text-xs font-pixel-text text-[#7c3aed] font-bold">{item.requesterName}</span>
                </div>
                {item.aiSuggestion !== undefined && (
                    <div className="flex items-center gap-1" title="رأي المساعد الذكي">
                        <Bot className={`w-4 h-4 ${item.aiSuggestion ? 'text-emerald-600' : 'text-red-500'}`} />
                        <span className={`text-[10px] font-pixel-text font-bold ${item.aiSuggestion ? 'text-emerald-600' : 'text-red-500'}`}>
                            {item.aiSuggestion ? 'AI: مقبولة' : 'AI: مرفوضة'}
                        </span>
                    </div>
                )}
            </div>

            {/* Word verdict */}
            <div className="flex items-center justify-center gap-3 px-3 py-3">
                <div className="text-center">
                    <div className="bg-[#4c1d95] text-white px-2 py-1 rounded font-pixel-title text-xs shadow-[1px_1px_0_0_#2e1065]">
                        {item.category}
                    </div>
                </div>

                <div className="flex-1 text-center">
                    <div className="bg-white border-[2px] border-[#7c3aed] text-[#4c1d95] px-2 py-1 rounded-lg font-pixel-title text-lg shadow-[2px_2px_0_0_#7c3aed]">
                        {item.word}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="px-2 pb-2">
                {canOverride ? (
                    <div className="flex flex-col gap-2">
                        <div className="text-center font-pixel-text text-[10px] text-amber-700 font-bold flex items-center justify-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> صلاحيات الحكم
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => refereeOverride(item.requestId, item.category, false)}
                                className="flex-1 bg-gradient-to-b from-red-500 to-red-600 text-white font-pixel-title text-xs py-2 rounded border-2 border-red-800 shadow-[0_3px_0_0_#7f1d1d] active:translate-y-1 active:shadow-none"
                            >
                                حسم: رفض
                            </button>
                            <button
                                onClick={() => refereeOverride(item.requestId, item.category, true)}
                                className="flex-1 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white font-pixel-title text-xs py-2 rounded border-2 border-emerald-800 shadow-[0_3px_0_0_#065f46] active:translate-y-1 active:shadow-none"
                            >
                                حسم: قبول
                            </button>
                        </div>
                    </div>
                ) : isRequester ? (
                    <div className="text-center py-2 bg-[#4c1d95]/10 rounded border border-dashed border-[#7c3aed]">
                        <Loader2 className="w-4 h-4 text-[#7c3aed] animate-spin mx-auto mb-1" />
                        <p className="font-pixel-text text-[9px] text-[#4c1d95]/80">إجابتك تحت التصويت...</p>
                    </div>
                ) : hasVoted ? (
                    <div className="text-center py-2 bg-emerald-50 rounded border border-emerald-300">
                        <p className="font-pixel-text text-[10px] text-emerald-700 font-bold">تم تسجيل صوتك</p>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleVote('no')}
                            className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 font-pixel-title text-sm py-1.5 rounded border-2 border-red-300 transition-colors"
                        >
                            رفض
                        </button>
                        <button
                            onClick={() => handleVote('yes')}
                            className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-pixel-title text-sm py-1.5 rounded border-2 border-emerald-300 transition-colors"
                        >
                            موافقة
                        </button>
                    </div>
                )}

                {/* Live vote split bar */}
                <div className="mt-2">
                    <div className="h-2 bg-[#4c1d95]/10 rounded-full overflow-hidden flex">
                        <motion.div className="h-full bg-red-500" animate={{ width: `${noPercent}%` }} />
                        <motion.div className="h-full bg-emerald-500" animate={{ width: `${yesPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-[8px] font-pixel-text text-[#4c1d95]/60 mt-1">
                        <span>رفض ({item.votes?.no || 0})</span>
                        <span>موافقة ({item.votes?.yes || 0})</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export function VotingOverlay() {
    const { state, castParallelVote, refereeOverride, currentPlayer, isReferee, isHost } = useGame();
    const room = state.room;
    const voteQueue = room?.voteQueue || [];

    // FIX (#6): Pull true voteEndTime calculated via server instead of static legacy state
    const [voteTimeLeft, setVoteTimeLeft] = useState(0);

    useEffect(() => {
        if (room?.phase !== 'voting' || !room?.rounds[room.currentRound]?.voteEndTime) {
            setVoteTimeLeft(0);
            return;
        }

        const interval = setInterval(() => {
            const end = room.rounds[room.currentRound].voteEndTime!;
            const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
            setVoteTimeLeft(remaining);

            if (remaining <= 0) clearInterval(interval);
        }, 1000);

        // Initial setup
        const remaining = Math.max(0, Math.ceil((room.rounds[room.currentRound].voteEndTime! - Date.now()) / 1000));
        setVoteTimeLeft(remaining);

        return () => clearInterval(interval);
    }, [room?.phase, room?.currentRound, room?.rounds]);

    if (!room || room.phase !== 'voting' || voteQueue.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                key="voting-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-md max-h-[90vh] flex flex-col retro-overlay overflow-hidden shadow-[0_0_20px_rgba(124,58,237,0.5)]"
                >
                    {/* ── Header banner ── */}
                    <div className="bg-[#4c1d95] px-4 py-3 flex items-center justify-between border-b-[3px] border-[#2e1065] shrink-0">
                        <div className="flex items-center gap-2">
                            <motion.div
                                animate={{ rotate: [-10, 10, -10] }}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                            >
                                <Gavel className="w-5 h-5 text-amber-300" />
                            </motion.div>
                            <span className="font-pixel-title text-amber-200 text-base tracking-wide">
                                محكمة الجولة {room.currentRound + 1}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Timer timeLeft={voteTimeLeft} isRush={voteTimeLeft <= 5} maxTime={30} />
                            <span className="text-[10px] bg-amber-400 text-amber-900 font-pixel-text font-bold px-2 py-0.5 rounded-full border border-amber-600">
                                {voteQueue.length} إجابات
                            </span>
                        </div>
                    </div>

                    {/* ── Scrollable list of vote items ── */}
                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                        <AnimatePresence>
                            {voteQueue.map((item: any) => (
                                <VotingItemCard
                                    key={`${item.requestId}-${item.category}`}
                                    item={item}
                                    currentPlayer={currentPlayer}
                                    castParallelVote={castParallelVote}
                                    refereeOverride={refereeOverride}
                                    isReferee={isReferee}
                                    isHost={isHost}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
