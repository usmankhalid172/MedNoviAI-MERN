import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  trend?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className = "",
}) => {
  return (
    <Card className={`shadow-sm border rounded-xl ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold tracking-tight mt-1">{value}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && (
              <span className="inline-block mt-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {trend}
              </span>
            )}
          </div>
          {Icon && (
            <div className="p-3 bg-primary/10 text-primary rounded-lg">
              <Icon className="w-6 h-6" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;