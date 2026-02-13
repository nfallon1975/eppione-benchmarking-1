import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const NACE_INDUSTRIES: Record<string, string> = {
  A01: "Crop and animal production",
  A02: "Forestry and logging",
  A03: "Fishing and aquaculture",
  B05: "Mining of coal and lignite",
  B06: "Extraction of crude petroleum and gas",
  C10: "Manufacture of food products",
  C20: "Manufacture of chemicals",
  C21: "Manufacture of pharmaceuticals",
  C26: "Manufacture of computer and electronic products",
  C27: "Manufacture of electrical equipment",
  C28: "Manufacture of machinery and equipment",
  C29: "Manufacture of motor vehicles",
  D35: "Electricity, gas, steam supply",
  F41: "Construction of buildings",
  F42: "Civil engineering",
  G45: "Wholesale and retail trade of motor vehicles",
  G46: "Wholesale trade",
  G47: "Retail trade",
  H49: "Land transport",
  H50: "Water transport",
  H51: "Air transport",
  H52: "Warehousing and support for transportation",
  I55: "Accommodation",
  I56: "Food and beverage service",
  J58: "Publishing activities",
  J59: "Motion picture and sound production",
  J60: "Programming and broadcasting",
  J61: "Telecommunications",
  J62: "Computer programming and consultancy",
  J63: "Information service activities",
  K64: "Financial services (except insurance)",
  K65: "Insurance and pension funding",
  K66: "Activities auxiliary to financial services",
  L68: "Real estate activities",
  M69: "Legal and accounting activities",
  M70: "Management consultancy",
  M71: "Architecture and engineering",
  M72: "Scientific research and development",
  M73: "Advertising and market research",
  N78: "Employment activities",
  N80: "Security and investigation",
  N82: "Office support activities",
  O84: "Public administration and defence",
  P85: "Education",
  Q86: "Human health activities",
  Q87: "Residential care activities",
  Q88: "Social work activities",
  R90: "Creative, arts and entertainment",
  R93: "Sports and recreation",
  S94: "Activities of membership organisations",
};

export const BENEFIT_CATEGORY_LABELS: Record<string, string> = {
  HEALTH: "Health Insurance",
  LIFE: "Life Insurance / Death in Service",
  DISABILITY: "Disability Insurance",
  PENSION: "Pension / Retirement",
  DENTAL: "Dental Insurance",
  VISION: "Vision / Optical",
  EAP: "Employee Assistance Programme",
  WELLNESS: "Wellness / Wellbeing",
  INCOME_PROTECTION: "Income Protection",
  CRITICAL_ILLNESS: "Critical Illness Cover",
  TRAVEL: "Travel Insurance",
  MEAL_VOUCHERS: "Meal Vouchers / Allowance",
  TRANSPORT: "Transport / Commuter Benefits",
  CHILDCARE: "Childcare Benefits",
  EDUCATION: "Education / Training",
  OTHER: "Other Benefits",
};

// Re-export the full country list as COUNTRY_LABELS for backward compatibility
export { ALL_COUNTRY_LABELS as COUNTRY_LABELS } from "@/lib/countries";

export const PLATFORM_TYPE_LABELS: Record<string, string> = {
  FLEX_BENEFITS: "Flexible Benefits Platform",
  TOTAL_REWARD: "Total Reward Statement",
  VOLUNTARY: "Voluntary Benefits",
  DISCOUNT: "Employee Discounts",
  WELLBEING: "Wellbeing Platform",
  OTHER: "Other",
};

export const FEE_MODEL_LABELS: Record<string, string> = {
  PER_EMPLOYEE_PER_MONTH: "Per Employee Per Month (PEPM)",
  PER_EMPLOYEE_PER_YEAR: "Per Employee Per Year (PEPY)",
  FLAT_FEE: "Flat Annual Fee",
  PERCENTAGE: "Percentage of Spend",
  OTHER: "Other",
};

export const NACE_SECTIONS: Record<string, string> = {
  A: "Agriculture, Forestry and Fishing",
  B: "Mining and Quarrying",
  C: "Manufacturing",
  D: "Electricity, Gas, Steam and Air Conditioning Supply",
  E: "Water Supply; Sewerage, Waste Management",
  F: "Construction",
  G: "Wholesale and Retail Trade",
  H: "Transportation and Storage",
  I: "Accommodation and Food Service",
  J: "Information and Communication",
  K: "Financial and Insurance Activities",
  L: "Real Estate Activities",
  M: "Professional, Scientific and Technical Activities",
  N: "Administrative and Support Service Activities",
  O: "Public Administration and Defence",
  P: "Education",
  Q: "Human Health and Social Work Activities",
  R: "Arts, Entertainment and Recreation",
  S: "Other Service Activities",
};

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const EMPLOYEE_COUNT_RANGES = [
  "1-50",
  "51-250",
  "251-1000",
  "1001-5000",
  "5000+",
];

export function formatCurrency(amount: number, currency: string): string {
  const code = currency && currency.length === 3 ? currency : "EUR";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Return a Tailwind color class based on percentile rank.
 * Low cost = green (good), high cost = red (expensive).
 */
export function getPercentileColor(rank: number | null): string {
  if (rank === null) return "text-slate-500";
  if (rank <= 25) return "text-green-600";
  if (rank <= 50) return "text-green-500";
  if (rank <= 75) return "text-amber-500";
  return "text-red-500";
}

/**
 * Return a background Tailwind class based on percentile rank.
 */
export function getPercentileBgColor(rank: number | null): string {
  if (rank === null) return "bg-slate-100";
  if (rank <= 25) return "bg-green-50";
  if (rank <= 50) return "bg-green-50/50";
  if (rank <= 75) return "bg-amber-50";
  return "bg-red-50";
}
