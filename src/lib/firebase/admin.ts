import admin from 'firebase-admin';

// Check if there's a service account key
if (!process.env.FIREBASE_PRIVATE_KEY) {
  throw new Error('Firebase Admin private key is missing');
}

// Initialize Firebase Admin only if it hasn't been initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error.stack);
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin }; 