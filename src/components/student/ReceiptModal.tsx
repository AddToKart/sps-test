import React from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import ReceiptDocument from './ReceiptDocument';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ReceiptModalProps {
  lastPayment: any;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ lastPayment, onClose }) => {
  if (!lastPayment) return null;

  // Handle clicking outside the modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Payment Receipt</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Download PDF
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <PDFViewer width="100%" height="100%">
            <ReceiptDocument
              studentName={lastPayment.studentInfo?.fullName || lastPayment.studentName || ''}
              studentEmail={lastPayment.studentEmail || ''}
              studentId={lastPayment.studentInfo?.studentId || ''}
              balance={lastPayment}
              paymentMethod={lastPayment.paymentMethod}
              referenceNumber={lastPayment.referenceNumber}
              isMultiplePayment={lastPayment.isMultiplePayment}
              balanceDetails={lastPayment.balanceDetails || []}
            />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal; 