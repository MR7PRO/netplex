import React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  className,
}) => {
  return (
    <div className={cn("text-center py-12 px-4", className)}>
      <div className="relative inline-flex items-center justify-center mb-5">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
          <Icon className="h-10 w-10 text-primary" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-lg md:text-xl font-bold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm md:text-base max-w-sm mx-auto mb-5">
          {description}
        </p>
      )}
      {actionLabel && (actionTo || onAction) && (
        actionTo ? (
          <Button asChild className="btn-brand">
            <Link to={actionTo}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button onClick={onAction} className="btn-brand">{actionLabel}</Button>
        )
      )}
    </div>
  );
};

export default EmptyState;
