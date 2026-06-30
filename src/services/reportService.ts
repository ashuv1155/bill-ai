import { Bill } from "./billService";
import * as XLSX from "xlsx";

export function exportBillsToExcel(bills: Bill[], fileName = "bills_report") {
  const data = bills.map((b) => ({
    "Date": b.date,
    "Vendor Name": b.vendorName,
    "Bill Number": b.billNumber || "N/A",
    "Category": b.category,
    "Tax System": b.taxType || "GST",
    "Tax ID": b.taxId || b.gstin || "N/A",
    "Currency": b.currency || "INR",
    "Subtotal": b.subtotal,
    "Tax Amount": b.gstAmount,
    "Total Amount": b.totalAmount,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bills & Expenses");

  // Calculate widths
  const maxProps = [
    { wch: 12 }, // Date
    { wch: 25 }, // Vendor Name
    { wch: 15 }, // Bill Number
    { wch: 15 }, // Category
    { wch: 15 }, // Tax System
    { wch: 18 }, // Tax ID
    { wch: 10 }, // Currency
    { wch: 15 }, // Subtotal
    { wch: 15 }, // Tax Amount
    { wch: 18 }, // Total
  ];
  worksheet["!cols"] = maxProps;

  XLSX.writeFile(workbook, `${fileName}_${Date.now()}.xlsx`);
}

export async function exportBillsToPDF(bills: Bill[], title = "Expense & Tax Report") {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF("l", "mm", "a4");

  // Title
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(title, 14, 20);

  // Sub-header details
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 26);
  doc.text(`Total Records: ${bills.length}`, 14, 31);

  const totalExpenseString = bills
    .map((b) => b.currency || "INR")
    .filter((v, i, self) => self.indexOf(v) === i)
    .map((curr) => {
      const sum = bills.filter((b) => (b.currency || "INR") === curr).reduce((acc, b) => acc + b.totalAmount, 0);
      return `${curr} ${sum.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    })
    .join(" | ");

  const totalTaxString = bills
    .map((b) => b.currency || "INR")
    .filter((v, i, self) => self.indexOf(v) === i)
    .map((curr) => {
      const sum = bills.filter((b) => (b.currency || "INR") === curr).reduce((acc, b) => acc + b.gstAmount, 0);
      return `${curr} ${sum.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    })
    .join(" | ");

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`Total Expense: ${totalExpenseString || "None"}  |  Total Tax Paid: ${totalTaxString || "None"}`, 14, 38);

  const headers = [
    [
      "Date",
      "Vendor",
      "Bill #",
      "Category",
      "Tax System",
      "Tax ID",
      "Currency",
      "Subtotal",
      "Tax Paid",
      "Total",
    ],
  ];

  const body = bills.map((b) => [
    b.date,
    b.vendorName,
    b.billNumber || "-",
    b.category,
    b.taxType || "GST",
    b.taxId || b.gstin || "-",
    b.currency || "INR",
    b.subtotal.toFixed(2),
    b.gstAmount.toFixed(2),
    b.totalAmount.toFixed(2),
  ]);

  autoTable(doc, {
    head: headers,
    body: body,
    startY: 44,
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229] }, // indigo-600
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 28 },
    },
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.pdf`);
}
