import { parseBool, parseNumber } from "@/lib/upload-schemas";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlatformFormatRow {
  region: string;
  country: string;
  category: string;
  lineOfCover: string;
  rider: string;
  description: string;
  mandatoryClassification: string;
  renewalDate: string;
  nextRenewalDate: string;
  localCurrency: string;
  employerPremium: number | null;
  employeePremium: number | null;
  taxTreatment: string;
  headcount: number | null;
  insuredLives: number | null;
  costShare: string;
  carrier: string;
  carrierTerminationNotice: string;
  broker: string;
  commissionPercent: number | null;
  brokerFee: number | null;
  multinationalPool: string;
  notes: string;
}

export interface ParsedBenefitRow {
  // Source data
  sourceRow: PlatformFormatRow;
  rowIndex: number;

  // Mapped data
  country: string;
  benefitCategory: string;
  benefitName: string;
  coverLevel: string;

  // Extracted from description
  extractedFields: {
    sumInsured: number | null;
    sumInsuredCurrency: string | null;
    deductibleAmount: number | null;
    deductibleCurrency: string | null;
    coPayPercent: number | null;
    coverMultiple: number | null;
    coverMultipleBase: string | null;
    reimbursementPercent: number | null;
    waitingPeriodDays: number | null;
    roomCategory: string | null;
    hospitalLevel: string | null;
    maternityNormalDelivery: number | null;
    maternityCSection: number | null;
    dentalAnnualMax: number | null;
    visionAnnualMax: number | null;
    benefitDurationDays: number | null;
    eliminationPeriodDays: number | null;
  };

  // Mapped fields
  mandatoryClassification: string | null;
  employerFunded: boolean;
  coversSpouse: boolean;
  coversDependents: boolean;
  dependentCoverageType: string | null;
  annualCostPerEmployee: number | null;
  costPerInsuredLife: number | null;
  costCurrency: string;
  employeeContributionPercent: number | null;
  taxTreatment: string | null;
  insuredLives: number | null;
  carrier: string | null;
  carrierTerminationNoticeDays: number | null;
  brokerName: string | null;
  brokerCommissionPercent: number | null;
  brokerFee: number | null;
  brokerFeeCurrency: string | null;
  inMultinationalPool: boolean;
  poolProviderName: string | null;
  isRider: boolean;
  riderDescription: string | null;
  renewalDate: string | null;
  policyContractLength: number | null;
  notes: string | null;

