'use client';

import StudentTable from '@/components/students/StudentTable';

export default function PharmaPage() {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-outfit)' }}>
          Pharma Management
        </h1>
        <p className="text-muted text-sm mt-1">
          Manage students and fee tracking for the Pharma branch
        </p>
      </div>

      {/* Students Only */}
      <StudentTable branch="Pharma" showAttendance={false} />
    </div>
  );
}
