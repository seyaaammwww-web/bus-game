import { useState, useEffect } from 'react';

/**
 * Custom hook to safely detect if the current viewport is mobile-sized (width < 1024px).
 * Safely handles SSR/hydration by defaulting to false initially and updating after mount.
 */
export function useIsMobile(breakpoint = 1024) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Only run on the client
        if (typeof window === 'undefined') return;

        const checkMobile = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        // Initial check
        checkMobile();

        // Setup event listener
        window.addEventListener('resize', checkMobile);

        // Cleanup
        return () => window.removeEventListener('resize', checkMobile);
    }, [breakpoint]);

    return isMobile;
}
