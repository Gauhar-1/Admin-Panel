import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import Expense from '@/models/Expense';

export async function GET() {
  try {
    await dbConnect();

    // Aggregate metrics
    const [studentAgg] = await Student.aggregate([
      { $group: { _id: null, totalIncoming: { $sum: '$tillFeesPaid' } } },
    ]);

    const [teacherAgg] = await Teacher.aggregate([
      { $group: { _id: null, totalOutgoing: { $sum: '$tillGivenFees' } } },
    ]);

    const [expenseAgg] = await Expense.aggregate([
      { $group: { _id: null, totalExpenses: { $sum: '$amount' } } },
    ]);

    const totalIncoming = studentAgg?.totalIncoming || 0;
    const totalOutgoing = teacherAgg?.totalOutgoing || 0;
    const totalExpenses = expenseAgg?.totalExpenses || 0;
    const netBalance = Math.round((totalIncoming - totalOutgoing - totalExpenses) * 100) / 100;

    // Recent activities: combine last installments and last expenses
    const recentStudentPayments = await Student.aggregate([
      { $unwind: '$installments' },
      { $sort: { 'installments.date': -1 } },
      { $limit: 5 },
      {
        $project: {
          type: { $literal: 'payment' },
          description: { $concat: ['Fee payment from ', '$name', ' (', '$branch', ')'] },
          amount: '$installments.amount',
          date: '$installments.date',
        },
      },
    ]);

    const recentExpenses = await Expense.find()
      .sort({ date: -1 })
      .limit(5)
      .lean()
      .then((exps) =>
        exps.map((e) => ({
          type: 'expense' as const,
          description: `Expense: ${e.itemName}${e.category ? ` (${e.category})` : ''}`,
          amount: e.amount,
          date: e.date,
        }))
      );

    const recentActivities = [...recentStudentPayments, ...recentExpenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        totalIncoming,
        totalOutgoing,
        totalExpenses,
        netBalance,
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
