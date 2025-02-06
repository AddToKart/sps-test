import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { z } from 'zod'; // Add zod for validation

// Define validation schema
const FeeSchema = z.object({
  type: z.string().min(1, 'Fee type is required'),
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
  dueDate: z.string().refine(
    (date) => new Date(date) > new Date(),
    'Due date must be in the future'
  ),
});

const RequestSchema = z.object({
  students: z.array(z.string()).min(1, 'At least one student must be selected'),
  fee: FeeSchema,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationResult.error.errors 
      }, { 
        status: 400 
      });
    }

    const { students, fee } = validationResult.data;
    const db = getFirestore();

    // Verify all students exist
    const studentRefs = students.map(id => db.collection('students').doc(id));
    const studentDocs = await db.getAll(...studentRefs);
    
    const invalidStudents = studentDocs
      .map((doc, i) => (!doc.exists ? students[i] : null))
      .filter(Boolean);

    if (invalidStudents.length > 0) {
      return NextResponse.json({
        error: 'Invalid student IDs',
        details: invalidStudents
      }, {
        status: 400
      });
    }

    // Add fees to each student using batch
    const batch = db.batch();
    let count = 0;

    for (const studentId of students) {
      const balanceRef = db.collection('students')
        .doc(studentId)
        .collection('balances')
        .doc();

      batch.set(balanceRef, {
        ...fee,
        status: 'pending',
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      });
      count++;
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'Fees added successfully',
      count,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error adding bulk fees:', error);
    
    // Handle different types of errors
    if (error.code === 'permission-denied') {
      return NextResponse.json({
        error: 'Permission denied',
        details: 'You do not have permission to perform this action'
      }, { 
        status: 403 
      });
    }

    if (error.code === 'not-found') {
      return NextResponse.json({
        error: 'Resource not found',
        details: 'One or more required resources were not found'
      }, { 
        status: 404 
      });
    }

    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { 
      status: 500 
    });
  }
} 