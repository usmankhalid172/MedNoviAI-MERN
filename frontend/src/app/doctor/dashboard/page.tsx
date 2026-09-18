"use client";

import PageLayout from "@/components/shared/PageLayout";
import StatCard from "@/components/shared/StatCard";
import { Users } from "lucide-react";

export default function Home() {
  return (
    <PageLayout>
      <div className="container mx-auto p-6 space-y-6">
        <StatCard
          title="Total Patients"
          value="1,248"
          icon={Users}
          trend="+12% from last month"
          trendType="positive"
        />
      </div>
    </PageLayout>
  );
}