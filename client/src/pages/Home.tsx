// ... imports
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RetroCard } from '@/components/ui/RetroCard';
import { useGame } from '@/lib/gameContext';
import { resumeAudioContext } from '@/lib/sounds';
import { Tutorial } from '@/components/Tutorial';
import { HelpCircle } from 'lucide-react';
import { RetroQuote } from '@/components/ui/RetroQuote';
import { PixelReveal } from '@/components/ui/PixelReveal';
import { Text3D } from '@/components/ui/Text3D';
import WorkOSBackground from '@/components/WorkOSBackground';





export default function Home() {
  const { createRoom, joinRoom, state } = useGame();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
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

  useEffect(() => {
    if (state.error && isLoading) {
      setIsLoading(false);
    }
  }, [state.error]);

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



  // ... inside component
  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative text-white">

      {/* Backgrounds */}
      {isMobileView ? (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40 mobile-juicy-bg">
          <div className="pixel-rain pixel-rain-1"></div>
          <div className="pixel-rain pixel-rain-2"></div>
          <div className="pixel-rain pixel-rain-3"></div>
        </div>
      ) : (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <WorkOSBackground />
        </div>
      )}

      {showHelp && <Tutorial onClose={() => setShowHelp(false)} />}

      {/* Large Floating Help Button */}
      <motion.button
        className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-[#FFFDD1] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#2e1065] border-[3px] border-[#2e1065] hover:bg-[#FFFEF0] hover:scale-110 active:scale-95 transition-all"
        onClick={() => setShowHelp(true)}
        whileHover={isMobileView ? {} : { scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <span className="text-2xl font-bold text-[#2e1065] font-pixel-title">؟</span>
      </motion.button>

      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: isMobileView ? 100 : 200, damping: 20 }}
        className="text-center mb-12 relative z-10"
      >
        <div className={`logo-container mb-2 animate-slow-float`}>
          {/* Logo with shine effect - uses CSS mask to constrain glow to logo shape */}
          <img
            src="/assets/logo.png"
            alt="أوتوبيس كومبليت"
            className="w-full max-w-[500px] object-contain pixelated"
          />
        </div>

        <div dir="ltr" className="flex justify-center mt-4">
          <span className="typewriter-text text-sm md:text-base font-pixel-text text-[#FEFADE]/90 tracking-widest uppercase">
            By Mohamed Seyam
          </span>
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
            {(state.error?.includes('محاولات') || state.error?.includes('الاتصال')) && (
              <Button
                variant="outline"
                className="mt-4 bg-white/20 hover:bg-white/30 text-white font-pixel-text border-white/40 border-2 shadow-sm"
                onClick={() => window.location.reload()}
              >
                إعادة المحاولة
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {mode === 'home' && (
          <motion.div
            key="home"
            className="flex flex-col gap-6 w-full max-w-sm relative z-10"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >


            <motion.div
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <Button
                size="lg"
                variant="primary"
                className="w-full h-20 text-3xl font-pixel-title shine-effect relative overflow-hidden"
                onClick={() => setMode('create')}
                data-testid="button-create-room"
              >
                <Plus className="w-8 h-8 ml-2 absolute right-4" />
                غرفة جديدة
              </Button>
            </motion.div>

            <motion.div
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <Button
                size="lg"
                variant="retro"
                className="w-full h-20 text-3xl font-pixel-title shine-effect relative overflow-hidden"
                onClick={() => setMode('join')}
                data-testid="button-join-room"
              >
                <Users className="w-8 h-8 ml-2 absolute right-4" />
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
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className="text-3xl font-bold mb-3 block font-pixel-title">اسمك</label>
                    <Input
                      type="text"
                      placeholder="اكتب اسمك هنا"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      maxLength={20}
                      className="h-20 text-2xl font-pixel-text font-bold"
                      data-testid="input-player-name"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full h-20 text-3xl font-bold font-pixel-title shine-effect relative overflow-hidden"
                      disabled={playerName.trim().length < 2 || isLoading}
                      data-testid="button-create-confirm"
                    >
                      {isLoading ? (
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          جاري...
                        </motion.span>
                      ) : (
                        'أنشئ الغرفة'
                      )}
                    </Button>
                  </motion.div>
                </form>
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
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); handleJoin(); }} className="space-y-4">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label className="text-3xl font-bold mb-3 block font-pixel-title">اسمك</label>
                    <Input
                      type="text"
                      placeholder="اكتب اسمك هنا"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      maxLength={20}
                      className="h-20 text-2xl font-pixel-text font-bold"
                      data-testid="input-player-name-join"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label className="text-3xl font-bold mb-3 block font-pixel-title">كود الغرفة</label>
                    <Input
                      type="text"
                      placeholder="XXXX"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={4}
                      className="text-center text-5xl tracking-widest font-bold h-20 font-pixel-title"
                      data-testid="input-room-code"
                    />
                  </motion.div>
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Button
                      type="submit"
                      variant="retro"
                      className="w-full h-14 text-xl font-bold font-pixel-title shine-effect relative overflow-hidden"
                      disabled={playerName.trim().length < 2 || roomCode.length !== 4 || isLoading}
                      data-testid="button-join-confirm"
                    >
                      {isLoading ? (
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                        >
                          جاري...
                        </motion.span>
                      ) : (
                        'انضم للغرفة'
                      )}
                    </Button>
                  </motion.div>
                </form>
              </CardContent>
            </RetroCard>
          </motion.div>
        )}


      </AnimatePresence>




    </div>
  );
}

