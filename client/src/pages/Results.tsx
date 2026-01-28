import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, RotateCcw, User, Users, Globe, PawPrint, Box, Crown, Star, Sparkles, Medal, Shield, LogOut, Home, Zap, Award, Target, Timer, Plus, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/Confetti';
import { useGame } from '@/lib/gameContext';
import { categories, type Category } from '@shared/schema';
import { playSuccessSound, playCountdownSound, playBonusSound } from '@/lib/sounds';
import ArcadeBackground from '@/components/ArcadeBackground';
import { RetroCard } from '@/components/ui/RetroCard';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { RetroQuote } from '@/components/ui/RetroQuote';
import { FloatingShapes } from '@/components/ui/FloatingShapes';
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

const rankColors = ['bg-gradient-to-br from-[#FFE7A4] to-[#FFC48B]', 'bg-gradient-to-br from-[#E0DCF2] to-[#C0C0C0]', 'bg-gradient-to-br from-[#FF8A50] to-[#FFA168]'];
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
      <ArcadeBackground />
      <FloatingShapes />
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
          <span className="text-[12px] text-[#2C0834] font-pixel-text tracking-tight animate-pulse font-bold">BY MOHAMED SEYAM</span>
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
                <div className="w-32 h-32 bg-[#2C0834] rounded-3xl flex items-center justify-center shadow-2xl border-4 border-[#FFFDD1]">
                  <Trophy className="w-16 h-16 text-[#FFFDD1]" />
                </div>
                <motion.div
                  className="absolute -top-4 -right-4 w-12 h-12 bg-[#FFFDD1] rounded-full flex items-center justify-center shadow-lg border-2 border-[#2C0834]"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Crown className="w-6 h-6 text-[#2C0834]" />
                </motion.div>
              </motion.div>

              <RetroQuote variant="yellow" className="mb-4">
                <motion.h1
                  className="text-5xl font-pixel-title mb-4 text-[#31093A] font-bold"
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
                  className="text-4xl font-pixel-text font-bold text-[#31093A]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {winner.name}
                </motion.p>
                <motion.p
                  className="text-2xl text-[#31093A]/80 mt-3 font-pixel-text font-bold"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {winner.score} نقطة
                </motion.p>
              </RetroQuote>
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
          <RetroCard className="mb-6">
            <div className="flex items-center gap-2 mb-5 font-pixel-title text-[#31093A] text-lg">
              <Trophy className="w-6 h-6 text-orange-500" />
              الترتيب
            </div>
            <div className="space-y-4">
              <AnimatePresence>
                {sortedPlayers.map((player, index) => {
                  const RankIcon = rankIcons[index] || Star;
                  const isReferee = player.id === room.refereeId;
                  return (
                    <motion.div
                      key={player.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${player.id === state.playerId
                        ? 'bg-[#31093A]/10 border-[#31093A]/30'
                        : 'bg-white/50 border-transparent'
                        } font-pixel-text text-lg`}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      {index < 3 ? (
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${rankColors[index]} flex items-center justify-center text-white shadow-md`}>
                          <RankIcon className="w-6 h-6" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#31093A]/10 flex items-center justify-center text-[#31093A] font-bold text-xl">
                          {index + 1}
                        </div>
                      )}

                      <PixelAvatar
                        src={player.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player.id}`}
                        className="w-12 h-12 border-2"
                        size="sm"
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg text-[#31093A] font-pixel-text">{player.name}</p>
                          {player.isHost && <Crown className="w-4 h-4 text-orange-500" />}
                          {isReferee && <Shield className="w-4 h-4 text-accent" />}
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-[#31093A] font-pixel-text">{player.score}</span>
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
              <div className="flex items-center gap-2 mb-5 font-pixel-title text-[#31093A] text-lg">
                <Award className="w-6 h-6 text-accent" />
                إحصائيات المباراة
              </div>
              <div className="space-y-3">
                {gameStats.fastestPlayer && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#31093A]/5">
                    <Zap className="w-5 h-5 text-orange-500" />
                    <div className="flex-1">
                      <p className="text-sm text-[#31093A]/80 font-bold font-pixel-text">الأسرع</p>
                      <p className="font-bold text-lg text-[#31093A] font-pixel-text">{gameStats.fastestPlayer.name}</p>
                    </div>
                    <span className="text-sm bg-[#31093A]/10 px-3 py-1 rounded-full text-[#31093A] font-pixel-text font-bold">{gameStats.fastestPlayer.fastSubmissions} مرة</span>
                  </div>
                )}
                {gameStats.mostUnique && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-[#31093A]/5">
                    <Star className="w-5 h-5 text-purple-500" />
                    <div className="flex-1">
                      <p className="text-sm text-[#31093A]/80 font-bold font-pixel-text">الأكثر إبداعاً</p>
                      <p className="font-bold text-lg text-[#31093A] font-pixel-text">{gameStats.mostUnique.name}</p>
                    </div>
                    <span className="text-sm bg-[#31093A]/10 px-3 py-1 rounded-full text-[#31093A] font-pixel-text font-bold">{gameStats.mostUnique.uniqueAnswers} فريدة</span>
                  </div>
                )}
                {gameStats.busChampion && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <span className="text-2xl">🚌</span>
                    <div className="flex-1">
                      <p className="text-sm text-orange-600 font-pixel-text font-bold">بطل الباص!</p>
                      <p className="font-bold text-lg text-[#31093A] font-pixel-text">{gameStats.busChampion.name}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-orange-600 font-pixel-text">+10 بونص!</p>
                      <p className="text-xs text-[#31093A]/50 font-pixel-text">{gameStats.busChampion.busStreak} متتالية</p>
                    </div>
                  </div>
                )}
              </div>
            </RetroCard>
          </motion.div>
        )}

        {!isFinal && currentRound && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <RetroCard className="mb-6">
              <div className="font-pixel-title text-[#31093A] mb-5 text-lg font-bold">الإجابات</div>
              <div className="space-y-5">
                {categories.map((category, catIndex) => {
                  const Icon = categoryIcons[category];
                  const categorySubmissions = currentRound.submissions.map(s => ({
                    playerId: s.playerId,
                    playerName: s.playerName,
                    answer: s.answers[category],
                  })).filter(a => a.answer && a.answer.trim());
                  return (
                    <div key={category} className="border rounded-xl bg-white/50 overflow-hidden border-[#31093A]/10 font-pixel-text">
                      <div className={`flex items-center gap-2 p-4 ${categoryColors[category]} bg-opacity-20`}>
                        <Icon className="w-5 h-5 text-[#31093A]" />
                        <span className="font-bold text-lg text-[#31093A] font-pixel-text">{category}</span>
                      </div>
                      <div className="p-0 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-[#31093A]/5">
                              <th className="p-3 text-right text-[#31093A]/80 font-bold font-pixel-text">اللاعب</th>
                              <th className="p-3 text-right text-[#31093A]/80 font-bold font-pixel-text">الكلمة</th>
                              <th className="p-3 text-right text-[#31093A]/80 font-bold font-pixel-text">النتيجة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categorySubmissions.map((s, idx) => {
                              const validation = currentRound.validatedAnswers.find(v => v.playerId === s.playerId && v.category === category);
                              const isValid = validation?.isValid;
                              const score = validation?.score || 0;
                              const isMe = s.playerId === state.playerId;
                              return (
                                <tr key={idx} className={`border-b border-[#31093A]/5 last:border-0 ${isValid ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                                  <td className="p-3 text-[#31093A] font-pixel-text">{s.playerName} {isMe && "(أنت)"}</td>
                                  <td className="p-3 font-bold text-[#31093A] font-pixel-text">{s.answer}</td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold text-lg ${isValid ? 'text-green-600' : 'text-red-500'} font-pixel-text`}>{isValid ? `+${score}` : '❌'}</span>
                                      {isReferee && (
                                        <button onClick={() => refereeToggleUnique(s.playerId, category)} className="p-1"><Star className={`w-4 h-4 ${validation?.isUnique ? 'fill-orange-400 text-orange-400' : ''}`} /></button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
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
            <div className="w-full h-16 bg-white/10 rounded-xl flex items-center justify-center gap-4 border-2 border-white/20 font-pixel-text text-lg font-bold">
              <span className="text-lg">الجولة التالية في</span>
              <motion.span
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-10 h-10 bg-white text-[#2C0834] rounded-full flex items-center justify-center font-bold shadow-md font-pixel-title text-xl"
              >
                {countdown}
              </motion.span>
            </div>
          )}

          <Button
            size="lg"
            variant="default"
            className="w-full h-16 text-2xl font-bold font-pixel-title"
            onClick={playAgain}
            data-testid="button-play-again"
          >
            <RotateCcw className="w-6 h-6 ml-2" />
            العب تاني!
          </Button>
        </motion.div>

        {/* Referee Control */}
        {!isFinal && room.refereeId === state.playerId && (
          <Button
            onClick={() => refereeApprove()}
            size="lg"
            className="w-full h-16 mt-4 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-[4px_4px_0_0_#2C0834] border-[3px] border-[#2C0834] animate-pulse font-pixel-title"
          >
            اعتماد النتيجة ✅
          </Button>
        )}
      </div>
    </div >
  );
}
