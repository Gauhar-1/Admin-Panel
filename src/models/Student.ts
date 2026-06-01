import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStudentDoc extends Document {
  name: string;
  phone: string;
  branch: 'School' | 'College' | 'Pharma';
  joiningDate: Date;
  totalFees: number;
  tillFeesPaid: number;
  remainingFees: number;
  installments: { amount: number; date: Date; receiptId: string }[];
  attendanceStatus: 'Present' | 'Absent' | 'Unmarked';
  lastAttendanceReset: Date;
}

const InstallmentSchema = new Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    receiptId: { type: String, required: true },
  },
  { _id: false }
);

const StudentSchema = new Schema<IStudentDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    branch: {
      type: String,
      required: true,
      enum: ['School', 'College', 'Pharma'],
    },
    joiningDate: { type: Date, default: Date.now },
    totalFees: { type: Number, required: true, min: 0 },
    tillFeesPaid: { type: Number, required: true, default: 0, min: 0 },
    installments: [InstallmentSchema],
    attendanceStatus: {
      type: String,
      enum: ['Present', 'Absent', 'Unmarked'],
      default: 'Unmarked',
    },
    lastAttendanceReset: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

StudentSchema.virtual('remainingFees').get(function (this: IStudentDoc) {
  return Math.round((this.totalFees - this.tillFeesPaid) * 100) / 100;
});

const Student: Model<IStudentDoc> =
  mongoose.models.Student || mongoose.model<IStudentDoc>('Student', StudentSchema);

export default Student;
