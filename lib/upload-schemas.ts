import { z } from "zod";
import { BENEFIT_CATEGORY_LABELS } from "@/lib/utils";

// --- Helpers ---

export function parseBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  const s = String(val).toLowerCase().trim();
  return ["yes", "true", "1", "y"].includes(s);
}

export function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const s = String(val).replace(/,/g, "").trim();
  const n = Number(s);
  return isNaN(n) ? null : n;
}

const validCategories = Object.keys(BENEFIT_CATEGORY_LABELS);

// --- Client benefit row schema ---

export const clientBenefitRowSchema = z.object({
  country: z.string().length(2, "Country must be a 2-character ISO code"),
  benefitCategory: z.string().refine(
    (val) => validCategories.includes(val.toUpperCase()),
    { message: "Invalid benefit category" }
  ).transform((val) => val.toUpperCase()),
  benefitName: z.string().min(1, "Benefit name is required"),
  coverLevel: z.string().min(1, "Cover level is required"),
  isCore: z.preprocess(parseBool, z.boolean()),
  // Optional with defaults
  employerFunded: z.preprocess((v) => v === "" || v === undefined || v === null ? true : parseBool(v), z.boolean()).default(true),
  isVoluntary: z.preprocess((v) => v === "" || v === undefined || v === null ? false : parseBool(v), z.boolean()).default(false),
  isFlexible: z.preprocess((v) => v === "" || v === undefined || v === null ? false : parseBool(v), z.boolean()).default(false),
  coversSpouse: z.preprocess((v) => v === "" || v === undefined || v === null ? false : parseBool(v), z.boolean()).default(false),
  coversDependents: z.preprocess((v) => v === "" || v === undefined || v === null ? false : parseBool(v), z.boolean()).default(false),
  costCurrency: z.preprocess((v) => v === "" || v === undefined || v === null ? "EUR" : String(v).toUpperCase(), z.string()).default("EUR"),
  // Optional numeric
  annualCostPerEmployee: z.preprocess(parseNumber, z.number().min(0).nullable()).default(null),
  employeeContributionPercent: z.preprocess(parseNumber, z.number().min(0).max(100).nullable()).default(null),
  // Category-specific optional
  healthExcess: z.preprocess(parseNumber, z.number().nullable()).default(null),
  healthCopayPercent: z.preprocess(parseNumber, z.number().min(0).max(100).nullable()).default(null),
  healthInpatientLimit: z.preprocess(parseNumber, z.number().nullable()).default(null),
  healthOutpatientLimit: z.preprocess(parseNumber, z.number().nullable()).default(null),
  lifeCoverMultiple: z.preprocess(parseNumber, z.number().nullable()).default(null),
  lifeFixedCoverAmount: z.preprocess(parseNumber, z.number().nullable()).default(null),
  ipBenefitPercent: z.preprocess(parseNumber, z.number().min(0).max(100).nullable()).default(null),
  ipWaitingPeriodWeeks: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  ciCoverMultiple: z.preprocess(parseNumber, z.number().nullable()).default(null),
  ciFixedCoverAmount: z.preprocess(parseNumber, z.number().nullable()).default(null),
  dentalAnnualLimit: z.preprocess(parseNumber, z.number().nullable()).default(null),
  dentalOrthoIncluded: z.preprocess((v) => v === "" || v === undefined || v === null ? null : parseBool(v), z.boolean().nullable()).default(null),
  pensionEmployerPct: z.preprocess(parseNumber, z.number().min(0).max(100).nullable()).default(null),
  pensionEmployeePct: z.preprocess(parseNumber, z.number().min(0).max(100).nullable()).default(null),
  pensionContributionRateEmployer: z.preprocess(parseNumber, z.number().min(0).max(100).nullable()).default(null),
  pensionContributionRateEmployee: z.preprocess(parseNumber, z.number().min(0).max(100).nullable()).default(null),
  pensionPlanType: z.preprocess((v) => v === undefined || v === null || v === "" ? "" : String(v), z.string()).default(""),
  pensionDeathBenefitMultiple: z.preprocess(parseNumber, z.number().nullable()).default(null),
  lifeFreeCoverLimit: z.preprocess(parseNumber, z.number().nullable()).default(null),
  ipMaxBenefitAge: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  // Annual Leave
  leaveDaysEntitlement: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  leaveIncludesPublicHolidays: z.preprocess((v) => v === "" || v === undefined || v === null ? null : parseBool(v), z.boolean().nullable()).default(null),
  leaveIncreasesWithTenure: z.preprocess((v) => v === "" || v === undefined || v === null ? null : parseBool(v), z.boolean().nullable()).default(null),
  leaveMaxDays: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  leaveBuySellDays: z.preprocess((v) => v === "" || v === undefined || v === null ? null : parseBool(v), z.boolean().nullable()).default(null),
  leaveCarryOverDays: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  leaveBirthdayOff: z.preprocess((v) => v === "" || v === undefined || v === null ? null : parseBool(v), z.boolean().nullable()).default(null),
  leaveVolunteerDays: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  leaveChristmasClosureDays: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  // Sick Pay
  sickPayFullPayWeeks: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  sickPayHalfPayWeeks: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  sickPayPartialPayPercent: z.preprocess(parseNumber, z.number().min(0).max(100).nullable()).default(null),
  sickPayWaitingDays: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  sickPayAboveStatutory: z.preprocess((v) => v === "" || v === undefined || v === null ? null : parseBool(v), z.boolean().nullable()).default(null),
  // Maternity Pay
  maternityFullPayWeeks: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  maternityPartialPayWeeks: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  maternityPartialPayPercent: z.preprocess(parseNumber, z.number().min(0).max(100).nullable()).default(null),
  maternityTotalLeaveWeeks: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  maternityAboveStatutory: z.preprocess((v) => v === "" || v === undefined || v === null ? null : parseBool(v), z.boolean().nullable()).default(null),
  maternityKitDays: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  maternityGradualReturn: z.preprocess((v) => v === "" || v === undefined || v === null ? null : parseBool(v), z.boolean().nullable()).default(null),
  // Paternity Pay
  paternityFullPayWeeks: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  paternityPartialPayWeeks: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  paternityPartialPayPercent: z.preprocess(parseNumber, z.number().min(0).max(100).nullable()).default(null),
  paternityTotalLeaveWeeks: z.preprocess(parseNumber, z.number().int().nullable()).default(null),
  paternityAboveStatutory: z.preprocess((v) => v === "" || v === undefined || v === null ? null : parseBool(v), z.boolean().nullable()).default(null),
  paternitySharedParentalLeave: z.preprocess((v) => v === "" || v === undefined || v === null ? null : parseBool(v), z.boolean().nullable()).default(null),
  // Optional string
  provider: z.preprocess((v) => v === undefined || v === null ? "" : String(v), z.string()).default(""),
  notes: z.preprocess((v) => v === undefined || v === null ? "" : String(v), z.string()).default(""),
});

