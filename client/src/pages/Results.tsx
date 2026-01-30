import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, RotateCcw, User, Users, Globe, PawPrint, Box, Crown, Star, Sparkles, Medal, Shield, LogOut, Home, Zap, Award, Target, Timer, Plus, UserX, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/Confetti';
import { useGame } from '@/lib/gameContext';
import { categories, type Category } from '@shared/schema';
import { playSuccessSound, playCountdownSound, playBonusSound } from '@/lib/sounds';
import { RetroCard } from '@/components/ui/RetroCard';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { RetroQuote } from '@/components/ui/RetroQuote';
import { LetterDisplay } from '@/components/LetterDisplay';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const { state, currentRound, isHost, nextRound, playAgain, disconnect, isReferee, refereeDeduct, refereeToggleUnique, refereeApprove, appealAnswer } = useGame();
  const [countdown, setCountdown] = useState(5);
  const [appealDialog, setAppealDialog] = useState<{ playerId: string; category: string; word: string } | null>(null);

  const room = state.room!;
  const isFinal = room.phase === 'final';
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  useEffect(() => {
    if (isFinal) {
      playSuccessSound();
      const bonusRecipients = Object.values(room.players || {}).filter((p: any) => (p.busStreak || 0) >= 3);
      if (bonusRecipients.length > 0) {
        setTimeout(() => playBonusSound(), 1500);
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
        if (prev > 1) {
          playCountdownSound();
          return prev - 1;
        }
        return prev;
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

  return (
    <div className="min-h-screen p-4 overflow-hidden relative text-white font-pixel-text">
      <Confetti active={isFinal} />

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
          <span className="text-[12px] text-white font-pixel-text tracking-tight animate-pulse font-bold">BY MOHAMED SEYAM</span>
        </div>

        <motion.div
          className="text-center mb-8"
          initial={{ y: -30, opacity: 0 }}
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
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <RetroCard className="mb-6">
              <div className="flex items-center gap-3 mb-5 font-pixel-title text-[#4c1d95] text-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-md">
                  <Award className="w-5 h-5 text-white" />
                </div>
                إحصائيات المباراة
              </div>
              <div className="space-y-4">
                {gameStats.fastestPlayer && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-md">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base text-orange-600 font-bold font-pixel-text">الأسرع</p>
                      <p className="font-bold text-xl text-[#4c1d95] font-pixel-text">{gameStats.fastestPlayer.name}</p>
                    </div>
                    <span className="text-base bg-orange-500 text-white px-4 py-2 rounded-full font-pixel-text font-bold shadow-md">{gameStats.fastestPlayer.fastSubmissions} مرة</span>
                  </div>
                )}
                {gameStats.mostUnique && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-violet-50 border-2 border-purple-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#8b5cf6] rounded-xl flex items-center justify-center shadow-md">
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-base text-[#7c3aed] font-bold font-pixel-text">الأكثر إبداعاً</p>
                      <p className="font-bold text-xl text-[#4c1d95] font-pixel-text">{gameStats.mostUnique.name}</p>
                    </div>
                    <span className="text-base bg-[#7c3aed] text-white px-4 py-2 rounded-full font-pixel-text font-bold shadow-md">{gameStats.mostUnique.uniqueAnswers} فريدة</span>
                  </div>
                )}
                {gameStats.busChampion && (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md text-2xl">
                      🚌
                    </div>
                    <div className="flex-1">
                      <p className="text-base text-green-600 font-bold font-pixel-text">بطل الباص!</p>
                      <p className="font-bold text-xl text-[#4c1d95] font-pixel-text">{gameStats.busChampion.name}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-green-600 font-pixel-text">+10 بونص!</p>
                      <p className="text-sm text-[#4c1d95]/60 font-pixel-text">{gameStats.busChampion.busStreak} متتالية</p>
                    </div>
                  </div>
                )}
              </div>
            </RetroCard>

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
          </motion.div>
        )}

        {!isFinal && currentRound && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <RetroCard className="mb-4 p-0 overflow-hidden">
              {/* Retro Pixel Header */}
              <div className="bg-[#4c1d95] text-[#FFFDD1] px-4 py-3 border-b-4 border-[#2e1065]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  <span className="font-pixel-title text-lg tracking-wide">نتائج الجولة</span>
                </div>
              </div>

              {/* Pixel Style Category Bar */}
              <div className="bg-[#FFFDD1] border-b-4 border-[#4c1d95] p-2">
                <div className="flex justify-center gap-1">
                  {categories.map((cat) => {
                    const Icon = categoryIcons[cat];
                    return (
                      <div
                        key={cat}
                        className={`${categoryColors[cat]} px-2 py-1 border-2 border-[#2e1065] shadow-[2px_2px_0_0_#2e1065]`}
                      >
                        <div className="flex items-center gap-1 text-white">
                          <Icon className="w-3 h-3" />
                          <span className="text-[10px] font-bold">{cat}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Retro Results List */}
              <div className="bg-[#FFFEE5]">
                {currentRound.submissions.map((submission, playerIdx) => {
                  let totalRoundScore = 0;
                  categories.forEach((cat) => {
                    const validation = currentRound.validatedAnswers.find(
                      v => v.playerId === submission.playerId && v.category === cat
                    );
                    if (validation?.isValid) totalRoundScore += validation.score || 0;
                  });

                  const isCurrentPlayer = submission.playerId === state.playerId;

                  return (
                    <motion.div
                      key={submission.playerId}
                      className={`border-b-2 border-[#4c1d95]/30 ${isCurrentPlayer ? 'bg-[#e9d5ff]' : playerIdx % 2 === 0 ? 'bg-[#FFFEE5]' : 'bg-[#faf5ff]'}`}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.05 * playerIdx }}
                    >
                      {/* Player Name Row - Retro Style */}
                      <div className={`flex items-center justify-between px-3 py-2 border-b border-[#4c1d95]/20 ${isCurrentPlayer ? 'bg-[#7c3aed]/20' : ''}`}>
                        <div className="flex items-center gap-2">
                          {/* Pixel Number Badge */}
                          <div className="w-6 h-6 bg-[#4c1d95] border-2 border-[#2e1065] shadow-[1px_1px_0_0_#2e1065] flex items-center justify-center">
                            <span className="text-[#FFFDD1] text-xs font-bold">{playerIdx + 1}</span>
                          </div>
                          <span className={`font-bold text-sm ${isCurrentPlayer ? 'text-[#4c1d95]' : 'text-[#2e1065]'}`}>
                            {submission.playerName}
                            {isCurrentPlayer && <span className="mr-1 text-xs">⭐</span>}
                          </span>
                        </div>
                        {/* Score Badge - Pixel Style */}
                        <div className={`px-2 py-1 border-2 shadow-[2px_2px_0_0_#1a1a1a] font-bold text-xs ${totalRoundScore > 0
                          ? 'bg-[#22c55e] border-[#15803d] text-white'
                          : 'bg-[#d1d5db] border-[#9ca3af] text-[#6b7280]'
                          }`}>
                          +{totalRoundScore}
                        </div>
                      </div>

                      {/* Answers Row - Pixel Grid */}
                      <div className="grid grid-cols-5 gap-[2px] p-2 bg-[#2e1065]/10">
                        {categories.map((cat) => {
                          const answer = submission.answers[cat];
                          const validation = currentRound.validatedAnswers.find(
                            v => v.playerId === submission.playerId && v.category === cat
                          );
                          const isValid = validation?.isValid;
                          const score = validation?.score || 0;

                          return (
                            <div
                              key={cat}
                              onClick={() => {
                                if (isCurrentPlayer && !isValid && answer) {
                                  setAppealDialog({
                                    playerId: submission.playerId,
                                    category: cat,
                                    word: answer
                                  });
                                }
                              }}
                              className={`text-center p-1 border-2 shadow-[1px_1px_0_0_rgba(0,0,0,0.3)] transition-all ${isValid
                                ? 'bg-[#bbf7d0] border-[#22c55e]'
                                : answer
                                  ? isCurrentPlayer
                                    ? 'bg-[#fecaca] border-[#ef4444] cursor-pointer hover:scale-105 active:scale-95 hover:shadow-[2px_2px_0_0_#dc2626] relative group'
                                    : 'bg-[#fecaca] border-[#ef4444]'
                                  : 'bg-white border-[#d1d5db]'
                                }`}
                            >
                              {isCurrentPlayer && !isValid && answer && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-white z-10 flex items-center justify-center animate-pulse group-hover:block hidden">
                                  <span className="text-[8px] text-white">?</span>
                                </div>
                              )}
                              {answer ? (
                                <div className="space-y-0.5">
                                  <div className="text-[10px] font-bold text-[#2e1065] truncate leading-tight">{answer}</div>
                                  <div className={`text-[9px] font-bold ${isValid ? 'text-[#15803d]' : 'text-[#dc2626]'}`}>
                                    {isValid ? `+${score}` : '✗'}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-[#9ca3af]">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Retro Legend Bar */}
              <div className="bg-[#4c1d95] text-[#FFFDD1] px-3 py-2 flex items-center justify-center gap-4 text-[10px] font-bold border-t-4 border-[#2e1065]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-[#22c55e] border border-[#15803d]"></span>
                  صحيح
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-[#ef4444] border border-[#dc2626]"></span>
                  خطأ
                </span>
                <span className="text-[#a78bfa]">+20 فريد | +10 مكرر</span>
              </div>
            </RetroCard>
          </motion.div>
        )}

        <motion.div
          className="space-y-3"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {!isFinal && (
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
          )}
        </motion.div>

        {/* Referee Control */}
        {!isFinal && room.refereeId === state.playerId && (
          <Button
            onClick={() => refereeApprove()}
            size="lg"
            className="w-full h-16 mt-4 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-[4px_4px_0_0_#2e1065] border-[3px] border-[#2e1065] animate-pulse font-pixel-title"
          >
            اعتماد النتيجة ✅
          </Button>
        )}
        {/* Appeal Confirmation Dialog */}
        <AlertDialog open={!!appealDialog} onOpenChange={(open) => !open && setAppealDialog(null)}>
          <AlertDialogContent className="bg-[#FFFDD1] border-[4px] border-[#4c1d95] rounded-none shadow-[8px_8px_0_0_#2e1065]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-bold font-pixel-title text-[#4c1d95] flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-[#ef4444]" />
                ظلموني؟ 🤨
              </AlertDialogTitle>
              <AlertDialogDescription className="text-lg font-bold font-pixel-text text-[#7c3aed]">
                متأكد إن "{appealDialog?.word}" كلمة صحيحة في فئة "{appealDialog?.category}"؟
                <br />
                <span className="text-sm text-[#4c1d95]/70 block mt-2">
                  (الذكاء الاصطناعي هيراجعها تاني ولو طلعت صح هتاخد حقك!)
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3">
              <AlertDialogCancel
                className="bg-white border-2 border-[#4c1d95] text-[#4c1d95] font-bold font-pixel-text hover:bg-gray-100 rounded-none h-12"
              >
                خلاص مش متأكد
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (appealDialog) {
                    appealAnswer(appealDialog.playerId, appealDialog.category, appealDialog.word);
                    setAppealDialog(null);
                  }
                }}
                className="bg-white border-2 border-[#4c1d95] text-[#4c1d95] font-bold font-pixel-text hover:bg-[#f3e8ff] rounded-none h-12 shadow-[2px_2px_0_0_#2e1065]"
              >
                أيوه متأكد! 😤
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div >
  );
}

