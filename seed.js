const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

// ── Schemas (inline to avoid TS module issues) ──────────────────────────

const InstallmentSchema = new mongoose.Schema(
  { amount: Number, date: { type: Date, default: Date.now }, receiptId: String },
  { _id: false }
);

const StudentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    branch: { type: String, enum: ['School', 'College', 'Pharma'], required: true },
    joiningDate: { type: Date, default: Date.now },
    totalFees: { type: Number, required: true },
    tillFeesPaid: { type: Number, default: 0 },
    installments: [InstallmentSchema],
    attendanceStatus: { type: String, enum: ['Present', 'Absent', 'Unmarked'], default: 'Unmarked' },
    lastAttendanceReset: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);
StudentSchema.virtual('remainingFees').get(function () {
  return Math.round((this.totalFees - this.tillFeesPaid) * 100) / 100;
});

const TeacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    branch: { type: String, enum: ['School', 'College', 'Pharma'], required: true },
    joiningDate: { type: Date, default: Date.now },
    totalSalary: { type: Number, required: true },
    tillGivenFees: { type: Number, default: 0 },
    overpayments: { type: Number, default: 0 },
    payments: [{ amount: Number, date: { type: Date, default: Date.now }, reason: String, receiptId: String }],
    attendanceStatus: { type: String, enum: ['Present', 'Absent', 'Unmarked'], default: 'Unmarked' },
    lastAttendanceReset: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const ExpenseSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    category: String,
  },
  { timestamps: true }
);

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema);
const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

// Admin Schema
const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);
const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

// ── Helpers ─────────────────────────────────────────────────────────────

function randomPhone() {
  return '9' + Math.floor(100000000 + Math.random() * 900000000).toString();
}

function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d;
}

