'use client';

import React, { useState } from 'react';
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Attempting login with:', email.trim());
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const userEmail = userCredential.user.email?.toLowerCase();
      
      console.log('Login successful, user email:', userEmail);

      if (userEmail?.endsWith('@admin.com')) {
        console.log('Redirecting to admin dashboard');
        router.push('/admin');
      } else if (userEmail?.endsWith('@icons.com')) {
        console.log('Redirecting to student dashboard');
        router.push('/student/dashboard');
      } else {
        console.log('Invalid email domain:', userEmail);
        throw new Error('Invalid user type');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (type: 'admin' | 'student') => {
    setError(null);
    setLoading(true);

    const credentials = {
      admin: {
        email: 'kurt@admin.com',
        password: 'kurt123'
      },
      student: {
        email: 'kategarciaborbe@icons.com',
        password: 'kate123'
      }
    };

    try {
      const { email, password } = credentials[type];
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userEmail = userCredential.user.email?.toLowerCase();

      if (userEmail?.endsWith('@admin.com')) {
        router.push('/admin');
      } else if (userEmail?.endsWith('@student.com') || userEmail?.endsWith('@icons.com')) {
        router.push('/student/dashboard');
      } else {
        throw new Error('Invalid user type');
      }
    } catch (error: any) {
      console.error('Quick login error:', error);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createAdminAccount = async () => {
    try {
      await createUserWithEmailAndPassword(auth, 'admin@admin.com', 'your-secure-password');
      console.log('Admin account created');
    } catch (error: any) {
      console.error('Error creating admin:', error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001a38] to-[#002147] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">E-Paycons</h1>
          <p className="text-gray-300">School Payment Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4FB3E8] focus:border-transparent transition-colors"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4FB3E8] focus:border-transparent transition-colors"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#002147] text-white py-2 px-4 rounded-lg hover:bg-[#002147]/90 transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Quick Login Buttons */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Quick access</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickLogin('admin')}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
              >
                Quick Admin Login
              </button>
              <button
                onClick={() => handleQuickLogin('student')}
                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Quick Student Login
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-300">
            © 2024 E-Paycons. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
} 