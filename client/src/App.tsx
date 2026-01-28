import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider, useGame } from "@/lib/gameContext";
import Home from "@/pages/Home";
import Lobby from "@/pages/Lobby";
import Game from "@/pages/Game";
import Voting from "@/pages/Voting";
import RefereeReview from "@/pages/RefereeReview";
import RefereeWaiting from "@/pages/RefereeWaiting";
import Results from "@/pages/Results";

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
    case 'voting':
      return <Voting />;
    case 'referee_review':
      return <RefereeReview />;
    case 'results':
    case 'final':
      return <Results />;
    default:
      return <Home />;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider>
          <GameRouter />
        </GameProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
