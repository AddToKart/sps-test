'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import { format } from 'date-fns';

interface Notification {
    id: string;
    title: string;
    message: string;
    status: 'read' | 'unread';
    createdAt: any;
    type: string;
}

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.email) return;

        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('studentEmail', '==', user.email),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            const notificationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notification[];
            setNotifications(notificationsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const markAsRead = async (notificationId: string) => {
        try {
            await updateDoc(doc(db, 'notifications', notificationId), {
                status: 'read'
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4FB3E8]"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Notifications</h1>
                <p className="text-gray-600">Stay updated with your payment reminders and announcements</p>
            </div>

            <div className="space-y-4">
                {notifications.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No notifications yet</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-4 rounded-lg border transition-colors ${
                                notification.status === 'unread'
                                    ? 'bg-blue-50 border-blue-200'
                                    : 'bg-white border-gray-200'
                            }`}
                            onClick={() => markAsRead(notification.id)}
                        >
                            <div className="flex justify-between items-start">
                                <h3 className="font-medium text-gray-900">{notification.title}</h3>
                                <span className="text-sm text-gray-500">
                                    {format(notification.createdAt.toDate(), 'MMM dd, yyyy h:mm a')}
                                </span>
                            </div>
                            <p className="mt-1 text-gray-600">{notification.message}</p>
                            {notification.status === 'unread' && (
                                <span className="inline-block mt-2 text-xs font-medium text-blue-600">
                                    Click to mark as read
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
} 