'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Payment {
  id: string;
  amount: number;
  date: Date;
  paymentMethod: string;
  referenceNumber: string;
  balanceType: string;
}

interface PaymentStats {
  totalPaid: number;
  averagePayment: number;
  mostUsedMethod: string;
  recentPayments: Payment[];
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, month, year
  const [stats, setStats] = useState<PaymentStats>({
    totalPaid: 0,
    averagePayment: 0,
    mostUsedMethod: '',
    recentPayments: []
  });

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) return;

      try {
        const studentsRef = collection(db, 'students');
        const studentQuery = query(studentsRef, where('email', '==', user.email));
        const studentSnapshot = await getDocs(studentQuery);
        
        if (!studentSnapshot.empty) {
          const studentDoc = studentSnapshot.docs[0];
          const balancesRef = collection(db, 'balances');
          const balancesQuery = query(
            balancesRef, 
            where('studentId', '==', studentDoc.id),
            where('status', '==', 'paid')
          );
          
          const balancesSnapshot = await getDocs(balancesQuery);
          const paymentsList: Payment[] = balancesSnapshot.docs
            .map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                amount: data.amount || 0,
                date: data.paidAt?.toDate() || new Date(),
                paymentMethod: data.paymentMethod || 'Unknown',
                referenceNumber: data.referenceNumber || 'N/A',
                balanceType: data.type || 'Unknown'
              };
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());
          
          setPayments(paymentsList);
          calculateStats(paymentsList);
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [user]);

  const calculateStats = (paymentsList: Payment[]) => {
    const total = paymentsList.reduce((sum, payment) => sum + payment.amount, 0);
    const average = total / paymentsList.length || 0;
    
    // Calculate most used payment method with proper typing
    const methodCounts: Record<string, number> = paymentsList.reduce((acc, payment) => ({
      ...acc,
      [payment.paymentMethod]: (acc[payment.paymentMethod] || 0) + 1
    }), {} as Record<string, number>);
    
    const mostUsed = Object.entries(methodCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'None';

    setStats({
      totalPaid: total,
      averagePayment: average,
      mostUsedMethod: mostUsed,
      recentPayments: paymentsList.slice(0, 5)
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm">Total Amount Paid</h3>
          <p className="text-2xl font-bold">₱{stats.totalPaid.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm">Average Payment</h3>
          <p className="text-2xl font-bold">₱{stats.averagePayment.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm">Preferred Payment Method</h3>
          <p className="text-2xl font-bold">{stats.mostUsedMethod}</p>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Payment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ₱{payment.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.paymentMethod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.referenceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.balanceType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 