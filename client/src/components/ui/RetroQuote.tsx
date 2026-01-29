import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

// Specific Retro Quote Arrows inspired by the reference
const QuoteArrows = () => (
    <div className="absolute inset-0 pointer-events-none focus-arrows overflow-visible z-0">
        <div className="absolute top-1/2 -translate-y-1/2 -left-3 lg:-left-6">
            <svg fill="none" height="18" viewBox="0 0 24 18" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H2V16H14V12H22V6H14V2Z" fill="#FFFDD1" style={{ fill: '#FFFDD1', fillOpacity: 1 }}></path>
                <rect fill="#2e1065" height="10" style={{ fill: '#2e1065', fillOpacity: 1 }} width="2" y="4"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="2" x="2" y="2"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="2" x="2" y="4"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="2" x="2" y="14"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="2" x="2" y="12"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="2" x="22" y="8"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="6" x="4"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="6" x="4" y="16"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="6" x="4" y="2"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="10" y="14"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="10" y="2"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="6" x="4" y="14"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="14" y="4"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="14" y="12"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="4" x="10" y="4"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="10" y="12"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="4" x="14" y="6"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="14" y="10"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="18" y="8"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="18" y="6"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="18" y="10"></rect>
            </svg>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 -right-3 lg:-right-6">
            <svg fill="none" height="18" viewBox="0 0 24 18" width="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H2V16H14V12H22V6H14V2Z" fill="#FFFDD1" style={{ fill: '#FFFDD1', fillOpacity: 1 }}></path>
                <rect fill="#2e1065" height="10" style={{ fill: '#2e1065', fillOpacity: 1 }} width="2" y="4"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="2" x="2" y="2"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="2" x="2" y="4"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="2" x="2" y="14"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="2" x="2" y="12"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="2" x="22" y="8"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="6" x="4"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="6" x="4" y="16"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="6" x="4" y="2"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="10" y="14"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="10" y="2"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="6" x="4" y="14"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="14" y="4"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="14" y="12"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="4" x="10" y="4"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="10" y="12"></rect>
                <rect fill="#FFFEF0" height="2" style={{ fill: '#FFFEF0', fillOpacity: 1 }} width="4" x="14" y="6"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="14" y="10"></rect>
                <rect fill="#FFE8AD" height="2" style={{ fill: '#FFE8AD', fillOpacity: 1 }} width="4" x="18" y="8"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="18" y="6"></rect>
                <rect fill="#2e1065" height="2" style={{ fill: '#2e1065', fillOpacity: 1 }} width="4" x="18" y="10"></rect>
            </svg>
        </div>
    </div>
)

interface RetroQuoteProps extends React.ComponentProps<typeof motion.div> {
    title?: string;
    variant?: 'yellow' | 'white';
    children?: React.ReactNode;
}

export function RetroQuote({ children, className, title, variant = 'yellow', ...props }: RetroQuoteProps) {
    const bgColor = variant === 'yellow' ? 'bg-[#FFFDD1]' : 'bg-white';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "relative text-center py-6 px-12 max-w-lg mx-auto",
                "border-[3px] border-[#2e1065]",
                "shadow-[4px_4px_0px_rgba(0,0,0,0.2)]", // Distinctive shadow
                bgColor,
                className
            )}
            {...props}
        >
            {/* Inner Border Effect (pseudo-element simulation) */}
            <div className="absolute inset-[3px] border border-[#2e1065]/10 pointer-events-none" />

            <QuoteArrows />

            {title && (
                <div className="mb-2 font-pixel-title text-sm uppercase tracking-widest text-[#2e1065]/60">
                    {title}
                </div>
            )}

            <div className="relative z-10 text-[#4c1d95] font-pixel-text leading-relaxed">
                {children}
            </div>
        </motion.div>
    )
}

