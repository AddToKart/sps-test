'use client';

import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Student, Balance } from '@/types/student';
import dynamic from 'next/dynamic';
const PaymentReceipt = dynamic(() => import('@/components/PaymentReceipt').then(mod => mod.PaymentReceipt), {
  ssr: false
});

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
  { id: 'grabpay', name: 'GrabPay', icon: '💳' },
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

export default function StudentDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [studentData, setStudentData] = useState({
    id: '',
    name: '',
    studentId: '',
    grade: '',
    program: '',
  });

  const [balanceData, setBalanceData] = useState({
    totalBalance: 0,
    paymentStatus: 'Regular Payment',
    dueDate: '',
    nextDueDate: '',
    isOnTrack: true,
    balances: []
  });

  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [selectedBalance, setSelectedBalance] = useState<Balance | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastPayment, setLastPayment] = useState<{
    balance: Balance;
    paymentMethod: string;
    referenceNumber: string;
  } | null>(null);
  const [selectedBalances, setSelectedBalances] = useState<Balance[]>([]);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'selected' | 'custom'>('selected');

  useEffect(() => {
    if (!user || !user.email?.endsWith('@student.com')) {
      router.push('/login');
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const fetchData = async () => {
      try {
        // Fetch student data
        const studentsRef = collection(db, 'students');
        const q = query(studentsRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const studentDoc = querySnapshot.docs[0];
          const data = studentDoc.data();
          setStudentData({
            id: studentDoc.id,
            name: data.name,
            studentId: data.studentId,
            grade: data.grade,
            program: data.program,
          });

          // Fetch balances
          const balancesRef = collection(db, 'balances');
          const balancesQuery = query(balancesRef, where('studentId', '==', studentDoc.id));
          const balancesSnapshot = await getDocs(balancesQuery);
          const balancesList = balancesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          })) as Balance[];
          setBalances(balancesList);

          // Calculate total of pending balances
          const pendingBalances = balancesList.filter(b => b.status === 'pending');
          const pendingTotal = pendingBalances.reduce((acc, curr) => acc + (curr.amount || 0), 0);

          // Find next due date from pending balances
          const nextDue = pendingBalances.length > 0
            ? pendingBalances
                .sort((a, b) => a.dueDate - b.dueDate)[0]?.dueDate
            : null;

          setBalanceData({
            totalBalance: pendingTotal,
            paymentStatus: pendingBalances.length > 0 ? 'Regular Payment' : 'Fully Paid',
            dueDate: nextDue ? new Date(nextDue).toISOString().split('T')[0] : '',
            nextDueDate: nextDue ? formatDate(nextDue) : 'No pending payments',
            isOnTrack: true,
            balances: balancesList
          });

          // Update total balance state
          setTotalBalance(pendingTotal);
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, router]);

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

  // Add new handler for Make Payment button
  const handleMakePayment = () => {
    setSelectedBalances([]); // Reset selected balances
    setIsPaymentModalOpen(true);
  };

  // Add handler for balance selection
  const handleBalanceSelect = (balance: Balance) => {
    setSelectedBalances(prev => {
      const isSelected = prev.some(b => b.id === balance.id);
      if (isSelected) {
        return prev.filter(b => b.id !== balance.id);
      } else {
        return [...prev, balance];
      }
    });
  };

  // Modify the PaymentModal component
  const PaymentModal = () => {
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    
    // Calculate total based on payment mode
    const totalAmount = paymentMode === 'selected'
      ? selectedBalances.reduce((sum, b) => sum + (b.amount || 0), 0)
      : customAmount;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          {isProcessing ? (
            // Processing Payment UI
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4FB3E8] mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
              <p className="text-gray-500">Please wait while we process your payment...</p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
              
              {/* Payment Mode Selection */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentMode('selected')}
                    className={`flex-1 py-2 px-4 rounded-md ${
                      paymentMode === 'selected' 
                        ? 'bg-[#4FB3E8] text-white' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Pay Selected
                  </button>
                  <button
                    onClick={() => setPaymentMode('custom')}
                    className={`flex-1 py-2 px-4 rounded-md ${
                      paymentMode === 'custom' 
                        ? 'bg-[#4FB3E8] text-white' 
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    Custom Amount
                  </button>
                </div>
              </div>

              {paymentMode === 'selected' ? (
                // Balance Selection Section
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Select Balances to Pay:</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {balances
                      .filter(balance => balance.status === 'pending')
                      .map(balance => (
                        <div 
                          key={balance.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedBalances.some(b => b.id === balance.id)}
                              onChange={() => handleBalanceSelect(balance)}
                              className="mr-2"
                            />
                            <span>{balance.type}</span>
                          </div>
                          <span>₱{balance.amount?.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                // Custom Amount Section
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Amount
                  </label>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d*$/.test(value)) {
                        setInputValue(value);
                        setCustomAmount(parseFloat(value) || 0);
                      }
                    }}
                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
                    placeholder="Enter amount"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Available pending fees: {balances.filter(b => b.status === 'pending').length}
                  </p>
                </div>
              )}

              {/* Show total amount */}
              <div className="border-t pt-4 mb-4">
                <div className="flex justify-between font-semibold">
                  <span>Total Amount</span>
                  <span>₱{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PAYMENT_METHODS.map(method => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`p-2 border rounded-md flex items-center justify-center ${
                      selectedPaymentMethod === method.id 
                        ? 'border-[#4FB3E8] bg-[#4FB3E8]/10' 
                        : 'border-gray-200'
                    }`}
                  >
                    <span className="mr-2">{method.icon}</span>
                    {method.name}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedBalances([]);
                    setCustomAmount(0);
                    setInputValue('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (paymentMode === 'selected' && selectedBalances.length === 0) {
                      alert('Please select at least one balance to pay');
                      return;
                    }
                    if (paymentMode === 'custom' && customAmount <= 0) {
                      alert('Please enter a valid amount');
                      return;
                    }
                    if (!selectedPaymentMethod) {
                      alert('Please select a payment method');
                      return;
                    }
                    handlePayment(selectedPaymentMethod);
                  }}
                  disabled={isProcessing}
                  className={`px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 
                    ${(paymentMode === 'selected' && selectedBalances.length === 0) || 
                    (paymentMode === 'custom' && customAmount <= 0) || 
                    !selectedPaymentMethod || isProcessing
                      ? 'opacity-50 cursor-not-allowed' 
                      : ''
                    }`}
                >
                  {isProcessing ? 'Processing...' : 'Pay Now'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Update handlePayment function
  const handlePayment = async (paymentMethod: string) => {
    setIsProcessing(true);
    try {
      // Add artificial delay to show processing state (optional)
      await new Promise(resolve => setTimeout(resolve, 2000));

      let paymentsToProcess;

      if (paymentMode === 'selected') {
        // Process selected balances
        paymentsToProcess = selectedBalances.map(balance => ({
          balanceId: balance.id,
          amount: balance.amount,
          type: balance.type
        }));
      } else {
        // Process custom amount with priority algorithm
        const pendingBalances = balances
          .filter(b => b.status === 'pending')
          .sort((a, b) => {
            // Prioritize tuition fee
            if (a.type.toLowerCase().includes('tuition')) return -1;
            if (b.type.toLowerCase().includes('tuition')) return 1;
            // Then sort by creation date
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });

        let remainingAmount = customAmount;
        paymentsToProcess = [];

        for (const balance of pendingBalances) {
          if (remainingAmount <= 0) break;

          const amountToApply = Math.min(remainingAmount, balance.amount);
          paymentsToProcess.push({
            balanceId: balance.id,
            amount: amountToApply,
            type: balance.type
          });
          remainingAmount -= amountToApply;
        }
      }

      // Generate reference number
      const referenceNumber = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      // Update each balance in the new collection
      for (const payment of paymentsToProcess) {
        const balanceRef = doc(db, 'balances', payment.balanceId);
        await updateDoc(balanceRef, {
          status: 'paid',
          paymentMethod,
          referenceNumber,
          paidAt: new Date()
        });
      }

      // Set receipt data
      setLastPayment({
        balance: {
          amount: paymentMode === 'selected' 
            ? selectedBalances.reduce((sum, b) => sum + b.amount, 0)
            : customAmount,
          type: paymentMode === 'selected'
            ? selectedBalances.map(b => b.type).join(', ')
            : 'Custom Payment',
          status: 'paid'
        },
        paymentMethod,
        referenceNumber
      });

      setShowReceipt(true);
      setIsPaymentModalOpen(false);
      setSelectedBalances([]);
      setCustomAmount(0);
      setInputValue('');

    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add ReceiptModal component
  const ReceiptModal = () => {
    if (!lastPayment) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Payment Receipt
            </h3>
            <button
              onClick={() => setShowReceipt(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <PaymentReceipt
            studentName={studentData.name}
            studentEmail={user?.email}
            balance={lastPayment.balance}
            paymentMethod={lastPayment.paymentMethod}
            referenceNumber={lastPayment.referenceNumber}
          />
        </div>
      </div>
    );
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      if (date instanceof Timestamp) {
        return date.toDate().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        });
      }
      return new Date(date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const handlePayNow = (balance: Balance) => {
    setSelectedBalances([balance]);
    setIsPaymentModalOpen(true);
  };

  const handleViewReceipt = (balance) => {
    // Implement receipt view logic
    setShowReceipt(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Student Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <div className="bg-[#002147] rounded-full w-12 h-12 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">{studentData.name}</h2>
            <p className="text-gray-600 text-sm">
              Student ID: {studentData.studentId} • Grade: {studentData.grade} • Program: {studentData.program}
            </p>
          </div>
        </div>
      </div>

      {/* Total Pending Balance */}
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-600 mb-1">Total Pending Balance</p>
        <p className="text-3xl font-bold">₱{balanceData.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm mb-1">Total Balance</p>
          <p className="text-xl font-semibold">₱{balanceData.totalBalance.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm mb-1">Payment Status</p>
          <p className="text-xl font-semibold">{balanceData.paymentStatus}</p>
          <p className="text-[#4FB3E8] text-sm">On Track</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm mb-1">Next Due Date</p>
          <p className="text-xl font-semibold">{balanceData.nextDueDate}</p>
        </div>
      </div>

      {/* Balance History */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">Balance History</h3>
          <button 
            onClick={handleMakePayment}
            className="bg-[#4FB3E8] text-white px-4 py-2 rounded-md hover:bg-[#4FB3E8]/90 transition-colors"
          >
            Make Payment +
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Added</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {balanceData.balances.map((balance) => (
                <tr key={balance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{balance.type}</td>
                  <td className="px-6 py-4 text-sm">₱{balance.amount?.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      balance.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {balance.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {balance.createdAt?.toDate().toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {balance.status === 'pending' ? (
                      <button
                        onClick={() => handlePayNow(balance)}
                        className="text-[#4FB3E8] hover:text-[#3a8cbf] font-medium"
                      >
                        Pay Now
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setLastPayment({
                            balance,
                            paymentMethod: balance.paymentMethod || '',
                            referenceNumber: balance.referenceNumber || ''
                          });
                          setShowReceipt(true);
                        }}
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        View Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && <PaymentModal />}
      {showReceipt && <ReceiptModal />}
    </div>
  );
} 