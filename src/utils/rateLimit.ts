import { NextRequest } from 'next/server';

const rateLimit = new Map<string, { count: number; timestamp: number }>();
const WINDOW_SIZE = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100; // per minute

export function checkRateLimit(req: NextRequest): boolean {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE;

  const current = rateLimit.get(ip) || { count: 0, timestamp: now };

  if (current.timestamp < windowStart) {
    current.count = 0;
    current.timestamp = now;
  }

  if (current.count >= MAX_REQUESTS) {
    return false;
  }

  current.count++;
  rateLimit.set(ip, current);

  return true;
} 