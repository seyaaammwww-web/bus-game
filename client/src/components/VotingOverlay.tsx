import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Gavel, Loader2, CheckCircle } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { Timer } from '@/components/Timer';
import { useEffect, useState } from 'react';

export function VotingOverlay() {
    const { state, castDemocraticVote, currentPlayer } = useGame();
    const room = state.room;
    const currentVote = room?.currentVote;
    const voteQueue = room?.voteQueue || [];

    const [timeLeft, setTimeLeft] = useState(15);
    const [hasVoted, setHasVoted] = useState(false);
    const [lastVote, setLastVote] = useState<'yes' | 'no' | null>(null);

    useEffect(() => {
        if (!currentVote) return;
        const updateTimer = () => {
            const elapsed = Date.now() - currentVote.startTime;
            const remaining = Math.max(0, Math.ceil((15000 - elapsed) / 1000));
            setTimeLeft(remaining);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [currentVote]);

    useEffect(() => {
        if (currentVote && currentPlayer) {
            setHasVoted(currentVote.voterIds.includes(currentPlayer.id));
        } else {
            setHasVoted(false);
            setLastVote(null);
        }
    }, [currentVote, currentPlayer]);

    if (!currentVote) return null;

    const isRequester = currentVote.requesterId === currentPlayer?.id;
    const totalVotes = currentVote.votes.yes + currentVote.votes.no;
    const yesPercent = totalVotes > 0 ? (currentVote.votes.yes / totalVotes) * 100 : 50;
    const noPercent = totalVotes > 0 ? (currentVote.votes.no / totalVotes) * 100 : 50;

    const handleVote = (v: 'yes' | 'no') => {
        setLastVote(v);
        castDemocraticVote(v);
    };

    return (
        <AnimatePresence>
            <motion.div
                key="voting-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
            >
                <motion.div
                    initial={{ scale: 0.7, y: 40 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.7, y: 40 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="w-full max-w-md"
                >
                    {/* ===== CARD ===== */}
                    <div className="retro-overlay overflow-hidden">

                        {/* ── Header banner ── */}
                        <div className="bg-[#4c1d95] px-4 py-3 flex items-center justify-between -mx-[1px] -mt-[1px] mb-4 border-b-[3px] border-[#2e1065]">
                            <div className="flex items-center gap-2">
                                <motion.div
                                    animate={{ rotate: [-10, 10, -10] }}
                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                >
                                    <Gavel className="w-5 h-5 text-amber-300" />
                                </motion.div>
                                <span className="font-pixel-title text-amber-200 text-base tracking-wide">محكمة اللعبة!</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Timer timeLeft={timeLeft} isRush={timeLeft <= 5} maxTime={15} />
                                {voteQueue.length > 0 && (
                                    <span className="text-[10px] bg-amber-400 text-amber-900 font-pixel-text font-bold px-2 py-0.5 rounded-full border border-amber-600">
                                        +{voteQueue.length} في الانتظار
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── "On trial" card ── */}
                        <motion.div
                            key={currentVote.requestId}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="mx-1 mb-4 bg-[#FFFDD1] border-[3px] border-[#4c1d95] shadow-[4px_4px_0_0_#2e1065] rounded-xl overflow-hidden"
                        >
                            {/* Requester strip */}
                            <div className="bg-[#4c1d95]/10 px-3 py-1.5 flex items-center gap-2 border-b border-[#4c1d95]/20">
                                <span className="text-xs font-pixel-text text-[#4c1d95]/70 font-bold">طلب المراجعة من:</span>
                                <span className="text-xs font-pixel-text text-[#7c3aed] font-bold">{currentVote.requesterName}</span>
                            </div>

                            {/* Word verdict */}
                            <div className="flex items-center justify-center gap-3 px-4 py-4">
                                <div className="text-center">
                                    <p className="text-[10px] font-pixel-text text-[#4c1d95]/60 font-bold mb-1">الفئة</p>
                                    <div className="bg-[#4c1d95] text-white px-3 py-1.5 rounded-lg font-pixel-title text-sm shadow-[2px_2px_0_0_#2e1065]">
                                        {currentVote.category}
                                    </div>
                                </div>

                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.2 }}
                                    className="text-xl text-[#4c1d95]"
                                >
                                    ⚖️
                                </motion.div>

                                <div className="text-center">
                                    <p className="text-[10px] font-pixel-text text-[#7c3aed] font-bold mb-1">الإجابة</p>
                                    <div className="bg-white border-[2px] border-[#7c3aed] text-[#4c1d95] px-4 py-1.5 rounded-lg font-pixel-title text-xl shadow-[2px_2px_0_0_#7c3aed]">
                                        {currentVote.word}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* ── Vote controls ── */}
                        <div className="mx-1 mb-4">
                            {isRequester ? (
                                /* Your answer is on trial — waiting */
                                <motion.div
                                    className="text-center py-5 bg-[#4c1d95]/10 rounded-xl border-[2px] border-dashed border-[#7c3aed]"
                                    animate={{ opacity: [1, 0.7, 1] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin mx-auto mb-2" />
                                    <p className="font-pixel-title text-[#4c1d95] text-sm">إجابتك تحت المراجعة...</p>
                                    <p className="font-pixel-text text-[10px] text-[#4c1d95]/60 mt-1">اللاعبون الآخرون يصوتون الآن</p>
                                </motion.div>

                            ) : hasVoted ? (
                                /* Voted stamp */
                                <motion.div
                                    initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
                                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                    className={`text-center py-5 rounded-xl border-[3px] ${lastVote === 'yes'
                                            ? 'bg-emerald-50 border-emerald-500 shadow-[3px_3px_0_0_#065f46]'
                                            : 'bg-red-50 border-red-500 shadow-[3px_3px_0_0_#7f1d1d]'
                                        }`}
                                >
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2 border-[3px] ${lastVote === 'yes'
                                            ? 'bg-emerald-500 border-emerald-700 shadow-[3px_3px_0_0_#065f46]'
                                            : 'bg-red-500 border-red-700 shadow-[3px_3px_0_0_#7f1d1d]'
                                        }`}>
                                        {lastVote === 'yes'
                                            ? <ThumbsUp className="w-7 h-7 text-white" />
                                            : <ThumbsDown className="w-7 h-7 text-white" />}
                                    </div>
                                    <p className={`font-pixel-title text-base ${lastVote === 'yes' ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {lastVote === 'yes' ? '✅ صوّتت بالموافقة!' : '❌ صوّتت بالرفض!'}
                                    </p>
                                    <p className="font-pixel-text text-[10px] text-gray-500 mt-1">في انتظار باقي اللاعبين...</p>
                                </motion.div>

                            ) : (
                                /* Big arcade YES / NO buttons */
                                <div className="grid grid-cols-2 gap-3">
                                    {/* NO */}
                                    <motion.button
                                        whileTap={{ scale: 0.93, y: 3 }}
                                        onClick={() => handleVote('no')}
                                        className="relative h-20 bg-gradient-to-b from-red-400 to-red-600 text-white font-pixel-title text-xl rounded-xl border-[3px] border-red-800 shadow-[0_5px_0_0_#7f1d1d] active:shadow-[0_2px_0_0_#7f1d1d] active:translate-y-[3px] transition-all overflow-hidden flex flex-col items-center justify-center gap-1"
                                    >
                                        {/* shine sweep */}
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"
                                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                        />
                                        <ThumbsDown className="w-7 h-7 relative z-10" />
                                        <span className="relative z-10 leading-none">رفض</span>
                                    </motion.button>

                                    {/* YES */}
                                    <motion.button
                                        whileTap={{ scale: 0.93, y: 3 }}
                                        onClick={() => handleVote('yes')}
                                        className="relative h-20 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white font-pixel-title text-xl rounded-xl border-[3px] border-emerald-800 shadow-[0_5px_0_0_#065f46] active:shadow-[0_2px_0_0_#065f46] active:translate-y-[3px] transition-all overflow-hidden flex flex-col items-center justify-center gap-1"
                                    >
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none"
                                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                                            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                                        />
                                        <ThumbsUp className="w-7 h-7 relative z-10" />
                                        <span className="relative z-10 leading-none">موافقة</span>
                                    </motion.button>
                                </div>
                            )}
                        </div>

                        {/* ── Live vote split bar ── */}
                        <div className="mx-1 mb-1">
                            <div className="flex justify-between text-[10px] font-pixel-text font-bold text-[#4c1d95]/70 mb-1 px-1">
                                <span className="text-red-500">❌ رفض ({currentVote.votes.no})</span>
                                <span className="text-emerald-600">موافقة ✅ ({currentVote.votes.yes})</span>
                            </div>
                            <div className="h-5 bg-[#4c1d95]/10 rounded-full overflow-hidden border-[2px] border-[#4c1d95]/30 flex relative">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-red-600 to-red-400"
                                    animate={{ width: `${noPercent}%` }}
                                    transition={{ type: 'spring', stiffness: 200 }}
                                />
                                <motion.div
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                                    animate={{ width: `${yesPercent}%` }}
                                    transition={{ type: 'spring', stiffness: 200 }}
                                />
                                {/* Center divider */}
                                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/60 -translate-x-1/2" />
                            </div>
                            <p className="text-center text-[9px] font-pixel-text text-[#4c1d95]/50 mt-0.5">
                                إجمالي الأصوات: {totalVotes}
                            </p>
                        </div>

                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
