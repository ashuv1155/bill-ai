// Shared currency conversion library for BillAI SaaS

export const DEFAULT_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.37,
  AUD: 1.50,
};

const CACHE_KEY = "billai_exchange_rates";
const CACHE_TIME_KEY = "billai_exchange_rates_timestamp";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function fetchExchangeRates(): Promise<Record<string, number>> {
  if (typeof window === "undefined") {
    return DEFAULT_RATES;
  }

  try {
    const cachedRates = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIME_KEY);

    if (cachedRates && cachedTimestamp) {
      const age = Date.now() - parseInt(cachedTimestamp, 10);
      if (age < ONE_DAY_MS) {
        return JSON.parse(cachedRates);
      }
    }

    const response = await fetch("https://open.er-api.com/v6/latest/USD");
    if (!response.ok) {
      throw new Error("Failed to fetch from rate API");
    }

    const data = await response.json();
    if (data && data.rates) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data.rates));
      localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
      return data.rates;
    }
  } catch (error) {
    console.warn("Could not fetch live exchange rates, using local fallback rates:", error);
  }

  return DEFAULT_RATES;
}

export function convertCurrency(
  amount: number,
  from: string = "USD",
  to: string = "USD",
  rates: Record<string, number> = DEFAULT_RATES
): number {
  if (!amount) return 0;
  if (from === to) return amount;

  const fromRate = rates[from] || DEFAULT_RATES[from] || 1.0;
  const toRate = rates[to] || DEFAULT_RATES[to] || 1.0;

  // Convert from currency to USD base first
  const amountInUsd = amount / fromRate;
  // Convert from USD base to target currency
  return amountInUsd * toRate;
}

export function getCurrencySymbol(currency?: string): string {
  switch (currency) {
    case "USD": return "$";
    case "EUR": return "€";
    case "GBP": return "£";
    case "CAD": return "C$";
    case "AUD": return "A$";
    case "INR": return "₹";
    default: return "$";
  }
}
