import { Timestamp } from 'firebase/firestore';

export interface Activity {
  id: string;
  type: 'payment' | 'student' | 'system' | 'balance' | 'notification';
  action: string;
  description: string;
  userId: string;
  userType: 'admin' | 'student';
  metadata?: {
    amount?: number;
    studentName?: string;
    paymentMethod?: string;
    balanceType?: string;
    studentsCount?: number;
    totalBalances?: number;
    timestamp?: string;
    [key: string]: any;
  };
  createdAt: Timestamp;
} 