'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import { IExpense } from '@/types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  expense: IExpense;
}

const EXPENSE_CATEGORIES = ['Maintenance', 'Supplies', 'Utilities', 'Equipment', 'Transport', 'Stationery', 'Events', 'Other'];

export default function ExpenseModal({ isOpen, onClose, onSaved, expense }: ExpenseModalProps) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    itemName: '',
    amount: '',
    date: '',
    category: '',
    customCategory: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (expense) {
      const cat = expense.category || '';
      const isCustom = cat && !EXPENSE_CATEGORIES.includes(cat) && cat !== 'General';
      setForm({
        itemName: expense.itemName,
        amount: String(expense.amount),
        date: new Date(expense.date).toISOString().split('T')[0],
        category: isCustom ? 'Other' : cat,
        customCategory: isCustom ? cat : '',
      });
    }
    setError('');
  }, [expense, isOpen]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) throw new Error('Amount must be a valid positive number');

      const finalCategory = form.category === 'Other'
        ? form.customCategory || 'Other'
        : form.category || undefined;

      // Delete old and create new (expense API doesn't have PUT)
      await fetch(`/api/expenses?id=${expense._id}`, { method: 'DELETE' });
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: form.itemName,
          amount,
          date: form.date,
          category: finalCategory,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update expense');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Expense updated');
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Expense" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Item Name</label>
          <input
            type="text"
            required
            value={form.itemName}
            onChange={(e) => setForm({ ...form, itemName: e.target.value })}
            className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
              focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Amount (₹)</label>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
              focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full px-4 py-2.5 text-sm border border-border rounded-xl bg-white
              focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          >
            <option value="">General</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {form.category === 'Other' && (
          <div className="animate-fade-in">
            <label className="block text-sm font-medium text-foreground mb-1.5">Custom Category</label>
            <input
              type="text"
              value={form.customCategory}
              onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              placeholder="Specify category..."
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
              focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm text-muted hover:text-foreground bg-surface-hover rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-5 py-2.5 text-sm font-semibold bg-accent hover:bg-accent-hover text-white rounded-xl
              transition-all duration-200 shadow-sm shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
