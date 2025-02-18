'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase/config';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface StudentForm {
  fullName: string;
  studentId: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  grade: string;
  strand: string;
  section: string;
  password: string;
}

// Define the sections mapping
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
    guardianName: '',
    guardianPhone: '',
    guardianEmail: '',
    grade: '',
    strand: '',
    section: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [generatedStudentId, setGeneratedStudentId] = useState('');

  // Generate email from full name
  const generateEmail = (fullName: string) => {
    const email = `${fullName.toLowerCase().replace(/\s+/g, '')}@icons.com`;
    setGeneratedEmail(email);
    return email;
  };

  // Update email whenever full name changes
  useEffect(() => {
    if (formData.fullName) {
      generateEmail(formData.fullName);
    }
  }, [formData.fullName]);

  // Get available sections based on grade and strand
  const getAvailableSections = () => {
    if (formData.grade && formData.strand) {
      return STRAND_SECTIONS[formData.grade as '11' | '12'][formData.strand] || [];
    }
    return [];
  };

  // Reset section when grade or strand changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, section: '' }));
  }, [formData.grade, formData.strand]);

  // Generate student ID when component mounts or when needed
  const generateStudentId = () => {
    const year = '2025';
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const id = `${year}-${randomNum}-ICP`;
    setGeneratedStudentId(id);
    return id;
  };

  // Generate ID when component mounts
  useEffect(() => {
    generateStudentId();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const requestBody: any = {
        fullName: formData.fullName,
        email: generatedEmail,
        password: formData.password,
        studentId: generatedStudentId,
        grade: formData.grade,
        strand: formData.strand,
        section: formData.section
      };

      // Only add guardian info if at least one field is filled
      if (formData.guardianName || formData.guardianPhone || formData.guardianEmail) {
        requestBody.guardianInfo = {
          name: formData.guardianName || '',
          phone: formData.guardianPhone || '',
          email: formData.guardianEmail || ''
        };
      }

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to create student');
      }

      alert('Student added successfully!');
      // Reset form
      setFormData({
        fullName: '',
        studentId: '',
        guardianName: '',
        guardianPhone: '',
        guardianEmail: '',
        grade: '',
        strand: '',
        section: '',
        password: ''
      });
      setGeneratedEmail('');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Student</h1>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Student Information */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="font-semibold text-lg mb-4">Student Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">
                  Student ID
                  <span className="text-sm font-normal text-gray-500 ml-2">(Auto-generated)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedStudentId}
                    className="w-full p-2 border rounded bg-gray-50 font-mono"
                    disabled
                  />
                  <button
                    type="button"
                    onClick={generateStudentId}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded border"
                    title="Generate new ID"
                  >
                    ↺
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Format: YYYY-XXXX-ICP</p>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Generated Email</label>
                <input
                  type="text"
                  value={generatedEmail}
                  className="w-full p-2 border rounded bg-gray-50"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">This email will be used for student login</p>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Grade Level</label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Grade</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Strand</label>
                <select
                  value={formData.strand}
                  onChange={(e) => setFormData({...formData, strand: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!formData.grade}
                >
                  <option value="">Select Strand</option>
                  <option value="STEM">STEM</option>
                  <option value="ABM">ABM</option>
                  <option value="HUMSS">HUMSS</option>
                  <option value="ICT">ICT</option>
                  <option value="GAS">GAS</option>
                  <option value="HRTCO">HRTCO</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Section</label>
                <select
                  value={formData.section}
                  onChange={(e) => setFormData({...formData, section: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!formData.grade || !formData.strand}
                >
                  <option value="">Select Section</option>
                  {getAvailableSections().map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="font-semibold text-lg mb-4">Account Security</h2>
            <div>
              <label className="block mb-1 text-sm font-medium">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Guardian Information */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="font-semibold text-lg mb-4">
              Guardian Information
              <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">Guardian Name</label>
                <input
                  type="text"
                  value={formData.guardianName || ''}
                  onChange={(e) => setFormData({...formData, guardianName: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block mb-1 text-sm font-medium">Guardian Phone</label>
                <input
                  type="tel"
                  value={formData.guardianPhone || ''}
                  onChange={(e) => setFormData({...formData, guardianPhone: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium">Guardian Email</label>
                <input
                  type="email"
                  value={formData.guardianEmail || ''}
                  onChange={(e) => setFormData({...formData, guardianEmail: e.target.value})}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors font-medium"
          >
            {loading ? 'Adding Student...' : 'Add Student'}
          </button>
        </div>
      </form>
    </div>
  );
} 