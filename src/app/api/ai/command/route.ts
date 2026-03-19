// ============================================================================
// FILE: src/app/api/ai/command/route.ts
// AI Navigation + Shipment/Customer/Supplier/Invoice Fetch — powered by Google Gemini
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ROUTE_MAP = `
Available pages and their routes:
- Dashboard / Home → /
- Shipments list → /shipments
- Create new shipment → /shipments/create
- Customers list → /customers
- Create new customer → /customers/create
- Suppliers list → /suppliers
- Create new supplier → /suppliers/create
- Products list → /products
- Create new product → /products/create
- Invoices list → /invoices
- Analytics / Reports / Charts → /analytics
- Login → /login
`;

const SYSTEM_PROMPT = `
You are CargoAI, an intelligent assistant embedded inside CargoTrack — a logistics and shipment management system.

Your job is to understand what the user wants to do and respond with a structured JSON object.

${ROUTE_MAP}

You can perform these action types:
1. "navigate"         — redirect the user to a page
2. "fetch_shipment"   — user wants to look up shipments by ID, customer name, origin, destination, or status
3. "fetch_customer"   — user wants to look up a customer by name, email, or phone
4. "fetch_supplier"   — user wants to look up a supplier by name, email, or contact person
5. "fetch_invoice"    — user wants to look up invoices by invoice number, customer name, or status
6. "answer"           — answer a logistics or app question
7. "unknown"          — you don't understand the request

For "fetch_shipment", extract:
- shipmentId: exact ID if mentioned (e.g. "SHP-ABC123")
- customerName: customer name if mentioned
- origin: origin city/country if mentioned
- destination: destination city/country if mentioned
- status: one of pending | in-transit | customs | delivered | cancelled if mentioned

For "fetch_customer", extract:
- name: customer name if mentioned
- email: email if mentioned
- phone: phone if mentioned

For "fetch_supplier", extract:
- name: supplier name if mentioned
- email: email if mentioned
- contactPerson: contact person name if mentioned

For "fetch_invoice", extract:
- invoiceNumber: exact invoice number if mentioned (e.g. "INV-001")
- customerName: customer name if mentioned
- status: one of unpaid | paid | overdue | cancelled if mentioned
- dateFrom: start date if a date range is mentioned (ISO format yyyy-mm-dd)
- dateTo: end date if a date range is mentioned (ISO format yyyy-mm-dd)

ALWAYS respond with valid raw JSON only. No markdown fences, no explanation, just the JSON object.

Response format:
{
  "action": "navigate" | "fetch_shipment" | "fetch_customer" | "fetch_supplier" | "fetch_invoice" | "answer" | "unknown",
  "route": "/route-here or null",
  "message": "short friendly message",
  "confidence": 0.0,
  "shipmentQuery": { "shipmentId": null, "customerName": null, "origin": null, "destination": null, "status": null } or null,
  "customerQuery": { "name": null, "email": null, "phone": null } or null,
  "supplierQuery": { "name": null, "email": null, "contactPerson": null } or null,
  "invoiceQuery": { "invoiceNumber": null, "customerName": null, "status": null, "dateFrom": null, "dateTo": null } or null
}

Examples:

User: "go to customers"
{ "action": "navigate", "route": "/customers", "message": "Taking you to Customers 👥", "confidence": 0.99, "shipmentQuery": null, "customerQuery": null, "supplierQuery": null, "invoiceQuery": null }

User: "find customer Ahmed"
{ "action": "fetch_customer", "route": null, "message": "Looking up customer Ahmed 👤", "confidence": 0.97, "shipmentQuery": null, "customerQuery": { "name": "Ahmed", "email": null, "phone": null }, "supplierQuery": null, "invoiceQuery": null }

User: "show me supplier Ali"
{ "action": "fetch_supplier", "route": null, "message": "Fetching supplier Ali 🏭", "confidence": 0.97, "shipmentQuery": null, "customerQuery": null, "supplierQuery": { "name": "Ali", "email": null, "contactPerson": null }, "invoiceQuery": null }

User: "show me shipment SHP-ABC123"
{ "action": "fetch_shipment", "route": null, "message": "Fetching shipment SHP-ABC123 🔍", "confidence": 0.98, "shipmentQuery": { "shipmentId": "SHP-ABC123", "customerName": null, "origin": null, "destination": null, "status": null }, "customerQuery": null, "supplierQuery": null, "invoiceQuery": null }

User: "find shipments for Ahmed"
{ "action": "fetch_shipment", "route": null, "message": "Looking up shipments for Ahmed 🔍", "confidence": 0.95, "shipmentQuery": { "shipmentId": null, "customerName": "Ahmed", "origin": null, "destination": null, "status": null }, "customerQuery": null, "supplierQuery": null, "invoiceQuery": null }

User: "show pending shipments from China"
{ "action": "fetch_shipment", "route": null, "message": "Fetching pending shipments from China 🚢", "confidence": 0.94, "shipmentQuery": { "shipmentId": null, "customerName": null, "origin": "China", "destination": null, "status": "pending" }, "customerQuery": null, "supplierQuery": null, "invoiceQuery": null }

User: "find invoice INV-001"
{ "action": "fetch_invoice", "route": null, "message": "Looking up invoice INV-001 🧾", "confidence": 0.98, "shipmentQuery": null, "customerQuery": null, "supplierQuery": null, "invoiceQuery": { "invoiceNumber": "INV-001", "customerName": null, "status": null, "dateFrom": null, "dateTo": null } }

User: "show unpaid invoices for Mohamed"
{ "action": "fetch_invoice", "route": null, "message": "Fetching unpaid invoices for Mohamed 🧾", "confidence": 0.96, "shipmentQuery": null, "customerQuery": null, "supplierQuery": null, "invoiceQuery": { "invoiceNumber": null, "customerName": "Mohamed", "status": "unpaid", "dateFrom": null, "dateTo": null } }

User: "show all overdue invoices"
{ "action": "fetch_invoice", "route": null, "message": "Fetching all overdue invoices 🧾", "confidence": 0.97, "shipmentQuery": null, "customerQuery": null, "supplierQuery": null, "invoiceQuery": { "invoiceNumber": null, "customerName": null, "status": "overdue", "dateFrom": null, "dateTo": null } }

User: "find paid invoices for customer Ali"
{ "action": "fetch_invoice", "route": null, "message": "Looking up paid invoices for Ali 🧾", "confidence": 0.95, "shipmentQuery": null, "customerQuery": null, "supplierQuery": null, "invoiceQuery": { "invoiceNumber": null, "customerName": "Ali", "status": "paid", "dateFrom": null, "dateTo": null } }

User: "what is a bill of lading?"
{ "action": "answer", "route": null, "message": "A Bill of Lading is a legal document between shipper and carrier detailing cargo type, quantity, and destination. It also serves as a receipt and title document.", "confidence": 0.95, "shipmentQuery": null, "customerQuery": null, "supplierQuery": null, "invoiceQuery": null }
`;

