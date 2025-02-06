'use client';

import ReportCard from '@/components/admin/ReportCard';
import { useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

export default function Reports() {
  const [generating, setGenerating] = useState(false);

  const generateReport = async (type: string) => {
    setGenerating(true);
    try {
      switch (type) {
        case 'collection':
          await generateCollectionReport();
          break;
        case 'student':
          await generateStudentReport();
          break;
        case 'payment':
          await generatePaymentReport();
          break;
        default:
          console.error('Unknown report type');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report');
    } finally {
      setGenerating(false);
    }
  };

  const generateCollectionReport = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const studentsRef = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsRef);
    
    let totalCollections = 0;
    let monthlyCollections = 0;
    
    for (const studentDoc of studentsSnapshot.docs) {
      const balancesRef = collection(db, `students/${studentDoc.id}/balances`);
      const balancesSnapshot = await getDocs(balancesRef);
      
      balancesSnapshot.docs.forEach(doc => {
        const balance = doc.data();
        if (balance.status === 'paid') {
          totalCollections += balance.amount || 0;
          
          const paymentDate = balance.paidAt?.toDate();
          if (paymentDate >= startOfMonth) {
            monthlyCollections += balance.amount || 0;
          }
        }
      });
    }
    
    // Here you can generate PDF or Excel report
    console.log('Collection Report:', { totalCollections, monthlyCollections });
  };

  const generateStudentReport = async () => {
    // Implement student report generation
    console.log('Generating student report...');
  };

  const generatePaymentReport = async () => {
    // Implement payment report generation
    console.log('Generating payment report...');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportCard
          title="Collection Summary"
          description="Generate collection summary report"
          onClick={() => generateReport('collection')}
        />
        
        <ReportCard
          title="Student Report"
          description="Generate student payment status report"
          onClick={() => generateReport('student')}
        />
        
        <ReportCard
          title="Payment Analysis"
          description="Generate payment method analysis report"
          onClick={() => generateReport('payment')}
        />
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