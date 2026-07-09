
import React from 'react';
import { cn } from '@/lib/utils';


interface Text3DProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    shadowColor?: string;
    shadowDepth?: number; // In pixels
    textColor?: string;
    className?: string;
}

export function Text3D({
    children,
    shadowColor = '#350D7A',
    shadowDepth = 2,
    textColor = 'white',
    className,
    style,
    ...props
}: Text3DProps) {

    // We use the CSS variable approach extracted from WorkOS source
    // .text-original { --sn: calc(var(--shadow) * -1); ... }

    const customStyle = {
        '--shadow': `${shadowDepth}px`,
        '--color': shadowColor,
        color: textColor,
        ...style
    } as React.CSSProperties;

    return (
        <div
            className={cn("text-original font-pixel-title leading-tight", className)}
            style={customStyle}
            {...props}
        >
            {children}
        </div>
    );
}
