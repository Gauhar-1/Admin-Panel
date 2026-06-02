'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { IStudent } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import SearchInput from '@/components/ui/SearchInput';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import Badge from '@/components/ui/Badge';
import StudentModal from './StudentModal';
import InstallmentModal from './InstallmentModal';

interface StudentTableProps {
  branch: 'School' | 'College' | 'Pharma';
}

async function fetchStudents(branch: string, search: string): Promise<IStudent[]> {
  const params = new URLSearchParams({ branch });
  if (search) params.set('search', search);
  const res = await fetch(`/api/students?${params}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch students');
  return json.data;
}

// Fixed: Using async/await for dynamic imports & replaced '₹' with 'Rs.' for jsPDF compatibility
async function generateTablePDF(students: IStudent[], branch: string) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`${branch} — Student Report`, 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 30);

    autoTable(doc, {
      startY: 38,
      head: [['Name', 'Phone', 'Joining Date', 'Total Fees', 'Paid', 'Remaining']],
      body: students.map((s) => [
        s.name,
        s.phone,
        new Date(s.joiningDate).toLocaleDateString('en-IN'),
        `Rs. ${s.totalFees.toLocaleString('en-IN')}`,
        `Rs. ${s.tillFeesPaid.toLocaleString('en-IN')}`,
        `Rs. ${s.remainingFees.toLocaleString('en-IN')}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241], halign: 'center' },
      columnStyles: {
        3: { halign: 'center' },
        4: { halign: 'center' },
        5: { halign: 'center' },
      },
    });

    doc.save(`${branch}_Students_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exported successfully');
  } catch (error) {
    console.error(error);
    toast.error('Failed to generate PDF');
  }
}

// Fixed & Upgraded: Enterprise Institutional Student Report
async function generateStudentPDF(student: IStudent) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ── 1. Official Institutional Header ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // Deep Slate
    doc.text('OFFICIAL STUDENT RECORD', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // Muted Slate
    doc.text(`${student.branch.toUpperCase()} DIVISION`, pageWidth / 2, 33, { align: 'center' });

    // Header Divider Line
    doc.setDrawColor(226, 232, 240); // Light border
    doc.line(14, 40, pageWidth - 14, 40);

    // Document Meta
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 46);
    doc.text(`Ref ID: STU-${student._id?.toString().slice(-6).toUpperCase() || 'SYS'}`, pageWidth - 14, 46, { align: 'right' });

    // ── 2. Student Details Dossier Box ──
    // Shaded background box for details
    doc.setFillColor(248, 250, 252); 
    doc.roundedRect(14, 52, pageWidth - 28, 45, 3, 3, 'F');
    
    // Setup for 2-column grid
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
      // Offset value to align perfectly after the label
      doc.text(value, x + 35, y); 
    };

    // Column 1: Personal Info
    addGridItem('Full Name', student.name, col1X, startY, true);
    addGridItem('Phone', student.phone, col1X, startY + 10);
    addGridItem('Joining Date', new Date(student.joiningDate).toLocaleDateString('en-IN'), col1X, startY + 20);

    // Column 2: Financial Overview
    addGridItem('Total Fees', `Rs. ${student.totalFees.toLocaleString('en-IN')}`, col2X, startY);
    addGridItem('Total Paid', `Rs. ${student.tillFeesPaid.toLocaleString('en-IN')}`, col2X, startY + 10);
    
    // Highlight remaining balance
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Remaining:', col2X, startY + 20);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(student.remainingFees > 0 ? 220 : 22, student.remainingFees > 0 ? 38 : 163, student.remainingFees > 0 ? 38 : 74); // Red if due, Green if 0
    doc.text(`Rs. ${student.remainingFees.toLocaleString('en-IN')}`, col2X + 35, startY + 20);


    // ── 3. Payment History Ledger ──
    let currentY = 110;

    if (student.installments?.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Financial Transaction Ledger', 14, currentY);
      
      currentY += 6;

      const { default: autoTable } = await import('jspdf-autotable');
      
      autoTable(doc, {
        startY: currentY,
        head: [['Inst #', 'Transaction Date', 'Amount Processed', 'System Receipt ID']],
        body: student.installments.map((inst, i) => [
          `#${String(i + 1).padStart(2, '0')}`,
          new Date(inst.date).toLocaleDateString('en-IN'),
          `Rs. ${inst.amount.toLocaleString('en-IN')}`,
          inst.receiptId || 'N/A',
        ]),
        theme: 'striped',
        styles: { 
          fontSize: 10, 
          cellPadding: 5,
          font: 'helvetica'
        },
        headStyles: { 
          fillColor: [30, 41, 59], // Professional Dark Slate
          textColor: 255, 
          halign: 'left',
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'center', fontStyle: 'bold' },
          2: { halign: 'right', fontStyle: 'bold' }, // Right align money
          3: { halign: 'center', textColor: [100, 116, 139] },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });
      
      // Update Y position after table
      currentY = (doc as any).lastAutoTable.finalY + 20;
    } else {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('No financial transactions recorded for this student.', 14, currentY);
      currentY += 20;
    }

    // ── 4. Official Signatures & Footer ──
    // Ensure we don't draw signatures off the page
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 40;
    }

    // Signatures
    doc.setDrawColor(203, 213, 225);
    doc.line(20, currentY + 30, 80, currentY + 30);
    doc.line(pageWidth - 80, currentY + 30, pageWidth - 20, currentY + 30);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('System Administrator', 50, currentY + 36, { align: 'center' });
    doc.text('Authorized Signatory', pageWidth - 50, currentY + 36, { align: 'center' });

    // Absolute Bottom Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated institutional document and may not require a physical signature.', pageWidth / 2, pageHeight - 12, { align: 'center' });

    // ── Save PDF ──
    doc.save(`${student.branch}_Student_Report_${student.name.replace(/\s+/g, '_')}.pdf`);
    toast.success('Official Record Exported');
  } catch (error) {
    console.error(error);
    toast.error('Failed to generate official PDF');
  }
}

