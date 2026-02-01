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
      className={`flex items-center gap-3 rounded-xl border relative overflow-hidden transition-all ${isCurrentPlayer
        ? 'bg-gradient-to-r from-primary/10 to-accent/10 border-primary/50 border-2 p-4 shadow-md'
        : 'bg-card border-card-border p-3'
        }`}
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
        <div className={`relative ${isCurrentPlayer ? 'w-14 h-14' : 'w-11 h-11'} bg-gradient-to-br from-[#4c1d95] via-[#7c3aed] to-[#8b5cf6] rounded-lg border-[3px] border-[#fbbf24] shadow-[3px_3px_0_0_#2e1065,_0_0_12px_rgba(251,191,36,0.4)] flex items-center justify-center overflow-hidden transition-all`}>
          {/* Inner Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent rounded-sm" />

          {/* Shimmer Animation */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
          />

          {/* Letter */}
          <span className={`relative z-10 ${isCurrentPlayer ? 'text-2xl' : 'text-xl'} font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] font-pixel-title`}>
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
            className="w-8 h-8 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center border-[2px] border-[#047857] shadow-[2px_2px_0_0_#065f46]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Check className="w-5 h-5 text-white stroke-[3]" />
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

