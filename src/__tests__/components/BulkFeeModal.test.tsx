import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkFeeModal from '@/components/admin/BulkFeeModal';
import { vi } from 'vitest';

describe('BulkFeeModal', () => {
  const mockStudents = [
    { id: '1', name: 'John', email: 'john@student.com', section: 'A', strand: 'STEM' },
    { id: '2', name: 'Jane', email: 'jane@student.com', section: 'B', strand: 'ABM' },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    students: mockStudents,
    selectedSection: '',
    selectedStrand: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders correctly when open', () => {
    render(<BulkFeeModal {...defaultProps} />);
    expect(screen.getByText('Add Bulk Fees')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<BulkFeeModal {...defaultProps} />);
    
    const submitButton = screen.getByText('Add Fees');
    await userEvent.click(submitButton);

    expect(screen.getByText('Fee type is required')).toBeInTheDocument();
  });

  it('validates amount is positive', async () => {
    render(<BulkFeeModal {...defaultProps} />);
    
    const amountInput = screen.getByPlaceholderText('0.00');
    await userEvent.type(amountInput, '-100');
    
    const submitButton = screen.getByText('Add Fees');
    await userEvent.click(submitButton);

    expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
  });

  it('successfully submits form with valid data', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ count: 2 }) };
    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    render(<BulkFeeModal {...defaultProps} />);
    
    // Fill form
    await userEvent.type(screen.getByPlaceholderText('e.g., Tuition Fee'), 'Test Fee');
    await userEvent.type(screen.getByPlaceholderText('0.00'), '100');
    await userEvent.type(screen.getByPlaceholderText('Fee description...'), 'Test Description');
    
    const dateInput = screen.getByLabelText('Due Date');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    await userEvent.type(dateInput, futureDate.toISOString().split('T')[0]);

    // Submit form
    const submitButton = screen.getByText('Add Fees');
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Successfully added fees to 2 students')).toBeInTheDocument();
    });
  });
}); 