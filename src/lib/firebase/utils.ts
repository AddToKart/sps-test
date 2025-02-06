import { db } from './config';
import { collection, addDoc } from 'firebase/firestore';

export const addTestStudent = async () => {
  try {
    const docRef = await addDoc(collection(db, 'students'), {
      email: 'test@student.com',
      name: 'Test Student',
      section: 'A',
      strand: 'STEM',
      grade: '12',
      balances: []
    });
    console.log('Test student added with ID:', docRef.id);
  } catch (error) {
    console.error('Error adding test student:', error);
  }
}; 