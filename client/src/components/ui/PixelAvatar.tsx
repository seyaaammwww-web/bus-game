import * as React from "react"
import { User } from 'lucide-react';
import { cn } from "@/lib/utils"

interface PixelAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string;
    alt?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function PixelAvatar({ src, alt, size = 'md', className, ...props }: PixelAvatarProps) {
    const sizeClasses = {
        sm: "w-12 h-12",
        md: "w-24 h-24",
        lg: "w-32 h-32",
    };

    return (
        <div
            className={cn(
                "relative inline-flex items-center justify-center overflow-hidden rounded-2xl",
                "bg-gradient-to-br from-white to-purple-50 border border-purple-200/60",
                "shadow-md ring-2 ring-white/80",
                sizeClasses[size],
                className
            )}
            {...props}
        >
            {src ? (
                <img src={src} alt={alt ?? ''} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full bg-purple-50 flex items-center justify-center text-[#6714A8]">
                    <User className="w-1/2 h-1/2 opacity-60" />
                </div>
            )}
        </div>
    )
}
