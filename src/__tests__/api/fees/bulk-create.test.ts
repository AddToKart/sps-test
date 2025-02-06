import { POST } from '@/app/api/fees/bulk-create/route';
import { getFirestore } from 'firebase-admin/firestore';
import { vi } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

describe('POST /api/fees/bulk-create', () => {
  const mockDb = {
    collection: vi.fn(),
    batch: vi.fn(),
    getAll: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getFirestore as jest.Mock).mockReturnValue(mockDb);
  });

  it('validates request body', async () => {
    const request = new Request('http://localhost:3000/api/fees/bulk-create', {
      method: 'POST',
      body: JSON.stringify({
        students: [],
        fee: {
          type: '',
          amount: -100,
          description: '',
          dueDate: '2020-01-01',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
  });

  it('handles invalid student IDs', async () => {
    mockDb.getAll.mockResolvedValue([{ exists: false }]);

    const request = new Request('http://localhost:3000/api/fees/bulk-create', {
      method: 'POST',
      body: JSON.stringify({
        students: ['invalid-id'],
        fee: {
          type: 'Test Fee',
          amount: 100,
          description: 'Test Description',
          dueDate: '2025-01-01',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid student IDs');
  });

  it('successfully creates fees for valid students', async () => {
    const mockBatch = {
      set: vi.fn(),
      commit: vi.fn(),
    };

    mockDb.batch.mockReturnValue(mockBatch);
    mockDb.getAll.mockResolvedValue([{ exists: true }]);
    mockDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn(),
        }),
      }),
    });

    const request = new Request('http://localhost:3000/api/fees/bulk-create', {
      method: 'POST',
      body: JSON.stringify({
        students: ['valid-id'],
        fee: {
          type: 'Test Fee',
          amount: 100,
          description: 'Test Description',
          dueDate: '2025-01-01',
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBe(1);
  });
}); 