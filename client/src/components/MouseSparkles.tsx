import React, { useEffect, useRef, useCallback } from 'react';

interface Sparkle {
    id: number;
    x: number;
    y: number;
    size: number;
    color: string;
    element: HTMLDivElement;
}

const colors = ['#FFD700', '#FF69B4', '#00FFFF', '#FFF'];

export const MouseSparkles = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sparklesRef = useRef<Sparkle[]>([]);
    const countRef = useRef(0);
    const lastSparkleTime = useRef(0);

    const createSparkle = useCallback((x: number, y: number) => {
        if (!containerRef.current) return;

        const sparkle = document.createElement('div');
        const size = Math.random() * 6 + 3; // 3px to 9px (smaller)
        const color = colors[Math.floor(Math.random() * colors.length)];

        sparkle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background-color: ${color};
            box-shadow: 0 0 ${size}px ${color};
            border-radius: 50%;
            pointer-events: none;
            opacity: 1;
            transform: scale(0);
            transition: all 0.6s ease-out;
        `;

        containerRef.current.appendChild(sparkle);

        // Animate
        requestAnimationFrame(() => {
            sparkle.style.opacity = '0';
            sparkle.style.transform = 'scale(1)';
            sparkle.style.top = `${y + 15}px`;
        });

        // Remove after animation
        setTimeout(() => {
            sparkle.remove();
        }, 600);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const now = Date.now();
            // Throttle: max 1 sparkle every 80ms
            if (now - lastSparkleTime.current < 80) return;
            // Random chance to skip (50% chance)
            if (Math.random() > 0.5) return;

            lastSparkleTime.current = now;
            createSparkle(e.clientX, e.clientY);
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [createSparkle]);

    return (
        <div
            ref={containerRef}
            className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
        />
    );
};
