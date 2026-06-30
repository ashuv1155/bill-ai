import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export const isGeminiConfigured = !!apiKey;

const genAI = isGeminiConfigured ? new GoogleGenerativeAI(apiKey!) : null;

export interface AuditAlert {
  type: 'junk_fee' | 'tax_discrepancy' | 'suspicious_item';
  lineItem: string;
  amount: number;
  explanation: string;
  disputeScript: string;
}

export interface ExtractedBillData {
  vendorName: string;
  billNumber: string;
  date: string; // YYYY-MM-DD format if possible
  gstin: string;
  subtotal: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  category: "Fuel" | "Food" | "Travel" | "Office Expense" | "Marketing" | "Internet" | "Software" | "Miscellaneous";
  lineItems: { description: string; amount: number; qty?: number }[];
  auditAlerts?: AuditAlert[];
}

async function analyzeBillWithOpenRouter(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedBillData> {
  const openRouterApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const base64Data = fileBuffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "BillAI SaaS",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
                 Analyze this bill/receipt/invoice and extract the following structured details. Return ONLY a valid JSON object matching this schema:
                 {
                   "vendorName": "Name of the merchant/vendor (string)",
                   "billNumber": "Invoice or Bill Number (string, empty if not found)",
                   "date": "Date of issue in YYYY-MM-DD format (string, empty if not found)",
                   "gstin": "GSTIN number of the vendor if available (string, empty if not found)",
                   "subtotal": 0.0 (number),
                   "gstAmount": 0.0 (total GST/Tax amount, number),
                   "cgst": 0.0 (CGST amount if specified, number),
                   "sgst": 0.0 (SGST amount if specified, number),
                   "igst": 0.0 (IGST amount if specified, number),
                   "totalAmount": 0.0 (total final payable amount, number),
                   "category": "One of: Fuel, Food, Travel, Office Expense, Marketing, Internet, Software, Miscellaneous",
                   "lineItems": [
                     {
                       "description": "Item description (string)",
                       "amount": 0.0 (total price for this item, number),
                       "qty": 1 (quantity, number, optional)
                     }
                   ],
                   "auditAlerts": [
                     {
                       "type": "junk_fee | tax_discrepancy | suspicious_item",
                       "lineItem": "Name of the flagged charge/line item (string)",
                       "amount": 0.0 (amount of the flagged item, number),
                       "explanation": "Clear explanation of why it was flagged, like 'Restaurant GST should be 5%, not 18%' or 'Optional admin fee' (string)",
                       "disputeScript": "A pre-written template script in first person for the user to copy/paste to dispute this charge (string)"
                     }
                   ]
                 }

                 Audit Guidelines:
                 - Flag line items with terms like 'convenience charge', 'admin surcharge', 'service fee', 'facility fee' as 'junk_fee'.
                 - Flag tax anomalies (e.g. food bills charged with 18% GST instead of 5% restaurant rate, or incorrect sum calculations) as 'tax_discrepancy'.
                 - Flag duplicate entries, mystery markups, or seat/license discrepancies as 'suspicious_item'.
                 - If no alerts are found, return an empty array for 'auditAlerts'.
              `.trim(),
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API failed: ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No response content from OpenRouter");
  }

  const parsed = JSON.parse(content.trim()) as ExtractedBillData;
  parsed.totalAmount = parsed.totalAmount || parsed.subtotal + parsed.gstAmount || 0;
  parsed.subtotal = parsed.subtotal || parsed.totalAmount - parsed.gstAmount || 0;
  return parsed;
}

export async function analyzeBill(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedBillData> {
  const openRouterApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

  if (!genAI) {
    if (openRouterApiKey) {
      console.log("Gemini client unconfigured. Attempting OpenRouter backup.");
      return await analyzeBillWithOpenRouter(fileBuffer, mimeType);
    }

    console.warn("No OCR API keys configured. Simulating OCR extraction.");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    return {
      vendorName: "GitHub Inc. (Demo)",
      billNumber: "INV-2026-9812",
      date: new Date().toISOString().split("T")[0],
      gstin: "27AAACG1234D1Z5",
      subtotal: 12000,
      gstAmount: 2160,
      cgst: 1080,
      sgst: 1080,
      igst: 0,
      totalAmount: 14160,
      category: "Software",
      lineItems: [
        { description: "GitHub Copilot Enterprise Seats", amount: 9500, qty: 5 },
        { description: "GitHub Actions Runner Minutes", amount: 2000, qty: 1 },
        { description: "Optional Administrative Charge", amount: 500, qty: 1 },
      ],
      auditAlerts: [
        {
          type: "junk_fee",
          lineItem: "Optional Administrative Charge",
          amount: 500,
          explanation: "Optional or unapproved admin fee. Standard GitHub contracts do not include this charge.",
          disputeScript: "Dear support team, I noticed an 'Optional Administrative Charge' of 500 on our invoice INV-2026-9812. As this was not contractually agreed upon, I would like to request that this fee be removed from our invoice."
        }
      ]
    };
  }

  try {
    // Use the recommended model for multimodal tasks
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const imagePart = {
      inlineData: {
        data: fileBuffer.toString("base64"),
        mimeType,
      },
    };

    const prompt = `
      Analyze this bill/receipt/invoice and extract the following structured details. Return ONLY a valid JSON object matching this schema:
      {
        "vendorName": "Name of the merchant/vendor (string)",
        "billNumber": "Invoice or Bill Number (string, empty if not found)",
        "date": "Date of issue in YYYY-MM-DD format (string, empty if not found)",
        "gstin": "GSTIN number of the vendor if available (string, empty if not found)",
        "subtotal": 0.0 (number),
        "gstAmount": 0.0 (total GST/Tax amount, number),
        "cgst": 0.0 (CGST amount if specified, number),
        "sgst": 0.0 (SGST amount if specified, number),
        "igst": 0.0 (IGST amount if specified, number),
        "totalAmount": 0.0 (total final payable amount, number),
        "category": "One of: Fuel, Food, Travel, Office Expense, Marketing, Internet, Software, Miscellaneous",
        "lineItems": [
          {
            "description": "Item description (string)",
            "amount": 0.0 (total price for this item, number),
            "qty": 1 (quantity, number, optional)
          }
        ],
        "auditAlerts": [
          {
            "type": "junk_fee | tax_discrepancy | suspicious_item",
            "lineItem": "Name of the flagged charge/line item (string)",
            "amount": 0.0 (amount of the flagged item, number),
            "explanation": "Clear explanation of why it was flagged, like 'Restaurant GST should be 5%, not 18%' or 'Optional admin fee' (string)",
            "disputeScript": "A pre-written template script in first person for the user to copy/paste to dispute this charge (string)"
          }
        ]
      }

      Audit Guidelines:
      - Flag line items with terms like 'convenience charge', 'admin surcharge', 'service fee', 'facility fee' as 'junk_fee'.
      - Flag tax anomalies (e.g. food bills charged with 18% GST instead of 5% restaurant rate, or incorrect sum calculations) as 'tax_discrepancy'.
      - Flag duplicate entries, mystery markups, or seat/license discrepancies as 'suspicious_item'.
      - If no alerts are found, return an empty array for 'auditAlerts'.

      Notes:
      - If GST is not explicitly broken down into CGST/SGST/IGST, set those fields to 0, but extract gstAmount if total tax is visible.
      - Categorize the bill carefully based on the items and vendor.
      - Ensure your response is strictly valid JSON without any markdown formatting or code blocks.
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    let text = response.text().trim();

    // Clean up potential markdown formatting in response
    if (text.startsWith("```json")) {
      text = text.substring(7);
    }
    if (text.endsWith("```")) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();

    const parsedData = JSON.parse(text) as ExtractedBillData;

    // Validate calculations/fallbacks
    parsedData.totalAmount = parsedData.totalAmount || parsedData.subtotal + parsedData.gstAmount || 0;
    parsedData.subtotal = parsedData.subtotal || parsedData.totalAmount - parsedData.gstAmount || 0;

    return parsedData;
  } catch (error) {
    console.error("Gemini OCR error, checking for OpenRouter fallback:", error);
    if (openRouterApiKey) {
      console.log("Gemini failed. Initiating OpenRouter fallback OCR call...");
      try {
        return await analyzeBillWithOpenRouter(fileBuffer, mimeType);
      } catch (orErr) {
        console.error("OpenRouter fallback failed:", orErr);
        throw orErr;
      }
    }
    throw error;
  }
}
