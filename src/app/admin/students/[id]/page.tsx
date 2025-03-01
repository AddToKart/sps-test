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
import { updatePassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { toast as hotToast } from 'react-hot-toast';
import { ActivityService } from '@/services/ActivityService';
import Link from 'next/link';

const FEE_TYPES = [
  'Tuition Fee',
  'Laboratory Fee',
  'Miscellaneous Fee',
  'Books and Modules',
  'School Events',
  'Other Fees'
];

const PRE_DEFINED_FEES = {
  'Tuition Fee': 15000,
  'Laboratory Fee': 5000,
  'Miscellaneous Fee': 3500,
  'Books and Modules': 4500,
  'School Events': 2000,
  'Uniform Fee': 3000,
  'Technology Fee': 2500,
  'Development Fee': 1800,
  'ID and Card Fee': 500
};

export default function StudentDetails() {
  const { user } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBalance, setNewBalance] = useState({
    type: '',
    amount: 0,
    dueDate: '',
    customType: ''
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<Balance | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedStudent, setEditedStudent] = useState<any>({});
  const [newPassword, setNewPassword] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
          setEditedStudent(data);
        } else {
          console.log('No student found');
          hotToast.error('Student not found');
          router.push('/admin/students');
        }
      } catch (error) {
        console.error('Error fetching student:', error);
        hotToast.error('Error loading student data');
      } finally {
        setLoading(false);
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
      // Create a balance with the complete structure needed for payments
      const balanceData: any = {
        studentId: student.id,
        studentName: student.fullName || '',
        studentEmail: student.email || '',
        type: newBalance.type === 'Other' ? newBalance.customType : newBalance.type,
        amount: Number(newBalance.amount),
        status: 'pending',
        createdAt: Timestamp.now(),
        dateAdded: Timestamp.now(),
        description: newBalance.type === 'Other' ? newBalance.customType : newBalance.type
      };

      if (newBalance.dueDate) {
        balanceData.dueDate = Timestamp.fromDate(new Date(newBalance.dueDate));
      }

      await addDoc(collection(db, 'balances'), balanceData);

      await ActivityService.logActivity({
        type: 'balance',
        action: 'balance_added',
        description: `Added ${balanceData.type} balance of ₱${newBalance.amount} to ${student.fullName}`,
        userId: user?.uid || 'unknown',
        userType: 'admin',
        metadata: {
          studentId: student.id,
          studentName: student.fullName,
          balanceType: balanceData.type,
          amount: newBalance.amount
        }
      });

      setNewBalance({ 
        type: '', 
        amount: 0,
        dueDate: '',
        customType: ''
      });
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
        : new Date().toISOString().split('T')[0],
      customType: balance.type
    };
    setSelectedBalance(balanceToEdit);
    setIsEditModalOpen(true);
  };

  const handleEdit = () => {
    setEditedStudent({...student});
    setIsEditModalOpen(true);
  };
  
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedStudent(student);
    setNewPassword('');
  };
  
  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      
      // Update student document
      const studentRef = doc(db, 'students', params.id as string);
      
      // Remove fields we don't want to update
      const { id, uid, createdAt, password, ...updateData } = editedStudent;
      
      // Add updatedAt timestamp
      const dataToUpdate = {
        ...updateData,
        updatedAt: new Date()
      };
      
      await updateDoc(studentRef, dataToUpdate);
      
      // Update password if provided
      if (newPassword && student?.email && student?.uid) {
        try {
          // For security reasons, password changes should ideally be handled server-side
          // This is a simplified client-side approach
          hotToast.success('Student info updated. Note: Password changes require additional security measures.');
          console.log('Password change requested for:', student.email);
          
          // Log the activity without the password
          await ActivityService.logActivity({
            type: 'student',
            action: 'password_change_requested',
            description: `Password change requested for student ${student.fullName}`,
            userId: user?.uid || 'unknown',
            userType: 'admin'
          });
        } catch (passwordError) {
          console.error('Error updating password:', passwordError);
          hotToast.error('Failed to update password');
        }
      }
      
      // Log the activity
      await ActivityService.logActivity({
        type: 'student',
        action: 'student_updated',
        description: `Updated student ${student?.fullName}`,
        userId: user?.uid || 'unknown',
        userType: 'admin',
        metadata: {
          studentId: student?.id,
          studentName: student?.fullName
        }
      });
      
      hotToast.success('Student information updated successfully');
      
      // Refresh student data
      const updatedStudentDoc = await getDoc(doc(db, 'students', params.id as string));
      if (updatedStudentDoc.exists()) {
        setStudent({
          id: updatedStudentDoc.id,
          ...updatedStudentDoc.data()
        } as Student);
      }
      
      setIsEditModalOpen(false);
      setIsEditing(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error updating student:', error);
      hotToast.error('Failed to update student information');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = () => {
    setIsDeleteModalOpen(true);
  };
  
  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
  };

  const confirmDelete = async () => {
    try {
      setLoading(true);
      
      // Delete student document
      await deleteDoc(doc(db, 'students', params.id as string));
      
      // Log the activity
      await ActivityService.logActivity({
        type: 'student',
        action: 'student_deleted',
        description: `Deleted student ${student?.fullName}`,
        userId: user?.uid || 'unknown',
        userType: 'admin',
        metadata: {
          studentId: student?.id,
          studentName: student?.fullName
        }
      });
      
      hotToast.success('Student deleted successfully');
      setIsDeleteModalOpen(false);
      router.push('/admin/students');
    } catch (error) {
      console.error('Error deleting student:', error);
      hotToast.error('Failed to delete student');
    } finally {
      setLoading(false);
      setIsDeleting(false);
    }
  };

  const handlePreDefinedFeeSelect = (feeType: string) => {
    setNewBalance({
      ...newBalance,
      type: feeType,
      amount: PRE_DEFINED_FEES[feeType],
      customType: ''
    });
  };

  const handleSaveBalanceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBalance) return;
    
    try {
      const balanceRef = doc(db, 'balances', selectedBalance.id);
      
      // Prepare the update data
      const updateData: any = {
        type: selectedBalance.type in PRE_DEFINED_FEES ? selectedBalance.type : selectedBalance.customType || selectedBalance.type,
        amount: selectedBalance.amount,
        status: selectedBalance.status,
      };
      
      // Only include dueDate if it exists
      if (selectedBalance.dueDateString) {
        updateData.dueDate = Timestamp.fromDate(new Date(selectedBalance.dueDateString));
      }
      
      await updateDoc(balanceRef, updateData);
      
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mb-6">
              {!isEditing && !isDeleting && (
                <>
                  <button
                    onClick={handleEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Edit Student
                  </button>
                  <button
                    onClick={handleDeleteStudent}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Delete Student
                  </button>
                </>
              )}
              
              {isEditing && (
                <>
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 ${
                      loading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Cancel
                  </button>
                </>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-medium mb-4">Add New Balance</h3>
              <form onSubmit={handleAddBalance} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Balance Type
                    </label>
                    <div className="relative">
                      <select
                        value={newBalance.type}
                        onChange={(e) => {
                          const selectedType = e.target.value;
                          if (PRE_DEFINED_FEES[selectedType]) {
                            handlePreDefinedFeeSelect(selectedType);
                          } else {
                            setNewBalance({...newBalance, type: selectedType});
                          }
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select Fee Type</option>
                        {Object.keys(PRE_DEFINED_FEES).map((feeType) => (
                          <option key={feeType} value={feeType}>
                            {feeType} (₱{PRE_DEFINED_FEES[feeType].toLocaleString()})
                          </option>
                        ))}
                        <option value="Other">Other (Custom)</option>
                      </select>
                    </div>
                  </div>
                  
                  {newBalance.type === 'Other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Fee Name
                      </label>
                      <input
                        type="text"
                        value={newBalance.customType}
                        onChange={(e) => setNewBalance({...newBalance, customType: e.target.value})}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required={newBalance.type === 'Other'}
                        placeholder="Enter fee name"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₱)
                    </label>
                    <input
                      type="number"
                      value={newBalance.amount}
                      onChange={(e) => setNewBalance({...newBalance, amount: Number(e.target.value)})}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={newBalance.dueDate}
                      onChange={(e) => setNewBalance({...newBalance, dueDate: e.target.value})}
                      min={new Date().toISOString().split('T')[0]} // Prevents selecting past dates
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Add Balance
                  </button>
                </div>
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
              <Dialog.Title className="text-xl font-semibold mb-4">
                Edit Balance
              </Dialog.Title>
              
              <form onSubmit={handleSaveBalanceEdit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fee Type
                    </label>
                    <div className="relative">
                      <select
                        value={selectedBalance.type in PRE_DEFINED_FEES ? selectedBalance.type : 'Other'}
                        onChange={(e) => {
                          const selectedType = e.target.value;
                          if (selectedType === 'Other') {
                            setSelectedBalance({
                              ...selectedBalance,
                              type: selectedBalance.customType || 'Other'
                            });
                          } else {
                            setSelectedBalance({
                              ...selectedBalance,
                              type: selectedType,
                              amount: PRE_DEFINED_FEES[selectedType]
                            });
                          }
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      >
                        {Object.keys(PRE_DEFINED_FEES).map((feeType) => (
                          <option key={feeType} value={feeType}>
                            {feeType} (₱{PRE_DEFINED_FEES[feeType].toLocaleString()})
                          </option>
                        ))}
                        <option value="Other">Other (Custom)</option>
                      </select>
                    </div>
                  </div>
                  
                  {(!(selectedBalance.type in PRE_DEFINED_FEES) || selectedBalance.type === 'Other') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Fee Name
                      </label>
                      <input
                        type="text"
                        value={selectedBalance.customType || selectedBalance.type}
                        onChange={(e) => setSelectedBalance({
                          ...selectedBalance,
                          type: e.target.value,
                          customType: e.target.value
                        })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        placeholder="Enter fee name"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₱)
                    </label>
                    <input
                      type="number"
                      value={selectedBalance.amount}
                      onChange={(e) => setSelectedBalance({
                        ...selectedBalance,
                        amount: Number(e.target.value)
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Due Date (Optional)
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
                      min={new Date().toISOString().split('T')[0]} // Prevents selecting past dates
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={selectedBalance.status}
                      onChange={(e) => setSelectedBalance({
                        ...selectedBalance,
                        status: e.target.value
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {isEditing && (
        <div className="mt-8">
          <Link href="/admin/students" className="text-blue-600 hover:underline">
            ← Back to Students
          </Link>
        </div>
      )}

      {isDeleteModalOpen && (
        <Dialog 
          open={isDeleteModalOpen} 
          onClose={() => setIsDeleteModalOpen(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg p-6 max-w-md w-full">
              <Dialog.Title className="text-xl font-semibold text-red-600 mb-4">
                Confirm Student Deletion
              </Dialog.Title>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete <span className="font-semibold">{student?.fullName}</span>?
                </p>
                <p className="text-sm text-gray-500 bg-red-50 p-3 rounded-lg">
                  This action cannot be undone. All student data including balances and payment history will be permanently removed.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={loading}
                  className={`px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Deleting...' : 'Yes, Delete Student'}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </div>
  );
} 