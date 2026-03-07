import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useState, useCallback, useRef } from 'react';

interface Particle {
    id: number;
    x: number;
    y: number;
    angle: number;
    color: string;
}

interface JuicyButtonProps extends React.ComponentPropsWithoutRef<typeof motion.button> {
    children?: React.ReactNode;
    variant?: 'primary' | 'success' | 'danger' | 'warning';
    fullWidth?: boolean;
}

export function JuicyButton({
    children,
    onClick,
    variant = 'primary',
    fullWidth = false,
    className = '',
    disabled,
    ...props
}: JuicyButtonProps) {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [isPressed, setIsPressed] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const scale = useMotionValue(1);
    const boxShadow = useTransform(
        scale,
        [0.95, 1],
        ['0px 2px 0 0 #2e1065', '0px 6px 0 0 #2e1065']
    );

    const yOffset = useTransform(
        scale,
        [0.95, 1],
        [4, 0]
    );

    const colors = {
        primary: ['bg-gradient-to-b from-[#7c3aed] to-[#6d28d9]', 'border-[#4c1d95]'],
        success: ['bg-gradient-to-b from-emerald-400 to-emerald-600', 'border-emerald-900'],
        danger: ['bg-gradient-to-b from-rose-500 to-rose-700', 'border-rose-950'],
        warning: ['bg-gradient-to-b from-amber-400 to-amber-600', 'border-amber-900'],
    };

    const spawnParticles = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) return;

        // Calculate click position relative to button center
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left - rect.width / 2;
        const clickY = e.clientY - rect.top - rect.height / 2;

        const newParticles: Particle[] = Array.from({ length: 12 }).map((_, i) => ({
            id: Date.now() + i,
            x: clickX,
            y: clickY,
            angle: (i * 30) + Math.random() * 15,
            color: ['#fbbf24', '#a855f7', '#22c55e', '#f43f5e'][Math.floor(Math.random() * 4)],
        }));
        setParticles(newParticles);
        setTimeout(() => setParticles([]), 600);
    }, [disabled]);

    return (
        <motion.button
            ref={buttonRef}
            className={`
        relative px-6 py-3 text-white font-pixel-button text-lg tracking-wide
        border-[3px] rounded-lg overflow-visible outline-none
        transition-colors active:shadow-none
        ${colors[variant][0]} 
        ${colors[variant][1]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:brightness-110'}
        ${className}
      `}
            style={{
                boxShadow: disabled ? '0px 2px 0 0 #2e1065' : boxShadow,
                scale: disabled ? 1 : scale,
                translateY: disabled ? 2 : yOffset
            }}
            whileHover={disabled ? {} : { scale: 1.02 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            onClick={(e) => {
                spawnParticles(e);
                onClick?.(e);
            }}
            onMouseDown={() => !disabled && setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            disabled={disabled}
            {...props}
        >
            {/* Shine sweep effect */}
            {!disabled && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
                    initial={{ x: '-150%' }}
                    animate={{ x: '250%' }}
                    transition={{ duration: 1.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 3 }}
                    style={{ mixBlendMode: 'overlay' }}
                />
            )}

            {/* Button content */}
            <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-[1px_2px_0_#2e1065]">
                {children}
            </span>

            {/* Particle burst */}
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute w-2 h-2 rounded-sm pointer-events-none z-[-1]"
                    style={{
                        background: particle.color,
                        left: '50%',
                        top: '50%',
                        marginLeft: particle.x,
                        marginTop: particle.y
                    }}
                    initial={{ x: 0, y: 0, scale: 1, rotate: 0 }}
                    animate={{
                        x: Math.cos(particle.angle * Math.PI / 180) * 80,
                        y: Math.sin(particle.angle * Math.PI / 180) * 80 + 20, // Add gravity
                        scale: 0,
                        rotate: 180,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                />
            ))}
        </motion.button>
    );
}
