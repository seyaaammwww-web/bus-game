// ... imports
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, ArrowLeft, Globe, Sparkles, Star, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RetroCard } from '@/components/ui/RetroCard';
import { useGame } from '@/lib/gameContext';
import { resumeAudioContext } from '@/lib/sounds';
import InstructionSlides from '@/components/InstructionSlides';
import { HelpCircle } from 'lucide-react';
import ArcadeBackground from '@/components/ArcadeBackground';
import { RetroQuote } from '@/components/ui/RetroQuote';
import { FloatingShapes } from '@/components/ui/FloatingShapes';

const PUBLIC_ROOM_CODE = 'PLAY';

export default function Home() {
  const { createRoom, joinRoom, joinPublicRoom, state } = useGame();
  const [mode, setMode] = useState<'home' | 'create' | 'join' | 'public'>('home');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleInteraction = () => {
      resumeAudioContext();
      window.removeEventListener('click', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  const handleCreate = () => {
    if (playerName.trim().length >= 2) {
      setIsLoading(true);
      createRoom(playerName.trim());
    }
  };

  const handleJoin = () => {
    if (playerName.trim().length >= 2 && roomCode.length === 4) {
      setIsLoading(true);
      joinRoom(roomCode.toUpperCase(), playerName.trim());
    }
  };

  const handleJoinPublic = () => {
    if (playerName.trim().length >= 2) {
      setIsLoading(true);
      joinPublicRoom(playerName.trim());
    }
  };

  // ... inside component
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative text-white">
      <ArcadeBackground />
      <FloatingShapes />
      <InstructionSlides isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Large Floating Help Button */}
      <motion.button
        className="fixed bottom-8 left-1/2 -translate-x-1/2 sm:left-auto sm:right-8 sm:translate-x-0 z-50 flex items-center gap-3 bg-[#FFFDD1] px-8 py-5 rounded-none shadow-[6px_6px_0px_0px_#2C0834] border-[3px] border-[#2C0834] hover:bg-[#FFFEF0] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#2C0834] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_#2C0834] transition-all group overflow-hidden"
        whileHover={{ scale: 1.05, y: -5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowHelp(true)}
      >
        <div className="relative z-10 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <HelpCircle className="w-6 h-6 text-primary" />
        </div>
        <div className="flex flex-col items-start leading-tight relative z-10">
          <span className="text-sm text-muted-foreground font-bold font-pixel-text">إزاي تلعب؟</span>
          <span className="text-lg font-bold text-[#31093A] font-pixel-text">شرح اللعبة 🎮</span>
        </div>
        <motion.span
          className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-[#2C0834]"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      </motion.button>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="text-center mb-8 relative z-10"
      >
        <div className="logo-container animate-slow-float logo-shine">
          <img
            src="/assets/logo.png"
            alt="أوتوبيس كومبليت"
            className="w-full max-w-[500px] object-contain pixelated drop-shadow-2xl"
          />
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {state.error && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -10 }}
            className="bg-destructive/10 border-2 border-destructive/30 text-destructive px-6 py-4 rounded-2xl mb-6 text-center max-w-md shadow-lg"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              {state.error}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {mode === 'home' && (
          <motion.div
            key="home"
            className="flex flex-col gap-4 w-full max-w-sm relative z-10"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                size="lg"
                variant="default"
                className="w-full h-16 text-xl tracking-wider font-pixel-text"
                onClick={() => setMode('public')}
                data-testid="button-public-room"
              >
                <Globe className="w-7 h-7 ml-3" />
                الغرفة العامة
                <motion.span
                  className="mr-2 bg-[#31093A]/20 px-2 py-0.5 rounded text-sm font-pixel-text"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  PLAY
                </motion.span>
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                size="lg"
                variant="secondary"
                className="w-full h-16 text-xl font-pixel-text"
                onClick={() => setMode('create')}
                data-testid="button-create-room"
              >
                <Plus className="w-6 h-6 ml-2" />
                غرفة جديدة
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                size="lg"
                variant="retro"
                className="w-full h-16 text-xl font-pixel-text"
                onClick={() => setMode('join')}
                data-testid="button-join-room"
              >
                <Users className="w-6 h-6 ml-2" />
                انضم لغرفة
              </Button>
            </motion.div>
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.div
            key="create"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full max-w-sm relative z-10"
          >
            <RetroCard className="shadow-xl">
              <CardHeader>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 left-4"
                  onClick={() => setMode('home')}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                >
                  <CardTitle className="flex items-center gap-2 font-pixel-title text-4xl">
                    <Plus className="w-7 h-7 text-primary" />
                    غرفة جديدة
                  </CardTitle>
                </motion.div>
                <CardDescription className="font-pixel-text text-xl mt-2">أنشئ غرفة وادعي أصحابك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="text-2xl font-bold mb-3 block font-pixel-text">اسمك</label>
                  <Input
                    type="text"
                    placeholder="اكتب اسمك هنا"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="h-16 text-xl font-pixel-text font-bold"
                    data-testid="input-player-name"
                  />
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    className="w-full h-14 text-xl font-bold bg-gradient-to-r from-primary to-secondary font-pixel-text"
                    onClick={handleCreate}
                    disabled={playerName.trim().length < 2 || isLoading}
                    data-testid="button-create-confirm"
                  >
                    {isLoading ? (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        جاري الإنشاء...
                      </motion.span>
                    ) : (
                      'أنشئ الغرفة'
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </RetroCard>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div
            key="join"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full max-w-sm relative z-10"
          >
            <RetroCard className="shadow-xl">
              <CardHeader>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 left-4"
                  onClick={() => setMode('home')}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                >
                  <CardTitle className="flex items-center gap-2 font-pixel-title text-4xl">
                    <Users className="w-7 h-7 text-secondary" />
                    انضم لغرفة
                  </CardTitle>
                </motion.div>
                <CardDescription className="font-pixel-text text-xl mt-2">اكتب كود الغرفة من صاحبك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="text-2xl font-bold mb-3 block font-pixel-text">اسمك</label>
                  <Input
                    type="text"
                    placeholder="اكتب اسمك هنا"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="h-16 text-xl font-pixel-text font-bold"
                    data-testid="input-player-name-join"
                  />
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="text-2xl font-bold mb-3 block font-pixel-text">كود الغرفة</label>
                  <Input
                    type="text"
                    placeholder="XXXX"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={4}
                    className="text-center text-4xl tracking-widest font-bold h-16 font-pixel-text"
                    data-testid="input-room-code"
                  />
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    className="w-full h-14 text-xl font-bold bg-gradient-to-r from-secondary to-primary font-pixel-text"
                    onClick={handleJoin}
                    disabled={playerName.trim().length < 2 || roomCode.length !== 4 || isLoading}
                    data-testid="button-join-confirm"
                  >
                    {isLoading ? (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        جاري الانضمام...
                      </motion.span>
                    ) : (
                      'انضم للغرفة'
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </RetroCard>
          </motion.div>
        )}

        {mode === 'public' && (
          <motion.div
            key="public"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full max-w-sm relative z-10"
          >
            <RetroCard className="shadow-xl">
              <CardHeader>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 left-4"
                  onClick={() => setMode('home')}
                  data-testid="button-back-public"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                >
                  <CardTitle className="flex items-center gap-2 font-pixel-title text-4xl">
                    <Globe className="w-7 h-7 text-accent" />
                    الغرفة العامة
                  </CardTitle>
                </motion.div>
                <CardDescription className="font-pixel-text text-xl mt-2">العب مع عائلتك وأصحابك في غرفة مشتركة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div
                  className="text-center p-6 bg-gradient-to-br from-accent/10 to-accent/20 rounded-2xl border-2 border-accent/30"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-xl text-muted-foreground mb-4 font-pixel-text font-bold">كود الغرفة العامة</p>
                  <motion.div
                    className="flex justify-center gap-2"
                    dir="ltr"
                    initial={{ y: 10 }}
                    animate={{ y: 0 }}
                  >
                    {PUBLIC_ROOM_CODE.split('').map((char, i) => (
                      <motion.span
                        key={i}
                        className="w-14 h-16 bg-accent text-white flex items-center justify-center text-3xl font-bold rounded-lg shadow-lg font-pixel-text"
                        initial={{ rotateY: 90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </motion.div>
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <label className="text-2xl font-bold mb-3 block font-pixel-text">اسمك</label>
                  <Input
                    type="text"
                    placeholder="اكتب اسمك هنا"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="h-16 text-xl font-pixel-text font-bold"
                    data-testid="input-player-name-public"
                  />
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    className="w-full h-14 text-xl font-bold bg-gradient-to-r from-accent to-accent/80 shadow-lg font-pixel-text"
                    onClick={handleJoinPublic}
                    disabled={playerName.trim().length < 2 || isLoading}
                    data-testid="button-join-public"
                  >
                    {isLoading ? (
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        جاري الانضمام...
                      </motion.span>
                    ) : (
                      'ادخل الغرفة العامة'
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </RetroCard>
          </motion.div>
        )}
      </AnimatePresence>



      <div className="fixed bottom-6 left-0 right-0 text-center">
        <p className="text-[12px] text-black font-pixel-text tracking-tight animate-pulse font-bold">
          BY MOHAMED SEYAM
        </p>
      </div>
    </div>
  );
}
