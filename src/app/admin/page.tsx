"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  ShieldAlert,
  Users,
  Eye,
  FileCheck,
  TrendingUp,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  UserX,
  UserCheck,
  Percent,
  TrendingDown,
  Lock,
  Key,
} from "lucide-react";

interface AdminUserRecord {
  uid: string;
  name: string;
  email: string;
  joined: string;
  tier: "Starter" | "Growth" | "Business" | "Enterprise";
  scans: number;
  status: "Active" | "Suspended";
}

interface AdminAuditDoc {
  id: string;
  ownerEmail: string;
  vendorName: string;
  date: string;
  category: string;
  amount: number;
  compliance: "Pass" | "Flagged";
  flagDetails?: string;
}

export default function AdminDashboard() {
  const { user, loading: authLoading, subscriptionTier, updateSubscriptionTier } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Passcode Security States
  const [passcode, setPasscode] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");

  // System Stats & Records States
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);
  const [auditDocs, setAuditDocs] = useState<AdminAuditDoc[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState("All");
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    setMounted(true);
    if (!authLoading && !user) {
      router.push("/login");
    }

    // Check session authorization
    if (typeof window !== "undefined") {
      const authorized = sessionStorage.getItem("admin_authorized");
      if (authorized === "true") {
        setIsAuthorized(true);
      }
    }
  }, [user, authLoading, router]);

  // Load Real Data from Firebase or Mock Fallback
  useEffect(() => {
    if (!isAuthorized || !user) return;

    async function loadData() {
      setIsLoadingData(true);
      if (isFirebaseConfigured && db) {
        try {
          // 1. Fetch real users from Firestore
          const usersSnap = await getDocs(collection(db, "users"));
          const usersList: AdminUserRecord[] = usersSnap.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              uid: docSnap.id,
              name: data.displayName || "User",
              email: data.email || "",
              joined: data.joined || "2026-06-01",
              tier: data.tier || "Starter",
              scans: data.scans || 0,
              status: data.status || "Active",
            };
          });

          // 2. Fetch real bills from Firestore
          const billsSnap = await getDocs(collection(db, "bills"));
          const docsList: AdminAuditDoc[] = billsSnap.docs.map((docSnap) => {
            const data = docSnap.data();
            
            // Re-run simple compliance audit locally for display
            const flaggedKeywords = ["alcohol", "beer", "wine", "whiskey", "late fee", "penalty"];
            const isFlagged = data.lineItems?.some((item: any) =>
              flaggedKeywords.some((kw) => item.description?.toLowerCase().includes(kw))
            );

            // Match user emails dynamically
            const matchedUser = usersList.find((u) => u.uid === data.userId);

            return {
              id: docSnap.id,
              ownerEmail: matchedUser ? matchedUser.email : "unknown@company.com",
              vendorName: data.vendorName || "Merchant",
              date: data.date || "2026-06-01",
              category: data.category || "Miscellaneous",
              amount: data.totalAmount || 0,
              compliance: isFlagged ? "Flagged" : "Pass",
              flagDetails: isFlagged ? "Flagged line item detected" : undefined,
            };
          });

          setAdminUsers(usersList);
          setAuditDocs(docsList);
        } catch (err) {
          console.error("Failed to load Firebase admin data, falling back to local simulation:", err);
          loadMockFallback();
        } finally {
          setIsLoadingData(false);
        }
      } else {
        // Fallback to local simulation
        loadMockFallback();
        setIsLoadingData(false);
      }
    }

    function loadMockFallback() {
      const storedUsers = localStorage.getItem("admin_users_db");
      const currentSavedTier = localStorage.getItem("saas_sub_tier") as any || "Starter";
      const currentSavedScans = Number(localStorage.getItem("saas_scan_count") || "4");

      let usersList: AdminUserRecord[] = [];
      if (storedUsers) {
        const parsed: AdminUserRecord[] = JSON.parse(storedUsers);
        usersList = parsed.map((u) => {
          if (user && u.email === user.email) {
            return { ...u, tier: currentSavedTier, scans: currentSavedScans };
          }
          return u;
        });
      } else {
        usersList = [
          { uid: user ? user.uid : "demo-admin", name: user?.displayName || "You", email: user?.email || "admin@company.com", joined: "2026-06-01", tier: currentSavedTier, scans: currentSavedScans, status: "Active" },
          { uid: "usr-2", name: "Joey Tribbiani", email: "joey@company.com", joined: "2026-06-15", tier: "Business", scans: 14, status: "Active" },
          { uid: "usr-3", name: "Rachel Green", email: "rachel@company.com", joined: "2026-06-10", tier: "Business", scans: 8, status: "Active" },
          { uid: "usr-4", name: "Monica Geller", email: "monica@company.com", joined: "2026-06-20", tier: "Starter", scans: 10, status: "Active" },
          { uid: "usr-5", name: "Chandler Bing", email: "chandler@company.com", joined: "2026-06-18", tier: "Growth", scans: 25, status: "Active" },
          { uid: "usr-6", name: "Janice Litman", email: "janice@ohmygod.com", joined: "2026-06-22", tier: "Starter", scans: 3, status: "Suspended" },
        ];
      }
      setAdminUsers(usersList);
      localStorage.setItem("admin_users_db", JSON.stringify(usersList));

      const storedDocs = localStorage.getItem("admin_audit_docs");
      if (storedDocs) {
        setAuditDocs(JSON.parse(storedDocs));
      } else {
        const initialDocs: AdminAuditDoc[] = [
          { id: "doc-1", ownerEmail: "joey@company.com", vendorName: "Starbucks Client Lunch", date: "2026-06-25", category: "Food", amount: 145.50, compliance: "Pass" },
          { id: "doc-2", ownerEmail: "joey@company.com", vendorName: "Delta Airlines Ticket", date: "2026-06-24", category: "Travel", amount: 1250.00, compliance: "Pass" },
          { id: "doc-3", ownerEmail: "monica@company.com", vendorName: "Local Liquor Store", date: "2026-06-22", category: "Food", amount: 89.90, compliance: "Flagged", flagDetails: "Alcohol keyword detected in line items" },
          { id: "doc-4", ownerEmail: "chandler@company.com", vendorName: "SaaS Monthly - Slack", date: "2026-06-21", category: "Software", amount: 320.00, compliance: "Pass" },
          { id: "doc-5", ownerEmail: user?.email || "admin@company.com", vendorName: "Duplicate Supplier Corp", date: "2026-06-19", category: "Office Expense", amount: 450.00, compliance: "Flagged", flagDetails: "Duplicate invoice reference detected" },
        ];
        setAuditDocs(initialDocs);
        localStorage.setItem("admin_audit_docs", JSON.stringify(initialDocs));
      }
    }

    loadData();
  }, [isAuthorized, user]);

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "admin123") {
      setIsAuthorized(true);
      sessionStorage.setItem("admin_authorized", "true");
      setAuthError("");
    } else {
      setAuthError("Invalid administrator passcode. Please try again.");
    }
  };

  // Update Plan Tier dynamically in Firestore or LocalStorage
  const handleUpdateTier = async (uid: string, email: string, newTier: any) => {
    const updated = adminUsers.map((u) => {
      if (u.uid === uid) return { ...u, tier: newTier };
      return u;
    });
    setAdminUsers(updated);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "users", uid), { tier: newTier });
      } catch (err) {
        console.error("Failed to update user tier in Firestore:", err);
      }
    } else {
      localStorage.setItem("admin_users_db", JSON.stringify(updated));
    }

    if (user && email === user.email) {
      updateSubscriptionTier(newTier);
    }
  };

  // Reset usage scans to 0 in Firestore or LocalStorage
  const handleResetScans = async (uid: string, email: string) => {
    const updated = adminUsers.map((u) => {
      if (u.uid === uid) return { ...u, scans: 0 };
      return u;
    });
    setAdminUsers(updated);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "users", uid), { scans: 0 });
      } catch (err) {
        console.error("Failed to reset scans in Firestore:", err);
      }
    } else {
      localStorage.setItem("admin_users_db", JSON.stringify(updated));
    }

    if (user && email === user.email) {
      localStorage.setItem("saas_scan_count", "0");
      window.location.reload();
    }
  };

  // Toggle user status active/suspended
  const handleToggleStatus = async (uid: string) => {
    let nextStatus: "Active" | "Suspended" = "Active";
    const updated = adminUsers.map((u) => {
      if (u.uid === uid) {
        nextStatus = u.status === "Active" ? "Suspended" : "Active";
        return { ...u, status: nextStatus };
      }
      return u;
    });
    setAdminUsers(updated);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "users", uid), { status: nextStatus });
      } catch (err) {
        console.error("Failed to toggle status in Firestore:", err);
      }
    } else {
      localStorage.setItem("admin_users_db", JSON.stringify(updated));
    }
  };

  // Filtered Users
  const filteredUsers = adminUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = filterTier === "All" || u.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  // Global Platform Metrics
  const totalScansAll = adminUsers.reduce((sum, u) => sum + u.scans, 0);
  const activeSubsMrr = adminUsers.reduce((sum, u) => {
    if (u.status === "Suspended") return sum;
    if (u.tier === "Growth") return sum + 15;
    if (u.tier === "Business") return sum + 49;
    if (u.tier === "Enterprise") return sum + 149;
    return sum;
  }, 0);

  // Render Lock Screen if not authorized
  if (!isAuthorized) {
    return (
      <div className="flex flex-col lg:flex-row min-h-screen bg-[#0c0a0f] text-slate-100">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-6 bg-[#0c0a0f]">
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="w-full max-w-md p-8 rounded-3xl glass-card border border-white/10 bg-[#161224] relative overflow-hidden shadow-2xl">
            <div className="flex flex-col items-center mb-6 text-center space-y-3">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Admin Authentication</h2>
              <p className="text-slate-400 text-xs px-4">
                This page is password protected. Enter your administrator passcode to access user management controls.
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                {authError}
              </div>
            )}

            <form onSubmit={handleVerifyPasscode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Passcode
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 focus:bg-white/[0.08]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all active:scale-[0.98]"
              >
                Authenticate
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0c0a0f] text-slate-100">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto relative">
        {/* Glow */}
        <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto space-y-8 relative z-10">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Admin <span className="text-gradient">Panel</span>
            </h1>
            <p className="text-slate-400 text-sm">
              Global B2B administrative suite. Manage user subscription permissions, track scan counts, and monitor document auditing.
            </p>
          </div>

          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
              <p className="text-xs text-slate-500">Querying live Firebase records...</p>
            </div>
          ) : (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="glass-card p-5 rounded-2xl border border-white/5 bg-[#110c1c]/50 flex items-center gap-4">
                  <div className="p-3.5 bg-purple-500/10 border border-purple-500/25 rounded-xl text-purple-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Total Users</p>
                    <h4 className="text-2xl font-extrabold text-white mt-0.5">{adminUsers.length}</h4>
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-white/5 bg-[#110c1c]/50 flex items-center gap-4">
                  <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl text-indigo-400">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Total Scans</p>
                    <h4 className="text-2xl font-extrabold text-white mt-0.5">{totalScansAll}</h4>
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-white/5 bg-[#110c1c]/50 flex items-center gap-4">
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Estimated MRR</p>
                    <h4 className="text-2xl font-extrabold text-white mt-0.5">${activeSubsMrr}</h4>
                  </div>
                </div>

                <div className="glass-card p-5 rounded-2xl border border-white/5 bg-[#110c1c]/50 flex items-center gap-4">
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Flagged Invoices</p>
                    <h4 className="text-2xl font-extrabold text-white mt-0.5">
                      {auditDocs.filter((d) => d.compliance === "Flagged").length}
                    </h4>
                  </div>
                </div>
              </div>

              {/* User Management Section */}
              <div className="glass-card rounded-2xl border border-white/5 bg-[#110c1c]/50 p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h3 className="text-md font-bold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-400" />
                    SaaS User Management
                  </h3>

                  {/* Search & Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users..."
                        className="pl-9 pr-4 py-1.5 bg-[#0c0a0f] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <select
                      value={filterTier}
                      onChange={(e) => setFilterTier(e.target.value)}
                      className="bg-[#0c0a0f] border border-white/10 rounded-xl text-xs p-1.5 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="All">All Tiers</option>
                      <option value="Starter">Starter (Free)</option>
                      <option value="Growth">Growth</option>
                      <option value="Business">Business</option>
                      <option value="Enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider font-bold">
                        <th className="pb-3 pl-2">User / Name</th>
                        <th className="pb-3">Join Date</th>
                        <th className="pb-3">Plan Tier Override</th>
                        <th className="pb-3 text-center">Monthly Scans</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right pr-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((member) => (
                        <tr key={member.uid} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                          <td className="py-3.5 pl-2">
                            <p className="text-white font-semibold">{member.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{member.email}</p>
                          </td>
                          <td className="py-3.5 text-slate-300">{member.joined}</td>
                          <td className="py-3.5">
                            <select
                              value={member.tier}
                              onChange={(e) => handleUpdateTier(member.uid, member.email, e.target.value as any)}
                              className="bg-[#0c0a0f] border border-white/10 rounded-lg text-xs p-1.5 text-purple-300 font-semibold focus:outline-none"
                            >
                              <option value="Starter">Starter (Free)</option>
                              <option value="Growth">Growth ($15)</option>
                              <option value="Business">Business ($49)</option>
                              <option value="Enterprise">Enterprise ($149)</option>
                            </select>
                          </td>
                          <td className="py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-bold text-white">{member.scans}</span>
                              <button
                                onClick={() => handleResetScans(member.uid, member.email)}
                                className="p-1 text-slate-500 hover:text-purple-400 transition-colors"
                                title="Reset quota"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                member.status === "Active"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}
                            >
                              {member.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right pr-2">
                            <button
                              onClick={() => handleToggleStatus(member.uid)}
                              className={`p-1.5 rounded-lg border transition-all ${
                                member.status === "Active"
                                  ? "border-red-500/20 hover:bg-red-500/10 text-red-300"
                                  : "border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-300"
                              }`}
                              title={member.status === "Active" ? "Suspend user" : "Activate user"}
                            >
                              {member.status === "Active" ? (
                                <UserX className="h-3.5 w-3.5" />
                              ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Platform Document Auditing logs */}
              <div className="glass-card rounded-2xl border border-white/5 bg-[#110c1c]/50 p-6 space-y-6">
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-purple-400" />
                  Global Document Compliance Audit
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider font-bold">
                        <th className="pb-3 pl-2">Owner Account</th>
                        <th className="pb-3">Vendor / Merchant</th>
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Audit Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditDocs.map((doc) => (
                        <tr key={doc.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                          <td className="py-3.5 pl-2 text-slate-300">{doc.ownerEmail}</td>
                          <td className="py-3.5 text-white font-semibold">{doc.vendorName}</td>
                          <td className="py-3.5 text-slate-400">{doc.date}</td>
                          <td className="py-3.5">
                            <span className="bg-white/5 px-2 py-0.5 rounded text-slate-300">
                              {doc.category}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-200 font-bold">₹{doc.amount.toFixed(2)}</td>
                          <td className="py-3.5">
                            {doc.compliance === "Pass" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Pass
                              </span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                  Flagged
                                </span>
                                <span className="text-[9px] text-slate-500 leading-tight">
                                  {doc.flagDetails}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
