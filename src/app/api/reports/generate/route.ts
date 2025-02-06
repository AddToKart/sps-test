import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import * as ExcelJS from 'exceljs';
import { z } from 'zod';
import * as admin from 'firebase-admin';

const RequestSchema = z.object({
  type: z.enum(['collection', 'payment', 'outstanding']),
  students: z.array(z.string()).min(1)
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, students } = RequestSchema.parse(body);
    
    const db = getFirestore();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Set up worksheet headers based on report type
    switch (type) {
      case 'collection':
        worksheet.columns = [
          { header: 'Student Name', key: 'name', width: 30 },
          { header: 'Total Fees', key: 'totalFees', width: 15 },
          { header: 'Paid Amount', key: 'paidAmount', width: 15 },
          { header: 'Outstanding', key: 'outstanding', width: 15 },
          { header: 'Collection Rate', key: 'collectionRate', width: 15 },
        ];
        break;
      case 'payment':
        worksheet.columns = [
          { header: 'Student Name', key: 'name', width: 30 },
          { header: 'Payment Date', key: 'date', width: 15 },
          { header: 'Amount', key: 'amount', width: 15 },
          { header: 'Type', key: 'type', width: 20 },
          { header: 'Status', key: 'status', width: 15 },
        ];
        break;
      case 'outstanding':
        worksheet.columns = [
          { header: 'Student Name', key: 'name', width: 30 },
          { header: 'Fee Type', key: 'type', width: 20 },
          { header: 'Due Date', key: 'dueDate', width: 15 },
          { header: 'Amount', key: 'amount', width: 15 },
          { header: 'Days Overdue', key: 'daysOverdue', width: 15 },
        ];
        break;
    }

    // Fetch and process data
    for (const studentId of students) {
      const studentDoc = await db.collection('students').doc(studentId).get();
      const student = studentDoc.data();
      if (!student) continue;

      const balances = await db
        .collection('students')
        .doc(studentId)
        .collection('balances')
        .get();

      switch (type) {
        case 'collection': {
          let totalFees = 0;
          let paidAmount = 0;

          balances.docs.forEach(doc => {
            const balance = doc.data();
            totalFees += balance.amount;
            if (balance.status === 'paid') {
              paidAmount += balance.amount;
            }
          });

          const outstanding = totalFees - paidAmount;
          const collectionRate = totalFees > 0 ? (paidAmount / totalFees) * 100 : 0;

          worksheet.addRow({
            name: student.name,
            totalFees,
            paidAmount,
            outstanding,
            collectionRate: `${collectionRate.toFixed(2)}%`
          });
          break;
        }
        case 'payment': {
          balances.docs.forEach(doc => {
            const balance = doc.data();
            if (balance.status === 'paid') {
              worksheet.addRow({
                name: student.name,
                date: balance.paidAt.toDate().toLocaleDateString(),
                amount: balance.amount,
                type: balance.type,
                status: balance.status
              });
            }
          });
          break;
        }
        case 'outstanding': {
          const today = new Date();
          balances.docs.forEach(doc => {
            const balance = doc.data();
            try {
              if (balance.status === 'pending') {
                // Safely handle the dueDate
                let dueDate = new Date();
                let daysOverdue = 0;

                if (balance.dueDate) {
                  // Handle different possible date formats
                  if (balance.dueDate instanceof admin.firestore.Timestamp) {
                    dueDate = balance.dueDate.toDate();
                  } else if (typeof balance.dueDate === 'string') {
                    dueDate = new Date(balance.dueDate);
                  }
                  
                  daysOverdue = Math.max(0, Math.floor(
                    (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
                  ));
                }

                worksheet.addRow({
                  name: student.name || 'Unknown',
                  type: balance.type || 'Unspecified',
                  dueDate: dueDate.toLocaleDateString(),
                  amount: balance.amount || 0,
                  daysOverdue
                });
              }
            } catch (error) {
              console.error('Error processing balance record:', error);
              // Continue with next record instead of failing entire report
            }
          });
          break;
        }
      }
    }

    // Style the worksheet
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add totals row for outstanding balances
    if (type === 'outstanding') {
      const totalRow = worksheet.rowCount + 1;
      worksheet.addRow({
        name: 'TOTAL',
        amount: {
          formula: `SUM(D2:D${worksheet.rowCount})`
        }
      });
      worksheet.getRow(totalRow).font = { bold: true };
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${type}-report-${new Date().toISOString().split('T')[0]}.xlsx`
      }
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({
      error: 'Failed to generate report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, {
      status: 500
    });
  }
} 