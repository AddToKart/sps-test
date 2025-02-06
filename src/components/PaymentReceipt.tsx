import { Document, Page, Text, View, StyleSheet, PDFViewer, pdf } from '@react-pdf/renderer';
import type { Balance } from '@/types/student';

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

export const PaymentReceipt = ({ 
  studentName, 
  studentEmail, 
  balance, 
  paymentMethod, 
  referenceNumber 
}: ReceiptProps) => {
  const ReceiptDocument = (
    <Document
      author="Student Payment System"
      creator="Student Payment System"
      producer="Student Payment System"
      keywords="payment receipt"
      subject="Payment Receipt"
      title="Payment Receipt"
    >
      <Page 
        size="A4" 
        style={styles.page}
        debug={false}
      >
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

  return (
    <div className="relative w-full h-[600px] overflow-hidden">
      <div className="absolute inset-0 overflow-auto">
        <PDFViewer
          style={{ width: '100%', height: '100%' }}
          showToolbar={false}
          className="select-none"
        >
          {ReceiptDocument}
        </PDFViewer>
      </div>
      <div className="sticky top-4 right-4 z-10 flex justify-end p-4">
        <button
          onClick={async () => {
            const blob = await pdf(ReceiptDocument).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `receipt-${balance.type}-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-lg"
        >
          Download Receipt
        </button>
      </div>
    </div>
  );
}; 