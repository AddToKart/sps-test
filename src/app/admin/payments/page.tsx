'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, Timestamp, orderBy, getDocs, where, getDoc } from 'firebase/firestore';
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

export default function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: null,
    end: null
  });
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
      // Get settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'paymentReminders'));
      const settings = settingsDoc.exists() 
        ? settingsDoc.data() 
        : defaultSettings;  // Use the same defaultSettings from PaymentReminderSettings

      // Get all pending balances
      const balancesQuery = query(
        collection(db, 'balances'),
        where('status', '==', 'pending')
      );
      
      const balancesSnapshot = await getDocs(balancesQuery);
      let reminderCount = 0;

      for (const balanceDoc of balancesSnapshot.docs) {
        const balance = balanceDoc.data();
        
        if (!balance.dueDate || !balance.studentEmail || !balance.amount) {
          continue;
        }

        const dueDate = balance.dueDate.toDate();
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Check both sendAllReminders and daysThreshold
        if (settings.sendAllReminders || daysUntilDue <= settings.daysThreshold) {
          try {
            await addDoc(collection(db, 'notifications'), {
              studentId: balance.studentId,
              studentEmail: balance.studentEmail,
              title: daysUntilDue < 0 ? 'Payment Overdue' : 'Payment Reminder',
              message: daysUntilDue < 0 
                ? settings.messageTemplate.overdue
                    .replace('{amount}', balance.amount.toString())
                    .replace('{type}', balance.type)
                    .replace('{days}', Math.abs(daysUntilDue).toString())
                : settings.messageTemplate.upcoming
                    .replace('{amount}', balance.amount.toString())
                    .replace('{type}', balance.type)
                    .replace('{days}', daysUntilDue.toString()),
              type: daysUntilDue < 0 ? 'overdue_reminder' : 'payment_reminder',
              status: 'unread',
              createdAt: Timestamp.now(),
              relatedBalanceId: balanceDoc.id,
              dueDate: balance.dueDate,
              amount: balance.amount
            });
            reminderCount++;
          } catch (error) {
            console.error(`Failed to send reminder for balance ${balanceDoc.id}:`, error);
          }
        }
      }

      if (reminderCount > 0) {
        toast.success(`Sent ${reminderCount} payment reminders`);
      } else {
        toast.success('No reminders sent');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Payment Management</h1>
        <div className="space-x-4">
          <button
            onClick={() => setIsAddFeeModalOpen(true)}
            className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90"
          >
            Add Fee
          </button>
          <button
            onClick={() => setShowBulkFeesModal(true)}
            className="px-4 py-2 bg-[#002147] text-white rounded-md hover:bg-[#002147]/90"
          >
            Bulk Add Fees
          </button>
          <MigrateDataButton />
          <button
            onClick={() => setIsReminderSettingsOpen(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Reminder Settings
          </button>
          <button
            onClick={sendPaymentReminders}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Send Payment Reminders
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-4">Payment Automation</h3>
          <p className="text-gray-600 mb-4">Configure automatic payment reminders and notifications</p>
          <button
            onClick={() => setIsAutomationModalOpen(true)}
            className="text-[#4FB3E8] hover:text-[#4FB3E8]/90"
          >
            Configure Settings →
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-4">Overdue Management</h3>
          <p className="text-gray-600 mb-4">Set up overdue payment policies and penalties</p>
          <button
            onClick={() => setIsOverdueModalOpen(true)}
            className="text-[#4FB3E8] hover:text-[#4FB3E8]/90"
          >
            Manage Overdue →
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-4">Payment Reports</h3>
          <p className="text-gray-600 mb-4">Generate and export payment reports</p>
          <PaymentExport payments={payments} />
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button 
              onClick={sendPaymentReminders}
              className="w-full text-left text-[#4FB3E8] hover:text-[#4FB3E8]/90"
            >
              Send Payment Reminders →
            </button>
            <button className="w-full text-left text-[#4FB3E8] hover:text-[#4FB3E8]/90">
              View Overdue Payments →
            </button>
            <button className="w-full text-left text-[#4FB3E8] hover:text-[#4FB3E8]/90">
              Payment Analytics →
            </button>
          </div>
        </div>
      </div>

      <PaymentFilters filters={filters} setFilters={setFilters} />
      <PaymentTable payments={payments} loading={loading} />

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
    </div>
  );
} 