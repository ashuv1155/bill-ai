"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Receipt, Mail, Lock, User, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function SignupPage() {
  const { user, signup, loginWithGoogle, loginWithApple } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [inviteToken, setInviteToken] = useState("");
  const [isInviteFlow, setIsInviteFlow] = useState(false);

  // Parse invite tokens from URL query client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
        setInviteToken(token);
        const storedMembers = localStorage.getItem("team_members");
        if (storedMembers) {
          const members = JSON.parse(storedMembers);
          const matched = members.find((m: any) => m.token === token && m.status === "Pending");
          if (matched) {
            setEmail(matched.email);
            setName(matched.name);
            setIsInviteFlow(true);
          }
        }
      }
    }
  }, []);

  // Redirect if logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signup(email, password, name);

      // If completing an invitation, mark member status as Active
      if (isInviteFlow && inviteToken) {
        const storedMembers = localStorage.getItem("team_members");
        if (storedMembers) {
          const members = JSON.parse(storedMembers);
          const updated = members.map((m: any) =>
            m.token === inviteToken ? { ...m, status: "Active" } : m
          );
          localStorage.setItem("team_members", JSON.stringify(updated));
        }
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account. Please check details.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google sign-up failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithApple();
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Apple sign-up failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0c0a0f] p-4 relative">
      <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md p-8 rounded-2xl glass-card relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl"></div>

        <div className="flex flex-col items-center mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group text-slate-400 hover:text-white transition-colors text-xs self-start">
            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
            Back to home
          </Link>
          <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/20 mb-3">
            <Receipt className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Account</h2>
          <p className="text-slate-400 text-sm mt-1">Get started with AI bill tracking</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-12 py-3.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Or Register With</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={handleGoogleLogin}
            type="button"
            disabled={loading}
            className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.76 14.93 1 12 1 7.37 1 3.4 3.65 1.48 7.52l3.77 2.92C6.18 7.38 8.87 5.04 12 5.04z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.77 2.92c2.2-2.03 3.64-5.02 3.64-8.58z"/>
              <path fill="#FBBC05" d="M5.25 10.44c-.25.75-.39 1.55-.39 2.56s.14 1.81.39 2.56L1.48 18.2C.54 16.3.01 14.17.01 12c0-2.17.53-4.3 1.47-6.2l3.77 2.64z"/>
              <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.92l-3.77-2.92c-1.04.7-2.38 1.12-4.16 1.12-3.13 0-5.82-2.34-6.75-5.4L1.48 16.2C3.4 20.35 7.37 23 12 23z"/>
            </svg>
            Google
          </button>
          <button
            onClick={handleAppleLogin}
            type="button"
            disabled={loading}
            className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
          >
            <svg className="h-4.5 w-4.5 text-white fill-current" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.83 16.38 4.7 9.8 9.54 9.55c1.46.07 2.45.88 3.24.88.77 0 2.05-.98 3.73-.81 1.7.17 2.93.9 3.57 2.1-.96.69-2.02 1.4-1.8 3 .26 1.83 1.34 2.5 2.1 2.92-.6 1.8-1.52 3.6-3.33 3.64zm-3.84-11.3c-.09-2.07 1.63-3.88 3.52-4.04.2 2.2-1.88 4.19-3.52 4.04z" />
            </svg>
            Apple
          </button>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
