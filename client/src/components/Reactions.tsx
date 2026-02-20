import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, Clapperboard, Laugh, Flame, Heart } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { type ReactionType, reactionTypes } from '@shared/schema';
import { playClick } from '@/lib/sounds';
import { useState, useEffect } from 'react';

// Use Clapperboard as a placeholder for Clap if HandMetal isn't quite right, 
// OR just use HandMetal but style it. Let's stick to the mapped icons but style them.
import { HandMetal } from 'lucide-react';

const reactionIcons: Record<ReactionType, any> = {
  thumbsUp: ThumbsUp,
  clap: HandMetal, // Or potentially another icon for clapping
  laugh: Laugh,
  fire: Flame,
  heart: Heart,
};

const reactionConfig: Record<ReactionType, { bg: string; border: string; text: string; shadow: string }> = {
  thumbsUp: {
    bg: 'bg-blue-500 hover:bg-blue-400',
    border: 'border-blue-700',
    text: 'text-white',
    shadow: 'shadow-[0_4px_0_0_#1d4ed8]',
  },
  clap: {
    bg: 'bg-yellow-400 hover:bg-yellow-300',
    border: 'border-yellow-700',
    text: 'text-yellow-900',
    shadow: 'shadow-[0_4px_0_0_#a16207]',
  },
  laugh: {
    bg: 'bg-orange-400 hover:bg-orange-300',
    border: 'border-orange-700',
    text: 'text-orange-900',
    shadow: 'shadow-[0_4px_0_0_#c2410c]',
  },
  fire: {
    bg: 'bg-red-500 hover:bg-red-400',
    border: 'border-red-700',
    text: 'text-white',
    shadow: 'shadow-[0_4px_0_0_#b91c1c]',
  },
  heart: {
    bg: 'bg-pink-500 hover:bg-pink-400',
    border: 'border-pink-700',
    text: 'text-white',
    shadow: 'shadow-[0_4px_0_0_#be185d]',
  },
};

// Detect mobile device
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export function ReactionButtons() {
  const { sendReaction } = useGame();

  const handleReaction = (type: ReactionType) => {
    playClick();
    sendReaction(type);
  };

  return (
    <motion.div
      className="flex gap-3 justify-center items-center py-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {reactionTypes.map((type, index) => {
        const config = reactionConfig[type];
        const Icon = reactionIcons[type];
        return (
          <motion.button
            key={type}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              delay: index * 0.1,
              type: 'spring',
              stiffness: 260,
              damping: 20
            }}
            whileHover={{ y: -2 }}
            whileTap={{ y: 2, boxShadow: 'none' }}
            onClick={() => handleReaction(type)}
            className={`
              relative w-10 h-10 rounded-lg
              ${config.bg}
              border-2 ${config.border}
              ${config.shadow}
              flex items-center justify-center
              transition-all duration-75
              cursor-pointer
            `}
            data-testid={`button-reaction-${type}`}
          >
            <Icon className={`w-5 h-5 ${config.text} drop-shadow-sm`} strokeWidth={2.5} />
          </motion.button>
        );
      })}
    </motion.div>
  );
}

export function ReactionDisplay() {
  const { reactions } = useGame();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobile());
    const handleResize = () => setMobile(isMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed bottom-24 left-0 right-0 pointer-events-none z-[100] flex flex-col items-center">
      <AnimatePresence>
        {reactions.map((reaction) => {
          const config = reactionConfig[reaction.type];
          const Icon = reactionIcons[reaction.type];
          // Use a deterministic offset based on reaction ID to scatter them slightly
          const randomX = (parseInt(reaction.id.slice(-2), 36) % 200) - 100;

          // Mobile: simpler, faster animation
          if (mobile) {
            return (
              <motion.div
                key={reaction.id}
                className="absolute bottom-0"
                initial={{ opacity: 0, y: 0, x: randomX, scale: 0.8 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: -200,
                  scale: 1
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                <div
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg
                    ${config.bg}
                    border-2 ${config.border}
                    shadow-lg
                  `}
                >
                  <Icon className={`w-5 h-5 ${config.text}`} strokeWidth={2.5} />
                  <span className={`text-xs font-bold ${config.text} font-pixel-text leading-none`}>
                    {reaction.playerName}
                  </span>
                </div>
              </motion.div>
            );
          }

          // Desktop: full animation
          return (
            <motion.div
              key={reaction.id}
              className="absolute bottom-0"
              initial={{ opacity: 0, y: 0, x: randomX, scale: 0.5 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: -300,
                x: randomX + (Math.random() * 40 - 20),
                scale: 1
              }}
              transition={{ duration: 2, ease: "easeOut" }}
            >
              <div
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg
                  ${config.bg}
                  border-2 ${config.border}
                  shadow-lg
                `}
              >
                <Icon className={`w-5 h-5 ${config.text}`} strokeWidth={2.5} />
                <span className={`text-xs font-bold ${config.text} font-pixel-text leading-none`}>
                  {reaction.playerName}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
