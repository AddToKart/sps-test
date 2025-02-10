export interface Ticket {
  id: string;
  studentId: string;
  studentName: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  responses?: TicketResponse[];
}

export interface TicketResponse {
  id: string;
  message: string;
  createdAt: Date;
  userId: string;
  userType: 'admin' | 'student';
  userName: string;
} 