'use client';

import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';

interface FeeReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptId: string;
  amount: number;
  studentName: string;
  branch: string;
  remaining: number;
  date: Date;
}

export default function FeeReceiptModal({
  isOpen,
  onClose,
  receiptId,
  amount,
  studentName,
  branch,
  remaining,
  date,
}: FeeReceiptModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Fee Receipt" size="md">
      <div className="print-area">
        {/* Receipt Content */}
        <div className="border-2 border-slate-200 rounded-2xl p-8 bg-white">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-200 pb-5 mb-6">
            <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3 shadow-lg shadow-accent/25">
              AP
            </div>
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-outfit)' }}>
              Your Institution Name
            </h2>
            <p className="text-muted text-sm mt-1">Official Fee Receipt</p>
          </div>

          {/* Receipt Details */}
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
              <span className="text-muted text-sm">Receipt No.</span>
              <span className="font-mono text-sm font-bold text-accent">{receiptId}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
              <span className="text-muted text-sm">Date</span>
              <span className="text-sm font-medium">{formatDate(date)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
              <span className="text-muted text-sm">Student Name</span>
              <span className="text-sm font-medium">{studentName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-200">
              <span className="text-muted text-sm">Branch</span>
              <span className="text-sm font-medium">{branch}</span>
            </div>

            {/* Amount Highlight */}
            <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex justify-between items-center">
                <span className="text-emerald-700 font-medium">Amount Paid</span>
                <span className="text-2xl font-bold text-emerald-700">{formatCurrency(amount)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-muted text-sm">Remaining Balance</span>
              <span className={`text-sm font-bold ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(remaining)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t-2 border-slate-200 text-center">
            <p className="text-muted text-xs">This is a computer-generated receipt.</p>
            <p className="text-muted text-xs mt-1">Thank you for your payment.</p>
          </div>
        </div>
      </div>

      {/* Print Button */}
      <div className="mt-5 flex justify-end gap-3 no-print">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-sm text-muted hover:text-foreground bg-surface-hover rounded-xl transition-colors"
        >
          Close
        </button>
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 text-sm font-semibold bg-accent hover:bg-accent-hover text-white rounded-xl
            transition-all duration-200 shadow-sm shadow-accent/20 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Receipt
        </button>
      </div>
    </Modal>
  );
}
