import { Document, Page, Text, View, StyleSheet, PDFViewer, pdf } from '@react-pdf/renderer';
import type { Balance } from '@/types/student';
import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica'
  },
  header: {
    marginBottom: 30,
    textAlign: 'center'
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    fontWeight: 'bold'
  },
  schoolName: {
    fontSize: 18,
    marginBottom: 5,
    color: '#374151'
  },
  receiptInfo: {
    marginBottom: 20
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center'
  },
  label: {
    width: 150,
    fontWeight: 'bold',
    fontSize: 12,
    color: '#4B5563'
  },
  value: {
    flex: 1,
    fontSize: 12,
    color: '#111827'
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    borderBottomStyle: 'solid',
    marginVertical: 20
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 50,
    right: 50,
    textAlign: 'center'
  },
  footerText: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 5
  },
  status: {
    backgroundColor: '#DEF7EC',
    color: '#03543F',
    padding: '4 8',
    borderRadius: 4,
    fontSize: 12,
    alignSelf: 'flex-start'
  }
});

interface ReceiptProps {
  studentName: string;
  studentEmail: string;
  balance: Balance;
  paymentMethod: string;
  referenceNumber: string;
}

const formatCurrency = (amount: number) => {
  // Force convert to positive number and handle any string conversion
  const cleanAmount = Math.abs(Number(amount));
  // Format with standard number formatting
  const formatted = cleanAmount.toFixed(2);
  // Add commas for thousands
  const withCommas = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return withCommas;
};

export const ReceiptDocument = ({ 
  studentName, 
  studentEmail, 
  balance, 
  paymentMethod, 
  referenceNumber 
}: ReceiptProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Receipt</Text>
        <Text style={styles.schoolName}>Student Payment System</Text>
      </View>

      <View style={styles.receiptInfo}>
        <View style={styles.row}>
          <Text style={styles.label}>Receipt Date:</Text>
          <Text style={styles.value}>
            {new Date().toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Student Name:</Text>
          <Text style={styles.value}>{studentName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Student Email:</Text>
          <Text style={styles.value}>{studentEmail}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.receiptInfo}>
        <View style={styles.row}>
          <Text style={styles.label}>Payment Type:</Text>
          <Text style={styles.value}>{balance.type}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount Paid:</Text>
          <Text style={styles.value}>
            {Math.abs(Number(balance.amount)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment Method:</Text>
          <Text style={styles.value}>
            {paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reference Number:</Text>
          <Text style={styles.value}>{referenceNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment Status:</Text>
          <Text style={styles.status}>PAID</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          This is a computer-generated receipt. No signature required.
        </Text>
        <Text style={styles.footerText}>
          For questions, please contact the school administration.
        </Text>
        <Text style={styles.footerText}>
          Receipt generated on {new Date().toLocaleString('en-PH')}
        </Text>
      </View>
    </Page>
  </Document>
);

export const PaymentReceipt = ({ 
  studentName, 
  studentEmail, 
  balance, 
  paymentMethod, 
  referenceNumber 
}: ReceiptProps) => {
  // Add data verification
  console.log('Receipt Props:', { studentName, studentEmail, balance, paymentMethod, referenceNumber });

  // Ensure all required data is present and valid
  if (!studentName || !balance || !paymentMethod || !referenceNumber) {
    console.error('Missing required receipt data:', { studentName, balance, paymentMethod, referenceNumber });
    return <div>Error: Missing required receipt data</div>;
  }

  // Ensure balance amount is a valid number
  const amount = typeof balance.amount === 'number' ? balance.amount : 0;

  useEffect(() => {
    console.log('PaymentReceipt mounted with props:', {
      studentName,
      studentEmail,
      balance,
      paymentMethod,
      referenceNumber
    });
  }, [studentName, studentEmail, balance, paymentMethod, referenceNumber]);

  return (
    <div className="w-full h-full bg-white p-8 relative">
      {/* Preview Receipt */}
      <div className="mb-16 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Payment Receipt</h1>
          <h2 className="text-xl text-gray-600">Student Payment System</h2>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex justify-between">
            <span className="font-semibold">Receipt Date:</span>
            <span>{new Date().toLocaleDateString('en-PH', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Student Name:</span>
            <span>{studentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Student Email:</span>
            <span>{studentEmail}</span>
          </div>
        </div>

        <hr className="my-6" />

        <div className="space-y-4 mb-8">
          <div className="flex justify-between">
            <span className="font-semibold">Payment Type:</span>
            <span>{balance.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Amount Paid:</span>
            <span>₱{formatCurrency(balance.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Payment Method:</span>
            <span>{paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Reference Number:</span>
            <span>{referenceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold">Payment Status:</span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
              PAID
            </span>
          </div>
        </div>

        <hr className="my-6" />

        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>This is a computer-generated receipt. No signature required.</p>
          <p>For questions, please contact the school administration.</p>
          <p>Receipt generated on {new Date().toLocaleString('en-PH')}</p>
        </div>
      </div>
    </div>
  );
};

// Wrap the component with dynamic import
export default dynamic(() => Promise.resolve(PaymentReceipt), {
  ssr: false
});

// Add Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('PDF Rendering Error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
} 