"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Receipt, 
  Sparkles, 
  ShieldCheck, 
  BarChart3, 
  ArrowRight, 
  Coins, 
  FileText,
  FileCheck
} from "lucide-react";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Navbar */}
      <header className="px-6 lg:px-12 h-20 flex items-center justify-between border-b border-white/5 bg-[#0c0a0f]/50 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center gap-2" href="#">
          <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            BillAI <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">SaaS</span>
          </span>
        </Link>
        <nav className="flex gap-4 sm:gap-6 items-center">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 active:scale-[0.98]"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="w-full py-16 md:py-28 lg:py-36 relative overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="container px-4 md:px-6 mx-auto relative z-10 max-w-6xl">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium animate-pulse">
                <Sparkles className="h-3 w-3" />
                Powered by Gemini Vision AI & OCR
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl/none max-w-3xl">
                Automate Your Expense & GST Claims with{" "}
                <span className="text-gradient">AI Precision</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-slate-400 md:text-xl/relaxed">
                Upload image bills or PDF invoices. Our AI instantly extracts line items, GST breakdown, vendor info, and auto-categorizes expenses for your tax savings.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md pt-2">
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium px-8 py-4 rounded-2xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:from-purple-500 hover:to-indigo-500 transition-all group active:scale-[0.98]"
                >
                  Start Scanning Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/login?demo=true"
                  className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium px-8 py-4 rounded-2xl transition-all active:scale-[0.98]"
                >
                  Try Demo Account
                </Link>
              </div>

              {/* Dashboard Preview Mockup */}
              <div className="w-full max-w-4xl mt-12 rounded-2xl border border-white/10 bg-[#161224]/80 p-3 shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-indigo-500/5 rounded-2xl pointer-events-none"></div>
                <div className="rounded-xl overflow-hidden border border-white/5 bg-[#0c0a0f] p-4 sm:p-6 text-left">
                  {/* Mock dashboard header */}
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                    <div>
                      <div className="h-4 w-32 bg-white/10 rounded mb-2"></div>
                      <div className="h-3 w-48 bg-white/5 rounded"></div>
                    </div>
                    <div className="h-8 w-24 bg-purple-500/20 border border-purple-500/30 rounded-lg"></div>
                  </div>
                  {/* Mock dashboard grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <div className="h-3 w-16 bg-white/10 rounded mb-2"></div>
                        <div className="h-6 w-24 bg-white/20 rounded"></div>
                      </div>
                    ))}
                  </div>
                  {/* Mock graph */}
                  <div className="h-40 bg-white/5 border border-white/5 rounded-xl flex items-end p-4 gap-2">
                    {[35, 60, 45, 80, 55, 90, 70, 85].map((h, i) => (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className="flex-1 bg-gradient-to-t from-purple-600 to-indigo-500 rounded-t"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-16 border-t border-white/5 bg-[#0c0a0f]/40">
          <div className="container px-4 md:px-6 mx-auto max-w-5xl">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="glass-card p-6 rounded-2xl">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl w-fit text-purple-400 mb-4">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Gemini Vision AI</h3>
                <p className="text-slate-400 text-sm">
                  Instant receipt parsing. Extract subtotal, CGST, SGST, IGST, invoice numbers, dates, and full line-item details.
                </p>
              </div>
              <div className="glass-card p-6 rounded-2xl">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl w-fit text-indigo-400 mb-4">
                  <Coins className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">GST & Tax Engine</h3>
                <p className="text-slate-400 text-sm">
                  Track dynamic tax savings, calculate accurate monthly/yearly GST claims, and optimize deductible expenses automatically.
                </p>
              </div>
              <div className="glass-card p-6 rounded-2xl">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl w-fit text-blue-400 mb-4">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Rich Analytics</h3>
                <p className="text-slate-400 text-sm">
                  Interactive charts showing expense patterns, category breakdowns, and AI-driven insights on spending behavior.
                </p>
              </div>
              <div className="glass-card p-6 rounded-2xl">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl w-fit text-emerald-400 mb-4">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Exportable Reports</h3>
                <p className="text-slate-400 text-sm">
                  Compile summaries in seconds. Export professionally formatted PDF or Excel sheets for your accountant or filing.
                </p>
              </div>
              <div className="glass-card p-6 rounded-2xl">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl w-fit text-amber-400 mb-4">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Secure & Private</h3>
                <p className="text-slate-400 text-sm">
                  Your bills and details are safely isolated per user with strict Firebase Rules and access controls.
                </p>
              </div>
              <div className="glass-card p-6 rounded-2xl">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl w-fit text-rose-400 mb-4">
                  <FileCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No Setup Required</h3>
                <p className="text-slate-400 text-sm">
                  Runs instantly out of the box in Demo Mode. Connect your own Firebase project key when you're ready to deploy.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 text-center text-xs text-slate-500 bg-[#0c0a0f]/90">
        <p>&copy; {new Date().getFullYear()} BillAI SaaS. All rights reserved. Powered by Google Gemini.</p>
      </footer>
    </div>
  );
}
