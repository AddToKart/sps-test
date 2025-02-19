import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app } from './config'; // Ensure you import your Firebase app configuration

let messaging: any = null;

// Initialize messaging only if it's supported
const initializeMessaging = async () => {
    try {
        const isSupportedBrowser = await isSupported();
        if (!isSupportedBrowser) {
            console.log('Firebase messaging is not supported in this browser');
            return false;
        }

        // Only initialize messaging once
        if (!messaging) {
            messaging = getMessaging(app);
        }

        // Request permission first
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error initializing messaging:', error);
        return false;
    }
};

export const requestForToken = async () => {
    if (typeof window === 'undefined') return null;

    try {
        const isInitialized = await initializeMessaging();
        if (!isInitialized) return null;

        const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
        });

        if (currentToken) {
            console.log('Current token:', currentToken);
            return currentToken;
        } else {
            console.log('No registration token available');
            return null;
        }
    } catch (error) {
        console.error('An error occurred while retrieving token:', error);
        return null;
    }
};

export const listenForMessages = async () => {
    if (typeof window === 'undefined') return;

    try {
        const isInitialized = await initializeMessaging();
        if (!isInitialized) return;

        onMessage(messaging, (payload) => {
            console.log('Message received:', payload);
            // Handle foreground messages here
            if (Notification.permission === 'granted') {
                new Notification(payload.notification?.title || 'New Message', {
                    body: payload.notification?.body
                });
            }
        });
    } catch (error) {
        console.error('Error setting up message listener:', error);
    }
}; 