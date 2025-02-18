'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import BulkFeesModal from '@/components/admin/BulkFeesModal';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Student {
  id: string;
  fullName: string;
  email: string;
  studentId: string;
  grade: string;
  strand: string;
  section: string;
}

// Add these constants at the top of your file
const GRADES = ['11', '12'];
const STRANDS = ['ABM', 'HUMSS', 'ICT', 'STEM'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const FEE_TYPES = [
  'Tuition Fee',
  'Laboratory Fee',
  'Miscellaneous Fee',
  'Books and Modules',
  'School Events',
  'Other Fees'
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    withBalance: 0,
    newEnrollees: 0,
    totalCollections: 0,
    pendingPayments: 0,
    completedPayments: 0,
    collectionRate: 0
  });

  const [loading, setLoading] = useState(true);

  // Add new state for charts
  const [paymentTrends, setPaymentTrends] = useState({
    labels: [],
    datasets: [{
      data: [],
      borderColor: '#4FB3E8',
      tension: 0.4
    }]
  });

  const [paymentMethods, setPaymentMethods] = useState({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: ['#4FB3E8', '#002147', '#E5E7EB']
    }]
  });

  // Add these state declarations after your existing useState declarations
  const [recentPayments, setRecentPayments] = useState([]);
  const [todayCollection, setTodayCollection] = useState(0);
  const [weeklyCollection, setWeeklyCollection] = useState(0);
  const [monthlyCollection, setMonthlyCollection] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [isBulkFeesModalOpen, setIsBulkFeesModalOpen] = useState(false);

  useEffect(() => {
    if (!user || !user.email?.endsWith('@admin.com')) {
      window.location.href = '/login';
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch students
        const studentsRef = collection(db, 'students');
        const studentsSnapshot = await getDocs(studentsRef);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // 2. Fetch balances
        const balancesRef = collection(db, 'balances');
        const balancesSnapshot = await getDocs(balancesRef);
        const balancesData = balancesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate stats
        const totalStudents = studentsData.length;
        const activeStudents = studentsData.filter(student => student.status !== 'inactive').length;
        
        // Calculate students with balance
        const studentsWithBalance = new Set(
          balancesData
            .filter(balance => balance.status === 'pending')
            .map(balance => balance.studentId)
        ).size;

        // Calculate payments and collections
        const pendingPayments = balancesData.filter(balance => balance.status === 'pending').length;
        const completedPayments = balancesData.filter(balance => balance.status === 'paid').length;
        
        const totalCollections = balancesData
          .filter(balance => balance.status === 'paid')
          .reduce((sum, balance) => sum + (balance.amount || 0), 0);

        // Calculate collection rate
        const collectionRate = completedPayments > 0 
          ? (completedPayments / (pendingPayments + completedPayments)) * 100 
          : 0;

        // Calculate time-based collections
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0));
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayCollection = balancesData
          .filter(balance => 
            balance.status === 'paid' && 
            balance.paidAt?.toDate() >= startOfDay
          )
          .reduce((sum, balance) => sum + (balance.amount || 0), 0);

        const weeklyCollection = balancesData
          .filter(balance => 
            balance.status === 'paid' && 
            balance.paidAt?.toDate() >= startOfWeek
          )
          .reduce((sum, balance) => sum + (balance.amount || 0), 0);

        const monthlyCollection = balancesData
          .filter(balance => 
            balance.status === 'paid' && 
            balance.paidAt?.toDate() >= startOfMonth
          )
          .reduce((sum, balance) => sum + (balance.amount || 0), 0);

        // Update all states
        setStats({
          totalStudents,
          activeStudents,
          withBalance: studentsWithBalance,
          newEnrollees: 0, // You can implement this based on createdAt date
          totalCollections,
          pendingPayments,
          completedPayments,
          collectionRate
        });

        setStudents(studentsData);
        setTodayCollection(todayCollection);
        setWeeklyCollection(weeklyCollection);
        setMonthlyCollection(monthlyCollection);

        // Set recent payments
        const recentPayments = balancesData
          .filter(balance => balance.status === 'paid')
          .sort((a, b) => b.paidAt?.toDate() - a.paidAt?.toDate())
          .slice(0, 5)
          .map(balance => ({
            id: balance.id,
            studentId: balance.studentId,
            studentName: studentsData.find(s => s.id === balance.studentId)?.fullName || 'Unknown',
            amount: balance.amount,
            createdAt: balance.paidAt
          }));

        setRecentPayments(recentPayments);

        // Count payment methods
        const methodCounts = balancesData
          .filter(balance => balance.status === 'paid')
          .reduce((acc, balance) => {
            const method = balance.paymentMethod?.toLowerCase() || 'other';
            acc[method] = (acc[method] || 0) + 1;
            return acc;
          }, {});

        setPaymentMethods({
          labels: Object.keys(methodCounts),
          datasets: [{
            data: Object.values(methodCounts),
            backgroundColor: [
              '#4FB3E8',    // GCash
              '#002147',    // Maya
              '#0047AB',    // BDO
              '#FF0000',    // BPI
              '#00308F',    // UnionBank
            ],
            borderWidth: 0
          }]
        });

        // Get last 7 days for trends
        const last7Days = Array.from({length: 7}, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date;
        });

        // Calculate daily totals for payment trends
        const dailyTotals = last7Days.map(day => {
          const startOfDay = new Date(day.setHours(0, 0, 0, 0));
          const endOfDay = new Date(day.setHours(23, 59, 59, 999));
          
          return balancesData
            .filter(balance => {
              const paidAt = balance.paidAt?.toDate();
              return (
                balance.status === 'paid' &&
                paidAt >= startOfDay &&
                paidAt <= endOfDay
              );
            })
            .reduce((sum, balance) => sum + (balance.amount || 0), 0);
        });

        // Update payment trends state
        setPaymentTrends({
          labels: last7Days.map(date => 
            date.toLocaleDateString('en-US', { weekday: 'short' })
          ),
          datasets: [{
            label: 'Daily Collections',
            data: dailyTotals,
            borderColor: '#4FB3E8',
            backgroundColor: 'rgba(79, 179, 232, 0.1)',
            tension: 0.4,
            fill: true
          }]
        });

        setLoading(false);
      } catch (error) {
        console.error('Error in fetchData:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#002147]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Students Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-[#4FB3E8]/10 rounded-full">
              <svg className="h-6 w-6 text-[#4FB3E8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-[#002147]">{stats.totalStudents}</p>
            </div>
          </div>
        </div>

        {/* Active Students */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Students</p>
              <p className="text-2xl font-bold text-[#002147]">{stats.activeStudents}</p>
            </div>
          </div>
        </div>

        {/* With Balance */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">With Balance</p>
              <p className="text-2xl font-bold text-[#002147]">{stats.withBalance}</p>
            </div>
          </div>
        </div>

        {/* Collection Rate */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Collection Rate</p>
              <p className="text-2xl font-bold text-[#002147]">{stats.collectionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment Trends Chart - Takes 2 columns */}
        <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
          <h2 className="text-lg font-medium mb-4">Payment Trends</h2>
          <div className="h-64">
            <Line
              data={paymentTrends}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => '₱' + value.toLocaleString()
                    }
                  }
                },
                plugins: {
                  legend: {
                    display: false
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Payment Methods</h2>
          <div className="h-64">
            <Doughnut
              data={paymentMethods}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      boxWidth: 12,
                      padding: 15,
                      font: {
                        size: 11
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Additional Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Payments */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Recent Payments</h2>
          <div className="space-y-4">
            {/* Add recent payments list */}
            <div className="max-h-64 overflow-y-auto">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <p className="font-medium">{payment.studentName}</p>
                    <p className="text-sm text-gray-500">{payment.createdAt.toDate().toLocaleDateString()}</p>
                  </div>
                  <p className="font-medium text-[#002147]">₱{payment.amount.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Collection Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Collection Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Today's Collection</p>
              <p className="font-medium">₱{todayCollection.toLocaleString()}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">This Week</p>
              <p className="font-medium">₱{weeklyCollection.toLocaleString()}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">This Month</p>
              <p className="font-medium">₱{monthlyCollection.toLocaleString()}</p>
            </div>
            <div className="flex justify-between items-center font-medium text-[#002147]">
              <p>Total Collections</p>
              <p>₱{stats.totalCollections.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium mb-4">Payment Status</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Pending Payments</p>
              <p className="font-medium text-yellow-600">{stats.pendingPayments}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Completed Payments</p>
              <p className="font-medium text-green-600">{stats.completedPayments}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-gray-600">Success Rate</p>
              <p className="font-medium text-[#4FB3E8]">{stats.collectionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add a button to open the modal */}
      <button
        onClick={() => setIsBulkFeesModalOpen(true)}
        className="bg-[#4FB3E8] text-white px-4 py-2 rounded-md"
      >
        Add Bulk Fees
      </button>

      {/* Render the modal */}
      <BulkFeesModal 
        isOpen={isBulkFeesModalOpen}
        onClose={() => setIsBulkFeesModalOpen(false)}
      />
    </div>
  );
}
