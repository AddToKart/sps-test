import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const { feeType, amount, dueDate, description } = await request.json();

    // Get all students
    const studentsSnapshot = await adminDb.collection('students').get();
    const batch = adminDb.batch();

    // Add the fee to each student
    studentsSnapshot.docs.forEach((studentDoc) => {
      const balanceRef = adminDb.collection('balances').doc();
      batch.set(balanceRef, {
        studentId: studentDoc.id,
        type: feeType,
        amount: Number(amount),
        dueDate: new Date(dueDate),
        description,
        status: 'pending',
        createdAt: adminDb.Timestamp.now()
      });
    });

    await batch.commit();

    return NextResponse.json({ 
      success: true, 
      message: `Added ${feeType} fee to ${studentsSnapshot.size} students` 
    });
  } catch (error) {
    console.error('Error creating bulk fees:', error);
    return NextResponse.json(
      { error: 'Failed to create bulk fees' }, 
      { status: 500 }
    );
  }
} 