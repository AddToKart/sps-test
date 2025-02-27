'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { PaymentReceipt } from '@/components/PaymentReceipt';
import { toast } from 'react-hot-toast';

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

  useEffect(() => {
    if (!user?.email?.endsWith('@icons.com')) {
      router.push('/login');
      return;
    }

    const fetchBalances = async () => {
      try {
        // First get student info
        const studentsRef = collection(db, 'students');
        const studentQuery = query(studentsRef, where('email', '==', user.email));
        const studentSnapshot = await getDocs(studentQuery);
        
        if (studentSnapshot.empty) {
          console.error('Student not found');
          return;
        }

        const studentId = studentSnapshot.docs[0].id;

        // Get all balances for this student
        const balancesRef = collection(db, 'balances');
        const balancesQuery = query(
          balancesRef,
          where('studentId', '==', studentId),
          orderBy('createdAt', 'desc')
        );
        const balancesSnapshot = await getDocs(balancesQuery);

        const allBalances = balancesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Balance[];

        setBalances(allBalances);

        // Calculate statistics from paid balances
        const paidBalances = allBalances.filter(b => b.status === 'paid');
        if (paidBalances.length > 0) {
          const total = paidBalances.reduce((sum, balance) => sum + balance.amount, 0);
          const average = total / paidBalances.length;
          
          const methodCounts = paidBalances.reduce((acc, balance) => {
            if (balance.paymentMethod) {
              acc[balance.paymentMethod] = (acc[balance.paymentMethod] || 0) + 1;
            }
            return acc;
          }, {} as { [key: string]: number });
          
          const sortedMethods = Object.entries(methodCounts)
            .sort((a, b) => b[1] - a[1]);
          
          setStats({
            totalPaid: total,
            averagePayment: average,
            preferredMethod: sortedMethods.length > 0 ? sortedMethods[0][0] : 'N/A'
          });
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching balances:', error);
        toast.error('Failed to load payment history');
        setLoading(false);
      }
    };

    fetchBalances();
  }, [user, router]);

  const filteredBalances = balances.filter(balance => {
    if (activeTab === 'paid') return balance.status === 'paid';
    if (activeTab === 'pending') return balance.status === 'pending';
    return true;
  });

  const handleViewReceipt = (balance: Balance) => {
    if (balance.status !== 'paid') {
      toast.error('Receipt is only available for paid balances');
      return;
    }
    setSelectedBalance(balance);
    setShowReceipt(true);
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
          <p className="text-3xl font-bold text-gray-900">₱{stats.totalPaid.toLocaleString()}</p>
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
          <p className="text-3xl font-bold text-gray-900">₱{stats.averagePayment.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₱{balance.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {balance.paymentMethod || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {balance.referenceNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {balance.type}
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
                      {balance.status === 'paid' && (
                        <button
                          onClick={() => handleViewReceipt(balance)}
                          className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Receipt
                        </button>
                      )}
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
      {showReceipt && selectedBalance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Payment Receipt</h3>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <PaymentReceipt
                studentName={user?.displayName || ''}
                studentEmail={user?.email || ''}
                balance={selectedBalance}
                paymentMethod={selectedBalance.paymentMethod}
                referenceNumber={selectedBalance.referenceNumber}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 