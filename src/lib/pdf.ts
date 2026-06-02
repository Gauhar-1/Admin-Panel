import { toast } from 'sonner';
import { IStudent } from '@/types';

export async function generateBeautifulReceipt(student: IStudent, paymentAmount: number, receiptId: string) {
  try {
    const { default: jsPDF } = await import('jspdf');
    // Using A5 size (148 x 210 mm) for a standard receipt look
    const doc = new jsPDF({ format: 'a5', unit: 'mm' });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // 1. Draw Outer Border
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(10, 10, pageWidth - 20, 120, 3, 3, 'S');

    // 2. Institution Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 37, 41);
    doc.text(student.branch.toUpperCase(), pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Official Payment Receipt', pageWidth / 2, 32, { align: 'center' });
    
    // Divider Line
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 38, pageWidth - 15, 38);

    // 3. Receipt Meta Data
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Receipt No: ${receiptId}`, 15, 48);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 15, 48, { align: 'right' });

    // 4. Student Details Box
    doc.setFillColor(248, 250, 252); // Light Slate UI background
    doc.roundedRect(15, 55, pageWidth - 30, 25, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Received From:', 20, 63);
    doc.setFont('helvetica', 'normal');
    doc.text(student.name, 20, 70);
    doc.text(`Phone: ${student.phone}`, 20, 76);

    // 5. Payment Details
    let y = 92;
    const addRow = (label: string, value: string, isBold = false) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.text(label, 20, y);
      doc.text(value, pageWidth - 20, y, { align: 'right' });
      y += 8;
    };

    addRow('Total Course Fees:', `Rs. ${student.totalFees.toLocaleString('en-IN')}`);
    addRow('Amount Paid Now:', `Rs. ${paymentAmount.toLocaleString('en-IN')}`, true);
    
    // Divider
    doc.line(20, y - 4, pageWidth - 20, y - 4);
    
    // Calculate remaining (simulating the state after this payment)
    const newRemaining = student.remainingFees - paymentAmount;
    addRow('Remaining Balance:', `Rs. ${newRemaining.toLocaleString('en-IN')}`);

    // 6. Footer Signature
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Authorized Signature', pageWidth - 20, 122, { align: 'right' });
    doc.line(pageWidth - 55, 118, pageWidth - 20, 118); // Signature line

    // Save PDF
    doc.save(`Receipt_${student.name.replace(/\s+/g, '_')}_${receiptId}.pdf`);
    toast.success('Beautiful Receipt Downloaded!');
  } catch (error) {
    console.error(error);
    toast.error('Failed to generate receipt');
  }
}

export async function generateIndividualExpensePDF(expense: any) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({ format: 'a5', unit: 'mm' });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // 1. Draw Outer Border
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(10, 10, pageWidth - 20, 120, 3, 3, 'S');

    // 2. Institution Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 37, 41);
    doc.text('OFFICIAL INSTITUTION', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Expense Voucher / Receipt', pageWidth / 2, 32, { align: 'center' });
    
    // Divider Line
    doc.setDrawColor(220, 220, 220);
    doc.line(15, 38, pageWidth - 15, 38);

    // 3. Receipt Meta Data
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    const shortId = expense._id ? expense._id.toString().slice(-6).toUpperCase() : 'N/A';
    doc.text(`Voucher No: EXP-${shortId}`, 15, 48);
    doc.text(`Date: ${new Date(expense.date).toLocaleDateString('en-IN')}`, pageWidth - 15, 48, { align: 'right' });

    // 4. Details Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 55, pageWidth - 30, 25, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Particulars:', 20, 63);
    doc.setFont('helvetica', 'normal');
    doc.text(expense.itemName, 20, 70);
    doc.text(`Category: ${expense.category || 'General'}`, 20, 76);

    // 5. Amount Details
    let y = 92;
    const addRow = (label: string, value: string, isBold = false) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.text(label, 20, y);
      doc.text(value, pageWidth - 20, y, { align: 'right' });
      y += 8;
    };

    addRow('Amount Paid:', `Rs. ${expense.amount.toLocaleString('en-IN')}`, true);
    
    // Divider
    doc.line(20, y - 4, pageWidth - 20, y - 4);
    
    // 6. Footer Signature
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Authorized By', 20, 122);
    doc.line(20, 118, 55, 118); // Left signature line
    
    doc.text('Receiver\'s Signature', pageWidth - 20, 122, { align: 'right' });
    doc.line(pageWidth - 55, 118, pageWidth - 20, 118); // Right signature line

    // Save PDF
    doc.save(`Expense_Voucher_${shortId}.pdf`);
    toast.success('Expense Voucher Downloaded!');
  } catch (error) {
    console.error(error);
    toast.error('Failed to generate expense voucher');
  }
}

export async function generateExpenseTablePDF(expenses: any[], durationLabel: string) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Expense Report — ${durationLabel}`, 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 30);

    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    autoTable(doc, {
      startY: 38,
      head: [['Date', 'Item Name', 'Category', 'Amount']],
      body: [
        ...expenses.map((exp) => [
          new Date(exp.date).toLocaleDateString('en-IN'),
          exp.itemName,
          exp.category || 'General',
          `Rs. ${exp.amount.toLocaleString('en-IN')}`,
        ]),
        // Total row
        ['', '', 'TOTAL', `Rs. ${totalAmount.toLocaleString('en-IN')}`]
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [99, 102, 241], halign: 'center' },
      columnStyles: {
        0: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
      },
      didParseCell: function (data: any) {
        // Make the total row bold
        if (data.row.index === expenses.length) {
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 3 || data.column.index === 2) {
            data.cell.styles.textColor = [99, 102, 241]; // Accent color for total
          }
        }
      }
    });

    doc.save(`Expense_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Expense Report exported successfully');
  } catch (error) {
    console.error(error);
    toast.error('Failed to generate expense report');
  }
}