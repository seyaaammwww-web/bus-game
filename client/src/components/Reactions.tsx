import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, HandMetal, Laugh, Flame, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGame } from '@/lib/gameContext';
import { type ReactionType, reactionTypes } from '@shared/schema';
import { playReactionSound } from '@/lib/sounds';

const reactionIcons: Record<ReactionType, any> = {
  thumbsUp: ThumbsUp,
  clap: HandMetal,
  laugh: Laugh,
  fire: Flame,
  heart: Heart,
};

const reactionConfig: Record<ReactionType, { bg: string; border: string; shadow: string; emoji: string }> = {
  thumbsUp: {
    bg: 'bg-gradient-to-br from-blue-400 to-blue-600',
    border: 'border-blue-700',
    shadow: 'shadow-[2px_2px_0_0_#1e3a8a]',
    emoji: '👍'
  },
  clap: {
    bg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
    border: 'border-yellow-700',
    shadow: 'shadow-[2px_2px_0_0_#a16207]',
    emoji: '👏'
  },
  laugh: {
    bg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    border: 'border-amber-700',
    shadow: 'shadow-[2px_2px_0_0_#b45309]',
    emoji: '😂'
  },
  fire: {
    bg: 'bg-gradient-to-br from-orange-500 to-red-600',
    border: 'border-red-700',
    shadow: 'shadow-[2px_2px_0_0_#991b1b]',
    emoji: '🔥'
  },
  heart: {
    bg: 'bg-gradient-to-br from-pink-400 to-red-500',
    border: 'border-red-700',
    shadow: 'shadow-[2px_2px_0_0_#991b1b]',
    emoji: '❤️'
  },
};

export function ReactionButtons() {
  const { sendReaction } = useGame();

  const handleReaction = (type: ReactionType) => {
    playReactionSound();
    sendReaction(type);
  };

  return (
    <motion.div
      className="flex gap-3 justify-center items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {reactionTypes.map((type, index) => {
        const config = reactionConfig[type];
        return (
          <motion.button
            key={type}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: index * 0.08,
              type: 'spring',
              stiffness: 260,
              damping: 20
            }}
            whileHover={{
              scale: 1.15,
              y: -4,
              transition: { duration: 0.2 }
            }}
            whileTap={{
              scale: 0.95,
              y: 0,
              transition: { duration: 0.1 }
            }}
            onClick={() => handleReaction(type)}
            className={`
              relative w-12 h-12 rounded-lg
              ${config.bg}
              border-[3px] ${config.border}
              ${config.shadow}
              hover:brightness-110
              active:translate-y-[2px] active:shadow-none
              transition-all duration-150
              flex items-center justify-center
              font-pixel-text text-2xl
              cursor-pointer
            `}
            data-testid={`button-reaction-${type}`}
          >
            <motion.span
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, -10, 10, 0]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 2,
                ease: 'easeInOut',
              }}
            >
              {config.emoji}
            </motion.span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

export function ReactionDisplay() {
  const { reactions } = useGame();

  return (
    <div className="fixed bottom-24 left-4 right-4 pointer-events-none z-50">
      <AnimatePresence mode="popLayout">
        {reactions.map((reaction) => {
          const config = reactionConfig[reaction.type];
          return (
            <motion.div
              key={reaction.id}
              className="flex justify-start mb-3"
              initial={{ opacity: 0, x: -100, scale: 0.3 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.3, rotate: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              layout
            >
              <motion.div
                className={`
                  flex items-center gap-3 px-4 py-2 rounded-xl
                  ${config.bg}
                  border-[3px] ${config.border}
                  ${config.shadow}
                  backdrop-blur-sm
                `}
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, -2, 2, 0]
                }}
                transition={{ duration: 0.5 }}
              >
                <motion.span
                  className="text-2xl"
                  animate={{
                    rotate: [0, 15, -15, 0],
                    scale: [1, 1.2, 1]
                  }}
                  transition={{ duration: 0.6, repeat: 1 }}
                >
                  {config.emoji}
                </motion.span>
                <span className="text-sm font-bold text-white font-pixel-text drop-shadow-md">
                  {reaction.playerName}
                </span>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
