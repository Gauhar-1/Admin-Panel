'use client';

import { useState, useEffect, useCallback } from 'react';
import { IExpense } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import Badge from '@/components/ui/Badge';
import ExpenseModal from './ExpenseModal';

interface ExpenseTableProps {
  refreshKey: number;
}

export default function ExpenseTable({ refreshKey }: ExpenseTableProps) {
  const [expenses, setExpenses] = useState<IExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editExpense, setEditExpense] = useState<IExpense | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses');
      const json = await res.json();
      if (json.success) setExpenses(json.data);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchExpenses();
  }, [fetchExpenses, refreshKey]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId === id) {
      try {
        const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          setExpenses((prev) => prev.filter((exp) => exp._id !== id));
        }
      } catch (err) {
        console.error('Failed to delete expense:', err);
      } finally {
        setDeletingId(null);
      }
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId((curr) => (curr === id ? null : curr)), 3000);
    }
  };

  const handleEditSaved = () => {
    setEditExpense(null);
    fetchExpenses();
  };

  if (loading) return <SkeletonLoader rows={5} cols={5} />;

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
            {expenses.map((expense) => (
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
        {expenses.map((expense) => (
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
