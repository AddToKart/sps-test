'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, addDoc, query, where, Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface BulkFeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const GRADES = ['11', '12'];
const STRANDS = ['ABM', 'HUMSS', 'ICT', 'STEM'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const FEE_TYPES = [
  'Tuition Fee',
  'Laboratory Fee',
  'Miscellaneous Fee',
  'Books and Modules',
  'School Events',
  'Other Fees'
];

export default function BulkFeesModal({ isOpen, onClose, onSuccess }: BulkFeesModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    feeType: '',
    amount: '',
    dueDate: '',
    description: '',
    yearLevel: 'All',
    strand: 'All',
    section: 'All'
  });

  if (!isOpen) return null;

  const handleAddFees = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      if (!formData.feeType || !formData.amount || !formData.dueDate) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Convert date string to Timestamp
      const dueDate = new Date(formData.dueDate);
      if (isNaN(dueDate.getTime())) {
        toast.error('Invalid due date');
        return;
      }

      // Get students based on filters
      let studentsQuery = query(collection(db, 'students'));
      
      // Apply filters
      if (formData.yearLevel !== 'All') {
        studentsQuery = query(studentsQuery, where('grade', '==', formData.yearLevel));
      }
      if (formData.strand !== 'All') {
        studentsQuery = query(studentsQuery, where('strand', '==', formData.strand));
      }
      if (formData.section !== 'All') {
        studentsQuery = query(studentsQuery, where('section', '==', formData.section));
      }

      const studentsSnapshot = await getDocs(studentsQuery);
      
      if (studentsSnapshot.empty) {
        toast.error('No students found matching the selected criteria');
        return;
      }

      let successCount = 0;
      
      // Add fee to each student
      for (const studentDoc of studentsSnapshot.docs) {
        const studentData = studentDoc.data();
        try {
          await addDoc(collection(db, 'balances'), {
            studentId: studentDoc.id,
            studentName: studentData.fullName,
            studentEmail: studentData.email,
            type: formData.feeType,
            amount: parseFloat(formData.amount),
            dueDate: Timestamp.fromDate(dueDate),
            description: formData.description.trim(),
            status: 'pending',
            createdAt: Timestamp.now(),
            dateAdded: Timestamp.now()
          });
          successCount++;
        } catch (error) {
          console.error(`Error adding fee to student ${studentDoc.id}:`, error);
        }
      }

      // Show success message
      if (successCount > 0) {
        toast.success(`Successfully added fees to ${successCount} students`);
        // Reset form
        setFormData({
          feeType: '',
          amount: '',
          dueDate: '',
          description: '',
          yearLevel: 'All',
          strand: 'All',
          section: 'All'
        });
        onSuccess?.();
        onClose();
      } else {
        toast.error('Failed to add fees to any students');
      }

    } catch (error) {
      console.error('Error adding bulk fees:', error);
      toast.error('Failed to add fees. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg p-6 max-w-md w-full">
          <Dialog.Title className="text-lg font-medium mb-4">Add Bulk Fees</Dialog.Title>
          
          <form onSubmit={handleAddFees}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Fee Type</label>
                <select
                  value={formData.feeType}
                  onChange={(e) => setFormData({ ...formData, feeType: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Fee Type</option>
                  {FEE_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Grade Level</label>
                <select
                  value={formData.yearLevel}
                  onChange={(e) => setFormData({ ...formData, yearLevel: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="All">All Grades</option>
                  {GRADES.map(grade => (
                    <option key={grade} value={grade}>Grade {grade}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Strand</label>
                <select
                  value={formData.strand}
                  onChange={(e) => setFormData({ ...formData, strand: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="All">All Strands</option>
                  {STRANDS.map(strand => (
                    <option key={strand} value={strand}>{strand}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Section</label>
                <select
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="All">All Sections</option>
                  {SECTIONS.map(section => (
                    <option key={section} value={section}>Section {section}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 transition-colors"
              >
                {loading ? 'Adding...' : 'Add Fees'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 