import React, { useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { SearchFilters } from "./SearchFiltersSheet";

interface SaveSearchButtonProps {
  query: string;
  filters: SearchFilters;
}

export const SaveSearchButton: React.FC<SaveSearchButtonProps> = ({ query, filters }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  const buildDefaultTitle = () => {
    const parts: string[] = [];
    if (query) parts.push(query);
    if (filters.brand) parts.push(filters.brand);
    if (filters.model) parts.push(filters.model);
    if (filters.region) parts.push(filters.region);
    if (filters.priceRange[1] < 50000) parts.push(`< ₪${filters.priceRange[1]}`);
    return parts.join(" • ") || "بحثي";
  };

  const handleOpen = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setTitle(buildDefaultTitle());
    setOpen(true);
  };

  const handleSave = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      title: title.trim(),
      query_text: query || null,
      category_slug: filters.category || null,
      region: filters.region || null,
      brand: filters.brand || null,
      model: filters.model || null,
      condition: filters.conditions[0] || null,
      min_price: filters.priceRange[0] > 0 ? filters.priceRange[0] : null,
      max_price: filters.priceRange[1] < 50000 ? filters.priceRange[1] : null,
      alerts_enabled: alerts,
    });
    setSaving(false);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "تم حفظ البحث ✅",
        description: alerts ? "ستصلك إشعارات بأي منتج جديد يطابق بحثك" : "يمكنك العودة إليه لاحقاً",
      });
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        className="h-8 rounded-full px-3 gap-1 text-xs whitespace-nowrap shrink-0"
      >
        <Bell className="h-3.5 w-3.5" />
        احفظ البحث
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              حفظ البحث
            </DialogTitle>
            <DialogDescription>
              احفظ معايير بحثك واحصل على إشعار فوري عند نزول منتج جديد يطابقها.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="search-title">عنوان البحث</Label>
              <Input
                id="search-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: iPhone 15 أقل من 2000"
                maxLength={80}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">تنبيهات فورية</div>
                <div className="text-xs text-muted-foreground">إشعار عند ظهور منتج جديد مطابق</div>
              </div>
              <Switch checked={alerts} onCheckedChange={setAlerts} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()} className="btn-brand">
              {saving && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
