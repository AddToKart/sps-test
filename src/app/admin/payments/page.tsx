'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, where, Timestamp, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import BulkFeesModal from '@/components/admin/payments/BulkFeesModal';
import OverdueSettingsModal from '@/components/admin/payments/OverdueSettingsModal';
import PaymentReminderSettings from '@/components/admin/payments/PaymentReminderSettings';
import toast from 'react-hot-toast';
import { ActivityService } from '@/services/ActivityService';

// Use the correct strand and section structure from your codebase
const STRANDS = ['STEM', 'ABM', 'HUMSS', 'ICT', 'GAS', 'HRTCO'];
const GRADES = ['11', '12'];

const STRAND_SECTIONS = {
  '11': {
    'STEM': ['St. Albert', 'St. Augustine', 'St. Thomas Aquinas'],
    'ABM': ['St. Matthew', 'St. Mark', 'St. Luke'],
    'HUMSS': ['St. Peter', 'St. Paul', 'St. John'],
    'ICT': ['St. Isidore', 'St. Benedict', 'St. Francis'],
    'GAS': ['St. Joseph', 'St. Michael', 'St. Gabriel'],
    'HRTCO': ['St. Martha', 'St. Catherine', 'St. Teresa']
  },
  '12': {
    'STEM': ['St. Dominic', 'St. Francis', 'St. Thomas More'],
    'ABM': ['St. Vincent', 'St. Anthony', 'St. Nicholas'],
    'HUMSS': ['St. Jerome', 'St. Augustine', 'St. Ambrose'],
    'ICT': ['St. Clare', 'St. Cecilia', 'St. Agnes'],
    'GAS': ['St. Christopher', 'St. Sebastian', 'St. George'],
    'HRTCO': ['St. Elizabeth', 'St. Rose', 'St. Anne']
  }
};

