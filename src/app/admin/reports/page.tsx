'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import ReportCard from '@/components/admin/ReportCard';
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
import { motion } from 'framer-motion';
import { FadeIn } from '@/components/animations/FadeIn';

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

const cardVariants = {
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2
    }
  }
};

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'collection' | 'student' | 'payment' | 'custom';
}

const reportTypes: ReportType[] = [
  {
    id: 'collection-summary',
    title: 'Collection Summary',
    description: 'Generate comprehensive collection reports with detailed breakdowns',
    type: 'collection',
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
      </svg>
    )
  },
  {
    id: 'student-report',
    title: 'Student Payment Report',
    description: 'View detailed payment history and status for each student',
    type: 'student',
    icon: (
      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  {
    id: 'payment-analysis',
    title: 'Payment Analysis',
    description: 'Analyze payment trends, methods, and success rates',
    type: 'payment',
    icon: (
      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  }
];

interface CollectionReport {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: Date;
  endDate: Date;
  filters: {
    paymentMethod?: string[];
    status?: string[];
    strand?: string[];
    grade?: string[];
  };
}

interface ReportStats {
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  successRate: number;
  topPaymentMethod: string;
  mostActiveDay: string;
}

export default function Reports() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportType, setReportType] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState([]);

  // Combined reportStats state
  const [reportStats, setReportStats] = useState({
    // Report generation stats
    totalReports: 0,
    pendingReports: 0,
    completedReports: 0,
    monthlyReports: 0,
    // Collection report stats
    totalAmount: 0,
    transactionCount: 0,
    averageAmount: 0,
    successRate: 0,
    topPaymentMethod: '',
    mostActiveDay: ''
  });

  const [stats, setStats] = useState({
    totalCollections: 0,
    completedPayments: 0,
    pendingPayments: 0,
    successRate: 0
  });

  // Add collection report states
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [reportConfig, setReportConfig] = useState<CollectionReport>({
    type: 'monthly',
    startDate: new Date(),
    endDate: new Date(),
    filters: {}
  });

  useEffect(() => {
    if (!user || !user.email?.endsWith('@admin.com')) {
      router.push('/login');
      return;
    }

    // Fetch reports data here
    const fetchReports = async () => {
      setLoading(false);
    };

    fetchReports();
  }, [user, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const studentsRef = collection(db, 'students');
        const studentsSnapshot = await getDocs(studentsRef);
        
        let totalCollections = 0;
        let completedPayments = 0;
        let pendingPayments = 0;

        await Promise.all(studentsSnapshot.docs.map(async (studentDoc) => {
          const balancesRef = collection(db, `students/${studentDoc.id}/balances`);
          const balancesSnapshot = await getDocs(balancesRef);
          
          balancesSnapshot.docs.forEach(doc => {
            const balance = doc.data();
            if (balance.status === 'paid') {
              completedPayments++;
              totalCollections += balance.amount || 0;
            } else if (balance.status === 'pending') {
              pendingPayments++;
            }
          });
        }));

        const successRate = completedPayments > 0 
          ? ((completedPayments / (completedPayments + pendingPayments)) * 100)
          : 0;

        setStats({
          totalCollections,
          completedPayments,
          pendingPayments,
          successRate
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const generateReport = async (type: string) => {
    setGenerating(true);
    try {
      // Add your report generation logic here
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated delay
      // You can implement the actual report generation logic based on the type
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
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
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Header with Quick Actions */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600">Generate and analyze comprehensive reports</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCollectionModal(true)}
              className="px-4 py-2 bg-[#002147] text-white rounded-lg hover:bg-[#002147]/90 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Report
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-50">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm text-green-500">+12.5%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">₱{stats.totalCollections.toLocaleString()}</h3>
            <p className="text-sm text-gray-600">Total Collections</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-50">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-green-500">+5.2%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.completedPayments}</h3>
            <p className="text-sm text-gray-600">Completed Payments</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-yellow-50">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-red-500">+2.3%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</h3>
            <p className="text-sm text-gray-600">Pending Payments</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-50">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.successRate.toFixed(1)}%</h3>
            <p className="text-sm text-gray-600">Success Rate</p>
          </div>
        </div>

        {/* Report Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Collection Summary</h3>
              <div className="p-2 bg-blue-50 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">Generate detailed collection reports with payment breakdowns</p>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                Daily Report
              </button>
              <button className="w-full px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                Weekly Report
              </button>
              <button className="w-full px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                Monthly Report
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Payment Analytics</h3>
              <div className="p-2 bg-purple-50 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">Analyze payment trends and patterns</p>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">
                Payment Methods
              </button>
              <button className="w-full px-4 py-2 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">
                Success Rates
              </button>
              <button className="w-full px-4 py-2 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">
                Trend Analysis
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Student Reports</h3>
              <div className="p-2 bg-green-50 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-6">Generate student-specific payment reports</p>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                Payment History
              </button>
              <button className="w-full px-4 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                Outstanding Balances
              </button>
              <button className="w-full px-4 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100">
                Payment Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Recent Reports Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
              <div className="flex gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg
                    className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Add your report rows here */}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Collection Report Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Generate Collection Report</h2>
            {/* Add report configuration form */}
          </div>
        </div>
      )}
    </div>
  );
} 