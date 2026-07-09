import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface FillProgressProps {
  filled: number;
  total: number;
  labels?: string[];
  filledSlots?: boolean[];
}

export function FillProgress({ filled, total, labels = [], filledSlots = [] }: FillProgressProps) {
  const pct = total > 0 ? filled / total : 0;
  const complete = filled === total && total > 0;

  return (
    <motion.div
      className="mb-4 px-1"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs md:text-sm font-bold text-[#FFFDD1]/90 font-pixel-text flex items-center gap-1.5">
          {complete ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-[#FFA168] animate-pulse" />
              جاهز للأتوبيس!
            </>
          ) : (
            'املأ الخانات'
          )}
        </span>
        <motion.span
          key={filled}
          className={`text-sm font-pixel-title tabular-nums ${complete ? 'text-[#FFA168]' : 'text-white'}`}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
        >
          {filled}/{total}
        </motion.span>
      </div>

      <div className="h-2.5 md:h-3 bg-[#350D7A]/60 rounded-full border border-[#6714A8]/40 overflow-hidden shadow-inner">
        <motion.div
          className={`h-full rounded-full ${complete ? 'bg-gradient-to-r from-[#FFA168] via-[#FFC48B] to-[#6714A8]' : 'bg-gradient-to-r from-[#6714A8] to-[#871BB7]'}`}
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        />
      </div>

      {labels.length > 0 && (
        <div className="flex justify-center gap-2 mt-2">
          {labels.map((label, i) => {
            const isFilled = filledSlots.length > 0 ? filledSlots[i] : i < filled;
            return (
              <motion.div
                key={label}
                className={`w-2.5 h-2.5 rounded-sm border ${isFilled ? 'bg-[#FFA168] border-[#78350f] shadow-[1px_1px_0_0_#78350f]' : 'bg-white/10 border-white/20'}`}
                animate={isFilled ? { scale: [1, 1.35, 1] } : {}}
                transition={{ duration: 0.35 }}
                title={label}
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
