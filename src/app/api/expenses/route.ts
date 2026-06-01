import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Expense from '@/models/Expense';
import { expenseSchema } from '@/lib/validators';

export async function GET() {
  try {
    await dbConnect();
    const expenses = await Expense.find().sort({ date: -1, createdAt: -1 });
    return NextResponse.json({ success: true, data: expenses });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const parsed = expenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const expense = await Expense.create(parsed.data);
    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Expense ID is required' },
        { status: 400 }
      );
    }

    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: expense });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
