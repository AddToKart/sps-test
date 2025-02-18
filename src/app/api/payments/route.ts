import { NextResponse } from 'next/server';
import { admin, adminDb } from '@/lib/firebase/admin';
import { updateStudentPaymentStatus } from '@/utils/updateStudentPaymentStatus';

export async function POST(request: Request) {
  try {
    const { balanceId, studentId, amount } = await request.json();

    // Create payment record
    const paymentRef = await adminDb.collection('payments').add({
      balanceId,
      studentId,
      amount,
      status: 'paid',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update balance status
    await adminDb.collection('balances').doc(balanceId).update({
      status: 'paid',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update student's payment status
    await updateStudentPaymentStatus(studentId);

    return NextResponse.json({ success: true, paymentId: paymentRef.id });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
} 