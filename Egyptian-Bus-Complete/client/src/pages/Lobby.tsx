import { Copy, Check, Play, Users, Shield, Crown, Sparkles, X, Home, LogOut, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { categories } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayerCard } from '@/components/PlayerCard';
import { useGame } from '@/lib/gameContext';

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
    <div className="min-h-screen bg-gradient-to-b from-background via-primary/5 to-muted/30 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={disconnect}
            className="text-destructive hover:bg-destructive/10"
            data-testid="button-exit-lobby"
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <span className="text-xs text-muted-foreground/60">BY MOHAMED SEYAM</span>
        </div>

        <motion.div
          className="text-center mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold text-primary">غرفة الانتظار</span>
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">في انتظار اللاعبين...</h1>
          <p className="text-muted-foreground">ادعي أصحابك وعيلتك!</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6 overflow-hidden border-2 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">كود الغرفة</p>
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
                        className="w-12 h-14 flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-primary to-secondary text-white rounded-lg shadow-lg"
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
                    className="hover-elevate"
                    data-testid="button-copy-code"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-accent" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <motion.p
                  className="text-xs text-muted-foreground mt-3"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  شاركه مع أصحابك عشان ينضموا
                </motion.p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                اللاعبين
              </CardTitle>
              <motion.span
                className="text-sm px-3 py-1 bg-primary/10 rounded-full font-bold"
                animate={{ scale: room.players.length >= 1 ? [1, 1.1, 1] : 1 }}
                transition={{ repeat: room.players.length >= 1 ? Infinity : 0, duration: 1.5 }}
              >
                {room.players.length} / 8
              </motion.span>
            </CardHeader>
            <CardContent className="space-y-2">
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
            </CardContent>
          </Card>
        </motion.div>

        {isHost && room.players.length >= 1 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mb-4"
          >
            <Card className="border-2 border-dashed border-accent/50 bg-accent/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">الحكم (اختياري)</p>
                      <p className="text-xs text-muted-foreground">
                        {referee ? referee.name : 'اختر حكم للمباراة'}
                      </p>
                    </div>
                  </div>
                  {referee ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeReferee()}
                      data-testid="button-remove-referee"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRefereeSelect(true)}
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
                      className="mt-4 pt-4 border-t overflow-hidden"
                    >
                      <p className="text-sm text-muted-foreground mb-3">اختر واحد من اللاعبين:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {room.players.map((player) => (
                          <Button
                            key={player.id}
                            variant="outline"
                            className="justify-start gap-2"
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
                        className="w-full mt-2"
                        onClick={() => setShowRefereeSelect(false)}
                      >
                        إلغاء
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
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
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-secondary"
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
              className="text-center p-4 bg-accent/10 rounded-xl border-2 border-accent/30"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <Check className="w-8 h-8 text-accent mx-auto mb-2" />
              </motion.div>
              <p className="font-medium">أنت جاهز!</p>
              <p className="text-sm text-muted-foreground">في انتظار باقي اللاعبين...</p>
            </motion.div>
          )}

          {isHost && (
            <motion.div
              whileHover={{ scale: canStart ? 1.02 : 1 }}
              whileTap={{ scale: canStart ? 0.98 : 1 }}
            >
              <Button
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-accent to-accent/80 shadow-lg"
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

        <motion.div
          className="mt-6 p-4 bg-card rounded-xl border border-card-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            قواعد اللعبة
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">10</span>
              جولات، كل جولة بحرف مختلف
            </li>
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">45</span>
              ثانية لكل جولة
            </li>
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-xs">🚌</span>
              اضغط "أوتوبيس كومبليت" لو خلصت بدري
            </li>
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-xs font-bold text-green-500">20</span>
              نقطة للإجابة الفريدة
            </li>
            <li className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center text-xs font-bold text-yellow-500">10</span>
              نقاط للإجابة المتكررة
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
