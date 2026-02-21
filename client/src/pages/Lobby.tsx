import { Copy, Check, Play, Users, Shield, Crown, Sparkles, X, LogOut, HelpCircle, Gamepad2, Volume2, VolumeX } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PlayerCard } from '@/components/PlayerCard';
import { useGame } from '@/lib/gameContext';
import { RetroCard } from '@/components/ui/RetroCard';
import { Tutorial } from '@/components/Tutorial';
import { useGameSound } from '@/lib/soundManager';
import { playReady, playRoundStart } from '@/lib/sounds';
import { useIsMobile } from '@/hooks/useIsMobile';

// ============================================
// 🎮 LOBBY PAGE - Perfect Purple Theme
// ============================================

export default function Lobby() {
  const { state, currentPlayer, isHost, setReady, startGame, setReferee, removeReferee, referee, disconnect, updateSettings } = useGame();
  const [copied, setCopied] = useState(false);
  const [showRefereeSelect, setShowRefereeSelect] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const { isMuted, toggleMute } = useGameSound();

  const room = state.room!;
  const allReady = room.players.every(p => p.isReady);
  const canStart = isHost && allReady && room.players.length >= 1;
  const readyCount = room.players.filter(p => p.isReady).length;
  const isVotingEnabled = room.settings?.enableVoting || false;

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetReferee = (playerId: string) => {
    setReferee(playerId);
    setShowRefereeSelect(false);
  };

  const isMobileView = useIsMobile();

  return (
    <div className="min-h-screen p-3 md:p-6 overflow-hidden relative text-white font-pixel-text">
      <div className="max-w-xl mx-auto relative z-10">

        {/* ============================================
            🔝 HEADER
            ============================================ */}
        <motion.header
          className="flex items-center justify-between mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-xl flex items-center justify-center border-2 border-white/30 shadow-lg">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-pixel-title text-lg text-white leading-tight">غرفة الانتظار</h1>
              <p className="text-xs text-[#e9d5ff]/80 font-pixel-text">في انتظار اللاعبين...</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="w-10 h-10 text-[#fbbf24] hover:text-[#f59e0b] hover:bg-white/10 rounded-xl"
              title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTutorial(true)}
              className="w-10 h-10 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              title="طريقة اللعب"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={disconnect}
              className="w-10 h-10 text-white/80 hover:text-white hover:bg-white/10 rounded-xl"
              title="خروج"
              data-testid="button-exit-lobby"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </motion.header>

        {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

        {/* ============================================
            🎯 ROOM CODE
            ============================================ */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0 }}
          className="mb-5"
        >
          <div className="bg-gradient-to-br from-white to-[#faf5ff] rounded-2xl border-[3px] border-[#4c1d95] p-4 shadow-[0_8px_0_0_#2e1065,_0_0_30px_rgba(139,92,246,0.3)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-[#7c3aed] font-pixel-text flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                كود الغرفة
              </span>
              <span className="text-xs text-[#4c1d95]/60 font-pixel-text">شاركه مع أصحابك</span>
            </div>

            <div className="flex items-center gap-3">
              <motion.div
                className="flex-1 flex gap-1.5 justify-center"
                dir="ltr"
              >
                {room.code.split('').map((char, i) => (
                  <motion.span
                    key={i}
                    className="flex-1 max-w-12 h-14 flex items-center justify-center text-2xl md:text-3xl font-bold bg-gradient-to-b from-[#4c1d95] to-[#2e1065] text-white rounded-lg shadow-[0_4px_0_0_#1e1b4b,_inset_0_1px_0_rgba(255,255,255,0.2)] border border-[#7c3aed]/50 font-pixel-title"
                    initial={isMobileView ? { opacity: 0 } : { rotateY: 90 }}
                    animate={isMobileView ? { opacity: 1 } : { rotateY: 0 }}
                    transition={{ delay: 0.05 + i * 0.05 }}
                  >
                    {char}
                  </motion.span>
                ))}
              </motion.div>

              <motion.button
                onClick={copyCode}
                className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all border-[3px] shadow-[0_4px_0_0_#2e1065] active:shadow-none active:translate-y-1 ${copied
                  ? 'bg-[#4c1d95] border-[#2e1065] text-white'
                  : 'bg-white border-[#4c1d95] text-[#4c1d95] hover:bg-[#4c1d95] hover:text-white'
                  }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                data-testid="button-copy-code"
              >
                {copied ? <Check className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ============================================
            👥 PLAYERS SECTION
            ============================================ */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-5"
        >
          <RetroCard className="!p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[#4c1d95]/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#7c3aed] to-[#4c1d95] rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h2 className="font-pixel-title text-[#4c1d95] font-bold">اللاعبين</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#7c3aed] font-pixel-text">
                  {readyCount} جاهز
                </span>
                <span className="px-3 py-1 bg-[#4c1d95] text-white rounded-full text-sm font-bold font-pixel-text">
                  {room.players.length}/8
                </span>
              </div>
            </div>

            {/* Players List */}
            <div className="space-y-2 mb-4">
              <AnimatePresence mode="popLayout">
                {[...room.players]
                  .sort((a, b) => {
                    if (a.id === state.playerId) return -1;
                    if (b.id === state.playerId) return 1;
                    return 0;
                  })
                  .map((player, index) => (
                    <motion.div
                      key={player.id}
                      layout
                      initial={{ x: 30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -30, opacity: 0 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <PlayerCard
                        player={player}
                        isCurrentPlayer={player.id === state.playerId}
                        isReferee={player.id === room.refereeId}
                        index={index}
                      />
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>

          </RetroCard>
        </motion.div>

        {/* ============================================
            ⚙️ CONTROL PANEL (Referee, Voting, Ready Meter)
            ============================================ */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12 }}
          className={`mb-5 p-5 bg-gradient-to-b from-[#2e1065] to-[#1a0533] rounded-2xl border-[4px] shadow-[0_0_30px_rgba(251,191,36,0.2)] transition-all duration-300 relative overflow-hidden ${isVotingEnabled ? 'border-orange-500 !shadow-[0_0_30px_rgba(249,115,22,0.4)]' : 'border-[#fbbf24]'
            }`}
        >
          {isVotingEnabled && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50 blur-sm" />
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 ${isVotingEnabled ? 'text-orange-500' : 'text-[#fbbf24]'}`} />
              <span className={`font-pixel-title text-xl ${isVotingEnabled ? 'text-orange-500' : 'text-[#fbbf24]'}`}>
                لوحة التحكم
              </span>
            </div>
          </div>

          <div className="mb-5">
            <div className="flex justify-between text-xs mb-1 font-pixel-text">
              <span className="text-[#fbbf24]">اللاعبين الجاهزين</span>
              <span className="text-white">{readyCount} / {room.players.length}</span>
            </div>
            {/* Ready Meter */}
            <div className="h-3 bg-[#4c1d95] rounded-full overflow-hidden shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]"
                initial={{ width: 0 }}
                animate={{ width: `${(readyCount / room.players.length) * 100}%` }}
              />
            </div>
          </div>

          {isHost ? (
            <div className="space-y-3">
              {/* Voting Toggle */}
              <div
                className={`flex items-center justify-between p-3 rounded-xl border ${isVotingEnabled ? 'bg-orange-500/10 border-orange-500/30' : 'bg-white/5 border-white/10'
                  } group cursor-pointer transition-colors`}
                onClick={() => updateSettings({ enableVoting: !isVotingEnabled })}
                title="التحكيم الديمقراطي = كل اللاعبين يصوتون على الإجابات"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Users className={`w-5 h-5 ${isVotingEnabled ? 'text-orange-500' : 'text-white/50'}`} />
                    {isVotingEnabled && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"
                        animate={{ y: [-1, 1, -1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                      />
                    )}
                  </div>
                  <div>
                    <p className={`font-bold font-pixel-text text-sm ${isVotingEnabled ? 'text-orange-400' : 'text-white'}`}>التحكيم الديمقراطي</p>
                    <p className="text-[10px] text-white/50 font-pixel-text hidden md:block">كل اللاعبين يصوتون على الإجابات</p>
                  </div>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-pixel-text transition-all flex items-center gap-1 ${isVotingEnabled
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-transparent text-white/50 border-2 border-white/20'
                    }`}
                >
                  {isVotingEnabled && <Check className="w-3 h-3" />}
                  {isVotingEnabled ? 'مفعل' : 'معطل'}
                </div>
              </div>

              {/* Referee Selection */}
              <div className={`p-3 rounded-xl border transition-all ${referee
                ? 'bg-[#fbbf24]/10 border-[#fbbf24]/30'
                : 'bg-white/5 border-white/10'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${referee
                      ? 'bg-[#fbbf24] border-[#d97706]'
                      : 'bg-white/10 border-white/20'
                      }`}>
                      <Shield className={`w-4 h-4 ${referee ? 'text-[#2e1065]' : 'text-white/50'}`} />
                    </div>
                    <div>
                      <p className="font-bold text-white font-pixel-text text-sm">حكم وحيد</p>
                      <p className={`text-[10px] md:text-xs font-pixel-text ${referee ? 'text-[#fbbf24]' : 'text-white/50'}`}>
                        {referee ? referee.name : 'اختياري - اختر لاعب لإلغاء التصويت'}
                      </p>
                    </div>
                  </div>

                  {referee ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeReferee(); }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#fbbf24] hover:bg-[#fbbf24] hover:text-[#2e1065] transition-colors"
                      data-testid="button-remove-referee"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowRefereeSelect(!showRefereeSelect); }}
                      className="px-3 py-1.5 bg-white/10 border border-white/20 text-white rounded-lg text-xs font-bold font-pixel-text hover:bg-white/20 transition-colors"
                      data-testid="button-choose-referee"
                    >
                      اختر
                    </button>
                  )}
                </div>

                {/* Referee Dropdown */}
                <AnimatePresence>
                  {showRefereeSelect && !referee && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 pt-3 border-t border-white/10 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {room.players.map((player) => (
                          <button
                            key={player.id}
                            onClick={() => handleSetReferee(player.id)}
                            className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-lg text-white font-pixel-text text-sm hover:border-white/30 hover:bg-white/10 transition-colors"
                            data-testid={`button-select-referee-${player.id}`}
                          >
                            {player.isHost && <Crown className="w-4 h-4 text-[#fbbf24] flex-shrink-0" />}
                            <span className="truncate">{player.name}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <>
              {/* Voting Indicator (Non-Host) */}
              {room.settings?.enableVoting && (
                <div className="flex items-center justify-center gap-2 p-3 bg-orange-500/10 rounded-xl border border-orange-500/30">
                  <div className="relative">
                    <Users className="w-5 h-5 text-orange-500" />
                    <motion.div
                      className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"
                      animate={{ y: [-1, 1, -1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                    />
                  </div>
                  <span className="text-sm font-bold text-orange-400 font-pixel-text" title="التحكيم الديمقراطي = كل اللاعبين يصوتون على الإجابات">نظام التحكيم الديمقراطي مفعل</span>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* ============================================
            🚀 ACTION BUTTONS
            ============================================ */}
        <motion.div
          className="space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {/* Ready Button */}
          {!currentPlayer?.isReady && (
            <motion.button
              onClick={() => { playReady(); setReady(); }}
              className="w-full py-4 bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white rounded-xl font-pixel-title text-lg font-bold shadow-[0_6px_0_0_#4c1d95,_0_0_20px_rgba(139,92,246,0.4)] active:shadow-none active:translate-y-1.5 transition-all flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="button-ready"
            >
              <Check className="w-6 h-6" />
              أنا جاهز!
            </motion.button>
          )}

          {/* Ready State */}
          {currentPlayer?.isReady && !isHost && (
            <motion.div
              className="py-4 bg-gradient-to-b from-white to-[#faf5ff] rounded-xl border-[3px] border-[#4c1d95] shadow-[0_4px_0_0_#2e1065] text-center"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="inline-block"
              >
                <Check className="w-8 h-8 text-[#7c3aed] mx-auto mb-1" />
              </motion.div>
              <p className="font-bold text-[#4c1d95] font-pixel-text">أنت جاهز!</p>
              <p className="text-xs text-[#7c3aed] font-pixel-text">في انتظار باقي اللاعبين...</p>
            </motion.div>
          )}

          {/* Start Game Button */}
          {isHost && (
            <motion.button
              onClick={() => { playRoundStart(); startGame(); }}
              disabled={!canStart}
              className={`w-full py-4 rounded-xl font-pixel-title text-lg font-bold shadow-[0_6px_0_0] active:shadow-none active:translate-y-1.5 transition-all flex items-center justify-center gap-2 ${canStart
                ? 'bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] text-white shadow-[#4c1d95] hover:from-[#8b5cf6] hover:to-[#7c3aed]'
                : 'bg-[#4c1d95]/30 text-white/50 shadow-[#2e1065] cursor-not-allowed'
                }`}
              whileHover={canStart ? { scale: 1.02 } : {}}
              whileTap={canStart ? { scale: 0.98 } : {}}
              data-testid="button-start-game"
            >
              <Play className="w-6 h-6" />
              {allReady ? 'ابدأ اللعبة!' : `في انتظار اللاعبين... (${readyCount}/${room.players.length})`}
            </motion.button>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p
          className="text-center text-xs text-white/40 mt-6 font-pixel-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
        </motion.p>

      </div>
    </div>
  );
}
