importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCZ4ng3Vuc78ZfLg8vu801Tbd3x3HETzBc",
    authDomain: "sps-test-65a61.firebaseapp.com",
    projectId: "sps-test-65a61",
    storageBucket: "sps-test-65a61.firebasestorage.app",
    messagingSenderId: "856758716024",
    appId: "1:856758716024:web:9ca2f282afa21db18dcf8d"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
    console.log('Received background message:', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
}); 