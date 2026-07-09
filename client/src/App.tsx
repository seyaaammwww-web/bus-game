import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider, useGame } from "@/lib/gameContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Home from "@/pages/Home";
import Lobby from "@/pages/Lobby";
import Game from "@/pages/Game";
import RefereeWaiting from "@/pages/RefereeWaiting";
import Results from "@/pages/Results";

import WorkOSBackground from "@/components/WorkOSBackground";

function GameRouter() {
  const { state, isReferee } = useGame();

  if (!state.room) return <Home />;

  switch (state.room.phase) {
    case 'lobby':
      return <Lobby />;
    case 'playing':
    case 'ai_processing':
      return isReferee ? <RefereeWaiting /> : <Game />;
    case 'results':
    case 'voting':
    case 'referee_review':
    case 'final':
      return <Results />;
    default:
      return <Home />;
  }
}



// ... imports

// Helper to check if mobile
const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024;

function BackgroundManager() {
  const { state } = useGame();

  // On mobile: reduce particle count for GPU performance, but keep all effects
  const mobile = isMobile();

  return <WorkOSBackground isMobile={mobile} />;
}

function ReconnectBanner() {
  const { state } = useGame();
  if (!state.reconnecting) return null;
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-amber-400/95 text-[#4c1d95] px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg border border-amber-500/40 backdrop-blur-md pointer-events-none">
      جاري إعادة الاتصال...
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider>
          <ReconnectBanner />
          <BackgroundManager />
          <ErrorBoundary>
            <GameRouter />
          </ErrorBoundary>
        </GameProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
