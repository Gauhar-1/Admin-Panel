interface BadgeProps {
  variant: 'success' | 'danger' | 'warning' | 'neutral' | 'accent';
  children: React.ReactNode;
}

const variantClasses = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  neutral: 'bg-slate-50 text-slate-700 border-slate-200',
  accent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full border ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
