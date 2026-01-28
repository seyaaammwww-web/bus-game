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
  'ولد': 'bg-blue-500',
  'بنت': 'bg-pink-500',
  'بلد': 'bg-green-500',
  'حيوان': 'bg-amber-500',
  'جماد': 'bg-purple-500',
};

const rankColors = ['from-yellow-400 to-yellow-600', 'from-gray-300 to-gray-500', 'from-amber-500 to-amber-700'];
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
      <Confetti active={isFinal} />

      <div className="max-w-md mx-auto relative z-10">
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
          <span className="text-[12px] text-white/80 font-pixel-text tracking-tight animate-pulse">BY MOHAMED SEYAM</span>
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
                <div className="w-28 h-28 bg-[#2C0834] rounded-3xl flex items-center justify-center shadow-2xl border-4 border-[#FFFDD1]">
                  <Trophy className="w-14 h-14 text-[#FFFDD1]" />
                </div>
                <motion.div
                  className="absolute -top-3 -right-3 w-10 h-10 bg-[#FFFDD1] rounded-full flex items-center justify-center shadow-lg border-2 border-[#2C0834]"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Crown className="w-5 h-5 text-[#2C0834]" />
                </motion.div>
              </motion.div>
              <motion.h1
                className="text-4xl font-pixel-title mb-3 text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
              >
                الفائز!
              </motion.h1>
              <motion.p
                className="text-3xl font-pixel-text font-bold text-[#FFFDD1]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {winner.name}
              </motion.p>
              <motion.p
                className="text-xl text-white/80 mt-2 font-pixel-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                {winner.score} نقطة
              </motion.p>
            </>
          ) : (
            <>
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Sparkles className="w-5 h-5 text-white" />
                <span className="font-bold text-white font-pixel-text">نتائج الجولة {room.currentRound + 1}</span>
              </motion.div>
              <h1 className="text-2xl font-pixel-title mb-2 text-white">حرف: {currentRound?.letter}</h1>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <RetroCard className="mb-6">
            <div className="flex items-center gap-2 mb-4 font-pixel-title text-[#31093A]">
              <Trophy className="w-5 h-4 text-orange-500" />
              الترتيب
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {sortedPlayers.map((player, index) => {
                  const RankIcon = rankIcons[index] || Star;
                  const isReferee = player.id === room.refereeId;
                  return (
                    <motion.div
                      key={player.id}
                      className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-all ${player.id === state.playerId
                        ? 'bg-[#31093A]/10 border-[#31093A]/30'
                        : 'bg-white/50 border-transparent'
                        } font-pixel-text`}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      {index < 3 ? (
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${rankColors[index]} flex items-center justify-center text-white shadow-md`}>
                          <RankIcon className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#31093A]/10 flex items-center justify-center text-[#31093A]/50 font-bold text-lg">
                          {index + 1}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base text-[#31093A]">{player.name}</p>
                          {player.isHost && <Crown className="w-3 h-3 text-orange-500" />}
                          {isReferee && <Shield className="w-3 h-3 text-accent" />}
                        </div>
                      </div>
                      <span className="text-xl font-bold text-[#31093A]">{player.score}</span>
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
              <div className="flex items-center gap-2 mb-4 font-pixel-title text-[#31093A]">
                <Award className="w-5 h-4 text-accent" />
                إحصائيات المباراة
              </div>
              <div className="space-y-2">
                {gameStats.fastestPlayer && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-[#31093A]/5">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <div className="flex-1">
                      <p className="text-[10px] text-[#31093A]/60">الأسرع</p>
                      <p className="font-bold text-sm text-[#31093A]">{gameStats.fastestPlayer.name}</p>
                    </div>
                    <span className="text-[10px] bg-[#31093A]/10 px-2 py-1 rounded-full text-[#31093A]">{gameStats.fastestPlayer.fastSubmissions} مرة</span>
                  </div>
                )}
                {gameStats.mostUnique && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-[#31093A]/5">
                    <Star className="w-4 h-4 text-purple-500" />
                    <div className="flex-1">
                      <p className="text-[10px] text-[#31093A]/60">الأكثر إبداعاً</p>
                      <p className="font-bold text-sm text-[#31093A]">{gameStats.mostUnique.name}</p>
                    </div>
                    <span className="text-[10px] bg-[#31093A]/10 px-2 py-1 rounded-full text-[#31093A]">{gameStats.mostUnique.uniqueAnswers} فريدة</span>
                  </div>
                )}
                {gameStats.busChampion && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <span className="text-lg">🚌</span>
                    <div className="flex-1">
                      <p className="text-[10px] text-orange-600">بطل الباص!</p>
                      <p className="font-bold text-sm text-[#31093A]">{gameStats.busChampion.name}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold text-orange-600">+10 بونص!</p>
                      <p className="text-[8px] text-[#31093A]/50">{gameStats.busChampion.busStreak} متتالية</p>
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
              <div className="font-pixel-title text-[#31093A] mb-4">الإجابات</div>
              <div className="space-y-4">
                {categories.map((category, catIndex) => {
                  const Icon = categoryIcons[category];
                  const categorySubmissions = currentRound.submissions.map(s => ({
                    playerId: s.playerId,
                    playerName: s.playerName,
                    answer: s.answers[category],
                  })).filter(a => a.answer && a.answer.trim());
                  return (
                    <div key={category} className="border rounded-xl bg-white/50 overflow-hidden border-[#31093A]/10 font-pixel-text">
                      <div className={`flex items-center gap-2 p-3 ${categoryColors[category]} bg-opacity-20`}>
                        <Icon className="w-4 h-4 text-[#31093A]" />
                        <span className="font-bold text-sm text-[#31093A]">{category}</span>
                      </div>
                      <div className="p-0 overflow-x-auto">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b bg-[#31093A]/5">
                              <th className="p-2 text-right text-[#31093A]/50">اللاعب</th>
                              <th className="p-2 text-right text-[#31093A]/50">الكلمة</th>
                              <th className="p-2 text-right text-[#31093A]/50">النتيجة</th>
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
                                  <td className="p-2 text-[#31093A]">{s.playerName} {isMe && "(أنت)"}</td>
                                  <td className="p-2 font-bold text-[#31093A]">{s.answer}</td>
                                  <td className="p-2">
                                    <div className="flex items-center gap-1">
                                      <span className={`font-bold ${isValid ? 'text-green-600' : 'text-red-500'}`}>{isValid ? `+${score}` : '❌'}</span>
                                      {isReferee && (
                                        <button onClick={() => refereeToggleUnique(s.playerId, category)} className="p-1"><Star className={`w-3 h-3 ${validation?.isUnique ? 'fill-orange-400 text-orange-400' : ''}`} /></button>
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
            <div className="w-full h-14 bg-white/10 rounded-xl flex items-center justify-center gap-3 border-2 border-white/20 font-pixel-text">
              <span className="text-sm">الجولة التالية في</span>
              <motion.span
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-8 h-8 bg-white text-[#2C0834] rounded-full flex items-center justify-center font-bold"
              >
                {countdown}
              </motion.span>
            </div>
          )}

          <Button
            size="lg"
            variant="default"
            className="w-full h-16 text-xl font-bold font-pixel-title"
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
    </div>
  );
}
