import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import { studentSchema } from '@/lib/validators';
import { generateReceiptId, roundTwo } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch');
    const search = searchParams.get('search');

    const filter: Record<string, unknown> = {};
    if (branch) filter.branch = branch;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const students = await Student.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: students });
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
    const parsed = studentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const student = await Student.create(parsed.data);
    return NextResponse.json({ success: true, data: student }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, paymentAmount, paymentReason, ...updateData } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 }
      );
    }

    let student = await Student.findById(_id);
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Handle fee payment
    let receiptId: string | null = null;
    if (paymentAmount && paymentAmount > 0) {
      receiptId = generateReceiptId();
      student.tillFeesPaid = roundTwo(student.tillFeesPaid + paymentAmount);
      student.installments.push({
        amount: roundTwo(paymentAmount),
        date: new Date(),
        receiptId,
        ...(paymentReason ? { reason: paymentReason } : {}),
      });
    }

    // Update other fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (student as any)[key] = updateData[key];
      }
    });

    await student.save();
    student = await Student.findById(_id);

    return NextResponse.json({
      success: true,
      data: student,
      receiptId,
    });
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
        { success: false, error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: student });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