export default function StudentTable({ branch }: StudentTableProps) {
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<IStudent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: students = [], isLoading } = useQuery<IStudent[]>({
    queryKey: ['students', branch, search],
    queryFn: () => fetchStudents(branch, search),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', branch] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Student deleted successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to delete student');
    },
  });

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
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
    setSelectedStudent(null);
    setShowEditModal(true);
  };

  const openEdit = (e: React.MouseEvent, student: IStudent) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setShowEditModal(true);
  };

  const openInstallment = (student: IStudent) => {
    setSelectedStudent(student);
    setShowInstallmentModal(true);
  };

  const handleSaved = () => {
    setShowEditModal(false);
    setSelectedStudent(null);
    queryClient.invalidateQueries({ queryKey: ['students', branch] });
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
          {students.length > 0 && (
            <button
              onClick={() => generateTablePDF(students, branch)}
              className="px-3 py-2.5 bg-white border border-border text-sm font-medium text-foreground rounded-xl hover:bg-surface-hover transition-all duration-200 shadow-sm flex items-center gap-2 shrink-0"
              title="Export table as PDF"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="hidden sm:inline">Save as PDF</span>
            </button>
          )}
          <button
            onClick={openAdd}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm shadow-accent/20 hover:shadow-md hover:shadow-accent/30 flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Student
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonLoader rows={5} cols={6} />
      ) : students.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-border">
          <svg className="w-12 h-12 text-muted/30 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <p className="text-muted text-sm">No students found</p>
          <p className="text-muted/60 text-xs mt-1">Add your first student to get started</p>
        </div>
      ) : (
        <>
          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-border bg-surface-hover/50 text-sm text-muted">
                  <th className="p-4 font-medium">Name</th>
                  <th className="p-4 font-medium">Phone</th>
                  <th className="p-4 font-medium">Joining Date</th>
                  {/* Fixed: Centered Columns */}
                  <th className="p-4 font-medium text-center">Total Fees</th>
                  <th className="p-4 font-medium text-center">Paid</th>
                  <th className="p-4 font-medium text-center">Remaining</th>
                  <th className="p-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {students.map((student) => (
                  <tr 
                    key={student._id} 
                    onClick={() => openInstallment(student)}
                    className="border-b border-border last:border-0 hover:bg-surface-hover/30 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="font-medium text-foreground">{student.name}</div>
                    </td>
                    <td className="p-4 text-muted">{student.phone}</td>
                    <td className="p-4 text-muted">{formatDate(student.joiningDate)}</td>
                    
                    {/* Fixed: Centered Data Cells */}
                    <td className="p-4 text-center font-medium">{formatCurrency(student.totalFees)}</td>
                    <td className="p-4 text-center">
                      <Badge variant="success">{formatCurrency(student.tillFeesPaid)}</Badge>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={student.remainingFees > 0 ? 'danger' : 'success'}>
                        {formatCurrency(student.remainingFees)}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      {/* Fixed: justify-center for Actions container */}
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => generateStudentPDF(student)}
                          className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                          title="Export student PDF"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => openEdit(e, student)}
                          className="p-1.5 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                          title="Edit student"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, student._id)}
                          className={`p-1.5 rounded-lg transition-all ${
                            deletingId === student._id
                              ? 'bg-red-500 text-white'
                              : 'text-muted hover:text-red-500 hover:bg-red-50'
                          }`}
                          title={deletingId === student._id ? 'Click again to confirm' : 'Delete student'}
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
            {students.map((student) => (
              <div
                key={student._id}
                onClick={() => openInstallment(student)}
                className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{student.name}</h3>
                    <p className="text-muted text-xs mt-0.5">{student.phone}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => generateStudentPDF(student)}
                      className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => openEdit(e, student)}
                      className="p-2 text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, student._id)}
                      className={`p-2 rounded-lg transition-all ${
                        deletingId === student._id
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
                    <span className="text-muted text-xs block">Joining Date</span>
                    <span className="text-foreground text-xs font-medium">{formatDate(student.joiningDate)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted text-xs block">Total Fees</span>
                    <span className="text-foreground text-xs font-semibold">{formatCurrency(student.totalFees)}</span>
                  </div>
                  <div>
                    <span className="text-muted text-xs block">Paid</span>
                    <Badge variant="success">{formatCurrency(student.tillFeesPaid)}</Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-muted text-xs block">Remaining</span>
                    <Badge variant={student.remainingFees > 0 ? 'danger' : 'success'}>
                      {formatCurrency(student.remainingFees)}
                    </Badge>
                  </div>
                </div>

                {deletingId === student._id && (
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
      <StudentModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedStudent(null); }}
        onSaved={handleSaved}
        student={selectedStudent}
        branch={branch}
      />

      {/* Installment Modal */}
      {selectedStudent && (
        <InstallmentModal
          isOpen={showInstallmentModal}
          onClose={() => { setShowInstallmentModal(false); setSelectedStudent(null); }}
          student={selectedStudent}
          branch={branch}
        />
      )}
    </div>
  );
}