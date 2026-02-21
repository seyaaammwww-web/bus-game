
import * as React from "react"
import { cn } from "@/lib/utils"

export function RetroCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "retro-panel relative bg-gradient-to-b from-white to-[#faf5ff] p-6 text-[#4c1d95] font-pixel-text",
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
