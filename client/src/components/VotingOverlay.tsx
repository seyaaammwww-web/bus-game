import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Users, Gavel, Loader2, Crown } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { RetroCard } from '@/components/ui/RetroCard';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { Timer } from '@/components/Timer';
import { useEffect, useState } from 'react';
import { playCountdownSound } from '@/lib/sounds';

export function VotingOverlay() {
    const { state, castDemocraticVote, currentPlayer } = useGame();
    const room = state.room;
    const currentVote = room?.currentVote;
    const voteQueue = room?.voteQueue || [];

    const [timeLeft, setTimeLeft] = useState(15);

    useEffect(() => {
        if (!currentVote) return;

        // Initial set
        const updateTimer = () => {
            const elapsed = Date.now() - currentVote.startTime;
            const remaining = Math.max(0, Math.ceil((15000 - elapsed) / 1000));
            setTimeLeft(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [currentVote]); // Re-run when currentVote changes (new vote)

    const [hasVoted, setHasVoted] = useState(false);

    // Reset local voted state when vote changes
    useEffect(() => {
        if (currentVote && currentPlayer) {
            setHasVoted(currentVote.voterIds.includes(currentPlayer.id));
        } else {
            setHasVoted(false);
        }
    }, [currentVote, currentPlayer]);

    if (!currentVote) {
        // If no active vote but queue has items, maybe show "Preparing next vote..."?
        // Or just null.
        return null;
    }

    const isRequester = currentVote.requesterId === currentPlayer?.id;
    const totalVotes = currentVote.votes.yes + currentVote.votes.no;
    const activePlayers = room?.players.filter(p => !p.isReferee).length || 1;

    // Calculate percentage for progress bar
    const yesPercent = totalVotes > 0 ? (currentVote.votes.yes / totalVotes) * 100 : 50;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.8, y: 30 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="w-full max-w-lg"
                >
                    <div className="retro-overlay p-6">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-2 bg-[#7c3aed] text-white px-4 py-1 rounded-full border-2 border-[#4c1d95] mb-2 shadow-[2px_2px_0_0_#2e1065]">
                                <Gavel className="w-4 h-4" />
                                <span className="font-bold font-pixel-text text-sm">تصويت ديمقراطي</span>
                            </div>
                            <h2 className="text-2xl font-bold text-[#4c1d95] font-pixel-title mt-2">
                                مراجعة إجابة
                            </h2>
                            {voteQueue.length > 0 && (
                                <p className="text-xs text-[#7c3aed] font-pixel-text mt-1">
                                    في الانتظار: {voteQueue.length} طلبات
                                </p>
                            )}
                        </div>

                        {/* Timer */}
                        <div className="flex justify-center mb-6">
                            <Timer timeLeft={timeLeft} isRush={timeLeft <= 5} maxTime={15} />
                        </div>

                        {/* Content to Vote On */}
                        <div className="bg-[#FFFDD1] p-4 rounded-xl border-2 border-[#4c1d95] mb-6 text-center shadow-inner">
                            <div className="flex items-center justify-center gap-2 mb-2 text-[#4c1d95]/70 text-sm font-bold font-pixel-text">
                                <span>مقدم الطلب:</span>
                                <span className="text-[#7c3aed]">{currentVote.requesterName}</span>
                            </div>

                            <div className="flex justify-center items-center gap-4 mb-4">
                                <div className="bg-white p-2 rounded-lg border-2 border-[#4c1d95]/20">
                                    <p className="text-xs text-[#4c1d95]/60 mb-1 font-bold">الفئة</p>
                                    <p className="text-lg font-bold text-[#4c1d95]">{currentVote.category}</p>
                                </div>
                                <div className="text-2xl text-[#4c1d95]">➡️</div>
                                <div className="bg-white p-2 rounded-lg border-2 border-[#7c3aed] shadow-[2px_2px_0_0_#7c3aed]">
                                    <p className="text-xs text-[#7c3aed] mb-1 font-bold">الكلمة</p>
                                    <p className="text-2xl font-bold text-[#4c1d95] font-pixel-title px-4">{currentVote.word}</p>
                                </div>
                            </div>
                        </div>

                        {/* Voting Controls */}
                        {isRequester ? (
                            <div className="text-center p-4 bg-[#7c3aed]/10 rounded-xl border-2 border-[#7c3aed] border-dashed">
                                <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin mx-auto mb-2" />
                                <p className="font-bold text-[#4c1d95] font-pixel-text">جاري التصويت من قبل اللاعبين...</p>
                                <p className="text-sm text-[#4c1d95]/70 mt-1">لا يمكنك التصويت على إجابتك</p>
                            </div>
                        ) : hasVoted ? (
                            <div className="text-center p-4 bg-green-50 rounded-xl border-2 border-green-500 border-dashed">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2 text-white">
                                    {currentVote.votes.yes > currentVote.votes.no ? <ThumbsUp className="w-5 h-5" /> : <ThumbsDown className="w-5 h-5" />}
                                </div>
                                <p className="font-bold text-green-700 font-pixel-text">تم تسجيل صوتك!</p>
                                <p className="text-sm text-green-600/70 mt-1">في انتظار باقي اللاعبين...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => castDemocraticVote('no')}
                                    className="vote-btn-no h-16 bg-red-500 hover:bg-red-600 text-white font-bold font-pixel-title text-lg border-b-4 border-red-700 active:border-b-0 active:translate-y-1 rounded-md inline-flex items-center justify-center gap-2 transition-all shadow-[0_4px_0_0_#991b1b] active:shadow-none"
                                >
                                    <ThumbsDown className="w-6 h-6 mr-2" />
                                    رفض
                                </button>
                                <button
                                    onClick={() => castDemocraticVote('yes')}
                                    className="vote-btn-yes h-16 bg-green-500 hover:bg-green-600 text-white font-bold font-pixel-title text-lg border-b-4 border-green-700 active:border-b-0 active:translate-y-1 rounded-md inline-flex items-center justify-center gap-2 transition-all shadow-[0_4px_0_0_#166534] active:shadow-none"
                                >
                                    <ThumbsUp className="w-6 h-6 mr-2" />
                                    موافقة
                                </button>
                            </div>
                        )}

                        {/* Live Stats Bar */}
                        <div className="mt-6">
                            <div className="flex justify-between text-xs font-bold text-[#4c1d95] mb-1 font-pixel-text">
                                <span>رفض ({currentVote.votes.no})</span>
                                <span>موافق ({currentVote.votes.yes})</span>
                            </div>
                            <div className="h-4 bg-gray-200 rounded-full overflow-hidden border-2 border-[#4c1d95] flex">
                                <div
                                    className="h-full bg-red-500 transition-all duration-500"
                                    style={{ width: `${totalVotes === 0 ? 50 : (currentVote.votes.no / totalVotes) * 100}%` }}
                                />
                                <div
                                    className="h-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${totalVotes === 0 ? 50 : (currentVote.votes.yes / totalVotes) * 100}%` }}
                                />
                            </div>
                            <p className="text-center text-[10px] text-[#4c1d95]/60 mt-1 font-bold">
                                إجمالي الأصوات: {totalVotes}
                            </p>
                        </div>

                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