  // Confidence
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

export interface ColumnMapping {
  [canonicalName: string]: string;
}

// ---------------------------------------------------------------------------
// Country normalisation (~30 common countries)
// ---------------------------------------------------------------------------

const COUNTRY_NAME_MAP: Record<string, string> = {
  "united arab emirates": "AE",
  uae: "AE",
  "united kingdom": "GB",
  uk: "GB",
  "united states": "US",
  "united states of america": "US",
  usa: "US",
  germany: "DE",
  france: "FR",
  spain: "ES",
  italy: "IT",
  netherlands: "NL",
  holland: "NL",
  belgium: "BE",
  switzerland: "CH",
  austria: "AT",
  ireland: "IE",
  portugal: "PT",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  finland: "FI",
  poland: "PL",
  "czech republic": "CZ",
  czechia: "CZ",
  hungary: "HU",
  romania: "RO",
  greece: "GR",
  turkey: "TR",
  "saudi arabia": "SA",
  ksa: "SA",
  qatar: "QA",
  bahrain: "BH",
  kuwait: "KW",
  oman: "OM",
  india: "IN",
  china: "CN",
  japan: "JP",
  "south korea": "KR",
  korea: "KR",
  singapore: "SG",
  "hong kong": "HK",
  malaysia: "MY",
  thailand: "TH",
  indonesia: "ID",
  philippines: "PH",
  australia: "AU",
  "new zealand": "NZ",
  canada: "CA",
  mexico: "MX",
  brazil: "BR",
  argentina: "AR",
  chile: "CL",
  colombia: "CO",
  "south africa": "ZA",
  nigeria: "NG",
  kenya: "KE",
  egypt: "EG",
  israel: "IL",
  luxembourg: "LU",
  malta: "MT",
  cyprus: "CY",
  croatia: "HR",
  bulgaria: "BG",
  "costa rica": "CR",
  peru: "PE",
  vietnam: "VN",
  taiwan: "TW",
  pakistan: "PK",
  bangladesh: "BD",
  "sri lanka": "LK",
};

export function normalizeCountryCode(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();

  // Already a 2-letter code
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  const lower = trimmed.toLowerCase();
  return COUNTRY_NAME_MAP[lower] ?? trimmed.toUpperCase().slice(0, 2);
}

// ---------------------------------------------------------------------------
// Column header detection
// ---------------------------------------------------------------------------

interface HeaderCandidate {
  canonical: string;
  patterns: RegExp[];
}

const HEADER_CANDIDATES: HeaderCandidate[] = [
  { canonical: "region", patterns: [/^region$/i] },
  { canonical: "country", patterns: [/^country$/i, /^country\s*code$/i, /^location$/i] },
  { canonical: "category", patterns: [/^category$/i, /^benefit\s*category$/i, /^line\s*of\s*business$/i] },
  { canonical: "lineOfCover", patterns: [/^line\s*of\s*cover$/i, /^sub[- ]?category$/i, /^benefit\s*type$/i, /^cover\s*type$/i] },
  { canonical: "rider", patterns: [/^rider$/i] },
  { canonical: "description", patterns: [/^description$/i, /^plan\s*description$/i, /^benefit\s*description$/i, /^plan\s*design$/i] },
  { canonical: "mandatoryClassification", patterns: [/^mandatory$/i, /^mandatory\s*\/?\s*supplemental$/i, /^classification$/i, /^mandatory\s*classification$/i] },
  { canonical: "renewalDate", patterns: [/^renewal$/i, /^renewal\s*date$/i] },
  { canonical: "nextRenewalDate", patterns: [/^next\s*renewal$/i, /^next\s*renewal\s*date$/i] },
  { canonical: "localCurrency", patterns: [/^currency$/i, /^local\s*currency$/i, /^ccy$/i] },
  { canonical: "employerPremium", patterns: [/^employer\s*premium$/i, /^er\s*premium$/i, /^employer\s*cost$/i, /^er\s*cost$/i] },
  { canonical: "employeePremium", patterns: [/^employee\s*premium$/i, /^ee\s*premium$/i, /^employee\s*cost$/i, /^ee\s*cost$/i] },
  { canonical: "taxTreatment", patterns: [/^tax$/i, /^tax\s*treatment$/i, /^tax\s*status$/i] },
  { canonical: "headcount", patterns: [/^headcount$/i, /^head\s*count$/i, /^#\s*employees$/i, /^employee\s*count$/i, /^number\s*of\s*employees$/i] },
  { canonical: "insuredLives", patterns: [/^insured\s*lives$/i, /^lives$/i, /^number\s*of\s*lives$/i] },
  { canonical: "costShare", patterns: [/^cost\s*shar(e|ing)$/i, /^funding$/i, /^cost\s*allocation$/i] },
  { canonical: "carrier", patterns: [/^carrier$/i, /^insurer$/i, /^provider$/i, /^insurance\s*company$/i] },
  { canonical: "carrierTerminationNotice", patterns: [/^carrier\s*termination$/i, /^termination\s*notice$/i, /^notice\s*period$/i] },
  { canonical: "broker", patterns: [/^broker$/i, /^adviser$/i, /^advisor$/i, /^intermediary$/i] },
  { canonical: "commissionPercent", patterns: [/^commission$/i, /^commission\s*%$/i, /^commission\s*percent$/i] },
  { canonical: "brokerFee", patterns: [/^broker\s*fee$/i, /^fee$/i, /^advisory\s*fee$/i] },
  { canonical: "multinationalPool", patterns: [/^pool$/i, /^multinational\s*pool$/i, /^mnp$/i, /^pooling$/i] },
  { canonical: "notes", patterns: [/^notes$/i, /^comments$/i, /^remarks$/i] },
];

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalised = headers.map((h) => h.trim());

  for (const candidate of HEADER_CANDIDATES) {
    for (let i = 0; i < normalised.length; i++) {
      const header = normalised[i];
      if (!header) continue;
      for (const pattern of candidate.patterns) {
        if (pattern.test(header)) {
          mapping[candidate.canonical] = headers[i];
          break;
        }
      }
      if (mapping[candidate.canonical]) break;
    }
  }

  return mapping;
}

// ---------------------------------------------------------------------------
// Category mapping
// ---------------------------------------------------------------------------

export function mapCategoryToEnum(
  category: string,
  lineOfCover: string
): string {
  const cat = (category || "").trim().toLowerCase();
  const loc = (lineOfCover || "").trim().toLowerCase();

  // Direct category matches
  if (cat === "medical" || cat === "health") return "HEALTH";
  if (cat === "dental") return "DENTAL";
  if (cat === "vision" || cat === "optical") return "VISION";
  if (cat === "pension" || cat === "retirement") return "PENSION";
  if (cat === "travel") return "TRAVEL";
  if (cat === "leave" || cat === "annual leave") return "ANNUAL_LEAVE";
  if (cat === "eap" || cat === "employee assistance") return "EAP";
  if (cat === "wellness" || cat === "wellbeing") return "WELLNESS";

  // Risk category — use line of cover to differentiate
  if (cat === "risk" || cat === "insured benefits" || cat === "group risk") {
    if (/\blife\b|\bdeath\b|\bdeath[\s-]in[\s-]service\b/i.test(loc))
      return "LIFE";
    if (/\bltd\b|\blong[\s-]?term\s*dis/i.test(loc))
      return "INCOME_PROTECTION";
    if (/\bstd\b|\bshort[\s-]?term\s*dis/i.test(loc))
      return "INCOME_PROTECTION";
    if (/\bsickness\b|\bsick\s*pay\b/i.test(loc)) return "INCOME_PROTECTION";
    if (/\bdisability\b|\bincome\s*protect/i.test(loc))
      return "INCOME_PROTECTION";
    if (/\bcritical\s*illness\b|\b(?:^|\s)ci(?:\s|$)\b/i.test(loc))
      return "CRITICAL_ILLNESS";
    if (/\baccident\b|\bad&?d\b|\bpersonal\s*accident\b/i.test(loc))
      return "CRITICAL_ILLNESS";
    // Default risk → LIFE
    return "LIFE";
  }

  // Line-of-cover level fallbacks when category is missing or generic
  if (/\bmedical\b|\bhealth\b/i.test(loc)) return "HEALTH";
  if (/\bdental\b/i.test(loc)) return "DENTAL";
  if (/\bvision\b|\boptical\b/i.test(loc)) return "VISION";
  if (/\blife\b|\bdeath\b/i.test(loc)) return "LIFE";
  if (/\bltd\b|\blong[\s-]?term\b|\bincome\s*protect/i.test(loc))
    return "INCOME_PROTECTION";
  if (/\bstd\b|\bshort[\s-]?term\b|\bsickness\b/i.test(loc))
    return "INCOME_PROTECTION";
  if (/\bcritical\s*illness\b|\baccident\b|\bad&?d\b/i.test(loc))
    return "CRITICAL_ILLNESS";
  if (/\bpension\b|\bretirement\b/i.test(loc)) return "PENSION";
  if (/\btravel\b/i.test(loc)) return "TRAVEL";

  return "OTHER";
}

// ---------------------------------------------------------------------------
// Description parser
// ---------------------------------------------------------------------------

function parseAmountText(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, "");
  const match = cleaned.match(/([\d.]+)\s*([kKmM])?/);
  if (!match) return null;
  let value = parseFloat(match[1]);
  if (isNaN(value)) return null;
  const suffix = (match[2] || "").toUpperCase();
  if (suffix === "K") value *= 1_000;
  if (suffix === "M") value *= 1_000_000;
  return value;
}

function extractCurrency(text: string): string | null {
  const match = text.match(
    /\b(AED|USD|EUR|GBP|CHF|SAR|QAR|BHD|KWD|OMR|INR|CNY|JPY|KRW|SGD|HKD|MYR|THB|IDR|PHP|AUD|NZD|CAD|MXN|BRL|ARS|CLP|COP|ZAR|NGN|KES|EGP|ILS|SEK|NOK|DKK|PLN|CZK|HUF|RON|TRY|TWD|PKR|BDT|LKR|VND)\b/i
  );
  return match ? match[1].toUpperCase() : null;
}

export function parseDescription(
  text: string
): ParsedBenefitRow["extractedFields"] {
  const result: ParsedBenefitRow["extractedFields"] = {
    sumInsured: null,
    sumInsuredCurrency: null,
    deductibleAmount: null,
    deductibleCurrency: null,
    coPayPercent: null,
    coverMultiple: null,
    coverMultipleBase: null,
    reimbursementPercent: null,
    waitingPeriodDays: null,
    roomCategory: null,
    hospitalLevel: null,
    maternityNormalDelivery: null,
    maternityCSection: null,
    dentalAnnualMax: null,
    visionAnnualMax: null,
    benefitDurationDays: null,
    eliminationPeriodDays: null,
  };

  if (!text) return result;

  // Cover multiple: "2x salary", "4x basic salary", "3 times annual salary"
  const multipleMatch = text.match(
    /(\d+(?:\.\d+)?)\s*(?:x|times)\s*(annual\s*(?:salary|ctc|compensation)|basic\s*salary|salary)/i
  );
  if (multipleMatch) {
    result.coverMultiple = parseFloat(multipleMatch[1]);
    const base = multipleMatch[2].toLowerCase();
    if (/annual/i.test(base)) {
      result.coverMultipleBase = "ANNUAL_CTC";
    } else if (/basic/i.test(base)) {
      result.coverMultipleBase = "BASIC_SALARY";
    } else {
      result.coverMultipleBase = "ANNUAL_CTC";
    }
  }

  // Sum insured: "Sum insured: 500,000 AED" or "SI: 500K" or "Sum Insured AED 500,000"
  // Only match if we didn't get a cover multiple (sum insured as fixed amount)
  if (result.coverMultiple === null) {
    const siMatch = text.match(
      /(?:sum\s*insured|SI)\s*[:=]?\s*(?:([A-Z]{3})\s*)?([\d,]+(?:\.\d+)?[kKmM]?)/i
    );
    const siMatch2 = text.match(
      /(?:sum\s*insured|SI)\s*[:=]?\s*([\d,]+(?:\.\d+)?[kKmM]?)\s*([A-Z]{3})?/i
    );
    const m = siMatch || siMatch2;
    if (m) {
      // Try both positions for currency
      const amtStr = m[2] || m[1] || "";
      result.sumInsured = parseAmountText(amtStr);
      result.sumInsuredCurrency =
        extractCurrency(m[0]) || extractCurrency(text);
    }
  }

  // Deductible / excess: "Deductible: 500 AED" or "Excess: 100" or "Annual deductible of 1,000"
  const deductMatch = text.match(
    /(?:deductible|excess)\s*(?:of\s*)?[:=]?\s*(?:([A-Z]{3})\s*)?([\d,]+(?:\.\d+)?[kKmM]?)/i
  );
  if (deductMatch) {
    result.deductibleAmount = parseAmountText(deductMatch[2] || deductMatch[1]);
    result.deductibleCurrency = extractCurrency(deductMatch[0]);
  }

  // Co-pay: "Co-pay: 20%" or "Coinsurance: 80/20" or "20% co-payment"
  const copayMatch = text.match(
    /(?:co-?\s*pay(?:ment)?|coinsurance)\s*[:=]?\s*(\d+)\s*%/i
  );
  if (copayMatch) {
    result.coPayPercent = parseInt(copayMatch[1], 10);
  } else {
    // "Coinsurance: 80/20" pattern
    const coinsMatch = text.match(/coinsurance\s*[:=]?\s*(\d+)\s*\/\s*(\d+)/i);
    if (coinsMatch) {
      result.coPayPercent = parseInt(coinsMatch[2], 10);
    } else {
      // "20% co-pay" pattern
      const reverseMatch = text.match(/(\d+)\s*%\s*co-?\s*pay/i);
      if (reverseMatch) {
        result.coPayPercent = parseInt(reverseMatch[1], 10);
      }
    }
  }

  // Reimbursement: "80% reimbursement" or "Reimbursement: 100%" or "reimburse 90%"
  const reimbMatch = text.match(
    /(?:reimburse(?:ment)?)\s*[:=]?\s*(\d+)\s*%/i
  );
  if (reimbMatch) {
    result.reimbursementPercent = parseInt(reimbMatch[1], 10);
  } else {
    const reimbMatch2 = text.match(/(\d+)\s*%\s*reimburse/i);
    if (reimbMatch2) {
      result.reimbursementPercent = parseInt(reimbMatch2[1], 10);
    }
  }

  // Waiting period: "90 day waiting period" or "Waiting period: 180 days" or "deferred period 26 weeks"
  const waitMatch = text.match(
    /(?:waiting\s*period|deferred\s*period)\s*[:=]?\s*(\d+)\s*(days?|weeks?|months?)/i
  );
  if (waitMatch) {
    let days = parseInt(waitMatch[1], 10);
    const unit = waitMatch[2].toLowerCase();
    if (unit.startsWith("week")) days *= 7;
    if (unit.startsWith("month")) days *= 30;
    result.waitingPeriodDays = days;
  } else {
    const waitMatch2 = text.match(
      /(\d+)\s*(days?|weeks?)\s*waiting\s*period/i
    );
    if (waitMatch2) {
      let days = parseInt(waitMatch2[1], 10);
      if (waitMatch2[2].toLowerCase().startsWith("week")) days *= 7;
      result.waitingPeriodDays = days;
    }
  }

  // Room category: "private room", "semi-private", "standard ward"
  if (/semi[\s-]*private/i.test(text)) {
    result.roomCategory = "SEMI_PRIVATE";
  } else if (/private\s*room/i.test(text)) {
    result.roomCategory = "PRIVATE";
  } else if (/standard\s*(?:room|ward)/i.test(text)) {
    result.roomCategory = "STANDARD";
  }

  // Hospital level
  if (/\bvip\b/i.test(text)) {
    result.hospitalLevel = "VIP";
  } else if (/\bprivate\s*hospital/i.test(text)) {
    result.hospitalLevel = "PRIVATE";
  } else if (/\bpublic\s*hospital/i.test(text)) {
    result.hospitalLevel = "PUBLIC";
  }

  // Maternity: "normal delivery: 10,000" or "cesarean: 15,000" or "c-section: 15,000"
  const maternityNormal = text.match(
    /(?:normal\s*delivery|natural\s*delivery|vaginal)\s*[:=]?\s*([\d,]+(?:\.\d+)?[kKmM]?)/i
  );
  if (maternityNormal) {
    result.maternityNormalDelivery = parseAmountText(maternityNormal[1]);
  }

  const maternityCSection = text.match(
    /(?:c[\s-]*section|cesarean|caesarean)\s*[:=]?\s*([\d,]+(?:\.\d+)?[kKmM]?)/i
  );
  if (maternityCSection) {
    result.maternityCSection = parseAmountText(maternityCSection[1]);
  }

  // Dental annual max
  const dentalMax = text.match(
    /(?:dental\s*(?:annual\s*)?(?:max|limit|maximum))\s*[:=]?\s*([\d,]+(?:\.\d+)?[kKmM]?)/i
  );
  if (dentalMax) {
    result.dentalAnnualMax = parseAmountText(dentalMax[1]);
  }

  // Vision annual max
  const visionMax = text.match(
    /(?:vision|optical)\s*(?:annual\s*)?(?:max|limit|maximum)\s*[:=]?\s*([\d,]+(?:\.\d+)?[kKmM]?)/i
  );
  if (visionMax) {
    result.visionAnnualMax = parseAmountText(visionMax[1]);
  }

  // Elimination period: "elimination period: 90 days" or "qualifying period 30 days"
  const elimMatch = text.match(
    /(?:elimination\s*period|qualifying\s*period)\s*[:=]?\s*(\d+)\s*(days?|weeks?|months?)/i
  );
  if (elimMatch) {
    let days = parseInt(elimMatch[1], 10);
    const unit = elimMatch[2].toLowerCase();
    if (unit.startsWith("week")) days *= 7;
    if (unit.startsWith("month")) days *= 30;
    result.eliminationPeriodDays = days;
  }

  // Benefit duration: "benefit period: 2 years" or "max duration 730 days" or "to age 65"
  const durationMatch = text.match(
    /(?:benefit\s*(?:period|duration)|max\s*duration)\s*[:=]?\s*(\d+)\s*(days?|weeks?|months?|years?)/i
  );
  if (durationMatch) {
    let days = parseInt(durationMatch[1], 10);
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith("week")) days *= 7;
    if (unit.startsWith("month")) days *= 30;
    if (unit.startsWith("year")) days *= 365;
    result.benefitDurationDays = days;
  } else if (/to\s*age\s*(\d+)/i.test(text)) {
    // "to age 65" — we store as a special sentinel (negative of the age)
    // or just leave null since we can't convert without knowing current age
    result.benefitDurationDays = null;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Cost share parser
// ---------------------------------------------------------------------------

interface CostShareResult {
  employerFunded: boolean;
  coversSpouse: boolean;
  coversDependents: boolean;
  dependentCoverageType: string | null;
  employeeContributionPercent: number | null;
}

export function parseCostShare(costShare: string): CostShareResult {
  const result: CostShareResult = {
    employerFunded: true,
    coversSpouse: false,
    coversDependents: false,
    dependentCoverageType: null,
    employeeContributionPercent: null,
  };

  if (!costShare) return result;

  const text = costShare.trim().toLowerCase();

  // "100% EE" or "100% Employee" → employer does NOT fund
  if (/100\s*%\s*(?:ee|employee)/i.test(text)) {
    result.employerFunded = false;
    result.employeeContributionPercent = 100;
    return result;
  }

  // "100% ER" or "100% Employer" → employer funds
  if (/100\s*%\s*(?:er|employer)/i.test(text)) {
    result.employerFunded = true;
    result.employeeContributionPercent = 0;
  }

  // "50/50" or "Cost shared 50%"
  const splitMatch = text.match(/(\d+)\s*\/\s*(\d+)/);
  if (splitMatch) {
    const eePercent = parseInt(splitMatch[2], 10);
    result.employerFunded = true;
    result.employeeContributionPercent = eePercent;
  } else {
    const sharedMatch = text.match(
      /(?:cost\s*shared?|shared)\s*(\d+)\s*%/i
    );
    if (sharedMatch) {
      result.employeeContributionPercent = parseInt(sharedMatch[1], 10);
      result.employerFunded = true;
    }
  }

  // Employee contribution from patterns like "50% for dependents"
  const depContribMatch = text.match(/(\d+)\s*%\s*(?:for|of)\s*(?:dep|depend|family)/i);
  if (depContribMatch) {
    // There is partial employer funding for dependents
    result.coversDependents = true;
    result.dependentCoverageType = "FAMILY";
  }

  // Check for spouse coverage
  if (/\bspouse\b/i.test(text)) {
    result.coversSpouse = true;
  }

  // Check for dependent / family coverage
  if (/\bfamily\b|\bdep(?:endent)?s?\b/i.test(text)) {
    result.coversDependents = true;
    result.dependentCoverageType = "FAMILY";
  }

  return result;
}

// ---------------------------------------------------------------------------
// Carrier termination notice parser
// ---------------------------------------------------------------------------

function parseTerminationNoticeDays(text: string): number | null {
  if (!text) return null;
  const match = text.match(/(\d+)\s*(days?|weeks?|months?)/i);
  if (!match) return null;
  let days = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (unit.startsWith("week")) days *= 7;
  if (unit.startsWith("month")) days *= 30;
  return days;
}

// ---------------------------------------------------------------------------
// Mandatory classification normaliser
// ---------------------------------------------------------------------------

function normalizeMandatoryClassification(value: string): string | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (lower === "mandatory" || lower === "statutory") return "MANDATORY";
  if (lower === "supplemental" || lower === "voluntary") return "SUPPLEMENTAL";
  if (lower === "hybrid" || lower === "mixed") return "HYBRID";
  return value.trim().toUpperCase() || null;
}

// ---------------------------------------------------------------------------
// Row parser
// ---------------------------------------------------------------------------

function getField(
  row: Record<string, string>,
  mapping: ColumnMapping,
  canonical: string
): string {
  const colHeader = mapping[canonical];
  if (!colHeader) return "";
  const val = row[colHeader];
  return val !== undefined && val !== null ? String(val).trim() : "";
}

function buildSourceRow(
  row: Record<string, string>,
  mapping: ColumnMapping
): PlatformFormatRow {
  return {
    region: getField(row, mapping, "region"),
    country: getField(row, mapping, "country"),
    category: getField(row, mapping, "category"),
    lineOfCover: getField(row, mapping, "lineOfCover"),
    rider: getField(row, mapping, "rider"),
    description: getField(row, mapping, "description"),
    mandatoryClassification: getField(row, mapping, "mandatoryClassification"),
    renewalDate: getField(row, mapping, "renewalDate"),
    nextRenewalDate: getField(row, mapping, "nextRenewalDate"),
    localCurrency: getField(row, mapping, "localCurrency"),
    employerPremium: parseNumber(getField(row, mapping, "employerPremium")),
    employeePremium: parseNumber(getField(row, mapping, "employeePremium")),
    taxTreatment: getField(row, mapping, "taxTreatment"),
    headcount: parseNumber(getField(row, mapping, "headcount")),
    insuredLives: parseNumber(getField(row, mapping, "insuredLives")),
    costShare: getField(row, mapping, "costShare"),
    carrier: getField(row, mapping, "carrier"),
    carrierTerminationNotice: getField(row, mapping, "carrierTerminationNotice"),
    broker: getField(row, mapping, "broker"),
    commissionPercent: parseNumber(getField(row, mapping, "commissionPercent")),
    brokerFee: parseNumber(getField(row, mapping, "brokerFee")),
    multinationalPool: getField(row, mapping, "multinationalPool"),
    notes: getField(row, mapping, "notes"),
  };
}

export function parseRow(
  row: Record<string, string>,
  mapping: ColumnMapping,
  rowIndex: number
): ParsedBenefitRow {
  const warnings: string[] = [];

  // 1. Build source row
  let sourceRow: PlatformFormatRow;
  try {
    sourceRow = buildSourceRow(row, mapping);
  } catch (e) {
    // Never throw — return a minimal row with low confidence
    sourceRow = {
      region: "",
      country: "",
      category: "",
      lineOfCover: "",
      rider: "",
      description: "",
      mandatoryClassification: "",
      renewalDate: "",
      nextRenewalDate: "",
      localCurrency: "",
      employerPremium: null,
      employeePremium: null,
      taxTreatment: "",
      headcount: null,
      insuredLives: null,
      costShare: "",
      carrier: "",
      carrierTerminationNotice: "",
      broker: "",
      commissionPercent: null,
      brokerFee: null,
      multinationalPool: "",
      notes: "",
    };
    warnings.push(`Row ${rowIndex}: Failed to parse source row: ${String(e)}`);
  }

  // 2. Country
  const country = normalizeCountryCode(sourceRow.country);
  if (!country) {
    warnings.push(`Row ${rowIndex}: Missing or unrecognised country`);
  }

  // 3. Category mapping
  const benefitCategory = mapCategoryToEnum(
    sourceRow.category,
    sourceRow.lineOfCover
  );
  const categoryMapped = benefitCategory !== "OTHER";
  if (!categoryMapped && sourceRow.category) {
    warnings.push(
      `Row ${rowIndex}: Could not map category "${sourceRow.category}" / line of cover "${sourceRow.lineOfCover}" — defaulted to OTHER`
    );
  }

  // 4. Benefit name = line of cover or category
  const benefitName = sourceRow.lineOfCover || sourceRow.category || "Unknown";

  // 5. Parse description
  let extractedFields: ParsedBenefitRow["extractedFields"];
  try {
    extractedFields = parseDescription(sourceRow.description);
  } catch (e) {
    extractedFields = {
      sumInsured: null,
      sumInsuredCurrency: null,
      deductibleAmount: null,
      deductibleCurrency: null,
      coPayPercent: null,
      coverMultiple: null,
      coverMultipleBase: null,
      reimbursementPercent: null,
      waitingPeriodDays: null,
      roomCategory: null,
      hospitalLevel: null,
      maternityNormalDelivery: null,
      maternityCSection: null,
      dentalAnnualMax: null,
      visionAnnualMax: null,
      benefitDurationDays: null,
      eliminationPeriodDays: null,
    };
    warnings.push(
      `Row ${rowIndex}: Failed to parse description: ${String(e)}`
    );
  }

  // Count how many extracted fields are non-null
  const extractedCount = Object.values(extractedFields).filter(
    (v) => v !== null
  ).length;

  // 6. Cost share
  let costShareResult: CostShareResult;
  try {
    costShareResult = parseCostShare(sourceRow.costShare);
  } catch (e) {
    costShareResult = {
      employerFunded: true,
      coversSpouse: false,
      coversDependents: false,
      dependentCoverageType: null,
      employeeContributionPercent: null,
    };
    warnings.push(
      `Row ${rowIndex}: Failed to parse cost share: ${String(e)}`
    );
  }

  // 7. Calculate costs
  let annualCostPerEmployee: number | null = null;
  if (
    sourceRow.employerPremium !== null &&
    sourceRow.headcount !== null &&
    sourceRow.headcount > 0
  ) {
    annualCostPerEmployee = sourceRow.employerPremium / sourceRow.headcount;
  }

  let costPerInsuredLife: number | null = null;
  const totalPremium =
    (sourceRow.employerPremium ?? 0) + (sourceRow.employeePremium ?? 0);
  if (
    totalPremium > 0 &&
    sourceRow.insuredLives !== null &&
    sourceRow.insuredLives > 0
  ) {
    costPerInsuredLife = totalPremium / sourceRow.insuredLives;
  }

  // 8. Rider detection
  const riderText = sourceRow.rider.trim().toLowerCase();
  const isRider = riderText === "yes" || riderText === "y" || riderText === "true";
  const riderDescription =
    isRider && riderText !== "yes" && riderText !== "y" && riderText !== "true"
      ? sourceRow.rider
      : !isRider && sourceRow.rider && riderText !== "no" && riderText !== "n" && riderText !== "false" && riderText !== ""
        ? sourceRow.rider
        : null;

  // 9. Multinational pool
  const poolText = sourceRow.multinationalPool.trim().toLowerCase();
  const inMultinationalPool = parseBool(poolText);

  // 10. Carrier termination notice
  const carrierTerminationNoticeDays = parseTerminationNoticeDays(
    sourceRow.carrierTerminationNotice
  );

  // 11. Renewal date / contract length
  const renewalDate: string | null = sourceRow.renewalDate || null;
  let policyContractLength: number | null = null;
  if (sourceRow.renewalDate && sourceRow.nextRenewalDate) {
    try {
      const d1 = new Date(sourceRow.renewalDate);
      const d2 = new Date(sourceRow.nextRenewalDate);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diffMonths =
          (d2.getFullYear() - d1.getFullYear()) * 12 +
          (d2.getMonth() - d1.getMonth());
        if (diffMonths > 0) {
          policyContractLength = diffMonths;
        }
      }
    } catch {
      warnings.push(
        `Row ${rowIndex}: Could not parse renewal dates for contract length calculation`
      );
    }
  }

