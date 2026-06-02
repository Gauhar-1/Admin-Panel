'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DashboardMetrics } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

async function fetchDashboard(): Promise<DashboardMetrics> {
  const res = await fetch('/api/dashboard');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch dashboard metrics');
  return json.data;
}

// ── Formal PDF Generation ──
async function generateOfficialReport(metrics: DashboardMetrics) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Official Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('INSTITUTIONAL FINANCIAL REPORT', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Official Record Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, 32, { align: 'center' });
    doc.line(15, 38, pageWidth - 15, 38);

    // 2. Executive Summary Block
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Executive Summary', 15, 50);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let yPos = 60;
    
    const summaryData = [
      ['Total Revenue (Student Fees)', `Rs. ${metrics.totalIncoming.toLocaleString('en-IN')}`],
      ['Total Payroll (Staff Salary)', `Rs. ${metrics.totalOutgoing.toLocaleString('en-IN')}`],
      ['Miscellaneous Expenses', `Rs. ${metrics.totalExpenses.toLocaleString('en-IN')}`],
      ['Net Institutional Balance', `Rs. ${metrics.netBalance.toLocaleString('en-IN')}`]
    ];

    autoTable(doc, {
      startY: 55,
      body: summaryData,
      theme: 'plain',
      styles: { fontSize: 11, cellPadding: 4 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [71, 85, 105] },
        1: { halign: 'right', textColor: [15, 23, 42] }
      },
      didParseCell: function (data: any) {
        if (data.row.index === 3) {
           data.cell.styles.fontStyle = 'bold';
           data.cell.styles.textColor = metrics.netBalance >= 0 ? [22, 163, 74] : [220, 38, 38];
        }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // 3. Activity Ledger
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Recent Transactions Ledger', 15, yPos);

    autoTable(doc, {
      startY: yPos + 5,
      head: [['Date', 'Type', 'Description', 'Amount']],
      body: metrics.recentActivities.map(a => [
        new Date(a.date).toLocaleDateString('en-IN'),
        a.type.toUpperCase(),
        a.description,
        `Rs. ${a.amount.toLocaleString('en-IN')}`
      ]),
      headStyles: { fillColor: [79, 70, 229], textColor: 255, halign: 'left' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        3: { halign: 'right', fontStyle: 'bold' }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { bottom: 40 } // Leave room for signatures
    });

    // 4. Signature Block (Bottom of last page)
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Only add signatures on the last page
      if (i === totalPages) {
        const sigY = pageHeight - 40;
        doc.setDrawColor(150);
        
        // Left Signature
        doc.line(20, sigY, 80, sigY);
        doc.text('Prepared By / System Admin', 50, sigY + 5, { align: 'center' });
        
        // Right Signature
        doc.line(pageWidth - 80, sigY, pageWidth - 20, sigY);
        doc.text('Head of Institution / Director', pageWidth - 50, sigY + 5, { align: 'center' });
      }
    }

    doc.save(`Institutional_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Official Report Generated');
  } catch (error) {
    console.error(error);
    toast.error('Failed to generate PDF');
  }
}

export default function DashboardPage() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 5000, // LIVE DASHBOARD: Auto-refreshes every 5 seconds
  });

  const [activeTab, setActiveTab] = useState<'School' | 'College' | 'Pharma'>('School');
  
  // Modals state
  const [showNetBalanceChart, setShowNetBalanceChart] = useState(false);
  const [showRevenueChart, setShowRevenueChart] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-fade-in pb-12">
        <div className="skeleton h-8 w-64 mb-6"></div>
        <div className="skeleton h-32 w-full mb-6 rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="skeleton h-32 rounded-2xl"></div>
          <div className="skeleton h-32 rounded-2xl"></div>
          <div className="skeleton h-32 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const isProfit = (metrics?.netBalance || 0) >= 0;

  return (
    <div className="animate-fade-in pb-12">
      {/* ── HEADER & ACTIONS ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'var(--font-outfit)' }}>
              Institutional Overview
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Live</span>
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-1">Real-time enterprise financial synchronization</p>
        </div>
        <button
          onClick={() => metrics && generateOfficialReport(metrics)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white rounded-xl transition-all shadow-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Download Official Report
        </button>
      </div>

      {/* ── TIER 1: GLOBAL METRICS ── */}
      <div 
        onClick={() => setShowNetBalanceChart(true)}
        className={`cursor-pointer relative rounded-2xl p-8 mb-6 border shadow-sm transition-all duration-300 hover:shadow-md overflow-hidden ${
          isProfit
            ? 'bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-teal-50 border-emerald-200'
            : 'bg-gradient-to-br from-rose-50 via-rose-50/80 to-red-50 border-rose-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              Net Institutional Balance 
              <span className="px-2 py-0.5 rounded bg-white/50 text-[10px]">Click for Trend</span>
            </span>
            <div className={`text-4xl sm:text-5xl font-bold mt-2 ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isProfit ? '+' : ''}{formatCurrency(metrics?.netBalance || 0)}
            </div>
          </div>
          <div className="hidden sm:block">
             <svg className={`w-12 h-12 ${isProfit ? 'text-emerald-500/30' : 'text-rose-500/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
             </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div onClick={() => setShowRevenueChart(true)} className="cursor-pointer bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Total Revenue</span>
          <div className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(metrics?.totalIncoming || 0)}</div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 w-3/4"></div>
          </div>
        </div>
        <div onClick={() => setShowRevenueChart(true)} className="cursor-pointer bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-rose-600 transition-colors">Total Payroll</span>
          <div className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(metrics?.totalOutgoing || 0)}</div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 w-1/2"></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Misc Expenses</span>
          <div className="text-3xl font-bold text-slate-800 mt-2">{formatCurrency(metrics?.totalExpenses || 0)}</div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 w-1/4"></div>
          </div>
        </div>
      </div>

      {/* ── TIER 2: BRANCH COMPARISON TABS ── */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-slate-800 mb-4" style={{ fontFamily: 'var(--font-outfit)' }}>Branch Insights</h2>
        
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-2">
          {['School', 'College', 'Pharma'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab 
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {metrics && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm animate-fade-in grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Active Students</p>
                  <p className="text-3xl font-bold text-slate-800">{metrics.branchData[activeTab]?.activeStudents || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Active Teachers</p>
                  <p className="text-3xl font-bold text-slate-800">{metrics.branchData[activeTab]?.activeTeachers || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pl-8">
               <p className="text-xs text-slate-400 uppercase font-bold mb-3">Branch Financials</p>
               <div className="flex justify-between items-center mb-2">
                 <span className="text-sm font-medium text-slate-600">Total Revenue</span>
                 <span className="text-sm font-bold text-emerald-600">{formatCurrency(metrics.branchData[activeTab]?.revenue || 0)}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-sm font-medium text-slate-600">Total Payroll</span>
                 <span className="text-sm font-bold text-rose-600">{formatCurrency(metrics.branchData[activeTab]?.payroll || 0)}</span>
               </div>
            </div>

            <div className="flex flex-col justify-center md:pl-8">
               <p className="text-xs text-slate-400 uppercase font-bold mb-3">Fees Collection Progress</p>
               {(() => {
                 const collected = metrics.branchData[activeTab]?.collectedFees || 0;
                 const total = metrics.branchData[activeTab]?.totalExpectedFees || 0;
                 const percent = total > 0 ? Math.round((collected / total) * 100) : 0;
                 return (
                   <>
                     <div className="flex justify-between items-center mb-2">
                       <span className="text-2xl font-bold text-slate-800">{percent}%</span>
                       <span className="text-xs text-slate-500">of {formatCurrency(total)}</span>
                     </div>
                     <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                     </div>
                   </>
                 )
               })()}
            </div>
          </div>
        )}
      </div>

      {/* ── TIER 3: CONVERSATIONAL LIVE FEED ── */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4" style={{ fontFamily: 'var(--font-outfit)' }}>Live Transaction Feed</h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {!metrics?.recentActivities?.length ? (
               <div className="p-8 text-center text-slate-500">No recent transactions recorded.</div>
            ) : (
               metrics.recentActivities.map((act, i) => (
                 <div key={i} className={`p-5 flex gap-4 hover:bg-slate-50 transition-colors border-l-4 ${act.type === 'payment' ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
                   <div className="flex-1">
                     <p className="text-sm text-slate-800 leading-relaxed">
                       {act.type === 'payment' ? '🟢 ' : '🔴 '}
                       <strong>{act.branch || 'Institution'} Branch:</strong>{' '}
                       {act.type === 'payment' ? (
                         <span>Received <strong className="text-emerald-700">{formatCurrency(act.amount)}</strong> from {act.description}.</span>
                       ) : (
                         <span>Logged expense/payroll of <strong className="text-rose-700">{formatCurrency(act.amount)}</strong> for {act.description}.</span>
                       )}
                       {act.details && <span className="ml-1 text-slate-500">{act.details}</span>}
                     </p>
                     <p className="text-xs text-slate-400 mt-2">
                       {formatDate(act.date)} at {new Date(act.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                     </p>
                   </div>
                 </div>
               ))
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      <Modal isOpen={showNetBalanceChart} onClose={() => setShowNetBalanceChart(false)} title="6-Month Net Balance Trend">
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics?.chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
              <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="NetBalance" stroke="#0ea5e9" fill="#e0f2fe" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Modal>

      <Modal isOpen={showRevenueChart} onClose={() => setShowRevenueChart(false)} title="Revenue vs Payroll Breakdown">
        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics?.chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `₹${val/1000}k`} />
              <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="SchoolRev" stackId="rev" fill="#10b981" name="School Revenue" radius={[0, 0, 0, 0]} />
              <Bar dataKey="CollegeRev" stackId="rev" fill="#34d399" name="College Revenue" radius={[0, 0, 0, 0]} />
              <Bar dataKey="PharmaRev" stackId="rev" fill="#6ee7b7" name="Pharma Revenue" radius={[4, 4, 0, 0]} />
              
              <Bar dataKey="SchoolPay" stackId="pay" fill="#f43f5e" name="School Payroll" radius={[0, 0, 0, 0]} />
              <Bar dataKey="CollegePay" stackId="pay" fill="#fb7185" name="College Payroll" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Modal>
    </div>
  );
}