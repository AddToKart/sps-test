import { Timestamp } from 'firebase/firestore';

export interface Notification {
  id: string;
  studentId: string;
  title: string;
  message: string;
  type: 'payment_reminder' | 'overdue_reminder' | 'payment_confirmation';
  status: 'unread' | 'read';
  createdAt: Timestamp;
  relatedBalanceId?: string;
  dueDate?: Timestamp;
  amount?: number;
} 