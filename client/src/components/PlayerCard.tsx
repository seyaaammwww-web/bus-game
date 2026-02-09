import { motion } from 'framer-motion';
import { Crown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Player } from '@shared/schema';

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer?: boolean;
  isReferee?: boolean;
  showScore?: boolean;
  rank?: number;
  index?: number;
}

export function PlayerCard({ player, isCurrentPlayer, isReferee, showScore, rank }: PlayerCardProps) {
  return (
    <motion.div
      layout
      className={cn(
        "w-20 m-1 flex flex-col items-center justify-center p-1 rounded-lg border-2 relative transition-all bg-white shadow-sm",
        // Ready state (Green border)
        player.isReady && !showScore && "border-green-500 bg-green-50/50",
        // Not ready (Gray border)
        !player.isReady && !showScore && "border-gray-200 text-gray-400",
        // Current player highlight
        isCurrentPlayer && "border-[#7c3aed] bg-[#f5f3ff]",
        // Score view
        showScore && "border-[#4c1d95] bg-white"
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Avatar / Letter */}
      <div className={cn(
        "w-10 h-10 rounded-md flex items-center justify-center text-lg font-bold border mb-1",
        isCurrentPlayer ? "bg-[#7c3aed] border-[#5b21b6] text-white" : "bg-gray-100 border-gray-300 text-gray-600",
        player.isReady && !isCurrentPlayer && "bg-green-100 border-green-300 text-green-700"
      )}>
        {player.name?.charAt(0).toUpperCase() || '?'}
      </div>

      {/* Name */}
      <span className={cn(
        "font-bold font-pixel-text text-[10px] sm:text-xs text-center truncate w-full px-1 leading-tight",
        isCurrentPlayer ? "text-[#4c1d95]" : "text-gray-700",
        !player.isReady && !showScore && "text-gray-400"
      )}>
        {player.name}
      </span>

      {/* Score if needed */}
      {showScore && (
        <span className="font-bold text-sm text-[#fbbf24] font-pixel-title mt-[-2px]">
          {player.score}
        </span>
      )}

      {/* Subtle Icons for Host/Referee */}
      <div className="absolute top-1 right-1 flex gap-0.5">
        {player.isHost && <Crown className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />}
        {isReferee && <Shield className="w-2.5 h-2.5 text-blue-500 fill-blue-500" />}
      </div>
    </motion.div>
  );
}

