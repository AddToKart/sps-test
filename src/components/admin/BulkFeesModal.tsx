'use client';

import { useState } from 'react';

interface BulkFeesModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function BulkFeesModal({ isOpen, onClose }: BulkFeesModalProps) {
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

  const handleAddFees = async () => {
    try {
      // Your fee adding logic here
      onClose();
    } catch (error) {
      console.error('Error adding fees:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Add Bulk Fees</h3>
        
        {/* Fee Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
          <select
            value={formData.feeType}
            onChange={(e) => setFormData(prev => ({ ...prev, feeType: e.target.value }))}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
            required
          >
            <option value="">Select Fee Type</option>
            {FEE_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
            placeholder="Enter amount"
            required
            min="0"
          />
        </div>

        {/* Due Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
            required
          />
        </div>

        {/* Description (Optional) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-gray-400">(Optional)</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
            placeholder="Enter description (optional)"
            rows={3}
          />
        </div>

        {/* Grade Level */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
          <select
            value={formData.yearLevel}
            onChange={(e) => setFormData(prev => ({ ...prev, yearLevel: e.target.value }))}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
          >
            <option value="All">All Grades</option>
            {GRADES.map(grade => (
              <option key={grade} value={grade}>Grade {grade}</option>
            ))}
          </select>
        </div>

        {/* Strand */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Strand</label>
          <select
            value={formData.strand}
            onChange={(e) => setFormData(prev => ({ ...prev, strand: e.target.value }))}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
          >
            <option value="All">All Strands</option>
            {STRANDS.map(strand => (
              <option key={strand} value={strand}>{strand}</option>
            ))}
          </select>
        </div>

        {/* Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
          <select
            value={formData.section}
            onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
          >
            <option value="All">All Sections</option>
            {SECTIONS.map(section => (
              <option key={section} value={section}>Section {section}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleAddFees}
            className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 transition-colors"
          >
            Add Fees
          </button>
        </div>
      </div>
    </div>
  );
} 