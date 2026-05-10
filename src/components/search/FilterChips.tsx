import React from "react";
import { ChevronDown, X, MapPin, Tag, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { REGIONS, CONDITION_OPTIONS, formatPrice } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { SearchFilters } from "./SearchFiltersSheet";

interface FilterChipsProps {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
  onApply: () => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ filters, onChange, onApply }) => {
  const update = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) =>
    onChange({ ...filters, [k]: v });

  const hasPrice = filters.priceRange[0] > 0 || filters.priceRange[1] < 50000;
  const regionLabel = filters.region
    ? REGIONS.find((r) => r.value === filters.region)?.label_ar
    : null;
  const conditionsLabel = filters.conditions.length > 0
    ? `${filters.conditions.length} حالة`
    : null;

  const chipBase =
    "h-8 rounded-full px-3 gap-1 text-xs whitespace-nowrap shrink-0 border";
  const activeChip = "bg-primary/10 border-primary/30 text-primary";
  const inactiveChip = "bg-background hover:bg-muted";

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
      {/* Region */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn(chipBase, regionLabel ? activeChip : inactiveChip)}>
            <MapPin className="h-3 w-3" />
            {regionLabel || "المنطقة"}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="max-h-64 overflow-y-auto space-y-1">
            <button
              onClick={() => { update("region", ""); onApply(); }}
              className={cn("w-full text-right px-2 py-1.5 text-sm rounded hover:bg-muted", !filters.region && "bg-muted")}
            >
              جميع المناطق
            </button>
            {REGIONS.map((r) => (
              <button
                key={r.value}
                onClick={() => { update("region", r.value); onApply(); }}
                className={cn("w-full text-right px-2 py-1.5 text-sm rounded hover:bg-muted", filters.region === r.value && "bg-muted")}
              >
                {r.label_ar}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Price */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn(chipBase, hasPrice ? activeChip : inactiveChip)}>
            <DollarSign className="h-3 w-3" />
            {hasPrice
              ? `${formatPrice(filters.priceRange[0])} - ${formatPrice(filters.priceRange[1])}`
              : "السعر"}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">
              {formatPrice(filters.priceRange[0])} - {formatPrice(filters.priceRange[1])}
            </div>
            <Slider
              value={filters.priceRange}
              onValueChange={(v) => update("priceRange", v as [number, number])}
              min={0}
              max={50000}
              step={100}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => { update("priceRange", [0, 50000]); onApply(); }}>
                إعادة تعيين
              </Button>
              <Button size="sm" className="flex-1 btn-brand" onClick={onApply}>تطبيق</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Condition */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn(chipBase, conditionsLabel ? activeChip : inactiveChip)}>
            <Tag className="h-3 w-3" />
            {conditionsLabel || "الحالة"}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-2" align="start">
          <div className="space-y-1">
            {CONDITION_OPTIONS.map((c) => (
              <label
                key={c.value}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={filters.conditions.includes(c.value)}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...filters.conditions, c.value]
                      : filters.conditions.filter((x) => x !== c.value);
                    update("conditions", next);
                  }}
                />
                <span>{c.label_ar}</span>
              </label>
            ))}
            <Button size="sm" className="w-full btn-brand mt-2" onClick={onApply}>تطبيق</Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active chips with X to clear */}
      {regionLabel && (
        <Badge
          variant="outline"
          className="h-8 rounded-full px-2 gap-1 cursor-pointer shrink-0"
          onClick={() => { update("region", ""); onApply(); }}
        >
          {regionLabel}
          <X className="h-3 w-3" />
        </Badge>
      )}
      {filters.brand && (
        <Badge
          variant="outline"
          className="h-8 rounded-full px-2 gap-1 cursor-pointer shrink-0"
          onClick={() => { onChange({ ...filters, brand: "", model: "" }); onApply(); }}
        >
          {filters.brand}
          <X className="h-3 w-3" />
        </Badge>
      )}
    </div>
  );
};
