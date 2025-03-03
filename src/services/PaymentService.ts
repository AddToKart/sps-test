import { db } from '@/lib/firebase/config';
import { collection, doc, updateDoc, addDoc, getDoc, Timestamp, setDoc, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { Balance } from '@/types/student';
import { ActivityService } from './ActivityService';
import { ErrorHandlingService } from './ErrorHandlingService';

export class PaymentService {
  static async processPayment(paymentData: {
    balanceId: string;
    studentId: string;
    amount: number;
    paymentMethod: string;
    studentEmail: string;
    studentName: string;
  }) {
    const batch = writeBatch(db);
    
    try {
      console.log('Processing payment for balance:', paymentData.balanceId);

      // 1. Get the balance document
      const balanceRef = doc(db, 'balances', paymentData.balanceId);
      const balanceDoc = await getDoc(balanceRef);
      
      if (!balanceDoc.exists()) {
        throw new Error('Balance not found');
      }

      const balance = balanceDoc.data() as Balance;
      const now = Timestamp.now();
      const referenceNumber = this.generateReferenceNumber(paymentData.studentId);

      // 2. Update balance status
      batch.update(balanceRef, {
        status: 'paid',
        paidAt: now,
        paymentMethod: paymentData.paymentMethod,
        referenceNumber: referenceNumber
      });

      // 3. Create payment record
      const paymentRef = doc(collection(db, 'payments'));
      batch.set(paymentRef, {
        balanceId: paymentData.balanceId,
        studentId: paymentData.studentId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        status: 'completed',
        referenceNumber,
        paidAt: now,
        createdAt: now,
        studentEmail: paymentData.studentEmail,
        type: balance.type
      });

      // 4. Commit the batch
      await batch.commit();
      
      // Log the activity
      await ActivityService.logActivity({
        type: 'payment',
        action: 'payment_received',
        description: `Payment received from ${paymentData.studentName}`,
        userId: paymentData.studentId,
        userType: 'student',
        metadata: {
          amount: paymentData.amount,
          studentName: paymentData.studentName,
          paymentMethod: paymentData.paymentMethod,
          balanceType: balance.type
        }
      });

      // Return a properly structured payment result that matches what the UI expects
      return {
        id: paymentRef.id,
        balanceId: paymentData.balanceId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        status: 'completed',
        referenceNumber,
        paidAt: now,
        createdAt: now,
        type: balance.type,
        balanceType: balance.type // Adding this to match what the UI expects
      };
    } catch (error) {
      ErrorHandlingService.handleError(error, 'Failed to process payment');
      return { success: false, error };
    }
  }

  static async processMultiplePayments(paymentsData: {
    balances: Balance[];
    studentId: string;
    paymentMethod: string;
    studentEmail: string;
  }) {
    try {
      console.log('Processing multiple payments for student:', paymentsData.studentId);
      
      const now = Timestamp.now();
      const referenceNumber = this.generateReferenceNumber(paymentsData.studentId);
      const batch = writeBatch(db);
      const results = [];
      
      // Calculate total amount
      const totalAmount = paymentsData.balances.reduce((sum, balance) => sum + balance.amount, 0);
      
      // Create a master payment record for the group of payments
      const masterPaymentRef = doc(collection(db, 'payments'));
      batch.set(masterPaymentRef, {
        studentId: paymentsData.studentId,
        amount: totalAmount,
        paymentMethod: paymentsData.paymentMethod,
        status: 'completed',
        referenceNumber,
        paidAt: now,
        createdAt: now,
        studentEmail: paymentsData.studentEmail,
        type: 'Multiple Payments',
        isMultiplePayment: true,
        balanceCount: paymentsData.balances.length
      });
      
      // Process each balance
      for (const balance of paymentsData.balances) {
        // Create individual payment record linked to the master payment
        const paymentRef = doc(collection(db, 'payments'));
        batch.set(paymentRef, {
          balanceId: balance.id,
          studentId: paymentsData.studentId,
          amount: balance.amount,
          paymentMethod: paymentsData.paymentMethod,
          status: 'completed',
          referenceNumber: `${referenceNumber}-${results.length + 1}`,
          paidAt: now,
          createdAt: now,
          studentEmail: paymentsData.studentEmail,
          type: balance.type,
          masterPaymentId: masterPaymentRef.id
        });
        
        // Update balance status
        const balanceRef = doc(db, 'balances', balance.id);
        batch.update(balanceRef, {
          status: 'paid',
          paymentMethod: paymentsData.paymentMethod,
          paidAt: now,
          paymentId: paymentRef.id,
          masterPaymentId: masterPaymentRef.id,
          updatedAt: now
        });
        
        // Add to results
        results.push({
          id: paymentRef.id,
          balanceId: balance.id,
          amount: balance.amount,
          paymentMethod: paymentsData.paymentMethod,
          status: 'completed',
          referenceNumber: `${referenceNumber}-${results.length + 1}`,
          paidAt: now,
          createdAt: now,
          type: balance.type,
          balanceType: balance.type
        });
      }
      
      // Commit all the changes as a batch
      await batch.commit();
      console.log(`Successfully processed ${results.length} payments`);
      
      // Return the master payment with all individual payments
      return {
        id: masterPaymentRef.id,
        amount: totalAmount,
        paymentMethod: paymentsData.paymentMethod,
        status: 'completed',
        referenceNumber,
        paidAt: now,
        createdAt: now,
        type: 'Multiple Payments',
        isMultiplePayment: true,
        payments: results,
        balanceCount: paymentsData.balances.length
      };
    } catch (error) {
      console.error('Multiple payments processing error:', error);
      throw error;
    }
  }

  private static generateReferenceNumber(studentId: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PAY-${timestamp}${random}`;
  }

  static async addBulkFees(feeData: {
    feeType: string;
    amount: number;
    dueDate: Date;
    description: string;
    addedBy: string;
  }) {
    try {
      // Your existing bulk fee addition logic...

      // Log the activity
      await ActivityService.logActivity({
        type: 'balance',
        action: 'bulk_fees_added',
        description: `Added ${feeData.feeType} fees to ${studentsAffected} students`,
        userId: feeData.addedBy,
        userType: 'admin',
        metadata: {
          feeType: feeData.feeType,
          amount: feeData.amount,
          studentsAffected,
          dueDate: feeData.dueDate
        }
      });

    } catch (error) {
      console.error('Error adding bulk fees:', error);
      throw error;
    }
  }

  static async getBulkPaymentStats(startDate: Date, endDate: Date) {
    try {
      const q = query(
        collection(db, 'payments'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );

      const snapshot = await getDocs(q);
      const payments = snapshot.docs.map(doc => doc.data());

      return {
        totalAmount: payments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
        totalCount: payments.length,
        averageAmount: payments.length ? payments.reduce((sum, payment) => sum + (payment.amount || 0), 0) / payments.length : 0
      };
    } catch (error) {
      ErrorHandlingService.handleError(error, 'Failed to get payment statistics');
      return null;
    }
  }
} 