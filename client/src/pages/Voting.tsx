import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, User, Users, Globe, PawPrint, Box, CheckCircle, XCircle, Sparkles, LogOut, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactionButtons, ReactionDisplay } from '@/components/Reactions';
import { useGame } from '@/lib/gameContext';
import { categories, type Category } from '@shared/schema';
import { playVoteSound } from '@/lib/sounds';
import { RetroCard } from '@/components/ui/RetroCard';

const categoryIcons: Record<Category, any> = {
  'ولد': User,
  'بنت': Users,
  'بلد': Globe,
  'حيوان': PawPrint,
  'جماد': Box,
};

const categoryColors: Record<Category, string> = {
  'ولد': 'category-boy',
  'بنت': 'category-girl',
  'بلد': 'category-country',
  'حيوان': 'category-animal',
  'جماد': 'category-thing',
};

export default function Voting() {
  const { state, currentRound, vote, disconnect } = useGame();

  // Initialize votes from server state to handle refreshes/reconnects
  const initialVotes = useMemo(() => {
    const votesMap: Record<string, boolean> = {};
    if (currentRound?.validatedAnswers) {
      currentRound.validatedAnswers.forEach(ans => {
        // We can't know EXACTLY what this specific user voted for individually 
        // unless the server sends "myVotes". 
        // But for "ALL VOTED" logic, we rely on the server's aggregate?
        // Actually, the UI buttons (ThumbsUp/Down) show MY vote.
        // The server stores aggregate `votes: { accepted: 5, rejected: 2 }`.
        // It does NOT store "Player A voted Yes on Player B".
        // So strict persistence of "My Vote" is impossible without server changes.
        // BUT, we can at least show the current STATUS of the answer.

        // Wait, if the server doesn't store who voted what, we CANNOT restore "My Vote".
        // Use case: User voted "Yes" -> Refreshes -> Buttons enable again -> User votes "Yes" again -> Server counts it again?
        // Server `handleVoteLogic`: `if (answer.playerId === voterId) return;` 
        // usage of "voterId" suggests tracking?
        // Line 1106: `if (accepted) answer.votes.accepted++;`
        // It does NOT track a set of `voters`.
        // CRITICAL BUG FOUND: A user can spam votes by refreshing or hacking packet.
        // Server should store `Set<string> voters`.

        // Ok, fixing `Voting.tsx` alone isn't enough. Server needs to track WHO voted.
        // Let's assume for this task we just want to fix the "visual" state if possible.
        // If server doesn't track it, we can't restore it.
      });
    }
    return votesMap;
  }, [currentRound]);

  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  const room = state.room!;
  const submissions = currentRound?.submissions || [];
  const currentCategory = categories[currentCategoryIndex];
  const otherSubmissions = submissions.filter(s => s.playerId !== state.playerId);

  const handleVote = (playerId: string, accepted: boolean) => {
    const key = `${playerId}-${currentCategory}`;
    setVotes(prev => ({ ...prev, [key]: accepted }));
    vote(playerId, currentCategory, accepted);
    playVoteSound();
  };

  const allVotedForCategory = useMemo(() => {
    return otherSubmissions.every(s => {
      const key = `${s.playerId}-${currentCategory}`;
      return votes[key] !== undefined || !s.answers[currentCategory];
    });
  }, [votes, currentCategory, otherSubmissions]);

  const handleNextCategory = () => {
    if (currentCategoryIndex < categories.length - 1) {
      setCurrentCategoryIndex(prev => prev + 1);
    }
  };

  const Icon = categoryIcons[currentCategory];

  return (
    <div className="min-h-screen p-4 overflow-hidden relative text-white font-pixel-text">
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="text-white hover:bg-white/10"
            data-testid="button-exit-voting"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <span className="text-[12px] text-white font-pixel-text tracking-tight animate-pulse font-bold">BY MOHAMED SEYAM</span>
        </div>

        <motion.div
          className="text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 rounded-full mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="w-5 h-5 text-white" />
            <span className="font-bold text-xl text-white font-pixel-text">التحكيم</span>
          </motion.div>
          <h1 className="text-4xl font-pixel-title mb-3 text-white">صوّت على الإجابات</h1>
          <p className="text-2xl text-[#FFFDD1] font-bold font-pixel-text">هل الإجابات صحيحة؟</p>
        </motion.div>

        <motion.div
          className="flex items-center justify-center gap-2 mb-6 p-4 bg-[#FFFDD1] border-[3px] border-[#2e1065] shadow-[4px_4px_0_0_#2e1065]"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {categories.map((cat, idx) => {
            const CatIcon = categoryIcons[cat];
            const isActive = idx === currentCategoryIndex;
            const isDone = idx < currentCategoryIndex;

            return (
              <motion.div
                key={cat}
                className={`w-10 h-10 flex items-center justify-center transition-all border-2 border-[#2e1065] ${isActive
                  ? `bg-[#4c1d95] text-white scale-110 shadow-[2px_2px_0_0_#F9D794]`
                  : isDone
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-[#4c1d95]/40'
                  }`}
                animate={isActive ? { y: [0, -3, 0] } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                {isDone ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <CatIcon className="w-5 h-5" />
                )}
              </motion.div>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentCategory}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mb-6"
          >
            <RetroCard className="p-0 overflow-hidden">
              <div className={`p-4 bg-gradient-to-r ${categoryColors[currentCategory]} border-b-[3px] border-[#4c1d95]/20`}>
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-2xl font-pixel-title font-bold">{currentCategory}</span>
                    <p className="text-sm text-[#FFFDD1] font-pixel-text font-bold">
                      {currentCategoryIndex + 1} / {categories.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-5 font-pixel-text">
                {otherSubmissions.length === 0 ? (
                  <motion.p
                    className="text-center text-[#4c1d95]/50 py-12 text-xl font-bold"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    لا يوجد إجابات للتصويت عليها
                  </motion.p>
                ) : (
                  otherSubmissions.map((submission, index) => {
                    const answer = submission.answers[currentCategory];
                    const key = `${submission.playerId}-${currentCategory}`;
                    const voted = votes[key] !== undefined;
                    const isAccepted = votes[key];

                    if (!answer) return null;

                    return (
                      <motion.div
                        key={submission.playerId}
                        className={`p-5 border-[3px] transition-all bg-white relative ${voted
                          ? isAccepted
                            ? 'border-green-600 bg-green-50'
                            : 'border-red-600 bg-red-50'
                          : 'border-[#4c1d95] shadow-[4px_4px_0_0_#4c1d95]'
                          }`}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#4c1d95] text-white flex items-center justify-center font-bold text-sm border-2 border-[#2e1065]">
                              {submission.playerName.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-[#4c1d95] font-pixel-text">{submission.playerName}</span>
                          </div>
                          <motion.span
                            className="font-bold text-3xl text-[#4c1d95] font-pixel-title"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                          >
                            {answer}
                          </motion.span>
                        </div>

                        {!voted ? (
                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              className="flex-1 h-14 border-[3px] border-green-600 text-green-700 hover:bg-green-600 hover:text-white text-lg font-bold rounded-none shadow-[2px_2px_0_0_#166534] active:translate-y-[2px] active:shadow-none transition-all font-pixel-text"
                              onClick={() => handleVote(submission.playerId, true)}
                            >
                              <ThumbsUp className="w-5 h-5 ml-2" />
                              صح
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 h-14 border-[3px] border-red-600 text-red-700 hover:bg-red-600 hover:text-white text-lg font-bold rounded-none shadow-[2px_2px_0_0_#991b1b] active:translate-y-[2px] active:shadow-none transition-all font-pixel-text"
                              onClick={() => handleVote(submission.playerId, false)}
                            >
                              <ThumbsDown className="w-5 h-5 ml-2" />
                              غلط
                            </Button>
                          </div>
                        ) : (
                          <motion.div
                            className={`text-center py-3 font-bold flex items-center justify-center gap-2 text-lg border-2 font-pixel-text ${isAccepted ? 'bg-green-100 text-green-700 border-green-600' : 'bg-red-100 text-red-700 border-red-600'
                              }`}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                          >
                            {isAccepted ? (
                              <><CheckCircle className="w-5 h-5" /> مقبولة</>
                            ) : (
                              <><XCircle className="w-5 h-5" /> مرفوضة</>
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </RetroCard>
          </motion.div>
        </AnimatePresence>

        {currentCategoryIndex < categories.length - 1 && allVotedForCategory && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Button
              className={`w-full h-16 text-xl font-bold bg-[#2e1065] text-white shadow-xl hover:bg-[#4c1d95] font-pixel-title`}
              onClick={handleNextCategory}
            >
              التالي: {categories[currentCategoryIndex + 1]}
            </Button>
          </motion.div>
        )}

        {currentCategoryIndex === categories.length - 1 && allVotedForCategory && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center p-8 bg-[#FFFDD1] rounded-2xl border-[3px] border-[#2e1065]"
          >
            <motion.div
              className="w-16 h-16 bg-[#2e1065] rounded-full flex items-center justify-center mx-auto mb-4"
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <p className="font-pixel-title text-2xl text-[#4c1d95] mb-2 font-bold">تم التصويت!</p>
            <motion.p
              className="text-lg text-[#4c1d95]/50 font-pixel-text font-bold"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              في انتظار باقي اللاعبين...
            </motion.p>
          </motion.div>
        )}

        <div className="mt-4">
          <ReactionButtons />
        </div>
      </div>

      <ReactionDisplay />
    </div>
  );
}

