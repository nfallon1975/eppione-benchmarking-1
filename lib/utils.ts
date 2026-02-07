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

export const COUNTRY_LABELS: Record<string, string> = {
  IE: "Ireland",
  GB: "United Kingdom",
  FR: "France",
  ES: "Spain",
  PT: "Portugal",
  US: "United States",
  DE: "Germany",
  NL: "Netherlands",
  AE: "United Arab Emirates",
  SG: "Singapore",
  AU: "Australia",
};

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

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
