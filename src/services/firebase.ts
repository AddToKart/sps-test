import { db, auth } from '@/lib/firebase/config';
import { collection, query, where, getDocs, DocumentData, Query } from 'firebase/firestore';
import { measurePerformance } from '@/utils/performance';
import { handleError, AppError } from '@/utils/error';

// Simple cache implementation
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export class FirebaseService {
  private static generateCacheKey(path: string, queryParams?: any): string {
    return `${path}:${JSON.stringify(queryParams || {})}`;
  }

  static async queryWithCache<T>(
    path: string,
    queryFn: () => Query<DocumentData>,
    options: {
      useCache?: boolean;
      cacheDuration?: number;
    } = {}
  ): Promise<T[]> {
    const cacheKey = this.generateCacheKey(path, queryFn.toString());
    const cached = queryCache.get(cacheKey);

    if (
      options.useCache && 
      cached && 
      Date.now() - cached.timestamp < (options.cacheDuration || CACHE_DURATION)
    ) {
      return cached.data as T[];
    }

    try {
      const result = await measurePerformance(`query:${path}`, async () => {
        const querySnapshot = await getDocs(queryFn());
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
      });

      queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      throw handleError(error);
    }
  }

  static clearCache() {
    queryCache.clear();
  }
} 