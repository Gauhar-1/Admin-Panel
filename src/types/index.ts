export interface IInstallment {
  amount: number;
  date: Date;
  receiptId: string;
}

export interface IStudent {
  _id: string;
  name: string;
  phone: string;
  branch: 'School' | 'College' | 'Pharma';
  joiningDate: Date;
  totalFees: number;
  tillFeesPaid: number;
  remainingFees: number; // virtual
  installments: IInstallment[];
  attendanceStatus: 'Present' | 'Absent' | 'Unmarked';
  lastAttendanceReset: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeacher {
  _id: string;
  name: string;
  phone: string;
  branch: 'School' | 'College';
  joiningDate: Date;
  totalSalary: number;
  tillGivenFees: number;
  remainingDue: number; // virtual
  overpayments: number;
  attendanceStatus: 'Present' | 'Absent' | 'Unmarked';
  lastAttendanceReset: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpense {
  _id: string;
  itemName: string;
  amount: number;
  date: Date;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardMetrics {
  totalIncoming: number;
  totalOutgoing: number;
  totalExpenses: number;
  netBalance: number;
  recentActivities: RecentActivity[];
}

export interface RecentActivity {
  type: 'payment' | 'expense';
  description: string;
  amount: number;
  date: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
