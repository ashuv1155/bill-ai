"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Check,
  X,
  Lock,
  ArrowRight,
  UserCheck,
  Building,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Approver" | "Submitter";
  status: "Active" | "Pending";
  token?: string;
}

interface ExpenseApproval {
  id: string;
  submitter: string;
  vendor: string;
  amount: number;
  date: string;
  status: "Pending" | "Approved" | "Rejected";
}

export default function Team() {
  const { user, loading: authLoading, subscriptionTier } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // States
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [approvals, setApprovals] = useState<ExpenseApproval[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"Admin" | "Approver" | "Submitter">("Submitter");
  const [requireApprovalOver, setRequireApprovalOver] = useState(500);
  const [autoApproveLowValue, setAutoApproveLowValue] = useState(true);

  const hasAccess = subscriptionTier === "Business" || subscriptionTier === "Enterprise";

  useEffect(() => {
    setMounted(true);
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load / Setup Mock Data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedMembers = localStorage.getItem("team_members");
      if (storedMembers) {
        setTeamMembers(JSON.parse(storedMembers));
      } else {
        const initialMembers: TeamMember[] = [
          { id: "1", name: "You", email: user?.email || "admin@company.com", role: "Admin", status: "Active" },
          { id: "2", name: "Rachel Green (Finance)", email: "rachel@company.com", role: "Approver", status: "Active" },
          { id: "3", name: "Joey Tribbiani (Sales)", email: "joey@company.com", role: "Submitter", status: "Active" },
          { id: "4", name: "Monica Geller", email: "monica@company.com", role: "Submitter", status: "Pending" },
        ];
        setTeamMembers(initialMembers);
        localStorage.setItem("team_members", JSON.stringify(initialMembers));
      }

      const storedApprovals = localStorage.getItem("team_approvals");
      if (storedApprovals) {
        setApprovals(JSON.parse(storedApprovals));
      } else {
        const initialApprovals: ExpenseApproval[] = [
          { id: "app-1", submitter: "Joey Tribbiani", vendor: "Client Lunch - Starbucks", amount: 145.50, date: "2026-06-25", status: "Pending" },
          { id: "app-2", submitter: "Joey Tribbiani", vendor: "Annual Flight Ticket - Delta Airlines", amount: 1250.00, date: "2026-06-24", status: "Pending" },
          { id: "app-3", submitter: "Monica Geller", vendor: "Office Cleaning Supplies", amount: 62.10, date: "2026-06-22", status: "Approved" },
        ];
        setApprovals(initialApprovals);
        localStorage.setItem("team_approvals", JSON.stringify(initialApprovals));
      }
    }
  }, [user]);

  if (!mounted || authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    const inviteToken = "tkn_" + Math.random().toString(36).substr(2, 9);
    const newMember: TeamMember = {
      id: "mem-" + Math.random().toString(36).substr(2, 9),
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      status: "Pending",
      token: inviteToken,
    };

    const updated = [...teamMembers, newMember];
    setTeamMembers(updated);
    localStorage.setItem("team_members", JSON.stringify(updated));

    setShowInviteModal(false);
    setInviteEmail("");
    setInviteName("");
    setInviteRole("Submitter");
  };

  const handleApprovalAction = (id: string, action: "Approved" | "Rejected") => {
    const updated = approvals.map((app) =>
      app.id === id ? { ...app, status: action } : app
    );
    setApprovals(updated);
    localStorage.setItem("team_approvals", JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0c0a0f] text-slate-100">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto relative">
        {/* Glow */}
        <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none"></div>

        {!hasAccess ? (
          /* Locked Premium State Overlay */
          <div className="max-w-4xl mx-auto min-h-[80vh] flex flex-col items-center justify-center text-center space-y-6 relative z-10">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400">
              <Lock className="h-10 w-10 animate-pulse" />
            </div>
            <div className="space-y-2 max-w-md">
              <h1 className="text-2xl font-extrabold text-white">
                Multi-User <span className="text-gradient">Team Spaces</span>
              </h1>
              <p className="text-slate-400 text-sm">
                Unlock collaborative workspaces. Allow employees to upload receipts and route claims to managers for verification.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 max-w-md w-full space-y-4 text-left">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Included in Business & Enterprise plans:
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Assign Admin, Approver, and Submitter roles</span>
                </li>
                <li className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Configure custom amount threshold limits for approvals</span>
                </li>
                <li className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Centralized billing logs for business accountants</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => router.push("/pricing")}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs py-3.5 px-8 rounded-xl shadow-lg shadow-purple-500/15 transition-all group active:scale-[0.98]"
            >
              Upgrade Your Subscription
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        ) : (
          /* Active Team Workspace View */
          <div className="max-w-6xl mx-auto space-y-8 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Team <span className="text-gradient">Spaces</span>
                </h1>
                <p className="text-slate-400 text-sm">
                  Add organization employees, distribute validation roles, and review pending tax expense approvals.
                </p>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs py-3 px-5 rounded-xl transition-all shadow active:scale-[0.98]"
              >
                <UserPlus className="h-4 w-4" />
                Invite Member
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Members List */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card rounded-2xl border border-white/5 bg-[#110c1c]/50 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-400" />
                    Active Space Directory ({teamMembers.length})
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider font-bold">
                          <th className="pb-3 pl-2">Name</th>
                          <th className="pb-3">Email Address</th>
                          <th className="pb-3">System Role</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right pr-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((member) => (
                          <tr key={member.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                            <td className="py-3.5 pl-2 text-white font-semibold">{member.name}</td>
                            <td className="py-3.5 text-slate-300">{member.email}</td>
                            <td className="py-3.5">
                              <span
                                className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                  member.role === "Admin"
                                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                    : member.role === "Approver"
                                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                    : "bg-slate-500/20 text-slate-300 border border-slate-500/20"
                                }`}
                              >
                                {member.role}
                              </span>
                            </td>
                            <td className="py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 ${
                                  member.status === "Active" ? "text-emerald-400" : "text-amber-400"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    member.status === "Active" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                                  }`}
                                ></span>
                                {member.status}
                              </span>
                            </td>
                            <td className="py-3.5 text-right pr-2">
                              {member.status === "Pending" ? (
                                <button
                                  onClick={() => {
                                    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
                                    const link = `${baseUrl}/signup?token=${member.token || "tkn_demo"}`;
                                    navigator.clipboard.writeText(link);
                                    alert(`Invitation Link Copied!\n\nLink: ${link}\n\nToken: ${member.token || "tkn_demo"}`);
                                  }}
                                  className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 rounded text-[10px] font-bold transition-all"
                                >
                                  Copy Link
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Active</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Approvals list */}
                <div className="glass-card rounded-2xl border border-white/5 bg-[#110c1c]/50 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-400" />
                    Pending Expense Claims & Approvals
                  </h3>

                  <div className="space-y-3">
                    {approvals.filter((a) => a.status === "Pending").length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        All expense items have been reviewed! No items pending.
                      </div>
                    ) : (
                      approvals
                        .filter((a) => a.status === "Pending")
                        .map((claim) => (
                          <div
                            key={claim.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white">
                                  {claim.submitter}
                                </span>
                                <span className="text-[10px] text-slate-500">{claim.date}</span>
                              </div>
                              <p className="text-xs text-slate-300 font-medium">{claim.vendor}</p>
                              <span className="text-sm font-extrabold text-purple-400">
                                ${claim.amount.toFixed(2)}
                              </span>
                            </div>

                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleApprovalAction(claim.id, "Rejected")}
                                className="p-2 border border-red-500/20 hover:bg-red-500/10 text-red-300 hover:text-red-200 rounded-xl transition-all"
                                title="Reject Claim"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleApprovalAction(claim.id, "Approved")}
                                className="py-2 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Approval Policy configuration */}
              <div className="space-y-6">
                <div className="glass-card rounded-2xl border border-white/5 bg-[#110c1c]/50 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-white">Workspace Policy Settings</h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] text-slate-400 block font-medium">
                        Approval Threshold Limit ($)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={requireApprovalOver}
                          onChange={(e) => setRequireApprovalOver(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Expenses exceeding this value require a manager's validation.
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div>
                        <p className="text-xs font-semibold text-white">Auto-approve low values</p>
                        <p className="text-[10px] text-slate-500">
                          Approve scans under threshold limit
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoApproveLowValue}
                        onChange={(e) => setAutoApproveLowValue(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-white/10 border-white/10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invite Member Modal Dialog */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setShowInviteModal(false)}
            ></div>

            <div className="glass-card max-w-md w-full rounded-3xl border border-white/10 bg-[#161224] p-6 shadow-2xl relative z-10">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-purple-400" />
                  Invite Team Member
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleInvite} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rachel Green"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="rachel@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    System Access Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e: any) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#161224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="Admin">Admin (Full Control)</option>
                    <option value="Approver">Approver (Review Claims)</option>
                    <option value="Submitter">Submitter (Scan Receipts Only)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-xs rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
