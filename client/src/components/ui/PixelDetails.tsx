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
