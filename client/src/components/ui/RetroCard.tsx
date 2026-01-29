
import * as React from "react"
import { cn } from "@/lib/utils"

// SVG Icons from the design - Updated with purple theme
const TopLeftCorner = () => (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 text-white z-0 pointer-events-none">
        <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="7" x="8"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 11 3)" width="4" x="11" y="3"></rect>
        <rect fill="#4c1d95" height="4" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 8 4)" width="3" x="8" y="4"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 7 7)" width="4" x="7" y="7"></rect>
        <rect fill="#4c1d95" height="4" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 4 8)" width="3" x="4" y="8"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 3 11)" width="4" x="3" y="11"></rect>
        <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
        <rect fill="currentColor" height="4" width="4" x="7" y="7"></rect>
        <rect fill="currentColor" height="4" width="4" x="3" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="7" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="11" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="11" y="7"></rect>
    </svg>
)

const TopRightCorner = () => (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 right-0 rotate-90 text-white z-0 pointer-events-none">
        <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="7" x="8"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 11 3)" width="4" x="11" y="3"></rect>
        <rect fill="#4c1d95" height="4" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 8 4)" width="3" x="8" y="4"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 7 7)" width="4" x="7" y="7"></rect>
        <rect fill="#4c1d95" height="4" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 4 8)" width="3" x="4" y="8"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 3 11)" width="4" x="3" y="11"></rect>
        <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
        <rect fill="currentColor" height="4" width="4" x="7" y="7"></rect>
        <rect fill="currentColor" height="4" width="4" x="3" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="7" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="11" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="11" y="7"></rect>
    </svg>
)

const BottomLeftCorner = () => (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 left-0 -rotate-90 text-[#e9d5ff] z-0 pointer-events-none">
        <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="7" x="8"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 11 3)" width="4" x="11" y="3"></rect>
        <rect fill="#4c1d95" height="4" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 8 4)" width="3" x="8" y="4"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 7 7)" width="4" x="7" y="7"></rect>
        <rect fill="#4c1d95" height="4" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 4 8)" width="3" x="4" y="8"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 3 11)" width="4" x="3" y="11"></rect>
        <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
        <rect fill="currentColor" height="4" width="4" x="7" y="7"></rect>
        <rect fill="currentColor" height="4" width="4" x="3" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="7" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="11" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="11" y="7"></rect>
    </svg>
)

const BottomRightCorner = () => (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 right-0 rotate-180 text-[#e9d5ff] z-0 pointer-events-none">
        <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="7" x="8"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 11 3)" width="4" x="11" y="3"></rect>
        <rect fill="#4c1d95" height="4" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 8 4)" width="3" x="8" y="4"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 7 7)" width="4" x="7" y="7"></rect>
        <rect fill="#4c1d95" height="4" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 4 8)" width="3" x="4" y="8"></rect>
        <rect fill="#4c1d95" height="3" style={{ fill: '#4c1d95', fillOpacity: 1 }} transform="rotate(90 3 11)" width="4" x="3" y="11"></rect>
        <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
        <rect fill="currentColor" height="4" width="4" x="7" y="7"></rect>
        <rect fill="currentColor" height="4" width="4" x="3" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="7" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="11" y="11"></rect>
        <rect fill="#faf5ff" height="4" width="4" x="11" y="7"></rect>
    </svg>
)

