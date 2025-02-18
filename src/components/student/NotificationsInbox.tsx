'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import type { Notification } from '@/types/notification';
import { format } from 'date-fns';

export default function NotificationsInbox({ studentId }: { studentId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('studentEmail', '==', studentId)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      // Sort notifications in memory
      notificationsData.sort((a, b) => 
        b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      );
      
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => n.status === 'unread').length);
    });

    return () => unsubscribe();
  }, [studentId]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        status: 'read'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm">
            {unreadCount} new
          </span>
        )}
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div 
            key={notification.id}
            className={`p-4 rounded-lg border cursor-pointer ${
              notification.status === 'unread' 
                ? 'bg-blue-50 border-blue-200'
                : 'bg-white border-gray-200'
            }`}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-gray-900">{notification.title}</h3>
              <span className="text-sm text-gray-500">
                {format(notification.createdAt.toDate(), 'MMM dd, yyyy')}
              </span>
            </div>
            <p className="mt-1 text-gray-600">{notification.message}</p>
            {notification.dueDate && (
              <p className="mt-2 text-sm text-gray-500">
                Due Date: {format(notification.dueDate.toDate(), 'MMM dd, yyyy')}
              </p>
            )}
            {notification.amount && (
              <p className="mt-1 text-sm font-medium text-gray-900">
                Amount: ₱{notification.amount.toLocaleString()}
              </p>
            )}
          </div>
        ))}
        
        {notifications.length === 0 && (
          <p className="text-center text-gray-500 py-4">No notifications yet</p>
        )}
      </div>
    </div>
  );
} 