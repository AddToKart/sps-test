'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

interface StudentInfo {
  fullName: string;
  email: string;
  studentId: string;
  gradeLevel: string;
  strand: string;
  section: string;
  contactNumber: string;
  address: string;
  enrollmentStatus: string;
  guardianName: string;
  guardianContact: string;
  guardianEmail: string;
  relationship: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<StudentInfo>>({});
  const [updating, setUpdating] = useState(false);
  const [studentDocId, setStudentDocId] = useState<string>('');

  useEffect(() => {
    if (!user?.email?.endsWith('@icons.com')) {
      router.push('/login');
      return;
    }

    const fetchStudentInfo = async () => {
      try {
        const studentsRef = collection(db, 'students');
        const studentQuery = query(studentsRef, where('email', '==', user.email));
        const studentSnapshot = await getDocs(studentQuery);
        
        if (!studentSnapshot.empty) {
          const studentData = studentSnapshot.docs[0].data() as StudentInfo;
          setStudentInfo(studentData);
          setStudentDocId(studentSnapshot.docs[0].id);
          setEditForm({
            contactNumber: studentData.contactNumber || '',
            address: studentData.address || '',
            guardianName: studentData.guardianName || '',
            guardianContact: studentData.guardianContact || '',
            guardianEmail: studentData.guardianEmail || '',
            relationship: studentData.relationship || '',
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching student info:', error);
        setLoading(false);
      }
    };

    fetchStudentInfo();
  }, [user, router]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const studentRef = doc(db, 'students', studentDocId);
      await updateDoc(studentRef, editForm);
      
      // Update local state
      setStudentInfo(prev => prev ? { ...prev, ...editForm } : null);
      setShowEditModal(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Profile Header */}
      <div className="bg-[#002147] text-white rounded-xl p-8 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full transform translate-x-32 -translate-y-32 opacity-10"></div>
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-[#002147] text-4xl font-bold">
              {studentInfo?.fullName?.[0]}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{studentInfo?.fullName}</h1>
              <p className="text-blue-200 flex items-center gap-2">
                <span>{studentInfo?.studentId}</span>
                <span className="w-1 h-1 bg-blue-200 rounded-full"></span>
                <span>{studentInfo?.gradeLevel} - {studentInfo?.strand}</span>
                <span className="w-1 h-1 bg-blue-200 rounded-full"></span>
                <span>{studentInfo?.section}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowEditModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <InfoField label="Full Name" value={studentInfo?.fullName} />
              <InfoField label="Email" value={studentInfo?.email} />
              <InfoField label="Contact Number" value={studentInfo?.contactNumber || 'Not provided'} />
              <InfoField label="Address" value={studentInfo?.address || 'Not provided'} />
            </div>
          </div>
        </div>

        {/* Academic Information Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0L3 9m9 5v7m9-12v7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Academic Information</h2>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <InfoField label="Student ID" value={studentInfo?.studentId} />
              <InfoField label="Grade Level" value={studentInfo?.gradeLevel} />
              <InfoField label="Strand" value={studentInfo?.strand} />
              <InfoField label="Section" value={studentInfo?.section} />
              <InfoField 
                label="Enrollment Status" 
                value={studentInfo?.enrollmentStatus} 
                customBadge={
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                }
              />
            </div>
          </div>
        </div>

        {/* Guardian Information Card */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Guardian Information</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoField label="Guardian Name" value={studentInfo?.guardianName || 'Not provided'} />
              <InfoField label="Relationship" value={studentInfo?.relationship || 'Not provided'} />
              <InfoField label="Guardian Contact" value={studentInfo?.guardianContact || 'Not provided'} />
              <InfoField label="Guardian Email" value={studentInfo?.guardianEmail || 'Not provided'} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Edit Profile</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={editForm.contactNumber || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, contactNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter contact number"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter address"
                  />
                </div>

                {/* Guardian Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    value={editForm.guardianName || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, guardianName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter guardian name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guardian Contact
                  </label>
                  <input
                    type="text"
                    value={editForm.guardianContact || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, guardianContact: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter guardian contact"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guardian Email
                  </label>
                  <input
                    type="email"
                    value={editForm.guardianEmail || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, guardianEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter guardian email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={editForm.relationship || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, relationship: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Enter relationship"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${
                    updating ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const InfoField = ({ label, value, customBadge }: { label: string; value?: string; customBadge?: React.ReactNode }) => (
  <div>
    <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
    {customBadge || <p className="text-gray-900">{value}</p>}
  </div>
); 