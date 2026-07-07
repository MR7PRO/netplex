import React, { useState } from "react";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REGIONS, getRegionLabel } from "@/lib/constants";
import { useUserRegion } from "@/hooks/useUserRegion";
import { cn } from "@/lib/utils";

interface Props {
  active: boolean;
  onToggle: (region: string) => void;
}

export const NearMeChip: React.FC<Props> = ({ active, onToggle }) => {
  const { region: savedRegion, setRegion } = useUserRegion();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(savedRegion);

  const handleClick = () => {
    if (active) {
      onToggle("");
      return;
    }
    if (savedRegion) {
      onToggle(savedRegion);
    } else {
      setDraft("");
      setOpen(true);
    }
  };

  const handleSave = () => {
    if (!draft) return;
    setRegion(draft);
    onToggle(draft);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors whitespace-nowrap",
          active
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-foreground border-border hover:bg-muted"
        )}
        title="عرض المنتجات القريبة منك"
      >
        <MapPin className="h-3.5 w-3.5" />
        قريب مني
        {active && savedRegion && (
          <span className="opacity-80">· {getRegionLabel(savedRegion)}</span>
        )}
        {active && <X className="h-3 w-3 opacity-80" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              اختر منطقتك
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            سنعرض لك المنتجات في هذه المنطقة أولاً. يمكنك تغييرها لاحقاً.
          </p>
          <Select value={draft} onValueChange={setDraft}>
            <SelectTrigger>
              <SelectValue placeholder="اختر المنطقة" />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label_ar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button className="btn-brand" onClick={handleSave} disabled={!draft}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
