"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { PageLayout } from "@/components/shared/PageLayout";
import { toast } from "sonner";

interface DashboardData {
  upcomingAppointmentsCount: number;
  recentActivity: Array<{ id: string; title: string; date: string }>;
}

export default function PatientDashboard() {
  const { token, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/patient/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          toast.error("Session expired. Logging out...");
          logout();
          return;
        }

        if (!res.ok) {
          throw new Error("Service unavailable, try again");
        }

        const result = await res.json();
        setData(result);
      } catch (err: any) {
        toast.error(err.message || "Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchDashboard();
  }, [token]);

  return (
    <PageLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Patient Dashboard</h1>

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        )}

        {/* Empty State */}
        {!loading && (!data || (data.upcomingAppointmentsCount === 0 && data.recentActivity?.length === 0)) && (
          <EmptyState
            title="No Dashboard Data Available"
            message="You currently have no upcoming appointments or recent activity to display."
          />
        )}

        {/* Real Data View */}
        {!loading && data && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Upcoming Appointments" value={data.upcomingAppointmentsCount} />
            </div>

            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
              {data.recentActivity && data.recentActivity.length > 0 ? (
                <ul className="divide-y">
                  {data.recentActivity.map((act) => (
                    <li key={act.id} className="py-2 flex justify-between">
                      <span>{act.title}</span>
                      <span className="text-sm text-gray-500">{act.date}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No recent activity found.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}