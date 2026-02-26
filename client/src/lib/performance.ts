/**
 * Performance monitoring utilities
 * Tracks memory and CPU usage on mobile and desktop
 */

interface PerformanceMetrics {
  timestamp: number;
  memoryUsage?: number;
  cpuUsage?: number;
  fps?: number;
  isDarkMode?: boolean;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 100;
  private observers: PerformanceObserverEntryList | null = null;
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private fps = 60;

  constructor() {
    this.startFPSMonitoring();
    this.startMemoryMonitoring();
  }

  /**
   * Monitor FPS (frames per second)
   */
  private startFPSMonitoring() {
    const measureFPS = () => {
      this.frameCount++;
      const now = performance.now();
      const delta = now - this.lastFrameTime;

      if (delta >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / delta);
        this.frameCount = 0;
        this.lastFrameTime = now;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * Monitor memory usage (if available in the browser)
   */
  private startMemoryMonitoring() {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memData = (performance as any).memory;
        if (memData) {
          this.recordMetric({
            memoryUsage: Math.round(memData.usedJSHeapSize / 1048576), // Convert to MB
          });
        }
        setTimeout(checkMemory, 5000); // Check every 5 seconds
      };

      checkMemory();
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(data: Partial<PerformanceMetrics>) {
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      fps: this.fps,
      ...data,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      fps: this.fps,
      recentMetrics: this.metrics,
      avgMemory: this.getAverageMetric('memoryUsage'),
      isPerformanceOptimal: this.fps >= 55 && (this.getAverageMetric('memoryUsage') || 0) < 100,
    };
  }

  /**
   * Calculate average metric
   */
  private getAverageMetric(key: keyof PerformanceMetrics): number {
    const values = this.metrics
      .map((m) => m[key] as number)
      .filter((v) => v !== undefined && v !== null);

    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  /**
   * Get performance warning if needed
   */
  getPerformanceWarning(): string | null {
    if (this.fps < 30) return 'Low FPS detected - consider disabling animations';
    const avgMem = this.getAverageMetric('memoryUsage');
    if (avgMem > 150) return 'High memory usage detected - consider clearing cache';
    return null;
  }

  /**
   * Clear metrics history
   */
  clearMetrics() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Hook to use performance monitoring
 */
export function usePerformanceMonitoring() {
  return performanceMonitor.getMetrics();
}
