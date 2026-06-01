import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExpenseDoc extends Document {
  itemName: string;
  amount: number;
  date: Date;
  category?: string;
}

const ExpenseSchema = new Schema<IExpenseDoc>(
  {
    itemName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    category: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Expense: Model<IExpenseDoc> =
  mongoose.models.Expense || mongoose.model<IExpenseDoc>('Expense', ExpenseSchema);

export default Expense;
