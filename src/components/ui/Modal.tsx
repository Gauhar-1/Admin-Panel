'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'sheet';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const isSheet = size === 'sheet';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center animate-backdrop"
      style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={`
          bg-white w-full shadow-2xl overflow-hidden flex flex-col
          ${isSheet
            ? 'animate-slide-in-right sm:max-w-md sm:ml-auto h-full rounded-none sm:rounded-l-2xl'
            : 'animate-fade-in rounded-t-2xl sm:rounded-2xl sm:mx-4 max-h-[92vh] sm:max-h-[90vh]'
          }
          ${!isSheet && size === 'sm' ? 'sm:max-w-md' : ''}
          ${!isSheet && size === 'md' ? 'sm:max-w-lg' : ''}
          ${!isSheet && size === 'lg' ? 'sm:max-w-2xl' : ''}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border shrink-0">
          <h2
            className="text-base sm:text-lg font-bold text-foreground truncate pr-2"
            style={{ fontFamily: 'var(--font-outfit)' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-muted hover:text-foreground shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
