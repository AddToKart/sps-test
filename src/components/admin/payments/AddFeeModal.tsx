'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

interface AddFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddFeeModal({ isOpen, onClose }: AddFeeModalProps) {
  const [formData, setFormData] = useState({
    studentId: '',
    feeType: 'tuition',
    amount: '',
    dueDate: '',
    description: '',
    isRecurring: false,
    frequency: 'monthly'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const balanceRef = collection(db, `students/${formData.studentId}/balances`);
      await addDoc(balanceRef, {
        type: formData.feeType,
        amount: parseFloat(formData.amount),
        dueDate: new Date(formData.dueDate),
        description: formData.description,
        status: 'pending',
        createdAt: new Date(),
        isRecurring: formData.isRecurring,
        frequency: formData.frequency
      });

      onClose();
      setFormData({
        studentId: '',
        feeType: 'tuition',
        amount: '',
        dueDate: '',
        description: '',
        isRecurring: false,
        frequency: 'monthly'
      });
    } catch (error) {
      console.error('Error adding fee:', error);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Modal implementation */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <Dialog.Title className="text-lg font-medium mb-4">Add New Fee</Dialog.Title>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Student ID</label>
                <input
                  type="text"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                  required
                />
              </div>
              
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

              {/* Additional form fields */}
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
                  Add Fee
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
} 