'use client';

import { useState, useEffect, useCallback } from 'react';
import { IStudent } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import SearchInput from '@/components/ui/SearchInput';
import AttendanceToggle from '@/components/ui/AttendanceToggle';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import Badge from '@/components/ui/Badge';
import StudentModal from './StudentModal';

interface StudentTableProps {
  branch: 'School' | 'College' | 'Pharma';
  showAttendance?: boolean;
}

export default function StudentTable({ branch, showAttendance = true }: StudentTableProps) {
  const [students, setStudents] = useState<IStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<IStudent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    try {
      const params = new URLSearchParams({ branch });
      if (search) params.set('search', search);
      const res = await fetch(`/api/students?${params}`);
      const json = await res.json();
      if (json.success) setStudents(json.data);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  }, [branch, search]);

  useEffect(() => {
    setLoading(true);
    fetchStudents();
  }, [fetchStudents]);

  const handleAttendance = async (id: string, status: 'Present' | 'Absent') => {
    try {
      await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'student', id, status }),
      });
      setStudents((prev) =>
        prev.map((s) => (s._id === id ? { ...s, attendanceStatus: status } : s))
      );
    } catch (err) {
      console.error('Failed to update attendance:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId === id) {
      // Confirmed — do delete
      try {
        const res = await fetch(`/api/students?id=${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          setStudents((prev) => prev.filter((s) => s._id !== id));
        }
      } catch (err) {
        console.error('Failed to delete student:', err);
      } finally {
        setDeletingId(null);
      }
    } else {
      setDeletingId(id);
      // Auto-cancel after 3s
      setTimeout(() => setDeletingId((curr) => (curr === id ? null : curr)), 3000);
    }
  };

  const openAdd = () => {
    setSelectedStudent(null);
    setShowModal(true);
  };

  const openEdit = (e: React.MouseEvent, student: IStudent) => {
    e.stopPropagation();
    setSelectedStudent(student);
    setShowModal(true);
  };

  const handleSaved = () => {
    setShowModal(false);
    setSelectedStudent(null);
    fetchStudents();
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
        <button
          onClick={openAdd}
          className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl
            transition-all duration-200 shadow-sm shadow-accent/20 hover:shadow-md hover:shadow-accent/30
            flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Student
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonLoader rows={5} cols={showAttendance ? 7 : 6} />
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
          {/* ── Desktop Table (hidden on small screens) ── */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-white">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Joining Date</th>
                  <th className="text-right">Total Fees</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Remaining</th>
                  {showAttendance && <th>Attendance</th>}
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id} onClick={(e) => openEdit(e, student)}>
                    <td>
                      <div className="font-medium text-foreground">{student.name}</div>
                    </td>
                    <td className="text-muted">{student.phone}</td>
                    <td className="text-muted">{formatDate(student.joiningDate)}</td>
                    <td className="text-right font-medium">{formatCurrency(student.totalFees)}</td>
                    <td className="text-right">
                      <Badge variant="success">{formatCurrency(student.tillFeesPaid)}</Badge>
                    </td>
                    <td className="text-right">
                      <Badge variant={student.remainingFees > 0 ? 'danger' : 'success'}>
                        {formatCurrency(student.remainingFees)}
                      </Badge>
                    </td>
                    {showAttendance && (
                      <td>
                        <AttendanceToggle
                          status={student.attendanceStatus}
                          onChange={(status) => handleAttendance(student._id, status)}
                        />
                      </td>
                    )}
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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

          {/* ── Mobile Card View (visible on small screens) ── */}
          <div className="md:hidden space-y-3">
            {students.map((student) => (
              <div
                key={student._id}
                className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{student.name}</h3>
                    <p className="text-muted text-xs mt-0.5">{student.phone}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
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

                {/* Card Body */}
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

                {/* Attendance Footer */}
                {showAttendance && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted">Attendance</span>
                    <AttendanceToggle
                      status={student.attendanceStatus}
                      onChange={(status) => handleAttendance(student._id, status)}
                    />
                  </div>
                )}

                {/* Delete confirmation banner */}
                {deletingId === student._id && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-center">
                    <span className="text-xs text-red-600 font-medium">Tap delete again to confirm removal</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      <StudentModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedStudent(null); }}
        onSaved={handleSaved}
        student={selectedStudent}
        branch={branch}
      />
    </div>
  );
}
