"use client";

import PageLayout from "@/components/shared/PageLayout";
import StatCard from "@/components/shared/StatCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { Users, Calendar, DollarSign, Activity } from "lucide-react";

export default function Home() {
  return (
    <PageLayout>
      <div className="space-y-8 my-6">

        {/* 1. Multiple StatCards */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-foreground">1. StatCard Components</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Patients" 
              value="1,248" 
              icon={Users} 
              description="+12% from last month" 
            />
            <StatCard 
              title="Appointments Today" 
              value="42" 
              icon={Calendar} 
              description="8 Pending" 
            />
            <StatCard 
              title="Total Revenue" 
              value="$15,400" 
              icon={DollarSign} 
              description="Target $20,000" 
            />
            <StatCard 
              title="Active Cases" 
              value="18" 
              icon={Activity} 
              description="Critical: 2" 
            />
          </div>
        </section>

        {/* 2. LoadingSpinner */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-foreground">2. LoadingSpinner Component</h2>
          <div className="p-8 border rounded-xl bg-card flex flex-col items-center justify-center gap-2">
            <LoadingSpinner />
            <p className="text-sm text-muted-foreground">Loading patient records...</p>
          </div>
        </section>

        {/* 3. EmptyState */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-foreground">3. EmptyState Component</h2>
          <div className="border rounded-xl bg-card">
            <EmptyState 
              title="No Appointments Found" 
              message="There are no scheduled patient appointments for today." 
            />
          </div>
        </section>

      </div>
    </PageLayout>
  );
}