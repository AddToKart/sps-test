'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ActivityService } from '@/services/ActivityService';
import Link from 'next/link';

interface StudentForm {
  fullName: string;
  studentId: string;
  email: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  grade: string;
  strand: string;
  section: string;
  gender: string;
  password: string;
}

// First, ensure we're using the same constants
const STRANDS = ['STEM', 'ABM', 'HUMSS', 'ICT', 'GAS', 'HRTCO'];
const GRADES = ['11', '12'];

// Define the sections mapping (same as in students page)
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

export default function AddStudent() {
  const router = useRouter();
  const [formData, setFormData] = useState<StudentForm>({
    fullName: '',
    studentId: '',
    email: '',
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    grade: '',
    strand: '',
    section: '',
    gender: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [generatedStudentId, setGeneratedStudentId] = useState('');
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  // Generate email from full name
  const generateEmail = (fullName: string) => {
    const sanitizedName = fullName
      .toLowerCase()
      .replace(/\s+/g, '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const email = `${sanitizedName}@icons.com`;
    setFormData(prev => ({ ...prev, email }));
    return email;
  };

  // Update email whenever full name changes
  useEffect(() => {
    if (formData.fullName) {
      generateEmail(formData.fullName);
    }
  }, [formData.fullName]);

  // Get available sections based on grade and strand
  useEffect(() => {
    if (formData.grade && formData.strand) {
      const sections = STRAND_SECTIONS[formData.grade]?.[formData.strand] || [];
      setAvailableSections(sections);
      
      // Reset section if current selection is not valid for new grade/strand
      if (formData.section && !sections.includes(formData.section)) {
        setFormData(prev => ({ ...prev, section: '' }));
      }
    } else {
      setAvailableSections([]);
      setFormData(prev => ({ ...prev, section: '' }));
    }
  }, [formData.grade, formData.strand]);

  // Generate student ID when component mounts or when needed
  const generateStudentId = () => {
    const year = new Date().getFullYear().toString();
    const random = Math.floor(1000 + Math.random() * 9000);
    const newStudentId = `${year}-${random}-ICP`;
    setFormData(prev => ({ ...prev, studentId: newStudentId }));
    setGeneratedStudentId(newStudentId);
  };

  // Generate ID when component mounts
  useEffect(() => {
    generateStudentId();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call the API endpoint instead of using client-side auth
      const response = await fetch('/api/students/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create student');
      }

      // Log the activity
      await ActivityService.logActivity({
        type: 'student',
        action: 'student_created',
        description: `Added new student: ${formData.fullName}`,
        userId: auth.currentUser?.uid || 'unknown',
        userType: 'admin',
        metadata: {
          studentId: formData.studentId,
          studentName: formData.fullName,
          grade: formData.grade,
          strand: formData.strand
        }
      });

      toast.success('Student added successfully');
      
      // Reset form
      setFormData({
        fullName: '',
        studentId: '',
        email: '',
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
        grade: '',
        strand: '',
        section: '',
        gender: '',
        password: ''
      });
      setGeneratedEmail('');
      
      // Generate a new student ID for the next entry
      generateStudentId();

    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  // Add this effect to check admin status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || !user.email?.endsWith('@admin.com')) {
        console.log('Not authorized as admin:', user?.email);
        router.push('/login'); // Redirect to login if not admin
        return;
      }
      console.log('Authorized as admin:', user.email);
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <Link 
              href="/admin/students" 
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Students
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Add New Student</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Student Information Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        fullName: e.target.value,
                        email: generateEmail(e.target.value)
                      }));
                    }}
                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.studentId}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                      className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={generateStudentId}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generated Email
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={formData.email}
                    className="w-full rounded-lg bg-gray-50 border-gray-300 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">This email will be used for student login</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade Level
                  </label>
                  <select
                    required
                    value={formData.grade}
                    onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Grade</option>
                    {GRADES.map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Strand
                  </label>
                  <select
                    required
                    value={formData.strand}
                    onChange={(e) => setFormData(prev => ({ ...prev, strand: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Strand</option>
                    {STRANDS.map(strand => (
                      <option key={strand} value={strand}>{strand}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section
                  </label>
                  <select
                    required
                    value={formData.section}
                    onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                    disabled={!formData.grade || !formData.strand || availableSections.length === 0}
                    className={`w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 ${
                      (!formData.grade || !formData.strand) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">Select Section</option>
                    {availableSections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Guardian Information Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Guardian Information (Optional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianName: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guardian Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.guardianPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianPhone: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Guardian Email
                  </label>
                  <input
                    type="email"
                    value={formData.guardianEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, guardianEmail: e.target.value }))}
                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Link 
                href="/admin/students"
                className="px-6 py-2 mr-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding Student...
                  </span>
                ) : (
                  'Add Student'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 