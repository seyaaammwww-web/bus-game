import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer } from '@/components/Timer';
import { LetterDisplay } from '@/components/LetterDisplay';
import { BusCompleteButton } from '@/components/BusCompleteButton';
import { ReactionButtons, ReactionDisplay } from '@/components/Reactions';
import { PowerUpCard } from '@/components/PowerUpCard';
import { WildcardPowerUp } from '@/components/WildcardPowerUp';
import { WildcardOverlay } from '@/components/WildcardOverlay';
import { WildcardNotification } from '@/components/WildcardNotification';
import { BanishPowerUp } from '@/components/BanishPowerUp';
import { BanishOverlay } from '@/components/BanishOverlay';
import { BanishNotification } from '@/components/BanishNotification';
import { PowerUpMenu } from '@/components/PowerUpMenu';
import { Confetti } from '@/components/Confetti';
import { useGame } from '@/lib/gameContext';
import { categories, type Category, type RoundAnswers } from '@shared/schema';
import { AlertTriangle, Send, User, Users, Globe, PawPrint, Box, LogOut, Zap, Eye, Trophy, Flame, Sparkles, Crown, Skull, Pyramid, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playCountdownSound, playCountdownFinalSound, playRoundStart, playBusSound, playFreezeSound, playWildcardSound, playBanishSound, playSubmitSound, playClickSound, playRushActivateSound, playBonusSound, playTypeSound } from '@/lib/sounds';
import { RetroCard } from '@/components/ui/RetroCard';
import { cn } from '@/lib/utils';

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

