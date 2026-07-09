import { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
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
import { VotingOverlay } from '@/components/VotingOverlay';
import { useGame } from '@/lib/gameContext';
import { categories, type Category, type RoundAnswers } from '@shared/schema';
import { AlertTriangle, Send, User, Users, Globe, PawPrint, Box, LogOut, Zap, Eye, Trophy, Flame, Sparkles, Crown, Skull, Pyramid, Gavel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playCountdownSound, playCountdownFinalSound, playRoundStart, playBusSound, playFreezeSound, playWildcardSound, playBanishSound, playSubmitSound, playClickSound, playRushActivateSound } from '@/lib/sounds';
import { RetroCard } from '@/components/ui/RetroCard';
import { cn } from '@/lib/utils';
import { categoryGradients } from '@/lib/designTokens';

const categoryIcons: Record<Category, any> = {
  'ولد': User,
  'بنت': Users,
  'بلد': Globe,
  'حيوان': PawPrint,
  'جماد': Box,
};

// Slot Machine Letter Scramble Component
function SlotMachineLetter({ targetLetter, isRolling }: { targetLetter: string, isRolling: boolean }) {
  const [displayLetter, setDisplayLetter] = useState(targetLetter);
  const alphabet = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";

  useEffect(() => {
    if (!isRolling) {
      setDisplayLetter(targetLetter);
      return;
    }

    const interval = setInterval(() => {
      const randomChar = alphabet[Math.floor(Math.random() * alphabet.length)];
      setDisplayLetter(randomChar);
    }, 50); // Fast scramble

    return () => clearInterval(interval);
  }, [isRolling, targetLetter]);

  return (
    <span className={`text-7xl font-pixel-title text-white drop-shadow-lg ${isRolling ? 'slot-machine-text text-[#FFA168]' : 'slot-machine-land'}`}>
      {displayLetter}
    </span>
  );
}

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
    setTimerPaused,
  } = useGame();

  const isMobile = useIsMobile();

  if (!state.room) return null;
  const room = state.room;
  const currentCategories = (room.settings?.customCategories && room.settings.customCategories.length > 0)
    ? room.settings.customCategories
    : categories;

  const [answers, setAnswers] = useState<RoundAnswers>(() => {
    const initial: RoundAnswers = {};
    currentCategories.forEach(c => initial[c] = '');
    return initial;
  });

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showCountdown, setShowCountdown] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [wildcardActive, setWildcardActive] = useState(false);
  const [busCompleteTriggered, setBusCompleteTriggered] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Debounced draft sync to server
  // BUG-2 FIX: Store last sent draft to avoid spamming the network with identical packets every second because timeLeft changed
  const lastSentDraftRef = useRef<string>('');

  useEffect(() => {
    // G1: Don't send drafts if banished or already submitted
    if (hasSubmitted || isBanished || state.timeLeft <= 0 || state.room?.phase !== 'playing') return;

    const timer = setTimeout(() => {
      // Only send if there's at least one non-empty answer
      const hasContent = Object.values(answers).some(a => a && a.trim().length > 0);
      if (hasContent) {
        const currentDraftString = JSON.stringify(answers);
        if (currentDraftString !== lastSentDraftRef.current) {
          sendDraftUpdate(answers);
          lastSentDraftRef.current = currentDraftString;
        }
      }
    }, 500); // 500ms debounce for better reliability

    return () => clearTimeout(timer);
  }, [answers, hasSubmitted, isBanished, state.timeLeft, state.room?.phase, sendDraftUpdate]);

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

    // BUG-1 FIX: If we join or reconnect late into a round, skip the forced countdown to save precious time
    if (state.timeLeft < 42 && state.room?.phase === 'playing') {
      setShowCountdown(false);
      setCountdown(0);
    } else {
      setShowCountdown(true);
      setCountdown(3);
    }
    setBusCompleteTriggered(false);
  }, [room.currentRound]);

  useEffect(() => {
    setTimerPaused(showCountdown);
  }, [showCountdown, setTimerPaused]);

  useEffect(() => {
    if (showCountdown && countdown > 0) {
      playCountdownSound();
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && showCountdown) {
      playCountdownFinalSound();
      const hideTimer = setTimeout(() => {
        setShowCountdown(false);
        playRoundStart();
        inputRefs.current[currentCategories[0]]?.focus();
      }, 500);
      return () => clearTimeout(hideTimer);
    }
  }, [countdown, showCountdown, currentCategories]);

  useEffect(() => {
    if (state.isRush) {
      playRushActivateSound();
      playBusSound();
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

  const allFilled = currentCategories.length > 0 && currentCategories.every(cat => answers[cat] && answers[cat].trim().length > 0);
  const canBusComplete = allFilled;

  const roundDurationSec = currentRound
    ? Math.max(1, Math.ceil((currentRound.endTime - currentRound.startTime) / 1000))
    : 45;
  const displayTimeLeft = showCountdown ? roundDurationSec : state.timeLeft;

  const handleBusComplete = () => {
    if (!hasSubmitted) {
      if (!allFilled) return;

      playClickSound();
      setBusCompleteTriggered(true);
      handleSubmit();
      setTimeout(() => triggerBusComplete(), 50);
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

  // Auto-submit when time runs out (not during countdown or AI processing)
  useEffect(() => {
    if (showCountdown || room.phase === 'ai_processing') return;
    if (state.timeLeft <= 1 && !hasSubmitted) {
      handleSubmit();
    }
  }, [state.timeLeft, hasSubmitted, showCountdown, room.phase]);



  return (
    <motion.div
      className={`min-h-screen text-white p-4 font-pixel-text relative overflow-x-hidden md:flex md:items-center`}
      initial={isMobile ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
    >


      <AnimatePresence>
        {room.phase === 'ai_processing' && (
          <motion.div
            className="fixed inset-0 z-50 bg-[#0f0a1f] flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex gap-2 mb-6"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
            >
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full bg-[#6714A8] ai-review-dot"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </motion.div>
            <motion.p
              className="font-pixel-title text-xl text-[#FFFDD1]"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              جاري مراجعة الإجابات...
            </motion.p>
          </motion.div>
        )}
        {showCountdown && (
          <motion.div
            className="fixed inset-0 z-50 bg-[#0f0a1f] flex flex-col items-center justify-center"
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
                className="w-40 h-40 bg-[#6714A8] rounded-sm flex items-center justify-center mx-auto mb-8 shadow-[6px_6px_0_0_#350D7A] border-4 border-[#350D7A] overflow-hidden"
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <SlotMachineLetter targetLetter={letter} isRolling={countdown > 1} />
              </motion.div>
              <motion.p className="text-4xl text-white mb-6 font-pixel-title">
                الجولة {room.currentRound + 1} / {room.totalRounds}
              </motion.p>
              <motion.div
                key={countdown}
                initial={{ scale: 2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="countdown-digit text-white [text-shadow:4px_4px_0_#350D7A]"
              >
                {countdown === 0 ? 'ابدأ!' : countdown}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`max-w-5xl mx-auto relative z-10 px-4 w-full ${showCountdown || room.phase === 'ai_processing' ? 'invisible' : ''}`}>
        {/* Mobile Header: Clean Standard Layout (Exit - Letter - Timer) */}
        <motion.div
          className="flex flex-col gap-2 mb-4 relative z-[100] md:hidden"
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
              <Timer timeLeft={displayTimeLeft} isRush={state.isRush} maxTime={roundDurationSec} />
            </div>
          </div>

          {/* Mobile Bottom Row: PowerUps - Round Badge */}
          <div className="flex items-center justify-between px-2 mt-4">
            <PowerUpMenu />

            <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20">
              <span className="font-pixel-text font-bold text-sm text-amber-300">
                الجولة {room.currentRound + 1} / {room.totalRounds}
              </span>
            </div>
          </div>
        </motion.div>



        {/* Desktop Header - Unchanged */}
        <motion.div
          className="hidden md:flex items-center justify-between mb-6 relative z-[40]"
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

            <div className="px-4 py-1.5 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-pixel-text font-bold text-[#FFFDD1]">الجولة {room.currentRound + 1} / {room.totalRounds}</span>
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
              <Timer timeLeft={displayTimeLeft} isRush={state.isRush} maxTime={roundDurationSec} />
              {currentPlayer?.busStreak && currentPlayer.busStreak > 0 ? (
                <div className="flex items-center gap-1 bg-[#FF8A50] px-2 py-0.5 rounded-sm border-2 border-[#350D7A] text-[#350D7A] font-bold text-[9px] md:text-xs shadow-pixel-sm">
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
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#350D7A] text-[#FFFEE2] px-6 py-3 rounded-sm shadow-pixel flex items-center gap-3 border-[3px] border-[#F640A8]"
            >
              <div className="bg-[#FFFEE2]/20 p-2 rounded-sm">
                {activePowerUpNotification.type === 'wildcard' && <Sparkles className="w-6 h-6 animate-spin" />}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl font-pixel-text">{activePowerUpNotification.playerName}</span>
                <span className="text-lg opacity-90 font-pixel-text">
                  {activePowerUpNotification.type === 'wildcard' ? 'استخدم الجوكر!' : 'استخدم مساعدة!'}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <WildcardNotification
          show={!!currentRound?.activePowerUp && currentRound.activePowerUp.type === 'wildcard' && currentRound.activePowerUp.playerId !== currentPlayer?.id}
          playerName={currentRound?.activePowerUp?.playerName}
        />

        <WildcardOverlay isActive={wildcardActive} playerName={currentPlayer?.name} message="إجابات صحيحة!" />

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

        <VotingOverlay />


        {state.isRush && !hasSubmitted && (
          <div className="mb-3 mx-auto max-w-md bg-[#FF6957] text-[#350D7A] text-center py-2 px-4 rounded-sm border-[3px] border-[#350D7A] font-bold text-xs md:text-sm shadow-pixel-sm">
            <Flame className="w-3.5 h-3.5 inline ml-1" />
            وضع السرعة
          </div>
        )}

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
                    "surface-card overflow-hidden transition-all duration-200",
                    isLastOdd && "w-[calc(50%-6px)] md:w-full"
                  )}>
                    <div className={`${categoryGradients[category as Category]} py-2 px-2 flex items-center justify-center gap-1.5`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                      <span className="font-bold text-white font-pixel-text text-xs md:text-sm whitespace-nowrap">{category}</span>
                    </div>
                    <div className="p-2 bg-[#FFFEE5]">
                      <Input
                        ref={(el) => { inputRefs.current[category as Category] = el; }}
                        type="text"
                        value={answers[category as Category]}
                        onChange={(e) => updateAnswer(category as Category, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(category as Category, e)}
                        disabled={hasSubmitted || isBanished}
                        placeholder="..."
                        onFocus={(e) => {
                          if (isMobile) {
                            setTimeout(() => {
                              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 300);
                          }
                        }}
                        className={`text-center text-sm md:text-lg h-9 md:h-12 border-purple-200/50 focus:border-purple-400 bg-white text-[#350D7A] placeholder:text-purple-300 rounded-lg ${hasSubmitted || isBanished ? 'opacity-60 grayscale' : ''} ${answers[category as Category]?.trim().length > 0 ? 'input-locked scale-100' : ''}`}
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center p-6 mt-6 surface-card"
            >
              <div className="w-14 h-14 bg-[#6714A8] rounded-full flex items-center justify-center mx-auto mb-3">
                <Send className="w-7 h-7 text-white" />
              </div>
              <p className="font-pixel-text text-xl text-[#350D7A] mb-1 font-bold">تم!</p>
              <motion.p className="text-lg text-[#6714A8] font-bold font-pixel-text"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                في الانتظار...
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



    </motion.div >
  );
}

