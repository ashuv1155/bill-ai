export interface UserRegion {
  countryCode: "US" | "IN" | "GB" | "EU" | "OTHER";
  defaultCurrency: "USD" | "INR" | "GBP" | "EUR";
  defaultTaxType: "Sales Tax" | "GST" | "VAT" | "Other";
}

export async function detectUserRegion(): Promise<UserRegion> {
  // Safe timezone-based fallback
  const getTimezoneFallback = (): UserRegion => {
    if (typeof window === "undefined") {
      return { countryCode: "US", defaultCurrency: "USD", defaultTaxType: "Sales Tax" };
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    
    if (tz.includes("Kolkata") || tz.includes("Calcutta") || tz.includes("Asia/Kolkata")) {
      return { countryCode: "IN", defaultCurrency: "INR", defaultTaxType: "GST" };
    }
    if (tz.includes("London") || tz.includes("Europe/London") || tz.includes("GB")) {
      return { countryCode: "GB", defaultCurrency: "GBP", defaultTaxType: "VAT" };
    }
    if (tz.includes("Europe/")) {
      return { countryCode: "EU", defaultCurrency: "EUR", defaultTaxType: "VAT" };
    }
    return { countryCode: "US", defaultCurrency: "USD", defaultTaxType: "Sales Tax" };
  };

  try {
    // Attempt Geo-IP fetch
    const response = await fetch("https://ipapi.co/json/", { timeout: 3000 } as any).catch(() => null);
    if (!response || !response.ok) {
      return getTimezoneFallback();
    }
    
    const data = await response.json();
    const code = (data.country_code || "").toUpperCase();

    if (code === "IN") {
      return { countryCode: "IN", defaultCurrency: "INR", defaultTaxType: "GST" };
    }
    if (code === "US") {
      return { countryCode: "US", defaultCurrency: "USD", defaultTaxType: "Sales Tax" };
    }
    if (code === "GB") {
      return { countryCode: "GB", defaultCurrency: "GBP", defaultTaxType: "VAT" };
    }
    // Check if EU country code
    const euCodes = ["FR", "DE", "IT", "ES", "NL", "BE", "AT", "IE", "DK", "FI", "SE", "PT", "GR"];
    if (euCodes.includes(code)) {
      return { countryCode: "EU", defaultCurrency: "EUR", defaultTaxType: "VAT" };
    }

    return getTimezoneFallback();
  } catch (error) {
    console.warn("Geo-IP detection failed. Using browser locale/timezone fallback:", error);
    return getTimezoneFallback();
  }
}
