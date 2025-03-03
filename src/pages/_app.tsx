import { LoadingProvider } from '@/contexts/LoadingContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <LoadingProvider>
        <Component {...pageProps} />
        <Toaster position="top-right" />
      </LoadingProvider>
    </AuthProvider>
  );
}

export default MyApp; 