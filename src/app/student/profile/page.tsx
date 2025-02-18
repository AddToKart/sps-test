'use client';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Student } from '@/types/student';

export default function StudentProfile() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<Partial<Student>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user || !user.email?.endsWith('@icons.com')) {
      router.push('/login');
      return;
    }

    const fetchStudentData = async () => {
      try {
        const studentsRef = collection(db, 'students');
        const q = query(studentsRef, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const studentDoc = querySnapshot.docs[0];
          const data = { 
            id: studentDoc.id, 
            ...studentDoc.data(),
            fullName: studentDoc.data().fullName || 'Not provided',
            strand: studentDoc.data().strand || 'Not assigned',
            section: studentDoc.data().section || 'Not assigned',
            grade: studentDoc.data().grade || 'Not assigned'
          } as Student;
          
          setStudentData(data);
          setEditableData({
            contactNumber: data.contactNumber || '',
            address: data.address || '',
            guardianName: data.guardianName || '',
            guardianContact: data.guardianContact || '',
            guardianEmail: data.guardianEmail || '',
            guardianRelationship: data.guardianRelationship || '',
          });
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user, router]);

  const handleSave = async () => {
    if (!studentData?.id) return;

    setIsSaving(true);
    try {
      const studentRef = doc(db, 'students', studentData.id);
      await updateDoc(studentRef, editableData);
      
      setStudentData(prev => prev ? { ...prev, ...editableData } : null);
      setIsEditing(false);
      
      // Show success message
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (studentData) {
      setEditableData({
        contactNumber: studentData.contactNumber || '',
        address: studentData.address || '',
        guardianName: studentData.guardianName || '',
        guardianContact: studentData.guardianContact || '',
        guardianEmail: studentData.guardianEmail || '',
        guardianRelationship: studentData.guardianRelationship || '',
      });
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Student Not Found</h2>
          <p className="text-gray-600 mt-2">Unable to retrieve student information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Profile Header */}
        <div className="bg-[#002147] text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-full p-3">
                <svg 
                  className="w-16 h-16 text-[#002147]" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{studentData.fullName}</h1>
                <p className="text-[#4FB3E8]">{studentData.studentId}</p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-[#4FB3E8] text-white px-4 py-2 rounded-md hover:bg-[#4FB3E8]/90 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Full Name</label>
                    <p className="font-medium">{studentData.fullName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <p className="font-medium">{studentData.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Contact Number</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editableData.contactNumber || ''}
                        onChange={(e) => setEditableData(prev => ({ ...prev, contactNumber: e.target.value }))}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
                      />
                    ) : (
                      <p className="font-medium">{studentData.contactNumber || 'Not provided'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Address</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editableData.address || ''}
                        onChange={(e) => setEditableData(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
                      />
                    ) : (
                      <p className="font-medium">{studentData.address || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Academic Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Student ID</label>
                    <p className="font-medium">{studentData.studentId}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Grade Level</label>
                    <p className="font-medium">{studentData.grade}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Strand</label>
                    <p className="font-medium">{studentData.strand}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Section</label>
                    <p className="font-medium">{studentData.section}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Enrollment Status</label>
                    <p className="font-medium">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Guardian Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Guardian Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableData.guardianName || ''}
                      onChange={(e) => setEditableData(prev => ({ ...prev, guardianName: e.target.value }))}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
                    />
                  ) : (
                    <p className="font-medium">{studentData.guardianName || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">Guardian Contact</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableData.guardianContact || ''}
                      onChange={(e) => setEditableData(prev => ({ ...prev, guardianContact: e.target.value }))}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
                    />
                  ) : (
                    <p className="font-medium">{studentData.guardianContact || 'Not provided'}</p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Relationship</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editableData.guardianRelationship || ''}
                      onChange={(e) => setEditableData(prev => ({ ...prev, guardianRelationship: e.target.value }))}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
                    />
                  ) : (
                    <p className="font-medium">{studentData.guardianRelationship || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-500">Guardian Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editableData.guardianEmail || ''}
                      onChange={(e) => setEditableData(prev => ({ ...prev, guardianEmail: e.target.value }))}
                      className="w-full p-2 border rounded-md focus:ring-2 focus:ring-[#4FB3E8] focus:border-[#4FB3E8] outline-none"
                    />
                  ) : (
                    <p className="font-medium">{studentData.guardianEmail || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Save/Cancel Buttons */}
          {isEditing && (
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 