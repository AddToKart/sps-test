import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
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
    marginBottom: 10,
    color: '#666666',
  },
  section: {
    margin: 10,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '1 solid #EEEEEE',
    paddingBottom: 5,
    paddingTop: 5,
  },
  label: {
    fontSize: 10,
    color: '#666666',
  },
  value: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 30,
    borderTop: '1 solid #EEEEEE',
    paddingTop: 10,
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
  },
  successBadge: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    padding: 10,
    borderRadius: 5,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
});

// Create Document Component
const ReceiptDocument = ({ studentName, studentEmail, studentId, balance, paymentMethod, referenceNumber }) => {
  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Payment Receipt</Text>
          <Text style={styles.subtitle}>E-Paycons School Payment Management System</Text>
        </View>

        <View style={styles.section}>
          <Text style={{ fontSize: 14, marginBottom: 10, fontWeight: 'bold' }}>Student Information</Text>
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

        <View style={styles.section}>
          <Text style={{ fontSize: 14, marginBottom: 10, fontWeight: 'bold' }}>Payment Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Reference Number:</Text>
            <Text style={styles.value}>{referenceNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Type:</Text>
            <Text style={styles.value}>{balance.type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Amount:</Text>
            <Text style={styles.value}>₱{formatCurrency(balance.amount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text style={styles.value}>{paymentMethod}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formatDate(balance.createdAt || balance.paidAt)}</Text>
          </View>
        </View>

        <View style={styles.successBadge}>
          <Text>Payment Successful</Text>
        </View>

        <View style={styles.footer}>
          <Text>This is an electronically generated receipt. No signature required.</Text>
          <Text>For questions or concerns, please contact the school administration.</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptDocument; 