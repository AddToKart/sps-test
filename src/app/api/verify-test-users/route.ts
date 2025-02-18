import { NextResponse } from 'next/server';
import { admin, adminAuth, adminDb } from '@/lib/firebase/admin';

const testUsers = [
  { email: 'kurt@admin.com', password: 'password123' },
  { email: 'test@student.com', password: 'password123' }
];

export async function GET() {
  try {
    const results = [];

    // Delete existing test users first
    for (const user of testUsers) {
      try {
        const userRecord = await adminAuth.getUserByEmail(user.email);
        await adminAuth.deleteUser(userRecord.uid);
        console.log(`Deleted existing user: ${user.email}`);
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          console.error(`Error deleting user ${user.email}:`, error);
        }
      }
    }

    // Create fresh test users
    for (const user of testUsers) {
      try {
        const userRecord = await adminAuth.createUser({
          email: user.email,
          password: user.password,
          emailVerified: true,
        });

        // Add custom claims based on email domain
        const claims = user.email.includes('@admin.com') 
          ? { role: 'admin' } 
          : { role: 'student' };
        
        await adminAuth.setCustomUserClaims(userRecord.uid, claims);

        // Create user document in Firestore
        if (user.email.includes('@student.com')) {
          await adminDb.collection('students').doc(userRecord.uid).set({
            email: user.email,
            name: 'Test Student',
            section: 'A',
            strand: 'STEM',
            grade: '12',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        results.push({ 
          email: user.email, 
          created: true, 
          uid: userRecord.uid,
          claims 
        });

        console.log(`Created user successfully: ${user.email}`);
      } catch (error: any) {
        console.error(`Error creating user ${user.email}:`, error);
        results.push({ 
          email: user.email, 
          error: error.message 
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error in verify-test-users:', error);
    return NextResponse.json(
      { error: 'Failed to verify test users' }, 
      { status: 500 }
    );
  }
} 