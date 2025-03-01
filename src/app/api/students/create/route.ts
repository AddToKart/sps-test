import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Create user with admin SDK
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.fullName,
    });

    // Prepare the student document data
    const { password, ...studentData } = data;
    
    // Create student document
    await adminDb.collection('students').doc(data.studentId).set({
      ...studentData,
      uid: userRecord.uid,
      status: 'active',
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      studentId: data.studentId,
      uid: userRecord.uid 
    });
  } catch (error: any) {
    console.error('Error in POST /api/students/create:', error);
    return NextResponse.json(
      { error: error.message }, 
      { status: 500 }
    );
  }
} 