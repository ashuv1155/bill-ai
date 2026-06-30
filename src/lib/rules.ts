// Categorization Rules engine for BillAI SaaS

export interface CategorizationRule {
  id: string;
  pattern: string;   // e.g. "AWS", "Starbucks", "Uber"
  category: string;  // e.g. "Software", "Food", "Travel"
}

const STORAGE_KEY = "billai_categorization_rules";

export function loadRules(): CategorizationRule[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load categorization rules:", error);
  }

  // Fallback initial demo rule
  const initialRules: CategorizationRule[] = [
    { id: "demo-rule-1", pattern: "AWS", category: "Software" },
    { id: "demo-rule-2", pattern: "Starbucks", category: "Food" },
  ];
  saveRules(initialRules);
  return initialRules;
}

export function saveRules(rules: CategorizationRule[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (error) {
    console.error("Failed to save categorization rules:", error);
  }
}

export function applyRules(
  vendorName: string,
  currentCategory: string,
  rules: CategorizationRule[] = []
): string {
  if (!vendorName) return currentCategory;

  const vendorLower = vendorName.toLowerCase();
  
  // Find first rule that matches vendor pattern
  const matchedRule = rules.find((rule) =>
    vendorLower.includes(rule.pattern.toLowerCase())
  );

  return matchedRule ? matchedRule.category : currentCategory;
}
