import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/utils/rateLimit';
import { handleError } from '@/utils/error';
import { FirebaseService } from '@/services/firebase';
import type { NextRequest } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

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

export async function GET(req: NextRequest) {
  try {
    if (!checkRateLimit(req)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    const auth = getAuth();
    const db = getFirestore();
    const { users } = await auth.listUsers();
    
    // Get all student users from Auth
    const studentUsers = users.filter(user => 
      user.email?.endsWith('@icons.com')
    );

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
  } catch (error) {
    const appError = handleError(error);
    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin not initialized properly');
    }

    console.log('Creating user with email:', data.email);

    // Create user with admin SDK
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.fullName,
    });

    console.log('User created:', userRecord.uid);

    // Prepare the student document data
    const studentData = {
      fullName: data.fullName,
      email: data.email,
      studentId: data.studentId,
      grade: data.grade,
      strand: data.strand,
      section: data.section,
      balance: 0,
      createdAt: new Date().toISOString(),
      uid: userRecord.uid
    };

    // Only add guardianInfo if it exists in the request
    if (data.guardianInfo) {
      studentData.guardianInfo = {
        name: data.guardianInfo.name || '',
        phone: data.guardianInfo.phone || '',
        email: data.guardianInfo.email || ''
      };
    }

    // Create student document
    await adminDb.collection('students').doc(data.studentId).set(studentData);

    console.log('Student document created');

    return NextResponse.json({ 
      success: true, 
      studentId: data.studentId,
      uid: userRecord.uid 
    });
  } catch (error: any) {
    console.error('Error in POST /api/students:', error);
    return NextResponse.json(
      { 
        error: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
} 