import { PerformanceObserver } from 'perf_hooks';

export const initializeMonitoring = () => {
  // Performance monitoring
  if (typeof window !== 'undefined') {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        console.log(`${entry.name}: ${entry.duration}ms`);
        // Send to monitoring service
      });
    });

    observer.observe({ entryTypes: ['measure'] });
  }
};

export const measureAsync = async <T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    performance.measure(name, { duration });
  }
}; 