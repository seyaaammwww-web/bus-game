import { Copy, Check, Play, Users, Shield, Crown, Sparkles, X, Home, LogOut, Settings, UserX, Wifi, Minus, Plus, Gavel } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
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
import { HostControls } from '@/components/HostControls';
import { useToast } from '@/hooks/use-toast';
import { BusDivider, LoadingBlocks, CornerStuds } from '@/components/ui/PixelDetails';

export default function Lobby() {
  const { state, currentPlayer, isHost, setReady, startGame, setReferee, removeReferee, referee, disconnect, updateSettings, kickPlayer } = useGame();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);
  const [showRefereeSelect, setShowRefereeSelect] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [customCats, setCustomCats] = useState(categories);

  if (!state.room) return null;
  const room = state.room;
  const otherPlayers = room.players.filter(p => p.id !== state.playerId && p.id !== room.refereeId);
  const otherPlayersReady = otherPlayers.length === 0 || otherPlayers.every(p => p.isReady);
  const canStart = isHost && otherPlayersReady;

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
            <LogOut className="w-5 h-5" /></Button>

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
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FFFEE5] border-[3px] border-[#350D7A] rounded-sm mb-4 shadow-pixel"
          >
            <Sparkles className="w-6 h-6 text-[#6714A8]" />
            <span className="font-bold text-lg text-[#350D7A] font-pixel-text">غرفة الانتظار</span>
          </motion.div>
          <h1 className="text-5xl font-pixel-title mb-3 text-white font-bold [text-shadow:3px_3px_0_#350D7A]">
            في الانتظار<span className="pw-dots" />
          </h1>
          <p className="text-3xl text-[#FFFDCC] font-bold font-pixel-text mb-3">ادعي أصحابك!</p>
          <div className="flex justify-center">
            <LoadingBlocks />
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <RetroCard className="mb-6 relative">
            <CornerStuds />
            <div className="text-center">
              <p className="text-lg text-[#350D7A] font-bold mb-3 font-pixel-text">كود الغرفة</p>
              <div className="flex items-center justify-center gap-4">
                <motion.div
                  className="flex gap-2"
                  dir="ltr"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: isMobile ? 100 : 200, delay: 0.2 }}
                >
                  {room.code.split('').map((char, i) => (
                    <motion.span
                      key={i}
                      className="pw-code-tile w-14 h-16 flex items-center justify-center text-3xl bg-[#6714A8] text-[#FFFEE2] rounded-sm shadow-pixel border-[3px] border-[#350D7A] font-pixel-title"
                      style={{ animationDelay: `${i * 0.15}s` }}
                      initial={isMobile ? { opacity: 0 } : { rotateY: 90 }}
                      animate={isMobile ? { opacity: 1 } : { rotateY: 0 }}
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
                  className="h-16 w-16"
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
                className="text-sm text-[#350D7A] mt-4 font-pixel-text font-bold"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                شاركه مع أصحابك عشان ينضموا
              </motion.p>
              <BusDivider className="mt-3" />
            </div>
          </RetroCard>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <RetroCard className="mb-6">
            <div className="flex flex-row items-center justify-between gap-2 pb-4 border-b-2 border-[#350D7A]/10 mb-3">
              <h2 className="text-xl flex items-center gap-2 font-pixel-title text-[#350D7A] font-bold">
                <Users className="w-6 h-6 text-[#6714A8]" />
                اللاعبين
              </h2>
              <motion.span
                className="text-sm px-4 py-2 bg-[#6714A8] text-[#FFFEE2] rounded-sm font-bold border-2 border-[#350D7A] font-pixel-text text-lg shadow-[2px_2px_0_0_#350D7A]"
                animate={{ scale: room.players.length >= 1 ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: room.players.length >= 1 ? Infinity : 0, duration: 1.5 }}
              >
                {room.players.length} / 8
              </motion.span>
            </div>
            <div className="space-y-3">
              {/* Round Count Picker (Host only) — STYLE-1 FIX: use retro Button components */}
              {isHost && (
                <div className="flex items-center justify-between p-3 bg-[#FFFDCC] rounded-sm border-2 border-[#350D7A]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#6714A8] rounded-sm flex items-center justify-center text-[#FFFEE2] text-sm font-bold border-2 border-[#350D7A]">
                      {room.totalRounds}
                    </div>
                    <div>
                      <p className="font-bold text-[#350D7A] font-pixel-text text-sm">عدد الجولات</p>
                      <p className="text-[10px] text-[#350D7A]/70 font-pixel-text">بين 3 و 20 جولة</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateSettings({ totalRounds: Math.max(3, room.totalRounds - 1) })}
                      disabled={room.totalRounds <= 3}
                      className="w-9 h-9"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-pixel-title text-[#350D7A] text-base font-bold">{room.totalRounds}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateSettings({ totalRounds: Math.min(20, room.totalRounds + 1) })}
                      disabled={room.totalRounds >= 20}
                      className="w-9 h-9"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Voting Toggle — STYLE-3 FIX: full-width retro toggle with visual feedback */}
              {isHost ? (
                <button
                  onClick={() => updateSettings({ votingEnabled: !room.settings?.votingEnabled })}
                  className={`w-full flex items-center justify-between p-3 rounded-sm border-2 border-[#350D7A] transition-colors ${room.settings?.votingEnabled
                    ? 'bg-[#FFF3B6] shadow-pixel-sm'
                    : 'bg-[#FFFDCC]'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-sm border-2 border-[#350D7A] flex items-center justify-center text-[#FFFEE2] transition-colors ${room.settings?.votingEnabled ? 'bg-[#6714A8]' : 'bg-[#350D7A]/40'
                      }`}>
                      <Gavel className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#350D7A] font-pixel-text text-sm">التحكيم الديمقراطي</p>
                      <p className="text-[10px] text-[#350D7A]/70 font-pixel-text">
                        {referee ? <span className="text-red-500 font-bold">سيلغي الحكم الحالي</span> : 'اللاعبين يصوتوا على الإجابات'}
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-sm border-[2px] font-bold font-pixel-text text-xs transition-colors ${room.settings?.votingEnabled
                    ? 'border-[#6714A8] bg-[#6714A8]/10 text-[#6714A8]'
                    : 'border-[#350D7A]/20 bg-[#350D7A]/10 text-[#350D7A]/40'
                    }`}>
                    {room.settings?.votingEnabled ? 'مفعل' : 'معطل'}
                  </div>
                </button>
              ) : (
                room.settings?.votingEnabled && (
                  <div className="flex items-center gap-2 p-2 bg-[#FFFDCC] rounded-sm border-2 border-[#350D7A] justify-center mb-2">
                    <Gavel className="w-4 h-4 text-[#6714A8]" />
                    <span className="text-xs font-bold text-[#350D7A] font-pixel-text">نظام التحكيم الديمقراطي مفعل</span>
                  </div>
                )
              )}

              {room.settings?.customCategories && room.settings.customCategories.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-[#FFC48B] rounded-sm border-2 border-[#350D7A] justify-center mb-2">
                  <span className="text-xs font-bold text-[#350D7A] font-pixel-text">الإجابات المخصصة تحتاج تصويت اللاعبين</span>
                </div>
              )}

              {room.settings?.votingEnabled && room.players.length === 1 && (
                <div className="flex items-center gap-2 p-2 bg-[#6714A8]/10 rounded-lg border border-[#6714A8]/30 justify-center mb-2">
                  <span className="text-xs font-bold text-[#350D7A] font-pixel-text">في اللعب الفردي تُرفض الإجابات غير الموجودة في القاموس — فعّل التصويت مع أصدقاء لاقتراح كلمات جديدة</span>
                </div>
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
                      className="relative"
                    >
                      <PlayerCard
                        player={player}
                        isCurrentPlayer={player.id === state.playerId}
                        isReferee={player.id === room.refereeId}
                        index={index}
                      />
                      {/* STYLE-2 FIX: In lobby, only show Kick button — score adjustments are meaningless here (all scores = 0) */}
                      {isHost && player.id !== state.playerId && (
                        <div className="absolute top-2 left-2 z-10 scale-90">
                          <HostControls type="player_row" targetPlayer={player} />
                        </div>
                      )}
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
            <RetroCard className="border-dashed border-purple-300/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-sm bg-[#6714A8]/20 flex items-center justify-center border-2 border-[#350D7A]">
                    <Shield className="w-6 h-6 text-[#6714A8]" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-[#350D7A] font-pixel-text">الحكم (اختياري)</p>
                    <p className="text-base text-[#6714A8] font-bold font-pixel-text">
                      {referee ? referee.name : 'اختر حكم للمباراة'}
                    </p>
                  </div>
                </div>
                {referee ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeReferee()}
                    className="text-[#6714A8] hover:bg-red-100 hover:text-red-900"
                    data-testid="button-remove-referee"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRefereeSelect(true)}
                    className="h-10 border-2 border-[#350D7A] text-[#350D7A] font-pixel-text font-bold text-base"
                    data-testid="button-choose-referee"
                  >
                    {room.settings?.votingEnabled ? <span className="text-xs text-red-500 ml-2">(سيلغي التصويت)</span> : 'اختر حكم'}
                  </Button>
                )}
              </div>

              <AnimatePresence>
                {showRefereeSelect && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 pt-4 border-t-2 border-[#350D7A]/20 overflow-hidden"
                  >
                    <p className="text-base text-[#350D7A] mb-3 font-pixel-text font-bold">اختر واحد من اللاعبين:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {room.players
                        .filter((player) => !player.isHost) // BUG-11 FIX: Host cannot be their own referee
                        .map((player) => (
                          <Button
                            key={player.id}
                            variant="outline"
                            className="justify-start gap-2 h-12 border-2 border-[#350D7A] text-[#350D7A] font-pixel-text font-bold"
                            onClick={() => handleSetReferee(player.id)}
                            data-testid={`button-select-referee-${player.id}`}
                          >
                            <span className="truncate text-base">{player.name}</span>
                          </Button>
                        ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-3 text-[#6714A8] hover:bg-[#6714A8]/10 font-pixel-text font-bold text-base"
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
          {!currentPlayer?.isReady && !isHost && (
            <motion.div
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <Button
                variant="primary"
                size="lg"
                className="w-full h-16 text-xl font-pixel-title shine-effect relative overflow-hidden"
                onClick={setReady}
                data-testid="button-ready"
              >
                <Check className="w-6 h-6 ml-2 absolute right-4" />
                أنا جاهز!
              </Button>
            </motion.div>
          )}

          {currentPlayer?.isReady && !isHost && (
            <motion.div
              className="relative text-center p-4 surface-card"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {/* Pixel "READY" stamp slams in over the corner */}
              <div className="pw-stamp absolute -top-3 -left-2 bg-[#6714A8] text-[#FFFEE2] border-[3px] border-[#350D7A] rounded-sm px-2 py-0.5 font-pixel-title text-xs shadow-pixel-sm">
                جاهز
              </div>
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <Check className="w-8 h-8 text-[#6714A8] mx-auto mb-2" />
              </motion.div>
              <p className="font-bold text-[#350D7A] font-pixel-text">أنت جاهز!</p>
              <p className="text-sm text-[#6714A8] font-bold font-pixel-text">
                في الانتظار<span className="pw-dots" />
              </p>
            </motion.div>
          )}

          {isHost && (
            <motion.div
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
  <div className="relative group">
    <Button
      variant={canStart ? 'primary' : 'secondary'}
      className={`w-full h-16 text-lg relative font-pixel-title ${!canStart ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
      onClick={() => {
        if (!canStart) {
          toast({
            title: 'تنبيه',
            description: 'لازم كل اللاعبين يضغطوا "أنا جاهز" الأول!',
            variant: 'destructive',
          });
          return;
        }
        startGame();
      }}
      data-testid="button-start-game"
    >
      <Play className="w-6 h-6 absolute right-4" />
      {otherPlayersReady ? 'ابدأ!' : <span>في الانتظار<span className="pw-dots" /></span>}
    </Button>
    {!canStart && isHost && (
      <div className="absolute inset-0 z-10 cursor-not-allowed" onClick={() => {
        toast({
          title: 'تنبيه',
          description: 'لازم كل اللاعبين يضغطوا "أنا جاهز" الأول!',
          variant: 'destructive',
        });
      }} />
    )}
  </div>
            </motion.div>
          )}
        </motion.div>
      </div >
    </div >
  );
}

