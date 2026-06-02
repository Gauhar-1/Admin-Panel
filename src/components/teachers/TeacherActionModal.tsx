'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { ITeacher } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface TeacherActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: ITeacher;
  branch: 'School' | 'College' | 'Pharma';
}

const TEACHER_CATEGORIES = ['Base Salary', 'Bonus', 'Advance', 'Reimbursement', 'Other'];

export default function TeacherActionModal({ isOpen, onClose, teacher, branch }: TeacherActionModalProps) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [category, setCategory] = useState('Base Salary');
  const [customCategory, setCustomCategory] = useState('');
  
  // ── Receipt States ──
  const [receiptData, setReceiptData] = useState<{
    receiptId: string;
    amount: number;
    reason: string;
    date: Date;
    remainingDue: number;
  } | null>(null);

  const queryClient = useQueryClient();

  // Handle optional transaction array name (installments or payments)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentHistory: any[] = (teacher as any).installments || (teacher as any).payments || [];
  const sortedHistory = [...paymentHistory].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const paymentMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
      const res = await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: teacher._id,
          name: teacher.name,
          phone: teacher.phone,
          totalSalary: teacher.totalSalary,
          salaryPayment: amount,
          paymentReason: reason,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to record payment');
      return json;
    },
    onSuccess: (json) => {
      const payment = parseFloat(paymentAmount);
      const reason = category === 'Other' ? customCategory : category;
      
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      toast.success(`Salary payment of ${formatCurrency(payment)} recorded!`);
      
      // Trigger the Receipt Modal
      setReceiptData({
        receiptId: json.receiptId || `SAL-${Math.floor(100000 + Math.random() * 900000)}`,
        amount: payment,
        reason: reason,
        date: new Date(),
        remainingDue: json.data?.remainingDue ?? (teacher.remainingDue - payment)
      });
      
      // Reset form
      setPaymentAmount('');
      setCategory('Base Salary');
      setCustomCategory('');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    const reason = category === 'Other' ? customCategory : category;
    paymentMutation.mutate({ amount, reason });
  };

  // ── Professional PDF Generation for Salary Slip ──
  const downloadReceiptPDF = async () => {
    if (!receiptData) return;

    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ format: 'a5', orientation: 'landscape' });
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text('OFFICIAL SALARY DISBURSEMENT RECEIPT', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`${branch.toUpperCase()} DIVISION`, pageWidth / 2, 26, { align: 'center' });

      doc.setDrawColor(226, 232, 240);
      doc.line(10, 32, pageWidth - 10, 32);

      doc.setFontSize(9);
      doc.text(`Date: ${receiptData.date.toLocaleDateString('en-IN')}`, 10, 38);
      doc.setFont('helvetica', 'bold');
      doc.text(`Receipt No: ${receiptData.receiptId}`, pageWidth - 10, 38, { align: 'right' });

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(10, 44, pageWidth - 20, 45, 2, 2, 'F');
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      
      doc.text('Employee Name:', 15, 54);
      doc.text('Contact:', 15, 64);
      doc.text('Category:', 15, 74);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(teacher.name, 45, 54);
      doc.text(teacher.phone, 45, 64);
      doc.text(receiptData.reason, 45, 74);

      const col2 = pageWidth / 2 + 10;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Amount Paid:', col2, 54);
      doc.text('Outstanding Balance:', col2, 74);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(22, 163, 74);
      doc.text(`Rs. ${receiptData.amount.toLocaleString('en-IN')}`, col2 + 35, 55);
      
      doc.setFontSize(10);
      doc.setTextColor(receiptData.remainingDue > 0 ? 220 : 22, receiptData.remainingDue > 0 ? 38 : 163, receiptData.remainingDue > 0 ? 38 : 74);
      doc.text(`Rs. ${receiptData.remainingDue.toLocaleString('en-IN')}`, col2 + 35, 74);

      doc.setDrawColor(203, 213, 225);
      const sigY = pageHeight - 20;
      
      doc.line(15, sigY, 65, sigY);
      doc.line(pageWidth - 65, sigY, pageWidth - 15, sigY);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Employee Signature', 40, sigY + 5, { align: 'center' });
      doc.text('Authorized Signatory', pageWidth - 40, sigY + 5, { align: 'center' });

      doc.save(`Salary_Receipt_${receiptData.receiptId}_${teacher.name.replace(/\s+/g, '_')}.pdf`);
      toast.success('Official Payslip Exported');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const isFullyPaid = teacher.remainingDue <= 0;
  const whatsappMessage = encodeURIComponent(
    `Hello ${teacher.name}, your pending salary of ${formatCurrency(teacher.remainingDue)} is due. Please contact the admin office for details. — ${branch} Admin`
  );
  const whatsappUrl = `https://wa.me/${teacher.phone.replace(/\D/g, '')}?text=${whatsappMessage}`;

  return (
    <>
      <Modal
        isOpen={isOpen && !receiptData}
        onClose={onClose}
        title={`${teacher.name} — Salary`}
        size="sheet"
      >
        <div className="space-y-5">
          {/* Teacher Info Header */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
              {teacher.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">{teacher.name}</h3>
              <p className="text-muted text-xs">{teacher.phone}</p>
            </div>
            <Badge variant="neutral">{branch}</Badge>
          </div>

          {/* Salary Summary */}
          <div className="p-4 bg-slate-50 rounded-xl border border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Total Salary</span>
              <span className="font-semibold">{formatCurrency(teacher.totalSalary)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Given So Far</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(teacher.tillGivenFees)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Remaining Due</span>
              <span className={`font-semibold ${teacher.remainingDue > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatCurrency(teacher.remainingDue)}
              </span>
            </div>
            {teacher.overpayments > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Overpaid</span>
                <span className="font-semibold text-indigo-600">{formatCurrency(teacher.overpayments)}</span>
              </div>
            )}
          </div>

          {/* Status */}
          {isFullyPaid && !teacher.overpayments && (
            <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-center">
              <p className="text-sm font-semibold text-emerald-700">✅ Full salary paid!</p>
            </div>
          )}

          {teacher.overpayments > 0 && (
            <div className="p-4 rounded-xl border bg-indigo-50 border-indigo-200 text-center">
              <p className="text-sm font-semibold text-indigo-700">
                ℹ️ Overpaid by {formatCurrency(teacher.overpayments)}
              </p>
            </div>
          )}

          {teacher.remainingDue > 0 && (
            <div className="p-4 rounded-xl border bg-amber-50 border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">Pending Amount</p>
                  <p className="text-lg font-bold text-amber-700 mt-1">{formatCurrency(teacher.remainingDue)}</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-700">
                  Due
                </div>
              </div>
            </div>
          )}

          {/* Record Payment */}
          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-outfit)' }}>
              Record Salary Payment
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  placeholder="Enter salary payment amount"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Category / Reason</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-border rounded-xl bg-white
                    focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                >
                  {TEACHER_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              {category === 'Other' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-medium text-muted mb-1">Custom Reason</label>
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                      focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    placeholder="Specify reason..."
                  />
                </div>
              )}
              <button
                onClick={handlePayment}
                disabled={paymentMutation.isPending}
                className="w-full px-5 py-2.5 text-sm font-semibold bg-accent hover:bg-accent-hover text-white rounded-xl
                  transition-all duration-200 shadow-sm shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {paymentMutation.isPending ? 'Processing...' : 'Record Salary Payment'}
              </button>
            </div>
          </div>

          {/* WhatsApp Reminder */}
          {teacher.remainingDue > 0 && (
            <div className="pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-5 py-2.5 text-sm font-semibold
                  bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl transition-all duration-200 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Send WhatsApp Reminder
              </a>
            </div>
          )}

          {/* Transaction History Ledger */}
          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-outfit)' }}>
              Transaction History ({sortedHistory.length})
            </h3>
            {sortedHistory.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">No payments recorded yet</p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                {sortedHistory.map((tx, i) => {
                  const dateObj = new Date(tx.date);
                  const formattedDate = dateObj.toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  });
                  const formattedTime = dateObj.toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-border hover:border-accent/30 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                        #{sortedHistory.length - i}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(tx.amount)}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {formattedDate} <span className="mx-1">•</span> {formattedTime}
                        </p>
                        {tx.reason && <p className="text-[10px] text-muted mt-1 bg-white inline-block px-1.5 py-0.5 rounded border border-slate-100">{tx.reason}</p>}
                      </div>
                      <code className="text-[10px] text-muted bg-slate-200/60 px-2 py-1 rounded font-mono shrink-0 border border-slate-200">
                        {tx.receiptId || 'N/A'}
                      </code>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Receipt Preview Modal ── */}
      <Modal
        isOpen={!!receiptData}
        onClose={() => { setReceiptData(null); onClose(); }}
        title="Payment Successful"
        size="md"
      >
        {receiptData && (
          <div className="space-y-6 animate-fade-in">
            {/* Visual Preview Ticket */}
            <div className="relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
              
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Official Payslip</p>
                  <p className="text-sm font-semibold text-slate-800">{teacher.name}</p>
                </div>
                <Badge variant="success">Paid</Badge>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Amount Disbursed</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(receiptData.amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-0.5">Date</p>
                    <p className="text-sm font-medium text-slate-800">{receiptData.date.toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-100 border-dashed border-b border-slate-200"></div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Category</p>
                    <p className="text-sm font-medium text-slate-800">{receiptData.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-0.5">Receipt ID</p>
                    <p className="text-xs font-mono font-medium text-slate-600 bg-slate-100 py-0.5 px-2 rounded inline-block">
                      {receiptData.receiptId}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setReceiptData(null); onClose(); }}
                className="flex-1 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl transition-colors border border-slate-200"
              >
                Close
              </button>
              <button
                onClick={downloadReceiptPDF}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}