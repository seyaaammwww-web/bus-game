import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, RotateCcw, User, Users, Globe, PawPrint, Box, Crown, Star, Sparkles, Medal, Shield, LogOut, Home, Zap, Award, Target, Timer, Plus, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Confetti } from '@/components/Confetti';
import { useGame } from '@/lib/gameContext';
import { categories, type Category } from '@shared/schema';
import { playSuccessSound, playCountdownSound, playBonusSound } from '@/lib/sounds';
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
      // Play bonus sound if there are bonus recipients
      const bonusRecipients = Object.values(room.players || {}).filter((p: any) => (p.busStreak || 0) >= 3);
      if (bonusRecipients.length > 0) {
        setTimeout(() => playBonusSound(), 1500);
      }
    }
  }, [isFinal]);

  // Countdown timer for next round
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

    const playerStats = new Map<string, {
      id: string;
      name: string;
      uniqueAnswers: number;
      fastSubmissions: number;
      totalAnswers: number;
      busStreak: number;
      gotBonus: boolean;
    }>();

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
    <div className="min-h-screen bg-gradient-to-b from-yellow-500/10 via-background to-primary/10 p-4 overflow-hidden">
      <Confetti active={isFinal} />

      <div className="max-w-md mx-auto relative">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="text-destructive hover:bg-destructive/10"
            data-testid="button-exit-results"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <span className="text-xs text-muted-foreground/60">BY MOHAMED SEYAM</span>
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
                <motion.div
                  className="w-28 h-28 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-3xl flex items-center justify-center shadow-2xl"
                  animate={{
                    boxShadow: [
                      '0 0 30px rgba(234, 179, 8, 0.5)',
                      '0 0 60px rgba(234, 179, 8, 0.8)',
                      '0 0 30px rgba(234, 179, 8, 0.5)',
                    ]
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Trophy className="w-14 h-14 text-white" />
                </motion.div>
                <motion.div
                  className="absolute -top-3 -right-3 w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-lg"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Crown className="w-5 h-5 text-white" />
                </motion.div>
              </motion.div>
              <motion.h1
                className="text-4xl font-bold mb-3"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
              >
                الفائز!
              </motion.h1>
              <motion.p
                className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {winner.name}
              </motion.p>
              <motion.p
                className="text-xl text-muted-foreground mt-2"
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="font-bold text-primary">نتائج الجولة {room.currentRound + 1}</span>
              </motion.div>
              <h1 className="text-2xl font-bold mb-2">حرف: {currentRound?.letter}</h1>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6 border-2 shadow-xl overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-secondary/10">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                الترتيب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <AnimatePresence>
                {sortedPlayers.map((player, index) => {
                  const RankIcon = rankIcons[index] || Star;
                  const isReferee = player.id === room.refereeId;

                  return (
                    <motion.div
                      key={player.id}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${player.id === state.playerId
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-muted/30 border-transparent'
                        }`}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * index, type: 'spring' }}
                      whileHover={{ scale: 1.02 }}
                    >
                      {index < 3 ? (
                        <motion.div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${rankColors[index]} flex items-center justify-center text-white shadow-lg`}
                          animate={index === 0 ? {
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          } : {}}
                          transition={{ repeat: Infinity, duration: 2 }}
                        >
                          <RankIcon className="w-6 h-6" />
                        </motion.div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-bold text-xl">
                          {index + 1}
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg">{player.name}</p>
                          {player.isHost && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                          {isReferee && (
                            <Shield className="w-4 h-4 text-accent" />
                          )}
                          {player.id === state.playerId && (
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">أنت</span>
                          )}
                        </div>
                      </div>

                      <motion.span
                        className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + 0.1 * index, type: 'spring' }}
                      >
                        {player.score}
                      </motion.span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {isFinal && gameStats && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="mb-6 border-2 shadow-xl overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-r from-accent/10 to-secondary/10">
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-accent" />
                  إحصائيات المباراة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {gameStats.fastestPlayer && (
                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">الأسرع</p>
                      <p className="font-bold">{gameStats.fastestPlayer.name}</p>
                    </div>
                    <span className="text-sm bg-yellow-500/20 px-2 py-1 rounded-full">
                      {gameStats.fastestPlayer.fastSubmissions} مرة
                    </span>
                  </motion.div>
                )}

                {gameStats.mostUnique && (
                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                      <Star className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">الأكثر إبداعاً</p>
                      <p className="font-bold">{gameStats.mostUnique.name}</p>
                    </div>
                    <span className="text-sm bg-purple-500/20 px-2 py-1 rounded-full">
                      {gameStats.mostUnique.uniqueAnswers} فريدة
                    </span>
                  </motion.div>
                )}

                {gameStats.mostActive && (
                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">الأكثر نشاطاً</p>
                      <p className="font-bold">{gameStats.mostActive.name}</p>
                    </div>
                    <span className="text-sm bg-green-500/20 px-2 py-1 rounded-full">
                      {gameStats.mostActive.totalAnswers} صحيحة
                    </span>
                  </motion.div>
                )}

                {/* Bus Streak Champion - NEW! */}
                {gameStats.busChampion && (
                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-500/40"
                    initial={{ x: -20, opacity: 0, scale: 0.9 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
                  >
                    <motion.div
                      className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg"
                      animate={{
                        rotate: [0, -10, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <span className="text-2xl">🚌</span>
                    </motion.div>
                    <div className="flex-1">
                      <p className="text-sm text-amber-600 font-medium">بطل الباص! 🏆</p>
                      <p className="font-bold text-lg">{gameStats.busChampion.name}</p>
                    </div>
                    <div className="text-left">
                      <motion.span
                        className="block text-lg font-bold text-amber-600"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        +10 بونص!
                      </motion.span>
                      <span className="text-xs text-muted-foreground">
                        {gameStats.busChampion.busStreak} جولات متتالية
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* All bonus recipients if more than one */}
                {gameStats.bonusRecipients.length > 1 && (
                  <motion.div
                    className="mt-2 p-3 rounded-lg bg-muted/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                  >
                    <p className="text-xs text-muted-foreground mb-2">🎉 حصلوا على بونص الباص:</p>
                    <div className="flex flex-wrap gap-2">
                      {gameStats.bonusRecipients.map((player, idx) => (
                        <motion.span
                          key={player.id}
                          className="text-xs bg-amber-500/20 text-amber-700 px-2 py-1 rounded-full"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.9 + idx * 0.1 }}
                        >
                          {player.name} ({player.busStreak}x)
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!isFinal && currentRound && (
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="mb-6 border-2">
              <CardHeader className="pb-3">
                <CardTitle>الإجابات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categories.map((category, catIndex) => {
                  const Icon = categoryIcons[category];
                  const categorySubmissions = currentRound.submissions.map(s => ({
                    playerId: s.playerId,
                    playerName: s.playerName,
                    answer: s.answers[category],
                  })).filter(a => a.answer && a.answer.trim());

                  return (
                    <motion.div
                      key={category}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * catIndex }}
                      className="border rounded-xl bg-card/50 overflow-hidden"
                    >
                      <div className={`flex items-center gap-2 p-3 ${categoryColors[category]} bg-opacity-10 dark:bg-opacity-20`}>
                        <div className={`w-8 h-8 ${categoryColors[category]} rounded-lg flex items-center justify-center shadow-md text-white`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-lg">{category}</span>
                      </div>

                      <div className="p-0">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-right p-3 font-medium text-muted-foreground w-1/3">اللاعب</th>
                              <th className="text-right p-3 font-medium text-muted-foreground w-1/3">الكلمة</th>
                              <th className="text-right p-3 font-medium text-muted-foreground w-1/3">النتيجة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categorySubmissions.map((s, idx) => {
                              const validation = currentRound.validatedAnswers.find(
                                v => v.playerId === s.playerId && v.category === category
                              );
                              const isValid = validation?.isValid;
                              const score = validation?.score || 0;
                              const isFabricated = validation?.isFabricated;
                              const reason = validation?.reason;
                              const canAppeal = !isValid && s.playerId === state.playerId;
                              const isMe = s.playerId === state.playerId;

                              return (
                                <tr
                                  key={idx}
                                  className={`border-b last:border-0 transition-colors ${isValid
                                    ? 'bg-green-500/10 hover:bg-green-500/20'
                                    : 'bg-red-500/10 hover:bg-red-500/20'
                                    }`}
                                >
                                  <td className="p-3">
                                    <div className="flex items-center gap-2 font-medium">
                                      {s.playerName}
                                      {isMe && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">أنت</span>}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="font-bold relative">
                                      {s.answer}
                                      {isFabricated && (
                                        <span className="absolute -top-3 -left-2 text-[10px] bg-destructive text-white px-1 rounded animate-pulse shadow-sm">
                                          هبد!
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className={`font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                                          {isValid ? `+${score}` : '❌'}
                                        </span>
                                        {/* REFEREE CONTROLS */}
                                        {isReferee && (
                                          <div className="flex gap-1 mr-2">
                                            {isValid && (
                                              <Button
                                                size="icon"
                                                variant="outline"
                                                className="w-6 h-6"
                                                title={validation?.isUnique ? "إلغاء التميز" : "جعله مميز"}
                                                onClick={() => refereeToggleUnique(s.playerId, category)}
                                              >
                                                <Star className={`w-3 h-3 ${validation?.isUnique ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                                              </Button>
                                            )}
                                            {isValid ? (
                                              <Button
                                                size="icon"
                                                variant="destructive"
                                                className="w-6 h-6"
                                                title="رفض الإجابة"
                                                onClick={() => refereeDeduct(s.playerId, category, 'رفض الحكم')}
                                              >
                                                <UserX className="w-3 h-3" />
                                              </Button>
                                            ) : (
                                              <Button
                                                size="icon"
                                                variant="outline"
                                                className="w-6 h-6 text-green-600 border-green-200"
                                                title="قبول الإجابة (Toggle Unique للقبول)"
                                                onClick={() => refereeToggleUnique(s.playerId, category)}
                                              >
                                                <Zap className="w-3 h-3" />
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {canAppeal && (
                                        <motion.button
                                          onClick={() => setAppealDialog({ playerId: s.playerId, category, word: s.answer })}
                                          className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold border border-amber-200 shadow-sm transition-all"
                                          whileHover={{ scale: 1.05 }}
                                          whileTap={{ scale: 0.95 }}
                                        >
                                          طعن +
                                        </motion.button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          className="space-y-3"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {!isFinal && (
            <motion.div
              className="w-full h-16 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center gap-3 border-2 border-primary/30"
              data-testid="next-round-countdown"
            >
              <Timer className="w-6 h-6 text-primary animate-pulse" />
              <span className="text-xl font-bold">
                الجولة التالية في
              </span>
              <motion.span
                key={countdown}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-xl"
              >
                {countdown}
              </motion.span>
              <span className="text-sm text-muted-foreground">
                ({room.currentRound + 2} / {room.totalRounds})
              </span>
            </motion.div>
          )}

          <Button
            className="w-full h-16 text-xl font-bold bg-gradient-to-r from-accent to-accent/80 shadow-xl"
            onClick={playAgain}
            data-testid="button-play-again"
          >
            <RotateCcw className="w-6 h-6 ml-2" />
            العب تاني!
          </Button>
        </motion.div>
      </div>

      {/* REFEREE OVERRIDE CONTROL */}
      {!isFinal && room.refereeId === state.playerId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center"
        >
          <Button
            onClick={() => refereeApprove()}
            className="h-14 px-8 text-xl font-bold bg-green-600 hover:bg-green-700 shadow-2xl border-4 border-green-400 animate-pulse"
          >
            ✅ اعتماد النتيجة (أنا الحكم)
          </Button>
        </motion.div>
      )}

      {!isFinal && !isHost && (
        <div className="text-center p-4 bg-muted/40 rounded-xl">
          <p className="text-muted-foreground animate-pulse font-medium">
            {room.refereeId ? 'بانتظار اعتماد الحكم...' : 'بانتظار المضيف لبدء الجولة...'}
          </p>
        </div>
      )}

      {/* Appeal Dialog */}
      <AlertDialog open={!!appealDialog} onOpenChange={(open) => !open && setAppealDialog(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl">
              إضافة كلمة جديدة 📚
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3 pt-2">
              <p className="text-lg font-bold text-foreground bg-muted/50 py-2 rounded-lg border-2 border-dashed">
                "{appealDialog?.word}"
              </p>
              <div className="text-sm space-y-2 text-right dir-rtl">
                <p>1. الكلمة دي مش موجودة في قاعدة بياناتنا.</p>
                <p>2. لو متأكد إنها صحيحة، اضغط "تأكيد" عشان الذكاء الاصطناعي يراجعها.</p>
                <p>3. <span className="text-green-600 font-bold">لو طلعت صح:</span> هتتحسبلك نقط وهتنضاف للقاعدة بشكل دائم!</p>
                <p>4. <span className="text-red-500 font-bold">لو طلعت غلط:</span> هتترفض ومش هتاخد حاجة.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0 sm:flex-row-reverse">
            <AlertDialogCancel className="w-full sm:w-auto">استنى، مش متأكد</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (appealDialog) {
                  appealAnswer(appealDialog.playerId, appealDialog.category, appealDialog.word);
                  setAppealDialog(null);
                }
              }}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              تأكيد وإضافة +
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
