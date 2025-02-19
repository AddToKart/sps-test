'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import PageTransition from '@/components/animations/PageTransition';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { BellIcon } from '@heroicons/react/24/outline';
import NotificationsInbox from '@/components/student/NotificationsInbox';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!user.email?.endsWith('@icons.com')) {
      router.push('/login');
      return;
    }

    // Listen for unread notifications using student's email
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('studentEmail', '==', user.email),
      where('status', '==', 'unread')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      // Only update if user is still logged in
      if (user) {
        setUnreadCount(snapshot.docs.length);
      }
    });

    return () => {
      // Cleanup listener on unmount or when user logs out
      unsubscribe();
      setUnreadCount(0);
      setShowNotifications(false);
    };
  }, [user, router]);

  const handleLogout = async () => {
    try {
      setShowNotifications(false); // Hide notifications before logout
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Don't render anything while checking auth
  if (!user) {
    return null;
  }

  const navigation = [
    {
      name: 'Overview',
      href: '/student/dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Payments',
      href: '/student/payments',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2-1.343-2-3-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
        </svg>
      ),
    },
    {
      name: 'Support Tickets',
      href: '/student/support',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
    },
    {
      name: 'Profile',
      href: '/student/profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const isActivePath = (path: string) => {
    if (path === '/student/dashboard') {
      return pathname === '/student/dashboard';
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-[#002147] text-white">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 bg-[#001a38]">
            <span className="text-xl font-bold">E-Paycons Student</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActivePath(item.href)
                    ? 'bg-[#4FB3E8] text-white'
                    : 'text-gray-300 hover:bg-[#4FB3E8]/80 hover:text-white'
                  }`}
              >
                <span className={`${isActivePath(item.href) ? 'text-white' : 'text-gray-300'}`}>
                  {item.icon}
                </span>
                <span className="ml-3">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Info */}
          <div className="p-4 border-t border-[#001a38]">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.email}</p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-gray-300 hover:text-white"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 pl-64">
        {/* Header with notifications */}
        <div className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Student Dashboard</h2>
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-100 rounded-full relative"
            >
              <BellIcon className="h-6 w-6 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifications && user?.email && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-50">
                <div className="max-h-[80vh] overflow-y-auto">
                  <NotificationsInbox studentId={user.email} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main content area */}
        <main className="p-8">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
} 