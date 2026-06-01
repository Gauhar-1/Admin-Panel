'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { ITeacher } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  teacher: ITeacher | null;
  branch: 'School' | 'College';
}

export default function TeacherModal({ isOpen, onClose, onSaved, teacher, branch }: TeacherModalProps) {
  const isEdit = !!teacher;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    totalSalary: '',
    joiningDate: new Date().toISOString().split('T')[0],
  });
  const [salaryPayment, setSalaryPayment] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (teacher) {
      setForm({
        name: teacher.name,
        phone: teacher.phone,
        totalSalary: String(teacher.totalSalary),
        joiningDate: new Date(teacher.joiningDate).toISOString().split('T')[0],
      });
    } else {
      setForm({
        name: '',
        phone: '',
        totalSalary: '',
        joiningDate: new Date().toISOString().split('T')[0],
      });
    }
    setSalaryPayment('');
    setError('');
    setDeleteConfirm(false);
  }, [teacher, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const totalSalary = parseFloat(form.totalSalary);
    if (isNaN(totalSalary) || totalSalary < 0) {
      setError('Total salary must be a valid positive number');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        const body: Record<string, unknown> = {
          _id: teacher._id,
          name: form.name,
          phone: form.phone,
          totalSalary,
          joiningDate: form.joiningDate,
        };

        const payment = parseFloat(salaryPayment);
        if (salaryPayment && !isNaN(payment) && payment > 0) {
          body.salaryPayment = payment;
        }

        const res = await fetch('/api/teachers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'Failed to update teacher');
          return;
        }
      } else {
        const res = await fetch('/api/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            branch,
            totalSalary,
            joiningDate: form.joiningDate,
          }),
        });

        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'Failed to create teacher');
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
    if (!teacher) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teachers?id=${teacher._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to delete teacher');
        return;
      }
      onSaved();
    } catch {
      setError('Failed to delete teacher');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Teacher — ${teacher.name}` : 'Add New Teacher'}
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
            placeholder="Teacher name"
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
          <label className="block text-sm font-medium text-foreground mb-1.5">Total Salary</label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={form.totalSalary}
            onChange={(e) => setForm({ ...form, totalSalary: e.target.value })}
            className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
              focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            placeholder="Monthly salary"
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

        {/* Salary Payment Section */}
        {isEdit && (
          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-outfit)' }}>
              Record Salary Payment
            </h3>
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
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
                <span className="font-semibold text-amber-600">{formatCurrency(teacher.remainingDue)}</span>
              </div>
              {teacher.overpayments > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Overpaid</span>
                  <span className="font-semibold text-indigo-600">{formatCurrency(teacher.overpayments)}</span>
                </div>
              )}
              <div className="pt-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={salaryPayment}
                  onChange={(e) => setSalaryPayment(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-indigo-200 rounded-xl bg-white
                    focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  placeholder="Enter salary payment amount"
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
                  Delete Teacher
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
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Teacher'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
