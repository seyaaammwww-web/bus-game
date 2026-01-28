import { Copy, Check, Play, Users, Shield, Crown, Sparkles, X, Home, LogOut, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { categories } from '@shared/schema';
import { PlayerCard } from '@/components/PlayerCard';
import { useGame } from '@/lib/gameContext';
import ArcadeBackground from '@/components/ArcadeBackground';
import { RetroCard } from '@/components/ui/RetroCard';

export default function Lobby() {
  const { state, currentPlayer, isHost, setReady, startGame, setReferee, removeReferee, referee, disconnect, updateSettings } = useGame();
  const [copied, setCopied] = useState(false);
  const [showRefereeSelect, setShowRefereeSelect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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

  return (
    <div className="min-h-screen p-4 overflow-hidden relative text-white font-pixel-text">
      <ArcadeBackground />
      <div className="max-w-md mx-auto relative z-10">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="text-white hover:bg-white/10"
            data-testid="button-exit-lobby"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <span className="text-[12px] text-white/80 font-pixel-text tracking-tight animate-pulse">BY MOHAMED SEYAM</span>
        </div>

        <motion.div
          className="text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="w-5 h-5 text-white" />
            <span className="font-bold text-white">غرفة الانتظار</span>
          </motion.div>
          <h1 className="text-2xl font-pixel-title mb-2 text-white">في انتظار اللاعبين...</h1>
          <p className="text-white/80">ادعي أصحابك وعيلتك!</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <RetroCard className="mb-6">
            <div className="text-center">
              <p className="text-sm text-[#31093A]/70 mb-2 font-pixel-text">كود الغرفة</p>
              <div className="flex items-center justify-center gap-3">
                <motion.div
                  className="flex gap-1"
                  dir="ltr"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  {room.code.split('').map((char, i) => (
                    <motion.span
                      key={i}
                      className="w-12 h-14 flex items-center justify-center text-2xl font-bold bg-[#31093A] text-white rounded-lg shadow-lg"
                      initial={{ rotateY: 90 }}
                      animate={{ rotateY: 0 }}
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
                  className="border-[#2C0834] text-[#2C0834] hover:bg-[#2C0834]/10"
                  data-testid="button-copy-code"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <motion.p
                className="text-xs text-[#31093A]/50 mt-3"
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
            <div className="flex flex-row items-center justify-between gap-2 pb-3">
              <h2 className="text-lg flex items-center gap-2 font-pixel-title text-[#31093A]">
                <Users className="w-5 h-5 text-primary" />
                اللاعبين
              </h2>
              <motion.span
                className="text-sm px-3 py-1 bg-[#31093A]/10 rounded-full font-bold text-[#31093A]"
                animate={{ scale: room.players.length >= 1 ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: room.players.length >= 1 ? Infinity : 0, duration: 1.5 }}
              >
                {room.players.length} / 8
              </motion.span>
            </div>
            <div className="space-y-2">
              <AnimatePresence>
                {room.players.map((player, index) => (
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
            <RetroCard className="border-2 border-dashed !bg-accent/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#31093A]">الحكم (اختياري)</p>
                    <p className="text-xs text-[#31093A]/70">
                      {referee ? referee.name : 'اختر حكم للمباراة'}
                    </p>
                  </div>
                </div>
                {referee ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeReferee()}
                    className="text-[#31093A]"
                    data-testid="button-remove-referee"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRefereeSelect(true)}
                    className="border-[#2C0834] text-[#2C0834]"
                    data-testid="button-choose-referee"
                  >
                    اختر حكم
                  </Button>
                )}
              </div>

              <AnimatePresence>
                {showRefereeSelect && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 pt-4 border-t border-[#31093A]/10 overflow-hidden"
                  >
                    <p className="text-sm text-[#31093A]/70 mb-3 font-pixel-text">اختر واحد من اللاعبين:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {room.players.map((player) => (
                        <Button
                          key={player.id}
                          variant="outline"
                          className="justify-start gap-2 border-[#2C0834] text-[#2C0834]"
                          onClick={() => handleSetReferee(player.id)}
                          data-testid={`button-select-referee-${player.id}`}
                        >
                          {player.isHost && <Crown className="w-3 h-3 text-yellow-500" />}
                          <span className="truncate">{player.name}</span>
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-[#31093A]"
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
                className="w-full h-14 text-lg font-bold bg-[#2C0834] text-white hover:bg-[#31093A] font-pixel-title"
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
              className="text-center p-4 bg-white/10 rounded-xl border-2 border-white/20"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <Check className="w-8 h-8 text-white mx-auto mb-2" />
              </motion.div>
              <p className="font-medium text-white">أنت جاهز!</p>
              <p className="text-sm text-white/60">في انتظار باقي اللاعبين...</p>
            </motion.div>
          )}

          {isHost && (
            <motion.div
              whileHover={{ scale: canStart ? 1.02 : 1 }}
              whileTap={{ scale: canStart ? 0.98 : 1 }}
            >
              <Button
                className="w-full h-14 text-lg font-bold bg-accent text-white shadow-lg font-pixel-title disabled:opacity-50"
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

        <RetroCard className="mt-6">
          <h3 className="font-bold mb-3 flex items-center gap-2 font-pixel-title text-[#31093A]">
            <Sparkles className="w-4 h-4 text-primary" />
            قواعد اللعبة
          </h3>
          <ul className="text-sm text-[#31093A]/80 space-y-2 font-pixel-text">
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#31093A]/10 flex items-center justify-center text-[10px] font-bold">10</span>
              جولات، كل جولة بحرف مختلف
            </li>
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#31093A]/10 flex items-center justify-center text-[10px] font-bold">45</span>
              ثانية لكل جولة
            </li>
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#31093A]/10 flex items-center justify-center text-xs">🚌</span>
              اضغط "أوتوبيس كومبليت" لو خلصت بدري
            </li>
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-[10px] font-bold text-green-600">20</span>
              نقطة للإجابة الفريدة
            </li>
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center text-[10px] font-bold text-yellow-600">10</span>
              نقاط للإجابة المتكررة
            </li>
          </ul>
        </RetroCard>
      </div>
    </div>
  );
}
