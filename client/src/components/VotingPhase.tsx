import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useGame } from '@/lib/gameContext';
import { Gavel, Loader2 } from 'lucide-react';
import { TicketCard } from './TicketCard';
import { Timer } from './Timer';
import type { Category } from '@shared/schema';

export function VotingPhase() {
    const { state, castDemocraticVote, currentPlayer } = useGame();
    const room = state.room;
    const currentVote = room?.currentVote;
    const voteQueue = room?.voteQueue || [];

    const [timeLeft, setTimeLeft] = useState(15);
    const [hasVoted, setHasVoted] = useState(false);

    // Track time to live from server startTime
    useEffect(() => {
        if (!currentVote) return;
        const updateTimer = () => {
            const elapsed = Date.now() - currentVote.startTime;
            const remaining = Math.max(0, Math.ceil((15000 - elapsed) / 1000));
            setTimeLeft(remaining);
        };
        updateTimer();
        const interval = setInterval(updateTimer, 500);
        return () => clearInterval(interval);
    }, [currentVote?.requestId]);

    // Track whether current player has already voted
    useEffect(() => {
        if (currentVote && currentPlayer) {
            setHasVoted(currentVote.voterIds.includes(currentPlayer.id));
        } else {
            setHasVoted(false);
        }
    }, [currentVote, currentPlayer]);

    if (!currentVote || room?.phase !== 'voting') return null;

    const isRequester = currentVote.requesterId === currentPlayer?.id;
    const phaseEnded = timeLeft <= 0;

    const handleVote = (vote: 'yes' | 'no') => {
        if (hasVoted || isRequester) return;
        castDemocraticVote(vote);
    };

    const totalVotes = currentVote.votes.yes + currentVote.votes.no;
    const yesPercent = totalVotes > 0 ? (currentVote.votes.yes / totalVotes) * 100 : 50;
    const noPercent = 100 - yesPercent;

    return (
        <AnimatePresence>
            <motion.div
                key="voting-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-4 gap-6"
            >
                {/* ── Header ── */}
                <motion.div
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center justify-between w-full max-w-sm"
                >
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={{ rotate: [-10, 10, -10] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                        >
                            <Gavel className="w-5 h-5 text-[#ff00ff]" style={{ filter: 'drop-shadow(0 0 4px #ff00ff)' }} />
                        </motion.div>
                        <span className="font-pixel-title text-[#00f0ff] text-sm tracking-wider [text-shadow:0_0_8px_#00f0ff]">
                            محكمة الأتوبيس
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {voteQueue.length > 0 && (
                            <span className="text-[10px] bg-[#ff00ff]/20 text-[#ff00ff] border border-[#ff00ff] font-pixel-text px-2 py-0.5 rounded-full">
                                +{voteQueue.length} في الانتظار
                            </span>
                        )}
                        <Timer timeLeft={timeLeft} isRush={timeLeft <= 5} maxTime={15} />
                    </div>
                </motion.div>

                {/* ── Ticket (the main voting card) ── */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentVote.requestId}
                        initial={{ y: 60, opacity: 0, scale: 0.85 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -60, opacity: 0, scale: 0.85 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        className="w-full max-w-sm"
                    >
                        {isRequester ? (
                            /* Own answer: show waiting state on a static ticket */
                            <div
                                className="pixel-ticket relative w-full aspect-[1/1.5] max-w-sm mx-auto flex flex-col items-center justify-center p-6 rounded-xl"
                                style={{
                                    boxShadow: '0 0 20px #00f0ff, inset 0 0 10px #ff00ff',
                                    background: '#0a0a0a',
                                    borderColor: '#00f0ff',
                                    borderWidth: 4,
                                }}
                            >
                                <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />
                                <h3 className="font-pixel-title text-sm text-[#00f0ff] mb-6">{currentVote.category}</h3>
                                <h2 className="font-pixel-title text-3xl text-white mb-6 [text-shadow:3px_3px_0_#ff00ff]">
                                    {currentVote.word}
                                </h2>
                                <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                    <Loader2 className="w-10 h-10 text-[#ff00ff] animate-spin" />
                                </motion.div>
                                <p className="font-pixel-text text-[10px] text-[#00f0ff]/60 mt-4 text-center">
                                    إجابتك تحت التصويت...
                                    <br />اللاعبون الآخرون يقررون!
                                </p>
                            </div>
                        ) : hasVoted ? (
                            /* Already voted: show confirmation */
                            <div
                                className="pixel-ticket relative w-full aspect-[1/1.5] max-w-sm mx-auto flex flex-col items-center justify-center p-6 rounded-xl"
                                style={{
                                    boxShadow: '0 0 14px #00ffaa',
                                    background: '#011811',
                                    borderColor: '#00ffaa',
                                    borderWidth: 4,
                                }}
                            >
                                <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />
                                <motion.div
                                    initial={{ scale: 0.3, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', stiffness: 500 }}
                                    className="text-6xl mb-4"
                                >
                                    ✅
                                </motion.div>
                                <p className="font-pixel-title text-[#00ffaa] text-base">صوّتك وصل!</p>
                                <p className="font-pixel-text text-[10px] text-[#00ffaa]/60 mt-2 text-center">
                                    في انتظار باقي اللاعبين...
                                </p>
                            </div>
                        ) : (
                            /* Swipe-to-vote ticket */
                            <TicketCard
                                category={currentVote.category as Category}
                                word={currentVote.word}
                                playerName={currentVote.requesterName}
                                playerId={currentVote.requesterId}
                                onVote={handleVote}
                                disabled={phaseEnded}
                                timeLeft={timeLeft}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* ── Vote bar ── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm"
                >
                    <div className="flex justify-between text-[10px] font-pixel-text font-bold mb-1 px-1">
                        <span className="text-[#ff0055] [text-shadow:0_0_5px_#ff0055]">❌ رفض ({currentVote.votes.no})</span>
                        <span className="text-[#00ffaa] [text-shadow:0_0_5px_#00ffaa]">موافقة ✅ ({currentVote.votes.yes})</span>
                    </div>
                    <div className="h-5 bg-[#111] rounded-full overflow-hidden border-2 border-[#00f0ff]/30 flex">
                        <motion.div
                            className="h-full bg-gradient-to-r from-red-700 to-[#ff0055]"
                            animate={{ width: `${noPercent}%` }}
                            transition={{ type: 'spring', stiffness: 200 }}
                        />
                        <motion.div
                            className="h-full bg-gradient-to-r from-[#00ffaa] to-emerald-600"
                            animate={{ width: `${yesPercent}%` }}
                            transition={{ type: 'spring', stiffness: 200 }}
                        />
                    </div>
                    <p className="text-center text-[9px] font-pixel-text text-[#00f0ff]/40 mt-1">
                        {totalVotes} أصوات حتى الآن
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
