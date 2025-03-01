'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, addDoc, serverTimestamp } from 'firebase/firestore';
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
import toast from 'react-hot-toast';
import RecentActivity from '@/components/admin/RecentActivity';
import { ActivityService } from '@/services/ActivityService';
import { formatDistanceToNow } from 'date-fns';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

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

// Update the QuickAction component to accept and use loading state
const QuickAction = ({ icon, label, onClick, color = "blue", isLoading = false }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className={`flex items-center p-3 rounded-lg bg-${color}-50 hover:bg-${color}-100 transition-colors w-full`}
  >
    <div className={`p-2 rounded-lg bg-${color}-100 mr-3`}>
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-t-transparent border-${color}-600 rounded-full animate-spin"></div>
      ) : (
        icon
      )}
    </div>
    <span className="text-sm font-medium text-gray-700">
      {isLoading ? 'Processing...' : label}
    </span>
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
  // Add loading states for the quick action buttons
  const [actionLoading, setActionLoading] = useState({
    recordPayment: false,
    generateReport: false, 
    sendReminders: false
  });

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
  const [activities, setActivities] = useState<Activity[]>([]);

  // Add this new state at the top with your other states
  const [yearlyCollection, setYearlyCollection] = useState(0);

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
          ? (completedPayments / (completedPayments + pendingPayments)) * 100
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

        // Calculate yearly collection
        const startOfYear = new Date(new Date().getFullYear(), 0, 1); // January 1st of current year
        const yearlyCollection = balancesData
          .filter(balance => 
            balance.status === 'paid' && 
            balance.paidAt?.toDate() >= startOfYear
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
          collectionRate: parseFloat(collectionRate.toFixed(2))
        });

        setStudents(studentsData);
        setTodayCollection(todayCollection);
        setWeeklyCollection(weeklyCollection);
        setMonthlyCollection(monthlyCollection);
        setYearlyCollection(yearlyCollection);

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

        // Set up activities subscription
        console.log('Setting up activities subscription');
        const unsubscribeActivities = ActivityService.subscribeToActivities((newActivities) => {
          console.log('Received new activities:', newActivities);
          setActivities(newActivities);
        }, 4); // Limit to 4 activities

        setLoading(false);
        
        // Clean up subscription when component unmounts
        return () => {
          console.log('Cleaning up activities subscription');
          unsubscribeActivities();
        };

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

  // Add handlers for the quick action buttons
  const handleRecordPayment = () => {
    setActionLoading(prev => ({ ...prev, recordPayment: true }));
    try {
      router.push('/admin/students');
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Failed to navigate to students page');
    } finally {
      setActionLoading(prev => ({ ...prev, recordPayment: false }));
    }
  };

  const handleGenerateReport = () => {
    setActionLoading(prev => ({ ...prev, generateReport: true }));
    try {
      router.push('/admin/reports');
    } catch (error) {
      console.error('Navigation error:', error);
      toast.error('Failed to navigate to reports page');
    } finally {
      setActionLoading(prev => ({ ...prev, generateReport: false }));
    }
  };

  const handleSendReminders = async () => {
    try {
      setActionLoading(prev => ({ ...prev, sendReminders: true }));
      
      // Get students with pending balances
      const balancesRef = collection(db, 'balances');
      const pendingBalancesQuery = query(balancesRef, where('status', '==', 'pending'));
      const pendingBalancesSnapshot = await getDocs(pendingBalancesQuery);
      
      // Group by student
      const studentBalances = new Map();
      pendingBalancesSnapshot.docs.forEach(doc => {
        const balance = { ...doc.data(), id: doc.id };
        if (!studentBalances.has(balance.studentId)) {
          studentBalances.set(balance.studentId, []);
        }
        studentBalances.get(balance.studentId).push(balance);
      });

      // Send reminders
      const studentsNotified = studentBalances.size;
      
      if (studentsNotified > 0) {
        // Use ActivityService to log the activity instead of direct addDoc
        await ActivityService.logActivity({
          type: 'notification',
          action: 'payment_reminder',
          description: `Payment reminders sent to ${studentsNotified} students`,
          userId: user?.uid || 'unknown',
          userType: 'admin',
          metadata: {
            studentsCount: studentsNotified,
            totalBalances: pendingBalancesSnapshot.size,
            timestamp: new Date().toISOString(),
            totalAmount: Array.from(studentBalances.values())
              .flat()
              .reduce((sum, balance) => sum + (balance.amount || 0), 0)
          }
        });

        toast.success(`Reminders sent to ${studentsNotified} students`);
      } else {
        toast.info('No pending balances to send reminders for');
      }

    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('Failed to send reminders');
    } finally {
      setActionLoading(prev => ({ ...prev, sendReminders: false }));
    }
  };

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
        </div>
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
            <div className="flex items-center">
              <h2 className="text-3xl font-bold">
                {stats.collectionRate.toFixed(2)}%
              </h2>
              <span className={`ml-2 text-sm font-medium ${
                stats.collectionRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span className="flex items-center">
                  {stats.collectionRate >= 0 ? (
                    <ArrowUpIcon className="w-4 h-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4 mr-1" />
                  )}
                  {Math.abs(stats.collectionRate).toFixed(1)}%
                </span>
              </span>
            </div>
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
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-full ${
                  activity.type === 'payment' ? 'bg-green-100 text-green-600' :
                  activity.type === 'balance' ? 'bg-yellow-100 text-yellow-600' :
                  activity.type === 'student' ? 'bg-blue-100 text-blue-600' :
                  activity.type === 'notification' ? 'bg-purple-100 text-purple-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {activity.type === 'payment' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
                    </svg>
                  ) : activity.type === 'balance' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : activity.type === 'student' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(activity.createdAt.toDate(), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
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
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Year</span>
              <span className="font-medium">₱{yearlyCollection.toLocaleString()}</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>{/* Your payment trends chart */}</div>
      </div>
    </div>
  );
}

