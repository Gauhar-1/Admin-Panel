export interface IInstallment {
  amount: number;
  date: Date;
  receiptId: string;
  reason?: string;
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
  createdAt: Date;
  updatedAt: Date;
  installmentMonths?: number;
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

export interface BranchMetrics {
  activeStudents: number;
  activeTeachers: number;
  revenue: number;
  payroll: number;
  totalExpectedFees: number;
  collectedFees: number;
}

export interface ChartDataPoint {
  name: string;
  School: number;
  College: number;
  Pharma: number;
  NetBalance?: number;
}

export interface DashboardMetrics {
  totalIncoming: number;
  totalOutgoing: number;
  totalExpenses: number;
  netBalance: number;
  branchData: {
    School: BranchMetrics;
    College: BranchMetrics;
    Pharma: BranchMetrics;
  };
  chartData: ChartDataPoint[];
  recentActivities: RecentActivity[];
}

export interface RecentActivity {
  type: 'payment' | 'expense' | 'payroll';
  branch?: string;
  description: string;
  amount: number;
  date: Date;
  details?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
