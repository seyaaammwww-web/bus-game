/**
 * Lazy loading utilities for images and data
 */

import { useEffect, useRef, useState } from 'react';

interface LazyLoadImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Lazy load image component
 */
export function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23e0e0e0" width="400" height="300"/%3E%3C/svg%3E',
  className = '',
  onLoad,
  onError,
}: LazyLoadImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!imageRef) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = src;
            if (onLoad) {
              img.onload = onLoad;
            }
            if (onError) {
              img.onerror = onError as any;
            }
            observerRef.current?.unobserve(img);
          }
        });
      },
      { threshold: 0.01 }
    );

    observerRef.current.observe(imageRef);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [imageRef, src, onLoad, onError]);

  return (
    <img
      ref={setImageRef}
      src={placeholder}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
}

/**
 * Lazy load container - only loads children when visible
 */
export function LazyContainer({
  children,
  onVisible,
  threshold = 0.1,
}: {
  children: React.ReactNode;
  onVisible?: () => void;
  threshold?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            onVisible?.();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [onVisible, threshold]);

  return (
    <div ref={containerRef}>
      {isVisible ? children : <div style={{ minHeight: '200px' }} />}
    </div>
  );
}

/**
 * Lazy load data hook
 */
export function useLazyData<T>(
  fetchFn: () => Promise<T>,
  dependencies: unknown[] = []
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchFn();
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return { data, loading, error };
}

/**
 * Intersection observer hook for visibility detection
 */
export function useInView(
  options: IntersectionObserverInit = { threshold: 0.25 }
): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        setIsInView(entry.isIntersecting);
      });
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return [ref, isInView];
}

/**
 * Utility to load data with retry logic
 */
export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit = {},
  retries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (i < retries - 1) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, backoffMs * Math.pow(2, i)));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Progressive image loading - load low quality first, then high quality
 */
export function LazyProgressiveImage({
  lowSrc,
  highSrc,
  alt,
  className = '',
}: {
  lowSrc: string;
  highSrc: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState(lowSrc);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setSrc(highSrc);
      setIsLoading(false);
    };
    img.src = highSrc;
  }, [highSrc]);

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${isLoading ? 'blur-sm' : 'blur-0'} transition-all`}
      loading="lazy"
    />
  );
}
