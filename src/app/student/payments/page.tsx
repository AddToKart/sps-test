'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { PaymentReceipt } from '@/components/PaymentReceipt';
import { toast } from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import ReceiptDocument from '@/components/student/ReceiptDocument';
import ReceiptModal from '@/components/student/ReceiptModal';

interface Balance {
  id: string;
  amount: number;
  type: string;
  paymentMethod: string;
  referenceNumber: string;
  createdAt: any;
  paidAt: any;
  status: string;
  studentId: string;
  isMultiplePayment: boolean;
  balances?: Balance[];
}

export default function PaymentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'pending'>('all');
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<Balance | null>(null);
  const [stats, setStats] = useState({
    totalPaid: 0,
    averagePayment: 0,
    preferredMethod: 'N/A'
  });
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Balance | null>(null);
  const [studentInfo, setStudentInfo] = useState<any>(null);

  useEffect(() => {
    if (!user?.email?.endsWith('@icons.com')) {
      router.push('/login');
      return;
    }

    const fetchPayments = async () => {
      try {
        setLoading(true);
        if (!user) return;

        const paymentsRef = collection(db, 'payments');
        const q = query(
          paymentsRef,
          where('studentId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const paymentsSnapshot = await getDocs(q);
        const paymentsData = paymentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Process payments for display
        const processedPayments = paymentsData.map(payment => {
          // For group payments, set the type to "Group Payment"
          if (payment.isMultiplePayment) {
            return {
              ...payment,
              type: 'Group Payment',
              // Calculate total amount if not already set
              amount: payment.amount || (payment.balances?.reduce((sum, b) => sum + b.amount, 0) || 0)
            };
          }
          return payment;
        });

        setBalances(processedPayments);
        
        // Calculate statistics
        const totalPaid = processedPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
        const avgPayment = processedPayments.length > 0 ? totalPaid / processedPayments.length : 0;
        
        // Find most used payment method
        const methodCounts = processedPayments.reduce((acc, payment) => {
          const method = payment.paymentMethod || 'Unknown';
          acc[method] = (acc[method] || 0) + 1;
          return acc;
        }, {});
        
        let preferredMethod = 'None';
        let maxCount = 0;
        
        Object.entries(methodCounts).forEach(([method, count]) => {
          if (count > maxCount) {
            maxCount = count;
            preferredMethod = method;
          }
        });
        
        setStats({
          totalPaid,
          avgPayment,
          preferredMethod: preferredMethod.charAt(0).toUpperCase() + preferredMethod.slice(1)
        });
        
      } catch (error) {
        console.error('Error fetching payments:', error);
        toast.error('Failed to load payment history');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user, router]);

  useEffect(() => {
    if (user) {
      fetchStudentInfo();
    }
  }, [user]);

  const fetchStudentInfo = async () => {
    if (!user?.uid) return;
    
    try {
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('uid', '==', user.uid));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const studentData = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        };
        setStudentInfo(studentData);
      }
    } catch (error) {
      console.error('Error fetching student info:', error);
    }
  };

  const filteredBalances = balances.filter(balance => {
    if (activeTab === 'paid') return balance.status === 'paid';
    if (activeTab === 'pending') return balance.status === 'pending';
    return true;
  });

  const handleViewReceipt = (payment: any) => {
    const enrichedPayment = {
      ...payment,
      studentInfo: {
        studentId: studentInfo?.studentId || '',
        fullName: studentInfo?.fullName || '',
        email: studentInfo?.email || user?.email || '',
        grade: studentInfo?.grade || '',
        strand: studentInfo?.strand || '',
        section: studentInfo?.section || ''
      }
    };
    setSelectedPayment(enrichedPayment);
    setShowReceiptModal(true);
  };

  const generatePDFReceipt = async (payment: Balance) => {
    try {
      console.log('Generating PDF receipt for payment:', payment);
      
      const blob = await pdf(
        <ReceiptDocument
          studentName={studentInfo?.fullName || ''}
          studentEmail={studentInfo?.email || user?.email || ''}
          studentId={studentInfo?.studentId || ''}
          balance={payment}
          paymentMethod={payment.paymentMethod}
          referenceNumber={payment.referenceNumber || `REF-${payment.id.substring(0, 8)}`}
          isMultiplePayment={payment.isMultiplePayment}
          balanceDetails={payment.balanceDetails || []}
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

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const confirmed = window.confirm(
        'Are you sure you want to delete this payment record? This action cannot be undone.'
      );

      if (!confirmed) return;

      // Delete the payment document
      await deleteDoc(doc(db, 'payments', paymentId));

      // Refresh the payments list
      fetchPayments();

      toast.success('Payment record deleted successfully');
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment record');
    }
  };

  const formatPaymentMethod = (method: string) => {
    const methods: { [key: string]: string } = {
      'gcash': 'GCash',
      'maya': 'Maya',
      'bpi': 'BPI Online',
      'bdo': 'BDO Online',
      'unionbank': 'UnionBank',
      'grabpay': 'GrabPay'
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with animation */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
        <p className="text-gray-600">Track and manage your payment records</p>
      </div>

      {/* Stats Cards with hover effects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Amount Paid</h3>
            <div className="p-2 bg-green-50 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">₱{stats.totalPaid ? stats.totalPaid.toLocaleString() : '0.00'}</p>
          <p className="text-sm text-gray-500 mt-2">Total payments made</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Average Payment</h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">₱{stats.avgPayment ? stats.avgPayment.toLocaleString() : '0.00'}</p>
          <p className="text-sm text-gray-500 mt-2">Average per transaction</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Preferred Method</h3>
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 capitalize">{stats.preferredMethod}</p>
          <p className="text-sm text-gray-500 mt-2">Most used payment method</p>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          {/* Tabs */}
          <div className="p-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All Transactions
              </button>
              <button
                onClick={() => setActiveTab('paid')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'paid'
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Paid
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'pending'
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredBalances.length > 0 ? (
                filteredBalances.map((balance) => (
                  <tr 
                    key={balance.id} 
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(balance.paidAt || balance.createdAt)?.toDate().toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {balance.isMultiplePayment ? balance.balances?.map(b => b.type).join(', ') : balance.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {balance.isMultiplePayment ? 'Group Payment' : 'Single Payment'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₱{balance.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {formatPaymentMethod(balance.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {balance.referenceNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        balance.status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {balance.status.charAt(0).toUpperCase() + balance.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewReceipt(balance)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Receipt
                        </button>
                        {balance.status === 'paid' && (
                          <button
                            onClick={() => generatePDFReceipt(balance)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Download PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 bg-gray-50">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-600">No transactions found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && selectedPayment && (
        <ReceiptModal
          lastPayment={selectedPayment}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
} 