'use client';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, onSnapshot, addDoc, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Student } from '@/types/student';
import { getFunctions, httpsCallable } from 'firebase/functions';
import BulkFeeModal from '@/components/admin/BulkFeeModal';
import ReportModal from '@/components/admin/ReportModal';

const COLORS = {
  navy: '#002147',
  lightBlue: '#4FB3E8',
  gold: '#C5A572',
  white: '#FFFFFF',
  lightGray: '#F3F4F6',
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStrand, setSelectedStrand] = useState('');
  const [showBulkFeeModal, setShowBulkFeeModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [paymentStats, setPaymentStats] = useState({
    totalCollections: 0,
    pendingPayments: 0,
    completedPayments: 0,
    collectionRate: 0,
    monthlyCollections: 0,
    averagePaymentAmount: 0,
    topPaymentMethods: [],
    paymentTrends: [],
  });

  const cleanupDuplicates = async () => {
    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST'
      });
      const data = await response.json();
      console.log('Cleanup result:', data);
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
    }
  };

  useEffect(() => {
    if (!user || !user.email?.endsWith('@admin.com')) {
      router.push('/login');
      return;
    }

    const fetchStudents = async () => {
      try {
        const studentsQuery = query(collection(db, 'students'));
        const unsubscribe = onSnapshot(studentsQuery, async (snapshot) => {
          const uniqueStudents = new Map();
          
          // Process each student and their payment status
          await Promise.all(snapshot.docs.map(async (doc) => {
            const data = doc.data();
            if (!uniqueStudents.has(data.email)) {
              const paymentStatus = await getStudentPaymentStatus(doc.id);
              uniqueStudents.set(data.email, {
                id: doc.id,
                ...data,
                paymentStatus // Add payment status to student data
              });
            }
          }));

          setStudents(Array.from(uniqueStudents.values()));
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching students:', error);
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user, router]);

  useEffect(() => {
    const calculateStats = async () => {
      try {
        let total = 0;
        let pending = 0;
        let completed = 0;
        let monthlyTotal = 0;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        for (const student of students) {
          const balancesSnapshot = await getDocs(collection(db, `students/${student.id}/balances`));
          
          balancesSnapshot.forEach(doc => {
            const balance = doc.data();
            const balanceDate = balance.paidAt?.toDate() || balance.createdAt?.toDate();
            
            if (balance.status === 'paid') {
              completed++;
              total += balance.amount || 0;
              
              // Check if payment was made this month
              if (balanceDate >= startOfMonth) {
                monthlyTotal += balance.amount || 0;
              }
            } else if (balance.status === 'pending') {
              pending++;
            }
          });
        }

        const rate = completed > 0 ? Math.round((completed / (pending + completed)) * 100) : 0;
        const avgAmount = completed > 0 ? Math.round(total / completed) : 0;

        setPaymentStats({
          totalCollections: total,
          pendingPayments: pending,
          completedPayments: completed,
          collectionRate: rate,
          monthlyCollections: monthlyTotal,
          averagePaymentAmount: avgAmount,
          topPaymentMethods: [], // You can implement this if needed
          paymentTrends: [], // You can implement this if needed
        });
      } catch (error) {
        console.error('Error calculating stats:', error);
      }
    };

    if (students.length > 0) {
      calculateStats();
    }
  }, [students]);

  const { totalCollections, pendingPayments, completedPayments, collectionRate } = paymentStats;

  // Get unique sections and strands for filters
  const sections = [...new Set(students.map(s => s.section))].sort();
  const strands = [...new Set(students.map(s => s.strand))].sort();

  // Filter students based on search and filters
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSection = !selectedSection || student.section === selectedSection;
    const matchesStrand = !selectedStrand || student.strand === selectedStrand;
    return matchesSearch && matchesSection && matchesStrand;
  });

  const QuickActions = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => router.push('/admin/students/new')}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
        >
          <div className="flex flex-col space-y-4">
            <div className="w-12 h-12 bg-[#4FB3E8]/10 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-[#4FB3E8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Add Student</h3>
              <p className="text-gray-500 text-sm mt-1">Add a new student to the system</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowBulkFeeModal(true)}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
        >
          <div className="flex flex-col space-y-4">
            <div className="w-12 h-12 bg-[#4FB3E8]/10 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-[#4FB3E8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Add Bulk Fees</h3>
              <p className="text-gray-500 text-sm mt-1">Add fees to multiple students</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setShowReportModal(true)}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
        >
          <div className="flex flex-col space-y-4">
            <div className="w-12 h-12 bg-[#4FB3E8]/10 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-[#4FB3E8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Generate Report</h3>
              <p className="text-gray-500 text-sm mt-1">Generate various reports</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push('/admin/settings')}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-left"
        >
          <div className="flex flex-col space-y-4">
            <div className="w-12 h-12 bg-[#4FB3E8]/10 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-[#4FB3E8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Settings</h3>
              <p className="text-gray-500 text-sm mt-1">Configure system settings</p>
            </div>
          </div>
        </button>
      </div>
    );
  };

  const PaymentTrendsChart = () => (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium mb-4">Payment Trends</h3>
      {/* Add line chart here */}
    </div>
  );

  // Add a function to check student payment status
  const getStudentPaymentStatus = async (studentId: string) => {
    try {
      const balancesSnapshot = await getDocs(collection(db, `students/${studentId}/balances`));
      let hasUnpaidBalance = false;
      let hasPaidBalance = false;

      balancesSnapshot.forEach(doc => {
        const balance = doc.data();
        if (balance.status === 'pending') {
          hasUnpaidBalance = true;
        } else if (balance.status === 'paid') {
          hasPaidBalance = true;
        }
      });

      return {
        fullyPaid: !hasUnpaidBalance && hasPaidBalance,
        hasBalance: hasUnpaidBalance,
        hasPaidSome: hasPaidBalance
      };
    } catch (error) {
      console.error('Error checking student payment status:', error);
      return { fullyPaid: false, hasBalance: false, hasPaidSome: false };
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
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-[#4FB3E8] rounded-full p-3">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500">Total Collections</h2>
              <p className="text-2xl font-bold text-[#002147]">₱{totalCollections.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-[#4FB3E8] rounded-full p-3">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500">Pending Payments</h2>
              <p className="text-2xl font-bold text-[#002147]">{pendingPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-[#4FB3E8] rounded-full p-3">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500">Completed Payments</h2>
              <p className="text-2xl font-bold text-[#002147]">{completedPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-[#4FB3E8] rounded-full p-3">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-gray-500">Collection Rate</h2>
              <p className="text-2xl font-bold text-[#002147]">{collectionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
            />
          </div>
          <div className="flex space-x-4">
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
            >
              <option value="">All Sections</option>
              {sections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
            <select
              value={selectedStrand}
              onChange={(e) => setSelectedStrand(e.target.value)}
              className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
            >
              <option value="">All Strands</option>
              {strands.map(strand => (
                <option key={strand} value={strand}>{strand}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Students Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Students List</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Section</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.section}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.strand}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{student.grade}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => router.push(`/admin/students/${student.id}`)}
                      className="text-[#4FB3E8] hover:text-[#3a8cbf] font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Trends Chart */}
      <PaymentTrendsChart />

      {/* Modals */}
      <BulkFeeModal
        isOpen={showBulkFeeModal}
        onClose={() => setShowBulkFeeModal(false)}
        students={students}
        selectedSection={selectedSection}
        selectedStrand={selectedStrand}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        students={students}
      />
    </>
  );
} 