"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import {
  Link2,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Lock,
  ShieldCheck,
  Building,
  Save,
  Check,
  X,
} from "lucide-react";

interface IntegrationCard {
  id: string;
  name: string;
  logo: string;
  description: string;
  connected: boolean;
  lastSynced: string;
}

export default function Integrations() {
  const { user, loading: authLoading, subscriptionTier } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // States
  const [integrations, setIntegrations] = useState<IntegrationCard[]>([]);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState("");
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
  const [companyIdInput, setCompanyIdInput] = useState("");
  const [webhookUrlInput, setWebhookUrlInput] = useState("");
  const [copiedScript, setCopiedScript] = useState(false);

  const hasAccess = subscriptionTier === "Business" || subscriptionTier === "Enterprise";

  useEffect(() => {
    setMounted(true);
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load configuration
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("saas_integrations");
      const currentIntegrations = stored ? JSON.parse(stored) : [];
      
      const initial: IntegrationCard[] = [
        { id: "qb", name: "QuickBooks Online", logo: "QB", description: "Direct synchronization of bills, line items, and GST taxes into QuickBooks ledgers.", connected: false, lastSynced: "Never synced" },
        { id: "xero", name: "Xero Accounting", logo: "X", description: "Automatically export claim entries directly into Xero draft invoices.", connected: false, lastSynced: "Never synced" },
        { id: "zoho", name: "Zoho Books", logo: "ZB", description: "Push verified scans into Zoho expenses matching tax account codes.", connected: false, lastSynced: "Never synced" },
        { id: "tally", name: "Tally Prime ERP", logo: "T", description: "Format and transfer voucher journals into Tally compliant XML sheets.", connected: false, lastSynced: "Never synced" },
        { id: "gsheet", name: "Google Sheets Sync", logo: "GS", description: "Real-time sync of scanned bills, tax line items, and audit statuses to a custom Google Sheet.", connected: false, lastSynced: "Never synced" },
      ];

      const merged = initial.map((initItem) => {
        const found = currentIntegrations.find((c: any) => c.id === initItem.id);
        return found ? { ...initItem, connected: found.connected, lastSynced: found.lastSynced } : initItem;
      });

      setIntegrations(merged);
      localStorage.setItem("saas_integrations", JSON.stringify(merged));
    }
  }, []);

  if (!mounted || authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  const handleConnect = (id: string) => {
    setShowConfigModal(id);
    if (id === "gsheet") {
      setWebhookUrlInput(localStorage.getItem("billai_gsheet_webhook_url") || "");
    } else {
      setCompanyIdInput("COM-" + Math.floor(Math.random() * 900000 + 100000));
    }
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConfigModal) return;

    if (showConfigModal === "gsheet") {
      localStorage.setItem("billai_gsheet_webhook_url", webhookUrlInput);
    }

    const updated = integrations.map((item) =>
      item.id === showConfigModal ? { ...item, connected: true, lastSynced: "Connected today" } : item
    );

    setIntegrations(updated);
    localStorage.setItem("saas_integrations", JSON.stringify(updated));
    setShowConfigModal(null);
  };

  const handleDisconnect = (id: string) => {
    if (id === "gsheet") {
      localStorage.removeItem("billai_gsheet_webhook_url");
    }
    const updated = integrations.map((item) =>
      item.id === id ? { ...item, connected: false, lastSynced: "Never synced" } : item
    );
    setIntegrations(updated);
    localStorage.setItem("saas_integrations", JSON.stringify(updated));
  };

  const triggerSyncAll = () => {
    const connectedList = integrations.filter((i) => i.connected);
    if (connectedList.length === 0) {
      alert("Please connect at least one accounting provider first!");
      return;
    }

    setIsSyncingAll(true);
    setSyncStatusText("Connecting to servers...");
    
    setTimeout(() => {
      setSyncStatusText("Validating tax logs...");
      setTimeout(() => {
        setSyncStatusText("Syncing invoices...");
        setTimeout(() => {
          setIsSyncingAll(false);
          setSyncStatusText("");
          
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const updated = integrations.map((item) =>
            item.connected ? { ...item, lastSynced: `Synced today at ${nowStr}` } : item
          );
          setIntegrations(updated);
          localStorage.setItem("saas_integrations", JSON.stringify(updated));
        }, 1200);
      }, 1000);
    }, 1000);
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
                Ledger & <span className="text-gradient">Accounting Sync</span>
              </h1>
              <p className="text-slate-400 text-sm">
                Say goodbye to manual data entry. Export and reconcile receipts and GST splits directly to QuickBooks, Xero, Tally, and Zoho.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 max-w-md w-full space-y-4 text-left">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Premium Accounting Perks:
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>One-click cloud ledger synchronizations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Auto-matches line items with bank statement records</span>
                </li>
                <li className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>Customizable expense classification templates</span>
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
          /* Active Integrations Settings */
          <div className="max-w-5xl mx-auto space-y-8 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Accounting <span className="text-gradient">Integrations</span>
                </h1>
                <p className="text-slate-400 text-sm">
                  Connect your accounting workspaces to sync tax expense items automatically.
                </p>
              </div>

              {integrations.some((i) => i.connected) && (
                <button
                  onClick={triggerSyncAll}
                  disabled={isSyncingAll}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs py-3 px-5 rounded-xl transition-all shadow active:scale-[0.98] disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncingAll ? "animate-spin" : ""}`} />
                  {isSyncingAll ? "Syncing..." : "Sync Portals Now"}
                </button>
              )}
            </div>

            {/* Syncing Status Alert banner */}
            {isSyncingAll && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-3 animate-pulse">
                <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                <span className="font-semibold">{syncStatusText}</span>
              </div>
            )}

            {/* Integrations Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {integrations.map((item) => (
                <div
                  key={item.id}
                  className="glass-card p-6 rounded-2xl border border-white/5 bg-[#110c1c]/50 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-purple-600/15 border border-purple-500/35 rounded-xl flex items-center justify-center font-bold text-white text-sm">
                          {item.logo}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{item.name}</h3>
                          <span
                            className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-1 ${
                              item.connected
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                                : "bg-slate-500/15 text-slate-400 border border-slate-500/15"
                            }`}
                          >
                            {item.connected ? "Connected" : "Not connected"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500">{item.lastSynced}</span>
                    </div>

                    <p className="text-slate-400 text-xs leading-relaxed min-h-[48px]">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-6 mt-4 border-t border-white/5">
                    {item.connected ? (
                      <>
                        <button
                          onClick={() => handleDisconnect(item.id)}
                          className="flex-1 py-2.5 border border-red-500/20 hover:bg-red-500/5 text-red-300 text-xs rounded-xl font-semibold transition-all"
                        >
                          Disconnect
                        </button>
                        <button
                          onClick={() => handleConnect(item.id)}
                          className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5"
                        >
                          Configure
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(item.id)}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs rounded-xl font-semibold shadow transition-all active:scale-[0.98]"
                      >
                        Connect Workspace
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Configurations Modal Dialog */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setShowConfigModal(null)}
            ></div>

            <div className="glass-card max-w-md w-full rounded-3xl border border-white/10 bg-[#161224] p-6 shadow-2xl relative z-10">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-purple-400" />
                  Connect Account
                </h3>
                <button
                  onClick={() => setShowConfigModal(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveConnection} className="space-y-4 pt-4">
                {showConfigModal === "gsheet" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Google Sheets Web App URL
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://script.google.com/macros/s/.../exec"
                        value={webhookUrlInput}
                        onChange={(e) => setWebhookUrlInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 font-semibold"
                      />
                    </div>

                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Setup Instructions</span>
                        <button
                          type="button"
                          onClick={() => {
                            const code = `function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Create headers if empty
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "Date", "Vendor", "Invoice #", "Category", "Currency", "Total Amount", "Tax Amount", "Tax ID / GSTIN"]);
  }
  
  sheet.appendRow([
    data.timestamp,
    data.date,
    data.vendorName,
    data.billNumber,
    data.category,
    data.currency,
    data.totalAmount,
    data.gstAmount,
    data.taxId
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({status: "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}`;
                            navigator.clipboard.writeText(code);
                            setCopiedScript(true);
                            setTimeout(() => setCopiedScript(false), 2000);
                          }}
                          className="text-[10px] font-semibold text-purple-400 hover:text-purple-300"
                        >
                          {copiedScript ? "Copied!" : "Copy Apps Script"}
                        </button>
                      </div>
                      <ol className="text-[10px] text-slate-400 list-decimal list-inside space-y-1 leading-relaxed">
                        <li>Open a Google Sheet.</li>
                        <li>Go to Extensions &gt; Apps Script.</li>
                        <li>Paste the copied script code.</li>
                        <li>Click Deploy &gt; New Deployment.</li>
                        <li>Select "Web app", set Execute as "Me", and Who has access to "Anyone".</li>
                        <li>Deploy and copy the Web App URL here.</li>
                      </ol>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Organization Account ID
                      </label>
                      <input
                        type="text"
                        required
                        value={companyIdInput}
                        onChange={(e) => setCompanyIdInput(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500 font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Expense Account Code
                      </label>
                      <select className="w-full px-4 py-2.5 rounded-xl bg-[#161224] border border-white/10 text-white text-xs focus:outline-none focus:border-purple-500">
                        <option value="6000-Travel">6000 - Travel & Lodging</option>
                        <option value="6100-Meals">6100 - Meals & Entertainment</option>
                        <option value="6200-Supplies">6200 - Office Supplies</option>
                        <option value="6300-Software">6300 - IT & Software Subscriptions</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(null)}
                    className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-xs rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
                  >
                    Confirm & Sync
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
