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
      <div className="max-w-2xl mx-auto relative z-10">
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
          <span className="text-[12px] text-[#2C0834] font-pixel-text tracking-tight animate-pulse font-bold">BY MOHAMED SEYAM</span>
        </div>

        <motion.div
          className="text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFFDD1] border-[3px] border-[#2C0834] rounded-full mb-4 shadow-[4px_4px_0_0_#2C0834]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="w-6 h-6 text-[#2C0834]" />
            <span className="font-bold text-lg text-[#31093A] font-pixel-text">غرفة الانتظار</span>
          </motion.div>
          <h1 className="text-5xl font-pixel-title mb-3 text-white font-bold">في انتظار اللاعبين...</h1>
          <p className="text-3xl text-[#FFFDD1] font-bold font-pixel-text">ادعي أصحابك وعيلتك!</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <RetroCard className="mb-6">
            <div className="text-center">
              <p className="text-lg text-[#31093A] font-bold mb-3 font-pixel-text">كود الغرفة</p>
              <div className="flex items-center justify-center gap-4">
                <motion.div
                  className="flex gap-2"
                  dir="ltr"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  {room.code.split('').map((char, i) => (
                    <motion.span
                      key={i}
                      className="w-14 h-16 flex items-center justify-center text-3xl font-bold bg-[#31093A] text-[#F9D794] rounded-lg shadow-[4px_4px_0_0_#2C0834] border-2 border-[#2C0834] font-pixel-title"
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
                  className="h-16 w-16 border-[3px] border-[#2C0834] text-[#2C0834] hover:bg-[#2C0834] hover:text-[#FFFDD1] bg-[#FFFDD1] shadow-[4px_4px_0_0_#2C0834] active:translate-y-[2px] active:shadow-[2px_2px_0_0_#2C0834] rounded-none transition-all"
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
                className="text-sm text-[#31093A] mt-4 font-pixel-text font-bold"
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
            <div className="flex flex-row items-center justify-between gap-2 pb-4 border-b-2 border-[#2C0834]/10 mb-3">
              <h2 className="text-xl flex items-center gap-2 font-pixel-title text-[#31093A] font-bold">
                <Users className="w-6 h-6 text-primary" />
                اللاعبين
              </h2>
              <motion.span
                className="text-sm px-4 py-2 bg-[#31093A] text-[#F9D794] rounded-full font-bold border-2 border-[#2C0834] font-pixel-text text-lg"
                animate={{ scale: room.players.length >= 1 ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: room.players.length >= 1 ? Infinity : 0, duration: 1.5 }}
              >
                {room.players.length} / 8
              </motion.span>
            </div>
            <div className="space-y-3">
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
            <RetroCard className="border-[3px] border-dashed !bg-[#FFFDD1]/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#31093A]/10 flex items-center justify-center border-2 border-[#31093A]">
                    <Shield className="w-5 h-5 text-[#31093A]" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#31093A]">الحكم (اختياري)</p>
                    <p className="text-xs text-[#31093A] font-medium">
                      {referee ? referee.name : 'اختر حكم للمباراة'}
                    </p>
                  </div>
                </div>
                {referee ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeReferee()}
                    className="text-[#31093A] hover:bg-red-100 hover:text-red-900"
                    data-testid="button-remove-referee"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRefereeSelect(true)}
                    className="h-8 border-2"
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
                    className="mt-4 pt-4 border-t-2 border-[#31093A]/10 overflow-hidden"
                  >
                    <p className="text-sm text-[#31093A]/70 mb-3 font-pixel-text">اختر واحد من اللاعبين:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {room.players.map((player) => (
                        <Button
                          key={player.id}
                          variant="outline"
                          className="justify-start gap-2 h-10 border-2"
                          onClick={() => handleSetReferee(player.id)}
                          data-testid={`button-select-referee-${player.id}`}
                        >
                          {player.isHost && <Crown className="w-3 h-3 text-orange-500" />}
                          <span className="truncate">{player.name}</span>
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-[#31093A] hover:bg-[#31093A]/10"
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
                variant="retro"
                size="lg"
                className="w-full h-16 text-lg font-pixel-title bg-[#2C0834] text-[#F9D794] hover:bg-[#1C0524] border-[#F9D794]"
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
              className="text-center p-4 bg-[#FFFDD1] rounded-xl border-[3px] border-[#2C0834] shadow-[4px_4px_0_0_#2C0834]"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <Check className="w-8 h-8 text-[#2C0834] mx-auto mb-2" />
              </motion.div>
              <p className="font-bold text-[#31093A] font-pixel-text">أنت جاهز!</p>
              <p className="text-sm text-[#31093A] font-bold font-pixel-text">في انتظار باقي اللاعبين...</p>
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

        <RetroCard className="mt-6">
          <h3 className="font-bold mb-3 flex items-center gap-2 font-pixel-title text-[#31093A]">
            <Sparkles className="w-4 h-4 text-primary" />
            قواعد اللعبة
          </h3>
          <ul className="text-sm text-[#31093A] font-medium space-y-2 font-pixel-text">
            <li className="flex items-center gap-3 p-2 bg-[#31093A]/5 border border-[#31093A]/10">
              <span className="w-8 h-8 bg-[#31093A] text-[#F9D794] flex items-center justify-center text-sm font-bold border-2 border-[#2C0834] shadow-[2px_2px_0_0_#2C0834]">10</span>
              <span className="font-bold">جولات مختلفة</span>
            </li>
            <li className="flex items-center gap-3 p-2 bg-[#31093A]/5 border border-[#31093A]/10">
              <span className="w-8 h-8 bg-[#31093A] text-[#F9D794] flex items-center justify-center text-sm font-bold border-2 border-[#2C0834] shadow-[2px_2px_0_0_#2C0834]">45</span>
              <span className="font-bold">ثانية لكل جولة</span>
            </li>
            <li className="flex items-center gap-3 p-2 bg-[#31093A]/5 border border-[#31093A]/10">
              <span className="w-8 h-8 bg-white border-2 border-[#2C0834] flex items-center justify-center text-sm shadow-[2px_2px_0_0_#2C0834]">🚌</span>
              <span className="font-bold">اضغط "أوتوبيس كومبليت" لو خلصت!</span>
            </li>
            <li className="flex items-center gap-3 p-2 bg-[#31093A]/5 border border-[#31093A]/10">
              <span className="w-8 h-8 bg-green-500 text-white border-2 border-[#2C0834] flex items-center justify-center text-xs font-bold shadow-[2px_2px_0_0_#2C0834]">20</span>
              <span className="font-bold text-green-700">نقطة للإجابة المميزة</span>
            </li>
            <li className="flex items-center gap-3 p-2 bg-[#31093A]/5 border border-[#31093A]/10">
              <span className="w-8 h-8 bg-yellow-400 text-[#2C0834] border-2 border-[#2C0834] flex items-center justify-center text-xs font-bold shadow-[2px_2px_0_0_#2C0834]">10</span>
              <span className="font-bold text-yellow-700">نقاط للإجابة المكررة</span>
            </li>
          </ul>
        </RetroCard>
      </div>
    </div>
  );
}
