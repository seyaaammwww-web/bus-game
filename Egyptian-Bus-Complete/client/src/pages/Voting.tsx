import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, User, Users, Globe, PawPrint, Box, CheckCircle, XCircle, Sparkles, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReactionButtons, ReactionDisplay } from '@/components/Reactions';
import { useGame } from '@/lib/gameContext';
import { categories, type Category } from '@shared/schema';
import { playVoteSound } from '@/lib/sounds';

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

const categoryBgColors: Record<Category, string> = {
  'ولد': 'bg-blue-500',
  'بنت': 'bg-pink-500',
  'بلد': 'bg-green-500',
  'حيوان': 'bg-amber-500',
  'جماد': 'bg-purple-500',
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
    <div className="min-h-screen bg-gradient-to-b from-secondary/5 via-background to-primary/5 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="text-destructive hover:bg-destructive/10"
            data-testid="button-exit-voting"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <span className="text-xs text-muted-foreground/60">BY MOHAMED SEYAM</span>
        </div>

        <motion.div
          className="text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold text-primary">التحكيم</span>
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">صوّت على الإجابات</h1>
          <p className="text-muted-foreground">هل الإجابات صحيحة؟</p>
        </motion.div>

        <motion.div
          className="flex items-center justify-center gap-3 mb-6 p-3 bg-card/50 rounded-2xl"
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
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg ${isActive
                    ? `bg-gradient-to-br ${categoryColors[cat]} scale-110`
                    : isDone
                      ? 'bg-accent/30'
                      : 'bg-muted'
                  }`}
                animate={isActive ? { y: [0, -3, 0] } : {}}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                {isDone ? (
                  <CheckCircle className="w-6 h-6 text-accent" />
                ) : (
                  <CatIcon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-muted-foreground'}`} />
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
            <Card className="border-2 shadow-xl overflow-hidden">
              <CardHeader className={`pb-4 bg-gradient-to-r ${categoryColors[currentCategory]}`}>
                <CardTitle className="flex items-center gap-3 text-white">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-2xl">{currentCategory}</span>
                    <p className="text-sm text-white/70 font-normal">
                      {currentCategoryIndex + 1} / {categories.length}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {otherSubmissions.length === 0 ? (
                  <motion.p
                    className="text-center text-muted-foreground py-8"
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
                        className={`rounded-2xl p-4 border-2 transition-all ${voted
                            ? isAccepted
                              ? 'bg-accent/10 border-accent/50'
                              : 'bg-destructive/10 border-destructive/50'
                            : 'bg-muted/50 border-muted hover:border-primary/30'
                          }`}
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                              {submission.playerName.charAt(0)}
                            </div>
                            <span className="text-sm text-muted-foreground">{submission.playerName}</span>
                          </div>
                          <motion.span
                            className="font-bold text-2xl"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                          >
                            {answer}
                          </motion.span>
                        </div>

                        {!voted ? (
                          <div className="flex gap-3">
                            <motion.div
                              className="flex-1"
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Button
                                variant="outline"
                                className="w-full h-14 border-2 border-accent text-accent hover:bg-accent hover:text-white text-lg font-bold"
                                onClick={() => handleVote(submission.playerId, true)}
                                data-testid={`button-accept-${submission.playerId}`}
                              >
                                <ThumbsUp className="w-5 h-5 ml-2" />
                                صح
                              </Button>
                            </motion.div>
                            <motion.div
                              className="flex-1"
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Button
                                variant="outline"
                                className="w-full h-14 border-2 border-destructive text-destructive hover:bg-destructive hover:text-white text-lg font-bold"
                                onClick={() => handleVote(submission.playerId, false)}
                                data-testid={`button-reject-${submission.playerId}`}
                              >
                                <ThumbsDown className="w-5 h-5 ml-2" />
                                غلط
                              </Button>
                            </motion.div>
                          </div>
                        ) : (
                          <motion.div
                            className={`text-center py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${isAccepted ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'
                              }`}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                          >
                            {isAccepted ? (
                              <>
                                <CheckCircle className="w-5 h-5" />
                                صوّت بالقبول
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5" />
                                صوّت بالرفض
                              </>
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {currentCategoryIndex < categories.length - 1 && allVotedForCategory && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              className={`w-full h-16 text-xl font-bold bg-gradient-to-r ${categoryColors[categories[currentCategoryIndex + 1]]} shadow-xl`}
              onClick={handleNextCategory}
              data-testid="button-next-category"
            >
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                التالي: {categories[currentCategoryIndex + 1]}
              </motion.span>
            </Button>
          </motion.div>
        )}

        {currentCategoryIndex === categories.length - 1 && allVotedForCategory && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center p-8 bg-gradient-to-br from-accent/10 to-accent/20 rounded-2xl border-2 border-accent/30"
          >
            <motion.div
              className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4"
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <p className="font-bold text-xl mb-2">تم التصويت!</p>
            <motion.p
              className="text-sm text-muted-foreground"
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