export type ClientBenefitUploadRow = z.infer<typeof clientBenefitRowSchema>;

// --- Broker client row schema (extends client benefit row) ---

export const brokerClientRowSchema = clientBenefitRowSchema.extend({
  companyName: z.string().min(1, "Company name is required"),
  companyEmail: z.string().email("Valid company email is required"),
  contactName: z.preprocess((v) => v === undefined || v === null ? "" : String(v), z.string()).default(""),
  industry: z.string().min(1, "Industry (NACE code) is required"),
  employeeCount: z.preprocess(parseNumber, z.number().int().positive("Employee count must be positive")),
  employeeCountRange: z.preprocess((v) => v === undefined || v === null ? "" : String(v), z.string()).default(""),
});

export type BrokerClientUploadRow = z.infer<typeof brokerClientRowSchema>;

// --- Admin broker row schema ---

export const adminBrokerRowSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required"),
  companyName: z.string().min(1, "Company name is required"),
  licenseNumber: z.preprocess((v) => v === undefined || v === null ? "" : String(v), z.string()).default(""),
  countriesActive: z.preprocess(
    (v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string") return v.split(",").map((s: string) => s.trim().toUpperCase()).filter(Boolean);
      return [];
    },
    z.array(z.string().length(2)).min(1, "At least one country is required")
  ),
});

export type AdminBrokerUploadRow = z.infer<typeof adminBrokerRowSchema>;

// --- Admin client row schema ---

export const adminClientRowSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required"),
  companyName: z.string().min(1, "Company name is required"),
  country: z.string().length(2, "Country must be a 2-character ISO code"),
  industry: z.string().min(1, "Industry (NACE code) is required"),
  employeeCount: z.preprocess(parseNumber, z.number().int().positive("Employee count must be positive")),
  brokerEmail: z.preprocess((v) => v === undefined || v === null || v === "" ? "" : String(v), z.string()).default(""),
});

export type AdminClientUploadRow = z.infer<typeof adminClientRowSchema>;

// --- Admin benefit row schema (client benefits + company identifier) ---

export const adminBenefitRowSchema = clientBenefitRowSchema.extend({
  companyName: z.string().min(1, "Company name is required"),
});

export type AdminBenefitUploadRow = z.infer<typeof adminBenefitRowSchema>;
