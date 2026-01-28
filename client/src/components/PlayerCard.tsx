import { motion } from 'framer-motion';
import { Crown, Check, Clock, Shield, Zap, Trophy } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

      <motion.div whileHover={{ scale: 1.1 }}>
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold">
            {player.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
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
            className="w-8 h-8 bg-accent rounded-full flex items-center justify-center"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Check className="w-5 h-5 text-accent-foreground" />
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
