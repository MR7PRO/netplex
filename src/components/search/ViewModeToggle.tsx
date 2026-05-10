import React from "react";
import { LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ViewMode = "grid" | "list";

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({ value, onChange }) => {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as ViewMode)}
      variant="outline"
      size="sm"
      className="shrink-0"
    >
      <ToggleGroupItem value="grid" aria-label="عرض شبكي" className="h-9 px-2.5">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="عرض قائمة" className="h-9 px-2.5">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
