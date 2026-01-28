import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from '@/components/Timer';
import { LetterDisplay } from '@/components/LetterDisplay';
import { BusCompleteButton } from '@/components/BusCompleteButton';
import { ReactionButtons, ReactionDisplay } from '@/components/Reactions';
import { WildcardPowerUp } from '@/components/WildcardPowerUp';
import { WildcardOverlay } from '@/components/WildcardOverlay';
import { WildcardNotification } from '@/components/WildcardNotification';
import { BanishPowerUp } from '@/components/BanishPowerUp';
import { BanishOverlay } from '@/components/BanishOverlay';
import { BanishNotification } from '@/components/BanishNotification';
import { Confetti } from '@/components/Confetti';
import { useGame } from '@/lib/gameContext';
import { categories, type Category, type RoundAnswers } from '@shared/schema';
import { AlertTriangle, Send, User, Users, Globe, PawPrint, Box, LogOut, Zap, Eye, Trophy, Flame, Sparkles, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playCountdownSound, playCountdownFinalSound, playRoundStart, playBusSound, playFreezeSound, playWildcardSound, playBanishSound, playSubmitSound, playClickSound, playRushActivateSound, playBonusSound } from '@/lib/sounds';
import ArcadeBackground from '@/components/ArcadeBackground';

import { RetroCard } from '@/components/ui/RetroCard';
import { FloatingShapes } from '@/components/ui/FloatingShapes';

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
  'حيوان': 'from-orange-500 to-orange-600',
  'جماد': 'from-purple-500 to-purple-600',
};

