import { motion, AnimatePresence } from 'framer-motion';

interface ValidationStampProps {
    isValid: boolean;
    show: boolean;
    text?: string;
    size?: 'sm' | 'md' | 'lg';
    position?: 'center' | 'bottom-right' | 'top-left';
}

export function ValidationStamp({
    isValid,
    show,
    text,
    size = 'md',
    position = 'center'
}: ValidationStampProps) {

    const sizeClasses = {
        sm: 'px-3 py-1 text-sm border-2',
        md: 'px-4 py-2 text-xl border-4 drop-shadow-[2px_2px_0_rgba(0,0,0,0.1)]',
        lg: 'px-6 py-3 text-3xl border-4 drop-shadow-[4px_4px_0_rgba(0,0,0,0.1)]'
    }

    const positionClasses = {
        center: 'inset-0 items-center justify-center',
        'bottom-right': 'bottom-0 right-0 p-2 items-end justify-end',
        'top-left': 'top-0 left-0 p-2 items-start justify-start'
    }

    const defaultText = isValid ? 'مقبول' : 'مرفوض';
    const displayText = text || defaultText;

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    className={`absolute ${positionClasses[position]} flex pointer-events-none z-50`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                >
                    <motion.div
                        className={`
              rounded-lg font-pixel-title whitespace-nowrap
              ${sizeClasses[size]}
              ${isValid
                                ? 'border-emerald-500 text-emerald-600 bg-emerald-100/95 origin-center'
                                : 'border-rose-500 text-rose-600 bg-rose-100/95 origin-center'
                            }
            `}
                        initial={{ scale: 3, opacity: 0, rotate: isValid ? 0 : -20 }}
                        animate={{
                            scale: [3, 0.9, 1.1, 1],
                            opacity: [0, 1, 1, 1],
                            rotate: isValid ? [0, -12, -8, -12] : [-20, 15, 8, 12],
                        }}
                        transition={{
                            duration: 0.5,
                            times: [0, 0.4, 0.7, 1],
                            ease: ['easeOut', 'easeOut', 'easeOut', 'easeOut']
                        }}
                    >
                        {/* Inner Border to look more like a stamp */}
                        <div className={`
                absolute inset-[2px] border border-dashed rounded-sm opacity-50
                ${isValid ? 'border-emerald-600' : 'border-rose-600'}
            `} />
                        <span className="relative z-10">{displayText}</span>
                    </motion.div>

                    {/* Ink splatter particles */}
                    {Array.from({ length: 6 }).map((_, i) => (
                        <motion.div
                            key={i}
                            className={`absolute w-1.5 h-1.5 rounded-full ${isValid ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{
                                left: '50%',
                                top: '50%',
                            }}
                            initial={{ x: 0, y: 0, scale: 0 }}
                            animate={{
                                x: Math.cos(i * 60 * Math.PI / 180) * (size === 'lg' ? 60 : 30 + Math.random() * 20),
                                y: Math.sin(i * 60 * Math.PI / 180) * (size === 'lg' ? 60 : 30 + Math.random() * 20),
                                scale: [0, 1, 0.5, 0],
                            }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
