'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { IExpense } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import Badge from '@/components/ui/Badge';
import ExpenseModal from './ExpenseModal';
import { generateIndividualExpensePDF, generateExpenseTablePDF } from '@/lib/pdf';

async function fetchExpenses(): Promise<IExpense[]> {
  const res = await fetch('/api/expenses');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch expenses');
  return json.data;
}

export default function ExpenseTable() {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<IExpense | null>(null);
  const [duration, setDuration] = useState<string>('All Time');

  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery<IExpense[]>({
    queryKey: ['expenses'],
    queryFn: fetchExpenses,
  });

  const filteredExpenses = useMemo(() => {
    if (duration === 'All Time') return expenses;
    
    const now = new Date();
    const pastDate = new Date();
    
    if (duration === 'Last 30 Days') {
      pastDate.setDate(now.getDate() - 30);
    } else if (duration === 'Last 3 Months') {
      pastDate.setMonth(now.getMonth() - 3);
    } else if (duration === 'Last 6 Months') {
      pastDate.setMonth(now.getMonth() - 6);
    }
    
    return expenses.filter((exp) => new Date(exp.date) >= pastDate);
  }, [expenses, duration]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Expense deleted');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete expense');
    },
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId === id) {
      deleteMutation.mutate(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId((curr) => (curr === id ? null : curr)), 3000);
    }
  };

  const handleEditSaved = () => {
    setEditExpense(null);
    // React Query auto-refetches via invalidation inside ExpenseModal
  };

  if (isLoading) return <SkeletonLoader rows={5} cols={5} />;

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-border animate-fade-in">
        <svg className="w-12 h-12 text-muted/30 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
        <p className="text-muted text-sm">No expenses recorded yet</p>
        <p className="text-muted/60 text-xs mt-1">Use the form above to add your first expense</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Controls Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground whitespace-nowrap">Date Range:</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          >
            <option value="All Time">All Time</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 3 Months">Last 3 Months</option>
            <option value="Last 6 Months">Last 6 Months</option>
          </select>
        </div>
        <button
          onClick={() => generateExpenseTablePDF(filteredExpenses, duration)}
          disabled={filteredExpenses.length === 0}
          className="px-4 py-2 bg-white border border-border text-sm font-medium text-foreground rounded-xl hover:bg-surface-hover transition-all duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export Table to PDF
        </button>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-border animate-fade-in">
          <p className="text-muted text-sm">No expenses found for {duration}</p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-white animate-fade-in">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Date</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((expense) => (
              <tr key={expense._id} className="!cursor-default">
                <td>
                  <div className="font-medium text-foreground">{expense.itemName}</div>
                </td>
                <td>
                  {expense.category ? (
                    <Badge variant="neutral">{expense.category}</Badge>
                  ) : (
                    <span className="text-muted text-sm">General</span>
                  )}
                </td>
                <td className="text-muted">{formatDate(expense.date)}</td>
                <td className="text-right">
                  <span className="font-semibold text-red-600">{formatCurrency(expense.amount)}</span>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => generateIndividualExpensePDF(expense)}
                      className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                      title="Save as PDF"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setEditExpense(expense)}
                      className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                      title="Edit expense"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, expense._id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        deletingId === expense._id
                          ? 'bg-red-500 text-white'
                          : 'text-muted hover:text-red-500 hover:bg-red-50'
                      }`}
                      title={deletingId === expense._id ? 'Click again to confirm' : 'Delete expense'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Card View ── */}
      <div className="md:hidden space-y-3 animate-fade-in">
        {filteredExpenses.map((expense) => (
          <div
            key={expense._id}
            className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">{expense.itemName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {expense.category ? (
                    <Badge variant="neutral">{expense.category}</Badge>
                  ) : (
                    <span className="text-muted text-xs">General</span>
                  )}
                  <span className="text-muted text-xs">· {formatDate(expense.date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  onClick={() => generateIndividualExpensePDF(expense)}
                  className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                  title="Save as PDF"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
                <button
                  onClick={() => setEditExpense(expense)}
                  className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => handleDelete(e, expense._id)}
                  className={`p-2 rounded-lg transition-all ${
                    deletingId === expense._id
                      ? 'bg-red-500 text-white'
                      : 'text-muted hover:text-red-500 hover:bg-red-50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted">Amount</span>
              <span className="font-bold text-red-600 text-sm">{formatCurrency(expense.amount)}</span>
            </div>

            {deletingId === expense._id && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-center">
                <span className="text-xs text-red-600 font-medium">Tap delete again to confirm removal</span>
              </div>
            )}
          </div>
        ))}
      </div>

        </>
      )}

      {/* Edit Modal */}
      {editExpense && (
        <ExpenseModal
          isOpen={!!editExpense}
          onClose={() => setEditExpense(null)}
          onSaved={handleEditSaved}
          expense={editExpense}
        />
      )}
    </>
  );
}
