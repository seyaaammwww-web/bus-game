import { UserX, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface BanishPowerUpProps {
  count: number;
  isActive: boolean;
  isDisabled: boolean;
  onActivate: () => void;
}

export function BanishPowerUp({ count, isActive, isDisabled, onActivate }: BanishPowerUpProps) {
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
            className="flex items-center justify-center w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full border-2 border-white shadow-sm"
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
            ? 'bg-gradient-to-br from-red-500 via-rose-500 to-red-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]'
            : 'bg-white border-2 border-red-200 text-red-600 hover:border-red-400 hover:bg-red-50'
          } ${(isDisabled && !isLocked) ? 'opacity-40 grayscale cursor-not-allowed' : ''
          }`}
        onClick={isLocked ? undefined : onActivate}
        disabled={isDisabled || isLocked}
      >
        <motion.div
          animate={isActive ? { y: [0, -4, 0] } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="relative z-10"
        >
          {isLocked ? (
            <Lock className="w-5 h-5 text-slate-400" />
          ) : (
            <UserX className={`w-5 h-5 ${isActive ? 'text-white' : 'text-red-500'}`} />
          )}
        </motion.div>

        <div className="flex flex-col items-start leading-tight relative z-10">
          <span className="text-[10px] opacity-70 uppercase tracking-tighter text-right w-full">
            طرد
          </span>
          <span className="text-sm">{isLocked ? 'مغلق' : '40pt'}</span>
        </div>

        {isActive && !isLocked && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          />
        )}
      </Button>
    </motion.div>
  );
}
