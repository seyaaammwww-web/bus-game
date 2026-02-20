import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Clock, Shield, Zap, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Player } from '@shared/schema';

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer?: boolean;
  isReferee?: boolean;
  showScore?: boolean;
  rank?: number;
  index: number;
}

const rankColors = ['bg-yellow-400', 'bg-gray-300', 'bg-amber-600'];
const rankEmojis = ['1', '2', '3'];

export const PlayerCard = React.memo(function PlayerCard({ player, isCurrentPlayer, isReferee, showScore, rank, index }: PlayerCardProps) {

  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 rounded-lg border-2 relative overflow-visible",
        isCurrentPlayer
          ? "bg-[#f5f3ff] border-[#7c3aed] shadow-[4px_4px_0_0_#4c1d95]"
          : "bg-white border-gray-900 shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]"
      )}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {/* Rank Badge */}
      {rank !== undefined && rank < 3 && (
        <div className="absolute -top-3 -left-2 z-20">
          <motion.div
            className={cn(
              "w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center font-bold font-pixel-text text-white shadow-sm",
              rankColors[rank]
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 + (index * 0.1) }}
          >
            {rankEmojis[rank]}
          </motion.div>
        </div>
      )}

      {/* Avatar Container */}
      <div className="relative p-2">
        <div className={cn(
          "relative flex items-center justify-center rounded-md border-2 overflow-hidden",
          isCurrentPlayer ? "w-14 h-14 border-[#7c3aed] bg-[#7c3aed]" : "w-12 h-12 border-black bg-gray-100"
        )}>
          {/* Background Pattern */}
          <div className={`absolute inset-0 opacity-20 ${isCurrentPlayer ? 'bg-[url("/patterns/pixel-dots.png")]' : ''}`} />

          {/* Letter */}
          <span className={cn(
            "relative z-10 font-bold font-pixel-title drop-shadow-md",
            isCurrentPlayer ? "text-3xl text-white" : "text-2xl text-gray-800"
          )}>
            {player.name.charAt(0)}
          </span>

          {/* Pixel Corners for Premium Layout */}
          {isCurrentPlayer && (
            <>
              <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#fbbf24] z-20" />
              <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-[#fbbf24] z-20" />
            </>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="flex-1 min-w-0 py-2 pr-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "font-bold truncate font-pixel-text text-base",
            isCurrentPlayer ? "text-[#4c1d95]" : "text-gray-900"
          )}>
            {player.name}
          </span>

          {/* Status Badges */}
          {player.isHost && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
          {isReferee && <Shield className="w-4 h-4 text-blue-500 fill-blue-500 shrink-0" />}

          {isCurrentPlayer && (
            <span className="text-[10px] bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20 px-1.5 py-0.5 rounded-sm font-bold font-pixel-text">
              أنت
            </span>
          )}
        </div>

        {/* Score or Status */}
        {showScore ? (
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 bg-black/5 rounded-sm border border-black/10 flex items-center gap-1">
              <span className="font-bold text-sm">{player.score}</span>
              <Trophy className="w-3 h-3 text-yellow-600" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {player.isReady ? (
              <div className="flex items-center gap-1 text-[#7c3aed] text-xs font-bold bg-[#7c3aed]/10 px-2 py-0.5 rounded-sm border border-[#7c3aed]/20">
                <Check className="w-3 h-3" />
                جاهز
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-400 text-xs font-bold bg-gray-50 px-2 py-0.5 rounded-sm border border-gray-200">
                <Clock className="w-3 h-3" />
                ينتظر
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

