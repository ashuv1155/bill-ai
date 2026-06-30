"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchBills, updateBill, Bill } from "@/services/billService";
import Sidebar from "@/components/Sidebar";
import {
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Copy,
  Check,
  CheckCircle2,
  Circle,
  Receipt,
  Search,
  Filter,
  ArrowUpRight,
  TrendingDown,
} from "lucide-react";

export default function ShieldPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All"); // All, Active, Resolved
  const [searchTerm, setSearchTerm] = useState("");

  // Verification redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function loadData() {
      if (user) {
        try {
          const list = await fetchBills(user.uid);
          setBills(list);
        } catch (error) {
          console.error("Failed to load bills for auditor:", error);
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

  // Filter bills to only those containing audit alerts
  const auditedBills = bills.filter((b) => b.auditAlerts && b.auditAlerts.length > 0);

  // Toggle alert resolution
  const handleToggleResolve = async (billId: string, alertLineItem: string) => {
    const billToUpdate = bills.find((b) => b.id === billId);
    if (!billToUpdate) return;

    const currentResolved = billToUpdate.resolvedAlerts || [];
    let updatedResolved: string[];

    if (currentResolved.includes(alertLineItem)) {
      updatedResolved = currentResolved.filter((item) => item !== alertLineItem);
    } else {
      updatedResolved = [...currentResolved, alertLineItem];
    }

    const updatedBill = {
      ...billToUpdate,
      resolvedAlerts: updatedResolved,
    };

    // Optimistic UI state update
    setBills((prev) => prev.map((b) => (b.id === billId ? updatedBill : b)));

    try {
      await updateBill(billId, { resolvedAlerts: updatedResolved });
    } catch (err) {
      console.error("Failed to update dispute resolution:", err);
      alert("Failed to save changes. Please try again.");
      // Rollback on failure
      setBills((prev) => prev.map((b) => (b.id === billId ? billToUpdate : b)));
    }
  };

  // Metrics calculations
  const totalAuditedInvoices = auditedBills.length;
  
  let totalFlagsRaised = 0;
  let potentialSavings = 0;
  let resolvedDisputesCount = 0;
  let recoveredSavings = 0;

  auditedBills.forEach((b) => {
    const alerts = b.auditAlerts || [];
    const resolved = b.resolvedAlerts || [];

    alerts.forEach((alert) => {
      totalFlagsRaised++;
      potentialSavings += alert.amount;
      if (resolved.includes(alert.lineItem)) {
        resolvedDisputesCount++;
        recoveredSavings += alert.amount;
      }
    });
  });

  // Apply filters and searches
  const filteredAuditedBills = auditedBills
    .map((b) => {
      // Filter the individual alerts inside each bill
      const alerts = (b.auditAlerts || []).filter((alert) => {
        // Search filter
        const matchesSearch =
          b.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          alert.lineItem.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        // Category filter
        if (categoryFilter !== "All" && alert.type !== categoryFilter) return false;

        // Status filter
        const isResolved = (b.resolvedAlerts || []).includes(alert.lineItem);
        if (statusFilter === "Active" && isResolved) return false;
        if (statusFilter === "Resolved" && !isResolved) return false;

        return true;
      });

      return {
        ...b,
        filteredAlerts: alerts,
      };
    })
    .filter((b) => b.filteredAlerts.length > 0);

  const handleCopyScript = (scriptText: string, uniqueKey: string) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedIndex(uniqueKey);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0c0a0f]">
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-grow p-6 lg:p-10 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-8 w-8 text-purple-500 shrink-0" />
              AI Bill Shield
            </h1>
            <p className="text-slate-400 text-sm mt-1">Smart auditing, hidden fee disputes, and savings recoveries</p>
          </div>
          <button
            onClick={() => router.push("/bills")}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl transition-all shadow-md shadow-purple-500/10 active:scale-[0.98]"
          >
            Upload Bill to Audit
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        {/* Shield Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audited Bills</p>
                <h3 className="text-3xl font-bold text-white mt-2">
                  {loading ? "..." : totalAuditedInvoices}
                </h3>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4">Total invoices scanned by Shield Sentry</p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Flags</p>
                <h3 className="text-3xl font-bold text-rose-500 mt-2">
                  {loading ? "..." : totalFlagsRaised - resolvedDisputesCount}
                </h3>
              </div>
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4">Unresolved charges waiting for dispute</p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Potential Savings</p>
                <h3 className="text-3xl font-bold text-amber-400 mt-2">
                  {loading ? "..." : `₹${potentialSavings.toLocaleString("en-IN")}`}
                </h3>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-4">Total amount of flagged extra charges</p>
          </div>

          <div className="glass-card p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disputes Resolved</p>
                <h3 className="text-3xl font-bold text-emerald-400 mt-2">
                  {loading ? "..." : `₹${recoveredSavings.toLocaleString("en-IN")}`}
                </h3>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[10px] text-emerald-400 mt-4">✓ {resolvedDisputesCount} charges successfully waived</p>
          </div>
        </div>

        {/* Filter Panel */}
        <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by vendor name or line item..."
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
            />
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap gap-3 items-center w-full md:w-auto">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full md:w-40 bg-black/30 border border-white/5 rounded-xl text-xs p-2 focus:outline-none focus:border-purple-500 text-white"
            >
              <option value="All">All Types</option>
              <option value="junk_fee">Junk Fees</option>
              <option value="tax_discrepancy">Tax Discrepancies</option>
              <option value="suspicious_item">Suspicious Items</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-40 bg-black/30 border border-white/5 rounded-xl text-xs p-2 focus:outline-none focus:border-purple-500 text-white"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Flags</option>
              <option value="Resolved">Resolved Disputes</option>
            </select>
          </div>
        </div>

        {/* Audit Log list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : filteredAuditedBills.length === 0 ? (
          <div className="text-center py-16 border border-white/5 rounded-2xl bg-white/[0.01]">
            <ShieldCheck className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-md font-semibold text-slate-300">All clear! No flags found</p>
            <p className="text-xs text-slate-500 mt-1">There are no matching audit warnings in your system.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAuditedBills.map((b) => (
              <div key={b.id} className="glass-panel p-6 rounded-2xl space-y-4">
                {/* Bill Header Info */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-4 border-b border-white/5">
                  <div>
                    <h4 className="text-md font-bold text-white">{b.vendorName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Invoice: <strong className="text-slate-400">{b.billNumber || "N/A"}</strong> | Date: {b.date}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/bills")}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 text-left"
                  >
                    View Original Bill →
                  </button>
                </div>

                {/* Bill Alerts */}
                <div className="space-y-4">
                  {b.filteredAlerts.map((alertItem, idx) => {
                    const uniqueKey = `${b.id}-${idx}`;
                    const isResolved = (b.resolvedAlerts || []).includes(alertItem.lineItem);

                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isResolved
                            ? "bg-emerald-500/[0.02] border-emerald-500/20 opacity-70"
                            : "bg-amber-500/[0.02] border-amber-500/20"
                        } flex flex-col md:flex-row gap-4 justify-between items-start relative overflow-hidden`}
                      >
                        {/* Audit Details */}
                        <div className="space-y-2 flex-grow">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                alertItem.type === "junk_fee"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : alertItem.type === "tax_discrepancy"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              }`}
                            >
                              {alertItem.type.replace("_", " ")}
                            </span>
                            
                            <h5 className="text-xs font-bold text-white">
                              {alertItem.lineItem} — <span className="text-amber-400">₹{alertItem.amount}</span>
                            </h5>
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                            {alertItem.explanation}
                          </p>

                          {/* Dispute script */}
                          {!isResolved && alertItem.disputeScript && (
                            <div className="mt-3 p-3 rounded-lg bg-black/40 border border-white/5">
                              <div className="flex justify-between items-center mb-1 text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
                                <span>Copy dispute template</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyScript(alertItem.disputeScript, uniqueKey)}
                                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold normal-case"
                                >
                                  {copiedIndex === uniqueKey ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-400" />
                                      <span className="text-emerald-400">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>Copy script</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-slate-300 italic text-[11px] leading-relaxed select-all">
                                "{alertItem.disputeScript}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Audit Action Status */}
                        <div className="flex items-center gap-2 self-stretch md:self-center border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-4 shrink-0">
                          <button
                            onClick={() => handleToggleResolve(b.id, alertItem.lineItem)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              isResolved
                                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                                : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                            }`}
                          >
                            {isResolved ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                <span>Dispute Resolved</span>
                              </>
                            ) : (
                              <>
                                <Circle className="h-4 w-4 text-slate-500" />
                                <span>Mark Resolved</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
