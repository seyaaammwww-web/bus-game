import React, { useEffect, useState } from 'react';
import './DynamicPixelStyles.css';

const DynamicPixelBackground = () => {
    // Generate random stars for the background
    const [stars, setStars] = useState<{ id: number; top: number; left: number; delay: number }[]>([]);

    useEffect(() => {
        const generatedStars = [];
        for (let i = 0; i < 50; i++) {
            generatedStars.push({
                id: i,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 3,
            });
        }
        setStars(generatedStars);
    }, []);

    return (
        <div className="dynamic-pixel-background">
            {/* Stars Layer */}
            <div className="stars-container">
                {stars.map((star) => (
                    <div
                        key={star.id}
                        className="star blink"
                        style={{
                            top: `${star.top}%`,
                            left: `${star.left}%`,
                            animationDelay: `${star.delay}s`,
                        }}
                    />
                ))}
            </div>

            {/* Moon Layer */}
            <img
                src="/images/hero/moon.png"
                alt="Pixel Moon"
                className="hero-moon"
                onError={(e) => {
                    // Fallback if image copy failed - a CSS moon
                    e.currentTarget.style.display = 'none';
                }}
            />
            {/* If image fails, consider adding a fallback CSS moon here */}

            {/* Clouds Layer */}
            <div className="clouds-container">
                {/* Using multiple cloud instances with different animation speeds/delays */}
                <img src="/images/hero/clouds/1.png" className="pixel-cloud cloud-1" alt="" />
                <img src="/images/hero/clouds/2.png" className="pixel-cloud cloud-2" alt="" />
                <img src="/images/hero/clouds/1.png" className="pixel-cloud cloud-3" style={{ animationDelay: '20s', top: '60%' }} alt="" />
            </div>

            {/* Dots Overlay */}
            <div className="dots-overlay"></div>

            {/* Vignette for depth */}
            <div className="vignette"></div>
        </div>
    );
};

export default DynamicPixelBackground;
