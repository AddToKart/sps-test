'use client';

import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, Timestamp, orderBy, limit, getDoc, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Student, Balance } from '@/types/student';
import dynamic from 'next/dynamic';
import { pdf } from '@react-pdf/renderer';
import { onAuthStateChanged } from 'firebase/auth';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { toast } from 'react-hot-toast';
import PaymentModal from '@/components/student/PaymentModal';
import { PaymentService } from '@/services/PaymentService';
import { Notification } from '@/types/notification';
import { BellIcon } from '@heroicons/react/24/outline';
import { ActivityService } from '@/services/ActivityService';
import ReceiptDocument from '@/components/student/ReceiptDocument';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const PaymentReceipt = dynamic(
  () => import('@/components/PaymentReceipt').then(mod => mod.PaymentReceipt),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }
);

// Add PaymentMethod type
type PaymentMethod = {
  id: string;
  name: string;
  icon: string;
};

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'gcash', name: 'GCash', icon: '💸' },
  { id: 'maya', name: 'Maya', icon: '💳' },
  { id: 'bpi', name: 'BPI Online', icon: '🏦' },
  { id: 'bdo', name: 'BDO Online', icon: '🏦' },
  { id: 'unionbank', name: 'UnionBank', icon: '🏦' },
  { id: 'grabpay', name: 'GrabPay', icon: '📱' },
];

