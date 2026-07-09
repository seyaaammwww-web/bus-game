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
          <span
            className="flex items-center justify-center w-5 h-5 bg-[#6714A8] text-[#FFFEE2] text-[10px] font-bold rounded-sm border-2 border-[#350D7A]"
          >
            {count}
          </span>
        </div>
      )}

      <Button
        size="sm"
        className={`h-12 px-4 gap-2 font-bold rounded-sm border-[3px] border-[#350D7A] relative overflow-hidden group ${isLocked
          ? 'bg-[#FFFDCC] text-[#350D7A]/40 cursor-not-allowed !shadow-none'
          : isActive
            ? 'bg-[#6714A8] text-[#FFFEE2] shadow-pixel'
            : 'bg-[#FFFEE5] text-[#6714A8] hover:bg-[#FFFDD6] shadow-pixel-sm'
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


      </Button>
    </motion.div>
  );
}