export default function Game() {
  const { state, currentRound, submitAnswers, triggerBusComplete, disconnect, currentPlayer, activatePowerUp, activePowerUpNotification, isBanished, banishedBy, banishOverlay, setBanishOverlay } = useGame();

  const room = state.room!;
  const currentCategories = room.settings?.customCategories || categories;

  const [answers, setAnswers] = useState<RoundAnswers>(() => {
    const initial: RoundAnswers = {};
    currentCategories.forEach(c => initial[c] = '');
    return initial;
  });

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [shake, setShake] = useState(false);
  const [showCountdown, setShowCountdown] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [wildcardActive, setWildcardActive] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const letter = currentRound?.letter || room.letters[room.currentRound];

  useEffect(() => {
    const initial: RoundAnswers = {};
    currentCategories.forEach(c => initial[c] = '');
    setAnswers(initial);
    setHasSubmitted(false);
    setShowCountdown(true);
    setCountdown(3);
  }, [room.currentRound]);

  useEffect(() => {
    if (showCountdown && countdown > 0) {
      playCountdownSound();
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      playCountdownFinalSound();
      setTimeout(() => {
        setShowCountdown(false);
        playRoundStart();
        inputRefs.current[currentCategories[0]]?.focus();
      }, 500);
    }
  }, [countdown, showCountdown]);

  useEffect(() => {
    if (state.isRush) {
      setShake(true);
      playRushActivateSound();
      playBusSound();
      setTimeout(() => setShake(false), 500);
    }
  }, [state.isRush]);

  useEffect(() => {
    if (state.timeLeft <= 1 && !hasSubmitted) {
      handleSubmit();
    }
  }, [state.timeLeft, hasSubmitted]);

  const updateAnswer = (category: string, value: string) => {
    setAnswers(prev => ({ ...prev, [category]: value }));
  };

  const handleKeyDown = (category: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = (currentCategories as readonly string[]).indexOf(category);
      const nextCategory = currentCategories[currentIndex + 1];
      if (nextCategory) {
        inputRefs.current[nextCategory]?.focus();
      }
    }
  };

  const allFilled = currentCategories.every(cat => answers[cat] && answers[cat].trim().length > 0);
  const filledCount = currentCategories.filter(cat => answers[cat] && answers[cat].trim().length > 0).length;

  const canBusComplete = allFilled;

  const handleBusComplete = () => {
    if (!hasSubmitted) {
      if (!allFilled) return;
      playClickSound();
      handleSubmit();
      triggerBusComplete();
    }
  };

  const handleSubmit = () => {
    if (!hasSubmitted) {
      playSubmitSound();
      submitAnswers(answers);
      setHasSubmitted(true);
    }
  };

  return (
    <motion.div
      className={`min-h-screen p-3 overflow-hidden relative text-white font-pixel-text ${shake ? 'animate-shake' : ''}`}
    >
      <ArcadeBackground />
      <FloatingShapes />
      <AnimatePresence>
        {showCountdown && (
          <motion.div
            className="fixed inset-0 z-50 bg-background/90 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <motion.div
                className="w-32 h-32 bg-[#2C0834] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-[#FFFDD1]"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <span className="text-6xl font-pixel-title text-white">{letter}</span>
              </motion.div>
              <motion.p className="text-xl text-white/80 mb-4 font-pixel-text">
                الجولة {room.currentRound + 1}
              </motion.p>
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-8xl font-pixel-title text-white"
              >
                {countdown === 0 ? '!' : countdown}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="text-white hover:bg-white/10"
            data-testid="button-exit-game"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <span className="text-[12px] text-white/80 font-pixel-text tracking-tight animate-pulse">BY MOHAMED SEYAM</span>
        </div>

        <motion.div
          className="flex items-center justify-between mb-4 gap-2"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex gap-2 items-center flex-1">
            <LetterDisplay
              letter={letter}
              round={room.currentRound + 1}
              totalRounds={room.totalRounds}
            />
          </div>

          <div className="flex flex-col items-end gap-1">
            <Timer timeLeft={state.timeLeft} isRush={state.isRush} />
            {currentPlayer?.busStreak && currentPlayer.busStreak > 0 ? (
              <div className="flex items-center gap-1 text-orange-400 font-bold text-xs animate-pulse">
                <Flame className="w-3 h-3" />
                Streak: {currentPlayer.busStreak}
              </div>
            ) : null}
          </div>
        </motion.div>

        <AnimatePresence>
          {activePowerUpNotification && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#2C0834] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border-2 border-[#FFFDD1]"
            >
              <div className="bg-white/20 p-2 rounded-full">
                {activePowerUpNotification.type === 'wildcard' && <Sparkles className="w-6 h-6 animate-spin" />}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg font-pixel-text">{activePowerUpNotification.playerName}</span>
                <span className="text-sm opacity-90 font-pixel-text">
                  {activePowerUpNotification.type === 'wildcard' ? 'استخدم الجوكر! 🃏' : 'استخدم مساعدة!'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <WildcardNotification
          show={!!currentRound?.activePowerUp && currentRound.activePowerUp.type === 'wildcard' && currentRound.activePowerUp.playerId !== currentPlayer?.id}
          playerName={currentRound?.activePowerUp?.playerName}
        />

        <WildcardOverlay isActive={wildcardActive} playerName={currentPlayer?.name} message="تم ملء جميع الخانات بإجابات صحيحة!" />

        <BanishOverlay
          isOpen={banishOverlay}
          onClose={() => setBanishOverlay(false)}
          players={room.players.filter(p => p.id !== currentPlayer?.id)}
          onSelectPlayer={(playerId) => {
            activatePowerUp('banish', playerId);
            setBanishOverlay(false);
          }}
        />

        <BanishNotification
          show={isBanished}
          banishedBy={banishedBy || undefined}
          isBanished={isBanished}
        />

        <AnimatePresence>
          {room.phase === 'ai_processing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-[#2C0834]/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 overflow-hidden"
            >
              <div className="relative z-10 flex flex-col items-center">
                <motion.div
                  className="relative w-32 h-32 mb-8 flex items-center justify-center"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
                >
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-20" />
                  <div className="absolute inset-4 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full blur-md" />
                  <motion.div
                    className="relative z-10 w-20 h-20 bg-[#FFFDD1] rounded-2xl shadow-xl flex items-center justify-center border-4 border-[#2C0834]"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Sparkles className="w-10 h-10 text-[#2C0834]" />
                  </motion.div>
                </motion.div>

                <motion.h2
                  className="text-3xl font-pixel-title text-white mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  جاري المراجعة...
                </motion.h2>

                <div className="h-6 overflow-hidden relative w-64 text-center">
                  <motion.div
                    animate={{ y: [-24, 0, -24] }}
                    transition={{ duration: 4, repeat: Infinity, times: [0, 0.2, 1] }}
                    className="flex flex-col gap-2 font-pixel-text"
                  >
                    <span className="text-white/60 text-sm">نتأكد من الإجابات... 🧐</span>
                    <span className="text-white/60 text-sm">نحسب النقاط... 🔢</span>
                    <span className="text-white/60 text-sm">نبحث عن الهبد... 🤔</span>
                    <span className="text-white/60 text-sm">نجهز النتائج... 🏆</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <RetroCard className="p-0 border-[3px] overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full" dir="rtl">
              <thead>
                <tr>
                  <th className="p-2 text-center text-[10px] text-[#31093A]/60 bg-[#31093A]/5 border-b border-[#31093A]/10 w-12 font-pixel-text">
                    الحرف
                  </th>
                  {currentCategories.map((category, i) => {
                    const Icon = categoryIcons[category as Category] || Box;
                    return (
                      <th key={category} className="p-0 border-b border-[#31093A]/10">
                        <motion.div
                          className={`bg-gradient-to-b ${categoryColors[category]} p-2 flex flex-col items-center justify-center gap-1`}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <Icon className="w-4 h-4 text-white" />
                          <span className="text-[10px] font-bold text-white font-pixel-text">{category}</span>
                        </motion.div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-[#31093A]/5">
                  <td className="p-2 text-center">
                    <motion.div
                      className="w-10 h-10 bg-[#31093A] rounded-xl flex items-center justify-center mx-auto shadow-lg"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <span className="font-pixel-title text-lg text-white">{letter}</span>
                    </motion.div>
                  </td>
                  {categories.map((category, i) => (
                    <td key={category} className="p-1">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                      >
                        <Input
                          ref={(el) => { inputRefs.current[category] = el; }}
                          type="text"
                          value={answers[category]}
                          onChange={(e) => updateAnswer(category, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(category, e)}
                          disabled={hasSubmitted}
                          placeholder={category}
                          className={`text-center text-sm h-10 border-2 transition-all font-pixel-text ${answers[category].trim()
                            ? 'border-[#2C0834] bg-white'
                            : 'border-[#31093A]/10 bg-white/50'
                            } ${hasSubmitted ? 'opacity-60' : ''}`}
                          data-testid={`input-${category}`}
                        />
                      </motion.div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-[#31093A]/5 border-t border-[#31093A]/10 font-pixel-text">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#31093A]/60">التقدم</span>
              <span className="text-sm font-bold text-[#31093A]">{filledCount} / 5</span>
            </div>
            <div className="flex gap-1 mt-2">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat}
                  className={`flex-1 h-2 rounded-full ${answers[cat].trim() ? 'bg-[#31093A]' : 'bg-[#31093A]/10'
                    }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.05 }}
                />
              ))}
            </div>
          </div>
        </RetroCard>

        {!hasSubmitted ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <BusCompleteButton
              onPress={handleBusComplete}
              disabled={!canBusComplete}
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center p-6 bg-[#FFFDD1] rounded-2xl border-[3px] border-[#2C0834] shadow-lg"
          >
            <motion.div
              className="w-14 h-14 bg-[#2C0834] rounded-full flex items-center justify-center mx-auto mb-3"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Send className="w-7 h-7 text-white" />
            </motion.div>
            <p className="font-pixel-title text-lg text-[#31093A] mb-1">تم الإرسال!</p>
            <motion.p
              className="text-xs text-[#31093A]/60 font-pixel-text"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              في انتظار باقي اللاعبين...
            </motion.p>
          </motion.div>
        )}

        <div className="mt-3">
          <ReactionButtons />
        </div>
      </div>

      <ReactionDisplay />
      <Confetti active={room.phase === 'results' || room.phase === 'final'} />
    </motion.div>
  );
}
