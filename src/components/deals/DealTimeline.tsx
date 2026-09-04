import React from "react";
import { Check, Clock, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { dealTimeline, formatDateTime, type Deal } from "@/lib/deals";

const DealTimeline: React.FC<{ deal: Deal }> = ({ deal }) => {
  const events = dealTimeline(deal);
  return (
    <ol className="relative border-r-2 border-muted mr-3 space-y-5" aria-label="الخط الزمني للصفقة">
      {events.map((e) => {
        const Icon = !e.done ? Clock : e.tone === "danger" ? XCircle : e.tone === "warn" ? AlertTriangle : Check;
        return (
          <li key={e.key} className="mr-5 relative">
            <span
              className={cn(
                "absolute -right-[29px] top-0 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-background",
                !e.done && "border-muted text-muted-foreground",
                e.done && e.tone === "ok" && "border-green-600 bg-green-600 text-white",
                e.done && e.tone === "warn" && "border-amber-500 bg-amber-500 text-white",
                e.done && e.tone === "danger" && "border-destructive bg-destructive text-destructive-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <p className={cn("text-sm font-medium", !e.done && "text-muted-foreground")}>{e.label}</p>
            <p className="text-xs text-muted-foreground">{e.done ? formatDateTime(e.at) : "لم يتم بعد"}</p>
          </li>
        );
      })}
    </ol>
  );
};

export default DealTimeline;
