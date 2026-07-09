
import * as React from "react"
import { cn } from "@/lib/utils"

export function RetroCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "retro-panel relative p-6 text-[#4c1d95]",
                className
            )}
            {...props}
        >
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}
