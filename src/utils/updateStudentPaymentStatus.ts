import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export async function updateStudentPaymentStatus(studentId: string) {
  try {
    // Get all balances for the student
    const balancesQuery = query(
      collection(db, 'balances'),
      where('studentId', '==', studentId)
    );
    const balancesSnapshot = await getDocs(balancesQuery);
    const balances = balancesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get all payments for the student
    const paymentsQuery = query(
      collection(db, 'payments'),
      where('studentId', '==', studentId)
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);
    const payments = paymentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Check if all balances are paid
    const hasUnpaidBalance = balances.some(balance => {
      const payment = payments.find(p => p.balanceId === balance.id);
      return !payment || payment.status !== 'paid';
    });

    // Update student's payment status
    const studentRef = doc(db, 'students', studentId);
    await updateDoc(studentRef, {
      paymentStatus: hasUnpaidBalance ? 'pending' : 'paid',
      updatedAt: new Date()
    });

    return !hasUnpaidBalance;
  } catch (error) {
    console.error('Error updating student payment status:', error);
    return false;
  }
} 