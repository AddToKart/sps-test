'use client';

import { useAuth } from '@/contexts/AuthContext';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc, collection, addDoc, deleteDoc, onSnapshot, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Student, Balance } from '@/types/student';
import { updateStudentPaymentStatus } from '@/utils/updateStudentPaymentStatus';
import Toast from '@/components/ui/Toast';
import { format } from 'date-fns';
import { Dialog } from '@headlessui/react';
import { Timestamp } from 'firebase/firestore';

const FEE_TYPES = [
  'Tuition Fee',
  'Laboratory Fee',
  'Miscellaneous Fee',
  'Books and Modules',
  'School Events',
  'Other Fees'
];

export default function StudentDetails() {
  const { user } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBalance, setNewBalance] = useState({
    type: '',
    amount: 0
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<Balance | null>(null);

  const params = useParams();
  
  console.log('Params:', params);

  useEffect(() => {
    if (!user || !user.email?.endsWith('@admin.com')) {
      router.push('/login');
      return;
    }

    const fetchStudent = async () => {
      try {
        console.log('Fetching student with ID:', params.id);
        const studentDoc = await getDoc(doc(db, 'students', params.id));

        if (studentDoc.exists()) {
          const data = studentDoc.data();
          console.log('Found student:', data);
          setStudent({
            id: studentDoc.id,
            ...data
          } as Student);
        } else {
          console.log('No student found');
        }
      } catch (error) {
        console.error('Error fetching student:', error);
      }
    };

    const unsubscribeBalances = onSnapshot(
      query(collection(db, 'balances'), where('studentId', '==', params.id)),
      (snapshot) => {
        const balancesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Balance[];
        setBalances(balancesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching balances:', error);
        setLoading(false);
      }
    );

    fetchStudent();
    return () => unsubscribeBalances();
  }, [params.id, user, router]);

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    try {
      await addDoc(collection(db, 'balances'), {
        studentId: student.id,
        type: newBalance.type,
        amount: Number(newBalance.amount),
        status: 'pending',
        createdAt: new Date()
      });

      setNewBalance({ type: '', amount: 0 });
      setToast({ message: 'Balance added successfully!', type: 'success' });
    } catch (error) {
      console.error('Error adding balance:', error);
      setToast({ message: 'Failed to add balance', type: 'error' });
    }
  };

  const handleDeleteBalance = async (balanceId: string) => {
    if (!confirm('Are you sure you want to delete this balance?')) return;
    
    try {
      await deleteDoc(doc(db, 'balances', balanceId));
      setToast({
        message: 'Balance deleted successfully',
        type: 'success'
      });
    } catch (error) {
      console.error('Error deleting balance:', error);
      setToast({
        message: 'Failed to delete balance',
        type: 'error'
      });
    }
  };

  const handleEditBalance = async (balance: Balance) => {
    const balanceToEdit = {
      ...balance,
      dueDate: balance.dueDate || Timestamp.now(),
      dueDateString: balance.dueDate 
        ? balance.dueDate.toDate().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
    };
    setSelectedBalance(balanceToEdit);
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Student Not Found</h2>
          <p className="text-gray-600 mt-2">Unable to find student information.</p>
        </div>
      </div>
    );
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
                        Due Date
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
                          {balance.dueDate?.toDate 
                            ? format(balance.dueDate.toDate(), 'MMM dd, yyyy')
                            : 'No due date'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {balance.dateAdded?.toDate 
                            ? format(balance.dateAdded.toDate(), 'MMM dd, yyyy')
                            : format(balance.createdAt.toDate(), 'MMM dd, yyyy')
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap space-x-2">
                          <button
                            onClick={() => handleEditBalance(balance)}
                            className="text-blue-600 hover:text-blue-900 mr-2"
                          >
                            Edit
                          </button>
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {isEditModalOpen && selectedBalance && (
        <Dialog 
          open={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 max-w-md w-full">
              <Dialog.Title className="text-lg font-medium mb-4">
                Edit Balance
              </Dialog.Title>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await updateDoc(doc(db, 'balances', selectedBalance.id), {
                    type: selectedBalance.type,
                    amount: parseFloat(selectedBalance.amount.toString()),
                    dueDate: selectedBalance.dueDate,
                    status: selectedBalance.status,
                    ...(selectedBalance.description && { description: selectedBalance.description })
                  });
                  
                  setToast({
                    message: 'Balance updated successfully',
                    type: 'success'
                  });
                  setIsEditModalOpen(false);
                } catch (error) {
                  console.error('Error updating balance:', error);
                  setToast({
                    message: 'Failed to update balance',
                    type: 'error'
                  });
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Fee Type
                    </label>
                    <select
                      value={selectedBalance.type}
                      onChange={(e) => setSelectedBalance({
                        ...selectedBalance,
                        type: e.target.value
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {FEE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={selectedBalance.amount}
                      onChange={(e) => setSelectedBalance({
                        ...selectedBalance,
                        amount: parseFloat(e.target.value)
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={selectedBalance.dueDateString}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        setSelectedBalance({
                          ...selectedBalance,
                          dueDate: Timestamp.fromDate(newDate),
                          dueDateString: e.target.value
                        });
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      value={selectedBalance.status}
                      onChange={(e) => setSelectedBalance({
                        ...selectedBalance,
                        status: e.target.value as 'pending' | 'paid'
                      })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </div>
  );
} 