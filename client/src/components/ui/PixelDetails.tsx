/* Shared tiny pixel-art details used to add life to every page.
   All sprites are palette-locked to the game's sunset colors. */

/* Tiny bus sprite used in dividers (faces right) */
export function MiniBus({ size = 34 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size * 0.56}
            viewBox="0 0 34 19"
            shapeRendering="crispEdges"
            aria-hidden="true"
        >
            <rect x="1" y="2" width="32" height="12" fill="#350D7A" />
            <rect x="3" y="4" width="28" height="8" fill="#FF8A50" />
            <rect x="5" y="6" width="5" height="4" fill="#FFFEE5" />
            <rect x="13" y="6" width="5" height="4" fill="#FFFEE5" />
            <rect x="21" y="6" width="5" height="4" fill="#FFFEE5" />
            <rect x="30" y="8" width="3" height="4" fill="#FFF3B6" />
            <rect x="6" y="14" width="6" height="5" fill="#1B0645" />
            <rect x="22" y="14" width="6" height="5" fill="#1B0645" />
            <rect x="8" y="16" width="2" height="2" fill="#FFFEE5" />
            <rect x="24" y="16" width="2" height="2" fill="#FFFEE5" />
        </svg>
    );
}

/* Divider with a mini bus driving across a dashed road line */
export function BusDivider({ className = '' }: { className?: string }) {
    return (
        <div className={`pw-bus-divider ${className}`} aria-hidden="true">
            <div className="pw-bus-divider-sprite">
                <MiniBus />
            </div>
        </div>
    );
}

/* Pixel corner studs to make cards feel hand-crafted */
export function CornerStuds() {
    return (
        <>
            <span className="pw-corner pw-corner-tl" aria-hidden="true" />
            <span className="pw-corner pw-corner-tr" aria-hidden="true" />
            <span className="pw-corner pw-corner-bl" aria-hidden="true" />
            <span className="pw-corner pw-corner-br" aria-hidden="true" />
        </>
    );
}

/* Stepped pixel loading blocks (waiting indicator) */
export function LoadingBlocks({ className = '' }: { className?: string }) {
    return (
        <span className={`pw-loading-blocks ${className}`} aria-hidden="true">
            <span className="pw-loading-block" />
            <span className="pw-loading-block" />
            <span className="pw-loading-block" />
            <span className="pw-loading-block" />
            <span className="pw-loading-block" />
        </span>
    );
}

const confettiColors = ['#F640A8', '#FF8A50', '#FFC48B', '#A333D5', '#FFFEE5'];

/* Marquee light strip — blinking theater bulbs for competitive headers */
export function MarqueeLights({ count = 12, className = '' }: { count?: number; className?: string }) {
    return (
        <div className={`flex justify-center gap-2 ${className}`} aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <span
                    key={i}
                    className="pw-marquee-bulb"
                    style={{ animationDelay: `${(i % 3) * 0.25}s` }}
                />
            ))}
        </div>
    );
}

/* Pixel firework burst — expanding ring of pixels in hard steps */
export function PixelFireworks({ count = 3 }: { count?: number }) {
    const spots = [
        { top: 8, left: 16 }, { top: 4, left: 78 }, { top: 22, left: 50 },
        { top: 14, left: 34 }, { top: 10, left: 64 },
    ];
    return (
        <div className="absolute inset-x-0 top-0 h-44 overflow-visible pointer-events-none" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => {
                const spot = spots[i % spots.length];
                const color = confettiColors[i % confettiColors.length];
                return (
                    <span
                        key={i}
                        className="pw-firework"
                        style={{
                            top: `${spot.top}%`,
                            left: `${spot.left}%`,
                            color,
                            animationDelay: `${i * 0.9}s`,
                        }}
                    />
                );
            })}
        </div>
    );
}

/* Bus seat grid — the lobby IS the bus: seats fill as players board */
export function BusSeats({ filled, total = 8 }: { filled: number; total?: number }) {
    return (
        <div className="pw-bus-seats" aria-label={`${filled} من ${total} مقاعد محجوزة`}>
            {/* Driver seat + wheel */}
            <div className="pw-seat pw-seat-driver" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges">
                    <circle cx="8" cy="8" r="6" fill="none" stroke="#350D7A" strokeWidth="2.5" />
                    <rect x="7" y="2" width="2" height="6" fill="#350D7A" />
                </svg>
            </div>
            <div className="pw-seat-aisle" aria-hidden="true" />
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className={`pw-seat ${i < filled ? 'pw-seat-filled' : ''}`}
                    style={i < filled ? { animationDelay: `${i * 0.08}s` } : undefined}
                    aria-hidden="true"
                >
                    {i < filled && (
                        <svg width="14" height="14" viewBox="0 0 14 14" shapeRendering="crispEdges">
                            {/* Tiny passenger: head + shoulders */}
                            <rect x="4" y="1" width="6" height="6" fill="#FFFEE5" />
                            <rect x="2" y="8" width="10" height="5" fill="#FFFEE5" />
                        </svg>
                    )}
                </div>
            ))}
        </div>
    );
}

/* Stepped pixel confetti rain for celebration headers */
export function PixelConfettiRain({ count = 14 }: { count?: number }) {
    return (
        <div className="absolute inset-x-0 top-0 h-36 overflow-hidden pointer-events-none" aria-hidden="true">
            {Array.from({ length: count }).map((_, i) => (
                <span
                    key={i}
                    className="pw-confetti-pixel"
                    style={{
                        left: `${(i * 100) / count + (i % 3)}%`,
                        top: `-${6 + (i % 4) * 4}px`,
                        backgroundColor: confettiColors[i % confettiColors.length],
                        animationDelay: `${(i * 0.37) % 2.4}s`,
                        animationDuration: `${2 + (i % 3) * 0.8}s`,
                    }}
                />
            ))}
        </div>
    );
}
