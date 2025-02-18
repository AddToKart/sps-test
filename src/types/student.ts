export interface Student {
  id: string;
  name: string;
  email: string;
  section?: string;
  strand?: string;
  grade?: string;
  status: 'active' | 'inactive';
  studentId: string;
  contactNumber: string;
  guardianName: string;
  guardianContact: string;
  address: string;
  enrollmentDate: Date;
  program: string;
  guardianEmail?: string;
  guardianRelationship?: string;
}

export interface Balance {
  id: string;
  studentId: string;
  type: string;
  amount: number;
  status: 'pending' | 'paid';
  dueDate: Timestamp;
  dueDateString?: string;
  description?: string;
  createdAt: Timestamp;
  dateAdded: Timestamp;
  studentName?: string;
} 