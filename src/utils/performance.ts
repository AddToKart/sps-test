'use client';

export const measurePerformance = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`${name} took ${duration.toFixed(2)}ms`);
    }
    // You can send this to your analytics service
  }
};

export const createPerformanceObserver = () => {
  if (typeof window !== 'undefined') {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
    return observer;
  }
  return null;
}; 