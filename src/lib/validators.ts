import { z } from 'zod';

export const studentSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  phone: z.string().min(1, 'Phone is required').trim(),
  branch: z.enum(['School', 'College', 'Pharma'], {
    message: 'Branch must be School, College, or Pharma',
  }),
  joiningDate: z.string().or(z.date()).optional(),
  totalFees: z.number().min(0, 'Total fees must be positive'),
  tillFeesPaid: z.number().min(0, 'Fees paid must be positive').optional(),
});

export const studentUpdateSchema = studentSchema.partial().extend({
  _id: z.string().optional(),
});

export const paymentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  amount: z.number().min(0.01, 'Payment amount must be positive'),
});

export const teacherSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  phone: z.string().min(1, 'Phone is required').trim(),
  branch: z.enum(['School', 'College'], {
    message: 'Branch must be School or College',
  }),
  joiningDate: z.string().or(z.date()).optional(),
  totalSalary: z.number().min(0, 'Total salary must be positive'),
  tillGivenFees: z.number().min(0, 'Fees given must be positive').optional(),
});

export const teacherUpdateSchema = teacherSchema.partial().extend({
  _id: z.string().optional(),
});

export const salaryPaymentSchema = z.object({
  teacherId: z.string().min(1, 'Teacher ID is required'),
  amount: z.number().min(0.01, 'Payment amount must be positive'),
});

export const expenseSchema = z.object({
  itemName: z.string().min(1, 'Item name is required').trim(),
  amount: z.number().min(0.01, 'Amount must be positive'),
  date: z.string().or(z.date()).optional(),
  category: z.string().trim().optional(),
});

export const attendanceSchema = z.object({
  type: z.enum(['student', 'teacher']),
  id: z.string().min(1),
  status: z.enum(['Present', 'Absent', 'Unmarked']),
});
