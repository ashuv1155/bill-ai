"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchBills, Bill } from "@/services/billService";
import { exportBillsToExcel, exportBillsToPDF } from "@/services/reportService";
import Sidebar from "@/components/Sidebar";
import { detectUserRegion, UserRegion } from "@/lib/geo";
import {
  FileText,
  FileDown,
  Calendar,
  Filter,
  TrendingDown,
  Coins,
  IndianRupee,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";

const getCurrencySymbol = (currency?: string) => {
  switch (currency) {
    case "USD": return "$";
    case "EUR": return "€";
    case "GBP": return "£";
    case "CAD": return "C$";
    case "AUD": return "A$";
    case "INR":
    default:
      return "₹";
  }
};

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>("All");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("All");
  const [userRegion, setUserRegion] = useState<UserRegion | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadData() {
      if (user) {
        try {
          const region = await detectUserRegion();
          setUserRegion(region);
          setSelectedCurrency(region.defaultCurrency);

          const list = await fetchBills(user.uid);
          setBills(list);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    }
    loadData();
  }, [user]);

  // Sync selectedYear state with available data years to avoid select selection desyncs
  useEffect(() => {
    if (bills.length > 0) {
      const parsedYears = Array.from(
        new Set(
          bills
            .map((b) => {
              const dateParts = b.date.split("/");
              if (dateParts.length === 3) {
                return dateParts[2]; // return YYYY from DD/MM/YYYY
              }
              const d = new Date(b.date);
              return isNaN(d.getTime()) ? null : d.getFullYear().toString();
            })
            .filter((y): y is string => !!y)
        )
      );
      if (parsedYears.length > 0 && !parsedYears.includes(selectedYear)) {
        setSelectedYear(parsedYears[0]);
      }
    }
  }, [bills, selectedYear]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  const parseDateString = (dateStr: string): Date => {
    if (!dateStr) return new Date(NaN);
    let d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;

    // Split DD/MM/YYYY
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date(NaN);
  };

  // Years available from bills
  const years = Array.from(
    new Set(
      bills
        .map((b) => {
          const d = parseDateString(b.date);
          return isNaN(d.getTime()) ? null : d.getFullYear().toString();
        })
        .filter((y): y is string => !!y)
    )
  );
  if (years.length === 0) {
    years.push(new Date().getFullYear().toString());
  }

  const months = [
    { value: "All", name: "All Months" },
    { value: "01", name: "January" },
    { value: "02", name: "February" },
    { value: "03", name: "March" },
    { value: "04", name: "April" },
    { value: "05", name: "May" },
    { value: "06", name: "June" },
    { value: "07", name: "July" },
    { value: "08", name: "August" },
    { value: "09", name: "September" },
    { value: "10", name: "October" },
    { value: "11", name: "November" },
    { value: "12", name: "December" },
  ];

  // Filtering logic
  const filteredBills = bills.filter((b) => {
    const d = parseDateString(b.date);
    if (isNaN(d.getTime())) return false;

    const matchesYear = d.getFullYear().toString() === selectedYear;
    let matchesMonth = true;
    if (selectedMonth !== "All") {
      const monthStr = (d.getMonth() + 1).toString().padStart(2, "0");
      matchesMonth = monthStr === selectedMonth;
    }

    let matchesCurrency = true;
    if (selectedCurrency !== "All") {
      matchesCurrency = (b.currency || "INR") === selectedCurrency;
    }

    return matchesYear && matchesMonth && matchesCurrency;
  });

  // Calculate aggregates
  const totalBills = filteredBills.length;
  const totalExpense = filteredBills.reduce((acc, b) => acc + b.totalAmount, 0);
  const totalGst = filteredBills.reduce((acc, b) => acc + b.gstAmount, 0);
  const totalCgst = filteredBills.reduce((acc, b) => acc + b.cgst, 0);
  const totalSgst = filteredBills.reduce((acc, b) => acc + b.sgst, 0);
  const totalIgst = filteredBills.reduce((acc, b) => acc + b.igst, 0);
  const totalSavings = totalGst; // Input Tax Credit

  // Export handlers
  const handleExportExcel = () => {
    const monthName = months.find((m) => m.value === selectedMonth)?.name || "";
    const reportTitle = `bills_report_${selectedYear}_${monthName.toLowerCase().replace(/\s+/g, "_")}`;
    exportBillsToExcel(filteredBills, reportTitle);
  };

  const handleExportPDF = () => {
    const monthName = months.find((m) => m.value === selectedMonth)?.name || "";
    const reportTitle = `Expense and Tax Report - ${monthName} ${selectedYear}`;
    exportBillsToPDF(filteredBills, reportTitle);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0c0a0f]">
      <Sidebar />

      <main className="flex-grow p-6 lg:p-10 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Tax Reports</h1>
            <p className="text-slate-400 text-sm mt-1">Export formatted summaries and GST credits</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportExcel}
              disabled={filteredBills.length === 0}
              className="flex items-center gap-2 bg-[#10b981]/10 border border-[#10b981]/20 hover:bg-[#10b981]/25 text-[#10b981] font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel Export
            </button>
            <button
              onClick={handleExportPDF}
              disabled={filteredBills.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-purple-500/10 disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              PDF Export
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row gap-6 items-center">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Report Filters</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Select Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm focus:outline-none focus:border-purple-500 text-white"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Select Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm focus:outline-none focus:border-purple-500 text-white"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Currency</label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-sm focus:outline-none focus:border-purple-500 text-white"
              >
                <option value="All">All Currencies</option>
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Metric widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scanned Bills</p>
            <h3 className="text-3xl font-bold text-white mt-2">{totalBills}</h3>
            <p className="text-[10px] text-slate-500 mt-2">Active documents in this window</p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accumulated Cost</p>
            <h3 className="text-3xl font-bold text-white mt-2">
              {selectedCurrency === "All" ? "" : getCurrencySymbol(selectedCurrency)}
              {totalExpense.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {selectedCurrency === "All" && " (Mixed)"}
            </h3>
            <p className="text-[10px] text-slate-500 mt-2">Total gross spent amount</p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accumulated Tax</p>
            <h3 className="text-3xl font-bold text-[#10b981] mt-2">
              {selectedCurrency === "All" ? "" : getCurrencySymbol(selectedCurrency)}
              {totalGst.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {selectedCurrency === "All" && " (Mixed)"}
            </h3>
            <p className="text-[10px] text-slate-500 mt-2">Total GST charge values</p>
          </div>

          <div className="glass-card p-6 rounded-2xl bg-gradient-to-br from-purple-900/10 to-indigo-900/10 border-purple-500/20">
            <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Estimated Savings</p>
            <h3 className="text-3xl font-bold text-purple-400 mt-2">
              {selectedCurrency === "All" ? "" : getCurrencySymbol(selectedCurrency)}
              {totalSavings.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {selectedCurrency === "All" && " (Mixed)"}
            </h3>
            <p className="text-[10px] text-purple-300 mt-2">Calculated Input Tax Credits (ITC)</p>
          </div>
        </div>

        {/* Tax Breakdown tables */}
        {selectedCurrency === "USD" && (
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">US Sales Tax Summary Ledger</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-black/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Total Invoices</th>
                    <th className="px-6 py-4">Gross Taxable Subtotal</th>
                    <th className="px-6 py-4">State/Local Tax Paid</th>
                    <th className="px-6 py-4 text-right">Max Deduction Claim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{totalBills}</td>
                    <td className="px-6 py-4 font-medium text-white">{getCurrencySymbol(selectedCurrency)}{(totalExpense - totalGst).toFixed(2)}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">{getCurrencySymbol(selectedCurrency)}{totalGst.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-extrabold text-purple-400">{getCurrencySymbol(selectedCurrency)}{totalSavings.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(selectedCurrency === "GBP" || selectedCurrency === "EUR") && (
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">VAT Summary Ledger (UK/Europe)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-black/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Total Invoices</th>
                    <th className="px-6 py-4">Net Subtotal</th>
                    <th className="px-6 py-4">VAT Paid</th>
                    <th className="px-6 py-4 text-right font-bold">Claimable Input Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{totalBills}</td>
                    <td className="px-6 py-4 font-medium text-white">{getCurrencySymbol(selectedCurrency)}{(totalExpense - totalGst).toFixed(2)}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">{getCurrencySymbol(selectedCurrency)}{totalGst.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-extrabold text-purple-400">{getCurrencySymbol(selectedCurrency)}{totalSavings.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(selectedCurrency === "INR" || selectedCurrency === "All") && (
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Tax Ledger Details (GST India)</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-black/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Total CGST</th>
                    <th className="px-6 py-4">Total SGST</th>
                    <th className="px-6 py-4">Total IGST</th>
                    <th className="px-6 py-4">Total GST Paid</th>
                    <th className="px-6 py-4 text-right">Max Deduction Claim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{getCurrencySymbol(selectedCurrency)}{totalCgst.toFixed(2)}</td>
                    <td className="px-6 py-4 font-medium text-white">{getCurrencySymbol(selectedCurrency)}{totalSgst.toFixed(2)}</td>
                    <td className="px-6 py-4 font-medium text-white">{getCurrencySymbol(selectedCurrency)}{totalIgst.toFixed(2)}</td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">{getCurrencySymbol(selectedCurrency)}{totalGst.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-extrabold text-purple-400">{getCurrencySymbol(selectedCurrency)}{totalSavings.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Bill record summary list */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5 bg-white/[0.01]">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Included Transactions ({totalBills})</h4>
          </div>
          <div className="overflow-x-auto">
            {filteredBills.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 italic">No transactions match these filter choices.</div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-black/30 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Vendor</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">GSTIN</th>
                    <th className="px-6 py-3.5 text-right">Subtotal</th>
                    <th className="px-6 py-3.5 text-right">GST</th>
                    <th className="px-6 py-3.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBills.map((b) => (
                    <tr key={b.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-6 py-3.5 whitespace-nowrap">{b.date}</td>
                      <td className="px-6 py-3.5 font-medium text-white truncate max-w-[150px]">{b.vendorName}</td>
                      <td className="px-6 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/15">
                          {b.category}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-mono">{b.gstin || b.taxId || "-"}</td>
                      <td className="px-6 py-3.5 text-right">{getCurrencySymbol(b.currency)}{b.subtotal.toFixed(2)}</td>
                      <td className="px-6 py-3.5 text-right text-emerald-400">{getCurrencySymbol(b.currency)}{b.gstAmount.toFixed(2)}</td>
                      <td className="px-6 py-3.5 text-right font-bold text-white">{getCurrencySymbol(b.currency)}{b.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