// The side arrows with animation - Updated with purple theme
const FocusArrows = () => (
    <div className="absolute inset-0 pointer-events-none focus-arrows overflow-visible z-0">
        <div className="absolute top-1/2 -translate-y-1/2 -left-3 lg:-left-6">
            <svg fill="none" height="18" viewBox="0 0 24 18" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H2V16H14V12H22V6H14V2Z" fill="#faf5ff" style={{ fill: '#faf5ff', fillOpacity: 1 }}></path>
                <rect fill="#4c1d95" height="10" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="2" y="4"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="2" x="2" y="2"></rect>
                <rect fill="white" height="2" style={{ fill: 'white', fillOpacity: 1 }} width="2" x="2" y="4"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="2" x="2" y="14"></rect>
                <rect fill="#e9d5ff" height="2" style={{ fill: '#e9d5ff', fillOpacity: 1 }} width="2" x="2" y="12"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="2" x="22" y="8"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="6" x="4"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="6" x="4" y="16"></rect>
                <rect fill="white" height="2" style={{ fill: 'white', fillOpacity: 1 }} width="6" x="4" y="2"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="10" y="14"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="10" y="2"></rect>
                <rect fill="#e9d5ff" height="2" style={{ fill: '#e9d5ff', fillOpacity: 1 }} width="6" x="4" y="14"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="14" y="4"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="14" y="12"></rect>
                <rect fill="white" height="2" style={{ fill: 'white', fillOpacity: 1 }} width="4" x="10" y="4"></rect>
                <rect fill="#e9d5ff" height="2" style={{ fill: '#e9d5ff', fillOpacity: 1 }} width="4" x="10" y="12"></rect>
                <rect fill="white" height="2" style={{ fill: 'white', fillOpacity: 1 }} width="4" x="14" y="6"></rect>
                <rect fill="#e9d5ff" height="2" style={{ fill: '#e9d5ff', fillOpacity: 1 }} width="4" x="14" y="10"></rect>
                <rect fill="#e9d5ff" height="2" style={{ fill: '#e9d5ff', fillOpacity: 1 }} width="4" x="18" y="8"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="18" y="6"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="18" y="10"></rect>
            </svg>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 -right-3 lg:-right-6">
            <svg fill="none" height="18" viewBox="0 0 24 18" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H2V16H14V12H22V6H14V2Z" fill="#faf5ff" style={{ fill: '#faf5ff', fillOpacity: 1 }}></path>
                <rect fill="#4c1d95" height="10" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="2" y="4"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="2" x="2" y="2"></rect>
                <rect fill="white" height="2" style={{ fill: 'white', fillOpacity: 1 }} width="2" x="2" y="4"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="2" x="2" y="14"></rect>
                <rect fill="#e9d5ff" height="2" style={{ fill: '#e9d5ff', fillOpacity: 1 }} width="2" x="2" y="12"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="2" x="22" y="8"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="6" x="4"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="6" x="4" y="16"></rect>
                <rect fill="white" height="2" style={{ fill: 'white', fillOpacity: 1 }} width="6" x="4" y="2"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="10" y="14"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="10" y="2"></rect>
                <rect fill="#e9d5ff" height="2" style={{ fill: '#e9d5ff', fillOpacity: 1 }} width="6" x="4" y="14"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="14" y="4"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="14" y="12"></rect>
                <rect fill="white" height="2" style={{ fill: 'white', fillOpacity: 1 }} width="4" x="10" y="4"></rect>
                <rect fill="#e9d5ff" height="2" style={{ fill: '#e9d5ff', fillOpacity: 1 }} width="4" x="10" y="12"></rect>
                <rect fill="white" height="2" style={{ fill: 'white', fillOpacity: 1 }} width="4" x="14" y="6"></rect>
                <rect fill="#e9d5ff" height="2" style={{ fill: '#e9d5ff', fillOpacity: 1 }} width="4" x="14" y="10"></rect>
                <rect fill="#e9d5ff" height="2" style={{ fill: '#e9d5ff', fillOpacity: 1 }} width="4" x="18" y="8"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="18" y="6"></rect>
                <rect fill="#4c1d95" height="2" style={{ fill: '#4c1d95', fillOpacity: 1 }} width="4" x="18" y="10"></rect>
            </svg>
        </div>
    </div>
)

export function RetroCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                // Updated: White/ivory background with purple border and glowing shadow
                "relative bg-gradient-to-b from-white to-[#faf5ff] border-[3px] border-[#4c1d95] shadow-[4px_4px_0_0_#2e1065,_0_0_20px_rgba(139,92,246,0.15)] p-6",
                "before:absolute before:inset-[4px] before:border-[2px] before:border-[#8b5cf6]/10 before:pointer-events-none",
                "after:absolute after:inset-[2px] after:border-[1px] after:border-[#4c1d95]/20 after:pointer-events-none",
                // Hover glow effect
                "hover:shadow-[6px_6px_0_0_#4c1d95,_0_0_30px_rgba(139,92,246,0.25)] transition-shadow duration-300",
                className
            )}
            {...props}
        >
            {/* Top/Bottom Lines - Updated with purple theme */}
            <div className="absolute top-[12px] left-[15px] w-[calc(100%-30px)] h-[1rem] bg-white z-0 pointer-events-none" />
            <div className="absolute bottom-[12px] left-[15px] w-[calc(100%-30px)] h-[1rem] bg-[#e9d5ff] z-0 pointer-events-none" />

            {/* Arrow Animations */}
            <FocusArrows />

            {/* Corner Decor */}
            <TopLeftCorner />
            <TopRightCorner />
            <BottomLeftCorner />
            <BottomRightCorner />

            {/* Content - Updated text color to dark purple */}
            <div className="relative z-10 text-[#4c1d95] font-pixel-text">
                {children}
            </div>
        </div>
    )
}
