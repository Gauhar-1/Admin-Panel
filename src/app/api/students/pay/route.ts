import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Student from '@/models/Student';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { studentId, amount } = await req.json();

    if (!studentId || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid payment data' }, { status: 400 });
    }

    const student = await Student.findById(studentId);
    
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    // 1. Generate a unique Receipt ID (e.g., REC-1698754)
    const receiptId = `REC-${Math.floor(100000 + Math.random() * 900000)}`;

    // 2. Update the amounts
    student.tillFeesPaid += Number(amount);
    
    // 3. Push to the installments history array
    student.installments.push({
      amount: Number(amount),
      date: new Date(),
      receiptId: receiptId
    });

    // 4. Save to MongoDB
    await student.save();

    // Return the updated student data AND the generated receiptId
    // The frontend InstallmentModal uses this receiptId for the PDF!
    return NextResponse.json({ 
      success: true, 
      data: student,
      receiptId: receiptId 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Payment Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}