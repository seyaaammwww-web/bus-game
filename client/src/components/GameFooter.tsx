import { motion } from 'framer-motion';

export function GameFooter() {
    return (
        <div className="fixed bottom-2 left-0 right-0 text-center z-50 pointer-events-none">
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-[10px] text-white/60 font-pixel-text font-bold tracking-tight animate-pulse"
            >
                BY MOHAMED SEYAM
            </motion.p>
        </div>
    );
}
