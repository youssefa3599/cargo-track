// src/app/api/shipments/scan/route.ts
// OCR Document Scanner — extracts shipment fields from supplier invoices,
// bills of lading, packing lists, and customs declarations using Gemini Vision.

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { verifyToken, extractToken } from '@/lib/auth';

let _ai: GoogleGenAI | null = null;
function getAI() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return _ai;
}

const EXTRACTION_PROMPT = `
You are a logistics document scanner for a cargo management system.
Analyze this shipping document (supplier invoice, bill of lading, packing list, or customs declaration)
and extract all available fields.

Return ONLY a valid JSON object with no extra text, no markdown, no backticks.
Use null for any field you cannot find or are not confident about.

{
  "supplierName": "name of the supplier or shipper company",
  "customerName": "name of the customer, consignee, or importer",
  "origin": "city or country the shipment ships FROM",
  "destination": "city or country the shipment ships TO",
  "trackingNumber": "any tracking or waybill number",
  "carrier": "shipping carrier if mentioned — one of: FedEx, UPS, DHL, USPS, Maersk, or Other",
  "shippingDate": "shipping or invoice date in YYYY-MM-DD format",
  "estimatedArrival": "estimated delivery date in YYYY-MM-DD format if present",
  "weight": "total weight as a number in kg (convert if needed)",
  "currency": "currency code — one of: USD, EGP, EUR, GBP",
  "shippingCost": "shipping cost as a number if shown on the document (no currency symbols)",
  "notes": "any relevant notes, special instructions, or document reference numbers",
  "products": [
    {
      "productName": "name or description of the product",
      "hsCode": "HS/HTS code if shown",
      "quantity": "quantity as a number",
      "unitPrice": "unit price as a number (no currency symbols)"
    }
  ]
}

Important rules:
- products must be an array even if there is only one item
- If no products are found, return an empty array for products
- For weight, always convert to kg (1 lb = 0.453592 kg)
- Never guess or invent data — return null if unsure
`;

export async function POST(request: NextRequest) {
  try {
    // ✅ Using your existing auth pattern
    const token = extractToken(request);
    if (!token) return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });

    const user = verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type — accept images and PDFs
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Upload a JPEG, PNG, WebP image or PDF.' },
        { status: 400 }
      );
    }

    // 10MB limit for documents
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Convert to base64 for Gemini Vision
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    // Use image/jpeg as media type for PDFs too — Gemini handles both
    const mediaType = file.type === 'application/pdf' ? 'application/pdf' : file.type;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mediaType as any,
                data: base64,
              },
            },
            { text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Strip any accidental markdown fences before parsing
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    let extracted: any;
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      console.error('Gemini returned non-JSON:', rawText);
      return NextResponse.json(
        { error: 'Could not parse document. Try a clearer image.' },
        { status: 422 }
      );
    }

    // Sanitize — ensure products is always an array
    if (!Array.isArray(extracted.products)) {
      extracted.products = [];
    }

    return NextResponse.json({
      success: true,
      data: extracted,
      message: `Extracted ${extracted.products.length} product(s) from document`,
    });

  } catch (error: any) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Failed to scan document', details: error.message },
      { status: 500 }
    );
  }
}