
import * as React from "react"
import { cn } from "@/lib/utils"

// SVG Icons from the design
const TopLeftCorner = () => (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 text-[#FFFEF0] z-0 pointer-events-none">
        <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} width="7" x="8"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 11 3)" width="4" x="11" y="3"></rect>
        <rect fill="#2C0834" height="4" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 8 4)" width="3" x="8" y="4"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 7 7)" width="4" x="7" y="7"></rect>
        <rect fill="#2C0834" height="4" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 4 8)" width="3" x="4" y="8"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 3 11)" width="4" x="3" y="11"></rect>
        <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
        <rect fill="currentColor" height="4" width="4" x="7" y="7"></rect>
        <rect fill="currentColor" height="4" width="4" x="3" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="7" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="11" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="11" y="7"></rect>
    </svg>
)

const TopRightCorner = () => (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 right-0 rotate-90 text-[#FFFEF0] z-0 pointer-events-none">
        <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} width="7" x="8"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 11 3)" width="4" x="11" y="3"></rect>
        <rect fill="#2C0834" height="4" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 8 4)" width="3" x="8" y="4"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 7 7)" width="4" x="7" y="7"></rect>
        <rect fill="#2C0834" height="4" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 4 8)" width="3" x="4" y="8"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 3 11)" width="4" x="3" y="11"></rect>
        <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
        <rect fill="currentColor" height="4" width="4" x="7" y="7"></rect>
        <rect fill="currentColor" height="4" width="4" x="3" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="7" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="11" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="11" y="7"></rect>
    </svg>
)

const BottomLeftCorner = () => (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 left-0 -rotate-90 text-[#FFE8AD] z-0 pointer-events-none">
        <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} width="7" x="8"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 11 3)" width="4" x="11" y="3"></rect>
        <rect fill="#2C0834" height="4" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 8 4)" width="3" x="8" y="4"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 7 7)" width="4" x="7" y="7"></rect>
        <rect fill="#2C0834" height="4" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 4 8)" width="3" x="4" y="8"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 3 11)" width="4" x="3" y="11"></rect>
        <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
        <rect fill="currentColor" height="4" width="4" x="7" y="7"></rect>
        <rect fill="currentColor" height="4" width="4" x="3" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="7" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="11" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="11" y="7"></rect>
    </svg>
)

const BottomRightCorner = () => (
    <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 right-0 rotate-180 text-[#FFE8AD] z-0 pointer-events-none">
        <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} width="7" x="8"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 11 3)" width="4" x="11" y="3"></rect>
        <rect fill="#2C0834" height="4" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 8 4)" width="3" x="8" y="4"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 7 7)" width="4" x="7" y="7"></rect>
        <rect fill="#2C0834" height="4" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 4 8)" width="3" x="4" y="8"></rect>
        <rect fill="#2C0834" height="3" style={{ fill: '#2C0834', fillOpacity: 1 }} transform="rotate(90 3 11)" width="4" x="3" y="11"></rect>
        <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
        <rect fill="currentColor" height="4" width="4" x="7" y="7"></rect>
        <rect fill="currentColor" height="4" width="4" x="3" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="7" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="11" y="11"></rect>
        <rect fill="#FFFDD1" height="4" width="4" x="11" y="7"></rect>
    </svg>
)

// The side arrows with animation
const FocusArrows = () => (
    <div className="absolute inset-0 pointer-events-none focus-arrows overflow-visible z-0">
        <div className="absolute top-1/2 -translate-y-1/2 -left-3 lg:-left-6">
            <svg fill="none" height="18" viewBox="0 0 24 18" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H2V16H14V12H22V6H14V2Z" fill="#FFFDD1" style={{ fill: '#FFFDD1', fillOpacity: 1 }}></path>
                <rect fill="#2C0834" height="10" style={{ fill: '#2C0834', fillOpacity: 1 }} width="2" y="4"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="2" x="2" y="2"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="2" x="2" y="4"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="2" x="2" y="14"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="2" x="2" y="12"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="2" x="22" y="8"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="6" x="4"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="6" x="4" y="16"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="6" x="4" y="2"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="10" y="14"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="10" y="2"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="6" x="4" y="14"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="14" y="4"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="14" y="12"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="4" x="10" y="4"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="10" y="12"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="4" x="14" y="6"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="14" y="10"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="18" y="8"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="18" y="6"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="18" y="10"></rect>
            </svg>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 -right-3 lg:-right-6">
            <svg fill="none" height="18" viewBox="0 0 24 18" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H2V16H14V12H22V6H14V2Z" fill="#FFFDD1" style={{ fill: '#FFFDD1', fillOpacity: 1 }}></path>
                <rect fill="#2C0834" height="10" style={{ fill: '#2C0834', fillOpacity: 1 }} width="2" y="4"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="2" x="2" y="2"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="2" x="2" y="4"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="2" x="2" y="14"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="2" x="2" y="12"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="2" x="22" y="8"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="6" x="4"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="6" x="4" y="16"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="6" x="4" y="2"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="10" y="14"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="10" y="2"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="6" x="4" y="14"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="14" y="4"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="14" y="12"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="4" x="10" y="4"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="10" y="12"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="4" x="14" y="6"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="14" y="10"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="18" y="8"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="18" y="6"></rect>
                <rect fill="#2C0834" height="2" style={{ fill: '#2C0834', fillOpacity: 1 }} width="4" x="18" y="10"></rect>
            </svg>
        </div>
    </div>
)

export function RetroCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "relative bg-[#FFFDD1] border-[3px] border-[#2C0834] p-8",
                className
            )}
            {...props}
        >
            {/* Top/Bottom Lines - adjusted to be behind content but visible */}
            <div className="absolute top-[12px] left-[15px] w-[calc(100%-30px)] h-[1rem] bg-[#FFFEF0] z-0 pointer-events-none" />
            <div className="absolute bottom-[12px] left-[15px] w-[calc(100%-30px)] h-[1rem] bg-[#FFE8AD] z-0 pointer-events-none" />

            {/* Arrow Animations */}
            <FocusArrows />

            {/* Corner Decor */}
            <TopLeftCorner />
            <TopRightCorner />
            <BottomLeftCorner />
            <BottomRightCorner />

            <div className="relative z-10 text-[#31093A] font-pixel-text">
                {children}
            </div>
        </div>
    )
}
