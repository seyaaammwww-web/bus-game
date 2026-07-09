import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface BouncyCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    delay?: number;
    hoverEffect?: boolean;
}

const cardVariants = {
    hidden: {
        scale: 0.8,
        opacity: 0,
        rotateX: -15,
        y: 30,
    },
    visible: (i: number) => ({
        scale: 1,
        opacity: 1,
        rotateX: 0,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 20,
            mass: 0.8,
            delay: i * 0.1, // Stagger based on custom property
        }
    }),
    hover: {
        scale: 1.02,
        y: -4,
        transition: { type: 'spring', stiffness: 400, damping: 15 }
    }
};

const glowVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i: number) => ({
        opacity: [0, 0.4, 0],
        scale: [0.8, 1.1, 1],
        transition: { duration: 0.6, delay: (i * 0.1) + 0.1 }
    })
};

export function BouncyCard({
    children,
    delay = 0,
    className = '',
    hoverEffect = true,
    ...props
}: BouncyCardProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-20px' });

    return (
        <motion.div
            ref={ref}
            className={cn("relative h-full", className)}
            variants={cardVariants}
            custom={delay}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
            whileHover={hoverEffect ? "hover" : ""}
            {...props as any}
        >
            {/* Glow trail effect on entrance */}
            <motion.div
                className="absolute inset-0 bg-[#6714A8]/20 blur-xl rounded-lg pointer-events-none"
                variants={glowVariants}
                custom={delay}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
            />

            {/* Card content - Retro Style */}
            <div className="relative h-full bg-gradient-to-b from-white to-[#faf5ff] p-4 sm:p-6 text-[#350D7A] font-pixel-text border-[3px] border-[#350D7A] shadow-[4px_4px_0_0_#350D7A] rounded-none z-10 overflow-hidden">
                {/* Subtle grid pattern background */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#350D7A 1px, transparent 1px), linear-gradient(90deg, #350D7A 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative z-10 flex flex-col h-full">
                    {children}
                </div>
            </div>
        </motion.div>
    );
}
