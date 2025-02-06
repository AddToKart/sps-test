'use client';

import type { Student } from '@/types/student';

interface StudentStatsProps {
  students: Student[];
}

export default function StudentStats({ students }: StudentStatsProps) {
  const totalStudents = students.length;
  
  // Active students
  const activeStudents = students.filter(student => student.status === 'active').length;

  // Helper function to check balance status
  const checkBalanceStatus = (student: Student) => {
    // Ensure balances exist and is an array
    if (!Array.isArray(student.balances)) {
      console.log(`${student.name} has no balances array`);
      return { hasPending: false, isFullyPaid: false };
    }

    // If no balances, consider as having pending balance
    if (student.balances.length === 0) {
      console.log(`${student.name} has empty balances array`);
      return { hasPending: true, isFullyPaid: false };
    }

    let hasPendingBalance = false;
    let allBalancesPaid = true;

    // Check each balance
    student.balances.forEach(balance => {
      if (!balance.status || balance.status === 'pending') {
        hasPendingBalance = true;
        allBalancesPaid = false;
      }
    });

    console.log(`Balance status for ${student.name}:`, {
      balances: student.balances,
      hasPendingBalance,
      allBalancesPaid,
      balanceDetails: student.balances.map(b => ({
        amount: b.amount,
        status: b.status || 'pending'
      }))
    });

    return {
      hasPending: hasPendingBalance,
      isFullyPaid: allBalancesPaid && student.balances.length > 0
    };
  };

  // Students with pending balance
  const withBalance = students.filter(student => {
    const status = checkBalanceStatus(student);
    return status.hasPending;
  }).length;

  // Fully paid students
  const fullyPaid = students.filter(student => {
    const status = checkBalanceStatus(student);
    return status.isFullyPaid;
  }).length;

  // Debug log
  console.log('Overall Stats:', {
    totalStudents,
    activeStudents,
    withBalance,
    fullyPaid,
    studentDetails: students.map(s => ({
      name: s.name,
      ...checkBalanceStatus(s),
      balances: s.balances
    }))
  });

  const stats = [
    {
      name: 'Total Students',
      value: totalStudents,
      icon: (
        <svg className="w-6 h-6 text-[#4FB3E8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: 'Active Students',
      value: activeStudents,
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'With Balance',
      value: withBalance,
      icon: (
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
        </svg>
      ),
    },
    {
      name: 'Fully Paid',
      value: fullyPaid,
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="bg-[#4FB3E8]/10 rounded-full p-3">
              {stat.icon}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-2xl font-bold text-[#002147]">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 