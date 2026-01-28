import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, User, Users, Globe, PawPrint, Box, CheckCircle, XCircle, Sparkles, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactionButtons, ReactionDisplay } from '@/components/Reactions';
import { useGame } from '@/lib/gameContext';
import { categories, type Category } from '@shared/schema';
import { playVoteSound } from '@/lib/sounds';
import ArcadeBackground from '@/components/ArcadeBackground';
import { RetroCard } from '@/components/ui/RetroCard';

const categoryIcons: Record<Category, any> = {
  'ولد': User,
  'بنت': Users,
  'بلد': Globe,
  'حيوان': PawPrint,
  'جماد': Box,
};

const categoryColors: Record<Category, string> = {
  'ولد': 'from-blue-500 to-blue-600',
  'بنت': 'from-pink-500 to-pink-600',
  'بلد': 'from-green-500 to-green-600',
  'حيوان': 'from-amber-500 to-amber-600',
  'جماد': 'from-purple-500 to-purple-600',
};

export default function Voting() {
  const { state, currentRound, vote, disconnect } = useGame();
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
      <ArcadeBackground />
      <div className="max-w-md mx-auto relative z-10">
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
          <span className="text-[12px] text-white/80 font-pixel-text tracking-tight animate-pulse">BY MOHAMED SEYAM</span>
        </div>

        <motion.div
          className="text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="w-5 h-5 text-white" />
            <span className="font-bold text-white font-pixel-text">التحكيم</span>
          </motion.div>
          <h1 className="text-2xl font-pixel-title mb-2 text-white">صوّت على الإجابات</h1>
          <p className="text-white/80">هل الإجابات صحيحة؟</p>
        </motion.div>

        <motion.div
          className="flex items-center justify-center gap-3 mb-6 p-3 bg-white/10 rounded-2xl border-2 border-white/20"
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
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg ${isActive
                  ? `bg-white scale-110`
                  : isDone
                    ? 'bg-[#31093A]/30'
                    : 'bg-[#31093A]/10'
                  }`}
                animate={isActive ? { y: [0, -3, 0] } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                {isDone ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <CatIcon className={`w-5 h-5 ${isActive ? 'text-[#31093A]' : 'text-white/40'}`} />
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
              <div className={`p-4 bg-gradient-to-r ${categoryColors[currentCategory]} border-b-[3px] border-[#31093A]/20`}>
                <div className="flex items-center gap-3 text-white">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-xl font-pixel-title">{currentCategory}</span>
                    <p className="text-[10px] text-white/70 font-pixel-text">
                      {currentCategoryIndex + 1} / {categories.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-4 font-pixel-text">
                {otherSubmissions.length === 0 ? (
                  <motion.p
                    className="text-center text-[#31093A]/50 py-8"
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
                        className={`rounded-xl p-4 border-2 transition-all ${voted
                          ? isAccepted
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                          : 'bg-[#31093A]/5 border-[#31093A]/5 hover:border-[#31093A]/10'
                          }`}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#31093A]/10 flex items-center justify-center font-bold text-[#31093A] text-xs">
                              {submission.playerName.charAt(0)}
                            </div>
                            <span className="text-[10px] text-[#31093A]/50">{submission.playerName}</span>
                          </div>
                          <motion.span
                            className="font-bold text-xl text-[#31093A]"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                          >
                            {answer}
                          </motion.span>
                        </div>

                        {!voted ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1 h-12 border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white text-sm font-bold"
                              onClick={() => handleVote(submission.playerId, true)}
                            >
                              <ThumbsUp className="w-4 h-4 ml-2" />
                              صح
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 h-12 border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white text-sm font-bold"
                              onClick={() => handleVote(submission.playerId, false)}
                            >
                              <ThumbsDown className="w-4 h-4 ml-2" />
                              غلط
                            </Button>
                          </div>
                        ) : (
                          <motion.div
                            className={`text-center py-2 rounded-lg font-bold flex items-center justify-center gap-2 text-xs ${isAccepted ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'
                              }`}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                          >
                            {isAccepted ? (
                              <><CheckCircle className="w-4 h-4" /> صوّت بالقبول</>
                            ) : (
                              <><XCircle className="w-4 h-4" /> صوّت بالرفض</>
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
              className={`w-full h-14 text-lg font-bold bg-[#2C0834] text-white shadow-xl hover:bg-[#31093A] font-pixel-title`}
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
            className="text-center p-6 bg-[#FFFDD1] rounded-2xl border-[3px] border-[#2C0834]"
          >
            <motion.div
              className="w-14 h-14 bg-[#2C0834] rounded-full flex items-center justify-center mx-auto mb-4"
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            >
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>
            <p className="font-pixel-title text-xl text-[#31093A] mb-2">تم التصويت!</p>
            <motion.p
              className="text-xs text-[#31093A]/50 font-pixel-text"
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
