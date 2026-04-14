import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Clock, TrendingUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  title: string;
  price_ils: number;
  type: "listing" | "recent";
}

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  className?: string;
}

const RECENT_SEARCHES_KEY = "netplex_recent_searches";
const MAX_RECENT = 5;

const getRecentSearches = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
};

const addRecentSearch = (query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return;
  const recent = getRecentSearches().filter((s) => s !== trimmed);
  recent.unshift(trimmed);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

const removeRecentSearch = (query: string) => {
  const recent = getRecentSearches().filter((s) => s !== query);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
};

export const SmartSearchInput: React.FC<SmartSearchInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "ابحث عن منتجات...",
  className,
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();

  // Load recent searches
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("id, title, price_ils")
      .eq("status", "available")
      .or(`title.ilike.%${query}%,brand.ilike.%${query}%,model.ilike.%${query}%`)
      .order("view_count", { ascending: false })
      .limit(6);

    if (data) {
      setSuggestions(data.map((d) => ({ ...d, type: "listing" as const })));
    }
    setLoading(false);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => fetchSuggestions(value.trim()), 250);
    } else {
      setSuggestions([]);
    }
    setActiveIndex(-1);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = () => {
    if (value.trim()) {
      addRecentSearch(value.trim());
      setRecentSearches(getRecentSearches());
    }
    setShowDropdown(false);
    onSubmit();
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setShowDropdown(false);
    addRecentSearch(suggestion.title);
    navigate(`/listing/${suggestion.id}`);
  };

  const handleSelectRecent = (query: string) => {
    onChange(query);
    setShowDropdown(false);
    addRecentSearch(query);
    setTimeout(onSubmit, 0);
  };

  const handleRemoveRecent = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    removeRecentSearch(query);
    setRecentSearches(getRecentSearches());
  };

  const allItems = value.trim().length >= 2
    ? suggestions
    : recentSearches.map((s, i) => ({ id: `recent-${i}`, title: s, price_ils: 0, type: "recent" as const }));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || allItems.length === 0) {
      if (e.key === "Enter") handleSubmit();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? allItems.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < allItems.length) {
        const item = allItems[activeIndex];
        if (item.type === "recent") handleSelectRecent(item.title);
        else handleSelectSuggestion(item);
      } else {
        handleSubmit();
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const showSuggestions = showDropdown && (allItems.length > 0 || loading);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          className="pr-10"
          dir="auto"
          autoComplete="off"
        />
      </div>

      {showSuggestions && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden"
        >
          {loading && value.trim().length >= 2 && (
            <div className="px-4 py-3 text-sm text-muted-foreground animate-pulse">
              جاري البحث...
            </div>
          )}

          {/* Recent searches header */}
          {value.trim().length < 2 && recentSearches.length > 0 && (
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b flex items-center gap-1">
              <Clock className="h-3 w-3" />
              عمليات بحث سابقة
            </div>
          )}

          {/* Suggestions header */}
          {value.trim().length >= 2 && suggestions.length > 0 && !loading && (
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              اقتراحات
            </div>
          )}

          {allItems.map((item, index) => (
            <button
              key={item.id}
              className={cn(
                "w-full text-right px-4 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-sm",
                activeIndex === index && "bg-muted/50"
              )}
              onClick={() =>
                item.type === "recent"
                  ? handleSelectRecent(item.title)
                  : handleSelectSuggestion(item)
              }
              onMouseEnter={() => setActiveIndex(index)}
            >
              {item.type === "recent" ? (
                <>
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 line-clamp-1">{item.title}</span>
                  <button
                    onClick={(e) => handleRemoveRecent(e, item.title)}
                    className="shrink-0 p-0.5 rounded hover:bg-muted"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 line-clamp-1">{item.title}</span>
                  <span className="text-primary font-medium text-xs shrink-0">
                    ₪{item.price_ils.toLocaleString()}
                  </span>
                </>
              )}
            </button>
          ))}

          {value.trim().length >= 2 && !loading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              لا توجد اقتراحات
            </div>
          )}
        </div>
      )}
    </div>
  );
};
