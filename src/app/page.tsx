'use client';

import { useState, useEffect } from 'react';
import { DashboardMetrics } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (json.success) setMetrics(json.data);
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <div className="skeleton h-8 w-48 mb-2" />
          <div className="skeleton h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-6">
              <div className="skeleton h-3 w-24 mb-3" />
              <div className="skeleton h-8 w-32" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-border p-6">
          <div className="skeleton h-5 w-40 mb-4" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
              <div className="skeleton w-8 h-8 rounded-full" />
              <div className="flex-1">
                <div className="skeleton h-3 w-48 mb-2" />
                <div className="skeleton h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Incoming Revenue',
      value: metrics?.totalIncoming || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'emerald',
      gradient: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      iconBg: 'bg-emerald-100',
    },
    {
      label: 'Total Outgoing Payroll',
      value: metrics?.totalOutgoing || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'amber',
      gradient: 'from-amber-500 to-amber-600',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-700',
      iconBg: 'bg-amber-100',
    },
    {
      label: 'Miscellaneous Expenses',
      value: metrics?.totalExpenses || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      ),
      color: 'rose',
      gradient: 'from-rose-500 to-rose-600',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-700',
      iconBg: 'bg-rose-100',
    },
    {
      label: 'Net Balance (P/L)',
      value: metrics?.netBalance || 0,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: (metrics?.netBalance || 0) >= 0 ? 'emerald' : 'red',
      gradient: (metrics?.netBalance || 0) >= 0 ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-red-600',
      bgLight: (metrics?.netBalance || 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50',
      textColor: (metrics?.netBalance || 0) >= 0 ? 'text-emerald-700' : 'text-red-700',
      iconBg: (metrics?.netBalance || 0) >= 0 ? 'bg-emerald-100' : 'bg-red-100',
      isPL: true,
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-outfit)' }}>
          Dashboard
        </h1>
        <p className="text-muted text-sm mt-1">
          Financial overview across School + College + Pharma
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`p-2 rounded-xl ${card.iconBg} ${card.textColor}`}>
                {card.icon}
              </div>
            </div>
            <div className={`text-2xl font-bold ${card.textColor}`}>
              {card.isPL && (card.value as number) >= 0 && '+'}
              {formatCurrency(card.value as number)}
            </div>
            <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${card.gradient} opacity-60`} />
          </div>
        ))}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground" style={{ fontFamily: 'var(--font-outfit)' }}>
            Recent Activities
          </h2>
        </div>
        <div className="divide-y divide-border">
          {(!metrics?.recentActivities || metrics.recentActivities.length === 0) ? (
            <div className="px-6 py-12 text-center">
              <p className="text-muted text-sm">No recent activities yet</p>
              <p className="text-muted/60 text-xs mt-1">Activities will appear here as transactions happen</p>
            </div>
          ) : (
            metrics.recentActivities.map((activity, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-surface-hover transition-colors">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                    ${activity.type === 'payment' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}
                >
                  {activity.type === 'payment' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 10v1" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{activity.description}</p>
                  <p className="text-xs text-muted mt-0.5">{formatDate(activity.date)}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ${
                  activity.type === 'payment' ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {activity.type === 'payment' ? '+' : '-'}{formatCurrency(activity.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
