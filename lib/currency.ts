import { prisma } from "@/lib/db";

export interface CurrencyRateMap {
  [key: string]: number; // "EUR_GBP" -> 0.86
}

export async function loadCurrencyRates(): Promise<CurrencyRateMap> {
  const rates = await prisma.currencyRate.findMany();
  const map: CurrencyRateMap = {};
  for (const r of rates) {
    map[`${r.fromCurrency}_${r.toCurrency}`] = r.rate;
  }
  return map;
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: CurrencyRateMap
): number {
  if (fromCurrency === toCurrency) return amount;

  const directKey = `${fromCurrency}_${toCurrency}`;
  if (rates[directKey]) {
    return amount * rates[directKey];
  }

  // Try inverse
  const inverseKey = `${toCurrency}_${fromCurrency}`;
  if (rates[inverseKey]) {
    return amount / rates[inverseKey];
  }

  // Try via EUR as intermediate
  if (fromCurrency !== "EUR" && toCurrency !== "EUR") {
    const toEur = rates[`${fromCurrency}_EUR`] || (rates[`EUR_${fromCurrency}`] ? 1 / rates[`EUR_${fromCurrency}`] : null);
    const fromEur = rates[`EUR_${toCurrency}`] || (rates[`${toCurrency}_EUR`] ? 1 / rates[`${toCurrency}_EUR`] : null);
    if (toEur && fromEur) {
      return amount * toEur * fromEur;
    }
  }

  // Fallback: return original amount (no conversion available)
  return amount;
}
