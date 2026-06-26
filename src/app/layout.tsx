import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "BillAI - Smart AI Expense & Bill Management SaaS",
  description:
    "Scan receipts, bills, and invoices automatically using Gemini Vision AI. Extract line items, compute tax deductions, and download Excel/PDF reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark antialiased">
      <body className="min-h-full flex flex-col bg-[#0c0a0f] text-[#f8fafc]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
