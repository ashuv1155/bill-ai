import { NextRequest, NextResponse } from "next/server";
import { analyzeBill } from "@/lib/gemini";

export const maxDuration = 60; // Allow enough time for OCR

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in form data" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type;

    if (!mimeType.startsWith("image/") && mimeType !== "application/pdf") {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload an image or PDF." },
        { status: 400 }
      );
    }

    const data = await analyzeBill(buffer, mimeType);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API OCR Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process receipt" },
      { status: 500 }
    );
  }
}
