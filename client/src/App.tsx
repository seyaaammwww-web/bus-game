import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider, useGame } from "@/lib/gameContext";
import Home from "@/pages/Home";
import Lobby from "@/pages/Lobby";
import Game from "@/pages/Game";
import RefereeWaiting from "@/pages/RefereeWaiting";
import Results from "@/pages/Results";

import WorkOSBackground from "@/components/WorkOSBackground";

function GameRouter() {
  const { state, isReferee } = useGame();

  if (!state.room) {
    return <Home />;
  }

  switch (state.room.phase) {
    case 'lobby':
      return <Lobby />;
    case 'playing':
    case 'ai_processing':
      // Referee sees waiting screen, players see game
      if (isReferee) {
        return <RefereeWaiting />;
      }
      return <Game />;
    case 'results':
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

  // Performance mode active on mobile during critical phases
  const isCriticalPhase = state.room && (
    state.room.phase === 'playing' ||
    state.room.phase === 'ai_processing' ||
    state.room.phase === 'results' ||
    state.room.phase === 'final'
  );

  const performanceMode = isMobile() && isCriticalPhase;

  return <WorkOSBackground performanceMode={!!performanceMode} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider>
          <BackgroundManager />
          <GameRouter />
        </GameProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
