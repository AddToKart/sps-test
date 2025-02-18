'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const navItemVariants = {
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      ease: "easeInOut"
    }
  }
};

const logoVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.5
    }
  }
};

const navContainerVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1
    }
  }
};

const NavHighlight = ({ pathname }: { pathname: string }) => {
  const activeIndex = navigation.findIndex(item => item.href === pathname);
  
  return (
    <motion.div
      className="absolute h-8 rounded-md bg-[#4FB3E8] z-0"
      initial={false}
      animate={{
        x: `calc(${activeIndex * 100}% + ${activeIndex * 0.25}rem)`,
        width: '100%',
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30
      }}
      style={{
        width: 'calc(100% / 6)',
      }}
    />
  );
};

export default function AdminNavbar() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navigation = [
    {
      name: 'Overview',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Students',
      href: '/admin/students',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: 'Payments',
      href: '/admin/payments',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Reports',
      href: '/admin/reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Audit Logs',
      href: '/admin/audit-logs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Support',
      href: '/admin/support',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bg-[#002147] text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <motion.div 
            className="flex items-center"
            variants={logoVariants}
            initial="initial"
            animate="animate"
          >
            <img src="/logo.png" alt="E-Paycons Logo" className="h-8 w-8" />
            <span className="ml-2 text-lg font-semibold hidden md:block">
              E-Paycons
              <span className="text-xs ml-2 text-gray-300">Admin Portal</span>
            </span>
          </motion.div>

          <motion.div 
            className="hidden md:flex items-center space-x-1 relative"
            variants={navContainerVariants}
            initial="initial"
            animate="animate"
          >
            <NavHighlight pathname={pathname} />
            
            {navigation.map((item) => (
              <motion.div
                key={item.name}
                variants={navItemVariants}
                whileHover="hover"
                className="relative z-10"
              >
                <Link
                  href={item.href}
                  className={`
                    px-3 py-2 rounded-md text-sm flex items-center space-x-2
                    ${pathname === item.href 
                      ? 'text-white' 
                      : 'text-gray-300 hover:text-white'}
                    relative z-10 transition-colors duration-200
                  `}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <div className="flex items-center">
            <div className="hidden md:block mr-4">
              <div className="text-right">
                <p className="text-sm text-gray-300">Administrator</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="bg-red-600 text-white px-3 py-1.5 text-sm rounded hover:bg-red-700 transition-colors"
            >
              Logout
            </button>

            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="md:hidden ml-4 p-2 rounded-md hover:bg-[#4FB3E8]/80 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d={isDropdownOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-[#002147] border-t border-[#4FB3E8]/20 overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <motion.div
                  key={item.name}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setIsDropdownOpen(false)}
                    className={`
                      block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-3
                      ${pathname === item.href 
                        ? 'bg-[#4FB3E8] text-white' 
                        : 'text-gray-300 hover:bg-[#4FB3E8]/80 hover:text-white'}
                    `}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                </motion.div>
              ))}
              <div className="px-3 py-2 text-sm text-gray-400">
                Signed in as: {user?.email}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
} 