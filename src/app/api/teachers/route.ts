import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Teacher from '@/models/Teacher';
import { teacherSchema } from '@/lib/validators';
import { roundTwo } from '@/lib/utils';

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

    const teachers = await Teacher.find(filter).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: teachers });
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
    const parsed = teacherSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const teacher = await Teacher.create(parsed.data);
    return NextResponse.json({ success: true, data: teacher }, { status: 201 });
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
    const { _id, salaryPayment, paymentReason, ...updateData } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, error: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    const teacher = await Teacher.findById(_id);
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: 'Teacher not found' },
        { status: 404 }
      );
    }

    // Handle salary payment
    if (salaryPayment && salaryPayment > 0) {
      teacher.tillGivenFees = roundTwo(teacher.tillGivenFees + salaryPayment);
    }

    // Update other fields
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (teacher as any)[key] = updateData[key];
      }
    });

    await teacher.save(); // pre-save hook handles overpayments

    const updated = await Teacher.findById(_id);
    return NextResponse.json({ success: true, data: updated });
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
        { success: false, error: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    const teacher = await Teacher.findByIdAndDelete(id);
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: 'Teacher not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: teacher });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
