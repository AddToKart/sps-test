'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, Timestamp, orderBy, getDocs, where, getDoc, writeBatch } from 'firebase/firestore';
import { Dialog } from '@headlessui/react';
import PaymentFilters from '@/components/admin/payments/PaymentFilters';
import PaymentTable from '@/components/admin/payments/PaymentTable';
import PaymentExport from '@/components/admin/payments/PaymentExport';
import AddFeeModal from '@/components/admin/payments/AddFeeModal';
import BulkFeesModal from '@/components/admin/payments/BulkFeesModal';
import OverdueSettingsModal from '@/components/admin/payments/OverdueSettingsModal';
import AutomationSettingsModal from '@/components/admin/payments/AutomationSettingsModal';
import MigrateDataButton from '@/components/admin/MigrateDataButton';
import Toast from '@/components/ui/Toast';
import toast from 'react-hot-toast';
import PaymentReminderSettings from '@/components/admin/payments/PaymentReminderSettings';
import { Line } from 'react-chartjs-2';
import { useRouter } from 'next/navigation';

interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: string;
  referenceNumber: string;
  createdAt: any;
  balanceId: string;
  paymentType: string;
}

const PaymentCard = ({ icon, title, value, description, trend = null }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 rounded-lg bg-blue-50">{icon}</div>
      {trend && (
        <span className={`text-sm ${trend > 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d={trend > 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
          </svg>
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <h3 className="text-2xl font-bold text-gray-900">₱{value.toLocaleString()}</h3>
    <p className="text-sm text-gray-600 mt-1">{title}</p>
    <p className="text-xs text-gray-500 mt-2">{description}</p>
  </div>
);

// Add this component for the action buttons
const ActionButton = ({ icon, label, onClick, variant = 'default', disabled = false }) => {
  const variants = {
    default: 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50',
    primary: 'bg-[#002147] text-white hover:bg-[#002147]/90',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
    success: 'bg-green-500 text-white hover:bg-green-600',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${variants[variant]} border ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
};

const defaultSettings = {
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

export default function PaymentManagement() {
  const { user } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [isAddFeeModalOpen, setIsAddFeeModalOpen] = useState(false);
  const [showBulkFeesModal, setShowBulkFeesModal] = useState(false);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [isAutomationModalOpen, setIsAutomationModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    startDate: null,
    endDate: null,
    status: 'all',
    paymentMethod: 'all',
    search: ''
  });
  const [isReminderSettingsOpen, setIsReminderSettingsOpen] = useState(false);
  const [stats, setStats] = useState({
    totalCollected: 0,
    pendingAmount: 0,
    todayCollections: 0,
    monthlyCollections: 0,
    successRate: 0,
    averagePayment: 0
  });
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    allowPartialPayments: true,
    minimumPartialAmount: 500,
    gracePeriod: 3, // days
    latePaymentPenalty: 5, // percentage
    acceptedPaymentMethods: ['GCash', 'Maya', 'Bank Transfer'],
    autoReceiptGeneration: true,
    notificationPreferences: {
      email: true,
      sms: false,
      push: true
    }
  });

  useEffect(() => {
    const studentsQuery = query(collection(db, 'students'));
    
    const unsubscribe = onSnapshot(studentsQuery, async (studentsSnapshot) => {
      const allPayments: Payment[] = [];
      
      // Get payments from each student's balances
      await Promise.all(studentsSnapshot.docs.map(async (studentDoc) => {
        const studentData = studentDoc.data();
        const balancesRef = collection(db, `students/${studentDoc.id}/balances`);
        const balancesSnapshot = await getDocs(balancesRef);
        
        balancesSnapshot.docs.forEach(balanceDoc => {
          const balanceData = balanceDoc.data();
          if (balanceData.status === 'paid') {
            allPayments.push({
              id: balanceDoc.id,
              studentId: studentDoc.id,
              studentName: studentData.name || 'Unknown',
              amount: balanceData.amount || 0,
              status: balanceData.status,
              paymentMethod: balanceData.paymentMethod || 'Unknown',
              referenceNumber: balanceData.referenceNumber || '',
              createdAt: balanceData.paidAt || balanceData.createdAt,
              balanceId: balanceDoc.id,
              paymentType: balanceData.type || 'Unknown'
            } as Payment);
          }
        });
      }));
      
      // Sort by date
      allPayments.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
      
      setPayments(allPayments);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (paymentId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: newStatus,
        updatedAt: new Date()
      });
      setIsUpdateModalOpen(false);
      setSelectedPayment(null);
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Error updating payment status');
    }
  };

  const handleVerifyPayment = async (payment: Payment) => {
    try {
      await updateDoc(doc(db, `students/${payment.studentId}/balances/${payment.id}`), {
        status: 'paid',
        paidAt: new Date()
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Error verifying payment');
    }
  };

  const handleVoidPayment = async (payment: Payment) => {
    if (!confirm('Are you sure you want to void this payment?')) return;

    try {
      await updateDoc(doc(db, `students/${payment.studentId}/balances/${payment.id}`), {
        status: 'pending',
        voidedAt: new Date(),
        voidReason: 'Manually voided by admin'
      });
    } catch (error) {
      console.error('Error voiding payment:', error);
      alert('Error voiding payment');
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.studentName?.toLowerCase().includes(searchLower) ||
      payment.referenceNumber?.toLowerCase().includes(searchLower) ||
      payment.studentId?.toLowerCase().includes(searchLower)
    );
  });

  const getTodayCollections = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return payments.reduce((total, payment) => {
      const paymentDate = payment.createdAt.toDate();
      if (paymentDate >= today) {
        return total + (payment.amount || 0);
      }
      return total;
    }, 0);
  };

  const getMonthCollections = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return payments.reduce((total, payment) => {
      const paymentDate = payment.createdAt.toDate();
      if (paymentDate >= startOfMonth) {
        return total + (payment.amount || 0);
      }
      return total;
    }, 0);
  };

  const getAveragePayment = () => {
    if (payments.length === 0) return 0;
    const total = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    return Math.round(total / payments.length);
  };

  const sendPaymentReminders = async () => {
    try {
      setIsSendingReminders(true);
      
      // Get settings first and ensure defaults are properly merged
      const settingsDoc = await getDoc(doc(db, 'settings', 'paymentReminders'));
      const settings = {
        ...defaultSettings,
        ...(settingsDoc.exists() ? settingsDoc.data() : {})
      };

      console.log('Using reminder settings:', settings);

      // Query pending balances from root collection
      const balancesQuery = query(
        collection(db, 'balances'),
        where('status', '==', 'pending')
      );
      
      const balancesSnapshot = await getDocs(balancesQuery);
      console.log('Found pending balances:', balancesSnapshot.size);

      if (balancesSnapshot.empty) {
        toast.success('No pending balances found');
        setIsSendingReminders(false);
        return;
      }

      const batch = writeBatch(db);
      let reminderCount = 0;

      // Process each balance
      for (const balanceDoc of balancesSnapshot.docs) {
        const balance = balanceDoc.data();
        console.log('Processing balance:', balance);

        // Only require studentId for notification
        if (!balance.studentId) {
          console.log('Balance missing studentId:', balanceDoc.id);
          continue;
        }

        // Get student data
        const studentDoc = await getDoc(doc(db, 'students', balance.studentId));
        if (!studentDoc.exists()) {
          console.log('No student found for ID:', balance.studentId);
          continue;
        }

        const studentData = studentDoc.data();
        console.log('Processing for student:', studentData.name);

        // Determine if we should send a reminder
        let shouldSendReminder = false;
        let messageTemplate = '';
        let daysMessage = '';

        if (settings.sendAllReminders) {
          // If sendAllReminders is true, send reminder for all pending balances
          shouldSendReminder = true;
          messageTemplate = settings.messageTemplate.upcoming;
          daysMessage = 'payment is pending';
        } else if (balance.dueDate) {
          // Only check due date if sendAllReminders is false and dueDate exists
          const dueDate = balance.dueDate.toDate();
          const now = new Date();
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilDue <= settings.daysThreshold && daysUntilDue >= 0) {
            shouldSendReminder = true;
            messageTemplate = settings.messageTemplate.upcoming;
            daysMessage = `due in ${daysUntilDue} days`;
          } else if (settings.includeOverdue && daysUntilDue < 0) {
            shouldSendReminder = true;
            messageTemplate = settings.messageTemplate.overdue;
            daysMessage = `overdue by ${Math.abs(daysUntilDue)} days`;
          }
        }

        if (shouldSendReminder) {
          const notificationRef = doc(collection(db, 'notifications'));
          const notificationData = {
            studentId: balance.studentId,
            studentEmail: studentData.email || '',
            title: 'Payment Reminder',
            message: messageTemplate
              .replace('{amount}', (balance.amount || 0).toLocaleString())
              .replace('{type}', balance.type || 'payment')
              .replace('{days}', daysMessage),
            type: 'payment_reminder',
            status: 'unread',
            createdAt: Timestamp.now(),
            relatedBalanceId: balanceDoc.id,
            dueDate: balance.dueDate || null,
            amount: balance.amount || 0
          };

          batch.set(notificationRef, notificationData);
          reminderCount++;
          console.log('Created reminder notification:', notificationData);
        }
      }

      if (reminderCount > 0) {
        await batch.commit();
        toast.success(`Successfully sent ${reminderCount} payment reminder${reminderCount === 1 ? '' : 's'}`);
        console.log('Successfully sent reminders:', reminderCount);
      } else {
        toast.success('No reminders needed to be sent at this time');
        console.log('No reminders were needed');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders: ' + (error as Error).message);
    } finally {
      setIsSendingReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Enhanced Header Section with Action Buttons */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-gray-600">Monitor and manage all payment transactions</p>
          </div>
          <div className="flex items-center gap-3">
            <ActionButton
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>}
              label="Export Report"
            />
            <ActionButton
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>}
              label="Add Fee"
              variant="primary"
              onClick={() => setIsAddFeeModalOpen(true)}
            />
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <ActionButton
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>}
            label="Bulk Add Fees"
            variant="primary"
            onClick={() => setShowBulkFeesModal(true)}
          />
          <ActionButton
            icon={
              isSendingReminders ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              )
            }
            label={isSendingReminders ? "Sending..." : "Send Reminders"}
            variant="success"
            onClick={sendPaymentReminders}
            disabled={isSendingReminders}
          />
          <ActionButton
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>}
            label="Reminder Settings"
            onClick={() => setIsReminderSettingsOpen(true)}
          />
          <ActionButton
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>}
            label="Manage Templates"
          />
          <ActionButton
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>}
            label="Settings"
          />
          <ActionButton
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>}
            label="Payment Settings"
            onClick={() => setShowPaymentSettings(true)}
          />
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <PaymentCard
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
            </svg>
          }
          title="Total Collections"
          value={stats.totalCollected}
          description="Total amount collected to date"
          trend={12.5}
        />
        <PaymentCard
          icon={
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="Pending Payments"
          value={stats.pendingAmount}
          description="Total amount pending clearance"
          trend={-2.3}
        />
        <PaymentCard
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          title="Today's Collections"
          value={stats.todayCollections}
          description="Amount collected today"
        />
        <PaymentCard
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          title="Success Rate"
          value={stats.successRate}
          description="Payment success rate"
          trend={5.2}
        />
      </div>

      {/* Enhanced Features Grid - Now 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Payment Automation */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Automation</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">Configure automatic payment reminders and notifications</p>
          <div className="space-y-2">
            <button 
              onClick={() => setIsAutomationModalOpen(true)}
              className="w-full px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Configure Settings
            </button>
          </div>
        </div>

        {/* Overdue Management */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Overdue Management</h3>
            <div className="p-2 bg-red-50 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">Manage overdue payments and penalties</p>
          <div className="space-y-2">
            <button 
              onClick={() => setIsOverdueModalOpen(true)}
              className="w-full px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              View Overdue Payments
            </button>
          </div>
        </div>

        {/* Payment Analytics */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Analytics</h3>
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">View detailed payment analytics</p>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors">
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4FB3E8] focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4FB3E8] focus:border-transparent"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4FB3E8] focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#4FB3E8] focus:border-transparent"
        >
          <option value="all">All Methods</option>
          <option value="gcash">GCash</option>
          <option value="maya">Maya</option>
          <option value="bank">Bank Transfer</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* ... Keep your existing table structure ... */}
          </table>
        </div>
      </div>

      <AddFeeModal
        isOpen={isAddFeeModalOpen}
        onClose={() => setIsAddFeeModalOpen(false)}
      />
      <BulkFeesModal
        isOpen={showBulkFeesModal}
        onClose={() => setShowBulkFeesModal(false)}
        onSuccess={() => {
          setToastMessage({ message: 'Bulk fees added successfully!', type: 'success' });
          setShowBulkFeesModal(false);
        }}
      />
      <OverdueSettingsModal
        isOpen={isOverdueModalOpen}
        onClose={() => setIsOverdueModalOpen(false)}
      />
      <AutomationSettingsModal
        isOpen={isAutomationModalOpen}
        onClose={() => setIsAutomationModalOpen(false)}
      />
      <PaymentReminderSettings
        isOpen={isReminderSettingsOpen}
        onClose={() => setIsReminderSettingsOpen(false)}
      />

      {toastMessage && (
        <Toast
          message={toastMessage.message}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}

      <PaymentSettingsModal
        isOpen={showPaymentSettings}
        onClose={() => setShowPaymentSettings(false)}
        settings={paymentSettings}
        onSave={(newSettings) => {
          setPaymentSettings(newSettings);
          setShowPaymentSettings(false);
        }}
      />
    </div>
  );
}

const PaymentSettingsModal = ({ isOpen, onClose, settings, onSave }) => (
  <Dialog open={isOpen} onClose={onClose} className="relative z-50">
    <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <Dialog.Panel className="bg-white rounded-xl p-6 max-w-2xl w-full">
        <h2 className="text-xl font-semibold mb-4">Payment Settings</h2>
        
        {/* Payment Methods */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Payment Methods</h3>
          <div className="grid grid-cols-2 gap-4">
            {['GCash', 'Maya', 'Bank Transfer', 'Cash'].map(method => (
              <label key={method} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.acceptedPaymentMethods.includes(method)}
                  onChange={(e) => {
                    const newMethods = e.target.checked
                      ? [...settings.acceptedPaymentMethods, method]
                      : settings.acceptedPaymentMethods.filter(m => m !== method);
                    onSave({ ...settings, acceptedPaymentMethods: newMethods });
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{method}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Payment Rules */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Payment Rules</h3>
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.allowPartialPayments}
                  onChange={(e) => onSave({ ...settings, allowPartialPayments: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Allow Partial Payments</span>
              </label>
            </div>
            {settings.allowPartialPayments && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Partial Amount</label>
                <input
                  type="number"
                  value={settings.minimumPartialAmount}
                  onChange={(e) => onSave({ ...settings, minimumPartialAmount: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Late Payment Settings */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Late Payment Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Grace Period (Days)</label>
              <input
                type="number"
                value={settings.gracePeriod}
                onChange={(e) => onSave({ ...settings, gracePeriod: Number(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Late Payment Penalty (%)</label>
              <input
                type="number"
                value={settings.latePaymentPenalty}
                onChange={(e) => onSave({ ...settings, latePaymentPenalty: Number(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Notification Preferences</h3>
          <div className="space-y-2">
            {Object.entries(settings.notificationPreferences).map(([key, value]) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => onSave({
                    ...settings,
                    notificationPreferences: {
                      ...settings.notificationPreferences,
                      [key]: e.target.checked
                    }
                  })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="capitalize">{key} Notifications</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </Dialog.Panel>
    </div>
  </Dialog>
); 