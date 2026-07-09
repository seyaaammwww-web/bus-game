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



  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pb-24 overflow-hidden relative text-white">

      {showHelp && <Tutorial onClose={() => setShowHelp(false)} />}

      {/* Large Floating Help Button — raised above the road scene */}
      <button
        className="fixed bottom-[70px] right-4 z-50 w-12 h-12 bg-[#FFFEE5] rounded-sm flex items-center justify-center border-[3px] border-[#350D7A] shadow-pixel hover:bg-[#FFFDD6] active:translate-x-[2px] active:translate-y-[2px] active:shadow-pixel-sm"
        onClick={() => setShowHelp(true)}
        aria-label="المساعدة"
      >
        <span className="text-2xl text-[#350D7A] font-pixel-title">؟</span>
      </button>

      <motion.div
        initial={{ y: -30, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className={`text-center relative z-10 ${mode === 'home' ? 'mb-8' : 'mb-4'}`}
      >
        <div className={`logo-container mb-1 animate-slow-float`}>
          {/* Logo with shine effect - uses CSS mask to constrain glow to logo shape */}
          <img
            src="/assets/logo.png"
            alt="أوتوبيس كومبليت"
            className={`w-full object-contain pixelated mx-auto transition-all duration-300 ${mode === 'home' ? 'max-w-[300px] md:max-w-[380px]' : 'max-w-[180px] md:max-w-[220px]'}`}
          />
        </div>

        {mode === 'home' && (
          <div dir="ltr" className="flex justify-center mt-2">
            <span className="typewriter-text text-xs md:text-sm font-pixel-text text-[#FEFADE]/90 tracking-widest uppercase">
              By Mohamed Seyam
            </span>
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {state.error && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -10 }}
            className="bg-[#FFFEE5] border-[3px] border-[#350D7A] text-[#FF6957] px-6 py-4 rounded-sm mb-6 text-center max-w-md shadow-pixel font-bold"
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
                className="mt-4 font-pixel-text"
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
            className="flex flex-col gap-4 w-full max-w-sm relative z-10"
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
                className="w-full h-16 text-2xl font-pixel-title shine-effect relative overflow-hidden"
                onClick={() => setMode('create')}
                data-testid="button-create-room"
              >
                <Plus className="w-6 h-6 ml-2 absolute right-4" />
                غرفة جديدة
              </Button>
            </motion.div>

            <motion.div
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <Button
                size="lg"
                variant="retro"
                className="w-full h-16 text-2xl font-pixel-title shine-effect relative overflow-hidden"
                onClick={() => setMode('join')}
                data-testid="button-join-room"
              >
                <Users className="w-6 h-6 ml-2 absolute right-4" />
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
              <CardHeader className="pb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 left-3"
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
                  <CardTitle className="flex items-center gap-2 font-pixel-title text-3xl">
                    <Plus className="w-6 h-6 text-[#6714A8]" />
                    غرفة جديدة
                  </CardTitle>
                </motion.div>
                <CardDescription className="font-pixel-text text-lg mt-1">أنشئ غرفة وادعي أصحابك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="text-2xl font-bold mb-2 block font-pixel-title">اسمك</label>
                  <Input
                    type="text"
                    placeholder="اكتب اسمك هنا"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="h-14 text-xl font-pixel-text font-bold"
                    data-testid="input-player-name"
                  />
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    variant="primary"
                    className="w-full h-14 text-2xl font-bold font-pixel-title shine-effect relative overflow-hidden"
                    onClick={handleCreate}
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
              <CardHeader className="pb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 left-3"
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
                  <CardTitle className="flex items-center gap-2 font-pixel-title text-3xl">
                    <Users className="w-6 h-6 text-secondary" />
                    انضم لغرفة
                  </CardTitle>
                </motion.div>
                <CardDescription className="font-pixel-text text-lg mt-1">اكتب كود الغرفة من صاحبك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="text-2xl font-bold mb-2 block font-pixel-title">اسمك</label>
                  <Input
                    type="text"
                    placeholder="اكتب اسمك هنا"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    className="h-14 text-xl font-pixel-text font-bold"
                    data-testid="input-player-name-join"
                  />
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="text-2xl font-bold mb-2 block font-pixel-title">كود الغرفة</label>
                  <Input
                    type="text"
                    placeholder="XXXX"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={4}
                    className="text-center text-4xl tracking-widest font-bold h-14 font-pixel-title"
                    data-testid="input-room-code"
                  />
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    variant="retro"
                    className="w-full h-14 text-xl font-bold font-pixel-title shine-effect relative overflow-hidden"
                    onClick={handleJoin}
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
              </CardContent>
            </RetroCard>
          </motion.div>
        )}


      </AnimatePresence>




    </div>
  );
}

