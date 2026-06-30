// Shared utility to trigger Google Sheets integration sync via Google Apps Script web app URL

export async function syncBillToGoogleSheets(bill: any): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const webhookUrl = localStorage.getItem("billai_gsheet_webhook_url");
    if (!webhookUrl) {
      // Integration is not connected or configured
      return false;
    }

    const payload = {
      id: bill.id || "",
      date: bill.date || "",
      vendorName: bill.vendorName || "",
      billNumber: bill.billNumber || "",
      category: bill.category || "",
      currency: bill.currency || "",
      totalAmount: bill.totalAmount || 0,
      gstAmount: bill.gstAmount || 0,
      taxType: bill.taxType || "GST",
      taxId: bill.taxId || bill.gstin || "",
      lineItemsCount: bill.lineItems ? bill.lineItems.length : 0,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      mode: "no-cors", // Google Apps Script Web Apps require no-cors or redirect handling
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return true;
  } catch (error) {
    console.error("Failed to sync bill data to Google Sheets:", error);
    return false;
  }
}
