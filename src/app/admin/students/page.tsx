'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface Student {
  id: string;
  studentId: string;
  fullName: string;
  email: string;
  grade: string;
  strand: string;
  section: string;
  status: 'active' | 'inactive';
  createdAt: any;
}

const STRANDS = ['STEM', 'ABM', 'HUMSS', 'ICT', 'GAS', 'HRTCO'];
const GRADES = ['11', '12'];

const STRAND_SECTIONS = {
  '11': {
    'STEM': ['St. Albert', 'St. Augustine', 'St. Thomas Aquinas'],
    'ABM': ['St. Matthew', 'St. Mark', 'St. Luke'],
    'HUMSS': ['St. Peter', 'St. Paul', 'St. John'],
    'ICT': ['St. Isidore', 'St. Benedict', 'St. Francis'],
    'GAS': ['St. Joseph', 'St. Michael', 'St. Gabriel'],
    'HRTCO': ['St. Martha', 'St. Catherine', 'St. Teresa']
  },
  '12': {
    'STEM': ['St. Dominic', 'St. Francis', 'St. Thomas More'],
    'ABM': ['St. Vincent', 'St. Anthony', 'St. Nicholas'],
    'HUMSS': ['St. Jerome', 'St. Augustine', 'St. Ambrose'],
    'ICT': ['St. Clare', 'St. Cecilia', 'St. Agnes'],
    'GAS': ['St. Christopher', 'St. Sebastian', 'St. George'],
    'HRTCO': ['St. Elizabeth', 'St. Rose', 'St. Anne']
  }
};

export default function StudentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    strand: 'All Strands',
    grade: 'All Grades',
    section: 'All Sections'
  });
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsRef = collection(db, 'students');
        const studentsSnap = await getDocs(studentsRef);
        const studentsData = studentsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Student));
        setStudents(studentsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching students:', error);
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    if (filters.strand === 'All Strands' || filters.grade === 'All Grades') {
      setAvailableSections([]);
      setFilters(prev => ({...prev, section: 'All Sections'}));
    } else {
      const sections = STRAND_SECTIONS[filters.grade]?.[filters.strand] || [];
      setAvailableSections(sections);
    }
  }, [filters.strand, filters.grade]);

  const handleStrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStrand = e.target.value;
    setFilters({
      ...filters,
      strand: newStrand,
      section: 'All Sections'
    });
  };

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newGrade = e.target.value;
    setFilters({
      ...filters,
      grade: newGrade,
      section: 'All Sections'
    });
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({
      ...filters,
      section: e.target.value
    });
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStrand = filters.strand === 'All Strands' ? true : student.strand === filters.strand;
    const matchesSection = filters.section === 'All Sections' ? true : student.section === filters.section;
    const matchesGrade = filters.grade === 'All Grades' ? true : student.grade === filters.grade;

    return matchesSearch && matchesStrand && matchesSection && matchesGrade;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#002147]"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600">Manage and view all students</p>
        </div>
        <button
          onClick={() => router.push('/admin/students/add')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add New Student
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="md:col-span-1">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <select
              value={filters.grade}
              onChange={handleGradeChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="All Grades">All Grades</option>
              {GRADES.map(grade => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              value={filters.strand}
              onChange={handleStrandChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="All Strands">All Strands</option>
              {STRANDS.map(strand => (
                <option key={strand} value={strand}>{strand}</option>
              ))}
            </select>
          </div>
          
          <div>
            <select
              value={filters.section}
              onChange={handleSectionChange}
              disabled={filters.strand === 'All Strands' || filters.grade === 'All Grades'}
              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                (filters.strand === 'All Strands' || filters.grade === 'All Grades') ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="All Sections">All Sections</option>
              {availableSections.map(section => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Strand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.studentId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.grade}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {student.strand}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.section}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      student.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {student.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => router.push(`/admin/students/${student.id}`)}
                      className="text-[#4FB3E8] hover:text-[#002147]"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 