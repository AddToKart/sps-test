import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { utils, writeFile } from 'xlsx';

export class ReportService {
  static async generatePaymentReport(startDate: Date, endDate: Date, reportType: string) {
    try {
      // For yearly reports, set the date range to the current year
      if (reportType === 'yearly') {
        startDate = new Date(new Date().getFullYear(), 0, 1); // January 1st of current year
        endDate = new Date(new Date().getFullYear(), 11, 31); // December 31st of current year
      }

      const paymentsRef = collection(db, 'payments');
      const q = query(
        paymentsRef,
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );

      const snapshot = await getDocs(q);
      const payments = snapshot.docs.map(doc => {
        const data = doc.data();
        const balanceDetails = data.balanceDetails || [];
        const formattedDetails = data.isMultiplePayment 
          ? balanceDetails.map(b => `${b.type}: ₱${b.amount?.toLocaleString()}`).join(', ')
          : data.type;

        return {
          'Date': data.createdAt?.toDate().toLocaleString(),
          'Student ID': data.studentId || 'N/A',
          'Student Name': data.studentName || 'N/A',
          'Grade & Section': `${data.studentInfo?.grade || ''} ${data.studentInfo?.section || ''}`,
          'Strand': data.studentInfo?.strand || 'N/A',
          'Payment Details': formattedDetails,
          'Amount': `₱${data.amount?.toLocaleString() || 0}`,
          'Payment Method': data.paymentMethod?.toUpperCase() || 'N/A',
          'Reference Number': data.referenceNumber || 'N/A',
          'Type': data.isMultiplePayment ? 'Group Payment' : 'Single Payment',
          'Status': data.status?.toUpperCase() || 'N/A',
          'Processed At': data.paidAt?.toDate().toLocaleString() || 'N/A'
        };
      });

      // Create workbook
      const wb = utils.book_new();

      // Add summary worksheet with enhanced details
      const totalAmount = payments.reduce((sum, p) => sum + (parseFloat(String(p.Amount).replace(/[₱,]/g, '')) || 0), 0);
      
      // Get payment method breakdown
      const methodBreakdown = this.getPaymentMethodBreakdown(payments);
      
      // Get payment type breakdown
      const typeBreakdown = this.getPaymentTypeBreakdown(payments);
      
      // Calculate daily averages for weekly/monthly reports
      const dailyAverages = reportType !== 'daily' ? this.calculateDailyAverages(payments, startDate, endDate) : null;

      // Add monthly breakdown for yearly reports
      const monthlyBreakdown = reportType === 'yearly' 
        ? this.getMonthlyBreakdown(payments)
        : null;

      const summary = [
        [`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Collection Report`],
        ['Period', reportType === 'yearly' 
          ? `Year ${startDate.getFullYear()}`
          : reportType === 'daily'
            ? startDate.toLocaleDateString()
            : `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`],
        [''],
        ['Transaction Summary'],
        ['Total Transactions', payments.length],
        ['Total Collections', `₱${totalAmount.toLocaleString()}`],
        ['Average Transaction Amount', `₱${(totalAmount / payments.length || 0).toLocaleString()}`],
        [''],
        ['Payment Method Breakdown'],
        ...methodBreakdown,
        [''],
        ['Payment Type Breakdown'],
        ...typeBreakdown,
      ];

      // Add monthly breakdown for yearly reports
      if (monthlyBreakdown && reportType === 'yearly') {
        summary.push(
          [''],
          ['Monthly Breakdown'],
          ['Month', 'Transactions', 'Collections'],
          ...monthlyBreakdown
        );
      }

      // Add averages based on report type
      if (reportType === 'yearly') {
        const monthlyAvg = totalAmount / 12;
        summary.push(
          [''],
          ['Yearly Statistics'],
          ['Average Monthly Collections', `₱${monthlyAvg.toLocaleString()}`],
          ['Average Monthly Transactions', (payments.length / 12).toFixed(2)],
          ['Highest Collection Month', this.getHighestCollectionMonth(monthlyBreakdown)],
          ['Lowest Collection Month', this.getLowestCollectionMonth(monthlyBreakdown)]
        );
      }

      // Add daily averages for weekly/monthly reports
      if (dailyAverages && reportType !== 'daily') {
        summary.push(
          [''],
          ['Daily Averages'],
          ['Average Daily Transactions', dailyAverages.avgTransactions.toFixed(2)],
          ['Average Daily Collections', `₱${dailyAverages.avgAmount.toLocaleString()}`]
        );
      }

      // Add final details
      summary.push(
        [''],
        ['Generated On', new Date().toLocaleString()],
        [''],
        ['Note: This is a system-generated report']
      );

      const summaryWs = utils.aoa_to_sheet(summary);
      utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Add transactions worksheet
      const ws = utils.json_to_sheet(payments);
      utils.book_append_sheet(wb, ws, 'Transactions');

      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // Date with time
        { wch: 15 }, // Student ID
        { wch: 25 }, // Student Name
        { wch: 20 }, // Grade & Section
        { wch: 15 }, // Strand
        { wch: 40 }, // Payment Details
        { wch: 15 }, // Amount
        { wch: 15 }, // Payment Method
        { wch: 20 }, // Reference Number
        { wch: 15 }, // Type
        { wch: 12 }, // Status
        { wch: 20 }  // Processed At
      ];

      // Generate filename with timestamp
      const filename = `${reportType}_Collection_Report_${startDate.toISOString().split('T')[0]}${reportType === 'daily' ? '_' + new Date().getTime() : ''}.xlsx`;

      writeFile(wb, filename);

      return {
        success: true,
        filename,
        summary: {
          totalTransactions: payments.length,
          totalAmount: totalAmount,
          period: reportType === 'yearly'
            ? `Year ${startDate.getFullYear()}`
            : reportType === 'daily'
              ? startDate.toLocaleDateString()
              : `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
        }
      };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  private static getPaymentMethodBreakdown(payments: any[]) {
    const breakdown = payments.reduce((acc, payment) => {
      const method = payment['Payment Method'];
      acc[method] = (acc[method] || 0) + parseFloat(String(payment.Amount).replace(/[₱,]/g, '')) || 0;
      return acc;
    }, {});

    return Object.entries(breakdown).map(([method, amount]) => [
      method,
      `₱${Number(amount).toLocaleString()}`
    ]);
  }

  private static getPaymentTypeBreakdown(payments: any[]) {
    const breakdown = payments.reduce((acc, payment) => {
      const type = payment['Type'];
      acc[type] = (acc[type] || 0) + parseFloat(String(payment.Amount).replace(/[₱,]/g, '')) || 0;
      return acc;
    }, {});

    return Object.entries(breakdown).map(([type, amount]) => [
      type,
      `₱${Number(amount).toLocaleString()}`
    ]);
  }

  private static calculateDailyAverages(payments: any[], startDate: Date, endDate: Date) {
    const totalAmount = payments.reduce((sum, p) => 
      sum + (parseFloat(String(p.Amount).replace(/[₱,]/g, '')) || 0), 0);
    
    const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    return {
      avgTransactions: payments.length / daysDiff,
      avgAmount: totalAmount / daysDiff
    };
  }

  // Add new helper method for monthly breakdown
  private static getMonthlyBreakdown(payments: any[]) {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(i);
      return date.toLocaleString('default', { month: 'long' });
    });

    const monthlyData = payments.reduce((acc, payment) => {
      const date = new Date(payment.Date);
      const month = date.getMonth();
      const amount = parseFloat(String(payment.Amount).replace(/[₱,]/g, '')) || 0;

      if (!acc[month]) {
        acc[month] = { transactions: 0, amount: 0 };
      }
      acc[month].transactions += 1;
      acc[month].amount += amount;
      return acc;
    }, {});

    return months.map((month, index) => [
      month,
      monthlyData[index]?.transactions || 0,
      `₱${(monthlyData[index]?.amount || 0).toLocaleString()}`
    ]);
  }

  private static getHighestCollectionMonth(monthlyBreakdown: any[]) {
    if (!monthlyBreakdown?.length) return 'N/A';
    const highest = monthlyBreakdown.reduce((max, curr) => {
      const amount = parseFloat(String(curr[2]).replace(/[₱,]/g, '')) || 0;
      return amount > max.amount ? { month: curr[0], amount } : max;
    }, { month: '', amount: 0 });
    return `${highest.month} (₱${highest.amount.toLocaleString()})`;
  }

  private static getLowestCollectionMonth(monthlyBreakdown: any[]) {
    if (!monthlyBreakdown?.length) return 'N/A';
    const lowest = monthlyBreakdown.reduce((min, curr) => {
      const amount = parseFloat(String(curr[2]).replace(/[₱,]/g, '')) || 0;
      return amount < min.amount || min.amount === 0 ? { month: curr[0], amount } : min;
    }, { month: '', amount: 0 });
    return `${lowest.month} (₱${lowest.amount.toLocaleString()})`;
  }
} 