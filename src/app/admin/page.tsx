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
import { useRouter } from 'next/navigation';

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

// Add this new component at the top of the file
const QuickAction = ({ icon, label, onClick, color = "blue" }) => (
  <button
    onClick={onClick}
    className={`flex items-center p-3 rounded-lg bg-${color}-50 hover:bg-${color}-100 transition-colors w-full`}
  >
    <div className={`p-2 rounded-lg bg-${color}-100 mr-3`}>
      {icon}
    </div>
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </button>
);

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
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

  // Add new states for notifications and time
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'payment', message: 'New payment received from John Doe', time: '5m ago' },
    { id: 2, type: 'balance', message: 'Outstanding balance reminder sent to 15 students', time: '1h ago' },
    { id: 3, type: 'system', message: 'System maintenance scheduled for tonight', time: '2h ago' },
  ]);

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

  // Add time update effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#002147]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Enhanced Header Section */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <p className="text-gray-600">Welcome back, {user?.email?.split('@')[0]}</p>
          </div>
          
          {/* Notification Bell */}
          <div className="relative">
            <button className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50">
              <div className="relative">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  3
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <QuickAction
          icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>}
          label="Add New Student"
          onClick={() => router.push('/admin/students/add')}
          color="blue"
        />
        <QuickAction
          icon={<svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
          </svg>}
          label="Record Payment"
          onClick={() => {/* Add payment modal logic */}}
          color="green"
        />
        <QuickAction
          icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>}
          label="Generate Report"
          onClick={() => {/* Add report generation logic */}}
          color="purple"
        />
        <QuickAction
          icon={<svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>}
          label="Send Reminders"
          onClick={() => {/* Add reminder logic */}}
          color="yellow"
        />
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Students Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500">Total Students</span>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalStudents}</h3>
            <span className="text-sm text-green-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              +2.5%
            </span>
          </div>
        </div>

        {/* Active Students Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500">Active Students</span>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">{stats.activeStudents}</h3>
            <span className="text-sm text-green-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              +1.2%
            </span>
          </div>
        </div>

        {/* With Balance Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-50 p-3 rounded-lg">
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500">With Balance</span>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">{stats.withBalance}</h3>
            <span className="text-sm text-red-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              +0.8%
            </span>
          </div>
        </div>

        {/* Collection Rate Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-50 p-3 rounded-lg">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500">Collection Rate</span>
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">{stats.collectionRate}%</h3>
            <span className="text-sm text-green-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              +3.1%
            </span>
          </div>
        </div>
      </div>

      {/* Charts and Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Payment Trends Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Payment Trends</h2>
            <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Methods</h2>
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

        {/* New: Student Distribution Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Student Distribution</h2>
          <div className="space-y-4">
            {STRANDS.map(strand => (
              <div key={strand} className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                      {strand}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {/* Calculate percentage */}
                      {Math.round((students.filter(s => s.strand === strand).length / students.length) * 100)}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                  <div
                    style={{ width: `${(students.filter(s => s.strand === strand).length / students.length) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {notifications.map(notification => (
              <div key={notification.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-full ${
                  notification.type === 'payment' ? 'bg-green-100 text-green-600' :
                  notification.type === 'balance' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {notification.type === 'payment' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
                    ) : notification.type === 'balance' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{notification.message}</p>
                  <span className="text-xs text-gray-500">{notification.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Payments</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-4">Student</th>
                  <th className="pb-4">Amount</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="text-sm">
                    <td className="py-4">
                      <div>
                        <div className="font-medium text-gray-900">{payment.studentName}</div>
                        <div className="text-gray-500">{payment.studentId}</div>
                      </div>
                    </td>
                    <td className="py-4 font-medium">₱{payment.amount.toLocaleString()}</td>
                    <td className="py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        Completed
                      </span>
                    </td>
                    <td className="py-4 text-gray-500">
                      {payment.createdAt.toDate().toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Collection Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Collection Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Today's Collection</span>
              <span className="font-medium">₱{todayCollection.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Week</span>
              <span className="font-medium">₱{weeklyCollection.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Month</span>
              <span className="font-medium">₱{monthlyCollection.toLocaleString()}</span>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Total Collections</span>
                <span className="font-bold text-gray-900">₱{stats.totalCollections.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Status Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Status Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-4 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed Payments</p>
              <p className="text-xl font-bold text-gray-900">{stats.completedPayments}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-yellow-100 p-4 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-xl font-bold text-gray-900">{stats.pendingPayments}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">Success Rate</p>
              <p className="text-xl font-bold text-gray-900">{Math.round(stats.collectionRate)}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

