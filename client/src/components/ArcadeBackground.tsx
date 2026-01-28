import { motion } from 'framer-motion';

export default function ArcadeBackground() {
    return (
        <div className="fixed inset-0 -z-50 pointer-events-none">

            {/* Dots Overlay */}
            <div
                className="absolute inset-0 z-0 bg-repeat-x opacity-100"
                style={{
                    backgroundImage: 'url(/assets/workos/dots.png)',
                    backgroundSize: '16px 1156px',
                }}
            />

            {/* Colored Bars Background */}
            <div className="absolute top-0 left-0 w-full h-full -z-10">
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
                <div style={{ height: '100%', backgroundColor: 'var(--hero-piece-13)' }} />
            </div>

            {/* Floating elements from original ArcadeBackground preserved but simplified/adjusted slightly for new theme? 
               User said: "Copy background... without ruining current progress"
               The current progress had "Parallax Pixels". The new design is static colored bars + dots.
               Maybe I should keep the pixels but make them subtle? 
               The user said "copy from this code... animation in the background".
               The new code has "grid-scroll" and some other animations but the bars are static.
               The user might want the FEEL of the new code.
               I will stick to the NEW design's background (bars + dots) as requested.
               I will remove the old gradient and grid to match the "WorkOS" look precisely.
           */}
        </div>
    );
}
