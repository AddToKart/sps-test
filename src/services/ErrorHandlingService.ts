import { FirebaseError } from 'firebase/app';
import { toast } from 'react-hot-toast';

export class ErrorHandlingService {
  static handleError(error: unknown, customMessage?: string) {
    console.error('Error:', error);
    
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'permission-denied':
          toast.error('You do not have permission to perform this action');
          break;
        case 'resource-exhausted':
          toast.error('Operation quota exceeded. Please try again later');
          break;
        case 'not-found':
          toast.error('Requested resource not found');
          break;
        default:
          toast.error(customMessage || 'An unexpected error occurred');
      }
    } else {
      toast.error(customMessage || 'An unexpected error occurred');
    }
  }
} 