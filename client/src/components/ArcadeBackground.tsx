import { motion } from 'framer-motion';

export default function ArcadeBackground() {
    return (
        <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden">
            {/* Colored Gradient Bars Background - Base Layer */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-20">
                <div style={{ height: 48, backgroundColor: 'var(--hero-piece-1)' }} />
                <div style={{ height: 48, backgroundColor: 'var(--hero-piece-2)' }} />
                <div style={{ height: 84, backgroundColor: 'var(--hero-piece-3)' }} />
                <div style={{ height: 96, backgroundColor: 'var(--hero-piece-4)' }} />
                <div style={{ height: 96, backgroundColor: 'var(--hero-piece-5)' }} />
                <div style={{ height: 96, backgroundColor: 'var(--hero-piece-6)' }} />
                <div style={{ height: 96, backgroundColor: 'var(--hero-piece-7)' }} />
                <div style={{ height: 96, backgroundColor: 'var(--hero-piece-8)' }} />
                <div style={{ height: 96, backgroundColor: 'var(--hero-piece-9)' }} />
                <div style={{ height: 96, backgroundColor: 'var(--hero-piece-10)' }} />
                <div style={{ height: 96, backgroundColor: 'var(--hero-piece-11)' }} />
                <div style={{ height: 96, backgroundColor: 'var(--hero-piece-12)' }} />
                <div style={{ height: 112, backgroundColor: 'var(--hero-piece-13)' }} />
                {/* Extended fill to cover entire viewport */}
                <div style={{ height: '200vh', backgroundColor: 'var(--hero-piece-15)' }} />
            </div>

            {/* Dots Pattern Overlay - Animated */}
            <div
                className="absolute inset-0 z-10 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#2e1065 2px, transparent 2px)',
                    backgroundSize: '32px 32px',
                    imageRendering: 'pixelated',
                }}
            />

            {/* Scanline Effect - Optional for extra retro feel */}
            <div className="absolute inset-0 z-10 pointer-events-none opacity-5 bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />

            {/* Subtle Dark Overlay for Better Text Contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/10 z-20" />
        </div>
    );
}

