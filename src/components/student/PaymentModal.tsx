import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { PaymentService } from '@/services/PaymentService';
import { Balance } from '@/types/student';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { ActivityService } from '@/services/ActivityService';

// Define payment method type
type PaymentMethod = {
  id: string;
  name: string;
  icon: string;
};

// Define available payment methods
const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'gcash', name: 'GCash', icon: '💸' },
  { id: 'maya', name: 'Maya', icon: '💳' },
  { id: 'bpi', name: 'BPI Online', icon: '🏦' },
  { id: 'bdo', name: 'BDO Online', icon: '🏦' },
  { id: 'unionbank', name: 'UnionBank', icon: '🏦' },
  { id: 'grabpay', name: 'GrabPay', icon: '💳' },
];

// Helper function to format currency
const formatCurrency = (amount: number) => {
  const cleanAmount = Math.abs(amount);
  return cleanAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export default function PaymentModal({
  selectedBalance,
  setSelectedBalance,
  setIsPaymentModalOpen,
  setLastPayment,
  setShowReceipt,
  selectedBalances,
  fetchBalances,
  processMultiplePayments
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [referenceNumber, setReferenceNumber] = useState(`REF-${Date.now().toString().slice(-8)}`);
  
  const handleClose = () => {
    setIsPaymentModalOpen(false);
  };

  const processPayment = async () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    try {
      setLoading(true);
      const loadingToast = toast.loading('Processing payment...');

      // Update the balance status
      await updateDoc(doc(db, 'balances', selectedBalance.id), {
        status: 'completed',
        paidAt: Timestamp.now(),
        paymentMethod: selectedPaymentMethod,
        referenceNumber: referenceNumber
      });

      // Create a payment record
      const paymentRef = await addDoc(collection(db, 'payments'), {
        balanceId: selectedBalance.id,
        studentId: user?.uid,
        amount: selectedBalance.amount,
        paymentMethod: selectedPaymentMethod,
        referenceNumber: referenceNumber,
        status: 'completed',
        type: selectedBalance.type,
        createdAt: Timestamp.now(),
        paidAt: Timestamp.now()
      });

      // Log the activity
      await ActivityService.logActivityWithSafeMetadata({
        type: 'payment',
        action: 'payment_completed',
        description: `Payment of ₱${selectedBalance.amount.toLocaleString()} for ${selectedBalance.type} completed`,
        userId: user?.uid || '',
        userType: 'student',
        metadata: {
          paymentId: paymentRef.id,
          balanceId: selectedBalance.id,
          studentId: user?.uid || '',
          studentEmail: user?.email || '',
          amount: selectedBalance.amount || 0,
          paymentMethod: selectedPaymentMethod,
          referenceNumber: referenceNumber
        }
      });

      // Set the last payment for receipt
      setLastPayment({
        id: paymentRef.id,
        amount: selectedBalance.amount,
        type: selectedBalance.type,
        paymentMethod: selectedPaymentMethod,
        referenceNumber: referenceNumber,
        createdAt: Timestamp.now(),
        paidAt: Timestamp.now(),
        status: 'completed'
      });

      toast.dismiss(loadingToast);
      toast.success('Payment processed successfully!');
      
      // Close payment modal and show receipt
      setIsPaymentModalOpen(false);
      setShowReceipt(true);
      
      // Refresh balances
      fetchBalances();
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    
    if (selectedBalance.isMultiplePayment) {
      processMultiplePayments(selectedPaymentMethod, referenceNumber);
    } else {
      processPayment();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4FB3E8] mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Processing Payment...</h3>
            <p className="text-gray-500">Please wait while we process your payment...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {selectedBalance?.isMultiplePayment ? 'Multiple Payments' : 'Payment Details'}
              </h3>
              <button 
                type="button"
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Payment Information */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              {selectedBalance?.isMultiplePayment ? (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Payment Type:</span>
                    <span className="font-medium">Multiple Payments</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">{selectedBalances.length} items</span>
                  </div>
                  <div className="border-t border-gray-200 my-2 pt-2">
                    <div className="max-h-40 overflow-y-auto">
                      {selectedBalances.map((balance, index) => (
                        <div key={index} className="flex justify-between py-1 text-sm">
                          <span>{balance.type}</span>
                          <span>₱{formatCurrency(balance.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Payment Type:</span>
                    <span className="font-medium">{selectedBalance?.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-medium">
                      {selectedBalance?.dueDate?.toDate().toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Payment Amount Display */}
            <div className="mb-4">
              <p className="text-sm text-gray-600">Amount to Pay:</p>
              <p className="text-2xl font-bold">
                ₱{formatCurrency(selectedBalance?.isMultiplePayment 
                  ? selectedBalances.reduce((sum, b) => sum + b.amount, 0) 
                  : (selectedBalance?.amount || 0))}
              </p>
            </div>

            {/* Reference Number */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
              <div className="w-full p-2 border border-gray-200 bg-gray-50 rounded-md text-gray-700">
                {referenceNumber}
              </div>
              <p className="text-xs text-gray-500 mt-1">This reference number is automatically generated for your payment</p>
            </div>

            {/* Payment Method Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(method => (
                  <button
                    type="button"
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    className={`p-2 border rounded-md flex items-center justify-center ${
                      selectedPaymentMethod === method.id ? 'border-[#4FB3E8] bg-[#4FB3E8]/10' : 'border-gray-200'
                    }`}
                  >
                    <span className="mr-2">{method.icon}</span>
                    {method.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedPaymentMethod}
                className={`px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 ${
                  !selectedPaymentMethod ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Confirm Payment
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 