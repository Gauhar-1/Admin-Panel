import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import Expense from '@/models/Expense';

export async function GET() {
  try {
    await dbConnect();

    // 1. Branch Aggregations
    const studentBranchAgg = await Student.aggregate([
      {
        $group: {
          _id: '$branch',
          activeStudents: { $sum: 1 },
          revenue: { $sum: '$tillFeesPaid' },
          totalExpectedFees: { $sum: '$totalFees' },
        },
      },
    ]);

    const teacherBranchAgg = await Teacher.aggregate([
      {
        $group: {
          _id: '$branch',
          activeTeachers: { $sum: 1 },
          payroll: { $sum: '$tillGivenFees' },
        },
      },
    ]);

    const expenseAgg = await Expense.aggregate([
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
    ]);

    // Initialize default branch data
    const branchData = {
      School: { activeStudents: 0, activeTeachers: 0, revenue: 0, payroll: 0, totalExpectedFees: 0, collectedFees: 0 },
      College: { activeStudents: 0, activeTeachers: 0, revenue: 0, payroll: 0, totalExpectedFees: 0, collectedFees: 0 },
      Pharma: { activeStudents: 0, activeTeachers: 0, revenue: 0, payroll: 0, totalExpectedFees: 0, collectedFees: 0 },
    };

    let totalIncoming = 0;
    let totalExpected = 0;
    studentBranchAgg.forEach((b) => {
      const name = b._id as 'School' | 'College' | 'Pharma';
      if (branchData[name]) {
        branchData[name].activeStudents = b.activeStudents;
        branchData[name].revenue = b.revenue;
        branchData[name].collectedFees = b.revenue;
        branchData[name].totalExpectedFees = b.totalExpectedFees;
        totalIncoming += b.revenue;
        totalExpected += b.totalExpectedFees;
      }
    });

    let totalOutgoing = 0;
    teacherBranchAgg.forEach((b) => {
      const name = b._id as 'School' | 'College' | 'Pharma';
      if (branchData[name]) {
        branchData[name].activeTeachers = b.activeTeachers;
        branchData[name].payroll = b.payroll;
        totalOutgoing += b.payroll;
      }
    });

    const totalExpenses = expenseAgg[0]?.totalExpenses || 0;
    const netBalance = Math.round((totalIncoming - totalOutgoing - totalExpenses) * 100) / 100;

    // 2. Mock 6-Month Chart Data for Recharts
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const chartData = months.map((month, i) => {
      // Create a deterministic upward trend for demo purposes
      const trend = 0.5 + (i * 0.1); 
      return {
        name: month,
        SchoolRev: Math.round((branchData.School.revenue / 6) * trend),
        CollegeRev: Math.round((branchData.College.revenue / 6) * trend),
        PharmaRev: Math.round((branchData.Pharma.revenue / 6) * trend),
        SchoolPay: Math.round((branchData.School.payroll / 6) * trend),
        CollegePay: Math.round((branchData.College.payroll / 6) * trend),
        PharmaPay: Math.round((branchData.Pharma.payroll / 6) * trend),
        NetBalance: Math.round((netBalance / 6) * trend),
      };
    });

    // 3. Live Conversational Feed (Recent 20 activities)
    const recentStudentPayments = await Student.aggregate([
      { $unwind: '$installments' },
      { $sort: { 'installments.date': -1 } },
      { $limit: 20 },
      {
        $project: {
          type: { $literal: 'payment' },
          branch: '$branch',
          description: '$name',
          amount: '$installments.amount',
          date: '$installments.date',
          details: { 
            $concat: ['Paid tuition fee installment.'] 
          },
        },
      },
    ]);

    const recentExpenses = await Expense.find().sort({ date: -1 }).limit(20).lean();
    const expenseActivities = recentExpenses.map((e) => ({
      type: 'expense' as const,
      branch: 'Institution',
      description: e.itemName,
      amount: e.amount,
      date: e.date,
      details: `Category: ${e.category || 'General'}. Logged as Misc Expense.`,
    }));

    const recentActivities = [...recentStudentPayments, ...expenseActivities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      data: {
        totalIncoming,
        totalOutgoing,
        totalExpenses,
        netBalance,
        branchData,
        chartData,
        recentActivities,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
