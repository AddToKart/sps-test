import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf' },
    { 
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 'bold'
    }
  ]
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Roboto',
    position: 'relative',
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 100,
    color: 'rgba(0, 150, 0, 0.1)',
    fontWeight: 'bold',
    zIndex: -1,
  },
  header: {
    marginBottom: 20,
    borderBottom: '1 solid #EEEEEE',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#002147',
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 10,
  },
  section: {
    margin: '10 0',
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottom: '1 solid #EEEEEE',
  },
  label: {
    fontSize: 10,
    color: '#6B7280',
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    padding: '8 10',
    borderBottom: '1 solid #E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '8 10',
    borderBottom: '1 solid #E5E7EB',
  },
  tableCol1: {
    flex: 2,
    fontSize: 10,
  },
  tableCol2: {
    flex: 1,
    fontSize: 10,
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    padding: '10',
    backgroundColor: '#F3F4F6',
    marginTop: 2,
  },
  totalLabel: {
    flex: 2,
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalAmount: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  successBadge: {
    backgroundColor: '#D1FAE5',
    padding: 10,
    borderRadius: 4,
    marginTop: 20,
    textAlign: 'center',
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 30,
    borderTop: '1 solid #EEEEEE',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 3,
  },
});

// Update the props interface at the top of the file
interface ReceiptDocumentProps {
  studentName: string;
  studentEmail: string;
  studentId: string;
  balance: any;
  paymentMethod: string;
  referenceNumber: string;
  isMultiplePayment?: boolean;
  balanceDetails?: any[];
}

// Create Document Component
const ReceiptDocument = ({ 
  studentName, 
  studentEmail, 
  studentId, 
  balance, 
  paymentMethod, 
  referenceNumber,
  isMultiplePayment = false,
  balanceDetails = []
}) => {
  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Calculate total amount for multiple payments
  const totalAmount = isMultiplePayment 
    ? balanceDetails.reduce((sum, item) => sum + Number(item.amount), 0)
    : Number(balance.amount);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>PAID</Text>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Payment Receipt</Text>
          <Text style={styles.subtitle}>E-Paycons School Payment Management System</Text>
        </View>

        {/* Student Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{studentName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Student ID:</Text>
            <Text style={styles.value}>{studentId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{studentEmail}</Text>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Reference Number:</Text>
            <Text style={styles.value}>{referenceNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text style={styles.value}>{paymentMethod}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDate(new Date())}</Text>
          </View>
        </View>

        {/* Payment Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Breakdown</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCol1}>Description</Text>
              <Text style={styles.tableCol2}>Amount</Text>
            </View>
            
            {isMultiplePayment && balanceDetails && balanceDetails.length > 0 ? (
              balanceDetails.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={styles.tableCol1}>{item.type}</Text>
                  <Text style={styles.tableCol2}>₱{formatCurrency(item.amount)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.tableRow}>
                <Text style={styles.tableCol1}>{balance.type}</Text>
                <Text style={styles.tableCol2}>₱{formatCurrency(balance.amount)}</Text>
              </View>
            )}
            
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>₱{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Success Badge */}
        <View style={styles.successBadge}>
          <Text style={styles.successText}>Payment Successful</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is an electronically generated receipt. No signature required.
          </Text>
          <Text style={styles.footerText}>
            For questions or concerns, please contact the school administration.
          </Text>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} ICONS School. All rights reserved.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptDocument; 