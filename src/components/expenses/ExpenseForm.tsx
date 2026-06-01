'use client';

import { useState } from 'react';

interface ExpenseFormProps {
  onSaved: () => void;
}

export default function ExpenseForm({ onSaved }: ExpenseFormProps) {
  const [form, setForm] = useState({
    itemName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
        setError(json.error || 'Failed to add expense');
        return;
      }

      setForm({
        itemName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        category: '',
      });
      onSaved();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-border p-4 sm:p-6 shadow-sm animate-fade-in">
      <h2 className="text-base sm:text-lg font-bold text-foreground mb-4" style={{ fontFamily: 'var(--font-outfit)' }}>
        ➕ Add Other Things
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

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
              <option value="Maintenance">Maintenance</option>
              <option value="Supplies">Supplies</option>
              <option value="Utilities">Utilities</option>
              <option value="Equipment">Equipment</option>
              <option value="Transport">Transport</option>
              <option value="Other">Other</option>
            </select>
          </div>

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

          <div className="sm:col-span-2 lg:col-span-1">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl
                transition-all duration-200 shadow-sm shadow-accent/20 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
