'use client';

import { useEffect } from 'react';
import { createPerformanceObserver } from '@/utils/performance';

export function PerformanceMonitor() {
  useEffect(() => {
    const observer = createPerformanceObserver();
    return () => observer?.disconnect();
  }, []);

  return null;
} 