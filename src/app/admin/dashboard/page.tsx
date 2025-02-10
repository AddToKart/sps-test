'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import MigrateDataButton from '@/components/admin/MigrateDataButton';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalPayments: 0,
    pendingPayments: 0
  });

  // ... keep your existing dashboard logic ...

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Existing dashboard content */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Your existing stats cards */}
        </div>

        {/* Migration Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Database Migration</h2>
          <p className="text-gray-600 mb-4">
            Use this button to migrate student balances to the new database structure. 
            This should only be done once.
          </p>
          <MigrateDataButton />
        </div>

        {/* Rest of your dashboard content */}
      </div>
    </div>
  );
} 