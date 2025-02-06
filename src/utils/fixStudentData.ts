import { db } from '@/lib/firebase/config';
import { collection, getDocs, updateDoc, doc, setDoc, deleteField } from 'firebase/firestore';

export async function fixStudentData() {
  const studentsRef = collection(db, 'students');
  const snapshot = await getDocs(studentsRef);

  const updates = snapshot.docs.map(async (document) => {
    const student = document.data();
    const updates: any = {};
    
    // Always ensure status is set
    if (!student.status || !['active', 'inactive'].includes(student.status)) {
      updates.status = 'active';
    }

    // Move balances to subcollection if they exist on the main document
    if (Array.isArray(student.balances)) {
      const balancesRef = collection(db, `students/${document.id}/balances`);
      
      // Add each balance to the subcollection
      const balancePromises = student.balances.map(async (balance) => {
        const balanceId = balance.id || Math.random().toString(36).substr(2, 9);
        await setDoc(doc(balancesRef, balanceId), {
          ...balance,
          id: balanceId,
          status: ['paid', 'pending'].includes(balance.status) ? balance.status : 'pending'
        });
      });

      await Promise.all(balancePromises);
      
      // Remove balances array from main document
      updates.balances = deleteField();
    }

    // Check if student has any balances in subcollection
    const balancesSnapshot = await getDocs(collection(db, `students/${document.id}/balances`));
    if (balancesSnapshot.empty) {
      // Add default balance if no balances exist
      const defaultBalance = {
        id: Math.random().toString(36).substr(2, 9),
        amount: 5000,
        dueDate: new Date(),
        status: 'pending',
        type: 'tuition'
      };
      
      await setDoc(
        doc(db, `students/${document.id}/balances`, defaultBalance.id),
        defaultBalance
      );
    }

    if (Object.keys(updates).length > 0) {
      console.log(`Fixing data for ${student.name}:`, updates);
      await updateDoc(doc(db, 'students', document.id), updates);
    }
  });

  await Promise.all(updates);
  console.log('Student data fixed successfully');
} 