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
  const [student, setStudent] = useState<Student | null>(null);
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

    const fetchStudentAndBalances = async () => {
      try {
        // Find student document by email
        const studentQuery = query(
          collection(db, 'students'),
          where('email', '==', user.email)
        );
        const studentSnapshot = await getDocs(studentQuery);

        if (!studentSnapshot.empty) {
          const studentDoc = studentSnapshot.docs[0];
          const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
          setStudent(studentData);

          // Set up real-time listener for balances
          const balancesQuery = query(collection(db, `students/${studentData.id}/balances`));
          unsubscribe = onSnapshot(balancesQuery, (snapshot) => {
            const balancesList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate()
            })) as Balance[];

            setBalances(balancesList);
            // Calculate total pending balance
            const total = balancesList
              .filter(b => b.status === 'pending')
              .reduce((sum, b) => sum + (b.amount || 0), 0);
            setTotalBalance(total);
          });
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentAndBalances();

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

  // Update PaymentModal component
  const PaymentModal = () => {
    const totalSelected = selectedBalances.reduce((sum, b) => sum + b.amount, 0);

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-[480px] shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Payment Details
            </h3>

            {/* Payment Mode Selection */}
            <div className="mb-4">
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setPaymentMode('selected')}
                  className={`flex-1 py-2 px-4 rounded-md ${
                    paymentMode === 'selected' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Pay Selected
                </button>
                <button
                  onClick={() => setPaymentMode('custom')}
                  className={`flex-1 py-2 px-4 rounded-md ${
                    paymentMode === 'custom' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Custom Amount
                </button>
              </div>
            </div>

            {paymentMode === 'selected' ? (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Selected Balances:</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedBalances.map(balance => (
                    <div key={balance.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{balance.type}</span>
                      <span>₱{balance.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-right font-medium">
                  Total: ₱{totalSelected.toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Amount
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow numbers and decimal point
                    if (/^\d*\.?\d*$/.test(value)) {
                      setInputValue(value);
                      const numberValue = parseFloat(value);
                      if (!isNaN(numberValue)) {
                        setCustomAmount(numberValue);
                      } else {
                        setCustomAmount(0);
                      }
                    }
                  }}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
                  placeholder="Enter amount"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Available for: {balances.filter(b => b.status === 'pending').length} fees
                </p>
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`p-2 border rounded-md text-sm ${
                      selectedPaymentMethod === method.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-500'
                    }`}
                  >
                    <span className="mr-2">{method.icon}</span>
                    {method.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedBalances([]);
                  setCustomAmount(0);
                  setInputValue('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={
                  isProcessing || 
                  !selectedPaymentMethod || 
                  (paymentMode === 'selected' && selectedBalances.length === 0) ||
                  (paymentMode === 'custom' && customAmount <= 0)
                }
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                {isProcessing ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Update the handlePayment function
  const handlePayment = async () => {
    if (!selectedPaymentMethod) return;
    
    setIsProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (paymentMode === 'selected') {
        // Process selected balances
        for (const balance of selectedBalances) {
          const refNumber = generateReferenceNumber(student!.id);
          await updateDoc(
            doc(db, `students/${student!.id}/balances/${balance.id}`),
            {
              status: 'paid',
              paidAt: Timestamp.now(),
              paymentMethod: selectedPaymentMethod,
              referenceNumber: refNumber
            }
          );

          // Save last payment for receipt
          setLastPayment({
            balance,
            paymentMethod: selectedPaymentMethod,
            referenceNumber: refNumber
          });
        }
      } else {
        // Process custom amount payment
        const pendingBalances = balances.filter(b => b.status === 'pending');
        const payments = distributeCustomPayment(customAmount, pendingBalances);
        
        // Create a custom balance object for the receipt
        const customPaymentBalance: Balance = {
          id: 'custom-' + Date.now(),
          type: 'Custom Payment',
          amount: customAmount,
          status: 'paid',
          createdAt: new Date(),
          paidAt: new Date(),
          paymentMethod: selectedPaymentMethod,
          referenceNumber: generateReferenceNumber(student!.id)
        };

        // Process the payments
        for (const payment of payments) {
          const balance = pendingBalances.find(b => b.id === payment.balanceId)!;
          
          if (payment.amount === balance.amount) {
            // Full payment
            await updateDoc(
              doc(db, `students/${student!.id}/balances/${payment.balanceId}`),
              {
                status: 'paid',
                paidAt: Timestamp.now(),
                paymentMethod: selectedPaymentMethod,
                referenceNumber: customPaymentBalance.referenceNumber
              }
            );
          } else {
            // Partial payment
            await updateDoc(
              doc(db, `students/${student!.id}/balances/${payment.balanceId}`),
              {
                amount: balance.amount - payment.amount
              }
            );
          }
        }

        // Set last payment with the custom payment details
        setLastPayment({
          balance: customPaymentBalance,
          paymentMethod: selectedPaymentMethod,
          referenceNumber: customPaymentBalance.referenceNumber
        });
      }

      setIsPaymentModalOpen(false);
      setSelectedBalances([]);
      setCustomAmount(0);
      setInputValue('');
      setSelectedPaymentMethod('');
      setShowReceipt(true);
    } catch (error) {
      console.error('Error processing payment:', error);
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
            studentName={student!.name}
            studentEmail={student!.email}
            balance={lastPayment.balance}
            paymentMethod={lastPayment.paymentMethod}
            referenceNumber={lastPayment.referenceNumber}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!student) {
    return <div>Student not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Updated Navigation */}
      <nav className="bg-[#002147] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <img src="/logo.png" alt="School Logo" className="h-10 w-10" />
              <h1 className="text-xl font-bold">Student Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-300">{student.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Student Info Card */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6 col-span-2">
            <div className="flex items-center space-x-4">
              <div className="bg-[#4FB3E8] rounded-full p-4">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
                <div className="mt-1 flex space-x-4 text-sm text-gray-500">
                  <span>Section: {student.section}</span>
                  <span>•</span>
                  <span>Strand: {student.strand}</span>
                  <span>•</span>
                  <span>Grade: {student.grade}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Balance Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">Total Pending Balance</h3>
              <p className="mt-2 text-3xl font-bold text-[#002147]">
                ₱{Number(totalBalance).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              </p>
            </div>
          </div>
        </div>

        {/* Balance History */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Balance History</h3>
              {balances.filter(b => b.status === 'pending').length > 0 && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="bg-[#4FB3E8] text-white px-4 py-2 rounded-md hover:bg-[#3a8cbf] transition-colors flex items-center space-x-2"
                >
                  <span>Make Payment</span>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Added</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {balances.map((balance) => (
                  <tr key={balance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{balance.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      ₱{Number(balance.amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        balance.status === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {balance.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {balance.createdAt instanceof Date 
                        ? balance.createdAt.toLocaleDateString() 
                        : new Date(balance.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {balance.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedBalances([balance]);
                            setIsPaymentModalOpen(true);
                          }}
                          className="text-[#4FB3E8] hover:text-[#3a8cbf] font-medium"
                        >
                          Pay Now
                        </button>
                      )}
                      {balance.status === 'paid' && (
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
      </main>
      {isPaymentModalOpen && <PaymentModal />}
      {showReceipt && <ReceiptModal />}
    </div>
  );
} 