const generateReferenceNumber = (studentId: string) => {
  const timestamp = new Date().getTime();
  const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PAY-${timestamp.toString().slice(-6)}${randomDigits}`;
};

const formatCurrency = (amount: number) => {
  const cleanAmount = Math.abs(amount);
  return cleanAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// First, let's define our color constants at the top
const COLORS = {
  navy: '#002147', // Dark blue from logo
  lightBlue: '#4FB3E8', // Light blue from logo
  gold: '#C5A572', // Gold/laurel color
  white: '#FFFFFF',
  lightGray: '#F3F4F6',
};

interface StudentInfo {
  id: string;
  fullName: string;
  studentId: string;
  grade: string;
  strand: string;
  section: string;
  email: string;
}

interface PaymentHistory {
  id: string;
  amount: number;
  type: string;
  status: string;
  createdAt: any;
  dueDate: any;
}

// Add the getDaysUntilDue function to calculate days until due date
const getDaysUntilDue = (dueDate: any) => {
  if (!dueDate) {
    return { days: 0, status: 'upcoming' };
  }
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDateObj = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);
    
    const diffTime = dueDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { days: Math.abs(diffDays), status: 'overdue' };
    } else if (diffDays <= 3) {
      return { days: diffDays, status: 'due-soon' };
    } else {
      return { days: diffDays, status: 'upcoming' };
    }
  } catch (error) {
    console.error('Error calculating days until due:', error);
    return { days: 0, status: 'upcoming' };
  }
};

// Add the formatDate function to format dates consistently
const formatDate = (date: any) => {
  if (!date) return 'No due date';
  
  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [nextPayment, setNextPayment] = useState<PaymentHistory | null>(null);
  const [recentPayments, setRecentPayments] = useState<PaymentHistory[]>([]);
  const [paymentStats, setPaymentStats] = useState({
    completed: 0,
    pending: 0,
    overdue: 0
  });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentMode, setPaymentMode] = useState<'selected' | 'custom'>('selected');
  const [customAmount, setCustomAmount] = useState('');
  const [lastPayment, setLastPayment] = useState<PaymentHistory | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<Balance | null>(null);
  const [selectedBalances, setSelectedBalances] = useState<Balance[]>([]);
  const [pendingBalances, setPendingBalances] = useState<Balance[]>([]);
  const [totalSelectedAmount, setTotalSelectedAmount] = useState(0);
  const [upcomingPayments, setUpcomingPayments] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    console.log('Dashboard mounted');
    console.log('Current user:', user);
    console.log('User email:', user?.email);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Current user:', user?.email);
      
      if (!user || !user.email?.endsWith('@icons.com')) {
        console.log('Unauthorized access, redirecting to login');
        router.push('/login');
        return;
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const fetchAndSetupListeners = async () => {
      try {
        // First get student info
        const studentsRef = collection(db, 'students');
        const studentQuery = query(studentsRef, where('email', '==', user.email));
        const studentSnapshot = await getDocs(studentQuery);
        
        if (studentSnapshot.empty) {
          console.error('Student not found');
          return;
        }

        const studentData = {
          id: studentSnapshot.docs[0].id,
          ...studentSnapshot.docs[0].data()
        };
        setStudentInfo(studentData);

        // Set up real-time listener for balances
        const balancesRef = collection(db, 'balances');
        
        // Listen for all balances for this student
        const balancesQuery = query(
          balancesRef,
          where('studentId', '==', studentData.id)
        );

        const unsubscribeBalances = onSnapshot(balancesQuery, (snapshot) => {
          const balances = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Balance[];

          // Update various states based on balances
          const pending = balances.filter(b => b.status === 'pending');
          const paid = balances.filter(b => b.status === 'paid');
          const overdue = balances.filter(b => b.status === 'overdue');

          // Store pending balances for selection
          setPendingBalances(pending);

          // Calculate total pending balance
          const totalPendingAmount = pending.reduce((sum, b) => sum + b.amount, 0);
          setTotalBalance(totalPendingAmount);

          setPaymentStats({
            total: totalPendingAmount,
            pending: pending.length,
            completed: paid.length,
            overdue: overdue.length
          });

          // Set next payment - find the one closest to due date
          if (pending.length > 0) {
            const today = new Date();
            
            // Sort pending payments by how close they are to their due date
            // Payments already past due will be at the top, followed by those closest to being due
            const sortedByDueDate = [...pending].sort((a, b) => {
              const dateA = a.dueDate?.toDate() || new Date(9999, 11, 31); // Far future default
              const dateB = b.dueDate?.toDate() || new Date(9999, 11, 31);
              
              // Calculate days until due (negative if overdue)
              const daysUntilDueA = Math.ceil((dateA.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const daysUntilDueB = Math.ceil((dateB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              
              // If both are overdue or both are upcoming, sort by closest to due date
              if ((daysUntilDueA <= 0 && daysUntilDueB <= 0) || (daysUntilDueA > 0 && daysUntilDueB > 0)) {
                return daysUntilDueA - daysUntilDueB;
              }
              
              // Prioritize overdue payments
              return daysUntilDueA <= 0 ? -1 : 1;
            });
            
            // Set the most urgent payment as next payment
            setNextPayment(sortedByDueDate[0]);
            
            console.log('Next payment due:', sortedByDueDate[0]);
          } else {
            setNextPayment(null);
          }

          // Set recent payments with safe date handling
          const recentPaid = paid
            .sort((a, b) => {
              const dateA = a.paidAt?.toDate() || new Date(0);
              const dateB = b.paidAt?.toDate() || new Date(0);
              return dateB.getTime() - dateA.getTime();
            })
            .slice(0, 5);
          setRecentPayments(recentPaid);

          console.log('Balances updated:', {
            total: balances.length,
            pending: pending.length,
            paid: paid.length,
            overdue: overdue.length
          });
        });

        return () => {
          unsubscribeBalances();
        };
      } catch (error) {
        console.error('Error setting up dashboard:', error);
      }
    };

    fetchAndSetupListeners();
  }, [user]);

  // Update total selected amount whenever selected balances change
  useEffect(() => {
    const total = selectedBalances.reduce((sum, balance) => sum + balance.amount, 0);
    setTotalSelectedAmount(total);
  }, [selectedBalances]);

  // Toggle balance selection
  const toggleBalanceSelection = (balance: Balance) => {
    setSelectedBalances(prev => {
      const isSelected = prev.some(b => b.id === balance.id);
      if (isSelected) {
        return prev.filter(b => b.id !== balance.id);
      } else {
        return [...prev, balance];
      }
    });
  };

  // Clear all selected balances
  const clearSelectedBalances = () => {
    setSelectedBalances([]);
  };

  // Select all pending balances
  const selectAllBalances = () => {
    setSelectedBalances([...pendingBalances]);
  };

  // Update the handleMultiplePayments function to show the payment modal first
  const handleMultiplePayments = () => {
    if (selectedBalances.length === 0) {
      toast.error('No balances selected for payment');
      return;
    }

    // Calculate total amount
    const totalAmount = selectedBalances.reduce((sum, balance) => sum + balance.amount, 0);
    
    // Create a combined balance object for the payment modal
    setSelectedBalance({
      id: 'multiple',
      amount: totalAmount,
      type: 'Multiple Payments',
      isMultiplePayment: true,
      balances: selectedBalances,
      status: 'pending',
      studentId: user?.uid || '',
      dueDate: new Date(),
      createdAt: Timestamp.now()
    } as any);
    
    // Open the payment modal
    setIsPaymentModalOpen(true);
  };

  // Update the processMultiplePayments function to properly group payments
  const processMultiplePayments = async (paymentMethod, referenceNumber) => {
    try {
      setProcessingPayment(true);
      
      // Calculate total amount
      const totalAmount = selectedBalances.reduce((sum, balance) => sum + balance.amount, 0);
      
      // Create a single payment record for all balances
      const paymentRef = await addDoc(collection(db, 'payments'), {
        studentId: user?.uid,
        amount: totalAmount,
        paymentMethod: paymentMethod,
        referenceNumber: referenceNumber,
        status: 'completed',
        type: 'Multiple Payments',
        createdAt: Timestamp.now(),
        paidAt: Timestamp.now(),
        isMultiplePayment: true,
        balanceIds: selectedBalances.map(b => b.id),
        // Store the details of each balance for the receipt
        balances: selectedBalances.map(b => ({
          id: b.id,
          type: b.type,
          amount: b.amount,
          dueDate: b.dueDate
        }))
      });
      
      // Update all selected balances to reference this payment
      const updatePromises = selectedBalances.map(balance => 
        updateDoc(doc(db, 'balances', balance.id), {
          status: 'completed',
          paidAt: Timestamp.now(),
          paymentMethod: paymentMethod,
          referenceNumber: referenceNumber,
          groupPaymentId: paymentRef.id // Add reference to the group payment
        })
      );
      
      await Promise.all(updatePromises);
      
      // Log the activity
      await ActivityService.logActivityWithSafeMetadata({
        type: 'payment',
        action: 'multiple_payments_completed',
        description: `Group payment of ₱${totalAmount.toLocaleString()} completed`,
        userId: user?.uid || '',
        userType: 'student',
        metadata: {
          paymentId: paymentRef.id,
          balanceIds: selectedBalances.map(b => b.id),
          studentId: user?.uid || '',
          studentEmail: user?.email || '',
          amount: totalAmount,
          paymentMethod: paymentMethod,
          referenceNumber: referenceNumber
        }
      });
      
      // Set the last payment for receipt
      setLastPayment({
        id: paymentRef.id,
        amount: totalAmount,
        type: 'Group Payment',
        paymentMethod: paymentMethod,
        referenceNumber: referenceNumber,
        createdAt: Timestamp.now(),
        paidAt: Timestamp.now(),
        status: 'completed',
        isMultiplePayment: true,
        balances: selectedBalances.map(b => ({
          id: b.id,
          type: b.type,
          amount: b.amount,
          dueDate: b.dueDate
        }))
      });
      
      // Show receipt
      setShowReceipt(true);
      setIsPaymentModalOpen(false);
      
      toast.success('Multiple payments processed successfully!');
      fetchBalances(); // Refresh balances
      
    } catch (error) {
      console.error('Error processing multiple payments:', error);
      toast.error('Failed to process payments. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Add helper function for distributing custom payment
  const distributeCustomPayment = (amount: number, balances: Balance[]) => {
    let remaining = amount;
    const payments: { balanceId: string, amount: number }[] = [];
    
    // Sort balances by date (oldest first)
    const sortedBalances = [...balances].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const balance of sortedBalances) {
      if (remaining <= 0) break;
      
      const paymentAmount = Math.min(remaining, balance.amount);
      payments.push({
        balanceId: balance.id,
        amount: paymentAmount
      });
      
      remaining -= paymentAmount;
    }

    return payments;
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      console.log('Payment success:', paymentData);

      // Show success message
      toast.success('Payment processed successfully', {
        duration: 5000,
        icon: '✅'
      });

      // Set last payment for receipt
      setLastPayment({
        ...paymentData,
        createdAt: paymentData.createdAt,
        paidAt: paymentData.paidAt,
        // Add selected balances for multiple payments receipt
        selectedBalances: paymentData.isMultiplePayment ? selectedBalances : undefined
      });
      
      // Show receipt
      setShowReceipt(true);

      // Reset payment modal state
      setIsPaymentModalOpen(false);
      setSelectedPaymentMethod('');
      setCustomAmount('');
      setSelectedBalance(null);
      
      // Clear selected balances after successful payment
      clearSelectedBalances();

    } catch (error) {
      console.error('Error updating dashboard:', error);
      toast.error('Error updating dashboard data');
    }
  };

  const handlePayNow = (balance: Balance) => {
    // Set the selected balance and open the payment modal
    setSelectedBalance(balance);
    setIsPaymentModalOpen(true);
  };

  // Add a function to open a payment selection modal
  const handleOpenPaymentSelection = () => {
    // If there's only one pending balance, just pay that directly
    if (pendingBalances.length === 1) {
      handlePayNow(pendingBalances[0]);
      return;
    }
    
    // If there are multiple pending balances, show the selection interface
    // by selecting all balances and opening the multiple payment flow
    if (pendingBalances.length > 0) {
      setSelectedBalances(pendingBalances);
      
      // Set the selected balance with multiple payment flag
      setSelectedBalance({
        ...pendingBalances[0],
        amount: pendingBalances.reduce((sum, b) => sum + b.amount, 0),
        type: 'Multiple Payments',
        isMultiplePayment: true,
        balances: pendingBalances
      } as any);
      
      setIsPaymentModalOpen(true);
    } else {
      toast.error('No pending balances to pay');
    }
  };

  useEffect(() => {
    const fetchUpcomingPayments = async () => {
      if (!user?.email) return;
      
      try {
        // Use the existing notifications collection and index
        const notificationsRef = collection(db, 'notifications');
        const q = query(
          notificationsRef,
          where('studentEmail', '==', user.email),
          where('type', '==', 'payment'),
          where('status', '==', 'pending'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        
        const snapshot = await getDocs(q);
        const notifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Transform notifications into payment format
        const payments = notifications.map(notification => ({
          id: notification.id,
          type: notification.paymentType || 'Payment Due',
          amount: notification.amount || 0,
          dueDate: notification.dueDate,
          status: notification.status,
          createdAt: notification.createdAt
        }));
        
        setUpcomingPayments(payments);
      } catch (error) {
        console.error('Error fetching payment notifications:', error);
        toast.error('Failed to load payment reminders');
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.email) {
      fetchUpcomingPayments();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.email) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('studentEmail', '==', user.email),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => n.status === 'unread').length);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        status: 'read'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Add these handler functions before the return statement
  const handleViewStatement = () => {
    router.push('/student/payments');
  };

  const handleGetSupport = () => {
    router.push('/student/support');
  };

  const handleViewReceipt = (payment: PaymentHistory) => {
    setLastPayment(payment);
    setShowReceipt(true);
  };

  // Add the fetchBalances function
  const fetchBalances = async () => {
    try {
      if (!user) return;
      
      console.log('Fetching balances for user:', user.uid);
      
      // Get all balances for the current student
      const balancesRef = collection(db, 'balances');
      const q = query(
        balancesRef,
        where('studentId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      const balancesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Balance[];
      
      console.log('Fetched balances:', balancesData.length);
      
      // Filter balances by status
      const pending = balancesData.filter(balance => balance.status === 'pending');
      const completed = balancesData.filter(balance => balance.status === 'paid');
      const overdue = pending.filter(balance => {
        if (!balance.dueDate) return false;
        const dueDate = balance.dueDate.toDate();
        return dueDate < new Date();
      });
      
      // Set pending balances
      setPendingBalances(pending);
      
      // Calculate total balance
      const total = pending.reduce((sum, balance) => sum + balance.amount, 0);
      setTotalBalance(total);
      
      // Set payment stats
      setPaymentStats({
        completed: completed.length,
        pending: pending.length,
        overdue: overdue.length
      });
      
      // Set next payment (the one with the earliest due date)
      const sortedByDueDate = [...pending].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.toDate().getTime() - b.dueDate.toDate().getTime();
      });
      
      setNextPayment(sortedByDueDate[0] || null);
      
      // Set recent payments
      const recentPaid = completed.slice(0, 5);
      setRecentPayments(recentPaid);
      
      // Set upcoming payments (due in the next 7 days)
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      
      const upcoming = pending.filter(balance => {
        if (!balance.dueDate) return false;
        const dueDate = balance.dueDate.toDate();
        return dueDate >= now && dueDate <= nextWeek;
      });
      
      setUpcomingPayments(upcoming);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching balances:', error);
      toast.error('Failed to load payment data');
      setIsLoading(false);
    }
  };

  // Fix the handlePayment function to properly handle string IDs
  const handlePayment = async (balanceId: string) => {
    try {
      if (!balanceId || typeof balanceId !== 'string') {
        console.error('Invalid balance ID:', balanceId);
        toast.error('Invalid balance data');
        return;
      }
      
      setProcessingPayment(true);
      
      // Generate a unique reference number with proper string format
      const referenceNumber = `PAY-${Date.now().toString()}-${Math.floor(Math.random() * 10000).toString()}`;
      
      // Get the balance details
      const balanceRef = doc(db, 'balances', balanceId);
      const balanceDoc = await getDoc(balanceRef);
      
      if (!balanceDoc.exists()) {
        toast.error('Balance not found');
        return;
      }
      
      const balance = { id: balanceDoc.id, ...balanceDoc.data() };
      
      // Update the balance status
      await updateDoc(balanceRef, {
        status: 'paid',
        paidAt: Timestamp.now(),
        paymentMethod: selectedPaymentMethod,
        referenceNumber: referenceNumber
      });
      
      // Create a payment record
      const paymentRef = await addDoc(collection(db, 'payments'), {
        balanceId: balanceId,
        studentId: user?.uid,
        amount: balance.amount,
        paymentMethod: selectedPaymentMethod,
        referenceNumber: referenceNumber,
        status: 'completed',
        type: balance.type,
        createdAt: Timestamp.now(),
        paidAt: Timestamp.now()
      });
      
      // Log the activity with safe metadata
      await ActivityService.logActivityWithSafeMetadata({
        type: 'payment',
        action: 'payment_completed',
        description: `Payment of ₱${balance.amount.toLocaleString()} for ${balance.type} completed`,
        userId: user?.uid || '',
        userType: 'student',
        metadata: {
          paymentId: paymentRef.id,
          balanceId: balanceId,
          studentId: user?.uid || '',
          studentEmail: user?.email || '',
          amount: balance.amount || 0,
          paymentMethod: selectedPaymentMethod,
          referenceNumber: referenceNumber
        }
      });
      
      // Set the last payment for receipt
      setLastPayment({
        id: paymentRef.id,
        amount: balance.amount,
        type: balance.type,
        paymentMethod: selectedPaymentMethod,
        referenceNumber: referenceNumber,
        createdAt: Timestamp.now(),
        paidAt: Timestamp.now(),
        status: 'completed'
      });
      
      // Show receipt
      setShowReceipt(true);
      setIsPaymentModalOpen(false);
      
      toast.success('Payment successful!');
      fetchBalances(); // Refresh balances
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Update the generatePDFReceipt function to properly handle PDF generation
  const generatePDFReceipt = async (payment) => {
    try {
      console.log('Generating PDF receipt for payment:', payment);
      
      // Import the pdf function and ReceiptDocument component
      const { pdf } = await import('@react-pdf/renderer');
      const ReceiptDocument = (await import('@/components/student/ReceiptDocument')).default;
      
      // Create the PDF document using the ReceiptDocument component
      const blob = await pdf(
        <ReceiptDocument
          studentName={studentInfo?.fullName || ''}
          studentEmail={user?.email || ''}
          studentId={studentInfo?.studentId || ''}
          balance={payment}
          paymentMethod={payment.paymentMethod}
          referenceNumber={payment.referenceNumber || `REF-${payment.id.substring(0, 8)}`}
          isMultiplePayment={payment.isMultiplePayment}
          balances={payment.balances || []}
        />
      ).toBlob();
      
      // Create a URL for the blob
      const url = URL.createObjectURL(blob);
      
      // Create a link element and trigger a download
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${payment.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF receipt:', error);
      toast.error('Failed to generate receipt. Please try again.');
    }
  };

  // Add the ReceiptModal component to the dashboard page
  const ReceiptModal = () => {
    if (!lastPayment) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Payment Receipt</h2>
            <button 
              onClick={() => setShowReceipt(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Payment Receipt</h3>
            <p className="text-gray-600">Thank you for your payment</p>
          </div>
          
          <div className="border-t border-b border-gray-200 py-4 mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Student ID:</span>
              <span className="font-medium">{studentInfo?.studentId}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Reference Number:</span>
              <span className="font-medium">{lastPayment.referenceNumber || `REF-${lastPayment.id.substring(0, 8)}`}</span>
            </div>
            {!lastPayment.isMultiplePayment ? (
              <>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Payment Type:</span>
                  <span className="font-medium">{lastPayment.type}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">₱{lastPayment.amount.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium">₱{lastPayment.amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-medium">{lastPayment.paymentMethod}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Date:</span>
              <span className="font-medium">
                {formatDate(lastPayment.paidAt || lastPayment.createdAt)}
              </span>
            </div>
          </div>
          
          {/* Multiple Payments Breakdown */}
          {lastPayment.isMultiplePayment && lastPayment.balances && lastPayment.balances.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Payment Breakdown</h4>
              <div className="bg-gray-50 rounded-md p-3">
                {lastPayment.balances.map((item, index) => (
                  <div key={index} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                    <span className="text-sm">{item.type}</span>
                    <span className="text-sm font-medium">₱{item.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 mt-1 border-t border-gray-300">
                  <span className="font-medium">Total</span>
                  <span className="font-medium">₱{lastPayment.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="text-center text-green-600 mb-4">
            <p className="font-medium">Payment Successful</p>
            <p className="text-sm text-gray-500 mt-1">A copy of this receipt has been sent to your email.</p>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={() => setShowReceipt(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={() => generatePDFReceipt(lastPayment)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Update the fetchPaymentHistory function to handle grouped payments
  const fetchPaymentHistory = async () => {
    try {
      if (!user) return;
      
      const paymentsRef = collection(db, 'payments');
      const q = query(
        paymentsRef,
        where('studentId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      
      const paymentsSnapshot = await getDocs(q);
      const paymentsData = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Set recent payments
      setRecentPayments(paymentsData);
      
      // Count completed payments
      const completedCount = paymentsData.length;
      
      // Update payment stats
      setPaymentStats(prev => ({
        ...prev,
        completed: completedCount
      }));
      
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#002147]"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Student Info Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-[#4FB3E8] flex items-center justify-center text-white text-2xl font-bold">
              {studentInfo?.fullName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{studentInfo?.fullName}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{studentInfo?.studentId}</span>
                <span>•</span>
                <span>{studentInfo?.grade} - {studentInfo?.strand}</span>
                <span>•</span>
                <span>{studentInfo?.section}</span>
              </div>
            </div>
          </div>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                          notification.status === 'unread' ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${
                            notification.type === 'payment_reminder' ? 'bg-yellow-100' :
                            notification.type === 'overdue_reminder' ? 'bg-red-100' :
                            'bg-green-100'
                          }`}>
                            {notification.type === 'payment_reminder' ? '💰' :
                             notification.type === 'overdue_reminder' ? '⚠️' :
                             '✅'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{notification.title}</p>
                            <p className="text-sm text-gray-600">{notification.message}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {notification.createdAt?.toDate().toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-gray-100">
                  <button
                    onClick={() => router.push('/student/notifications')}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Balance Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-blue-50">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">₱{totalBalance.toLocaleString()}</h3>
          <p className="text-sm text-gray-600">Total Balance</p>
        </div>

        {/* Completed Payments */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-green-50">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{paymentStats.completed}</h3>
          <p className="text-sm text-gray-600">Completed Payments</p>
        </div>

        {/* Pending Payments */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-yellow-50">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{paymentStats.pending}</h3>
          <p className="text-sm text-gray-600">Pending Payments</p>
        </div>

        {/* Overdue Payments */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg bg-red-50">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{paymentStats.overdue}</h3>
          <p className="text-sm text-gray-600">Overdue Payments</p>
        </div>
      </div>

      {/* Next Payment and Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Next Payment Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Next Payment Due</h2>
          {nextPayment ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">{nextPayment.type}</span>
                <span className="font-medium">₱{formatCurrency(nextPayment.amount)}</span>
              </div>
              
              {nextPayment.dueDate && (
                <div className="mb-4">
                  <div className="text-sm mb-1">
                    Due on {nextPayment.dueDate?.toDate().toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  
                  {(() => {
                    const { days, status } = getDaysUntilDue(nextPayment.dueDate);
                    
                    const statusConfig = {
                      'overdue': {
                        color: 'text-red-600',
                        icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                        text: `Overdue by ${days} ${days === 1 ? 'day' : 'days'}`
                      },
                      'due-soon': {
                        color: 'text-amber-600',
                        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                        text: `Due in ${days} ${days === 1 ? 'day' : 'days'}`
                      },
                      'upcoming': {
                        color: 'text-green-600',
                        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                        text: `Due in ${days} ${days === 1 ? 'day' : 'days'}`
                      }
                    };

                    const currentStatus = statusConfig[status];
                    
                    return (
                      <div className={`flex items-center ${currentStatus.color}`}>
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={currentStatus.icon} />
                        </svg>
                        <span className="text-sm font-medium">{currentStatus.text}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              <button
                onClick={() => handlePayNow(nextPayment as Balance)}
                className="w-full py-3 bg-[#002147] text-white rounded-lg hover:bg-[#002147]/90 transition-colors"
              >
                Pay Now
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-600">No pending payments</p>
              <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
            <div className="text-sm text-gray-500">
              Showing last {recentPayments.length} payments
            </div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto pr-2">
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div 
                  key={payment.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-50 rounded-full">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{payment.type}</p>
                      <p className="text-sm text-gray-500">
                        {payment.createdAt?.toDate().toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₱{payment.amount?.toLocaleString()}</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </div>
                    <button
                      onClick={() => handleViewReceipt(payment)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="View Receipt"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={handleOpenPaymentSelection}
          className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="font-medium">Make Payment</span>
          </div>
        </button>
        <button 
          onClick={handleViewStatement}
          className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="font-medium">View Statement</span>
          </div>
        </button>
        <button 
          onClick={handleGetSupport}
          className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="font-medium">Get Support</span>
          </div>
        </button>
      </div>

      {/* All Pending Balances Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">All Pending Balances</h2>
          <div className="flex gap-2">
            <button 
              onClick={clearSelectedBalances}
              className="px-3 py-1 text-gray-600 hover:text-gray-800"
              disabled={selectedBalances.length === 0}
            >
              Clear Selection
            </button>
            <button 
              onClick={selectAllBalances}
              className="px-3 py-1 text-gray-600 hover:text-gray-800"
              disabled={pendingBalances.length === 0 || pendingBalances.length === selectedBalances.length}
            >
              Select All
            </button>
            {selectedBalances.length > 0 && (
              <button 
                onClick={handleMultiplePayments}
                className="px-3 py-1 text-sm bg-[#002147] text-white rounded-md hover:bg-[#002147]/90"
              >
                Pay Selected (₱{formatCurrency(totalSelectedAmount)})
              </button>
            )}
          </div>
        </div>

        {pendingBalances.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingBalances.map((balance) => {
                  const { days, status } = getDaysUntilDue(balance.dueDate);
                  const isSelected = selectedBalances.some(b => b.id === balance.id);
                  
                  return (
                    <tr key={balance.id} className={isSelected ? "bg-blue-50" : ""}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => toggleBalanceSelection(balance)}
                          className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{balance.type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDate(balance.dueDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {status === 'overdue' ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Overdue by {days} {days === 1 ? 'day' : 'days'}
                          </span>
                        ) : status === 'due-soon' ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Due in {days} {days === 1 ? 'day' : 'days'}
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Due in {days} days
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">₱{formatCurrency(balance.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handlePayNow(balance)}
                          className="text-[#4FB3E8] hover:text-[#4FB3E8]/80"
                        >
                          Pay Now
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600">No pending balances</p>
            <p className="text-sm text-gray-500 mt-1">You're all caught up with your payments!</p>
          </div>
        )}
      </div>

      {/* Payment Reminders Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Reminders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : upcomingPayments.length > 0 ? (
            upcomingPayments.map((payment) => (
              <div 
                key={payment.id}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{payment.type}</h3>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(payment.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </div>
                <div className="mb-4">
                  <p className="text-2xl font-bold text-gray-900">
                    ₱{payment.amount.toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handlePayNow(payment)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Pay Now
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-gray-50 rounded-xl p-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending payments</h3>
              <p className="mt-1 text-sm text-gray-500">You're all caught up with your payments!</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {isPaymentModalOpen && selectedBalance && (
        <PaymentModal 
          selectedBalance={selectedBalance}
          setSelectedBalance={setSelectedBalance}
          setIsPaymentModalOpen={setIsPaymentModalOpen}
          setLastPayment={setLastPayment}
          setShowReceipt={setShowReceipt}
          selectedBalances={selectedBalances}
          fetchBalances={fetchBalances}
          processMultiplePayments={processMultiplePayments}
        />
      )}
      {showReceipt && lastPayment && <ReceiptModal />}
    </div>
  );
} 