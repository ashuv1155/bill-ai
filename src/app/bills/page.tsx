"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchBills, createBill, updateBill, deleteBill, checkForDuplicateBill, Bill } from "@/services/billService";
import Sidebar from "@/components/Sidebar";
import {
  Search,
  Filter,
  Upload,
  Plus,
  Trash2,
  Edit2,
  FileDown,
  Sparkles,
  Camera,
  X,
  FileText,
  Calendar,
  Building,
  Tag,
  Receipt,
  FileQuestion,
  PlusCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import Image from "next/image";

export const getCurrencySymbol = (currency?: string) => {
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

export default function BillsPage() {
  const { user, loading: authLoading, isDemoMode, subscriptionTier, monthlyScanCount, incrementScanCount } = useAuth();
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter/Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Upload/OCR state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Edit/Review Modal state
  const [editingBill, setEditingBill] = useState<Partial<Bill> | null>(null);
  const [isEditingNew, setIsEditingNew] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // AI Auditing and Duplicate Detection States
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [policyWarning, setPolicyWarning] = useState<string | null>(null);
  const [copiedAlertIndex, setCopiedAlertIndex] = useState<number | null>(null);

  // SaaS subscription modal trigger
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function runAuditChecks() {
      if (editingBill && user) {
        // Check duplicate
        const dup = await checkForDuplicateBill(
          user.uid,
          editingBill.billNumber || "",
          editingBill.vendorName || "",
          editingBill.totalAmount || 0,
          editingBill.date || "",
          editingBill.id
        );
        if (dup) {
          setDuplicateWarning(
            `Warning: Duplicate invoice detected (Invoice #${dup.billNumber} from ${dup.vendorName} on ${dup.date} for ${getCurrencySymbol(dup.currency)}${dup.totalAmount}).`
          );
        } else {
          setDuplicateWarning(null);
        }

        // Check policy violations
        const flaggedKeywords = [
          "beer",
          "wine",
          "liquor",
          "alcohol",
          "whiskey",
          "bar",
          "late fee",
          "penalty",
          "interest",
        ];
        const violations: string[] = [];

        if (editingBill.lineItems) {
          editingBill.lineItems.forEach((item) => {
            const descLower = item.description.toLowerCase();
            flaggedKeywords.forEach((kw) => {
              if (descLower.includes(kw)) {
                violations.push(`'${item.description}' matches flagged term '${kw}'`);
              }
            });
          });
        }

        if (violations.length > 0) {
          setPolicyWarning(
            `Corporate Expense Policy Violation: ${violations.join(", ")}.`
          );
        } else {
          setPolicyWarning(null);
        }
      } else {
        setDuplicateWarning(null);
        setPolicyWarning(null);
      }
    }
    runAuditChecks();
  }, [editingBill, user]);

  const categories = [
    "Fuel",
    "Food",
    "Travel",
    "Office Expense",
    "Marketing",
    "Internet",
    "Software",
    "Miscellaneous",
  ];

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
          console.error(error);
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

  // Handle OCR receipt parsing
  const processFileForOCR = async (file: File) => {
    if (!file) return;

    // Check scan limits on Free Starter plan
    if (subscriptionTier === "Starter" && monthlyScanCount >= 10) {
      setShowUpgradeModal(true);
      return;
    }

    setIsUploading(true);
    setUploadedFile(file);

    const progressPhases = [
      "Uploading file to secure buffer...",
      "Activating Gemini Vision model...",
      "Reading merchant & bill details...",
      "Extracting GST, CGST, SGST breakdown...",
      "Parsing line items & line prices...",
      "Auto-categorizing based on invoice items...",
    ];

    let phaseIdx = 0;
    setUploadProgressText(progressPhases[0]);
    const progressInterval = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % progressPhases.length;
      setUploadProgressText(progressPhases[phaseIdx]);
    }, 2500);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Call API Route
      const res = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "OCR Failed");
      }

      const extractedData = await res.json();

      // Successfully scanned, increment usage
      incrementScanCount();

      // Show edit/review modal with parsed data
      setEditingBill({
        ...extractedData,
        fileName: file.name,
      });
      setIsEditingNew(true);
    } catch (error: any) {
      console.error(error);
      alert(`OCR Scan failed: ${error.message || "Failed to analyze document."}. Running in Manual Mode instead.`);
      // Allow manual entry fallback on failure
      setEditingBill({
        vendorName: "",
        billNumber: "",
        date: new Date().toISOString().split("T")[0],
        gstin: "",
        subtotal: 0,
        gstAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalAmount: 0,
        category: "Miscellaneous",
        lineItems: [],
        fileName: file.name,
      });
      setIsEditingNew(true);
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
      setUploadProgressText("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFileForOCR(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFileForOCR(file);
  };

  // CRUD ops
  const handleSaveBill = async () => {
    if (!editingBill || !user || isSaving) return;

    setIsSaving(true);
    try {
      if (isEditingNew) {
        // Create new bill
        const saved = await createBill(user.uid, uploadedFile, editingBill as any);
        setBills((prev) => [saved, ...prev]);
      } else {
        // Update existing bill
        await updateBill(editingBill.id!, editingBill);
        setBills((prev) =>
          prev.map((b) => (b.id === editingBill.id ? { ...b, ...editingBill } as Bill : b))
        );
      }
      setEditingBill(null);
      setIsEditingNew(false);
      setUploadedFile(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save bill details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBill = async (billId: string, fileName: string) => {
    if (!confirm("Are you sure you want to delete this bill?")) return;
    try {
      await deleteBill(billId, user.uid, fileName);
      setBills((prev) => prev.filter((b) => b.id !== billId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete bill.");
    }
  };

  const startManualEntry = () => {
    setEditingBill({
      vendorName: "",
      billNumber: "",
      date: new Date().toISOString().split("T")[0],
      gstin: "",
      subtotal: 0,
      gstAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalAmount: 0,
      category: "Miscellaneous",
      lineItems: [],
      fileName: "manually_entered",
    });
    setIsEditingNew(true);
    setUploadedFile(null);
  };

  // Filter logic
  const filteredBills = bills.filter((b) => {
    const matchesSearch =
      b.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.billNumber && b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0c0a0f]">
      <Sidebar />

      <main className="flex-grow p-6 lg:p-10 space-y-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Bill Management</h1>
            <p className="text-slate-400 text-sm mt-1">Upload, review and manage scanned invoices</p>
          </div>
          <button
            onClick={startManualEntry}
            className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium px-4 py-2.5 rounded-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            Manual Entry
          </button>
        </div>

        {/* Upload Dashboard Container */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="relative glass-panel rounded-2xl p-8 border-2 border-dashed border-white/10 hover:border-purple-500/50 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,application/pdf"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*"
            capture="environment"
          />

          {isUploading ? (
            <div className="py-6 flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-purple-400 animate-spin" />
              <div>
                <p className="text-md font-semibold text-white">Scanning document...</p>
                <p className="text-xs text-purple-400 mt-1 flex items-center justify-center gap-1.5 animate-pulse">
                  <Sparkles className="h-3 w-3" />
                  {uploadProgressText}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center space-y-4">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-2xl group-hover:scale-105 transition-all">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <p className="text-md font-semibold text-white">Drag & drop your bill here</p>
                <p className="text-xs text-slate-400 mt-1">Supports PNG, JPG, or PDF invoices</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-500 transition-all"
                >
                  Choose File
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs font-semibold hover:bg-white/10 flex items-center gap-1.5 transition-all"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Camera Capture
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter Panel */}
        <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by vendor or invoice..."
              className="w-full pl-10 pr-4 py-2 bg-black/30 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-purple-500 text-white"
            />
          </div>
          <div className="flex gap-2 items-center w-full md:w-auto">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-48 bg-black/30 border border-white/5 rounded-xl text-sm p-2 focus:outline-none focus:border-purple-500 text-white"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bills grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-16 border border-white/5 rounded-2xl bg-white/[0.01]">
            <FileQuestion className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <p className="text-md font-semibold text-slate-300">No bills found</p>
            <p className="text-xs text-slate-500 mt-1">Upload a bill or adjust your search filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBills.map((b) => (
              <div key={b.id} className="glass-card rounded-2xl overflow-hidden flex flex-col justify-between">
                {/* Header info */}
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-1.5 items-center flex-wrap">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300">
                        {b.category}
                      </span>
                      {b.auditAlerts && b.auditAlerts.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                          <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
                          Shield Flagged
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">{b.date}</span>
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-white leading-snug truncate" title={b.vendorName}>
                      {b.vendorName}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">Bill #: {b.billNumber || "N/A"}</p>
                  </div>

                  <div className="flex justify-between items-end pt-2">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Total Amount</p>
                      <p className="text-xl font-extrabold text-white mt-0.5">{getCurrencySymbol(b.currency)}{b.totalAmount.toFixed(2)}</p>
                    </div>
                    {b.gstAmount > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold">{b.taxType || "GST"} Paid</p>
                        <p className="text-sm font-bold text-emerald-400 mt-0.5">{getCurrencySymbol(b.currency)}{b.gstAmount.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action footer */}
                <div className="px-5 py-3.5 bg-black/20 border-t border-white/5 flex justify-between items-center">
                  <a
                    href={b.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    Attachment
                  </a>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingBill(b)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBill(b.id, b.fileName)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit / Review Modal */}
        {editingBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
            <div className="relative bg-[#161224] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 sticky top-0 bg-[#161224] z-10">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    {isEditingNew ? "Review AI Extracted Details" : "Edit Bill Details"}
                    {isEditingNew && isDemoMode && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-medium">
                        Simulated OCR
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isEditingNew && isDemoMode
                      ? "Simulating OCR response (configure GEMINI_API_KEY in .env.local for live scanning)"
                      : "Audit OCR calculations and line items before saving"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingBill(null);
                    setIsEditingNew(false);
                  }}
                  className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* AI Audit & Policy Warnings */}
              {(duplicateWarning || policyWarning) && (
                <div className="px-6 pt-4 space-y-2 shrink-0">
                  {duplicateWarning && (
                    <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs font-semibold flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 shrink-0 animate-pulse"></span>
                      {duplicateWarning}
                    </div>
                  )}
                  {policyWarning && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs font-semibold flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>
                      {policyWarning}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Body */}
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto">
                {/* Left Form Column */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Currency</label>
                      <select
                        value={editingBill.currency || "INR"}
                        onChange={(e) => setEditingBill({ ...editingBill, currency: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="CAD">CAD (C$)</option>
                        <option value="AUD">AUD (A$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Tax System</label>
                      <select
                        value={editingBill.taxType || "GST"}
                        onChange={(e) => setEditingBill({ ...editingBill, taxType: e.target.value as any })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="GST">GST (India/CA/AU)</option>
                        <option value="VAT">VAT (Europe/UK)</option>
                        <option value="Sales Tax">Sales Tax (USA)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">
                      {editingBill.taxType === "GST"
                        ? "Vendor GSTIN"
                        : editingBill.taxType === "VAT"
                        ? "VAT Registration Number"
                        : editingBill.taxType === "Sales Tax"
                        ? "Tax ID / EIN"
                        : "Business Tax Registration Number"}
                    </label>
                    <input
                      type="text"
                      value={editingBill.taxId || editingBill.gstin || ""}
                      onChange={(e) => setEditingBill({ 
                        ...editingBill, 
                        taxId: e.target.value, 
                        // Set gstin as fallback for backward compatibility
                        gstin: editingBill.taxType === "GST" ? e.target.value : "" 
                      })}
                      placeholder="e.g. GSTIN, VAT ID, or EIN"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Vendor Name</label>
                      <input
                        type="text"
                        value={editingBill.vendorName || ""}
                        onChange={(e) => setEditingBill({ ...editingBill, vendorName: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Category</label>
                      <select
                        value={editingBill.category || "Miscellaneous"}
                        onChange={(e) => setEditingBill({ ...editingBill, category: e.target.value as any })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Bill Number</label>
                      <input
                        type="text"
                        value={editingBill.billNumber || ""}
                        onChange={(e) => setEditingBill({ ...editingBill, billNumber: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5">Date</label>
                      <input
                        type="date"
                        value={editingBill.date || ""}
                        onChange={(e) => setEditingBill({ ...editingBill, date: e.target.value })}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>



                  <div className="border-t border-white/5 pt-4 space-y-4">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Financial Summary</h5>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Subtotal</label>
                        <input
                          type="number"
                          value={editingBill.subtotal || 0}
                          onChange={(e) => setEditingBill({ ...editingBill, subtotal: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">{(editingBill.taxType || "GST")} Amount</label>
                        <input
                          type="number"
                          value={editingBill.gstAmount || 0}
                          onChange={(e) => setEditingBill({ ...editingBill, gstAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Total Amount</label>
                        <input
                          type="number"
                          value={editingBill.totalAmount || 0}
                          onChange={(e) => setEditingBill({ ...editingBill, totalAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {(!editingBill.taxType || editingBill.taxType === "GST") && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">CGST</label>
                          <input
                            type="number"
                            value={editingBill.cgst || 0}
                            onChange={(e) => setEditingBill({ ...editingBill, cgst: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">SGST</label>
                          <input
                            type="number"
                            value={editingBill.sgst || 0}
                            onChange={(e) => setEditingBill({ ...editingBill, sgst: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">IGST</label>
                          <input
                            type="number"
                            value={editingBill.igst || 0}
                            onChange={(e) => setEditingBill({ ...editingBill, igst: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Line Items Column */}
                <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-white/5 pt-4 lg:pt-0 lg:pl-6">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Line Items</h5>
                    <button
                      type="button"
                      onClick={() => {
                        const items = editingBill.lineItems || [];
                        setEditingBill({
                          ...editingBill,
                          lineItems: [...items, { description: "", amount: 0, qty: 1 }],
                        });
                      }}
                      className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add Item
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                    {(editingBill.lineItems || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={item.description}
                          placeholder="Description"
                          onChange={(e) => {
                            const items = [...(editingBill.lineItems || [])];
                            items[idx].description = e.target.value;
                            setEditingBill({ ...editingBill, lineItems: items });
                          }}
                          className="flex-grow bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        />
                        <input
                          type="number"
                          value={item.qty || 1}
                          placeholder="Qty"
                          onChange={(e) => {
                            const items = [...(editingBill.lineItems || [])];
                            items[idx].qty = parseInt(e.target.value) || 1;
                            setEditingBill({ ...editingBill, lineItems: items });
                          }}
                          className="w-16 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white text-center focus:outline-none"
                        />
                        <input
                          type="number"
                          value={item.amount}
                          placeholder="Amount"
                          onChange={(e) => {
                            const items = [...(editingBill.lineItems || [])];
                            items[idx].amount = parseFloat(e.target.value) || 0;
                            setEditingBill({ ...editingBill, lineItems: items });
                          }}
                          className="w-24 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-white text-right focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const items = (editingBill.lineItems || []).filter((_, i) => i !== idx);
                            setEditingBill({ ...editingBill, lineItems: items });
                          }}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ))}

                    {(editingBill.lineItems || []).length === 0 && (
                      <p className="text-xs text-slate-500 italic text-center py-6">No line items specified</p>
                    )}
                  </div>

                  {/* AI Bill Shield Alerts Section */}
                  {editingBill.auditAlerts && editingBill.auditAlerts.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-purple-400 font-semibold text-xs tracking-wider uppercase">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        <h3>AI Bill Shield Audits</h3>
                      </div>
                      <div className="space-y-3">
                        {editingBill.auditAlerts.map((alertItem, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-2 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl"></div>
                            <div className="flex justify-between items-start gap-2 relative z-10">
                              <div className="flex gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-white block">
                                    {alertItem.lineItem} ({getCurrencySymbol(editingBill.currency)}{alertItem.amount})
                                  </span>
                                  <span className="text-slate-400 block mt-1 font-medium leading-relaxed">
                                    {alertItem.explanation}
                                  </span>
                                </div>
                              </div>
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold shrink-0">
                                {alertItem.type.replace("_", " ")}
                              </span>
                            </div>

                            {alertItem.disputeScript && (
                              <div className="mt-3 p-3 rounded-lg bg-black/40 border border-white/5 relative z-10">
                                <div className="flex justify-between items-center mb-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                  <span>AI Suggested Dispute Script</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(alertItem.disputeScript);
                                      setCopiedAlertIndex(idx);
                                      setTimeout(() => setCopiedAlertIndex(null), 2000);
                                    }}
                                    className="text-purple-400 hover:text-purple-300 flex items-center gap-1 normal-case font-bold"
                                  >
                                    {copiedAlertIndex === idx ? (
                                      <>
                                        <Check className="h-3 w-3 text-emerald-400" />
                                        <span className="text-emerald-400">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy Script</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <p className="text-slate-300 italic text-[11px] leading-relaxed">
                                  "{alertItem.disputeScript}"
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Document preview if available */}
                  {uploadedFile && (
                    <div className="border border-white/5 rounded-xl p-3 bg-black/10 flex items-center gap-3">
                      <FileText className="h-8 w-8 text-purple-400 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="text-xs text-white truncate font-medium">{uploadedFile.name}</p>
                        <p className="text-[10px] text-slate-500">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-[#161224] flex justify-end gap-3 sticky bottom-0 z-10">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setEditingBill(null);
                    setIsEditingNew(false);
                  }}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 text-white text-xs font-semibold rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveBill}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Bill</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade subscription modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowUpgradeModal(false)}
            ></div>

            <div className="glass-card max-w-md w-full rounded-3xl border border-white/10 bg-[#161224] p-6 shadow-2xl relative z-10 text-center space-y-6">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-400 w-fit mx-auto animate-bounce">
                <Sparkles className="h-8 w-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Monthly Scan Limit Reached</h3>
                <p className="text-slate-400 text-xs px-2 font-medium leading-relaxed">
                  You have scanned 10 / 10 bills on the Starter Free tier. Upgrade to unlock unlimited scans, multi-user approval streams, and direct accounting integrations.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    router.push("/pricing");
                  }}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
                >
                  View Subscription Plans
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="w-full py-3 border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-xs rounded-xl transition-all"
                >
                  Close & Edit Manually
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
