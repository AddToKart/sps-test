import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/contexts/FirebaseContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/components/ui/use-toast';
import { ActivityService } from '@/services/ActivityService';
import { createReceipt } from '@/services/ReceiptService';
import { updateDoc, doc, collection, addDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';

const PaymentPage: React.FC = () => {
  const router = useRouter();
  const { db } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const processPayment = async (paymentData: any) => {
    try {
      setProcessing(true);
      
      // Generate a reference number if not provided
      const referenceNumber = paymentData.referenceNumber || 
        `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Update the balance status
      await updateDoc(doc(db, 'balances', balanceId), {
        status: 'completed',
        paymentDate: Timestamp.now(),
        paymentMethod: paymentData.paymentMethod,
        referenceNumber: referenceNumber,
        updatedAt: Timestamp.now()
      });
      
      // Create a payment record
      const paymentRef = await addDoc(collection(db, 'payments'), {
        balanceId: balanceId,
        studentId: student?.id,
        amount: balance?.amount || 0,
        paymentMethod: paymentData.paymentMethod,
        referenceNumber: referenceNumber,
        status: 'completed',
        type: balance?.type || 'Payment',
        description: balance?.description || '',
        createdAt: Timestamp.now(),
        metadata: {
          studentName: student?.fullName || '',
          studentEmail: student?.email || '',
          studentGrade: student?.grade || '',
          studentStrand: student?.strand || '',
          studentSection: student?.section || ''
        }
      });
      
      // Log the activity with all required fields
      await ActivityService.logActivity({
        type: 'payment',
        action: 'payment_completed',
        description: `Payment of ₱${balance?.amount.toLocaleString()} completed for ${balance?.type}`,
        userId: user?.uid || '',
        userType: 'student',
        metadata: {
          paymentId: paymentRef.id,
          balanceId: balanceId,
          studentId: student?.id || '',
          studentName: student?.fullName || '',
          amount: balance?.amount || 0,
          paymentMethod: paymentData.paymentMethod,
          referenceNumber: referenceNumber
        }
      });
      
      // Create a receipt
      await createReceipt(paymentRef.id, referenceNumber);
      
      toast.success('Payment processed successfully');
      router.push(`/student/payments/receipt/${paymentRef.id}`);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default PaymentPage; 