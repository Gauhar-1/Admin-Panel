'use client';

import { useState, useEffect, useCallback } from 'react';
import { ITeacher } from '@/types';
import { formatCurrency } from '@/lib/utils';
import SearchInput from '@/components/ui/SearchInput';
import AttendanceToggle from '@/components/ui/AttendanceToggle';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import Badge from '@/components/ui/Badge';
import TeacherModal from './TeacherModal';

interface TeacherTableProps {
  branch: 'School' | 'College';
}

export default function TeacherTable({ branch }: TeacherTableProps) {
  const [teachers, setTeachers] = useState<ITeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState<ITeacher | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ branch });
      if (search) params.set('search', search);
      const res = await fetch(`/api/teachers?${params}`);
      const json = await res.json();
      if (json.success) setTeachers(json.data);
    } catch (err) {
      console.error('Failed to fetch teachers:', err);
    } finally {
      setLoading(false);
    }
  }, [branch, search]);

  useEffect(() => {
    setLoading(true);
    fetchTeachers();
  }, [fetchTeachers]);

  const handleAttendance = async (id: string, status: 'Present' | 'Absent') => {
    try {
      await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'teacher', id, status }),
      });
      setTeachers((prev) =>
        prev.map((t) => (t._id === id ? { ...t, attendanceStatus: status } : t))
      );
    } catch (err) {
      console.error('Failed to update attendance:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (deletingId === id) {
      try {
        const res = await fetch(`/api/teachers?id=${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          setTeachers((prev) => prev.filter((t) => t._id !== id));
        }
      } catch (err) {
        console.error('Failed to delete teacher:', err);
      } finally {
        setDeletingId(null);
      }
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId((curr) => (curr === id ? null : curr)), 3000);
    }
  };

  const openAdd = () => {
    setSelectedTeacher(null);
    setShowModal(true);
  };

  const openEdit = (e: React.MouseEvent, teacher: ITeacher) => {
    e.stopPropagation();
    setSelectedTeacher(teacher);
    setShowModal(true);
  };

  const handleSaved = () => {
    setShowModal(false);
    setSelectedTeacher(null);
    fetchTeachers();
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
          Add Teacher
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonLoader rows={5} cols={7} />
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
          <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-white">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th className="text-right">Total Salary</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Due</th>
                  <th className="text-right">Overpayments</th>
                  <th>Attendance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher._id} onClick={(e) => openEdit(e, teacher)}>
                    <td>
                      <div className="font-medium text-foreground">{teacher.name}</div>
                    </td>
                    <td className="text-muted">{teacher.phone}</td>
                    <td className="text-right font-medium">{formatCurrency(teacher.totalSalary)}</td>
                    <td className="text-right">
                      <Badge variant="success">{formatCurrency(teacher.tillGivenFees)}</Badge>
                    </td>
                    <td className="text-right">
                      <Badge variant={teacher.remainingDue > 0 ? 'warning' : 'success'}>
                        {formatCurrency(teacher.remainingDue)}
                      </Badge>
                    </td>
                    <td className="text-right">
                      {teacher.overpayments > 0 ? (
                        <Badge variant="accent">{formatCurrency(teacher.overpayments)}</Badge>
                      ) : (
                        <span className="text-muted text-sm">—</span>
                      )}
                    </td>
                    <td>
                      <AttendanceToggle
                        status={teacher.attendanceStatus}
                        onChange={(status) => handleAttendance(teacher._id, status)}
                      />
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
                className="bg-white rounded-xl border border-border p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{teacher.name}</h3>
                    <p className="text-muted text-xs mt-0.5">{teacher.phone}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
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

                {/* Body */}
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

                {/* Attendance */}
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted">Attendance</span>
                  <AttendanceToggle
                    status={teacher.attendanceStatus}
                    onChange={(status) => handleAttendance(teacher._id, status)}
                  />
                </div>

                {deletingId === teacher._id && (
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
      <TeacherModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedTeacher(null); }}
        onSaved={handleSaved}
        teacher={selectedTeacher}
        branch={branch}
      />
    </div>
  );
}
