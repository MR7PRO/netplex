// Gaza regions
export const REGIONS = [
  { value: "gaza-city", label_ar: "مدينة غزة", label_en: "Gaza City" },
  { value: "jabalia", label_ar: "جباليا", label_en: "Jabalia" },
  { value: "beit-hanoun", label_ar: "بيت حانون", label_en: "Beit Hanoun" },
  { value: "beit-lahia", label_ar: "بيت لاهيا", label_en: "Beit Lahia" },
  { value: "khan-younis", label_ar: "خان يونس", label_en: "Khan Younis" },
  { value: "rafah", label_ar: "رفح", label_en: "Rafah" },
  { value: "deir-al-balah", label_ar: "دير البلح", label_en: "Deir al-Balah" },
  { value: "nuseirat", label_ar: "النصيرات", label_en: "Nuseirat" },
  { value: "bureij", label_ar: "البريج", label_en: "Bureij" },
  { value: "maghazi", label_ar: "المغازي", label_en: "Maghazi" },
] as const;

export const CONDITION_OPTIONS = [
  { value: "new", label_ar: "جديد", label_en: "New" },
  { value: "like_new", label_ar: "كالجديد", label_en: "Like New" },
  { value: "good", label_ar: "جيد", label_en: "Good" },
  { value: "fair", label_ar: "مقبول", label_en: "Fair" },
  { value: "poor", label_ar: "يحتاج إصلاح", label_en: "Poor" },
] as const;

export const LISTING_STATUS = [
  { value: "available", label_ar: "متاح", label_en: "Available" },
  { value: "reserved", label_ar: "محجوز", label_en: "Reserved" },
  { value: "sold", label_ar: "مباع", label_en: "Sold" },
  { value: "expired", label_ar: "منتهي", label_en: "Expired" },
] as const;

export const SUBMISSION_STATUS = [
  { value: "pending", label_ar: "قيد المراجعة", label_en: "Pending" },
  { value: "approved", label_ar: "مقبول", label_en: "Approved" },
  { value: "rejected", label_ar: "مرفوض", label_en: "Rejected" },
] as const;

// Format price in ILS
export const formatPrice = (price: number): string => {
  return `₪${price.toLocaleString("he-IL")}`;
};

// Get region label
export const getRegionLabel = (value: string, lang: "ar" | "en" = "ar"): string => {
  const region = REGIONS.find((r) => r.value === value);
  return region ? (lang === "ar" ? region.label_ar : region.label_en) : value;
};

// Get condition label
export const getConditionLabel = (value: string, lang: "ar" | "en" = "ar"): string => {
  const condition = CONDITION_OPTIONS.find((c) => c.value === value);
  return condition ? (lang === "ar" ? condition.label_ar : condition.label_en) : value;
};

// Relative time in Arabic
export const getRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسبوع`;
  return `منذ ${Math.floor(diffDays / 30)} شهر`;
};
