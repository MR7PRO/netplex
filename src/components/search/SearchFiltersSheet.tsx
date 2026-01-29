import React from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { REGIONS, CONDITION_OPTIONS, formatPrice } from "@/lib/constants";

export interface SearchFilters {
  category: string;
  region: string;
  conditions: string[];
  priceRange: [number, number];
  brand: string;
  model: string;
}

interface Category {
  id: string;
  slug: string;
  name_ar: string;
}

interface BrandModel {
  brand: string | null;
  model: string | null;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onApply: () => void;
  onClear: () => void;
  categories: Category[];
  brands: string[];
  models: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SearchFiltersSheet: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onApply,
  onClear,
  categories,
  brands,
  models,
  open,
  onOpenChange,
}) => {
  const activeFiltersCount = [
    filters.category,
    filters.region,
    filters.conditions.length > 0,
    filters.priceRange[0] > 0 || filters.priceRange[1] < 50000,
    filters.brand,
    filters.model,
  ].filter(Boolean).length;

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <SlidersHorizontal className="h-4 w-4 ml-2" />
          فلترة
          {activeFiltersCount > 0 && (
            <Badge className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>فلترة النتائج</SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-6">
          {/* Category */}
          <div>
            <label className="text-sm font-medium mb-2 block">القسم</label>
            <Select
              value={filters.category}
              onValueChange={(v) => updateFilter("category", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="جميع الأقسام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع الأقسام</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    {cat.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region */}
          <div>
            <label className="text-sm font-medium mb-2 block">المنطقة</label>
            <Select
              value={filters.region}
              onValueChange={(v) => updateFilter("region", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="جميع المناطق" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع المناطق</SelectItem>
                {REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand */}
          <div>
            <label className="text-sm font-medium mb-2 block">الماركة</label>
            <Select
              value={filters.brand}
              onValueChange={(v) => {
                updateFilter("brand", v);
                // Reset model when brand changes
                if (v !== filters.brand) {
                  updateFilter("model", "");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="جميع الماركات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع الماركات</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div>
            <label className="text-sm font-medium mb-2 block">الموديل</label>
            <Select
              value={filters.model}
              onValueChange={(v) => updateFilter("model", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="جميع الموديلات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع الموديلات</SelectItem>
                {models.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Condition */}
          <div>
            <label className="text-sm font-medium mb-2 block">الحالة</label>
            <div className="space-y-2">
              {CONDITION_OPTIONS.map((condition) => (
                <div key={condition.value} className="flex items-center gap-2">
                  <Checkbox
                    id={condition.value}
                    checked={filters.conditions.includes(condition.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        updateFilter("conditions", [
                          ...filters.conditions,
                          condition.value,
                        ]);
                      } else {
                        updateFilter(
                          "conditions",
                          filters.conditions.filter((c) => c !== condition.value)
                        );
                      }
                    }}
                  />
                  <label
                    htmlFor={condition.value}
                    className="text-sm cursor-pointer"
                  >
                    {condition.label_ar}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              نطاق السعر: {formatPrice(filters.priceRange[0])} -{" "}
              {formatPrice(filters.priceRange[1])}
            </label>
            <Slider
              value={filters.priceRange}
              onValueChange={(value) =>
                updateFilter("priceRange", value as [number, number])
              }
              min={0}
              max={50000}
              step={100}
              className="mt-4"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={onApply} className="flex-1 btn-brand">
              تطبيق
            </Button>
            <Button variant="outline" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SearchFiltersSheet;
