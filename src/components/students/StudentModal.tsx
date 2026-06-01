'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { IStudent } from '@/types';
import { formatCurrency } from '@/lib/utils';
import FeeReceiptModal from './FeeReceiptModal';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  student: IStudent | null;
  branch: 'School' | 'College' | 'Pharma';
}

export default function StudentModal({ isOpen, onClose, onSaved, student, branch }: StudentModalProps) {
  const isEdit = !!student;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    totalFees: '',
    joiningDate: new Date().toISOString().split('T')[0],
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    receiptId: string;
    amount: number;
    studentName: string;
    branch: string;
    remaining: number;
    date: Date;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        name: student.name,
        phone: student.phone,
        totalFees: String(student.totalFees),
        joiningDate: new Date(student.joiningDate).toISOString().split('T')[0],
      });
    } else {
      setForm({
        name: '',
        phone: '',
        totalFees: '',
        joiningDate: new Date().toISOString().split('T')[0],
      });
    }
    setPaymentAmount('');
    setError('');
    setDeleteConfirm(false);
  }, [student, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const totalFees = parseFloat(form.totalFees);
    if (isNaN(totalFees) || totalFees < 0) {
      setError('Total fees must be a valid positive number');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const body: Record<string, unknown> = {
          _id: student._id,
          name: form.name,
          phone: form.phone,
          totalFees,
          joiningDate: form.joiningDate,
        };

        const payment = parseFloat(paymentAmount);
        if (paymentAmount && !isNaN(payment) && payment > 0) {
          body.paymentAmount = payment;
        }

        const res = await fetch('/api/students', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'Failed to update student');
          return;
        }

        // Show receipt if payment was made
        if (json.receiptId && payment > 0) {
          const updatedStudent = json.data;
          setReceiptData({
            receiptId: json.receiptId,
            amount: payment,
            studentName: updatedStudent.name,
            branch: updatedStudent.branch,
            remaining: updatedStudent.remainingFees,
            date: new Date(),
          });
          setShowReceipt(true);
          onSaved();
          return;
        }
      } else {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            branch,
            totalFees,
            joiningDate: form.joiningDate,
          }),
        });

        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'Failed to create student');
          return;
        }
      }

      onSaved();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!student) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/students?id=${student._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to delete student');
        return;
      }
      onSaved();
    } catch {
      setError('Failed to delete student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEdit ? `Edit Student — ${student.name}` : 'Add New Student'}
        size="sheet"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              placeholder="Student name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              placeholder="Phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Total Fees</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={form.totalFees}
              onChange={(e) => setForm({ ...form, totalFees: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              placeholder="Total fees amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Joining Date</label>
            <input
              type="date"
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>

          {/* Fee Payment Section (Edit Mode) */}
          {isEdit && (
            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-outfit)' }}>
                Record Fee Payment
              </h3>
              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Total Fees</span>
                  <span className="font-semibold">{formatCurrency(student.totalFees)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Paid So Far</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(student.tillFeesPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Remaining</span>
                  <span className="font-semibold text-red-600">{formatCurrency(student.remainingFees)}</span>
                </div>
                <div className="pt-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm border border-indigo-200 rounded-xl bg-white
                      focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    placeholder="Enter payment amount"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            {isEdit ? (
              <div>
                {deleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600">Confirm delete?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving}
                      className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Yes, Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      className="px-3 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="px-3 py-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    Delete Student
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm text-muted hover:text-foreground bg-surface-hover rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 text-sm font-semibold bg-accent hover:bg-accent-hover text-white rounded-xl
                  transition-all duration-200 shadow-sm shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : isEdit ? (paymentAmount ? 'Save & Generate Receipt' : 'Save Changes') : 'Add Student'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Receipt Modal */}
      {receiptData && (
        <FeeReceiptModal
          isOpen={showReceipt}
          onClose={() => { setShowReceipt(false); setReceiptData(null); onClose(); }}
          receiptId={receiptData.receiptId}
          amount={receiptData.amount}
          studentName={receiptData.studentName}
          branch={receiptData.branch}
          remaining={receiptData.remaining}
          date={receiptData.date}
        />
      )}
    </>
  );
}
