import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';
import Teacher from '@/models/Teacher';
import { attendanceSchema } from '@/lib/validators';

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const parsed = attendanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { type, id, status } = parsed.data;
    const updateData = { attendanceStatus: status, lastAttendanceReset: new Date() };

    const record = type === 'student'
      ? await Student.findByIdAndUpdate(id, updateData, { new: true })
      : await Teacher.findByIdAndUpdate(id, updateData, { new: true });

    if (!record) {
      return NextResponse.json(
        { success: false, error: `${type} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
