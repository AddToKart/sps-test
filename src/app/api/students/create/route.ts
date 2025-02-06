import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Validate email domain
    if (!email.endsWith('@student.com')) {
      return NextResponse.json(
        { error: 'Email must end with @student.com' },
        { status: 400 }
      );
    }

    const auth = getAuth();
    const db = getFirestore();

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Create student document in Firestore
    await db.collection('students').add({
      uid: userRecord.uid,
      email: email,
      name: name,
      section: 'Unassigned',
      strand: 'Unassigned',
      grade: 'Unassigned',
      createdAt: admin.firestore.Timestamp.now()
    });

    return NextResponse.json({
      success: true,
      message: 'Student created successfully',
      uid: userRecord.uid
    });
  } catch (error: any) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create student' },
      { status: 500 }
    );
  }
} 