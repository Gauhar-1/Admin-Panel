'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import { IStudent } from '@/types';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  student: IStudent | null;
  branch: 'School' | 'College' | 'Pharma';
}

export default function StudentModal({ isOpen, onClose, onSaved, student, branch }: StudentModalProps) {
  const isEdit = !!student;
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    totalFees: '',
    joiningDate: new Date().toISOString().split('T')[0],
    installmentMonths: '',
  });
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        name: student.name,
        phone: student.phone,
        totalFees: String(student.totalFees),
        joiningDate: new Date(student.joiningDate).toISOString().split('T')[0],
        installmentMonths: (student.installmentMonths || 1).toString(),
      });
    } else {
      setForm({
        name: '',
        phone: '',
        totalFees: '',
        joiningDate: new Date().toISOString().split('T')[0],
        installmentMonths: '',
      });
    }
    setError('');
    setDeleteConfirm(false);
  }, [student, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const totalFees = parseFloat(form.totalFees);
      if (isNaN(totalFees) || totalFees < 0) throw new Error('Total fees must be a valid positive number');

      if (isEdit) {
        console.log("Form installment months ",form.installmentMonths)
        const res = await fetch('/api/students', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            _id: student._id,
            name: form.name,
            phone: form.phone,
            totalFees,
            joiningDate: form.joiningDate,
            installmentMonths: Number(form.installmentMonths) || 1,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to update student');
        return json;
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
            installmentMonths: Number(form.installmentMonths) || 1,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to create student');
        return json;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(isEdit ? 'Student updated!' : 'Student added!');
      onSaved();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!student) throw new Error('No student selected');
      const res = await fetch(`/api/students?id=${student._id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to delete student');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Student deleted');
      onSaved();
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    saveMutation.mutate();
  };

  const isSaving = saveMutation.isPending || deleteMutation.isPending;

  return (
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

        <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Duration (Months)</label>
              <input
                type="number"
                min="1"
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                value={form.installmentMonths}
                onChange={(e) => setForm({ ...form, installmentMonths: e.target.value })}
              />
            </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          {isEdit ? (
            <div>
              {deleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">Confirm delete?</span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    disabled={isSaving}
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
              disabled={isSaving}
              className="px-5 py-2.5 text-sm font-semibold bg-accent hover:bg-accent-hover text-white rounded-xl
                transition-all duration-200 shadow-sm shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Student'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
