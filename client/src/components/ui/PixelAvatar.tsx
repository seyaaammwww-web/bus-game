import * as React from "react"
import { User } from 'lucide-react';
import { cn } from "@/lib/utils"

interface PixelAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string;
    alt?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const PixelAvatar = React.memo(function PixelAvatar({ src, alt, size = 'md', className, ...props }: PixelAvatarProps) {
    const sizeClasses = {
        sm: "w-12 h-12",
        md: "w-24 h-24",
        lg: "w-32 h-32",
    };

    return (
        <div
            className={cn(
                "relative inline-flex items-center justify-center p-1",
                "bg-[#FFFDD1] border-[3px] border-[#2e1065]",
                "shadow-[3px_3px_0px_#2e1065]",
                sizeClasses[size],
                className
            )}
            {...props}
        >
            {/* Inner frame decor corners */}
            <div className="absolute top-0 left-0 w-1 h-1 bg-[#2e1065]" />
            <div className="absolute top-0 right-0 w-1 h-1 bg-[#2e1065]" />
            <div className="absolute bottom-0 left-0 w-1 h-1 bg-[#2e1065]" />
            <div className="absolute bottom-0 right-0 w-1 h-1 bg-[#2e1065]" />

            <div className="w-full h-full bg-[#FFFEF0] flex items-center justify-center text-[#2e1065]">
                <User className="w-1/2 h-1/2 opacity-50" />
            </div>
        </div>
    )
});

