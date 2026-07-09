import { motion } from 'framer-motion';
import { Crown, Check, Clock, Shield, Zap, Trophy, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { rankStyles } from '@/lib/designTokens';
import type { Player } from '@shared/schema';

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer?: boolean;
  isReferee?: boolean;
  showScore?: boolean;
  rank?: number;
  index: number;
}

const rankColorList = [rankStyles.gold, rankStyles.silver, rankStyles.bronze];
const rankEmojis = ['1', '2', '3'];

export function PlayerCard({ player, isCurrentPlayer, isReferee, showScore, rank, index }: PlayerCardProps) {

  return (
    <motion.div
      className={cn(
        "flex items-center gap-3 rounded-2xl border relative transition-all overflow-visible backdrop-blur-sm",
        isCurrentPlayer
          ? "bg-purple-50/90 border-purple-300/60 shadow-md ring-1 ring-purple-200/50"
          : "bg-white/95 border-gray-200/80 shadow-sm"
      )}
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
    >
      {/* Rank Badge */}
      {rank !== undefined && rank < 3 && (
        <div className="absolute -top-3 -left-2 z-20">
          <motion.div
            className={cn(
              "w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center font-bold font-pixel-text text-white shadow-sm",
              rankColorList[rank]
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
          "relative flex items-center justify-center rounded-xl border overflow-hidden",
          isCurrentPlayer ? "w-14 h-14 border-purple-300/50 bg-gradient-to-br from-[#871BB7] to-[#6714A8]" : "w-12 h-12 border-gray-200 bg-gray-50"
        )}>
          {/* Background Pattern */}
          <div className={`absolute inset-0 opacity-20 ${isCurrentPlayer ? 'bg-[#6714A8]/10' : ''}`} />

          {/* Letter */}
          <span className={cn(
            "relative z-10 font-bold font-pixel-title drop-shadow-md",
            isCurrentPlayer ? "text-3xl text-white" : "text-2xl text-gray-800"
          )}>
            {player.name.charAt(0)}
          </span>

        </div>
      </div>

      {/* Info Section */}
      <div className="flex-1 min-w-0 py-2 pr-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "font-bold truncate font-pixel-text text-base",
            isCurrentPlayer ? "text-[#350D7A]" : "text-gray-900"
          )}>
            {player.name}
          </span>

          {/* Status Badges */}
          {player.isHost && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />}
          {isReferee && <Shield className="w-4 h-4 text-blue-500 fill-blue-500 shrink-0" />}

          {isCurrentPlayer && (
            <span className="text-[10px] bg-[#6714A8]/10 text-[#6714A8] border border-[#6714A8]/20 px-1.5 py-0.5 rounded-sm font-bold font-pixel-text">
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
            {player.isOffline ? (
              <div className="flex items-center gap-1 text-gray-500 text-xs font-bold bg-gray-100 px-2 py-0.5 rounded-sm border border-gray-300">
                <WifiOff className="w-3 h-3" />
                غير متصل
              </div>
            ) : player.isReady ? (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 12 }}
                className="flex items-center gap-1 text-[#350D7A] text-xs font-bold bg-[#f5f3ff] px-2 py-0.5 rounded-sm border border-[#6714A8]/30 shadow-sm"
              >
                <Check className="w-3 h-3 text-[#6714A8] stroke-[3]" />
                جاهز
              </motion.div>
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
}

