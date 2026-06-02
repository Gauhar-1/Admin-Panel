'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ITeacher } from '@/types';
import { formatCurrency } from '@/lib/utils';
import SearchInput from '@/components/ui/SearchInput';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import Badge from '@/components/ui/Badge';
import TeacherModal from './TeacherModal';
import TeacherActionModal from './TeacherActionModal';

interface TeacherTableProps {
  branch: 'School' | 'College' | 'Pharma';
}

async function fetchTeachers(branch: string, search: string): Promise<ITeacher[]> {
  const params = new URLSearchParams({ branch });
  if (search) params.set('search', search);
  const res = await fetch(`/api/teachers?${params}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch teachers');
  return json.data;
}

// ── Enterprise Institutional Report for Entire Branch ──
async function generateTablePDF(teachers: ITeacher[], branch: string) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Official Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Deep Slate
    doc.text('MASTER PAYROLL RECORD', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`${branch.toUpperCase()} DIVISION`, pageWidth / 2, 33, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 40, pageWidth - 14, 40);

    // 2. Executive Summary Metrics
    const totalPayroll = teachers.reduce((acc, t) => acc + t.totalSalary, 0);
    const totalPaid = teachers.reduce((acc, t) => acc + t.tillGivenFees, 0);
    const totalDue = teachers.reduce((acc, t) => acc + t.remainingDue, 0);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 48);
    doc.text(`Total Staff: ${teachers.length}`, 14, 54);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Payroll: Rs. ${totalPayroll.toLocaleString('en-IN')}`, pageWidth - 14, 48, { align: 'right' });
    doc.setTextColor(22, 163, 74); // Green
    doc.text(`Total Disbursed: Rs. ${totalPaid.toLocaleString('en-IN')}`, pageWidth - 14, 54, { align: 'right' });
    doc.setTextColor(220, 38, 38); // Red
    doc.text(`Total Dues: Rs. ${totalDue.toLocaleString('en-IN')}`, pageWidth - 14, 60, { align: 'right' });

    // 3. Data Table
    autoTable(doc, {
      startY: 68,
      head: [['Staff Name', 'Contact', 'Total Salary', 'Disbursed', 'Dues', 'Overpaid']],
      body: teachers.map((t) => [
        t.name,
        t.phone,
        `Rs. ${t.totalSalary.toLocaleString('en-IN')}`,
        `Rs. ${t.tillGivenFees.toLocaleString('en-IN')}`,
        `Rs. ${t.remainingDue.toLocaleString('en-IN')}`,
        t.overpayments > 0 ? `Rs. ${t.overpayments.toLocaleString('en-IN')}` : '—',
      ]),
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: 'center', fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center', textColor: [22, 163, 74] },
        4: { halign: 'center', textColor: [220, 38, 38] },
        5: { halign: 'center' }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { bottom: 40 }
    });

    // 4. Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('This is a computer-generated institutional document.', pageWidth / 2, pageHeight - 12, { align: 'center' });
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 12, { align: 'right' });
    }

    doc.save(`${branch}_Master_Payroll_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Official Master Report Exported');
  } catch (error) {
    console.error(error);
    toast.error('Failed to generate PDF');
  }
}

// ── Enterprise Institutional Report for Individual Teacher ──
async function generateTeacherPDF(teacher: ITeacher) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Official Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Deep Slate
    doc.text('OFFICIAL STAFF RECORD', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`${teacher.branch.toUpperCase()} DIVISION`, pageWidth / 2, 33, { align: 'center' });

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 40, pageWidth - 14, 40);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 46);
    doc.text(`Ref ID: STF-${teacher._id?.toString().slice(-6).toUpperCase() || 'SYS'}`, pageWidth - 14, 46, { align: 'right' });

    // 2. Dossier Box
    doc.setFillColor(248, 250, 252); 
    doc.roundedRect(14, 52, pageWidth - 28, 45, 3, 3, 'F');
    
    let startY = 62;
    const col1X = 20;
    const col2X = pageWidth / 2 + 10;

    const addGridItem = (label: string, value: string, x: number, y: number, isBoldValue = false) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${label}:`, x, y);
      
      doc.setFont('helvetica', isBoldValue ? 'bold' : 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(value, x + 35, y); 
    };

    addGridItem('Full Name', teacher.name, col1X, startY, true);
    addGridItem('Phone', teacher.phone, col1X, startY + 10);
    
    addGridItem('Total Salary', `Rs. ${teacher.totalSalary.toLocaleString('en-IN')}`, col2X, startY);
    addGridItem('Disbursed', `Rs. ${teacher.tillGivenFees.toLocaleString('en-IN')}`, col2X, startY + 10);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Dues:', col2X, startY + 20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(teacher.remainingDue > 0 ? 220 : 22, teacher.remainingDue > 0 ? 38 : 163, teacher.remainingDue > 0 ? 38 : 74);
    doc.text(`Rs. ${teacher.remainingDue.toLocaleString('en-IN')}`, col2X + 35, startY + 20);

    if (teacher.overpayments > 0) {
      doc.setTextColor(79, 70, 229); // Indigo for overpayment
      doc.text(`Overpaid: Rs. ${teacher.overpayments.toLocaleString('en-IN')}`, col2X, startY + 30);
    }

    // 3. Transaction History Ledger (if applicable/exists in your schema)
    let currentY = 115;
    
    // Type checking for generic install/payments array if you add it later
    const transactions = (teacher as any).installments || (teacher as any).payments || [];
    
    if (transactions.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Disbursement Ledger', 14, currentY);
      currentY += 6;

      const { default: autoTable } = await import('jspdf-autotable');
      autoTable(doc, {
        startY: currentY,
        head: [['#', 'Date', 'Amount Processed', 'System Receipt ID']],
        body: transactions.map((tx: any, i: number) => [
          `#${String(i + 1).padStart(2, '0')}`,
          new Date(tx.date).toLocaleDateString('en-IN'),
          `Rs. ${tx.amount.toLocaleString('en-IN')}`,
          tx.receiptId || 'N/A',
        ]),
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [30, 41, 59], halign: 'center' },
        columnStyles: { 0: { halign: 'center' }, 2: { halign: 'center', fontStyle: 'bold' }, 3: { halign: 'center' } }
      });
      currentY = (doc as any).lastAutoTable.finalY + 20;
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('Detailed disbursement records not available or empty.', 14, currentY);
      currentY += 20;
    }

    // 4. Signatures
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 40;
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(20, currentY + 30, 80, currentY + 30);
    doc.line(pageWidth - 80, currentY + 30, pageWidth - 20, currentY + 30);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('System Administrator', 50, currentY + 36, { align: 'center' });
    doc.text('Head of Institution / Director', pageWidth - 50, currentY + 36, { align: 'center' });

    doc.save(`Staff_Report_${teacher.name.replace(/\s+/g, '_')}.pdf`);
    toast.success('Official Record Exported');
  } catch (error) {
    console.error(error);
    toast.error('Failed to generate official PDF');
  }
}

