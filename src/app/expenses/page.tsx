'use client';

import ExpenseForm from '@/components/expenses/ExpenseForm';
import ExpenseTable from '@/components/expenses/ExpenseTable';

export default function ExpensesPage() {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-outfit)' }}>
          Expenses & Others
        </h1>
        <p className="text-muted text-sm mt-1">
          Track institutional purchases and miscellaneous expenses
        </p>
      </div>

      {/* Add Expense Form */}
      <div className="mb-6">
        <ExpenseForm />
      </div>

      {/* Expense Ledger */}
      <ExpenseTable />
    </div>
  );
}
