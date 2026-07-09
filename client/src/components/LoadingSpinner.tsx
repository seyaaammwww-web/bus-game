/**
 * Loading component with multiple styles
 */

import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  fullScreen?: boolean;
  variant?: 'spinner' | 'dots' | 'bars' | 'pulse';
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
};

export function LoadingSpinner({
  size = 'md',
  label,
  fullScreen = false,
  variant = 'spinner',
}: LoadingSpinnerProps) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 flex items-center justify-center bg-black/20 z-50'
    : 'flex items-center justify-center';

  return (
    <div className={containerClasses}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center gap-3"
      >
        {variant === 'spinner' && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className={`${sizeClasses[size]} border-4 border-transparent border-t-purple-600 border-r-purple-600 rounded-full`}
          />
        )}

        {variant === 'dots' && (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} bg-purple-600 rounded-full`}
                animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.5, 1, 0.5] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        )}

        {variant === 'bars' && (
          <div className="flex gap-1 items-end">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-1 bg-purple-600 ${size === 'sm' ? 'h-3' : size === 'md' ? 'h-4' : 'h-6'}`}
                animate={{ height: [10, 30, 10] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        )}

        {variant === 'pulse' && (
          <motion.div
            className={`${sizeClasses[size]} bg-purple-600 rounded-full`}
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          />
        )}

        {label && (
          <p className="text-sm font-pixel-text text-gray-700">{label}</p>
        )}
      </motion.div>
    </div>
  );
}