export default function Game() {
  const {
    state,
    currentRound,
    submitAnswers,
    triggerBusComplete,
    disconnect,
    currentPlayer,
    activatePowerUp,
    activePowerUpNotification,
    isBanished,
    banishedBy,
    banishOverlay,
    setBanishOverlay,
    sendDraftUpdate,
  } = useGame();

  const room = state.room!;
  const currentCategories = (room.settings?.customCategories && room.settings.customCategories.length > 0)
    ? room.settings.customCategories
    : categories;

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

  // Debounced draft sync to server
  useEffect(() => {
    if (hasSubmitted || state.timeLeft <= 0 || state.room?.phase !== 'playing') return;

    const timer = setTimeout(() => {
      // Only send if there's at least one non-empty answer
      const hasContent = Object.values(answers).some(a => a && a.trim().length > 0);
      if (hasContent) {
        sendDraftUpdate(answers);
      }
    }, 500); // 500ms debounce for better reliability

    return () => clearTimeout(timer);
  }, [answers, hasSubmitted, state.timeLeft, state.room?.phase, sendDraftUpdate]);

  const letter = currentRound?.letter || room.letters[room.currentRound];

  const getPowerUpStatus = (cost: number, isUsed: boolean) => {
    if (isUsed) return 'used';
    if (currentRound?.activePowerUp && currentRound.activePowerUp.playerId !== currentPlayer?.id) return 'disabled';
    const points = currentPlayer?.totalEarnedPoints || 0;
    return points >= cost ? 'available' : 'locked';
  };

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

  // Sync with server submission (e.g. if Wildcard submitted for us)
  useEffect(() => {
    if (currentRound?.submissions && currentPlayer?.id) {
      const mySub = currentRound.submissions.find(s => s.playerId === currentPlayer.id);
      if (mySub && !hasSubmitted) {
        setHasSubmitted(true);
        if (mySub.answers) {
          setAnswers(mySub.answers);
        }
      }
    }
  }, [currentRound, currentPlayer, hasSubmitted]);

  const updateAnswer = (category: string, value: string) => {
    setAnswers(prev => {
      return { ...prev, [category]: value };
    });
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

  const allFilled = currentCategories.length > 0 && currentCategories.every(cat => answers[cat] && answers[cat].trim().length > 0);
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

  // Ref to track latest answers for robust submission
  const answersRef = useRef(answers);
  const hasSubmittedRef = useRef(hasSubmitted);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    hasSubmittedRef.current = hasSubmitted;
  }, [hasSubmitted]);

  const handleSubmit = () => {
    if (!hasSubmittedRef.current) {
      playSubmitSound();
      submitAnswers(answersRef.current);
      setHasSubmitted(true);
      hasSubmittedRef.current = true;
    }
  };

  // Auto-submit when time runs out
  useEffect(() => {
    if (state.timeLeft <= 1 && !hasSubmitted) {
      handleSubmit();
    }
  }, [state.timeLeft, hasSubmitted]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <motion.div
      className={`min-h-screen text-white p-4 font-pixel-text relative overflow-x-hidden md:flex md:items-center ${shake ? 'animate-shake' : ''}`}
      initial={isMobile ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
    >
      <AnimatePresence>
        {showCountdown && (
          <motion.div
            className="fixed inset-0 z-50 bg-[#0f0a1f]/95 flex flex-col items-center justify-center"
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
                className="w-40 h-40 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(139,92,246,0.5)] border-4 border-white/20"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <span className="text-7xl font-pixel-title text-white drop-shadow-lg">{letter}</span>
              </motion.div>
              <motion.p className="text-4xl text-white mb-6 font-pixel-title">
                الجولة {room.currentRound + 1} / {room.totalRounds}
              </motion.p>
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="text-9xl font-pixel-title text-white drop-shadow-[0_0_30px_rgba(139,92,246,0.8)]"
              >
                {countdown === 0 ? 'ابدأ!' : countdown}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto relative z-10 px-4 w-full">
        {/* Mobile Header: Clean Standard Layout (Exit - Letter - Timer) */}
        <motion.div
          className="flex flex-col gap-2 mb-4 relative z-10 md:hidden"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {/* Mobile Top Row: Exit - Letter - Timer */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={disconnect}
              className="text-white/80 hover:bg-white/10 hover:text-white h-9 w-9"
            >
              <LogOut className="w-5 h-5" />
            </Button>

            <div className="flex-1 flex justify-center">
              <LetterDisplay letter={letter} />
            </div>

            <div className="flex items-center gap-2">
              <Timer timeLeft={state.timeLeft} isRush={state.isRush} />
            </div>
          </div>

          {/* Mobile Bottom Row: PowerUps - Round Badge */}
          <div className="flex items-center justify-between px-2 mt-4">
            <PowerUpMenu />

            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-[#2e1065] px-4 py-1.5 rounded-full border-[3px] border-[#4c1d95] font-bold text-xs shadow-sm font-pixel-text">
              جولة {room.currentRound + 1} / {room.totalRounds}
            </div>
          </div>
        </motion.div>



        {/* Desktop Header - Unchanged */}
        <motion.div
          className="hidden md:flex items-center justify-between mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {/* Left - Exit Button & Round Badge & Letter */}
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={disconnect}
              className="text-white/80 hover:bg-white/10 hover:text-white"
              data-testid="button-exit-game"
            >
              <LogOut className="w-5 h-5" />
            </Button>

            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-[#2e1065] px-5 py-2 rounded-full border-[3px] border-[#4c1d95] font-bold text-lg shadow-[3px_3px_0_0_#2e1065] font-pixel-text whitespace-nowrap">
              جولة {room.currentRound + 1} / {room.totalRounds}
            </div>

            <div className="scale-75 origin-right">
              <LetterDisplay letter={letter} />
            </div>
          </div>

          {/* Right - Timer and Streak and PowerUps */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Desktop PowerUps */}
            <div className="flex items-center gap-2">
              <PowerUpMenu />
            </div>

            <div className="flex flex-col items-end gap-1">
              <Timer timeLeft={state.timeLeft} isRush={state.isRush} />
              {currentPlayer?.busStreak && currentPlayer.busStreak > 0 ? (
                <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 rounded-full text-white font-bold text-[9px] md:text-xs shadow-sm">
                  <Flame className="w-3 h-3" />
                  <span className="font-pixel-text">×{currentPlayer.busStreak}</span>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {activePowerUpNotification && (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#2e1065] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border-2 border-[#FFFDD1]"
            >
              <div className="bg-white/20 p-2 rounded-full">
                {activePowerUpNotification.type === 'wildcard' && <Sparkles className="w-6 h-6 animate-spin" />}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl font-pixel-text">{activePowerUpNotification.playerName}</span>
                <span className="text-lg opacity-90 font-pixel-text">
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
          {/* Removed AI processing screen - direct transition to results */}
          {false && room.phase === 'ai_processing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
            >
              {/* Sand particles transition effect */}
              <motion.div
                className="absolute inset-0"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 1.5, delay: 0.5 }}
              >
                {[...Array(40)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-amber-400 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      boxShadow: '0 0 8px rgba(251, 191, 36, 0.8)',
                    }}
                    initial={{
                      scale: 0,
                      opacity: 0,
                      x: 0,
                      y: 0
                    }}
                    animate={{
                      scale: [0, 1.5, 0],
                      opacity: [0, 1, 0],
                      x: (Math.random() - 0.5) * 400,
                      y: Math.random() * 600 + 200,
                      rotate: Math.random() * 360
                    }}
                    transition={{
                      duration: 1.5,
                      delay: Math.random() * 0.3,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </motion.div>

              {/* Centered spinning 3D 8-bit pyramid icon */}
              <motion.div
                className="relative"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  rotate: 360
                }}
                transition={{
                  scale: { duration: 0.5, delay: 0.8 },
                  opacity: { duration: 0.5, delay: 0.8 },
                  rotate: { duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }
                }}
              >
                {/* 3D layered effect - shadow layers */}
                <div className="absolute inset-0 translate-x-2 translate-y-2 opacity-30">
                  <div className="w-32 h-32 bg-gradient-to-br from-amber-900 to-amber-950 rounded-2xl"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>
                <div className="absolute inset-0 translate-x-1 translate-y-1 opacity-50">
                  <div className="w-32 h-32 bg-gradient-to-br from-amber-800 to-amber-900 rounded-2xl"
                    style={{
                      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                      imageRendering: 'pixelated'
                    }}
                  />
                </div>

                {/* Main icon container with 3D effect */}
                <motion.div
                  className="relative w-32 h-32 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-2xl border-4 border-amber-300"
                  style={{
                    imageRendering: 'pixelated',
                    boxShadow: '0 8px 32px rgba(251, 191, 36, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.3), inset 0 -2px 8px rgba(0, 0, 0, 0.3)'
                  }}
                  animate={{
                    scale: [1, 1.05, 1]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {/* Pixel art style highlights */}
                  <div className="absolute top-2 left-2 w-8 h-8 bg-amber-200 opacity-40 rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />

                  {/* Pyramid icon */}
                  <Pyramid
                    className="w-16 h-16 text-amber-950 relative z-10"
                    strokeWidth={2.5}
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                    }}
                  />
                </motion.div>

                {/* Glowing pulse effect */}
                <motion.div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%)',
                    filter: 'blur(20px)'
                  }}
                  animate={{
                    opacity: [0.5, 0.8, 0.5],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {currentCategories.map((category, i) => {
              const Icon = categoryIcons[category as Category] || Box;
              const isLastOdd = isMobile && currentCategories.length % 2 !== 0 && i === currentCategories.length - 1;

              return (
                <motion.div
                  key={category}
                  initial={isMobile ? { opacity: 0 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={isMobile ? { duration: 0.2 } : { delay: i * 0.05 }}
                  className={cn("relative group", isLastOdd && "col-span-2 flex justify-center")}
                >
                  <div className={cn(
                    "bg-white border-2 border-[#4c1d95] shadow-[3px_3px_0px_0px_#2e1065] rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_#2e1065] transition-all duration-200",
                    isLastOdd && "w-[calc(50%-6px)] md:w-full"
                  )}>
                    <div className={`${categoryColors[category]} py-1.5 px-2 border-b-2 border-[#4c1d95] flex items-center justify-center gap-1.5`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                      <span className="font-bold text-white font-pixel-text text-xs md:text-sm whitespace-nowrap">{category}</span>
                    </div>
                    <div className="p-2 bg-gradient-to-b from-white to-gray-50">
                      <Input
                        ref={(el) => { inputRefs.current[category] = el; }}
                        type="text"
                        value={answers[category]}
                        onChange={(e) => updateAnswer(category, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(category, e)}
                        disabled={hasSubmitted || isBanished}
                        placeholder="..."
                        onFocus={(e) => {
                          if (isMobile) {
                            setTimeout(() => {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                          }
                        }}
                        className={`text-center text-sm md:text-lg h-9 md:h-12 border-2 border-[#e5e7eb] focus:border-[#7c3aed] focus:ring-0 focus:shadow-[0_0_0_2px_rgba(124,58,237,0.1)] transition-all font-pixel-text font-bold bg-white text-[#4c1d95] placeholder:text-gray-300 rounded-lg ${hasSubmitted || isBanished ? 'opacity-60 grayscale' : ''}`}
                        data-testid={`input-${category}`}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>



        {
          !hasSubmitted ? (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <BusCompleteButton
                onPress={handleBusComplete}
                disabled={!canBusComplete || isBanished} // Disable button if banished
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center p-8 mt-6 bg-gradient-to-b from-white to-[#faf5ff] rounded-2xl border-[3px] border-[#4c1d95] shadow-[4px_4px_0_0_#2e1065,_0_0_20px_rgba(139,92,246,0.2)]"
            >
              <motion.div
                className="w-16 h-16 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Send className="w-8 h-8 text-white" />
              </motion.div>
              <p className="font-pixel-title text-2xl text-[#4c1d95] mb-2">تم الإرسال!</p>
              <motion.p className="text-lg text-[#7c3aed] font-bold font-pixel-text"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                في انتظار باقي اللاعبين...
              </motion.p>
            </motion.div>
          )
        }

        <div className="mt-3">
          <ReactionButtons />
        </div>




        <div className="pb-20"></div>
      </div >

      <ReactionDisplay />
      <Confetti active={room.phase === 'results' || room.phase === 'final'} />


    </motion.div >
  );
}

