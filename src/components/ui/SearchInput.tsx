'use client';

import { useEffect, useState, useRef } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search...' }: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (val: string) => {
    setLocal(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(val), 300);
  };

  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-border rounded-xl
          focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
          transition-all duration-200 placeholder:text-muted/60"
      />
      {local && (
        <button
          onClick={() => handleChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
