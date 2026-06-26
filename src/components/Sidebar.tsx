"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Receipt,
  LayoutDashboard,
  FileText,
  LogOut,
  Sparkles,
  CloudLightning,
  CloudOff,
  Menu,
  X,
  CreditCard,
  Users,
  Link2,
  ShieldAlert,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isDemoMode, subscriptionTier, monthlyScanCount } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Bill Management",
      href: "/bills",
      icon: Receipt,
    },
    {
      name: "Tax Reports",
      href: "/reports",
      icon: FileText,
    },
    {
      name: "Team Spaces",
      href: "/team",
      icon: Users,
    },
    {
      name: "Integrations",
      href: "/integrations",
      icon: Link2,
    },
    {
      name: "Pricing Plans",
      href: "/pricing",
      icon: CreditCard,
    },
    {
      name: "Admin Panel",
      href: "/admin",
      icon: ShieldAlert,
    },
  ];

  const scanLimit = 10;
  const isStarter = subscriptionTier === "Starter";
  const percentage = Math.min((monthlyScanCount / scanLimit) * 100, 100);

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between bg-[#110c1c]/75 backdrop-blur-xl border-r border-white/5 px-4 py-6">
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2 px-2">
          <div className="p-2 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            BillAI <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">SaaS</span>
          </span>
        </div>

        {/* Sync Status & Tier */}
        <div className="px-2 space-y-2">
          {isDemoMode ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <CloudOff className="h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="font-semibold">Demo Mode</p>
                <p className="opacity-70 text-[10px]">Saved locally in browser</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              <CloudLightning className="h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold">Cloud Mode</p>
                <p className="opacity-70 text-[10px]">Synced with Firebase</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="font-semibold">Plan Tier</span>
            </div>
            <span className="bg-purple-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">
              {subscriptionTier}
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="space-y-1.5 pt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border-l-2 border-purple-500 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-purple-400" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Quota Progress & User Actions */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        {/* Usage quota */}
        <div className="px-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span>Monthly Scans</span>
            <span>{isStarter ? `${monthlyScanCount} / ${scanLimit}` : "Unlimited"}</span>
          </div>
          {isStarter ? (
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          ) : (
            <div className="w-full bg-purple-500/20 border border-purple-500/30 rounded-lg p-2 text-center text-[11px] text-purple-300">
              ⚡ Premium scanner active
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-2 py-1">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow">
            {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">
              {user?.displayName || "SaaS User"}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between px-6 h-16 border-b border-white/5 bg-[#0c0a0f]/60 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-lg">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <span className="text-md font-bold tracking-tight text-white">BillAI</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Overlay menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)}></div>
          <div className="relative w-64 max-w-xs h-full bg-[#0c0a0f] z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
