/**
 * Animation optimization utilities
 * Prevents animation overload and improves performance
 */

interface AnimationConfig {
  enableAnimations: boolean;
  reduceMotion: boolean;
  animationFrameRate: number; // 0-60 fps
}

class AnimationOptimizer {
  private config: AnimationConfig = {
    enableAnimations: true,
    reduceMotion: false,
    animationFrameRate: 60,
  };

  private prefersReducedMotion = false;

  constructor() {
    this.detectReducedMotion();
    this.detectPerformance();
  }

  /**
   * Detect if user prefers reduced motion
   */
  private detectReducedMotion(): void {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = mediaQuery.matches;

      // Listen for changes
      mediaQuery.addEventListener('change', (e) => {
        this.prefersReducedMotion = e.matches;
      });
    }
  }

  /**
   * Detect device performance
   */
  private detectPerformance(): void {
    if (typeof window !== 'undefined') {
      // Check if device has low memory (mobile)
      const memoryInfo = (performance as any).memory;
      if (memoryInfo && memoryInfo.jsHeapSizeLimit < 536870912) {
        // Less than 512MB
        this.config.animationFrameRate = 30;
        this.config.enableAnimations = false; // Disable complex animations
      }

      // Check if device is low-power
      const connection = (navigator as any).connection;
      if (connection && (connection.effectiveType === '2g' || connection.effectiveType === '3g')) {
        this.config.animationFrameRate = 24;
      }
    }
  }

  /**
   * Get animation variant based on device performance
   */
  getAnimationVariant(complexity: 'simple' | 'moderate' | 'complex'): any {
    if (this.prefersReducedMotion || !this.config.enableAnimations) {
      return {
        animate: {},
        transition: { duration: 0.1 },
      };
    }

    switch (complexity) {
      case 'simple':
        return {
          animate: { opacity: [0, 1], scale: [0.95, 1] },
          transition: { duration: 0.2 },
        };
      case 'moderate':
        return {
          animate: { opacity: [0, 1], scale: [0.9, 1], y: [10, 0] },
          transition: { duration: 0.4, type: 'spring', stiffness: 300 },
        };
      case 'complex':
        return {
          animate: { opacity: [0, 1], scale: [0.8, 1], rotate: [0, 5, 0], y: [20, 0] },
          transition: { duration: 0.6, type: 'spring', stiffness: 200 },
        };
    }
  }

  /**
   * Check if animations should be enabled
   */
  shouldAnimate(): boolean {
    return this.config.enableAnimations && !this.prefersReducedMotion;
  }

  /**
   * Get reduced transition duration
   */
  getTransitionDuration(baseMs: number): number {
    if (!this.config.enableAnimations) return 0;
    if (this.prefersReducedMotion) return baseMs * 0.5;
    return baseMs;
  }

  /**
   * Get animation delay for staggered animations
   */
  getStaggerDelay(index: number, baseDelay: number = 50): number {
    if (!this.config.enableAnimations) return 0;
    return index * baseDelay;
  }

  /**
   * Disable animations on demand (e.g., during heavy loads)
   */
  disableAnimations(): void {
    this.config.enableAnimations = false;
  }

  /**
   * Enable animations (when performance improves)
   */
  enableAnimations(): void {
    this.config.enableAnimations = true;
  }
}

export const animationOptimizer = new AnimationOptimizer();

/**
 * Hook to use animation optimization
 */
export function useAnimationConfig() {
  return {
    shouldAnimate: animationOptimizer.shouldAnimate(),
    getVariant: (complexity: 'simple' | 'moderate' | 'complex') =>
      animationOptimizer.getAnimationVariant(complexity),
    getDuration: (baseMs: number) => animationOptimizer.getTransitionDuration(baseMs),
    getDelay: (index: number) => animationOptimizer.getStaggerDelay(index),
  };
}

/**
 * Prefers reduced motion CSS
 */
export const reducedMotionStyles = {
  '@media (prefers-reduced-motion: reduce)': {
    '*': {
      animationDuration: '0.01ms !important',
      transitionDuration: '0.01ms !important',
    },
  },
};

/**
 * Optimized animation timing presets
 */
export const animationTiming = {
  fast: { duration: 0.2, ease: 'easeInOut' },
  normal: { duration: 0.4, ease: 'easeInOut' },
  slow: { duration: 0.6, ease: 'easeInOut' },
  spring: { type: 'spring', stiffness: 400, damping: 25 },
  gentleSpring: { type: 'spring', stiffness: 200, damping: 30 },
};

/**
 * Utility to throttle animation updates
 */
export function throttleAnimation(callback: () => void, fps: number = 60): () => void {
  let lastCall = 0;
  const interval = 1000 / fps;

  return () => {
    const now = Date.now();
    if (now - lastCall >= interval) {
      callback();
      lastCall = now;
    }
  };
}
