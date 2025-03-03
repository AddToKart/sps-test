'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface BulkFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkFeeModal({ isOpen, onClose }: BulkFeeModalProps) {
  const [formData, setFormData] = useState({
    feeType: 'tuition',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    description: '',
    yearLevel: 'all',
    program: 'all'
  });

  const [dateError, setDateError] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = today.toISOString().split('T')[0];

  const validateDate = (dateString: string): boolean => {
    const selectedDate = new Date(dateString);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const isValid = validateDate(newDate);
    
    if (!isValid) {
      setDateError(true);
      toast.error('Due date cannot be in the past');
      setFormData(prev => ({ ...prev, dueDate: minDate }));
      return;
    }
    
    setDateError(false);
    setFormData(prev => ({ ...prev, dueDate: newDate }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate date one more time before submission
    if (!validateDate(formData.dueDate)) {
      setDateError(true);
      toast.error('Due date cannot be in the past');
      return;
    }

    try {
      if (dateError) {
        toast.error('Please select a valid due date');
        return;
      }

      // Get all students based on filters
      const studentsRef = collection(db, 'students');
      const studentsSnapshot = await getDocs(studentsRef);
      
      // Add fee to each student
      const promises = studentsSnapshot.docs.map(async (studentDoc) => {
        const studentData = studentDoc.data();
        
        // Apply filters
        if (formData.yearLevel !== 'all' && studentData.yearLevel !== formData.yearLevel) return;
        if (formData.program !== 'all' && studentData.program !== formData.program) return;

        const balanceRef = collection(db, `students/${studentDoc.id}/balances`);
        await addDoc(balanceRef, {
          type: formData.feeType,
          amount: parseFloat(formData.amount),
          dueDate: new Date(formData.dueDate),
          description: formData.description,
          status: 'pending',
          createdAt: new Date()
        });
      });

      await Promise.all(promises);
      toast.success('Bulk fees added successfully');
      onClose();
      setFormData({
        feeType: 'tuition',
        amount: '',
        dueDate: new Date().toISOString().split('T')[0],
        description: '',
        yearLevel: 'all',
        program: 'all'
      });
    } catch (error) {
      console.error('Error adding bulk fees:', error);
      toast.error('Failed to add bulk fees');
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <Dialog.Title className="text-lg font-medium mb-4">Add Bulk Fees</Dialog.Title>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Fee Type</label>
                <select
                  value={formData.feeType}
                  onChange={(e) => setFormData({ ...formData, feeType: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                >
                  <option value="tuition">Tuition Fee</option>
                  <option value="miscellaneous">Miscellaneous Fee</option>
                  <option value="laboratory">Laboratory Fee</option>
                  <option value="other">Other Fee</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  min={minDate}
                  onChange={handleDateChange}
                  onKeyDown={(e) => e.preventDefault()} // Prevent manual input
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-[#4FB3E8] 
                    ${dateError 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'border-gray-300 focus:border-[#4FB3E8]'}`}
                  required
                />
                {dateError && (
                  <p className="mt-1 text-sm text-red-600">
                    Due date must be today or a future date
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Year Level</label>
                <select
                  value={formData.yearLevel}
                  onChange={(e) => setFormData({ ...formData, yearLevel: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                >
                  <option value="all">All Years</option>
                  <option value="1">First Year</option>
                  <option value="2">Second Year</option>
                  <option value="3">Third Year</option>
                  <option value="4">Fourth Year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Program</label>
                <select
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                >
                  <option value="all">All Programs</option>
                  <option value="bsit">BSIT</option>
                  <option value="bscs">BSCS</option>
                  {/* Add more programs as needed */}
                </select>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90"
                >
                  Add Fees
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
} 