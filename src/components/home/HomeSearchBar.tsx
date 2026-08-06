import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SmartSearchInput } from "@/components/search/SmartSearchInput";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

/** Prominent search entry point at the top of the homepage. */
export const HomeSearchBar: React.FC = () => {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const submit = () => {
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  };

  return (
    <div className="max-w-2xl mx-auto flex gap-2" role="search">
      <div className="flex-1">
        <SmartSearchInput
          value={q}
          onChange={setQ}
          onSubmit={submit}
          placeholder="شو بدك تشتري؟ جوال، لابتوب، سيارة..."
        />
      </div>
      <Button onClick={submit} className="btn-brand min-h-11 px-5" aria-label="ابحث">
        <Search className="h-4 w-4 md:ml-2" />
        <span className="hidden md:inline">ابحث</span>
      </Button>
    </div>
  );
};

export default HomeSearchBar;
