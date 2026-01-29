import React, { useEffect, useState, useMemo } from 'react';
import '../styles/WorkOSBackground.css';

interface Star {
    id: number;
    top: number;
    left: number;
    delay: number;
    size: number;
}

const WorkOSBackground: React.FC = () => {
    // Generate stars once on mount
    const stars = useMemo(() => {
        const generated: Star[] = [];
        for (let i = 0; i < 80; i++) {
            generated.push({
                id: i,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 3,
                size: Math.random() > 0.7 ? 3 : 2,
            });
        }
        return generated;
    }, []);

    return (
        <div className="workos-background">
            {/* Stars Layer */}
            <div className="workos-stars-container">
                {stars.map((star) => (
                    <div
                        key={star.id}
                        className="workos-star blink"
                        style={{
                            top: `${star.top}%`,
                            left: `${star.left}%`,
                            animationDelay: `${star.delay}s`,
                            width: star.size,
                            height: star.size,
                        }}
                    />
                ))}
            </div>

            {/* Dots Overlay */}
            <div className="workos-dots-overlay" />

            {/* Moon */}
            <img
                src="/images/hero/moon.png"
                alt=""
                className="workos-moon"
            />

            {/* Clouds Layer */}
            <div className="workos-clouds-container">
                <img src="/images/hero/clouds/1.png" className="workos-cloud workos-cloud-1" alt="" />
                <img src="/images/hero/clouds/2.png" className="workos-cloud workos-cloud-2" alt="" />
                <img src="/images/hero/clouds/3.png" className="workos-cloud workos-cloud-3" alt="" />
                <img src="/images/hero/clouds/4.png" className="workos-cloud workos-cloud-4" alt="" />
                <img src="/images/hero/clouds/5.png" className="workos-cloud workos-cloud-5" alt="" />
            </div>

            {/* Vignette */}
            <div className="workos-vignette" />
        </div>
    );
};

export default WorkOSBackground;
