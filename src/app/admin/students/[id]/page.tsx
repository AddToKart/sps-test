'use client';

import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, collection, addDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Student, Balance } from '@/types/student';

export default function StudentManagement() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBalance, setNewBalance] = useState({
    type: '',
    amount: 0
  });

  useEffect(() => {
    if (!user || !user.email?.endsWith('@admin.com')) {
      router.push('/login');
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const fetchStudentAndBalances = async () => {
      try {
        if (!params.id) return;
        
        const studentDoc = await getDoc(doc(db, 'students', params.id as string));
        if (studentDoc.exists()) {
          setStudent({ 
            id: studentDoc.id, 
            ...studentDoc.data()
          } as Student);

          const balancesQuery = query(collection(db, `students/${params.id}/balances`));
          unsubscribe = onSnapshot(balancesQuery, (snapshot) => {
            const balancesList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate()
            })) as Balance[];
            setBalances(balancesList);
          });
        }
      } catch (error) {
        console.error('Error fetching student:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentAndBalances();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [params.id, user, router]);

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    try {
      await addDoc(collection(db, `students/${student.id}/balances`), {
        type: newBalance.type,
        amount: Number(newBalance.amount),
        status: 'pending',
        createdAt: new Date()
      });

      setNewBalance({ type: '', amount: 0 });
    } catch (error) {
      console.error('Error adding balance:', error);
    }
  };

  const handleDeleteBalance = async (balanceId: string) => {
    if (!student) return;

    try {
      await deleteDoc(doc(db, `students/${student.id}/balances/${balanceId}`));
    } catch (error) {
      console.error('Error deleting balance:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!student) {
    return <div>Student not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
              <h1 className="text-xl font-bold">Student Management</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">{student.name}</h2>
              <p className="text-gray-600">{student.email}</p>
              <div className="mt-2">
                <span className="mr-4">Section: {student.section}</span>
                <span className="mr-4">Strand: {student.strand}</span>
                <span>Grade: {student.grade}</span>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Balance</h3>
              <form onSubmit={handleAddBalance} className="flex gap-4">
                <input
                  type="text"
                  placeholder="Balance Type (e.g., Tuition, Uniform)"
                  value={newBalance.type}
                  onChange={(e) => setNewBalance(prev => ({ ...prev, type: e.target.value }))}
                  className="flex-1 px-4 py-2 border rounded-md"
                  required
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={newBalance.amount}
                  onChange={(e) => setNewBalance(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="w-32 px-4 py-2 border rounded-md"
                  required
                  min="0"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add Balance
                </button>
              </form>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Current Balances</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Added
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {balances.map((balance) => (
                      <tr key={balance.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{balance.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap">₱{balance.amount}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            balance.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {balance.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {balance.createdAt instanceof Date 
                            ? balance.createdAt.toLocaleDateString() 
                            : new Date(balance.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteBalance(balance.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 