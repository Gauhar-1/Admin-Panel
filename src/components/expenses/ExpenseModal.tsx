'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { IExpense } from '@/types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  expense: IExpense;
}

export default function ExpenseModal({ isOpen, onClose, onSaved, expense }: ExpenseModalProps) {
  const [form, setForm] = useState({
    itemName: '',
    amount: '',
    date: '',
    category: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setForm({
        itemName: expense.itemName,
        amount: String(expense.amount),
        date: new Date(expense.date).toISOString().split('T')[0],
        category: expense.category || '',
      });
    }
    setError('');
  }, [expense, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a valid positive number');
      return;
    }

    setSaving(true);
    try {
      // Delete old and create new (since expense API doesn't have PUT)
      await fetch(`/api/expenses?id=${expense._id}`, { method: 'DELETE' });
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: form.itemName,
          amount,
          date: form.date,
          category: form.category || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to update expense');
        return;
      }
      onSaved();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Expense`} size="md">
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
            <option value="Maintenance">Maintenance</option>
            <option value="Supplies">Supplies</option>
            <option value="Utilities">Utilities</option>
            <option value="Equipment">Equipment</option>
            <option value="Transport">Transport</option>
            <option value="Other">Other</option>
          </select>
        </div>

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
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold bg-accent hover:bg-accent-hover text-white rounded-xl
              transition-all duration-200 shadow-sm shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
