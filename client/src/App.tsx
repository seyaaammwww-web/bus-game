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
import { BusHUD } from "@/components/BusHUD";
import { SoundProvider } from "@/lib/soundManager";
import { useIsMobile } from "@/hooks/useIsMobile";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function GameRouter() {
  const { state } = useGame();

  if (!state.room) {
    return <Home />;
  }

  const { isReferee } = useGame();

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
    case 'voting':
    case 'referee_review':
    case 'final':
      return <Results />;
    default:
      return <Home />;
  }
}



// ... imports

function BackgroundManager() {
  const { state } = useGame();

  // Performance mode active on mobile to save GPU resources
  const performanceMode = useIsMobile();

  return <WorkOSBackground performanceMode={performanceMode} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SoundProvider>
          <GameProvider>
            <BackgroundManager />
            <BusHUD />
            <ErrorBoundary>
              <GameRouter />
            </ErrorBoundary>
          </GameProvider>
        </SoundProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
