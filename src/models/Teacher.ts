import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITeacherDoc extends Document {
  name: string;
  phone: string;
  branch: 'School' | 'College';
  joiningDate: Date;
  totalSalary: number;
  tillGivenFees: number;
  remainingDue: number;
  overpayments: number;
  attendanceStatus: 'Present' | 'Absent' | 'Unmarked';
  lastAttendanceReset: Date;
}

const TeacherSchema = new Schema<ITeacherDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    branch: {
      type: String,
      required: true,
      enum: ['School', 'College'],
    },
    joiningDate: { type: Date, default: Date.now },
    totalSalary: { type: Number, required: true, min: 0 },
    tillGivenFees: { type: Number, required: true, default: 0, min: 0 },
    overpayments: { type: Number, default: 0, min: 0 },
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

TeacherSchema.virtual('remainingDue').get(function (this: ITeacherDoc) {
  const remaining = this.totalSalary - this.tillGivenFees;
  return Math.round(Math.max(0, remaining) * 100) / 100;
});

TeacherSchema.pre('save', function () {
  if (this.tillGivenFees > this.totalSalary) {
    this.overpayments = Math.round((this.tillGivenFees - this.totalSalary) * 100) / 100;
  } else {
    this.overpayments = 0;
  }
});

const Teacher: Model<ITeacherDoc> =
  mongoose.models.Teacher || mongoose.model<ITeacherDoc>('Teacher', TeacherSchema);

export default Teacher;
