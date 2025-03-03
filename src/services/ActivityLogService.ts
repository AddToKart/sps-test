import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { ErrorHandlingService } from './ErrorHandlingService';

export class ActivityLogService {
  static async logActivity(activity: {
    type: string;
    action: string;
    userId: string;
    details: any;
  }) {
    try {
      await addDoc(collection(db, 'activityLogs'), {
        ...activity,
        timestamp: Timestamp.now(),
        ipAddress: window.sessionStorage.getItem('userIp') || 'unknown'
      });
    } catch (error) {
      ErrorHandlingService.handleError(error, 'Failed to log activity');
    }
  }

  static async getActivityLogs(userId: string, startDate: Date, endDate: Date) {
    try {
      const q = query(
        collection(db, 'activityLogs'),
        where('userId', '==', userId),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate))
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      ErrorHandlingService.handleError(error, 'Failed to fetch activity logs');
      return [];
    }
  }
} 