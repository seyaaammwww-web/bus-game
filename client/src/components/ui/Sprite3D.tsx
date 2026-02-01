
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Sprite3DProps {
    frames: string[];
    fps?: number;
    className?: string;
    width?: number;
    height?: number;
    alt?: string;
    isPlaying?: boolean;
}

export function Sprite3D({
    frames,
    fps = 12,
    className,
    width,
    height,
    alt = '3D Animation',
    isPlaying = true
}: Sprite3DProps) {
    const [currentFrame, setCurrentFrame] = useState(0);

    useEffect(() => {
        if (!isPlaying || frames.length === 0) return;

        const interval = setInterval(() => {
            setCurrentFrame(prev => (prev + 1) % frames.length);
        }, 1000 / fps);

        return () => clearInterval(interval);
    }, [frames.length, fps, isPlaying]);

    if (frames.length === 0) return null;

    return (
        <div className={cn("relative inline-block", className)} style={{ width, height }}>
            {frames.map((src, index) => (
                <img
                    key={src}
                    src={src}
                    alt={`${alt} frame ${index}`}
                    width={width}
                    height={height}
                    className={cn(
                        "absolute inset-0 w-full h-full object-contain pixelated transition-opacity duration-0",
                        index === currentFrame ? "opacity-100 z-10" : "opacity-0 z-0"
                    )}
                />
            ))}
        </div>
    );
}
