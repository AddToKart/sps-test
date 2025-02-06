'use client';

import type { Student } from '@/types/student';

interface StudentFiltersProps {
  filters: {
    search: string;
    section: string;
    strand: string;
    grade: string;
    status: string;
  };
  setFilters: (filters: any) => void;
  students: Student[];
}

export default function StudentFilters({ filters, setFilters, students }: StudentFiltersProps) {
  // Get unique values for dropdowns
  const sections = [...new Set(students.map(s => s.section))].filter(Boolean).sort();
  const strands = [...new Set(students.map(s => s.strand))].filter(Boolean).sort();
  const grades = [...new Set(students.map(s => s.grade))].filter(Boolean).sort();

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="col-span-2">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
          />
        </div>
        
        <select
          value={filters.section}
          onChange={(e) => setFilters({ ...filters, section: e.target.value })}
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
        >
          <option value="">All Sections</option>
          {sections.map(section => (
            <option key={section} value={section}>{section}</option>
          ))}
        </select>

        <select
          value={filters.strand}
          onChange={(e) => setFilters({ ...filters, strand: e.target.value })}
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
        >
          <option value="">All Strands</option>
          {strands.map(strand => (
            <option key={strand} value={strand}>{strand}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
} 