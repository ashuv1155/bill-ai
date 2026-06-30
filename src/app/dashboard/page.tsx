"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchBills, Bill } from "@/services/billService";
import Sidebar from "@/components/Sidebar";
import { detectUserRegion } from "@/lib/geo";
import {
  Receipt,
  DollarSign,
  Coins,
  TrendingDown,
  TrendingUp,
  BrainCircuit,
  Calendar,
  Sparkles,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 0.012,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.73,
  AUD: 0.66,
};

const convertCurrency = (amount: number, from: string = "USD", to: string): number => {
  const fromRate = EXCHANGE_RATES[from] || 1.0;
  const toRate = EXCHANGE_RATES[to] || 1.0;
  // Convert from currency to USD base first, then to target currency
  const amountInUsd = amount * fromRate;
  return amountInUsd / toRate;
};

const getCurrencySymbol = (currency?: string) => {
  switch (currency) {
    case "USD": return "$";
    case "EUR": return "€";
    case "GBP": return "£";
    case "CAD": return "C$";
    case "AUD": return "A$";
    case "INR": return "₹";
    default: return "$";
  }
};

export default function Dashboard() {
  const { user, loading: authLoading, sendVerificationEmail } = useAuth();
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [dashboardCurrency, setDashboardCurrency] = useState("USD");
  const [sendingVerification, setSendingVerification] = useState(false);

  const handleResendVerification = async () => {
    setSendingVerification(true);
    try {
      await sendVerificationEmail();
      setVerificationSent(true);
    } catch (err: any) {
      alert("Failed to send verification link: " + err.message);
    } finally {
      setSendingVerification(false);
    }
  };

  // Verification redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    setMounted(true);
    async function loadData() {
      if (user) {
        try {
          const region = await detectUserRegion();
          setDashboardCurrency(region.defaultCurrency);

          const list = await fetchBills(user.uid);
          setBills(list);
        } catch (error) {
          console.error("Failed to load bills:", error);
        } finally {
          setLoading(false);
        }
      }
    }
    loadData();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  // Dashboard Stats Calculations
  const totalBills = bills.length;
  const totalExpense = bills.reduce((acc, b) => acc + convertCurrency(b.totalAmount, b.currency || "INR", dashboardCurrency), 0);
  const totalGstPaid = bills.reduce((acc, b) => acc + convertCurrency(b.gstAmount, b.currency || "INR", dashboardCurrency), 0);
  // Estimate Tax Saved: Input tax credit saves dollar-for-dollar from liability
  const taxSaved = totalGstPaid; 

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

  // Monthly breakdown
  const monthlyDataMap: { [month: string]: { month: string; expense: number; tax: number } } = {};
  
  bills.forEach((b) => {
    const dateObj = parseDateString(b.date);
    if (!isNaN(dateObj.getTime())) {
      const monthLabel = dateObj.toLocaleString("default", { month: "short" });
      if (!monthlyDataMap[monthLabel]) {
        monthlyDataMap[monthLabel] = { month: monthLabel, expense: 0, tax: 0 };
      }
      monthlyDataMap[monthLabel].expense += convertCurrency(b.totalAmount, b.currency || "INR", dashboardCurrency);
      monthlyDataMap[monthLabel].tax += convertCurrency(b.gstAmount, b.currency || "INR", dashboardCurrency);
    }
  });

  const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = Object.values(monthlyDataMap).sort(
    (a, b) => monthsOrder.indexOf(a.month) - monthsOrder.indexOf(b.month)
  );

  // Category breakdown
  const categoryMap: { [category: string]: number } = {};
  bills.forEach((b) => {
    const cat = b.category || "Miscellaneous";
    categoryMap[cat] = (categoryMap[cat] || 0) + convertCurrency(b.totalAmount, b.currency || "INR", dashboardCurrency);
  });

  const COLORS = [
    "#c084fc", // purple
    "#6366f1", // indigo
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#f43f5e", // rose
    "#06b6d4", // cyan
    "#64748b", // slate
  ];

  const categoryData = Object.keys(categoryMap).map((key, i) => ({
    name: key,
    value: categoryMap[key],
    color: COLORS[i % COLORS.length],
  }));

  // Generating dynamic AI Insights based on user expenses
  const generateInsights = () => {
    if (bills.length === 0) {
      return [
        {
          title: "No expenses recorded",
          description: "Upload your first bill in the 'Bill Management' tab to see AI recommendations.",
          type: "info",
        },
      ];
    }

    const insights = [];

    // Category concentration check
    if (categoryData.length > 0) {
      const sortedCategories = [...categoryData].sort((a, b) => b.value - a.value);
      const topCat = sortedCategories[0];
      const percent = ((topCat.value / totalExpense) * 100).toFixed(0);
      insights.push({
        title: `High concentration in ${topCat.name}`,
        description: `Your spending on ${topCat.name} makes up ${percent}% of your total outflow. Consider optimizing vendor prices in this category.`,
        type: "warning",
      });
    }

    // Tax credits check
    const missingGstinCount = bills.filter((b) => !b.gstin && b.gstAmount > 0).length;
    if (missingGstinCount > 0) {
      insights.push({
        title: "Claimable Input Tax Credit (ITC)",
        description: `You have ${missingGstinCount} bills with GST paid but no Vendor GSTIN registered. Add GSTIN to save up to ${getCurrencySymbol(dashboardCurrency)} ${bills.reduce((a, b) => a + (!b.gstin ? convertCurrency(b.gstAmount, b.currency || "INR", dashboardCurrency) : 0), 0).toFixed(0)} in taxes.`,
        type: "tax",
      });
    } else {
      insights.push({
        title: "All tax credits maximized",
        description: "Great! All bills containing GST charges have valid GSTIN information attached.",
        type: "success",
      });
    }

    // Savings recommendation
    if (totalExpense > 50000) {
      insights.push({
        title: "High spending warning",
        description: "Your monthly spending exceeds typical software benchmarks. We recommend auditing idle licenses on Software categories.",
        type: "recommendation",
      });
    } else {
      insights.push({
        title: "Healthy expense run-rate",
        description: "Your operational costs are fully matching standard projections. Continue scanning regularly.",
        type: "success",
      });
    }

    // AI Bill Shield Auditing Sentry Check
    const billsWithAlerts = bills.filter((b) => b.auditAlerts && b.auditAlerts.length > 0);
    const totalAlertsCount = billsWithAlerts.reduce((acc, b) => acc + (b.auditAlerts?.length || 0), 0);
    const potentialSavings = billsWithAlerts.reduce(
      (acc, b) => acc + (b.auditAlerts?.reduce((sumAlerts, alert) => sumAlerts + convertCurrency(alert.amount, b.currency || "INR", dashboardCurrency), 0) || 0),
      0
    );

    if (totalAlertsCount > 0) {
      insights.push({
        title: `AI Shield: ${totalAlertsCount} flags`,
        description: `We identified ${totalAlertsCount} questionable charges (hidden convenience fees or billing anomalies) totaling ${getCurrencySymbol(dashboardCurrency)}${potentialSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}. Go to 'Bill Management' to dispute them.`,
        type: "warning",
      });
    }

    return insights;
  };

  const insightsList = generateInsights();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0c0a0f]">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-grow p-6 lg:p-10 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Real-time expense insights and tax tracking</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={dashboardCurrency}
              onChange={(e) => setDashboardCurrency(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-semibold"
            >
              <option value="USD">Base Currency: USD ($)</option>
              <option value="INR">Base Currency: INR (₹)</option>
              <option value="EUR">Base Currency: EUR (€)</option>
              <option value="GBP">Base Currency: GBP (£)</option>
              <option value="CAD">Base Currency: CAD (C$)</option>
              <option value="AUD">Base Currency: AUD (A$)</option>
            </select>

            <button
              onClick={() => router.push("/bills")}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all shadow-md shadow-purple-500/10 active:scale-[0.98] shrink-0"
            >
              Upload Bill
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Email Verification Banner */}
        {!user.emailVerified && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-semibold block text-white">Email Verification Required</span>
                <span className="text-slate-400 text-xs mt-0.5 block">
                  Please verify your email address to secure your account. A verification link has been sent to <strong className="text-slate-200">{user.email}</strong>.
                </span>
              </div>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={sendingVerification || verificationSent}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 disabled:opacity-50 transition-colors shrink-0"
            >
              {sendingVerification ? "Sending..." : verificationSent ? "Verification Link Sent!" : "Resend Link"}
            </button>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Bills</p>
                <h3 className="text-3xl font-bold text-white mt-2">
                  {loading ? "..." : totalBills}
                </h3>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-purple-400">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Scanning active</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expense</p>
                <h3 className="text-3xl font-bold text-white mt-2">
                  {loading ? "..." : `${getCurrencySymbol(dashboardCurrency)}${totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                </h3>
              </div>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
              <span>Gross spent across all classes</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax Paid</p>
                <h3 className="text-3xl font-bold text-white mt-2">
                  {loading ? "..." : `${getCurrencySymbol(dashboardCurrency)}${totalGstPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                </h3>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <Coins className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-400">
              <span>Calculated GST/VAT/Sales Tax</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax Saved</p>
                <h3 className="text-3xl font-bold text-white mt-2">
                  {loading ? "..." : `${getCurrencySymbol(dashboardCurrency)}${taxSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                </h3>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Input credit claimed</span>
            </div>
          </div>
        </div>

        {/* Charts & Insights Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Expense (Area Chart) */}
          <div className="glass-panel p-6 rounded-2xl lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center pb-2">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Monthly Spend Trend</h4>
              <Calendar className="h-4 w-4 text-slate-500" />
            </div>
            <div className="h-72 w-full">
              {loading ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">Loading charts...</div>
              ) : bills.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">No expenses to graph.</div>
              ) : mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#161224",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "12px",
                        color: "#fff",
                      }}
                    />
                    <Area type="monotone" dataKey="expense" stroke="#c084fc" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </div>

          {/* Category breakdown (Pie Chart) */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider pb-2">Expenses by Category</h4>
            <div className="h-48 w-full relative flex items-center justify-center">
              {loading ? (
                <div className="text-slate-500 text-sm">Loading charts...</div>
              ) : bills.length === 0 ? (
                <div className="text-slate-500 text-sm">No category distribution.</div>
              ) : mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value">
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => `${getCurrencySymbol(dashboardCurrency)}${value.toLocaleString()}`}
                      contentStyle={{
                        backgroundColor: "#161224",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
              {categoryData.length > 0 && (
                <div className="absolute text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Total</p>
                  <p className="text-lg font-bold text-white mt-0.5">
                    {getCurrencySymbol(dashboardCurrency)}{totalExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}
            </div>
            {/* Category legends */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {categoryData.slice(0, 6).map((cat) => (
                <div key={cat.name} className="flex items-center gap-1.5 truncate">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                  <span className="text-slate-400 truncate">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights & Recs */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-2">
            <BrainCircuit className="h-5 w-5 text-purple-400" />
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">AI Insights & Optimization</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insightsList.map((ins, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">{ins.title}</span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        ins.type === "warning"
                          ? "bg-rose-500"
                          : ins.type === "tax"
                          ? "bg-amber-400"
                          : "bg-emerald-500"
                      }`}
                    ></span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{ins.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
