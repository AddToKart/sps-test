export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public originalError?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleError = (error: unknown) => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      error.message,
      'UNKNOWN_ERROR',
      500,
      error
    );
  }

  return new AppError(
    'An unexpected error occurred',
    'UNKNOWN_ERROR',
    500,
    error
  );
};

export const isFirebaseError = (error: any): boolean => {
  return error?.code?.startsWith('auth/') || error?.code?.startsWith('firestore/');
}; 