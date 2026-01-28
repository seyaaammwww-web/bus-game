import { Lightbulb, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface WildcardPowerUpProps {
  count: number;
  isActive: boolean;
  isDisabled: boolean;
  onActivate: () => void;
}

export function WildcardPowerUp({ count, isActive, isDisabled, onActivate }: WildcardPowerUpProps) {
  const isLocked = count <= 0;

  return (
    <motion.div
      whileHover={(isDisabled || isLocked) ? {} : { scale: 1.05, y: -2 }}
      whileTap={(isDisabled || isLocked) ? {} : { scale: 0.95 }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="relative"
    >
      {!isLocked && (
        <div className="absolute -top-2 -right-2 z-10">
          <motion.span
            className="flex items-center justify-center w-5 h-5 bg-purple-600 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {count}
          </motion.span>
        </div>
      )}

      <Button
        size="sm"
        className={`h-12 px-4 gap-2 font-bold rounded-xl transition-all duration-300 relative overflow-hidden group ${isLocked
          ? 'bg-slate-100 border-2 border-slate-200 text-slate-400 cursor-not-allowed'
          : isActive
            ? 'bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
            : 'bg-white border-2 border-purple-200 text-purple-600 hover:border-purple-400 hover:bg-purple-50'
          } ${(isDisabled && !isLocked) ? 'opacity-40 grayscale cursor-not-allowed' : ''
          }`}
        onClick={isLocked ? undefined : onActivate}
        disabled={isDisabled || isLocked}
      >
        <motion.div
          animate={isActive ? { rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="relative z-10"
        >
          {isLocked ? (
            <Lock className="w-5 h-5 text-slate-400" />
          ) : (
            <Lightbulb className={`w-5 h-5 ${isActive ? 'text-yellow-300' : 'text-purple-500'}`} />
          )}
        </motion.div>

        <div className="flex flex-col items-start leading-tight relative z-10">
          <span className="text-[10px] opacity-70 uppercase tracking-tighter text-right w-full">
            الجوكر
          </span>
          <span className="text-sm">{isLocked ? 'مغلق' : '50pt'}</span>
        </div>

        {isActive && !isLocked && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          />
        )}
      </Button>
    </motion.div>
  );
}
