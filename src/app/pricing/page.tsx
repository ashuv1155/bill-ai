"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import {
  Check,
  CreditCard,
  Sparkles,
  Zap,
  Building2,
  Crown,
  ShieldCheck,
  Lock,
} from "lucide-react";

export default function Pricing() {
  const { user, loading: authLoading, subscriptionTier, updateSubscriptionTier } = useAuth();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (!mounted || authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  const plans = [
    {
      name: "Starter",
      price: "$0",
      description: "Ideal for freelancers exploring AI scanning",
      icon: Zap,
      features: [
        "10 AI scans per month",
        "Manual receipt correction",
        "Standard PDF tax exports",
        "Single-user dashboard",
        "Community support",
      ],
      tier: "Starter",
      badgeColor: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    },
    {
      name: "Growth",
      price: "$15",
      period: "/month",
      description: "Perfect for active professionals & contractors",
      icon: Sparkles,
      features: [
        "Unlimited receipt scans",
        "Full Gemini Vision AI parsing",
        "PDF & Excel report exports",
        "Dynamic GST savings optimizer",
        "Priority customer support",
      ],
      tier: "Growth",
      popular: true,
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    },
    {
      name: "Business",
      price: "$49",
      period: "/month",
      description: "Designed for small-to-medium teams & owners",
      icon: Crown,
      features: [
        "Everything in Growth",
        "Multi-user Team Spaces (up to 5)",
        "Submitter & Approver workflows",
        "AI duplicate claim auditor",
        "QuickBooks & Xero integrations",
      ],
      tier: "Business",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
    {
      name: "Enterprise",
      price: "$149",
      period: "/month",
      description: "Custom capabilities for scaling corporations",
      icon: Building2,
      features: [
        "Everything in Business",
        "Unlimited team seats",
        "Corporate policy compliance checks",
        "Custom rule enforcement",
        "Dedicated account manager",
      ],
      tier: "Enterprise",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
  ];

  const handleUpgradeClick = (plan: any) => {
    if (plan.tier === subscriptionTier) return;
    setSelectedPlan(plan);
    setShowCheckout(true);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        updateSubscriptionTier(selectedPlan.tier);
        setShowCheckout(false);
        setIsSuccess(false);
        setSelectedPlan(null);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0c0a0f] text-slate-100">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto relative">
        {/* Glow element */}
        <div className="absolute top-10 right-10 w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Subscription <span className="text-gradient">Plans</span>
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Select the plan that matches your business scale. Unlock advanced team structures, instant cloud matching, and automatic AI auditing.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrent = plan.tier === subscriptionTier;
              const PlanIcon = plan.icon;

              return (
                <div
                  key={plan.name}
                  className={`glass-card p-6 rounded-2xl flex flex-col justify-between relative transition-all duration-300 hover:scale-[1.02] ${
                    plan.popular
                      ? "ring-2 ring-purple-500/50 bg-[#17112a]/90"
                      : "border border-white/5 bg-[#110c1c]/50"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                      Most Popular
                    </span>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/15 text-purple-400">
                        <PlanIcon className="h-5 w-5" />
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded ${plan.badgeColor}`}
                      >
                        {plan.name}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-white">
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className="text-slate-500 text-xs font-medium">
                            {plan.period}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs min-h-[32px]">
                        {plan.description}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/5 w-full"></div>

                    {/* Features List */}
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                          <Check className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4">
                    <button
                      onClick={() => handleUpgradeClick(plan)}
                      disabled={isCurrent}
                      className={`w-full py-3 px-4 rounded-xl font-semibold text-xs tracking-wide transition-all ${
                        isCurrent
                          ? "bg-purple-500/10 border border-purple-500/20 text-purple-300 cursor-default"
                          : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/10 active:scale-[0.98]"
                      }`}
                    >
                      {isCurrent ? "Active Plan" : `Upgrade to ${plan.name}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Secure SSL notice banner */}
          <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5 text-slate-400 text-xs max-w-xl mx-auto">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Secure 256-bit SSL encrypted checkout. Cancel or modify subscription plans at any time.</span>
          </div>
        </div>

        {/* Mock Checkout Modal Dialog */}
        {showCheckout && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setShowCheckout(false)}
            ></div>

            <div className="glass-card max-w-md w-full rounded-3xl border border-white/10 bg-[#161224] p-6 shadow-2xl relative overflow-hidden z-10">
              {isSuccess ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
                  <div className="h-16 w-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center animate-bounce">
                    <Check className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Payment Confirmed!</h3>
                  <p className="text-slate-400 text-xs">
                    Welcome to the {selectedPlan.name} plan. Your account features are now unlocked.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCheckoutSubmit} className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-white/5">
                    <div>
                      <h3 className="text-lg font-bold text-white">Confirm Checkout</h3>
                      <p className="text-slate-400 text-xs">Upgrading to {selectedPlan.name} plan</p>
                    </div>
                    <span className="text-xl font-extrabold text-white">
                      {selectedPlan.price}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Simulated card details */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Card Number
                      </label>
                      <div className="relative">
                        <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 focus:bg-white/[0.08]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 focus:bg-white/[0.08]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          CVC / CVV
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={3}
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 focus:bg-white/[0.08]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 text-[10px]">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Mock payments sandbox. No real charge will occur.</span>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCheckout(false)}
                      className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-xs rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>Complete Upgrade</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
