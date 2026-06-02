'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import { IStudent } from '@/types';
import { formatCurrency, formatDate, generateReceiptId } from '@/lib/utils';
import FeeReceiptModal from './FeeReceiptModal';
import Badge from '../ui/Badge';

interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: IStudent;
  branch: 'School' | 'College' | 'Pharma';
}

const STUDENT_CATEGORIES = ['Tuition', 'Exam Fee', 'Lab Fee', 'Transport', 'Hostel', 'Other'];

function getNextInstallmentDate(student: IStudent): Date {
  if (student.installments.length > 0) {
    const lastDate = new Date(student.installments[student.installments.length - 1].date);
    lastDate.setDate(lastDate.getDate() + 30);
    return lastDate;
  }
  const joinDate = new Date(student.joiningDate);
  joinDate.setDate(joinDate.getDate() + 30);
  return joinDate;
}

function getDaysInfo(nextDate: Date): { days: number; isOverdue: boolean } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(nextDate);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return { days: Math.abs(days), isOverdue: days < 0 };
}

export default function InstallmentModal({ isOpen, onClose, student, branch }: InstallmentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [category, setCategory] = useState('Tuition');
  const [customCategory, setCustomCategory] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    receiptId: string;
    amount: number;
    studentName: string;
    branch: string;
    remaining: number;
    date: Date;
  } | null>(null);

  const queryClient = useQueryClient();

  // --- New Logic: Installment Calculations ---
  const totalMonths = (student.installmentMonths as number) || 1;
  const monthlyInstallment = student.totalFees / totalMonths;
  // Use Math.ceil to account for partial payments leaving fractional installments
  const remainingInstallmentsCount = Math.ceil(student.remainingFees / monthlyInstallment);

  const paymentMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: student._id,
          name: student.name,
          phone: student.phone,
          totalFees: student.totalFees,
          paymentAmount: amount,
          paymentReason: reason,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to record payment');
      return json;
    },
    onSuccess: (json) => {
      const payment = parseFloat(paymentAmount);
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`Payment of ${formatCurrency(payment)} recorded!`);
      setPaymentAmount('');
      setCategory('Tuition');
      setCustomCategory('');

      if (json.receiptId) {
        setReceiptData({
          receiptId: json.receiptId,
          amount: payment,
          studentName: student.name,
          branch: student.branch,
          remaining: json.data.remainingFees,
          date: new Date(),
        });
        setShowReceipt(true);
      }
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

  const nextDate = getNextInstallmentDate(student);
  const { days, isOverdue } = getDaysInfo(nextDate);
  const isFullyPaid = student.remainingFees <= 0;

  const whatsappMessage = encodeURIComponent(
    `Hello ${student.name}, your next installment of ${formatCurrency(monthlyInstallment)} is due on ${formatDate(nextDate)}. Please ignore if already paid. — ${branch} Admin`
  );
  const whatsappUrl = `https://wa.me/${student.phone.replace(/\D/g, '')}?text=${whatsappMessage}`;

  // Sort installments by date desc for display
  const sortedInstallments = [...student.installments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${student.name} — Installments`}
        size="sheet"
      >
        <div className="space-y-5">
          {/* Student Info Header */}
          <div className="flex items-center gap-3 pb-2">
            <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
              {student.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">{student.name}</h3>
              <p className="text-muted text-xs">{student.phone}</p>
            </div>
            <Badge variant="neutral">{branch}</Badge>
          </div>

          {/* Premium UI: 2-Column Fee & Plan Summary */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total & Paid Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-border space-y-3">
              <div>
                <p className="text-xs text-muted font-medium mb-0.5">Total Course Fee</p>
                <p className="font-semibold text-foreground">{formatCurrency(student.totalFees)}</p>
              </div>
              <div className="h-px bg-border w-full" />
              <div>
                <p className="text-xs text-muted font-medium mb-0.5">Paid So Far</p>
                <p className="font-semibold text-emerald-600">{formatCurrency(student.tillFeesPaid)}</p>
              </div>
            </div>

            {/* Plan & Remaining Card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-border space-y-3">
              <div>
                <p className="text-xs text-muted font-medium flex justify-between items-center mb-0.5">
                  <span>Installment Plan</span>
                  <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
                    {totalMonths} Months
                  </Badge>
                </p>
                <p className="font-semibold text-accent">{formatCurrency(monthlyInstallment)} <span className="text-xs text-muted font-normal">/mo</span></p>
              </div>
              <div className="h-px bg-border w-full" />
              <div>
                <p className="text-xs text-muted font-medium flex justify-between items-center mb-0.5">
                  <span>Remaining Balance</span>
                  {!isFullyPaid && (
                    <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                      {remainingInstallmentsCount} left
                    </span>
                  )}
                </p>
                <p className={`font-semibold ${student.remainingFees > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(student.remainingFees)}
                </p>
              </div>
            </div>
          </div>

          {/* Next Installment & Countdown */}
          {!isFullyPaid && (
            <div className={`p-4 rounded-xl border ${
              isOverdue
                ? 'bg-rose-50 border-rose-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">Next Installment Due</p>
                  <p className="text-sm font-semibold mt-1">{formatDate(nextDate)}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  isOverdue
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {isOverdue ? (
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {days} Days Overdue
                    </span>
                  ) : (
                    `${days} Days Left`
                  )}
                </div>
              </div>
            </div>
          )}

          {isFullyPaid && (
            <div className="p-4 rounded-xl border bg-emerald-50 border-emerald-200 text-center">
              <p className="text-sm font-semibold text-emerald-700">✅ All fees fully paid!</p>
            </div>
          )}

          {/* Record Payment */}
          {!isFullyPaid && (
            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-outfit)' }}>
                Record Payment
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
                    placeholder={`Suggested: ${monthlyInstallment.toString()}`}
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
                    {STUDENT_CATEGORIES.map((cat) => (
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
                  {paymentMutation.isPending ? 'Processing...' : 'Record Payment & Generate Receipt'}
                </button>
              </div>
            </div>
          )}

          {/* WhatsApp Reminder */}
          {!isFullyPaid && (
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
          )}

          {/* Detailed Payment History */}
          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-outfit)' }}>
              Payment History ({student.installments.length})
            </h3>
            {sortedInstallments.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">No payments recorded yet</p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                {sortedInstallments.map((inst, i) => {
                  const dateObj = new Date(inst.date);
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
                        #{sortedInstallments.length - i}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(inst.amount)}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {formattedDate} <span className="mx-1">•</span> {formattedTime}
                        </p>
                      </div>
                      <code className="text-[10px] text-muted bg-slate-200/60 px-2 py-1 rounded font-mono shrink-0 border border-slate-200">
                        {inst.receiptId}
                      </code>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Receipt Modal */}
      {receiptData && (
        <FeeReceiptModal
          isOpen={showReceipt}
          onClose={() => { setShowReceipt(false); setReceiptData(null); }}
          receiptId={receiptData.receiptId}
          amount={receiptData.amount}
          studentName={receiptData.studentName}
          branch={receiptData.branch}
          remaining={receiptData.remaining}
          date={receiptData.date}
          student={student}
        />
      )}
    </>
  );
}