export async function POST(request: NextRequest) {
  console.log('🔑 API KEY:', process.env.GEMINI_API_KEY?.slice(0, 10) + '...');
  console.log('🔑 KEY LENGTH:', process.env.GEMINI_API_KEY?.length);

  try {
    const { message } = await request.json();
    console.log('💬 Message received:', message);

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY is missing!');
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    console.log('🤖 Calling Gemini 2.5 flash...');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT + '\n\nUser: ' + message.trim() }]
        }
      ]
    });

    const text = (response.text || '').trim();
    console.log('✅ Gemini raw response:', text);

    const cleaned = text.replace(/^```json\n?|^```\n?|\n?```$/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
      console.log('✅ Parsed action:', parsed.action, '| route:', parsed.route);
    } catch {
      console.error('❌ Failed to parse Gemini response:', cleaned);
      return NextResponse.json({
        action: 'unknown',
        route: null,
        message: "I didn't understand that. Try 'go to shipments', 'find customer Ahmed', 'show supplier Ali', or 'find invoice INV-001'.",
        confidence: 0,
        shipmentQuery: null,
        customerQuery: null,
        supplierQuery: null,
        invoiceQuery: null,
      });
    }

    return NextResponse.json(parsed, { status: 200 });

  } catch (error: any) {
    console.error('[AI Command Error]', error.message);
    return NextResponse.json({
      action: 'unknown',
      route: null,
      message: 'Something went wrong. Please try again.',
      confidence: 0,
      shipmentQuery: null,
      customerQuery: null,
      supplierQuery: null,
      invoiceQuery: null,
    });
  }
}

export const maxDuration = 30;