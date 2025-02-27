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
  amount: number;
  type: string;
  status: 'pending' | 'paid' | 'overdue';
  studentId: string;
  dueDate: Timestamp;
  createdAt: Timestamp;
  paidAt?: Timestamp;
  paymentMethod?: string;
  paymentId?: string;
  updatedAt?: Timestamp;
} 