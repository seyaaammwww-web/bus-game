// ... imports
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RetroCard } from '@/components/ui/RetroCard';
import { useGame } from '@/lib/gameContext';
import { playClick } from '@/lib/sounds';
import { Tutorial } from '@/components/Tutorial';
import { HelpCircle } from 'lucide-react';
import { RetroQuote } from '@/components/ui/RetroQuote';
import { PixelReveal } from '@/components/ui/PixelReveal';
import { Text3D } from '@/components/ui/Text3D';
import { PixelAvatar } from '@/components/ui/PixelAvatar';
import { useIsMobile } from '@/hooks/useIsMobile';
import DynamicPixelBackground from '@/components/DynamicPixelBackground';

export default function Home() {
  const { createRoom, joinRoom, state } = useGame();
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleInteraction = () => {
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



  // ... inside component
  const isMobileView = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden relative text-white">

      {showHelp && <Tutorial onClose={() => setShowHelp(false)} />}

      {!isMobileView && <DynamicPixelBackground />}

      {isMobileView && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={`rain-${i}`}
              className="absolute w-[2px] bg-white h-[30px]"
              style={{ left: `${Math.random() * 100}%`, top: `-${Math.random() * 20}%` }}
              animate={{ y: ['0vh', '120vh'] }}
              transition={{ duration: 0.4 + Math.random() * 0.4, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        </div>
      )}

      {/* Large Floating Help Button */}
      <motion.button
        className="fixed bottom-4 right-4 z-50 w-12 h-12 bg-[#FFFDD1] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#2e1065] border-[3px] border-[#2e1065] hover:bg-[#FFFEF0] hover:scale-110 active:scale-95 transition-all"
        onClick={() => setShowHelp(true)}
        whileHover={isMobileView ? {} : { scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <span className="text-2xl font-bold text-[#2e1065] font-pixel-title">؟</span>
      </motion.button>

      <AnimatePresence>
        {mode !== 'home' && (
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="text-center mb-8 relative z-10"
          >
            <img
              src="/assets/logo.png"
              alt="أوتوبيس كومبليت"
              className="w-64 max-w-full mx-auto object-contain pixelated"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {state.error && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -10 }}
            className="bg-destructive/10 border-2 border-destructive/30 text-destructive px-6 py-4 rounded-2xl mb-6 text-center max-w-md shadow-lg relative z-20"
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
            className="w-full max-w-lg relative z-10"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="relative h-[480px] md:h-[520px] overflow-hidden rounded-3xl border-[6px] border-[#4c1d95] shadow-[8px_8px_0_#2e1065] bg-gradient-to-b from-[#1a0533]/90 to-[#2e1065] backdrop-blur-md">

              {/* Logo Area */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[90%] z-20 text-center">
                <img
                  src="/assets/logo.png"
                  alt="أوتوبيس كومبليت"
                  className="w-full max-w-[340px] mx-auto object-contain pixelated drop-shadow-[0_0_15px_rgba(251,191,36,0.3)] animate-slow-float"
                />
              </div>

              {/* Neon Ticket Buttons */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] flex flex-col gap-4 z-20">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="lg"
                    className="w-full h-16 md:h-20 text-2xl md:text-3xl font-pixel-title border-[3px] border-[#fbbf24] bg-[#4c1d95]/90 text-[#fbbf24] hover:bg-[#fbbf24] hover:text-[#4c1d95] shadow-[0_0_20px_rgba(251,191,36,0.5)] transition-all"
                    onClick={() => { playClick(); setMode('create'); }}
                    data-testid="button-create-room"
                  >
                    <Plus className="w-6 h-6 md:w-8 md:h-8 ml-2" />
                    غرفة جديدة
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="lg"
                    className="w-full h-16 md:h-20 text-2xl md:text-3xl font-pixel-title border-[3px] border-[#e9d5ff] bg-transparent text-[#e9d5ff] hover:bg-[#e9d5ff] hover:text-[#4c1d95] shadow-[0_0_15px_rgba(233,213,255,0.2)] transition-all"
                    onClick={() => { playClick(); setMode('join'); }}
                    data-testid="button-join-room"
                  >
                    <Users className="w-6 h-6 md:w-8 md:h-8 ml-2" />
                    انضم لغرفة
                  </Button>
                </motion.div>
              </div>
            </div>
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
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    className="w-full h-20 text-3xl font-bold bg-gradient-to-r from-primary to-secondary font-pixel-title"
                    onClick={() => { playClick(); handleCreate(); }}
                    disabled={playerName.trim().length < 2 || isLoading}
                    data-testid="button-create-confirm"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="4" />
                          <line x1="12" y1="2" x2="12" y2="8" />
                          <line x1="12" y1="16" x2="12" y2="22" />
                          <line x1="2" y1="12" x2="8" y2="12" />
                          <line x1="16" y1="12" x2="22" y2="12" />
                        </svg>
                        جاري الإنشاء...
                      </div>
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
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    className="w-full h-14 text-xl font-bold bg-gradient-to-r from-secondary to-primary font-pixel-text"
                    onClick={() => { playClick(); handleJoin(); }}
                    disabled={playerName.trim().length < 2 || roomCode.length !== 4 || isLoading}
                    data-testid="button-join-confirm"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <circle cx="12" cy="12" r="4" />
                          <line x1="12" y1="2" x2="12" y2="8" />
                          <line x1="12" y1="16" x2="12" y2="22" />
                          <line x1="2" y1="12" x2="8" y2="12" />
                          <line x1="16" y1="12" x2="22" y2="12" />
                        </svg>
                        جاري الانضمام...
                      </div>
                    ) : (
                      'انضم للغرفة'
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </RetroCard>
          </motion.div>
        )}


      </AnimatePresence>




    </div>
  );
}

