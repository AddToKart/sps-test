'use client';

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

// Define report types
const reportTypes = [
  {
    title: "Collection Summary",
    description: "Generate collection summary report",
    onClick: () => generateReport('collection'),
    icon: (
      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    title: "Student Report",
    description: "Generate student payment status report",
    onClick: () => generateReport('student'),
    icon: (
      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
  {
    title: "Payment Analysis",
    description: "Generate payment method analysis report",
    onClick: () => generateReport('payment'),
    icon: (
      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  }
];

export default function Reports() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportType, setReportType] = useState('all');
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState([]);

  // Stats state similar to dashboard
  const [reportStats, setReportStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    completedReports: 0,
    monthlyReports: 0
  });

  const [stats, setStats] = useState({
    totalCollections: 0,
    completedPayments: 0,
    pendingPayments: 0,
    successRate: 0
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
    <div className="space-y-6">
      <motion.h1 
        className="text-2xl font-bold"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Reports
      </motion.h1>

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Map through stats with FadeIn */}
        {Object.entries(stats).map(([key, value], index) => (
          <FadeIn key={key} delay={index * 0.1}>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Collections</p>
                  <p className="text-2xl font-bold text-[#002147]">₱{value.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>

      {/* Charts and Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          className="bg-white p-6 rounded-lg shadow md:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Payment Trends Chart */}
        </motion.div>

        <motion.div 
          className="bg-white p-6 rounded-lg shadow"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Payment Methods Chart */}
        </motion.div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {reportTypes.map((report, index) => (
          <motion.div
            key={report.title}
            variants={cardVariants}
            whileHover="hover"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <ReportCard {...report} />
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
            />
          </div>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
          >
            <option value="all">All Reports</option>
            <option value="collection">Collection Reports</option>
            <option value="student">Student Reports</option>
            <option value="payment">Payment Reports</option>
          </select>
          <button
            onClick={() => generateReport('collection')}
            className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90"
          >
            Generate New Report
          </button>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* Add report rows here */}
          </tbody>
        </table>
      </div>

      {generating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4FB3E8] mx-auto"></div>
            <p className="mt-2 text-center">Generating Report...</p>
          </div>
        </div>
      )}
    </div>
  );
} 