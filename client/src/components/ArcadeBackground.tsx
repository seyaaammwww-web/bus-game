import { motion } from 'framer-motion';

/* ------------------------------------------------------------------ */
/* Pixel Bus - built entirely from divs so it stays crisp and themed  */
/* ------------------------------------------------------------------ */
function PixelBus() {
    return (
        <div
            className="relative"
            style={{ width: 152, height: 76, imageRendering: 'pixelated' }}
        >
            {/* Body */}
            <div
                className="absolute"
                style={{
                    left: 0,
                    top: 8,
                    width: 152,
                    height: 48,
                    backgroundColor: '#FF8A50',
                    border: '4px solid #350D7A',
                }}
            />
            {/* Roof stripe */}
            <div
                className="absolute"
                style={{
                    left: 4,
                    top: 12,
                    width: 144,
                    height: 8,
                    backgroundColor: '#FFC48B',
                }}
            />
            {/* Windows */}
            {[16, 52, 88].map((x) => (
                <div
                    key={x}
                    className="absolute"
                    style={{
                        left: x,
                        top: 24,
                        width: 24,
                        height: 16,
                        backgroundColor: '#FFFEE5',
                        border: '3px solid #350D7A',
                    }}
                />
            ))}
            {/* Windshield (front, right side = direction of travel) */}
            <div
                className="absolute"
                style={{
                    left: 122,
                    top: 24,
                    width: 20,
                    height: 20,
                    backgroundColor: '#FFFEE5',
                    border: '3px solid #350D7A',
                }}
            />
            {/* Door line */}
            <div
                className="absolute"
                style={{
                    left: 112,
                    top: 24,
                    width: 3,
                    height: 28,
                    backgroundColor: '#350D7A',
                }}
            />
            {/* Headlight */}
            <div
                className="absolute"
                style={{
                    left: 146,
                    top: 42,
                    width: 6,
                    height: 8,
                    backgroundColor: '#FFF3B6',
                    border: '2px solid #350D7A',
                }}
            />
            {/* Wheels */}
            {[20, 104].map((x) => (
                <div
                    key={x}
                    className="absolute"
                    style={{
                        left: x,
                        top: 52,
                        width: 24,
                        height: 24,
                        backgroundColor: '#350D7A',
                        border: '4px solid #26095A',
                    }}
                >
                    <div
                        className="absolute"
                        style={{
                            left: 5,
                            top: 5,
                            width: 6,
                            height: 6,
                            backgroundColor: '#FFFEE5',
                        }}
                    />
                </div>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Twinkling pixel star (plus-shaped sparkle like the reference)      */
/* ------------------------------------------------------------------ */
function PixelStar({ x, y, size = 8, delay = 0 }: { x: string; y: string; size?: number; delay?: number }) {
    return (
        <motion.div
            className="absolute"
            style={{ left: x, top: y, width: size, height: size }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.15, 0.8] }}
            transition={{ duration: 2.4, repeat: Infinity, delay, ease: 'easeInOut' }}
        >
            {/* plus-shaped sparkle */}
            <div className="absolute bg-[#FFFEE5]" style={{ left: '37.5%', top: 0, width: '25%', height: '100%' }} />
            <div className="absolute bg-[#FFFEE5]" style={{ left: 0, top: '37.5%', width: '100%', height: '25%' }} />
        </motion.div>
    );
}

/* ------------------------------------------------------------------ */
/* Drifting pixel cloud                                               */
/* ------------------------------------------------------------------ */
function PixelCloud({ y, duration, delay, scale = 1 }: { y: string; duration: number; delay: number; scale?: number }) {
    return (
        <motion.div
            className="absolute"
            style={{ top: y, scale }}
            initial={{ left: '-160px' }}
            animate={{ left: '105vw' }}
            transition={{ duration, repeat: Infinity, delay, ease: 'linear' }}
        >
            <div className="relative" style={{ width: 96, height: 32, imageRendering: 'pixelated' }}>
                <div className="absolute bg-[#FFFEF5]" style={{ left: 16, top: 0, width: 40, height: 16 }} />
                <div className="absolute bg-[#FFFEF5]" style={{ left: 0, top: 12, width: 96, height: 20 }} />
                <div className="absolute bg-[#DCEEFF]" style={{ left: 0, top: 26, width: 96, height: 6 }} />
            </div>
        </motion.div>
    );
}

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

            {/* Twinkling Stars - upper sky */}
            <div className="absolute inset-0 z-0">
                <PixelStar x="8%" y="6%" size={10} delay={0} />
                <PixelStar x="22%" y="14%" size={7} delay={0.8} />
                <PixelStar x="38%" y="4%" size={8} delay={1.5} />
                <PixelStar x="61%" y="10%" size={9} delay={0.4} />
                <PixelStar x="78%" y="5%" size={7} delay={1.9} />
                <PixelStar x="90%" y="16%" size={10} delay={1.1} />
                <PixelStar x="14%" y="28%" size={6} delay={2.2} />
                <PixelStar x="70%" y="26%" size={7} delay={0.2} />
                <PixelStar x="47%" y="20%" size={6} delay={1.4} />
                <PixelStar x="85%" y="34%" size={6} delay={0.6} />
            </div>

            {/* Drifting Pixel Clouds */}
            <div className="absolute inset-0 z-0 opacity-90">
                <PixelCloud y="9%" duration={70} delay={0} scale={1} />
                <PixelCloud y="22%" duration={95} delay={18} scale={0.7} />
                <PixelCloud y="15%" duration={80} delay={45} scale={0.85} />
            </div>

            {/* Dots Pattern Overlay - Animated */}
            <div
                className="absolute inset-0 z-10 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#350D7A 2px, transparent 2px)',
                    backgroundSize: '32px 32px',
                    imageRendering: 'pixelated',
                }}
            />

            {/* Scanline Effect - Optional for extra retro feel */}
            <div className="absolute inset-0 z-10 pointer-events-none opacity-5 bg-[linear-gradient(transparent_50%,rgba(0,0,0,1)_50%)] bg-[length:100%_4px]" />

            {/* ---------------- Road Scene (bottom) ---------------- */}
            <div className="absolute bottom-0 left-0 right-0 z-20">
                {/* Driving Bus - sits on top of the road */}
                <motion.div
                    className="absolute z-10"
                    style={{ bottom: 34 }}
                    initial={{ left: '-180px' }}
                    animate={{ left: '105vw' }}
                    transition={{ duration: 16, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                >
                    {/* subtle bob so the bus feels alive */}
                    <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <PixelBus />
                    </motion.div>
                </motion.div>

                {/* Hazard-striped curb (orange/ink checkers) */}
                <div
                    style={{
                        height: 12,
                        backgroundImage:
                            'repeating-linear-gradient(90deg, #FF8A50 0px, #FF8A50 24px, #350D7A 24px, #350D7A 48px)',
                        borderTop: '4px solid #350D7A',
                        imageRendering: 'pixelated',
                    }}
                />

                {/* Asphalt */}
                <div
                    className="relative"
                    style={{ height: 84, backgroundColor: '#26095A' }}
                >
                    {/* Scrolling center lane dashes - moving opposite the bus for speed */}
                    <motion.div
                        className="absolute left-0 right-0"
                        style={{
                            top: 36,
                            height: 8,
                            backgroundImage:
                                'repeating-linear-gradient(90deg, #FFFEE5 0px, #FFFEE5 40px, transparent 40px, transparent 88px)',
                            backgroundSize: '88px 8px',
                            imageRendering: 'pixelated',
                        }}
                        animate={{ backgroundPositionX: ['0px', '-88px'] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                    />
                    {/* Bottom edge line */}
                    <div
                        className="absolute left-0 right-0 bottom-0"
                        style={{ height: 6, backgroundColor: '#1B0645' }}
                    />
                </div>
            </div>
        </div>
    );
}
