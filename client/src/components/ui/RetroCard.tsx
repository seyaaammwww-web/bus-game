
import * as React from "react"
import { cn } from "@/lib/utils"

export function RetroCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                // Clean retro card with gradient background and solid border
                "relative bg-gradient-to-b from-white to-[#faf5ff] rounded-xl",
                "border-[3px] border-[#4c1d95]",
                "shadow-[4px_4px_0_0_#2e1065]",
                "p-6",
                // Hover effect
                "hover:shadow-[6px_6px_0_0_#4c1d95] hover:translate-x-[-2px] hover:translate-y-[-2px]",
                "transition-all duration-200",
                className
            )}
            {...props}
        >
            {/* Content */}
            <div className="relative z-10 text-[#4c1d95] font-pixel-text">
                {children}
            </div>
        </div>
    )
}
