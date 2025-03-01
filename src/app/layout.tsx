import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import FirebaseMessaging from '@/components/FirebaseMessaging';

const geist = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'E-Paycons - School Payment Management System',
  description: 'Streamline your school payment collections with E-Paycons',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${geist.className} antialiased`}>
        <AuthProvider>
          <ErrorBoundary>
            <PerformanceMonitor />
            <FirebaseMessaging />
            {children}
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  );
}
