'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = ['Maintenance', 'Supplies', 'Utilities', 'Equipment', 'Transport', 'Stationery', 'Events', 'Other'];

export default function ExpenseForm() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    itemName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    customCategory: '',
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) throw new Error('Amount must be a valid positive number');

      const finalCategory = form.category === 'Other'
        ? form.customCategory || 'Other'
        : form.category || undefined;

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
      if (!json.success) throw new Error(json.error || 'Failed to add expense');
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Expense added successfully');
      setForm({
        itemName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
        customCategory: '',
      });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate();
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-4 sm:p-6 shadow-sm animate-fade-in">
      <h2 className="text-base sm:text-lg font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-outfit)' }}>
        ➕ Add Expense
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-muted mb-1">Item Name</label>
            <input
              type="text"
              required
              value={form.itemName}
              onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              placeholder="What was bought?"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Amount (₹)</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1">Category</label>
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

          {form.category === 'Other' ? (
            <div className="animate-fade-in">
              <label className="block text-xs font-medium text-muted mb-1">Custom Category</label>
              <input
                type="text"
                value={form.customCategory}
                onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                placeholder="Specify..."
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
              />
            </div>
          )}

          <div className="sm:col-span-2 lg:col-span-1">
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="w-full px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl
                transition-all duration-200 shadow-sm shadow-accent/20 disabled:opacity-50"
            >
              {addMutation.isPending ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </div>

        {/* Show date input if 'Other' is selected (since it displaced the date field) */}
        {form.category === 'Other' && (
          <div className="mt-3 max-w-xs animate-fade-in">
            <label className="block text-xs font-medium text-muted mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-border rounded-xl
                focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
          </div>
        )}
      </form>
    </div>
  );
}
