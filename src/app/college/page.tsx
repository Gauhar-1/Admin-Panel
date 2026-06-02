'use client';

import { useState } from 'react';
import StudentTable from '@/components/students/StudentTable';
import TeacherTable from '@/components/teachers/TeacherTable';

export default function CollegePage() {
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>('students');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-outfit)' }}>
          College Management
        </h1>
        <p className="text-muted text-sm mt-1">
          Manage students, teachers, and fees for the College branch
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200
            ${activeTab === 'students'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
            }`}
        >
          Students
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200
            ${activeTab === 'teachers'
              ? 'bg-white text-foreground shadow-sm'
              : 'text-muted hover:text-foreground'
            }`}
        >
          Teachers
        </button>
      </div>

      {/* Content */}
      {activeTab === 'students' ? (
        <StudentTable branch="College" />
      ) : (
        <TeacherTable branch="College" />
      )}
    </div>
  );
}
