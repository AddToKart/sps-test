'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import StudentSidebar from '@/components/student/Sidebar';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!user || !user.email?.endsWith('@icons.com')) {
      router.push('/login');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <StudentSidebar onCollapse={setIsSidebarCollapsed} />
      <main 
        className={`
          transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'pl-20' : 'pl-64'}
        `}
      >
        {children}
      </main>
      <Toaster position="top-right" />
    </div>
  );
} 