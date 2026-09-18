"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { 
  Bell, 
  Calendar, 
  MessageSquare, 
  Heart, 
  Activity, 
  Thermometer, 
  Droplets, 
  ArrowRight, 
  LogOut,
  Stethoscope,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function PatientDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        router.push("/login");
      }
    }
    setLoading(false);
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb]"></div>
      </div>
    );
  }

  const userName = user?.name || "Patient";
  const firstName = userName.split(" ")[0];
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const navLinks = [
    { label: "How does it work?", href: "/#how-it-works" },
    { label: "About us", href: "/#about" },
    { label: "FAQ", href: "/#faq" },
    { label: "Contact", href: "/#contact" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800">
      {/* Header synced with Landing Page Logo and Nav Links */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Landing Page Style Stethoscope Logo */}
          <Link href="/" className="flex items-center gap-2">
            <svg
              className="w-7 h-7 text-[#0e2a47]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4.8 2.3A.3.3 0 0 0 4.5 2.6V8a5 5 0 0 0 10 0V2.6a.3.3 0 0 0-.3-.3h-1.4a.3.3 0 0 0-.3.3V8a3 3 0 0 1-6 0V2.6a.3.3 0 0 0-.3-.3H4.8z" />
              <path d="M9.5 13v3a4.5 4.5 0 0 0 9 0v-2.5" />
              <circle cx="18.5" cy="11.5" r="2" />
            </svg>
            <span className="text-xl font-bold text-[#0e2a47] tracking-tight">
              MedNovi<span className="text-[#2563eb]">AI</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs font-semibold text-slate-600 hover:text-[#2563eb] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop User Profile & Controls */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="outline" size="icon" className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100/80">
              <Bell className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <Avatar className="h-9 w-9 border border-[#2563eb]/20 bg-[#2563eb] text-white shadow-sm">
                <AvatarFallback className="bg-[#2563eb] text-white font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 leading-none">{userName}</p>
                <p className="text-[10px] text-[#2563eb] font-semibold mt-1">Patient Account</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={logout} 
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-slate-200 space-y-3 pb-2 animate-in slide-in-from-top-2">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between px-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 bg-[#2563eb] text-white">
                  <AvatarFallback className="bg-[#2563eb] text-white font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-bold text-slate-900">{userName}</p>
                  <p className="text-[10px] text-[#2563eb] font-semibold">Patient Account</p>
                </div>
              </div>
              
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={logout} 
                className="bg-red-600 text-white rounded-lg px-3 py-1 text-xs gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Welcome & Quick Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Good Day, {firstName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Welcome to your personal health portal. Manage consultations and AI symptom analysis.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link href="/appointment/book" className="w-full sm:w-auto">
              <Button className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-xs rounded-xl shadow-md shadow-[#2563eb]/20 h-10 px-4 gap-2">
                <Calendar className="w-4 h-4" />
                <span>Book Appointment</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* AI Assistant Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#0e2a47] via-[#102a45] to-[#1e3a8a] text-white p-6 sm:p-8 rounded-3xl shadow-xl">
          <div className="relative z-10 max-w-xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold border border-blue-400/30">
              <Stethoscope className="w-3.5 h-3.5" /> MedNovi AI Active
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Feeling unwell or need quick medical guidance?
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed">
              Start a session with our interactive AI assistant to analyze symptoms and find suitable specialist recommendations.
            </p>
            <div className="pt-2">
              <Link href="/chat">
                <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-xl h-10 px-5 gap-2 transition-all">
                  <MessageSquare className="w-4 h-4" /> Start AI Consultation <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Vitals Section */}
        <div>
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#2563eb]" /> Health Vitals Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Heart Rate</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">72 <span className="text-xs font-medium text-slate-500">bpm</span></p>
                <span className="text-[10px] text-[#2563eb] font-semibold bg-[#e8f1ff] px-2 py-0.5 rounded-md mt-2 inline-block">Normal</span>
              </div>
              <div className="p-3 bg-[#e8f1ff] text-[#2563eb] rounded-xl">
                <Heart className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Blood Pressure</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">120/80 <span className="text-xs font-medium text-slate-500">mmHg</span></p>
                <span className="text-[10px] text-[#2563eb] font-semibold bg-[#e8f1ff] px-2 py-0.5 rounded-md mt-2 inline-block">Optimal</span>
              </div>
              <div className="p-3 bg-[#e8f1ff] text-[#2563eb] rounded-xl">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Blood Sugar</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">95 <span className="text-xs font-medium text-slate-500">mg/dL</span></p>
                <span className="text-[10px] text-[#2563eb] font-semibold bg-[#e8f1ff] px-2 py-0.5 rounded-md mt-2 inline-block">Fasting Normal</span>
              </div>
              <div className="p-3 bg-[#e8f1ff] text-[#2563eb] rounded-xl">
                <Droplets className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Body Temp</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">98.6 <span className="text-xs font-medium text-slate-500">°F</span></p>
                <span className="text-[10px] text-[#2563eb] font-semibold bg-[#e8f1ff] px-2 py-0.5 rounded-md mt-2 inline-block">Normal</span>
              </div>
              <div className="p-3 bg-[#e8f1ff] text-[#2563eb] rounded-xl">
                <Thermometer className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links / Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Find Specialists</h3>
              <Link href="/doctors" className="text-xs font-semibold text-[#2563eb] hover:underline">View All</Link>
            </div>
            <p className="text-xs text-slate-500">Browse verified doctors, check ratings, and schedule instant video or physical visits.</p>
            <Link href="/doctors" className="block">
              <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl h-10">
                Explore Doctor Directory
              </Button>
            </Link>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Appointments</h3>
              <Link href="/appointment/confirm" className="text-xs font-semibold text-[#2563eb] hover:underline">Check Status</Link>
            </div>
            <p className="text-xs text-slate-500">Track pending appointment confirmations or view past consultation history.</p>
            <Link href="/appointment/confirm" className="block">
              <Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl h-10">
                View My Consultations
              </Button>
            </Link>
          </div>
        </div>

      </main>
    </div>
  );
}