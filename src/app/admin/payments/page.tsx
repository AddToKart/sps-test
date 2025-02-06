'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, Timestamp, orderBy, getDocs } from 'firebase/firestore';
import { Dialog } from '@headlessui/react';

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

  const addTestPayment = async () => {
    try {
      const paymentData = {
        studentId: 'TEST123',
        studentName: 'Test Student',
        amount: 5000,
        status: 'pending',
        paymentMethod: 'gcash',
        referenceNumber: 'REF' + Math.random().toString(36).substr(2, 9),
        createdAt: Timestamp.now(),
        balanceId: 'BAL123',
        paymentType: 'tuition'
      };

      await addDoc(collection(db, 'payments'), paymentData);
      alert('Test payment added successfully');
    } catch (error) {
      console.error('Error adding test payment:', error);
      alert('Error adding test payment');
    }
  };

  const cleanupTestPayments = async () => {
    if (!confirm('Are you sure you want to remove all test payments?')) return;
    
    try {
      const testPayments = payments.filter(p => p.studentId === 'TEST123');
      await Promise.all(
        testPayments.map(payment => 
          deleteDoc(doc(db, 'payments', payment.id))
        )
      );
      alert('Test payments removed successfully');
    } catch (error) {
      console.error('Error removing test payments:', error);
      alert('Error removing test payments');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payment Management</h1>
        <div className="space-x-3">
          <button
            onClick={cleanupTestPayments}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Remove Test Data
          </button>
          <button
            onClick={addTestPayment}
            className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90"
          >
            Add Test Payment
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <input
          type="text"
          placeholder="Search by name or reference..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Method</label>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
          >
            <option value="all">All Methods</option>
            <option value="gcash">GCash</option>
            <option value="bank">Bank Transfer</option>
            <option value="cash">Cash</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">From Date</label>
          <input
            type="date"
            value={dateRange.start || ''}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">To Date</label>
          <input
            type="date"
            value={dateRange.end || ''}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Today's Collections</h3>
          <p className="text-2xl font-bold text-[#002147]">
            ₱{getTodayCollections().toLocaleString()}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">This Month's Collections</h3>
          <p className="text-2xl font-bold text-[#002147]">
            ₱{getMonthCollections().toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Average Payment Amount</h3>
          <p className="text-2xl font-bold text-[#002147]">
            ₱{getAveragePayment().toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-8 text-center">
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payments</h3>
            <p className="mt-1 text-sm text-gray-500">
              Payments will appear here once students make payments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.createdAt.toDate().toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.studentName}</div>
                      <div className="text-sm text-gray-500">{payment.studentId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{payment.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.paymentMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.referenceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${payment.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'}`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {payment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleVerifyPayment(payment)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleVoidPayment(payment)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Void
                          </button>
                        </>
                      )}
                      {payment.status === 'completed' && (
                        <button
                          onClick={() => handleVoidPayment(payment)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Void
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 