function receiptId() {
  return 'RCP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Seed Data ───────────────────────────────────────────────────────────

const schoolStudents = [
  { name: 'Aarav Sharma', totalFees: 24000 },
  { name: 'Priya Patel', totalFees: 24000 },
  { name: 'Rohan Gupta', totalFees: 18000 },
  { name: 'Ananya Singh', totalFees: 24000 },
  { name: 'Vivaan Reddy', totalFees: 30000 },
  { name: 'Ishaan Verma', totalFees: 18000 },
  { name: 'Saanvi Iyer', totalFees: 24000 },
  { name: 'Arjun Nair', totalFees: 30000 },
  { name: 'Diya Mehta', totalFees: 24000 },
  { name: 'Kabir Joshi', totalFees: 18000 },
];

const collegeStudents = [
  { name: 'Rahul Deshmukh', totalFees: 65000 },
  { name: 'Sneha Kulkarni', totalFees: 65000 },
  { name: 'Aditya Bose', totalFees: 55000 },
  { name: 'Meera Chatterjee', totalFees: 72000 },
  { name: 'Varun Kapoor', totalFees: 65000 },
  { name: 'Pooja Rao', totalFees: 55000 },
  { name: 'Nikhil Saxena', totalFees: 72000 },
  { name: 'Tanvi Agarwal', totalFees: 65000 },
];

const pharmaStudents = [
  { name: 'Siddharth Pandey', totalFees: 85000 },
  { name: 'Kavya Menon', totalFees: 85000 },
  { name: 'Harsh Tiwari', totalFees: 95000 },
  { name: 'Riya Banerjee', totalFees: 85000 },
  { name: 'Amit Kumar', totalFees: 95000 },
  { name: 'Neha Srivastava', totalFees: 85000 },
];

const schoolTeachers = [
  { name: 'Sunita Devi', totalSalary: 28000 },
  { name: 'Rajesh Kumar', totalSalary: 32000 },
  { name: 'Meena Mishra', totalSalary: 25000 },
  { name: 'Prakash Yadav', totalSalary: 30000 },
];

const collegeTeachers = [
  { name: 'Dr. Suresh Pillai', totalSalary: 55000 },
  { name: 'Prof. Asha Bhatt', totalSalary: 48000 },
  { name: 'Dr. Manish Dubey', totalSalary: 52000 },
  { name: 'Prof. Lakshmi Narayan', totalSalary: 60000 },
  { name: 'Dr. Kiran Desai', totalSalary: 45000 },
];

const pharmaTeachers = [
  { name: 'Dr. Ramesh Chandra', totalSalary: 65000 },
  { name: 'Prof. Anjali Gupta', totalSalary: 58000 },
  { name: 'Dr. Vivek Sharma', totalSalary: 62000 },
];

const expenseItems = [
  { itemName: 'Whiteboard Markers (50 pack)', amount: 1200, category: 'Supplies' },
  { itemName: 'Classroom Chairs Repair', amount: 8500, category: 'Maintenance' },
  { itemName: 'Electricity Bill - May', amount: 14200, category: 'Utilities' },
  { itemName: 'Water Cooler Service', amount: 3500, category: 'Maintenance' },
  { itemName: 'Printer Cartridges', amount: 4800, category: 'Supplies' },
  { itemName: 'Lab Equipment - Beakers', amount: 6200, category: 'Equipment' },
  { itemName: 'Internet Bill - May', amount: 2400, category: 'Utilities' },
  { itemName: 'Student Notebooks (200)', amount: 5000, category: 'Supplies' },
  { itemName: 'CCTV Camera Maintenance', amount: 3200, category: 'Maintenance' },
  { itemName: 'Staff Room AC Repair', amount: 7500, category: 'Maintenance' },
  { itemName: 'Annual Day Decorations', amount: 12000, category: 'Other' },
  { itemName: 'Transport Fuel - May', amount: 9800, category: 'Transport' },
  { itemName: 'Computer Mouse + Keyboards', amount: 3600, category: 'Equipment' },
  { itemName: 'Drinking Water Cans (30)', amount: 1800, category: 'Supplies' },
  { itemName: 'Pest Control Service', amount: 4500, category: 'Maintenance' },
];

// ── Seed Function ───────────────────────────────────────────────────────

async function seed() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected!\n');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await Student.deleteMany({});
  await Teacher.deleteMany({});
  await Expense.deleteMany({});
  await Admin.deleteMany({});
  console.log('   Done.\n');

  // ── Admin User ──────────────────────────────────────────────────────
  console.log('🔐 Seeding Admin User...');
  const adminPassword = 'Admin@123456';
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await Admin.create({
    email: 'admin@institution.local',
    passwordHash,
    name: 'Administrator',
  });
  console.log('   ✅ Admin user created\n');

  // ── Students ────────────────────────────────────────────────────────
  console.log('👨‍🎓 Seeding Students...');

  const createStudents = async (list, branch) => {
    for (const s of list) {
      const joiningDate = randomDate(300);
      const totalFees = s.totalFees;
      // Random payment progress: 0% to 100%
      const paymentProgress = Math.random() * 0.9 + 0.1; // 10% to 100%
      const totalPaid = Math.round(totalFees * paymentProgress / 100) * 100; // round to nearest 100

      // Generate 1-4 installments
      const numInstallments = Math.min(Math.ceil(paymentProgress * 4), 4);
      const installments = [];
      let remaining = totalPaid;

      for (let i = 0; i < numInstallments && remaining > 0; i++) {
        const isLast = i === numInstallments - 1;
        const installmentAmount = isLast ? remaining : Math.round((remaining / (numInstallments - i)) / 100) * 100;
        if (installmentAmount <= 0) break;
        installments.push({
          amount: installmentAmount,
          date: new Date(joiningDate.getTime() + (i + 1) * 30 * 24 * 60 * 60 * 1000),
          receiptId: receiptId(),
        });
        remaining -= installmentAmount;
      }

      const attendance = pick(['Present', 'Absent', 'Unmarked']);

      await Student.create({
        name: s.name,
        phone: randomPhone(),
        branch,
        joiningDate,
        totalFees,
        tillFeesPaid: totalPaid,
        installments,
        attendanceStatus: attendance,
        lastAttendanceReset: new Date(),
      });
    }
  };

  await createStudents(schoolStudents, 'School');
  await createStudents(collegeStudents, 'College');
  await createStudents(pharmaStudents, 'Pharma');
  console.log(`   ✅ ${schoolStudents.length + collegeStudents.length + pharmaStudents.length} students created\n`);

  // ── Teachers ────────────────────────────────────────────────────────
  console.log('👩‍🏫 Seeding Teachers...');

  const createTeachers = async (list, branch) => {
    for (const t of list) {
      const joiningDate = randomDate(500);
      const totalSalary = t.totalSalary;
      // Random salary payment: some fully paid, some partial, one overpaid
      const paymentRatio = Math.random() * 1.15; // up to 115% to show overpayment
      const tillGivenFees = Math.round(Math.min(totalSalary * paymentRatio, totalSalary * 1.1) / 100) * 100;
      const overpayments = tillGivenFees > totalSalary
        ? Math.round((tillGivenFees - totalSalary) * 100) / 100
        : 0;

      // Generate payments array
      const payments = [];
      if (tillGivenFees > 0) {
        // 1 to 4 payments
        const numPayments = Math.floor(Math.random() * 4) + 1;
        let remainingToDistribute = tillGivenFees;
        
        for (let i = 0; i < numPayments; i++) {
          const isLast = i === numPayments - 1;
          const amt = isLast ? remainingToDistribute : Math.round((remainingToDistribute / (numPayments - i)) / 100) * 100;
          if (amt <= 0) break;
          
          payments.push({
            amount: amt,
            date: new Date(joiningDate.getTime() + (i + 1) * 30 * 24 * 60 * 60 * 1000),
            reason: pick(['Base Salary', 'Bonus', 'Advance', 'Reimbursement']),
            receiptId: receiptId(),
          });
          remainingToDistribute -= amt;
        }
      }

      const attendance = pick(['Present', 'Absent', 'Unmarked']);

      await Teacher.create({
        name: t.name,
        phone: randomPhone(),
        branch,
        joiningDate,
        totalSalary,
        tillGivenFees,
        overpayments,
        payments,
        attendanceStatus: attendance,
        lastAttendanceReset: new Date(),
      });
    }
  };

  await createTeachers(schoolTeachers, 'School');
  await createTeachers(collegeTeachers, 'College');
  await createTeachers(pharmaTeachers, 'Pharma');
  console.log(`   ✅ ${schoolTeachers.length + collegeTeachers.length + pharmaTeachers.length} teachers created\n`);

  // ── Expenses ────────────────────────────────────────────────────────
  console.log('💸 Seeding Expenses...');

  for (const exp of expenseItems) {
    await Expense.create({
      itemName: exp.itemName,
      amount: exp.amount,
      date: randomDate(60),
      category: exp.category,
    });
  }
  console.log(`   ✅ ${expenseItems.length} expenses created\n`);

  // ── Summary ─────────────────────────────────────────────────────────
  const studentCount = await Student.countDocuments();
  const teacherCount = await Teacher.countDocuments();
  const expenseCount = await Expense.countDocuments();

  const totalIncoming = (await Student.aggregate([{ $group: { _id: null, sum: { $sum: '$tillFeesPaid' } } }]))[0]?.sum || 0;
  const totalOutgoing = (await Teacher.aggregate([{ $group: { _id: null, sum: { $sum: '$tillGivenFees' } } }]))[0]?.sum || 0;
  const totalExpenses = (await Expense.aggregate([{ $group: { _id: null, sum: { $sum: '$amount' } } }]))[0]?.sum || 0;

  console.log('═══════════════════════════════════════');
  console.log('  📊 SEED SUMMARY');
  console.log('═══════════════════════════════════════');
  console.log(`  Admin:        admin@institution.local`);
  console.log(`  Password:     Admin@123456`);
  console.log('───────────────────────────────────────');
  console.log(`  Students:     ${studentCount}`);
  console.log(`  Teachers:     ${teacherCount}`);
  console.log(`  Expenses:     ${expenseCount}`);
  console.log('───────────────────────────────────────');
  console.log(`  💰 Total Fees Collected:  ₹${totalIncoming.toLocaleString('en-IN')}`);
  console.log(`  💼 Total Salary Paid:     ₹${totalOutgoing.toLocaleString('en-IN')}`);
  console.log(`  🧾 Total Expenses:        ₹${totalExpenses.toLocaleString('en-IN')}`);
  console.log(`  📈 Net Balance:           ₹${(totalIncoming - totalOutgoing - totalExpenses).toLocaleString('en-IN')}`);
  console.log('═══════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB. Done! ✨');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
