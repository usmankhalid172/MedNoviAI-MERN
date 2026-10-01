"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";
import { 
  User, 
  Phone, 
  Calendar, 
  Activity, 
  Loader2, 
  ArrowLeft, 
  Save
} from "lucide-react";

export default function PatientProfilePage() {
  const router = useRouter();
  const { user, isInitializing, login } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");

  useEffect(() => {
    if (isInitializing) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Load initial data from Supabase session metadata
    const loadProfile = async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      const meta = session?.user?.user_metadata || {};
      
      setName(meta.name || user.name || "");
      setPhone(meta.phone || "");
      setDob(meta.dob || "");
      setBloodGroup(meta.blood_group || "");
      setLoading(false);
    };

    loadProfile();
  }, [user, isInitializing, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name.trim()) {
      toast.error("Full name is required");
      return;
    }

    setSaving(true);
    
    try {
      // Update Auth Metadata in Supabase
      const { data, error } = await supabase!.auth.updateUser({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          dob,
          blood_group: bloodGroup,
        }
      });

      if (error) throw error;

      // Update local context
      if (user && data.user) {
        login({
          ...user,
          name: name.trim(),
        });
      }

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70 text-slate-800">
      <Toaster position="top-right" richColors />
      <Navbar />
      
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 mt-6">
        <Link 
          href="/patient/dashboard" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="bg-[#173b68] px-6 py-8 sm:px-10 text-white">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-blue-200 mt-2 text-sm">
              Keep your personal and medical information up to date for accurate AI consultations and doctor visits.
            </p>
          </div>

          <form onSubmit={handleUpdateProfile} className="p-6 sm:p-10 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-500" /> Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              {/* Email (Read Only) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed outline-none"
                />
                <p className="text-[10px] text-slate-400">Email cannot be changed</p>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" /> Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              {/* Blood Group */}
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-500" /> Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                >
                  <option value="">Select Blood Group</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 px-8 rounded-xl shadow-md gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? "Saving Changes..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}