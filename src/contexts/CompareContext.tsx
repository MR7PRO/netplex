import React, { createContext, useContext, useState, useCallback } from "react";

export interface CompareListing {
  id: string;
  title: string;
  price_ils: number;
  condition: string | null;
  region: string;
  brand: string | null;
  model: string | null;
  image: string | null;
  sellerVerified?: boolean;
  sellerTrustScore?: number | null;
  sellerName?: string | null;
}

interface CompareContextType {
  items: CompareListing[];
  addItem: (item: CompareListing) => void;
  removeItem: (id: string) => void;
  isComparing: (id: string) => boolean;
  clearAll: () => void;
  isFull: boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
};

export const CompareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CompareListing[]>([]);

  const addItem = useCallback((item: CompareListing) => {
    setItems((prev) => {
      if (prev.length >= 3 || prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const isComparing = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const clearAll = useCallback(() => setItems([]), []);

  return (
    <CompareContext.Provider value={{ items, addItem, removeItem, isComparing, clearAll, isFull: items.length >= 3 }}>
      {children}
    </CompareContext.Provider>
  );
};
