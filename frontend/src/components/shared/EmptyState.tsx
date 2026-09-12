import React from "react";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No Data Found",
  message = "There are no items to display at the moment.",
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-muted/20">
      <FolderOpen className="w-12 h-12 text-muted-foreground mb-3" />
      <h4 className="text-lg font-semibold text-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
    </div>
  );
};

export default EmptyState;