import { useEffect, useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowLeft, RotateCcw, User, Users, Globe, PawPrint, Box, Crown, Star, Sparkles, Medal, Shield, LogOut, Home, Zap, Award, Target, Timer, Plus, UserX, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/Confetti';
import { useGame } from '@/lib/gameContext';
import { categories, type Category } from '@shared/schema';
import { playSuccessSound, playCountdownSound, playBonusSound } from '@/lib/sounds';
import { RetroCard } from '@/components/ui/RetroCard';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { LetterDisplay } from '@/components/LetterDisplay';
import { VotingOverlay } from '@/components/VotingOverlay';
import { RefereeReviewOverlay } from '@/components/RefereeReviewOverlay';
import { GameStats } from '@/components/results/GameStats';

import { ResultsTable } from '@/components/results/ResultsTable';
import { rankStyles, defaultAvatar } from '@/lib/designTokens';
import { ScoreCounter } from '@/components/ScoreCounter';
import { HostControls } from '@/components/HostControls';

const categoryIcons: Record<Category, any> = {
  'ولد': User,
  'بنت': Users,
  'بلد': Globe,
  'حيوان': PawPrint,
  'جماد': Box,
};

const rankColors = [rankStyles.gold, rankStyles.silver, rankStyles.bronze];
const rankIcons = [Crown, Medal, Star];

export default function Results() {
  const { state, currentRound, isHost, nextRound, playAgain, disconnect, isReferee, refereeDeduct, refereeToggleUnique, refereeApprove, requestVote } = useGame();
  const [countdown, setCountdown] = useState(5);
  const [hasRequestedNext, setHasRequestedNext] = useState(false);

  const room = state.room!;
  const isFinal = room.phase === 'final';
  // LOGIC-5 FIX: Filter referee from the leaderboard — they didn't play, so they should not appear in standings
  const activePlayers = room.players.filter(p => p.id !== room.refereeId);
  const sortedPlayers = [...activePlayers].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((b.busStreak || 0) !== (a.busStreak || 0)) return (b.busStreak || 0) - (a.busStreak || 0);
    return a.name.localeCompare(b.name, 'ar');
  });
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

    const tick = () => {
      if (room.nextRoundAt) {
        const remaining = Math.max(0, Math.ceil((room.nextRoundAt - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining > 0 && remaining <= 5) playCountdownSound(); // R2: only last 5s
      }
    };

    tick(); // Fire immediately
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isFinal, room.nextRoundAt, room.phase]);

  // FIX-AUTO-ADVANCE: Auto-advance when countdown reaches 0 and host hasn't clicked yet
  useEffect(() => {
    if (isFinal || countdown > 0 || room.phase === 'voting') return;
    if (!isHost) return; // Only host can auto-advance
    
    // Auto-advance after countdown finishes
    const timer = setTimeout(() => {
      if (countdown === 0 && !hasRequestedNext) {
        setHasRequestedNext(true);
        nextRound();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [countdown, isFinal, room.phase, isHost, nextRound]);

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

      <Confetti active={isFinal} variant="gold" count={1} />
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
                <div className="w-28 h-28 bg-[#FF8A50] rounded-sm flex items-center justify-center shadow-pixel-lg border-4 border-[#350D7A]">
                  <Trophy className="w-16 h-16 text-[#350D7A]" />
                </div>
                <motion.div
                  className="absolute -top-3 -right-3 w-12 h-12 bg-[#6714A8] rounded-sm flex items-center justify-center shadow-pixel-sm border-[3px] border-[#350D7A]"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  <Crown className="w-6 h-6 text-[#FFC48B]" />
                </motion.div>
              </motion.div>

              <motion.h1
                className="text-4xl md:text-5xl text-white mb-6 [text-shadow:3px_3px_0_#350D7A]"
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
                        src={sortedPlayers[1].avatar || defaultAvatar(sortedPlayers[1].id)}
                        size="sm"
                        className={`ring-2 ring-gray-300/60 shadow-lg`}
                      />
                      <span className="text-xl my-0.5">2</span>
                      <p className="text-xs font-pixel-text text-white font-bold truncate max-w-[72px] leading-tight">{sortedPlayers[1].name}</p>
                      <p className="text-xs font-pixel-title text-gray-100 leading-tight">{sortedPlayers[1].score}</p>
                      <div className={`w-20 h-10 border-t-[3px] mt-2 ${rankStyles.silver}`} />
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
                        <PixelAvatar
                          src={winner.avatar || defaultAvatar(winner.id)}
                          size="md"
                          className="relative z-10 ring-4 ring-[#FF8A50] shadow-pixel"
                        />
                      </div>
                    </motion.div>
                    <span className="text-2xl my-0.5">1</span>
                    <p className="text-sm font-pixel-text text-white font-bold truncate max-w-[90px] leading-tight">{winner.name}</p>
                    <p className="text-sm font-pixel-title text-[#FFC48B] leading-tight">
                      <ScoreCounter value={winner.score} /> نقطة
                    </p>
                    {/* Podium bar — tallest */}
                    <div className={`w-24 h-16 border-t-[3px] mt-2 ${rankStyles.gold}`} />
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
                        src={sortedPlayers[2].avatar || defaultAvatar(sortedPlayers[2].id)}
                        size="sm"
                        className="ring-2 ring-amber-600/50 shadow-lg"
                      />
                      <span className="text-xl my-0.5">3</span>
                      <p className="text-xs font-pixel-text text-white font-bold truncate max-w-[72px] leading-tight">{sortedPlayers[2].name}</p>
                      <p className="text-xs font-pixel-title text-orange-200 leading-tight">{sortedPlayers[2].score}</p>
                      {/* Podium bar — shortest */}
                      <div className={`w-20 h-6 border-t-[3px] mt-2 ${rankStyles.bronze}`} />
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
                    <div className="w-7 h-7 bg-[#FF8A50] rounded-sm border-2 border-[#350D7A] flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-[#350D7A]" />
                    </div>
                    <span className="font-pixel-title text-[#350D7A] text-base font-bold">الترتيب النهائي</span>
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
                          className={`flex items-center gap-3 px-3 py-2 rounded-sm border-2 border-[#350D7A] text-sm font-medium ${isMe
                            ? 'bg-[#FFF3B6] shadow-pixel-sm'
                            : 'bg-[#FFFEE5]'
                            }`}
                        >
                          {/* Rank */}
                          <div className={`w-8 h-8 rounded-sm border-2 border-[#350D7A] flex items-center justify-center text-base font-bold flex-shrink-0 ${index === 0 ? rankStyles.gold :
                            index === 1 ? rankStyles.silver :
                              index === 2 ? rankStyles.bronze :
                                'bg-[#FFFDCC] text-[#350D7A] text-sm'
                            }`}>
                            {index < 3 ? medals[index] : index + 1}
                          </div>

                          {/* Avatar */}
                          <PixelAvatar
                            src={player.avatar || defaultAvatar(player.id)}
                            size="sm"
                            className="border border-[#350D7A]/30 flex-shrink-0"
                          />

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-[#350D7A] font-pixel-text truncate flex items-center gap-1">
                              {player.name}
                              {player.isHost && <Crown className="w-3 h-3 text-[#FF8A50] flex-shrink-0" />}
                              {isRef && <Shield className="w-3 h-3 text-[#6714A8] flex-shrink-0" />}
                              {isMe && <span className="text-[9px] bg-[#6714A8] text-white px-1 rounded font-pixel-text flex-shrink-0">أنت</span>}
                            </p>
                          </div>

                          {/* Score */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Zap className="w-3.5 h-3.5 text-[#FF8A50] fill-[#FF8A50]" />
                            <ScoreCounter value={player.score} className="text-lg font-bold text-[#350D7A] font-pixel-title tabular-nums" />
                          </div>

                          {/* Host Controls for Score Adjustment — hide for referee players */}
                          {isHost && player.id !== room.refereeId && (
                            <div className="flex items-center gap-1 ml-1 border-l-2 border-[#350D7A]/10 pl-2 scale-75 transform origin-right">
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
              <div className="flex items-center gap-2 mb-3 font-pixel-title text-[#350D7A] text-base">
                <div className="w-7 h-7 bg-[#FF8A50] rounded-sm border-2 border-[#350D7A] flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-[#350D7A]" />
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
                        className={`flex items-center gap-2 p-2 rounded-sm border-2 ${player.id === state.playerId
                          ? 'bg-[#FFF3B6] border-[#350D7A] shadow-pixel-sm'
                          : 'bg-[#FFFEE5] border-[#350D7A]/40'
                          } font-pixel-text text-sm`}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.05 * index }}
                      >
                        {index < 3 ? (
                          <div className={`w-8 h-8 rounded-sm ${rankColors[index]} flex items-center justify-center border-2 border-[#350D7A]`}>
                            <RankIcon className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-sm bg-[#FFFDCC] border-2 border-[#350D7A]/40 flex items-center justify-center text-[#350D7A] font-bold text-sm">
                            {index + 1}
                          </div>
                        )}

                        <PixelAvatar
                          src={player.avatar || defaultAvatar(player.id)}
                          className="w-8 h-8 border border-[#350D7A]/30"
                          size="sm"
                        />

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-[#350D7A] font-pixel-text truncate">
                            {player.name}
                            {player.isHost && <Crown className="w-3 h-3 text-[#FF8A50] inline mr-1" />}
                            {isReferee && <Shield className="w-3 h-3 text-[#6714A8] inline mr-1" />}
                          </p>
                        </div>
                        <span className="text-lg font-bold text-[#350D7A] font-pixel-title">{player.score}</span>
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
              variant="retro"
              size="lg"
              className="w-full h-16 text-xl font-bold font-pixel-title"
              data-testid="button-play-again"
            >
              <RotateCcw className="w-6 h-6 ml-2" />
              العب مرة أخرى
            </Button>
          )}
          <Button
            onClick={disconnect}
            variant="primary"
            size="lg"
            className="w-full h-16 text-xl font-bold font-pixel-title"
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
              <div className="bg-[#350D7A] text-[#FFFEE2] px-4 py-3 border-4 border-[#350D7A] rounded-t-sm">
                <div className="flex items-center gap-2">
                  <span className="font-pixel-title text-lg tracking-wide">نتائج الجولة</span>
                </div>
              </div>

              <div className="bg-[#FFFEE5] p-4 rounded-b-sm border-x-4 border-b-4 border-[#350D7A] shadow-pixel">
                <ResultsTable
                  round={currentRound}
                  players={room.players}
                  currentPlayerId={state.playerId!}
                  isReferee={isReferee}
                  isHost={isHost}
                  onRefereeToggle={room.phase === 'referee_review' ? refereeToggleUnique : undefined}
                  onRefereeDeduct={room.phase === 'referee_review' ? (pid, cat) => refereeDeduct(pid, cat as Category, 'رفض الحكم') : undefined}
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
                <div className="w-full h-20 bg-[#350D7A] rounded-sm flex items-center justify-center gap-5 border-[3px] border-[#350D7A] shadow-pixel text-xl font-semibold">
                  <span className="text-[#FFFEE2] text-xl font-pixel-text">الجولة التالية في</span>
                  <motion.span
                    key={countdown}
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-14 h-14 bg-[#FFFEE5] text-[#350D7A] rounded-sm flex items-center justify-center font-bold border-[3px] border-[#350D7A] shadow-pixel-sm font-pixel-title text-2xl"
                  >
                    {countdown}
                  </motion.span>
                </div>
              ) : (
                /* Case 2: Waiting for Referee (No Timer) */
                <div className="w-full p-4 surface-dark text-center">
                  {isReferee && (room.phase === 'referee_review' || room.phase === 'results') ? (
                    <div className="space-y-2">
                      <p className="text-[#FFFDD1] font-bold font-pixel-text text-lg animate-pulse">
                        الوقت متوقف للمراجعة
                      </p>
                      <Button
                        onClick={() => room.phase === 'results' ? nextRound() : refereeApprove()}
                        variant="primary"
                        size="lg"
                        className="w-full h-14 text-lg font-bold font-pixel-title"
                      >
                        {room.phase === 'results' ? '➡️ بدء الجولة التالية' : 'اعتماد النتيجة وبدء الجولة'}
                      </Button>
                    </div>
                  ) : room.settings?.votingEnabled && isHost && room.phase !== 'referee_review' ? (
                    // Host Control for Voting Mode (not during referee review — must approve first)
                    <div className="space-y-2">
                      <p className="text-[#FFFDD1] font-bold font-pixel-text text-lg">
                        وضع التصويت مفعل
                      </p>
                      <Button
                        onClick={() => nextRound()}
                        variant="primary"
                        size="lg"
                        className="w-full h-14 text-lg font-bold font-pixel-title"
                        data-testid="button-next-round"
                      >
                        الاستمرار للجولة التالية
                      </Button>
                    </div>
                  ) : isHost ? (
                    // BUG-10 FIX: Host in standard mode (no timer, no referee, no voting) always sees a Next Round button
                    <div className="space-y-2">
                      <Button
                        onClick={() => {
                          if (!hasRequestedNext) {
                            setHasRequestedNext(true);
                            nextRound();
                          }
                        }}
                        variant="primary"
                        size="lg"
                        className="w-full h-14 text-lg font-bold font-pixel-title"
                        data-testid="button-next-round"
                      >
                        {room.currentRound >= room.totalRounds - 1 ? 'إنهاء اللعبة' : 'الجولة التالية ←'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Timer className="w-8 h-8 text-[#FFFDD1] animate-spin-slow" />
                      <p className="text-[#FFFDD1] font-bold font-pixel-text text-xl">
                        في انتظار المضيف للمتابعة...
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
