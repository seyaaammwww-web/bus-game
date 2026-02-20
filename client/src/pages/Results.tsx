import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, RotateCcw, User, Users, Globe, PawPrint, Box, Crown, Star, Sparkles, Medal, Shield, LogOut, Home, Zap, Award, Target, Timer, Plus, UserX, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/Confetti';
import { useGame } from '@/lib/gameContext';
import { categories, type Category } from '@shared/schema';
import { playCorrect, playBonus, playWinnerFanfare, playCountdownTick } from '@/lib/sounds';
import { RetroCard } from '@/components/ui/RetroCard';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { PixelReveal } from '@/components/ui/PixelReveal';
import { useIsMobile } from '@/hooks/useIsMobile';
import { RetroQuote } from '@/components/ui/RetroQuote';
import { LetterDisplay } from '@/components/LetterDisplay';
import { VotingOverlay } from '@/components/VotingOverlay';
import { RefereeReviewOverlay } from '@/components/RefereeReviewOverlay';
import { GameStats } from '@/components/results/GameStats';
import { AppealDialog } from '@/components/results/AppealDialog';
import { ResultsTable } from '@/components/results/ResultsTable';

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

const rankColors = ['bg-gradient-to-br from-amber-300 to-yellow-500', 'bg-gradient-to-br from-slate-300 to-gray-400', 'bg-gradient-to-br from-orange-400 to-amber-600'];
const rankIcons = [Crown, Medal, Star];

