import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

const testUsers = [
  { email: 'kurt@admin.com', password: 'password123' },
  { email: 'test@student.com', password: 'password123' }
];

export async function POST() {
  try {
    const auth = getAuth();
    
    for (const user of testUsers) {
      try {
        await auth.createUser({
          email: user.email,
          password: user.password,
          emailVerified: true
        });
        console.log(`Created user: ${user.email}`);
      } catch (error: any) {
        // Ignore if user already exists
        if (error.code !== 'auth/email-already-exists') {
          throw error;
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting up test users:', error);
    return NextResponse.json({ error: 'Failed to setup test users' }, { status: 500 });
  }
} 