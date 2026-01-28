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

const reactionColors: Record<ReactionType, string> = {
  thumbsUp: 'text-blue-500',
  clap: 'text-yellow-500',
  laugh: 'text-amber-500',
  fire: 'text-orange-500',
  heart: 'text-red-500',
};

export function ReactionButtons() {
  const { sendReaction } = useGame();

  const handleReaction = (type: ReactionType) => {
    playReactionSound();
    sendReaction(type);
  };

  return (
    <motion.div
      className="flex gap-2 justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {reactionTypes.map((type, index) => {
        const Icon = reactionIcons[type];
        return (
          <motion.div
            key={type}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: index * 0.1,
              type: 'spring',
              stiffness: 200,
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <Button
              variant="outline"
              size="icon"
              className={`${reactionColors[type]} border-2 bg-white hover:bg-gray-100 transition-all shadow-md`}
              onClick={() => handleReaction(type)}
              data-testid={`button-reaction-${type}`}
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{
                  duration: 0.5,
                  repeat: 0,
                  ease: 'easeInOut',
                }}
              >
                <Icon className="w-5 h-5" />
              </motion.div>
            </Button>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export function ReactionDisplay() {
  const { reactions } = useGame();

  return (
    <div className="fixed bottom-20 left-4 right-4 pointer-events-none z-50">
      <AnimatePresence mode="popLayout">
        {reactions.map((reaction) => {
          const Icon = reactionIcons[reaction.type];
          return (
            <motion.div
              key={reaction.id}
              className="flex items-center gap-2 mb-2"
              initial={{ opacity: 0, x: -50, scale: 0.5, rotate: -20 }}
              animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, x: 50, scale: 0.5, rotate: 20 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              layout
            >
              <motion.div
                className={`flex items-center gap-2 bg-gradient-to-r from-card to-card/70 backdrop-blur-md border-2 border-${
                  reaction.type === 'thumbsUp' ? 'blue' :
                  reaction.type === 'clap' ? 'yellow' :
                  reaction.type === 'laugh' ? 'amber' :
                  reaction.type === 'fire' ? 'orange' :
                  'red'
                }-400/50 rounded-full px-4 py-2 shadow-xl`}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  animate={{ rotate: [0, 20, -20, 0] }}
                  transition={{ duration: 0.6, repeat: 1 }}
                >
                  <Icon className={`w-6 h-6 ${reactionColors[reaction.type]}`} />
                </motion.div>
                <span className="text-sm font-bold text-foreground">{reaction.playerName}</span>
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
