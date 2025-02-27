import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { PaymentService } from '@/services/PaymentService';
import { Balance } from '@/types/student';

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

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: Balance;
  onPaymentSuccess: (paymentData: any) => void;
  studentId: string;
  studentEmail: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  balance,
  onPaymentSuccess,
  studentId,
  studentEmail
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentMode, setPaymentMode] = useState<'selected' | 'custom'>('selected');
  const [customAmount, setCustomAmount] = useState('');

  if (!isOpen) return null;

  const handlePayment = async () => {
    try {
      if (!selectedPaymentMethod) {
        toast.error('Please select a payment method');
        return;
      }

      if (!balance) {
        toast.error('No payment to process');
        return;
      }

      if (!studentId) {
        toast.error('Student information not found');
        return;
      }

      // Show loading state
      setLoading(true);
      const loadingToast = toast.loading('Processing payment...');

      // Create payment data
      const paymentData = {
        studentId,
        studentEmail,
        amount: paymentMode === 'custom' ? Number(customAmount) : balance.amount,
        balanceId: balance.id,
        paymentMethod: selectedPaymentMethod
      };

      try {
        // Process payment using PaymentService
        const result = await PaymentService.processPayment(paymentData);
        
        // Dismiss loading toast
        toast.dismiss(loadingToast);
        
        // Show success toast
        toast.success('Payment processed successfully');
        
        // Call the success callback
        onPaymentSuccess(result);
        
        // Close the modal
        onClose();
      } catch (error) {
        // Dismiss loading toast
        toast.dismiss(loadingToast);
        
        console.error('Payment processing error:', error);
        toast.error('Failed to process payment. Please try again.');
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment');
      setLoading(false);
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
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Payment Details</h3>
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Payment Mode Selection */}
            <div className="mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMode('selected')}
                  className={`flex-1 py-2 px-4 rounded-md ${
                    paymentMode === 'selected' ? 'bg-[#4FB3E8] text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Pay Selected
                </button>
                <button
                  onClick={() => setPaymentMode('custom')}
                  className={`flex-1 py-2 px-4 rounded-md ${
                    paymentMode === 'custom' ? 'bg-[#4FB3E8] text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  Custom Amount
                </button>
              </div>
            </div>

            {/* Balance Information */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Payment Type:</span>
                <span className="font-medium">{balance.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-medium">
                  {balance.dueDate?.toDate().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Payment Amount Display */}
            <div className="mb-4">
              <p className="text-sm text-gray-600">Amount to Pay:</p>
              <p className="text-2xl font-bold">
                ₱{formatCurrency(paymentMode === 'custom' ? Number(customAmount) : (balance?.amount || 0))}
              </p>
            </div>

            {/* Custom Amount Input (if custom mode) */}
            {paymentMode === 'custom' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Enter Amount</label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                  placeholder="Enter amount"
                  required
                />
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {PAYMENT_METHODS.map(method => (
                <button
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

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={!selectedPaymentMethod || (paymentMode === 'custom' && (!customAmount || Number(customAmount) <= 0))}
                className={`px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 ${
                  !selectedPaymentMethod || (paymentMode === 'custom' && (!customAmount || Number(customAmount) <= 0)) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Pay Now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentModal; 