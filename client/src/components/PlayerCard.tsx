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

export function PlayerCard({ player, isCurrentPlayer, isReferee, showScore, rank, index }: PlayerCardProps) {

  return (
    <motion.div
      className={`flex items-center gap-3 p-3 rounded-xl border relative overflow-hidden ${isCurrentPlayer
        ? 'bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30'
        : 'bg-card border-card-border'
        }`}
      initial={{ x: -20, opacity: 0, rotate: -5 }}
      animate={{ x: 0, opacity: 1, rotate: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      {rank !== undefined && rank < 3 && (
        <motion.div
          className={`w-8 h-8 ${rankColors[rank]} rounded-full flex items-center justify-center text-white font-bold text-sm relative`}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2 }}
        >
          {rankEmojis[rank]}
          {rank === 0 && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-yellow-300"
              animate={{ scale: [1, 1.3], opacity: [1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.div>
      )}

      {/* Premium Pixel Avatar */}
      <motion.div
        className="relative"
        whileHover={{ scale: 1.15, rotate: 3 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Outer Border Frame */}
        <div className="absolute -inset-0.5 bg-gradient-to-br from-[#fbbf24] via-[#8b5cf6] to-[#7c3aed] rounded-lg opacity-80" />

        {/* Main Avatar Container */}
        <div className="relative w-11 h-11 bg-gradient-to-br from-[#4c1d95] via-[#7c3aed] to-[#8b5cf6] rounded-lg border-[3px] border-[#fbbf24] shadow-[3px_3px_0_0_#2e1065,_0_0_12px_rgba(251,191,36,0.4)] flex items-center justify-center overflow-hidden">
          {/* Inner Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-sm" />

          {/* Shimmer Animation */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
          />

          {/* Letter */}
          <span className="relative z-10 text-xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] font-pixel-title">
            {player.name.charAt(0)}
          </span>

          {/* Pixel Corner Decorations */}
          <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-[#fbbf24]" />
          <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-[#fbbf24]" />
          <div className="absolute bottom-0 left-0 w-1.5 h-1.5 bg-[#fbbf24]" />
          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-[#fbbf24]" />
        </div>

        {/* Sparkle Effect */}
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 bg-[#fbbf24] rounded-full shadow-[0_0_6px_#fbbf24]"
          animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{player.name}</span>
          {player.isHost && (
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Crown className="w-4 h-4 text-yellow-500 shrink-0" />
            </motion.div>
          )}
          {isReferee && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Shield className="w-4 h-4 text-accent shrink-0" />
            </motion.div>
          )}
          {isCurrentPlayer && (
            <motion.span
              className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              أنت
            </motion.span>
          )}
        </div>
        {showScore && (
          <motion.div
            className="flex items-center gap-1"
            animate={rank === 0 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1, repeat: rank === 0 ? Infinity : 0 }}
          >
            <span className="text-sm font-bold text-primary">{player.score}</span>
            <span className="text-sm text-muted-foreground">نقطة</span>
            {rank === 0 && <Trophy className="w-4 h-4 text-yellow-500 ml-1" />}
          </motion.div>
        )}
      </div>

      {!showScore && (
        player.isReady ? (
          <motion.div
            className={cn(
              "bg-[#FFFDD1] border-[3px] border-[#2e1065] p-4 flex items-center gap-4 relative transition-all duration-300",
              "shadow-[4px_4px_0_0_#2e1065]",
              "hover:shadow-[6px_6px_0_0_#2e1065] hover:translate-x-[-2px] hover:translate-y-[-2px]",
              "before:absolute before:inset-[4px] before:border-[2px] before:border-[#2e1065]/10 before:pointer-events-none",
              isCurrentPlayer && "bg-[#FFFEF0] border-[3px] shadow-[6px_6px_0_0_#2e1065] scale-105 z-10",
              "overflow-hidden"
            )}
          >
            <div className="relative z-10 flex items-center gap-4 w-full">
              <Check className="w-5 h-5 text-accent-foreground" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="w-8 h-8 bg-muted rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Clock className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        )
      )}
    </motion.div>
  );
}