export default function TeacherTable({ branch }: TeacherTableProps) {
  const [search, setSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<ITeacher | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: teachers = [], isLoading } = useQuery<ITeacher[]>({
    queryKey: ['teachers', branch, search],
    queryFn: () => fetchTeachers(branch, search),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teachers?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teachers', branch] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Teacher deleted successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete teacher');
    },
  });

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId === id) {
      deleteMutation.mutate(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId((curr) => (curr === id ? null : curr)), 3000);
    }
  }, [deletingId, deleteMutation]);

  const openAdd = () => {
    setSelectedTeacher(null);
    setShowEditModal(true);
  };

  const openEdit = (e: React.MouseEvent, teacher: ITeacher) => {
    e.stopPropagation();
    setSelectedTeacher(teacher);
    setShowEditModal(true);
  };

  const openAction = (teacher: ITeacher) => {
    setSelectedTeacher(teacher);
    setShowActionModal(true);
  };

  const handleSaved = () => {
    setShowEditModal(false);
    setSelectedTeacher(null);
    queryClient.invalidateQueries({ queryKey: ['teachers', branch] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="w-full sm:w-72">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name or phone..."
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {teachers.length > 0 && (
            <button
              onClick={() => generateTablePDF(teachers, branch)}
              className="px-3 py-2.5 bg-white border border-border text-sm font-medium text-foreground rounded-xl
                hover:bg-surface-hover transition-all duration-200 shadow-sm flex items-center gap-2 shrink-0"
              title="Export Master Payroll PDF"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Official PDF Report</span>
            </button>
          )}
          <button
            onClick={openAdd}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl
              transition-all duration-200 shadow-sm shadow-accent/20 hover:shadow-md hover:shadow-accent/30
              flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Teacher
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonLoader rows={5} cols={6} />
      ) : teachers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-border">
          <svg className="w-12 h-12 text-muted/30 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p className="text-muted text-sm">No teachers found</p>
          <p className="text-muted/60 text-xs mt-1">Add your first teacher to get started</p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-surface-hover/50 text-sm text-muted">
                  <th className="p-4 font-medium">Staff Name</th>
                  <th className="p-4 font-medium">Contact Number</th>
                  <th className="p-4 font-medium text-center">Total Salary</th>
                  <th className="p-4 font-medium text-center">Disbursed</th>
                  <th className="p-4 font-medium text-center">Dues</th>
                  <th className="p-4 font-medium text-center">Overpayments</th>
                  <th className="p-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {teachers.map((teacher) => (
                  <tr 
                    key={teacher._id} 
                    onClick={() => openAction(teacher)}
                    className="border-b border-border last:border-0 hover:bg-surface-hover/30 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="font-medium text-foreground">{teacher.name}</div>
                    </td>
                    <td className="p-4 text-muted">{teacher.phone}</td>
                    <td className="p-4 text-center font-medium">{formatCurrency(teacher.totalSalary)}</td>
                    <td className="p-4 text-center">
                      <Badge variant="success">{formatCurrency(teacher.tillGivenFees)}</Badge>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={teacher.remainingDue > 0 ? 'warning' : 'success'}>
                        {formatCurrency(teacher.remainingDue)}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      {teacher.overpayments > 0 ? (
                        <Badge variant="accent">{formatCurrency(teacher.overpayments)}</Badge>
                      ) : (
                        <span className="text-muted text-sm">—</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => generateTeacherPDF(teacher)}
                          className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                          title="Export official staff PDF"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => openEdit(e, teacher)}
                          className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                          title="Edit teacher"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, teacher._id)}
                          className={`p-1.5 rounded-lg transition-all ${
                            deletingId === teacher._id
                              ? 'bg-red-500 text-white'
                              : 'text-muted hover:text-red-500 hover:bg-red-50'
                          }`}
                          title={deletingId === teacher._id ? 'Click again to confirm' : 'Delete teacher'}
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
          <div className="md:hidden space-y-3">
            {teachers.map((teacher) => (
              <div
                key={teacher._id}
                onClick={() => openAction(teacher)}
                className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{teacher.name}</h3>
                    <p className="text-muted text-xs mt-0.5">{teacher.phone}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => generateTeacherPDF(teacher)}
                      className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => openEdit(e, teacher)}
                      className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, teacher._id)}
                      className={`p-2 rounded-lg transition-all ${
                        deletingId === teacher._id
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

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-muted text-xs block">Total Salary</span>
                    <span className="text-foreground text-xs font-semibold">{formatCurrency(teacher.totalSalary)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted text-xs block">Paid</span>
                    <Badge variant="success">{formatCurrency(teacher.tillGivenFees)}</Badge>
                  </div>
                  <div>
                    <span className="text-muted text-xs block">Due</span>
                    <Badge variant={teacher.remainingDue > 0 ? 'warning' : 'success'}>
                      {formatCurrency(teacher.remainingDue)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-muted text-xs block">Overpayments</span>
                    {teacher.overpayments > 0 ? (
                      <Badge variant="accent">{formatCurrency(teacher.overpayments)}</Badge>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </div>
                </div>

                {deletingId === teacher._id && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-center" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-red-600 font-medium">Tap delete again to confirm removal</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Modal */}
      <TeacherModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedTeacher(null); }}
        onSaved={handleSaved}
        teacher={selectedTeacher}
        branch={branch}
      />

      {/* Action Modal */}
      {selectedTeacher && (
        <TeacherActionModal
          isOpen={showActionModal}
          onClose={() => { setShowActionModal(false); setSelectedTeacher(null); }}
          teacher={selectedTeacher}
          branch={branch}
        />
      )}
    </div>
  );
}