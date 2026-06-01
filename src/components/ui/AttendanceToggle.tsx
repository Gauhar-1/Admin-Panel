'use client';

interface AttendanceToggleProps {
  status: 'Present' | 'Absent' | 'Unmarked';
  onChange: (status: 'Present' | 'Absent') => void;
  disabled?: boolean;
}

export default function AttendanceToggle({ status, onChange, disabled }: AttendanceToggleProps) {
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => onChange('Present')}
        disabled={disabled}
        className={`
          px-2.5 py-1 text-xs font-semibold rounded-l-lg border transition-all duration-200
          ${
            status === 'Present'
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-200'
              : 'bg-white text-muted border-border hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        P
      </button>
      <button
        onClick={() => onChange('Absent')}
        disabled={disabled}
        className={`
          px-2.5 py-1 text-xs font-semibold rounded-r-lg border transition-all duration-200
          ${
            status === 'Absent'
              ? 'bg-red-500 text-white border-red-500 shadow-sm shadow-red-200'
              : 'bg-white text-muted border-border hover:bg-red-50 hover:text-red-600 hover:border-red-200'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        A
      </button>
    </div>
  );
}
