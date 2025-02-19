'use client';

import { useEffect } from 'react';
import { requestForToken, listenForMessages } from '@/lib/firebase/messaging';

export default function FirebaseMessaging() {
    useEffect(() => {
        const initializeFirebaseMessaging = async () => {
            try {
                // Check if we're in a browser and if notifications are supported
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    // Request permission first
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        const token = await requestForToken();
                        if (token) {
                            await listenForMessages();
                        }
                    }
                }
            } catch (error) {
                console.error('Error initializing Firebase Messaging:', error);
            }
        };

        initializeFirebaseMessaging();
    }, []);

    return null; // This component doesn't render anything
} 