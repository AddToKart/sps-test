import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST() {
  try {
    const db = getFirestore();
    
    // Get all students
    const studentsSnapshot = await db.collection('students').get();
    const emailMap = new Map();
    const duplicates = [];

    // Sort documents by createdAt to keep the newest ones
    const sortedDocs = studentsSnapshot.docs.sort((a, b) => {
      const aCreated = a.data().createdAt?.toDate() || new Date(0);
      const bCreated = b.data().createdAt?.toDate() || new Date(0);
      return bCreated.getTime() - aCreated.getTime();
    });

    // Find duplicates, keeping only the newest document for each email
    for (const doc of sortedDocs) {
      const data = doc.data();
      const email = data.email;
      
      if (!emailMap.has(email)) {
        emailMap.set(email, {
          id: doc.id,
          data: data
        });
      } else {
        duplicates.push(doc.id);
      }
    }

    console.log(`Found ${duplicates.length} duplicates to clean up`);

    // Delete all duplicates
    const deletePromises = duplicates.map(async (docId) => {
      try {
        // Delete the student document
        await db.collection('students').doc(docId).delete();
        console.log(`Deleted duplicate student document: ${docId}`);
      } catch (error) {
        console.error(`Error deleting document ${docId}:`, error);
      }
    });

    await Promise.all(deletePromises);

    return NextResponse.json({ 
      success: true,
      message: `Successfully cleaned up ${duplicates.length} duplicate documents`,
      deletedIds: duplicates
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Cleanup failed',
      details: error.message 
    }, { 
      status: 500 
    });
  }
} 