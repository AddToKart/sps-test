import { db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, query, where, deleteDoc } from 'firebase/firestore';

export const migrateBalances = async () => {
  // Get all students
  const studentsRef = collection(db, 'students');
  const studentsSnapshot = await getDocs(studentsRef);

  // Keep track of migrated balances
  const migratedBalances = new Set();

  for (const studentDoc of studentsSnapshot.docs) {
    // Get old balances from subcollection
    const oldBalancesRef = collection(db, `students/${studentDoc.id}/balances`);
    const oldBalancesSnapshot = await getDocs(oldBalancesRef);

    // Migrate each balance to new collection
    for (const balanceDoc of oldBalancesSnapshot.docs) {
      const balanceData = balanceDoc.data();
      
      // Skip if already migrated
      if (migratedBalances.has(balanceDoc.id)) continue;

      // Add to new collection with studentId
      await addDoc(collection(db, 'balances'), {
        ...balanceData,
        studentId: studentDoc.id,
        type: balanceData.type || 'Unknown',
        amount: balanceData.amount || 0,
        status: balanceData.status || 'pending',
        createdAt: balanceData.createdAt || new Date(),
        paidAt: balanceData.paidAt || null,
        paymentMethod: balanceData.paymentMethod || null,
        referenceNumber: balanceData.referenceNumber || null
      });

      migratedBalances.add(balanceDoc.id);
    }
  }

  console.log(`Migration completed. ${migratedBalances.size} balances migrated.`);
}; 