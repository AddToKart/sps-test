'use client';

import { useState } from 'react';

interface PaymentFiltersProps {
  filters?: {
    dateRange?: string;
    startDate?: Date | null;
    endDate?: Date | null;
    status?: string;
    paymentMethod?: string;
    search?: string;
  };
  setFilters?: (filters: any) => void;
}

export default function PaymentFilters({ filters = {}, setFilters = () => {} }: PaymentFiltersProps) {
  // Initialize with default values to prevent undefined errors
  const defaultFilters = {
    dateRange: 'all',
    startDate: null,
    endDate: null,
    status: 'all',
    paymentMethod: 'all',
    search: ''
  };
  
  // Merge provided filters with defaults
  const mergedFilters = { ...defaultFilters, ...filters };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name or reference..."
            value={mergedFilters.search || ''}
            onChange={(e) => setFilters({ ...mergedFilters, search: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
          />
          <svg
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <select
          value={mergedFilters.dateRange || 'all'}
          onChange={(e) => setFilters({ ...mergedFilters, dateRange: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Range</option>
        </select>
        
        <select
          value={mergedFilters.status || 'all'}
          onChange={(e) => setFilters({ ...mergedFilters, status: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        
        <select
          value={mergedFilters.paymentMethod || 'all'}
          onChange={(e) => setFilters({ ...mergedFilters, paymentMethod: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
        >
          <option value="all">All Methods</option>
          <option value="gcash">GCash</option>
          <option value="maya">Maya</option>
          <option value="bank">Bank Transfer</option>
          <option value="cash">Cash</option>
        </select>
      </div>

      {mergedFilters.dateRange === 'custom' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Date</label>
            <input
              type="date"
              value={mergedFilters.startDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => setFilters({ ...mergedFilters, startDate: new Date(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Date</label>
            <input
              type="date"
              value={mergedFilters.endDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => setFilters({ ...mergedFilters, endDate: new Date(e.target.value) })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
            />
          </div>
        </div>
      )}
    </div>
  );
} 