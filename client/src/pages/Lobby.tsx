import { Copy, Check, Play, Users, Shield, Crown, Sparkles, X, Home, LogOut, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { categories } from '@shared/schema';
import { PlayerCard } from '@/components/PlayerCard';
import { useGame } from '@/lib/gameContext';
import { RetroCard } from '@/components/ui/RetroCard';
import { Tutorial } from '@/components/Tutorial';
import { HelpCircle } from 'lucide-react';

export default function Lobby() {
  const { state, currentPlayer, isHost, setReady, startGame, setReferee, removeReferee, referee, disconnect, updateSettings } = useGame();
  const [copied, setCopied] = useState(false);
  const [showRefereeSelect, setShowRefereeSelect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [customCats, setCustomCats] = useState(categories);

  const room = state.room!;
  const allReady = room.players.every(p => p.isReady);
  const canStart = isHost && allReady && room.players.length >= 1;

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetReferee = (playerId: string) => {
    setReferee(playerId);
    setShowRefereeSelect(false);
  };

  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <div className="min-h-screen p-4 overflow-hidden relative text-white font-pixel-text">
      {/* Mobile Pixel Rain Background */}
      {isMobileView && (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 mobile-juicy-bg">
          <div className="pixel-rain pixel-rain-1"></div>
          <div className="pixel-rain pixel-rain-2"></div>
          <div className="pixel-rain pixel-rain-3"></div>
        </div>
      )}
      <div className="max-w-2xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="text-white hover:bg-white/10"
            data-testid="button-exit-lobby"
          >
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTutorial(true)}
              className="text-white hover:bg-white/10"
              title="طريقة اللعب"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}

        <motion.div
          className="text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-white to-[#faf5ff] border-[3px] border-[#4c1d95] rounded-full mb-4 shadow-[4px_4px_0_0_#2e1065,_0_0_20px_rgba(139,92,246,0.2)]"
            animate={isMobileView ? {} : { scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="w-6 h-6 text-[#7c3aed]" />
            <span className="font-bold text-lg text-[#4c1d95] font-pixel-text">غرفة الانتظار</span>
          </motion.div>
          <h1 className="text-5xl font-pixel-title mb-3 text-white font-bold">في انتظار اللاعبين...</h1>
          <p className="text-3xl text-[#e9d5ff] font-bold font-pixel-text">ادعي أصحابك وعيلتك!</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <RetroCard className="mb-6">
            <div className="text-center">
              <p className="text-lg text-[#4c1d95] font-bold mb-3 font-pixel-text">كود الغرفة</p>
              <div className="flex items-center justify-center gap-4">
                <motion.div
                  className="flex gap-2"
                  dir="ltr"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: isMobileView ? 100 : 200, delay: 0.2 }}
                >
                  {room.code.split('').map((char, i) => (
                    <motion.span
                      key={i}
                      className="w-14 h-16 flex items-center justify-center text-3xl font-bold bg-[#4c1d95] text-white rounded-lg shadow-[4px_4px_0_0_#2e1065,_0_0_10px_rgba(139,92,246,0.3)] border-2 border-[#7c3aed] font-pixel-title"
                      initial={isMobileView ? { opacity: 0 } : { rotateY: 90 }}
                      animate={isMobileView ? { opacity: 1 } : { rotateY: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </motion.div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyCode}
                  className="h-16 w-16 border-[3px] border-[#4c1d95] text-[#4c1d95] hover:bg-[#4c1d95] hover:text-white bg-white shadow-[4px_4px_0_0_#2e1065] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#4c1d95] rounded-none transition-all"
                  data-testid="button-copy-code"
                >
                  {copied ? (
                    <Check className="w-7 h-7" />
                  ) : (
                    <Copy className="w-7 h-7" />
                  )}
                </Button>
              </div>
              <motion.p
                className="text-sm text-[#4c1d95] mt-4 font-pixel-text font-bold"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                شاركه مع أصحابك عشان ينضموا
              </motion.p>
            </div>
          </RetroCard>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <RetroCard className="mb-6">
            <div className="flex flex-row items-center justify-between gap-2 pb-4 border-b-2 border-[#4c1d95]/10 mb-3">
              <h2 className="text-xl flex items-center gap-2 font-pixel-title text-[#4c1d95] font-bold">
                <Users className="w-6 h-6 text-[#7c3aed]" />
                اللاعبين
              </h2>
              <motion.span
                className="text-sm px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white rounded-full font-bold border-2 border-[#4c1d95] font-pixel-text text-lg shadow-[2px_2px_0_0_#2e1065]"
                animate={{ scale: room.players.length >= 1 ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: room.players.length >= 1 ? Infinity : 0, duration: 1.5 }}
              >
                {room.players.length} / 8
              </motion.span>
            </div>
            <div className="space-y-3">
              {/* Voting Toggle (New) */}
              {isHost ? (
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg border-2 border-[#4c1d95]/20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#7c3aed] rounded-lg flex items-center justify-center text-white">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-[#4c1d95] font-pixel-text text-sm">التحكيم الديمقراطي</p>
                      <p className="text-[10px] text-[#4c1d95]/70 font-pixel-text">
                        {referee ? <span className="text-red-500 font-bold">⚠️ سيلغي الحكم الحالي</span> : "اللاعبين يصوتوا على الإجابات"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={room.settings?.enableVoting ? "default" : "outline"}
                    onClick={() => updateSettings({ enableVoting: !room.settings?.enableVoting })}
                    className={`h-8 font-bold font-pixel-text ${room.settings?.enableVoting ? 'bg-[#7c3aed]' : 'text-[#4c1d95]'}`}
                  >
                    {room.settings?.enableVoting ? 'مفعل ✅' : 'معطل ❌'}
                  </Button>
                </div>
              ) : (
                room.settings?.enableVoting && (
                  <div className="flex items-center gap-2 p-2 bg-[#7c3aed]/10 rounded-lg border border-[#7c3aed]/30 justify-center mb-2">
                    <Users className="w-4 h-4 text-[#7c3aed]" />
                    <span className="text-xs font-bold text-[#4c1d95] font-pixel-text">نظام التحكيم الديمقراطي مفعل</span>
                  </div>
                )
              )}

              <AnimatePresence>
                {[...room.players]
                  .sort((a, b) => {
                    if (a.id === state.playerId) return -1;
                    if (b.id === state.playerId) return 1;
                    return 0;
                  })
                  .map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -50, opacity: 0 }}
                      transition={{ delay: index * 0.1 }}
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

        {isHost && room.players.length >= 1 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mb-4"
          >
            <RetroCard className="border-[3px] border-dashed">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#7c3aed]/20 flex items-center justify-center border-2 border-[#4c1d95]">
                    <Shield className="w-6 h-6 text-[#7c3aed]" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-[#4c1d95] font-pixel-text">الحكم (اختياري)</p>
                    <p className="text-base text-[#7c3aed] font-bold font-pixel-text">
                      {referee ? referee.name : 'اختر حكم للمباراة'}
                    </p>
                  </div>
                </div>
                {referee ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeReferee()}
                    className="text-[#7c3aed] hover:bg-red-100 hover:text-red-900"
                    data-testid="button-remove-referee"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRefereeSelect(true)}
                    className="h-10 border-2 border-[#4c1d95] text-[#4c1d95] font-pixel-text font-bold text-base"
                    data-testid="button-choose-referee"
                  >
                    {room.settings?.enableVoting ? <span className="text-xs text-red-500 ml-2">(سيلغي التصويت)</span> : 'اختر حكم'}
                  </Button>
                )}
              </div>

              <AnimatePresence>
                {showRefereeSelect && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 pt-4 border-t-2 border-[#4c1d95]/20 overflow-hidden"
                  >
                    <p className="text-base text-[#4c1d95] mb-3 font-pixel-text font-bold">اختر واحد من اللاعبين:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {room.players.map((player) => (
                        <Button
                          key={player.id}
                          variant="outline"
                          className="justify-start gap-2 h-12 border-2 border-[#4c1d95] text-[#4c1d95] font-pixel-text font-bold"
                          onClick={() => handleSetReferee(player.id)}
                          data-testid={`button-select-referee-${player.id}`}
                        >
                          {player.isHost && <Crown className="w-4 h-4 text-orange-500" />}
                          <span className="truncate text-base">{player.name}</span>
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-3 text-[#7c3aed] hover:bg-[#7c3aed]/10 font-pixel-text font-bold text-base"
                      onClick={() => setShowRefereeSelect(false)}
                    >
                      إلغاء
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </RetroCard>
          </motion.div>
        )}

        <motion.div
          className="space-y-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {!currentPlayer?.isReady && (
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="primary"
                size="lg"
                className="w-full h-16 text-xl font-pixel-title"
                onClick={setReady}
                data-testid="button-ready"
              >
                <Check className="w-6 h-6 ml-2" />
                أنا جاهز!
              </Button>
            </motion.div>
          )}

          {currentPlayer?.isReady && !isHost && (
            <motion.div
              className="text-center p-4 bg-gradient-to-b from-white to-[#faf5ff] rounded-xl border-[3px] border-[#4c1d95] shadow-[4px_4px_0_0_#2e1065,_0_0_15px_rgba(139,92,246,0.2)]"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <Check className="w-8 h-8 text-[#7c3aed] mx-auto mb-2" />
              </motion.div>
              <p className="font-bold text-[#4c1d95] font-pixel-text">أنت جاهز!</p>
              <p className="text-sm text-[#7c3aed] font-bold font-pixel-text">في انتظار باقي اللاعبين...</p>
            </motion.div>
          )}

          {isHost && (
            <motion.div
              whileHover={{ scale: canStart ? 1.02 : 1 }}
              whileTap={{ scale: canStart ? 0.98 : 1 }}
            >
              <Button
                size="lg"
                variant={canStart ? "secondary" : "default"}
                className={`w-full h-16 text-lg font-pixel-title ${!canStart ? 'opacity-50 cursor-not-allowed bg-gray-400 border-gray-600' : ''}`}
                onClick={startGame}
                disabled={!canStart}
                data-testid="button-start-game"
              >
                <Play className="w-6 h-6 ml-2" />
                {allReady ? 'ابدأ اللعبة!' : 'في انتظار اللاعبين...'}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div >
  );
}