export default function Results() {
  const { state, currentRound, isHost, nextRound, playAgain, disconnect, isReferee, refereeDeduct, refereeToggleUnique, refereeApprove, appealAnswer, requestVote } = useGame();
  const [countdown, setCountdown] = useState(5);
  const [appealDialog, setAppealDialog] = useState<{ playerId: string; category: string; word: string } | null>(null);

  const room = state.room!;
  const isFinal = room.phase === 'final';
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  useEffect(() => {
    if (isFinal && !state.error && room?.players.length) {
      setTimeout(() => {
        playWinnerFanfare();
      }, 500);
    }
  }, [isFinal, state.error, room?.players.length]);
  const winner = sortedPlayers[0];

  useEffect(() => {
    if (isFinal) {
      playCorrect();
      const bonusRecipients = Object.values(room.players || {}).filter((p: any) => (p.busStreak || 0) >= 3);
      if (bonusRecipients.length > 0) {
        setTimeout(() => playBonus(), 1500);
      }
    }
  }, [isFinal]);

  useEffect(() => {
    if (isFinal) return;
    if (room.nextRoundAt) {
      const remaining = Math.max(0, Math.ceil((room.nextRoundAt - Date.now()) / 1000));
      setCountdown(remaining);
    }
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        if (prev <= 4) playCountdownTick(); // Tick sounds for last 3 seconds
        else playCountdownTick();
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFinal, room.nextRoundAt]);

  const gameStats = useMemo(() => {
    if (!isFinal || room.rounds.length === 0) return null;
    const playerStats = new Map<string, any>();
    room.players.forEach(p => {
      playerStats.set(p.id, {
        id: p.id,
        name: p.name,
        uniqueAnswers: 0,
        fastSubmissions: 0,
        totalAnswers: 0,
        busStreak: p.busStreak || 0,
        gotBonus: (p.busStreak || 0) >= 3,
      });
    });
    room.rounds.forEach(round => {
      if (round.submissions.length === 0) return;
      const sortedByTime = [...round.submissions].sort((a, b) => a.submittedAt - b.submittedAt);
      if (sortedByTime[0]) {
        const fastest = playerStats.get(sortedByTime[0].playerId);
        if (fastest) fastest.fastSubmissions++;
      }
      round.validatedAnswers.forEach(answer => {
        const stats = playerStats.get(answer.playerId);
        if (stats) {
          if (answer.isUnique) stats.uniqueAnswers++;
          if (answer.isValid) stats.totalAnswers++;
        }
      });
    });
    const statsArray = Array.from(playerStats.values());
    const fastestPlayer = statsArray.sort((a, b) => b.fastSubmissions - a.fastSubmissions)[0];
    const mostUnique = [...statsArray].sort((a, b) => b.uniqueAnswers - a.uniqueAnswers)[0];
    const mostActive = [...statsArray].sort((a, b) => b.totalAnswers - a.totalAnswers)[0];
    const busChampion = [...statsArray].sort((a, b) => b.busStreak - a.busStreak)[0];
    const bonusRecipients = statsArray.filter(s => s.gotBonus);
    return {
      fastestPlayer: fastestPlayer?.fastSubmissions > 0 ? fastestPlayer : null,
      mostUnique: mostUnique?.uniqueAnswers > 0 ? mostUnique : null,
      mostActive: mostActive?.totalAnswers > 0 ? mostActive : null,
      busChampion: busChampion?.busStreak >= 3 ? busChampion : null,
      bonusRecipients,
    };
  }, [isFinal, room.rounds, room.players]);

  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen p-4 overflow-hidden relative text-white font-pixel-text">
      <Confetti active={isFinal} count={isMobile ? 30 : 80} />
      <VotingOverlay />
      <RefereeReviewOverlay />

      <div className="max-w-3xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="text-white hover:bg-white/10"
            data-testid="button-exit-results"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        <motion.div
          className="text-center mb-8"
          initial={isMobile ? { opacity: 0 } : { y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {isFinal ? (
            <>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 15 }}
                className="relative inline-block mb-6"
              >
                <div className="w-36 h-36 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.5)] border-4 border-white/30">
                  <Trophy className="w-20 h-20 text-white" />
                </div>
                <motion.div
                  className="absolute -top-4 -right-4 w-14 h-14 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg border-3 border-white"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Crown className="w-7 h-7 text-white" />
                </motion.div>
              </motion.div>

              <div className="p-6 bg-gradient-to-b from-white to-[#faf5ff] rounded-2xl border-[3px] border-[#4c1d95] shadow-[4px_4px_0_0_#2e1065,_0_0_30px_rgba(139,92,246,0.15)] mb-4">
                <motion.h1
                  className="text-5xl font-pixel-title mb-4 text-[#4c1d95] font-bold"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                >
                  الفائز! 👑
                </motion.h1>
                <div className="flex justify-center mb-4">
                  <PixelAvatar src={winner.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${winner.id}`} size="lg" />
                </div>
                <motion.p
                  className="text-4xl font-pixel-text font-bold text-[#4c1d95]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {winner.name}
                </motion.p>
                <motion.p
                  className="text-2xl text-[#7c3aed] mt-3 font-pixel-text font-bold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {winner.score} نقطة
                </motion.p>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-6">
                <LetterDisplay
                  letter={currentRound?.letter || '?'}
                  round={room.currentRound + 1}
                  totalRounds={room.totalRounds}
                />
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <RetroCard className="mb-4">
            <div className="flex items-center gap-2 mb-3 font-pixel-title text-[#4c1d95] text-base">
              <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              الترتيب
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {sortedPlayers.map((player, index) => {
                  const RankIcon = rankIcons[index] || Star;
                  const isReferee = player.id === room.refereeId;
                  return (
                    <motion.div
                      key={player.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border-[2px] ${player.id === state.playerId
                        ? 'bg-gradient-to-r from-[#7c3aed]/10 to-[#8b5cf6]/10 border-[#7c3aed]'
                        : 'bg-white/80 border-[#4c1d95]/20'
                        } font-pixel-text text-sm`}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.05 * index }}
                    >
                      {index < 3 ? (
                        <div className={`w-8 h-8 rounded-lg ${rankColors[index]} flex items-center justify-center text-white border border-white/50`}>
                          <RankIcon className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#4c1d95]/10 flex items-center justify-center text-[#4c1d95] font-bold text-sm">
                          {index + 1}
                        </div>
                      )}

                      <PixelAvatar
                        src={player.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player.id}`}
                        className="w-8 h-8 border border-[#4c1d95]/30"
                        size="sm"
                      />

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[#4c1d95] font-pixel-text truncate">
                          {player.name}
                          {player.isHost && <Crown className="w-3 h-3 text-amber-500 inline mr-1" />}
                          {isReferee && <Shield className="w-3 h-3 text-[#7c3aed] inline mr-1" />}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-[#4c1d95] font-pixel-title">{player.score}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </RetroCard>
        </motion.div>

        {isFinal && gameStats && (
          <GameStats gameStats={gameStats} />
        )}

        {/* End Game Button for Final Screen */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            onClick={disconnect}
            size="lg"
            className="w-full h-16 text-xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] hover:from-[#6d28d9] hover:to-[#7c3aed] text-white shadow-[4px_4px_0_0_#2e1065] border-[3px] border-[#4c1d95] font-pixel-title"
            data-testid="button-end-game"
          >
            <Home className="w-6 h-6 ml-2" />
            العودة للرئيسية
          </Button>
        </motion.div>


        {!isFinal && currentRound && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-[#4c1d95] text-[#FFFDD1] px-4 py-3 border-b-4 border-[#2e1065] rounded-t-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <span className="font-pixel-title text-lg tracking-wide">نتائج الجولة</span>
              </div>
            </div>

            <div className="bg-[#f3e8ff] p-4 rounded-b-lg border-x-4 border-b-4 border-[#4c1d95]">
              <ResultsTable
                round={currentRound}
                players={room.players}
                currentPlayerId={state.playerId!}
                isReferee={isReferee}
                onRefereeToggle={refereeToggleUnique}
                onRefereeDeduct={(pid, cat) => refereeDeduct(pid, cat, 'رفض الحكم')}
                onAppeal={(pid, cat, ans) => setAppealDialog({ playerId: pid, category: cat, word: ans })}
              />

              {/* Scoreboard TV with Scanline & Live Ticker */}
              <div className="relative h-14 bg-[#1a0533] mt-6 overflow-hidden rounded-xl border-2 border-[#4c1d95] shadow-inner">
                {/* Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-10" />

                {/* Glowing Overlay */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(124,58,237,0.3)] z-10" />

                <div className="overflow-hidden h-10 mt-2">
                  {/* Live Ticker */}
                  <motion.div
                    className="flex whitespace-nowrap gap-8 text-sm text-white"
                    animate={{ x: [0, -50 * sortedPlayers.length] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
                  >
                    {[...sortedPlayers, ...sortedPlayers].map((p, i) => (
                      <span key={`${p.id}-${i}`} className="font-pixel-text text-[#fbbf24]">
                        {p.name} • {p.score} نقطة
                        <Star className="inline w-3 h-3 text-[#7c3aed] ml-4 mr-1" />
                      </span>
                    ))}
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          className="space-y-3"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {!isFinal && (
            <>
              {/* Case 1: Countdown Running (Approved or Auto) */}
              {room.nextRoundAt ? (
                <div className="w-full h-20 bg-gradient-to-r from-[#7c3aed]/20 to-[#8b5cf6]/20 rounded-2xl flex items-center justify-center gap-5 border-[3px] border-[#4c1d95] shadow-[3px_3px_0_0_#2e1065] font-pixel-text text-xl font-bold">
                  <span className="text-white text-xl">الجولة التالية في</span>
                  <motion.span
                    key={countdown}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-14 h-14 bg-gradient-to-br from-white to-[#faf5ff] text-[#4c1d95] rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-[#4c1d95] font-pixel-title text-2xl"
                  >
                    {countdown}
                  </motion.span>
                </div>
              ) : (
                /* Case 2: Waiting for Referee (No Timer) */
                <div className="w-full p-4 bg-[#4c1d95]/80 rounded-2xl text-center border-[3px] border-[#FFFDD1] shadow-lg backdrop-blur-sm">
                  {isReferee ? (
                    <div className="space-y-2">
                      <p className="text-[#FFFDD1] font-bold font-pixel-text text-lg animate-pulse">
                        🕐 الوقت متوقف للمراجعة
                      </p>
                      <Button
                        onClick={() => room.phase === 'results' ? nextRound() : refereeApprove()}
                        size="lg"
                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] shadow-[4px_4px_0_0_#2e1065] border-[3px] border-[#4c1d95] font-pixel-title transition-all active:translate-y-1 active:shadow-none"
                      >
                        {room.phase === 'results' ? '➡️ بدء الجولة التالية' : '✅ اعتماد النتيجة وبدء الجولة'}
                      </Button>
                    </div>
                  ) : room.settings?.enableVoting && isHost ? (
                    // Host Control for Voting Mode
                    <div className="space-y-2">
                      <p className="text-[#FFFDD1] font-bold font-pixel-text text-lg">
                        🗳️ وضع التصويت مفعل
                      </p>
                      <Button
                        onClick={() => nextRound()}
                        size="lg"
                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] hover:from-[#6d28d9] hover:to-[#5b21b6] shadow-[4px_4px_0_0_#2e1065] border-[3px] border-[#4c1d95] font-pixel-title transition-all active:translate-y-1 active:shadow-none"
                        data-testid="button-next-round"
                      >
                        ➡️ الاستمرار للجولة التالية
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Timer className="w-8 h-8 text-[#FFFDD1] animate-spin-slow" />
                      <p className="text-[#FFFDD1] font-bold font-pixel-text text-xl">
                        {room.settings?.enableVoting ? 'في انتظار المضيف...' : 'في انتظار اعتماد الحكم...'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </motion.div>
        {/* Appeal Confirmation Dialog */}
        <AppealDialog
          isOpen={!!appealDialog}
          onClose={() => setAppealDialog(null)}
          onConfirm={() => {
            if (appealDialog) {
              if (room.settings?.enableVoting) {
                requestVote(appealDialog.playerId, appealDialog.category, appealDialog.word);
              } else {
                appealAnswer(appealDialog.playerId, appealDialog.category, appealDialog.word);
              }
              setAppealDialog(null);
            }
          }}
          itemName={appealDialog?.word}
          categoryName={appealDialog?.category}
          isVotingEnabled={room.settings?.enableVoting}
        />
      </div>
    </div>
  );
}

