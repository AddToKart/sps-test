export interface Student {
  id: string;
  name: string;
  email: string;
  section: string;
  strand: string;
  grade: string;
  status: 'active' | 'inactive';
  studentId: string;
  contactNumber: string;
  guardianName: string;
  guardianContact: string;
  address: string;
  enrollmentDate: Date;
  balances?: {
    id: string;
    amount: number;
    dueDate: Date;
    status: 'pending' | 'paid';
    type: string;
  }[];
  payments?: {
    id: string;
    amount: number;
    date: Date;
    method: string;
    reference: string;
  }[];
}

export interface Balance {
  id: string;
  type: string;
  amount: number;
  status: 'pending' | 'paid';
  createdAt: Date;
  paidAt?: Date;
  paymentMethod?: string;
  referenceNumber?: string;
} 