import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

export async function GET() {
  try {
    const auth = getAuth();
    const db = getFirestore();
    const { users } = await auth.listUsers();
    
    // Get all student users from Auth
    const studentUsers = users.filter(user => user.email?.endsWith('@student.com'));

    // Get existing students from Firestore
    const studentsSnapshot = await db.collection('students').get();
    const existingStudents = new Map();

    // Create map of existing students
    studentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!existingStudents.has(data.email)) {
        existingStudents.set(data.email, {
          id: doc.id,
          ...data
        });
      }
    });

    // Clean up duplicates and ensure one record per email
    for (const user of studentUsers) {
      if (user.email) {
        const existingDocs = await db.collection('students')
          .where('email', '==', user.email)
          .get();

        // Delete all but the newest document if duplicates exist
        if (existingDocs.size > 1) {
          const sortedDocs = existingDocs.docs.sort((a, b) => {
            const aCreated = a.data().createdAt?.toDate() || new Date(0);
            const bCreated = b.data().createdAt?.toDate() || new Date(0);
            return bCreated.getTime() - aCreated.getTime();
          });

          // Keep the first (newest) document, delete the rest
          for (let i = 1; i < sortedDocs.length; i++) {
            await sortedDocs[i].ref.delete();
          }
        }

        // If no document exists for this user, create one
        if (existingDocs.size === 0) {
          await db.collection('students').add({
            email: user.email,
            name: user.displayName || 'New Student',
            section: 'Unassigned',
            strand: 'Unassigned',
            grade: 'Unassigned',
            createdAt: admin.firestore.Timestamp.now()
          });
        }
      }
    }

    // Get final list of students after cleanup
    const finalSnapshot = await db.collection('students').get();
    const students = finalSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ students });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 