export default function PaymentManagement() {
  const { user } = useAuth();
  const [showBulkFeesModal, setShowBulkFeesModal] = useState(false);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderSent, setReminderSent] = useState(false);
  const [studentsNotified, setStudentsNotified] = useState(0);
  
  // Payment statistics
  const [stats, setStats] = useState({
    totalCollected: 0,
    pendingAmount: 0,
    todayCollections: 0,
    successRate: 0
  });

  useEffect(() => {
    const fetchPaymentStats = async () => {
      try {
        setLoading(true);
        
        // Get all payments
        const paymentsQuery = query(collection(db, 'payments'));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const payments = paymentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Get all balances
        const balancesQuery = query(collection(db, 'balances'));
        const balancesSnapshot = await getDocs(balancesQuery);
        const balances = balancesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Calculate total collections
        const totalCollected = payments
          .filter(payment => payment.status === 'completed')
          .reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
        // Calculate pending amount
        const pendingAmount = balances
          .filter(balance => balance.status === 'pending')
          .reduce((sum, balance) => sum + (balance.amount || 0), 0);
        
        // Calculate today's collections
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayCollections = payments
          .filter(payment => {
            if (!payment.createdAt || payment.status !== 'completed') return false;
            const paymentDate = payment.createdAt.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt);
            paymentDate.setHours(0, 0, 0, 0);
            return paymentDate.getTime() === today.getTime();
          })
          .reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
        // Calculate success rate
        const totalPayments = payments.length;
        const successfulPayments = payments.filter(payment => payment.status === 'completed').length;
        const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 100;
        
        setStats({
          totalCollected,
          pendingAmount,
          todayCollections,
          successRate
        });
      } catch (error) {
        console.error('Error fetching payment stats:', error);
        toast.error('Failed to load payment statistics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentStats();
  }, []);

  const handleSendReminders = async () => {
    try {
      setSendingReminders(true);
      
      // Get reminder settings
      const reminderSettingsDoc = await getDoc(doc(db, 'settings', 'reminders'));
      const reminderSettings = reminderSettingsDoc.exists() 
        ? reminderSettingsDoc.data() 
        : {
            sendAllReminders: false,
            daysThreshold: 7,
            reminderFrequency: 'weekly',
            customDays: [7, 3, 1],
            includeOverdue: true,
            messageTemplate: {
              upcoming: 'Your payment of ₱{amount} for {type} is due in {days} days.',
              overdue: 'Your payment of ₱{amount} for {type} is overdue by {days} days.'
            }
          };
      
      // Get students with pending balances
      const balancesRef = collection(db, 'balances');
      const pendingBalancesQuery = query(balancesRef, where('status', '==', 'pending'));
      const pendingBalancesSnapshot = await getDocs(pendingBalancesQuery);
      
      if (pendingBalancesSnapshot.empty) {
        toast.info('No pending balances to send reminders for');
        setSendingReminders(false);
        return;
      }
      
      // Get all students to have their email and other details
      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      const studentsMap = new Map();
      
      studentsSnapshot.docs.forEach(doc => {
        const student = { ...doc.data(), id: doc.id };
        studentsMap.set(doc.id, student);
      });
      
      // Group by student
      const studentBalances = new Map();
      pendingBalancesSnapshot.docs.forEach(doc => {
        const balance = { ...doc.data(), id: doc.id };
        if (!studentBalances.has(balance.studentId)) {
          studentBalances.set(balance.studentId, []);
        }
        studentBalances.get(balance.studentId).push(balance);
      });
      
      // Send reminders
      let notifiedCount = 0;
      const notificationsToCreate = [];
      
      for (const [studentId, balances] of studentBalances.entries()) {
        const student = studentsMap.get(studentId);
        if (!student) continue;
        
        let studentNotified = false;
        
        for (const balance of balances) {
          // Handle balances without due dates when sendAllReminders is true
          if (reminderSettings.sendAllReminders) {
            // For balances without due date, create a notification
            if (!balance.dueDate) {
              const notification = {
                studentId: studentId,
                studentEmail: student.email,
                title: 'Payment Reminder',
                message: `Your payment of ₱${balance.amount.toLocaleString()} for ${balance.type} is pending.`,
                type: 'payment_reminder',
                status: 'unread',
                createdAt: Timestamp.now(),
                relatedBalanceId: balance.id,
                amount: balance.amount
              };
              
              notificationsToCreate.push(notification);
              studentNotified = true;
              continue;
            }
          } else if (!balance.dueDate) {
            // Skip balances without due dates when sendAllReminders is false
            continue;
          }
          
          // Process balances with due dates
          if (balance.dueDate) {
            const dueDate = balance.dueDate.toDate();
            const today = new Date();
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            // Determine if we should send a reminder based on settings
            const shouldSendUpcoming = reminderSettings.sendAllReminders || 
              (daysUntilDue >= 0 && daysUntilDue <= reminderSettings.daysThreshold);
            
            const shouldSendOverdue = daysUntilDue < 0 && reminderSettings.includeOverdue;
            
            if (shouldSendUpcoming || shouldSendOverdue) {
              // Format message using template
              let message = '';
              if (daysUntilDue < 0) {
                message = reminderSettings.messageTemplate.overdue
                  .replace('{amount}', balance.amount.toLocaleString())
                  .replace('{type}', balance.type)
                  .replace('{days}', Math.abs(daysUntilDue));
              } else {
                message = reminderSettings.messageTemplate.upcoming
                  .replace('{amount}', balance.amount.toLocaleString())
                  .replace('{type}', balance.type)
                  .replace('{days}', daysUntilDue);
              }
              
              // Create notification object
              const notification = {
                studentId: studentId,
                studentEmail: student.email,
                title: daysUntilDue < 0 ? 'Payment Overdue' : 'Payment Reminder',
                message: message,
                type: daysUntilDue < 0 ? 'overdue_reminder' : 'payment_reminder',
                status: 'unread',
                createdAt: Timestamp.now(),
                relatedBalanceId: balance.id,
                dueDate: balance.dueDate,
                amount: balance.amount
              };
              
              notificationsToCreate.push(notification);
              studentNotified = true;
            }
          }
        }
        
        if (studentNotified) {
          notifiedCount++;
        }
      }
      
      // Batch create all notifications
      const notificationsRef = collection(db, 'notifications');
      for (const notification of notificationsToCreate) {
        await addDoc(notificationsRef, notification);
      }
      
      // Log activity
      if (notifiedCount > 0) {
        await ActivityService.logActivity({
          type: 'notification',
          action: 'payment_reminder',
          description: `Payment reminders sent to ${notifiedCount} students`,
          userId: user?.uid || 'unknown',
          userType: 'admin',
          metadata: {
            studentsCount: notifiedCount,
            totalBalances: pendingBalancesSnapshot.size,
            timestamp: new Date().toISOString(),
            totalAmount: Array.from(studentBalances.values())
              .flat()
              .reduce((sum, balance) => sum + (balance.amount || 0), 0)
          }
        });
        
        setReminderSent(true);
        setStudentsNotified(notifiedCount);
        toast.success(`Reminders sent to ${notifiedCount} students`);
      } else {
        toast.info('No students met the criteria for reminders based on your settings');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
          <p className="text-gray-600">Monitor and manage all payment transactions</p>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setShowBulkFeesModal(true)}
          className="flex items-center justify-center gap-2 bg-[#002147] text-white py-3 px-4 rounded-lg hover:bg-[#002147]/90 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Bulk Add Fees
        </button>
        
        <button
          onClick={handleSendReminders}
          disabled={sendingReminders}
          className="flex items-center justify-center gap-2 bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition-colors"
        >
          {sendingReminders ? (
            <>
              <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Send Reminders
            </>
          )}
        </button>
        
        <button
          onClick={() => setIsReminderSettingsOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Reminder Settings
        </button>
        
        <button
          onClick={() => setIsOverdueModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Overdue Settings
        </button>
      </div>
      
      {/* Notification Banner */}
      {reminderSent && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Reminders sent to {studentsNotified} students</span>
          </div>
          <button 
            onClick={() => setReminderSent(false)}
            className="text-green-600 hover:text-green-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Collections */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-50">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm text-green-500 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              12.5%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">₱{stats.totalCollected.toLocaleString()}</h3>
          <p className="text-sm text-gray-600 mt-1">Total Collections</p>
          <p className="text-xs text-gray-500 mt-2">Total amount collected to date</p>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-yellow-50">
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm text-red-500 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              2.3%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">₱{stats.pendingAmount.toLocaleString()}</h3>
          <p className="text-sm text-gray-600 mt-1">Pending Payments</p>
          <p className="text-xs text-gray-500 mt-2">Total amount pending clearance</p>
        </div>

        {/* Today's Collections */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-50">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">₱{stats.todayCollections.toLocaleString()}</h3>
          <p className="text-sm text-gray-600 mt-1">Today's Collections</p>
          <p className="text-xs text-gray-500 mt-2">Amount collected today</p>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-purple-50">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm text-green-500 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              5.2%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</h3>
          <p className="text-sm text-gray-600 mt-1">Success Rate</p>
          <p className="text-xs text-gray-500 mt-2">Payment success rate</p>
        </div>
      </div>

      {/* Modals */}
      <BulkFeesModal
        isOpen={showBulkFeesModal}
        onClose={() => setShowBulkFeesModal(false)}
        onSuccess={() => {
          setShowBulkFeesModal(false);
        }}
        strands={STRANDS}
        grades={GRADES}
        strandSections={STRAND_SECTIONS}
      />
      
      <OverdueSettingsModal
        isOpen={isOverdueModalOpen}
        onClose={() => setIsOverdueModalOpen(false)}
      />
      
      <PaymentReminderSettings
        isOpen={isReminderSettingsOpen}
        onClose={() => setIsReminderSettingsOpen(false)}
      />
    </div>
  );
} 