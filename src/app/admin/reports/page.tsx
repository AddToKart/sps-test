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
import { utils, writeFile } from 'xlsx';
import toast from 'react-hot-toast';
import { ReportService } from '@/services/ReportService';

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
  totalCollections: number;
  completedPayments: number;
  pendingPayments: number;
  successRate: number;
}

export default function Reports() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportType, setReportType] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState([]);

  const [stats, setStats] = useState({
    totalCollections: 0,
    completedPayments: 0,
    pendingPayments: 0
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
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const paymentsRef = collection(db, 'payments');
      const snapshot = await getDocs(paymentsRef);
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const completed = payments.filter(p => p.status === 'completed');
      const totalAmount = completed.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      setStats({
        totalCollections: totalAmount,
        completedPayments: completed.length,
        pendingPayments: payments.length - completed.length
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch statistics');
    }
  };

  const generateReport = async (type: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setLoading(true);
    try {
      const today = new Date();
      let startDate = new Date();
      const endDate = new Date();

      switch (type) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate.setDate(today.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(today.getMonth() - 1);
          break;
        case 'yearly':
          startDate.setFullYear(today.getFullYear() - 1);
          break;
      }

      await ReportService.generatePaymentReport(startDate, endDate, type);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report generated successfully`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
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
            <h1 className="text-2xl font-bold text-gray-900">Collection Reports</h1>
            <p className="text-gray-600">Generate and download collection reports</p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Collections</h3>
            <p className="text-2xl font-bold">₱{stats.totalCollections.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Completed Payments</h3>
            <p className="text-2xl font-bold">{stats.completedPayments}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Pending Payments</h3>
            <p className="text-2xl font-bold">{stats.pendingPayments}</p>
          </div>
        </div>

        {/* Report Generation */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Generate Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={() => generateReport('daily')}
              disabled={loading}
              className="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg"
            >
              <h3 className="font-medium">Daily Report</h3>
              <p className="text-sm text-gray-500">Today's collection summary</p>
            </button>
            <button
              onClick={() => generateReport('weekly')}
              disabled={loading}
              className="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg"
            >
              <h3 className="font-medium">Weekly Report</h3>
              <p className="text-sm text-gray-500">Last 7 days collection</p>
            </button>
            <button
              onClick={() => generateReport('monthly')}
              disabled={loading}
              className="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg"
            >
              <h3 className="font-medium">Monthly Report</h3>
              <p className="text-sm text-gray-500">Last 30 days collection</p>
            </button>
            <button
              onClick={() => generateReport('yearly')}
              disabled={loading}
              className="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-lg"
            >
              <h3 className="font-medium">Yearly Report</h3>
              <p className="text-sm text-gray-500">This year's collection</p>
            </button>
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