  // 12. Determine confidence
  let confidence: "high" | "medium" | "low";
  if (categoryMapped && extractedCount >= 3) {
    confidence = "high";
  } else if (categoryMapped) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  // 13. Currency
  const costCurrency = sourceRow.localCurrency || "EUR";

  // 14. Cover level — derive from mandatory classification or default
  const coverLevel = sourceRow.mandatoryClassification
    ? sourceRow.mandatoryClassification
    : "Standard";

  return {
    sourceRow,
    rowIndex,
    country,
    benefitCategory,
    benefitName,
    coverLevel,
    extractedFields,
    mandatoryClassification: normalizeMandatoryClassification(
      sourceRow.mandatoryClassification
    ),
    employerFunded: costShareResult.employerFunded,
    coversSpouse: costShareResult.coversSpouse,
    coversDependents: costShareResult.coversDependents,
    dependentCoverageType: costShareResult.dependentCoverageType,
    annualCostPerEmployee,
    costPerInsuredLife,
    costCurrency,
    employeeContributionPercent: costShareResult.employeeContributionPercent,
    taxTreatment: sourceRow.taxTreatment || null,
    insuredLives: sourceRow.insuredLives,
    carrier: sourceRow.carrier || null,
    carrierTerminationNoticeDays,
    brokerName: sourceRow.broker || null,
    brokerCommissionPercent: sourceRow.commissionPercent,
    brokerFee: sourceRow.brokerFee,
    brokerFeeCurrency: sourceRow.brokerFee !== null ? costCurrency : null,
    inMultinationalPool,
    poolProviderName: inMultinationalPool ? sourceRow.carrier || null : null,
    isRider,
    riderDescription,
    renewalDate,
    policyContractLength,
    notes: sourceRow.notes || null,
    confidence,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Batch parser
// ---------------------------------------------------------------------------

export function parseAllRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): ParsedBenefitRow[] {
  const results: ParsedBenefitRow[] = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      results.push(parseRow(rows[i], mapping, i + 1));
    } catch (e) {
      // Never throw — produce a minimal low-confidence row
      results.push({
        sourceRow: {
          region: "",
          country: "",
          category: "",
          lineOfCover: "",
          rider: "",
          description: "",
          mandatoryClassification: "",
          renewalDate: "",
          nextRenewalDate: "",
          localCurrency: "",
          employerPremium: null,
          employeePremium: null,
          taxTreatment: "",
          headcount: null,
          insuredLives: null,
          costShare: "",
          carrier: "",
          carrierTerminationNotice: "",
          broker: "",
          commissionPercent: null,
          brokerFee: null,
          multinationalPool: "",
          notes: "",
        },
        rowIndex: i + 1,
        country: "",
        benefitCategory: "OTHER",
        benefitName: "Unknown",
        coverLevel: "Standard",
        extractedFields: {
          sumInsured: null,
          sumInsuredCurrency: null,
          deductibleAmount: null,
          deductibleCurrency: null,
          coPayPercent: null,
          coverMultiple: null,
          coverMultipleBase: null,
          reimbursementPercent: null,
          waitingPeriodDays: null,
          roomCategory: null,
          hospitalLevel: null,
          maternityNormalDelivery: null,
          maternityCSection: null,
          dentalAnnualMax: null,
          visionAnnualMax: null,
          benefitDurationDays: null,
          eliminationPeriodDays: null,
        },
        mandatoryClassification: null,
        employerFunded: true,
        coversSpouse: false,
        coversDependents: false,
        dependentCoverageType: null,
        annualCostPerEmployee: null,
        costPerInsuredLife: null,
        costCurrency: "EUR",
        employeeContributionPercent: null,
        taxTreatment: null,
        insuredLives: null,
        carrier: null,
        carrierTerminationNoticeDays: null,
        brokerName: null,
        brokerCommissionPercent: null,
        brokerFee: null,
        brokerFeeCurrency: null,
        inMultinationalPool: false,
        poolProviderName: null,
        isRider: false,
        riderDescription: null,
        renewalDate: null,
        policyContractLength: null,
        notes: null,
        confidence: "low",
        warnings: [`Row ${i + 1}: Unexpected error during parsing: ${String(e)}`],
      });
    }
  }
  return results;
}
