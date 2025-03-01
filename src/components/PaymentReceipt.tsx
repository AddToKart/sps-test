import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font, PDFViewer } from '@react-pdf/renderer';
import { Balance } from '@/types/student';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 'normal' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
  ]
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Roboto',
  },
  header: {
    marginBottom: 20,
    borderBottom: '1px solid #CCCCCC',
    paddingBottom: 10,
  },
  logo: {
    width: 120,
    height: 50,
    marginBottom: 10,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002147',
  },
  schoolAddress: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 5,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#002147',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontSize: 10,
    width: '30%',
    color: '#666666',
  },
  value: {
    fontSize: 10,
    width: '70%',
    fontWeight: 'bold',
  },
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: 8,
    fontSize: 10,
    fontWeight: 'bold',
    borderBottom: '1px solid #CCCCCC',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    fontSize: 10,
    borderBottom: '1px solid #EEEEEE',
  },
  col1: {
    width: '40%',
  },
  col2: {
    width: '30%',
    textAlign: 'center',
  },
  col3: {
    width: '30%',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    padding: 8,
    fontSize: 12,
    fontWeight: 'bold',
    borderTop: '1px solid #CCCCCC',
    marginTop: 5,
  },
  footer: {
    marginTop: 30,
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '25%',
    transform: 'rotate(-45deg)',
    fontSize: 60,
    color: 'rgba(0, 33, 71, 0.05)',
  },
  qrCode: {
    width: 80,
    height: 80,
    marginTop: 10,
  },
  verification: {
    fontSize: 8,
    color: '#666666',
    marginTop: 5,
  },
});

// Define props for the receipt
interface PaymentReceiptProps {
  studentName: string;
  studentEmail: string;
  balance?: {
    amount: number;
    type: string;
    status: string;
    createdAt: any;
    paidAt: any;
  };
  paymentMethod: string;
  referenceNumber: string;
  isMultiplePayment?: boolean;
  balances?: Balance[];
  totalAmount?: number;
}

// Create the receipt component for browser rendering
export const PaymentReceipt = ({ payment }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Payment Receipt</h2>
        <p className="text-gray-500">Thank you for your payment</p>
      </div>
      
      <div className="border-t border-b border-gray-200 py-4 mb-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Reference Number:</span>
          <span className="font-medium">{payment?.referenceNumber || 'N/A'}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Amount:</span>
          <span className="font-medium">₱{payment?.amount?.toLocaleString() || '0'}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Payment Type:</span>
          <span className="font-medium">{payment?.type || 'Payment'}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Payment Method:</span>
          <span className="font-medium">{payment?.paymentMethod || 'Online Payment'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Date:</span>
          <span className="font-medium">
            {payment?.createdAt?.toDate 
              ? payment.createdAt.toDate().toLocaleDateString() 
              : new Date().toLocaleDateString()}
          </span>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-green-600 font-medium mb-2">Payment Successful</p>
        <p className="text-sm text-gray-500">A copy of this receipt has been sent to your email.</p>
      </div>
    </div>
  );
};

// Create the receipt document for PDF generation
export const ReceiptDocument: React.FC<PaymentReceiptProps> = ({
  studentName,
  studentEmail,
  balance,
  paymentMethod,
  referenceNumber,
  isMultiplePayment,
  balances,
  totalAmount
}) => {
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      'gcash': 'GCash',
      'maya': 'Maya',
      'bpi': 'BPI Online',
      'bdo': 'BDO Online',
      'unionbank': 'UnionBank',
      'grabpay': 'GrabPay'
    };
    return methods[method] || method;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>PAID</Text>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.schoolName}>ICONS SCHOOL</Text>
          <Text style={styles.schoolAddress}>123 Education Avenue, Metro Manila, Philippines</Text>
          <Text style={styles.schoolAddress}>Tel: (02) 8123-4567 | Email: info@icons.edu.ph</Text>
        </View>
        
        {/* Receipt Title */}
        <Text style={styles.receiptTitle}>
          {isMultiplePayment ? 'MULTIPLE PAYMENTS RECEIPT' : 'OFFICIAL PAYMENT RECEIPT'}
        </Text>
        
        {/* Student Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>STUDENT INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{studentName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{studentEmail}</Text>
          </View>
        </View>
        
        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAYMENT INFORMATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Reference Number:</Text>
            <Text style={styles.value}>{referenceNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text style={styles.value}>{getPaymentMethodName(paymentMethod)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Date:</Text>
            <Text style={styles.value}>{formatDate(isMultiplePayment ? balances?.[0]?.paidAt : balance?.paidAt)}</Text>
          </View>
          {!isMultiplePayment && balance && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Payment Type:</Text>
                <Text style={styles.value}>{balance.type}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Amount Paid:</Text>
                <Text style={styles.value}>₱{formatCurrency(balance.amount)}</Text>
              </View>
            </>
          )}
        </View>
        
        {/* Multiple Payments Table */}
        {isMultiplePayment && balances && balances.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAYMENT DETAILS</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.col1}>Payment Type</Text>
                <Text style={styles.col2}>Due Date</Text>
                <Text style={styles.col3}>Amount</Text>
              </View>
              
              {balances.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.col1}>{item.type}</Text>
                  <Text style={styles.col2}>{formatDate(item.dueDate)}</Text>
                  <Text style={styles.col3}>₱{formatCurrency(item.amount)}</Text>
                </View>
              ))}
              
              <View style={styles.totalRow}>
                <Text style={styles.col1}>Total</Text>
                <Text style={styles.col2}></Text>
                <Text style={styles.col3}>₱{formatCurrency(totalAmount || balances.reduce((sum, item) => sum + item.amount, 0))}</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Verification Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VERIFICATION</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, { color: '#22C55E' }]}>PAID</Text>
          </View>
          <Text style={styles.verification}>
            This receipt was automatically generated and is valid without signature.
            To verify this receipt, please contact our finance department with the reference number.
          </Text>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thank you for your payment!</Text>
          <Text>© {new Date().getFullYear()} ICONS School. All rights reserved.</Text>
        </View>
      </Page>
    </Document>
  );
}; 