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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <input type="hidden" name="remember" value="true" />
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleQuickLogin('admin')}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Quick Admin Login
          </button>
          <button
            onClick={() => handleQuickLogin('student')}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Quick Student Login
          </button>
        </div>
      </div>
    </div>
  );
} 