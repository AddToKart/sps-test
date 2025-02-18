'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, query, where, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function PaymentSettings() {
  const [settings, setSettings] = useState({
    enableEmailReminders: true,
    reminderFrequency: 'weekly',
    daysBeforeDue: 7,
    enableAutoReceipts: true,
    enableLateFees: false,
    enableScheduling: false
  });

  const [paymentMethods, setPaymentMethods] = useState([
    // Existing payment methods
  ]);

  const [feeTypes, setFeeTypes] = useState([
    // Standard fee types
  ]);

  const sendPaymentReminders = async () => {
    try {
      // Get all pending balances
      const balancesQuery = query(
        collection(db, 'balances'),
        where('status', '==', 'pending')
      );
      const balancesSnapshot = await getDocs(balancesQuery);
      
      for (const balanceDoc of balancesSnapshot.docs) {
        const balance = balanceDoc.data();
        const dueDate = balance.dueDate.toDate();
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        // Check if payment is due soon or overdue
        if (daysUntilDue <= settings.daysBeforeDue || daysUntilDue < 0) {
          // Create notification
          await addDoc(collection(db, 'notifications'), {
            studentId: balance.studentId,
            title: daysUntilDue < 0 ? 'Payment Overdue' : 'Payment Reminder',
            message: daysUntilDue < 0 
              ? `Your payment of ₱${balance.amount} for ${balance.type} is overdue.`
              : `Your payment of ₱${balance.amount} for ${balance.type} is due in ${daysUntilDue} days.`,
            type: daysUntilDue < 0 ? 'overdue_reminder' : 'payment_reminder',
            status: 'unread',
            createdAt: Timestamp.now(),
            relatedBalanceId: balanceDoc.id,
            dueDate: balance.dueDate,
            amount: balance.amount
          });
        }
      }

      toast.success('Payment reminders sent successfully');
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Payment Settings</h2>
      {/* Add UI for managing payment methods and fee types */}
    </div>
  );
} 