import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, RotateCcw, User, Users, Globe, PawPrint, Box, Crown, Star, Sparkles, Medal, Shield, LogOut, Home, Zap, Award, Target, Timer, Plus, UserX, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/Confetti';
import { useGame } from '@/lib/gameContext';
import { categories, type Category } from '@shared/schema';
import { playSuccessSound, playCountdownSound, playBonusSound } from '@/lib/sounds';
import { RetroCard } from '@/components/ui/RetroCard';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { RetroQuote } from '@/components/ui/RetroQuote';
import { LetterDisplay } from '@/components/LetterDisplay';
import { VotingOverlay } from '@/components/VotingOverlay';
import { RefereeReviewOverlay } from '@/components/RefereeReviewOverlay';
import { GameStats } from '@/components/results/GameStats';

import { ResultsTable } from '@/components/results/ResultsTable';
import { PixelReveal } from '@/components/ui/PixelReveal';
import { HostControls } from '@/components/HostControls';


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
  const { state, currentRound, isHost, nextRound, playAgain, disconnect, isReferee, refereeDeduct, refereeToggleUnique, refereeApprove, requestVote } = useGame();
  const [countdown, setCountdown] = useState(5);

  const room = state.room!;
  const isFinal = room.phase === 'final';
  // LOGIC-5 FIX: Filter referee from the leaderboard — they didn't play, so they should not appear in standings
  const activePlayers = room.players.filter(p => p.id !== room.refereeId);
  const sortedPlayers = [...activePlayers].sort((a, b) => b.score - a.score);
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

  // FIX: Countdown must stay in sync with server nextRoundAt, not drift independently
  useEffect(() => {
    if (isFinal) return;
    // LOGIC-6 FIX: Don't run countdown during voting — wait until results phase
    if (room.phase === 'voting') return;

    if (!room.nextRoundAt) return;

    // BUG-3 FIX: Drift protection. Use a local countdown rather than strictly calculating
    // from Date.now() every frame, which can result in 0 or negative numbers if client clock skews.
    const initialTime = Math.max(0, Math.ceil((room.nextRoundAt - Date.now()) / 1000));
    setCountdown(initialTime > 20 ? 20 : Math.min(initialTime, 20));

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        if (prev <= 6) { // when prev drops to 5,4,3,2,1
          playCountdownSound();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinal, room.nextRoundAt, room.phase]);

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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <div className="min-h-screen p-4 overflow-hidden relative text-white font-pixel-text">
      {/* Mobile Pixel Rain Background */}
      {isMobile && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 mobile-juicy-bg">
          <div className="pixel-rain pixel-rain-1"></div>
          <div className="pixel-rain pixel-rain-2"></div>
          <div className="pixel-rain pixel-rain-3"></div>
        </div>
      )}

      <Confetti active={isFinal} count={isMobile ? 1 : 3} />
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
              {/* Trophy Header */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 15 }}
                className="relative inline-block mb-4"
              >
                <div className="w-28 h-28 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-3xl flex items-center justify-center shadow-[6px_6px_0_0_#78350f] border-[4px] border-[#78350f]">
                  <Trophy className="w-16 h-16 text-white drop-shadow-lg" />
                </div>
                <motion.div
                  className="absolute -top-3 -right-3 w-12 h-12 bg-[#4c1d95] rounded-full flex items-center justify-center shadow-[3px_3px_0_0_#2e1065] border-[3px] border-[#2e1065]"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  <Crown className="w-6 h-6 text-amber-300" />
                </motion.div>
              </motion.div>

              <motion.h1
                className="text-4xl md:text-5xl font-pixel-title text-white mb-6 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                نهاية اللعبة!
              </motion.h1>

              {/* Top-3 Podium */}
              {sortedPlayers.length >= 1 && (
                <motion.div
                  className="flex items-end justify-center gap-3 mb-6"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                >
                  {/* 2nd place */}
                  {sortedPlayers[1] && (
                    <motion.div
                      className="flex flex-col items-center"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <PixelAvatar
                        src={sortedPlayers[1].avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${sortedPlayers[1].id}`}
                        size="sm"
                        className="border-[3px] border-slate-400 shadow-[2px_2px_0_0_#475569]"
                      />
                      <span className="text-xl my-0.5">2</span>
                      <p className="text-xs font-pixel-text text-white font-bold truncate max-w-[72px] leading-tight">{sortedPlayers[1].name}</p>
                      <p className="text-xs font-pixel-title text-slate-200 leading-tight">{sortedPlayers[1].score}</p>
                      {/* Podium bar */}
                      <div className="w-20 h-10 bg-gradient-to-b from-slate-300 to-slate-500 border-t-[3px] border-slate-500 mt-2" />
                    </motion.div>
                  )}

                  {/* 1st place */}
                  <motion.div
                    className="flex flex-col items-center"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                  >
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <div className="relative">
                        <div className="absolute inset-0 bg-amber-400 rounded-full blur-xl opacity-40 animate-pulse" />
                        <PixelAvatar
                          src={winner.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${winner.id}`}
                          size="md"
                          className="border-[4px] border-amber-400 relative z-10 shadow-[0_0_20px_rgba(250,204,21,0.6)]"
                        />
                      </div>
                    </motion.div>
                    <span className="text-2xl my-0.5">1</span>
                    <p className="text-sm font-pixel-text text-white font-bold truncate max-w-[90px] leading-tight">{winner.name}</p>
                    <p className="text-sm font-pixel-title text-amber-200 leading-tight">{winner.score} نقطة</p>
                    {/* Podium bar — tallest */}
                    <div className="w-24 h-16 bg-gradient-to-b from-amber-300 to-yellow-600 border-t-[3px] border-amber-600 mt-2" />
                  </motion.div>

                  {/* 3rd place */}
                  {sortedPlayers[2] && (
                    <motion.div
                      className="flex flex-col items-center"
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <PixelAvatar
                        src={sortedPlayers[2].avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${sortedPlayers[2].id}`}
                        size="sm"
                        className="border-[3px] border-orange-400 shadow-[2px_2px_0_0_#9a3412]"
                      />
                      <span className="text-xl my-0.5">3</span>
                      <p className="text-xs font-pixel-text text-white font-bold truncate max-w-[72px] leading-tight">{sortedPlayers[2].name}</p>
                      <p className="text-xs font-pixel-title text-orange-200 leading-tight">{sortedPlayers[2].score}</p>
                      {/* Podium bar — shortest */}
                      <div className="w-20 h-6 bg-gradient-to-b from-orange-400 to-amber-700 border-t-[3px] border-amber-800 mt-2" />
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Full Scoreboard */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mb-6"
              >
                <RetroCard>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-[2px_2px_0_0_#78350f]">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-pixel-title text-[#4c1d95] text-base font-bold">الترتيب النهائي</span>
                  </div>
                  <div className="space-y-2">
                    {sortedPlayers.map((player, index) => {
                      const isMe = player.id === state.playerId;
                      const isRef = player.id === room.refereeId;
                      const medals = ['1', '2', '3'];
                      return (
                        <motion.div
                          key={`${player.id}-${player.score}`}
                          initial={{ x: -30, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.85 + index * 0.07, type: 'spring', stiffness: 300 }}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl border-[2px] font-pixel-text text-sm ${isMe
                            ? 'bg-gradient-to-r from-[#7c3aed]/15 to-[#8b5cf6]/15 border-[#7c3aed] shadow-[2px_2px_0_0_#4c1d95]'
                            : 'bg-white border-[#4c1d95]/20'
                            }`}
                        >
                          {/* Rank */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base font-bold flex-shrink-0 ${index === 0 ? 'bg-gradient-to-br from-amber-300 to-yellow-500 shadow-[2px_2px_0_0_#78350f]' :
                            index === 1 ? 'bg-gradient-to-br from-slate-300 to-gray-400 shadow-[2px_2px_0_0_#334155]' :
                              index === 2 ? 'bg-gradient-to-br from-orange-400 to-amber-600 shadow-[2px_2px_0_0_#7c2d12]' :
                                'bg-[#4c1d95]/10 text-[#4c1d95] text-sm'
                            } text-white`}>
                            {index < 3 ? medals[index] : index + 1}
                          </div>

                          {/* Avatar */}
                          <PixelAvatar
                            src={player.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player.id}`}
                            size="sm"
                            className="border border-[#4c1d95]/30 flex-shrink-0"
                          />

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-[#4c1d95] font-pixel-text truncate flex items-center gap-1">
                              {player.name}
                              {player.isHost && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                              {isRef && <Shield className="w-3 h-3 text-[#7c3aed] flex-shrink-0" />}
                              {isMe && <span className="text-[9px] bg-[#7c3aed] text-white px-1 rounded font-pixel-text flex-shrink-0">أنت</span>}
                            </p>
                          </div>

                          {/* Score */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-lg font-bold text-[#4c1d95] font-pixel-title tabular-nums">{player.score}</span>
                          </div>

                          {/* Host Controls for Score Adjustment — hide for referee players */}
                          {isHost && player.id !== room.refereeId && (
                            <div className="flex items-center gap-1 ml-1 border-l-2 border-[#4c1d95]/10 pl-2 scale-75 transform origin-right">
                              <HostControls type="player_row" targetPlayer={player} />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </RetroCard>
              </motion.div>
            </>
          ) : (
            <div className="flex justify-center mb-6">
              <LetterDisplay
                letter={currentRound?.letter || '?'}
                round={room.currentRound + 1}
                totalRounds={room.totalRounds}
              />
            </div>
          )}


        </motion.div>

        {!isFinal && (
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
                        key={`${player.id}-${player.score}`}
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
        )}

        {
          isFinal && gameStats && (
            <GameStats gameStats={gameStats} />
          )
        }

        {/* End Game Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          {isHost && isFinal && (
            <Button
              onClick={playAgain}
              size="lg"
              className="w-full h-16 text-xl font-bold bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-[4px_4px_0_0_#14532d] border-[3px] border-[#14532d] font-pixel-title"
              data-testid="button-play-again"
            >
              <RotateCcw className="w-6 h-6 ml-2" />
              العب مرة أخرى
            </Button>
          )}
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



        {
          !isFinal && currentRound && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="bg-[#4c1d95] text-[#FFFDD1] px-4 py-3 border-b-4 border-[#2e1065] rounded-t-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xl"></span>
                  <span className="font-pixel-title text-lg tracking-wide">نتائج الجولة</span>
                </div>
              </div>

              <div className="bg-[#f3e8ff] p-4 rounded-b-lg border-x-4 border-b-4 border-[#4c1d95]">
                <ResultsTable
                  round={currentRound}
                  players={room.players}
                  currentPlayerId={state.playerId!}
                  isReferee={isReferee}
                  isHost={isHost}
                  onRefereeToggle={room.phase === 'referee_review' ? refereeToggleUnique : undefined}
                  onRefereeDeduct={room.phase === 'referee_review' ? (pid, cat) => refereeDeduct(pid, cat, 'رفض الحكم') : undefined}
                />
              </div>
            </motion.div>
          )
        }

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
                <div className="flex flex-col gap-2">
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
                  {/* BUG-3b FIX: Allow Host to skip the auto-timer wait */}
                  {isHost && (
                    <Button
                      onClick={() => nextRound()}
                      size="lg"
                      className="w-full h-12 text-sm font-bold bg-[#4c1d95] hover:bg-[#5b21b6] shadow-[2px_2px_0_0_#2e1065] border-[2px] border-[#2e1065] text-white font-pixel-title transition-all active:translate-y-1 active:shadow-none mt-2"
                      data-testid="button-skip-timer"
                    >
                      تخطي الانتظار وبدء الجولة
                    </Button>
                  )}
                </div>
              ) : (
                /* Case 2: Waiting for Referee (No Timer) */
                <div className="w-full p-4 bg-[#4c1d95]/80 rounded-2xl text-center border-[3px] border-[#FFFDD1] shadow-lg backdrop-blur-sm">
                  {isReferee && (room.phase === 'referee_review' || room.phase === 'results') ? (
                    <div className="space-y-2">
                      <p className="text-[#FFFDD1] font-bold font-pixel-text text-lg animate-pulse">
                        الوقت متوقف للمراجعة
                      </p>
                      <Button
                        onClick={() => room.phase === 'results' ? nextRound() : refereeApprove()}
                        size="lg"
                        className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-[4px_4px_0_0_#14532d] border-[3px] border-[#14532d] font-pixel-title transition-all active:translate-y-1 active:shadow-none"
                      >
                        {room.phase === 'results' ? '➡️ بدء الجولة التالية' : 'اعتماد النتيجة وبدء الجولة'}
                      </Button>
                    </div>
                  ) : room.settings?.enableVoting && isHost ? (
                    // Host Control for Voting Mode
                    <div className="space-y-2">
                      <p className="text-[#FFFDD1] font-bold font-pixel-text text-lg">
                        وضع التصويت مفعل
                      </p>
                      <Button
                        onClick={() => nextRound()}
                        size="lg"
                        className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-[4px_4px_0_0_#14532d] border-[3px] border-[#14532d] font-pixel-title transition-all active:translate-y-1 active:shadow-none"
                        data-testid="button-next-round"
                      >
                        الاستمرار للجولة التالية
                      </Button>
                    </div>
                  ) : isHost ? (
                    // BUG-10 FIX: Host in standard mode (no timer, no referee, no voting) always sees a Next Round button
                    <div className="space-y-2">
                      <Button
                        onClick={() => nextRound()}
                        size="lg"
                        className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-[4px_4px_0_0_#14532d] border-[3px] border-[#14532d] font-pixel-title transition-all active:translate-y-1 active:shadow-none"
                        data-testid="button-next-round"
                      >
                        {room.currentRound >= room.totalRounds - 1 ? 'إنهاء اللعبة' : 'الجولة التالية ←'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Timer className="w-8 h-8 text-[#FFFDD1] animate-spin-slow" />
                      <p className="text-[#FFFDD1] font-bold font-pixel-text text-xl">
                        {/* BUG-R2 FIX: Only show referee message when a referee actually exists */}
                        {room.refereeId ? 'في الانتظار...' : 'في الانتظار...'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {/* Next Round button is now handled inside the room.nextRoundAt block above (BUG-10 fix) */}
        </motion.div>
      </div>
    </div >
  );
}
