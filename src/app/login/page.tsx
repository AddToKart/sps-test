'use client';

import React, { useState } from 'react';
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const validateDomain = (email: string) => {
    if (email.endsWith('@student.com')) {
      return 'student';
    } else if (email.endsWith('@admin.com')) {
      return 'admin';
    }
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const userType = validateDomain(email);
    if (!userType) {
      setError('Invalid email domain. Please use @student.com or @admin.com');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        router.push(userType === 'admin' ? '/admin' : '/student/dashboard');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  // Quick access login handlers
  const handleQuickAdminLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, "kurt@admin.com", "kurt123");
      if (userCredential.user) {
        router.push('/admin');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleQuickStudentLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, "kate@student.com", "kate123");
      if (userCredential.user) {
        router.push('/student/dashboard');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Student Payment System
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address (@student.com or @admin.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
        </form>

        {/* Quick Access Buttons */}
        <div className="mt-4 space-y-2">
          <p className="text-center text-sm text-gray-600">Quick Access (Temporary)</p>
          <div className="flex space-x-4">
            <button
              onClick={handleQuickAdminLogin}
              className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Admin Login
            </button>
            <button
              onClick={handleQuickStudentLogin}
              className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Student Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 