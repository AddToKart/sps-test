'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StudentTable from '@/components/admin/students/StudentTable';
import StudentFilters from '@/components/admin/students/StudentFilters';
import StudentStats from '@/components/admin/students/StudentStats';
import AddStudentModal from '@/components/admin/students/AddStudentModal';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, getDocs } from 'firebase/firestore';
import type { Student } from '@/types/student';
import { fixStudentData } from '@/utils/fixStudentData';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    section: '',
    strand: '',
    grade: '',
    status: 'all' // all, active, inactive
  });

  useEffect(() => {
    const studentsQuery = query(collection(db, 'students'));
    const unsubscribe = onSnapshot(studentsQuery, async (snapshot) => {
      const studentsWithBalances = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const studentData = doc.data();
          // Fetch balances from subcollection
          const balancesSnapshot = await getDocs(collection(db, `students/${doc.id}/balances`));
          const balances = balancesSnapshot.docs.map(balanceDoc => ({
            id: balanceDoc.id,
            ...balanceDoc.data()
          }));
          
          return {
            id: doc.id,
            ...studentData,
            balances: balances
          };
        })
      );
      
      setStudents(studentsWithBalances);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
                         student.email?.toLowerCase().includes(filters.search.toLowerCase());
    const matchesSection = !filters.section || student.section === filters.section;
    const matchesStrand = !filters.strand || student.strand === filters.strand;
    const matchesGrade = !filters.grade || student.grade === filters.grade;
    const matchesStatus = filters.status === 'all' || student.status === filters.status;

    return matchesSearch && matchesSection && matchesStrand && matchesGrade && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Students Management</h1>
        <div className="flex space-x-3">
          <button
            onClick={async () => {
              try {
                await fixStudentData();
                alert('Student data fixed successfully');
              } catch (error) {
                console.error('Error fixing student data:', error);
                alert('Error fixing student data');
              }
            }}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            Fix Student Data
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 transition-colors"
          >
            Add New Student
          </button>
        </div>
      </div>

      <StudentStats students={students} />
      <StudentFilters filters={filters} setFilters={setFilters} students={students} />
      <StudentTable students={filteredStudents} loading={loading} />
      
      <AddStudentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  );
} 