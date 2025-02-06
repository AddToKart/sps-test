'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

interface PaymentExportProps {
  payments: any[];
}

export default function PaymentExport({ payments }: PaymentExportProps) {
  const handleExport = () => {
    const exportData = payments.map(payment => ({
      Date: payment.createdAt.toDate().toLocaleString(),
      'Student Name': payment.studentName,
      'Student ID': payment.studentId,
      Amount: payment.amount,
      'Payment Method': payment.paymentMethod,
      'Reference Number': payment.referenceNumber,
      Status: payment.status,
      Type: payment.paymentType
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    XLSX.writeFile(wb, `payments_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 transition-colors"
    >
      Export to Excel
    </button>
  );
} 