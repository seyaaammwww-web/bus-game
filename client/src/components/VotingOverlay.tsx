import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Loader2, ShieldAlert } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { Timer } from '@/components/Timer';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

function VotingItemCard({ item, currentPlayer, castParallelVote, refereeOverride, isReferee, isHost }: any) {
    const isRequester = item.requesterId === currentPlayer?.id;
    const voterIds = item.voterIds || [];
    const hasVoted = voterIds.includes(currentPlayer?.id || '');
    const yesVotes = item.votes?.yes || 0;
    const noVotes = item.votes?.no || 0;
    const totalVotes = yesVotes + noVotes;
    const eligibleCount = (item.eligibleVoterIds || []).length;
    const yesPercent = eligibleCount > 0 ? (yesVotes / eligibleCount) * 100 : 0;
    const noPercent = eligibleCount > 0 ? (noVotes / eligibleCount) * 100 : 0;
    const canOverride = isReferee || isHost;
    const canVote = !hasVoted && !isRequester && !isReferee && !isHost && !!currentPlayer;
    const [isVoting, setIsVoting] = useState(false);

    useEffect(() => {
        if (hasVoted) setIsVoting(false);
    }, [hasVoted]);

    const handleVote = (vote: 'yes' | 'no') => {
        if (canVote && !isVoting) {
            setIsVoting(true);
            castParallelVote(item.requesterId, item.category, vote);
        }
    };

    const isEligible = (item.eligibleVoterIds || []).includes(currentPlayer?.id || '');

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-3 surface-card overflow-hidden"
        >
            <div className="bg-purple-500/10 px-3 py-2 flex items-center justify-between border-b border-purple-200/40">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#350D7A]/70 font-semibold">اللاعب:</span>
                    <span className="text-xs text-[#6714A8] font-bold">{item.requesterName}</span>
                </div>
            </div>

            <div className="flex items-center justify-center gap-3 px-3 py-3">
                <div className="text-center">
                    <div className="bg-[#6714A8] text-[#FFFEE2] px-3 py-1 rounded-sm border-2 border-[#350D7A] text-xs font-bold shadow-pixel-sm">
                        {item.category}
                    </div>
                </div>
                <div className="flex-1 text-center">
                    <div className="bg-[#FFFEF5] border-2 border-[#350D7A] text-[#350D7A] px-3 py-1.5 rounded-sm text-lg font-bold shadow-pixel-sm">
                        {item.word}
                    </div>
                </div>
            </div>

            <div className="px-3 pb-3">
                {canOverride ? (
                    <div className="flex flex-col gap-2">
                        <div className="text-center text-[10px] text-amber-700 font-semibold flex items-center justify-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> {isReferee ? 'قرار الحكم' : 'تحكم المضيف'}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                onClick={() => refereeOverride(item.requestId, item.category, false)}
                                className="flex-1 text-xs py-2 h-auto"
                            >
                                حسم: رفض
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => refereeOverride(item.requestId, item.category, true)}
                                className="flex-1 text-xs py-2 h-auto !bg-emerald-600 hover:!bg-emerald-500"
                            >
                                حسم: قبول
                            </Button>
                        </div>
                    </div>
                ) : isRequester ? (
                    <div className="text-center py-2 bg-[#FFFDCC] rounded-sm border-2 border-dashed border-[#350D7A]/50">
                        <Loader2 className="w-4 h-4 text-[#6714A8] animate-spin mx-auto mb-1" />
                        <p className="text-[9px] text-[#350D7A]/80 font-medium">
                            إجابتك تحت التصويت ({yesVotes} نعم / {noVotes} لا)
                        </p>
                    </div>
                ) : !isEligible ? (
                    <div className="text-center py-2 bg-[#FFFDCC]/60 rounded-sm border-2 border-[#350D7A]/30">
                        <p className="text-[9px] text-[#350D7A]/50">لا يحق لك التصويت على هذه الإجابة</p>
                    </div>
                ) : hasVoted ? (
                    <div className="text-center py-2 bg-[#FFF3B6] rounded-sm border-2 border-[#350D7A]">
                        <p className="text-[10px] text-[#350D7A] font-semibold">تم تسجيل صوتك</p>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Button
                            variant="destructive"
                            onClick={() => handleVote('no')}
                            disabled={isVoting}
                            className="flex-1 text-sm py-1.5 h-auto"
                        >
                            رفض
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => handleVote('yes')}
                            disabled={isVoting}
                            className="flex-1 text-sm py-1.5 h-auto"
                        >
                            موافقة
                        </Button>
                    </div>
                )}

                <div className="mt-2">
                    <div className="h-2.5 bg-[#FFFDCC] rounded-sm border-2 border-[#350D7A] overflow-hidden flex">
                        <motion.div className="h-full bg-[#FF6957]" animate={{ width: `${noPercent}%` }} />
                        <motion.div className="h-full bg-[#44AF00]" animate={{ width: `${yesPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-[8px] text-[#350D7A]/60 mt-1 font-medium">
                        <span>رفض ({item.votes?.no || 0})</span>
                        <span>{totalVotes} من {eligibleCount} صوّتوا</span>
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

        const remaining = Math.max(0, Math.ceil((room.rounds[room.currentRound].voteEndTime! - Date.now()) / 1000));
        setVoteTimeLeft(remaining);

        return () => clearInterval(interval);
    }, [room?.phase, room?.currentRound, room?.rounds]);

    if (!room || room.phase !== 'voting') return null;

    if (voteQueue.length === 0) {
        return (
            <AnimatePresence>
                <motion.div
                    key="voting-processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#350D7A]/85 p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="w-full max-w-sm retro-overlay p-8 text-center"
                    >
                        <Loader2 className="w-10 h-10 text-[#6714A8] animate-spin mx-auto mb-3" />
                        <p className="font-bold text-[#350D7A] text-base">جاري معالجة النتائج...</p>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence>
            <motion.div
                key="voting-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#350D7A]/85 p-4"
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="w-full max-w-md max-h-[90vh] flex flex-col retro-overlay overflow-hidden"
                >
                    <div className="bg-[#6714A8] border-b-[3px] border-[#350D7A] px-4 py-3 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <motion.div
                                animate={{ rotate: [-10, 10, -10] }}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                            >
                                <Gavel className="w-5 h-5 text-[#FFC48B]" />
                            </motion.div>
                            <span className="font-bold text-[#FFFEE2] text-base font-pixel-text">
                                محكمة الجولة {room.currentRound + 1}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Timer timeLeft={voteTimeLeft} isRush={voteTimeLeft <= 5} maxTime={30} />
                            <span className="text-[10px] bg-[#FF8A50] text-[#350D7A] font-bold px-2.5 py-0.5 rounded-sm border-2 border-[#350D7A]">
                                {voteQueue.length} إجابات
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-[#FFFDCC]">
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
