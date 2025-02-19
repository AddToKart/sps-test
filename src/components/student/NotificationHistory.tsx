'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Notification } from '@/types/notification';

export default function NotificationHistory({ studentEmail }: { studentEmail: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where('studentEmail', '==', studentEmail)
        );

        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            const notificationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notification[];
            setNotifications(notificationsData);
        });

        return () => unsubscribe();
    }, [studentEmail]);

    return (
        <div>
            <h2 className="text-lg font-semibold">Notification History</h2>
            <ul>
                {notifications.map(notification => (
                    <li key={notification.id} className="border-b py-2">
                        <h3 className="font-medium">{notification.title}</h3>
                        <p>{notification.message}</p>
                        <span className="text-sm text-gray-500">{notification.createdAt.toDate().toLocaleString()}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
} 