'use client';

import { useState } from 'react';
import type { Student } from '@/types/student';

interface BulkFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  selectedSection: string;
  selectedStrand: string;
}

export default function BulkFeeModal({ isOpen, onClose, students, selectedSection, selectedStrand }: BulkFeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [feeData, setFeeData] = useState({
    type: '',
    amount: '',
    description: '',
    dueDate: '',
    filter: 'all' // all, section, strand
  });

  // Add validation helpers
  const validateFeeData = (data: typeof feeData) => {
    const errors: string[] = [];
    
    if (!data.type.trim()) {
      errors.push('Fee type is required');
    }

    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!data.description.trim()) {
      errors.push('Description is required');
    }

    if (!data.dueDate) {
      errors.push('Due date is required');
    } else {
      const dueDate = new Date(data.dueDate);
      const today = new Date();
      if (dueDate < today) {
        errors.push('Due date cannot be in the past');
      }
    }

    return errors;
  };

  // Update handleSubmit with validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form data
      const validationErrors = validateFeeData(feeData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }

      // Filter students based on selection
      let selectedStudents = students;
      if (feeData.filter === 'section' && selectedSection) {
        selectedStudents = students.filter(s => s.section === selectedSection);
      } else if (feeData.filter === 'strand' && selectedStrand) {
        selectedStudents = students.filter(s => s.strand === selectedStrand);
      }

      // Validate we have students to process
      if (selectedStudents.length === 0) {
        throw new Error('No students selected for fee application');
      }

      const response = await fetch('/api/fees/bulk-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          students: selectedStudents.map(s => s.id),
          fee: {
            type: feeData.type.trim(),
            amount: parseFloat(feeData.amount),
            description: feeData.description.trim(),
            dueDate: new Date(feeData.dueDate).toISOString(),
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add fees');
      }

      setSuccess(`Successfully added fees to ${data.count} students`);
      setTimeout(() => {
        onClose();
        setFeeData({
          type: '',
          amount: '',
          description: '',
          dueDate: '',
          filter: 'all'
        });
      }, 2000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Bulk Fees</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Apply to</label>
              <select
                value={feeData.filter}
                onChange={(e) => setFeeData({ ...feeData, filter: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
              >
                <option value="all">All Students</option>
                <option value="section">Selected Section</option>
                <option value="strand">Selected Strand</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fee Type</label>
              <input
                type="text"
                required
                value={feeData.type}
                onChange={(e) => setFeeData({ ...feeData, type: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
                placeholder="e.g., Tuition Fee"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Amount (₱)</label>
              <input
                type="number"
                required
                value={feeData.amount}
                onChange={(e) => setFeeData({ ...feeData, amount: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                required
                value={feeData.description}
                onChange={(e) => setFeeData({ ...feeData, description: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
                rows={3}
                placeholder="Fee description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                required
                value={feeData.dueDate}
                onChange={(e) => setFeeData({ ...feeData, dueDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Fees'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 