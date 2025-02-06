export interface Student {
  id: string;
  email: string;
  name: string;
  section: string;
  strand: string;
  grade: string;
  balances: Balance[];
  createdAt: Date;
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