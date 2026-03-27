// src/app/api/ai/command/route.ts
// ULTIMATE AI ASSISTANT - Complete Version (TypeScript Fixed)
// Features: Pinecone semantic search + MongoDB queries + Aggregations + Flexible field matching

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, FunctionDeclaration } from '@google/genai';
import mongoose from 'mongoose';
import { verifyToken, extractToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Shipment from '@/models/Shipment';
import Customer from '@/models/Customer';
import Supplier from '@/models/Supplier';
import Invoice from '@/models/Invoice';
import { semanticSearch } from '@/lib/services/search';

// ── Lazy Gemini client ────────────────────────────────────────────────────────
let _ai: GoogleGenAI | null = null;
function getAI() {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return _ai;
}

// ── Enhanced Schema Context ───────────────────────────────────────────────────
const SCHEMA_CONTEXT = `
You are CargoAI, an intelligent data analyst for a cargo tracking platform.
You have access to tools to query a MongoDB database. Always use tools to fetch real data — never guess or make up answers.

═══════════════════════════════════════════
DATABASE SCHEMA
═══════════════════════════════════════════

SHIPMENTS collection:
  shipmentId        — unique ID (e.g. SHP-XXXX)
  status            — "pending" | "in-transit" | "customs" | "delivered" | "cancelled"
  origin            — country or city the shipment comes FROM (e.g. "China", "USA", "Germany")
  destination       — country or city the shipment goes TO (e.g. "Egypt", "London", "New York")
  customerName      — name of the customer who ordered
  supplierName      — name of the supplier
  trackingNumber    — tracking code (e.g. DHL98765432)
  carrier           — shipping company: MUST be one of: "FedEx" | "UPS" | "DHL" | "USPS" | "Maersk" | "Other"
  shippingDate      — date shipment was sent
  estimatedArrival  — expected delivery date
  actualDelivery    — actual delivery date (only if delivered)
  totalCost         — total cost (raw, may vary by currency)
  customerPayment   — amount customer pays (raw, may vary by currency)
  costBreakdown.totalLandedCostEGP — ALL costs unified in EGP — this is the ONLY field used for cost filtering
  companyProfit     — profit made by the company
  profitMargin      — profit as a percentage
  weight            — weight in kg
  currency          — "USD" | "EGP" | "EUR" | "GBP" — original currency of the shipment
                      NOTE: All cost filtering is done in EGP using totalLandedCostEGP.
                      When the user says "cost more than 50000", treat that as 50,000 EGP.
                      Always tell the user results are in EGP in your response.
  notes             — any extra notes
  createdAt         — when the record was created

CUSTOMERS collection:
  name, email, phone, address, country, notes, createdAt

SUPPLIERS collection:
  name, contactPerson, email, phone, country, paymentTerms, rating (0–5), isActive, notes

INVOICES collection:
  invoiceNumber, customerName, customerEmail
  status — "unpaid" | "paid" | "overdue" | "cancelled"
  totalAmount, totalAmountEGP, currency, issueDate, dueDate

═══════════════════════════════════════════
TOOL SELECTION — HOW TO DECIDE
═══════════════════════════════════════════

Use query_shipments for ANY filter on shipment fields:
  → carrier, origin, destination, status, customerName, supplierName,
    trackingNumber, shipmentId, minCost, maxCost, minProfit, maxProfit,
    minPayment, maxPayment, shippingDateFrom, shippingDateTo, sortBy, limit

Use query_customers for filters on customer fields:
  → name, email, country

Use query_suppliers for filters on supplier fields:
  → name, contactPerson, country, isActive, paymentTerms

Use query_invoices for filters on invoice fields:
  → invoiceNumber, customerName, status, minAmount, maxAmount, dueDateFrom, dueDateTo

Use aggregate_data for:
  → count, sum, average, max, min, group_by — on any collection

Use semantic_search for:
  → fuzzy/partial names, natural language descriptions, "find something like X"
  → ALWAYS use this as a FALLBACK if a direct query returns 0 results

═══════════════════════════════════════════
EXAMPLES — SHIPMENT QUERIES
═══════════════════════════════════════════

Q: "shipments by DHL" / "DHL shipments" / "carrier is DHL"
→ query_shipments(carrier: "DHL")

Q: "shipments from China" / "origin China" / "coming from USA"
→ query_shipments(origin: "China")

Q: "shipments to Egypt" / "going to Germany" / "destination London"
→ query_shipments(destination: "Egypt")

Q: "pending shipments" / "show me in-transit shipments" / "cancelled orders"
→ query_shipments(status: "pending")

Q: "shipments over 50000 EGP" / "cost more than 30000" / "expensive shipments" / "cost more than X USD" (convert: 1 USD ≈ 50 EGP)
→ query_shipments(minCost: 50000)

Q: "shipments under 10000 EGP" / "cheap shipments" / "cost less than 20000"
→ query_shipments(maxCost: 10000)

Q: "shipments between 10000 and 50000 EGP"
→ query_shipments(minCost: 10000, maxCost: 50000)

Q: "shipments for customer Ahmed" / "Ahmed's shipments"
→ query_shipments(customerName: "Ahmed")

Q: "shipments from supplier lolo" / "lolo supplier shipments"
→ query_shipments(supplierName: "lolo")

Q: "DHL shipments to Egypt" / "FedEx shipments from China"
→ query_shipments(carrier: "DHL", destination: "Egypt")

Q: "pending shipments from USA over $2000"
→ query_shipments(status: "pending", origin: "USA", minCost: 2000)

Q: "most expensive shipments" / "top shipments by cost"
→ query_shipments(sortBy: "totalCost", sortOrder: "desc", limit: 10)

Q: "most profitable shipments"
→ query_shipments(sortBy: "companyProfit", sortOrder: "desc", limit: 10)

Q: "latest shipments" / "recent shipments"
→ query_shipments(sortBy: "createdAt", sortOrder: "desc", limit: 10)

Q: "shipments arriving in 2027" / "estimated arrival in 2027"
→ query_shipments(estimatedArrivalFrom: "2027-01-01", estimatedArrivalTo: "2027-12-31")

Q: "shipments arriving before June 2025"
→ query_shipments(estimatedArrivalTo: "2025-06-30")

Q: "shipments arriving after 2026"
→ query_shipments(estimatedArrivalFrom: "2026-01-01")

Q: "shipments this year" / "shipments in 2025"
→ query_shipments(shippingDateFrom: "2025-01-01", shippingDateTo: "2025-12-31")

Q: "find shipment SHP-XXXX" / "tracking number DHL123"
→ query_shipments(shipmentId: "SHP-XXXX") or query_shipments(trackingNumber: "DHL123")

Q: "find shipments for Lulu" / "Lolo customer" — fuzzy name
→ semantic_search(query: "Lulu customer shipments", type: "shipment")

═══════════════════════════════════════════
EXAMPLES — NAVIGATION
═══════════════════════════════════════════

Q: "go to customers" / "show customers page" / "navigate to suppliers"
→ navigate(route: "/customers") or navigate(route: "/suppliers")

Q: "show me customer Ahmed" / "open Ahmed's profile" (when query finds exactly 1 result)
→ 1. query_customers(name: "Ahmed") → get _id
→ 2. If exactly 1 result: navigate(route: "/customers/{_id}", entityType: "customer", entityId: "{_id}")
→ 3. If multiple results: return the list in fetch_customer action (cards)

Q: "open shipment SHP-1234" / "go to shipment SHP-1234"
→ 1. query_shipments(shipmentId: "SHP-1234") → get _id
→ 2. If found: navigate(route: "/shipments/{_id}", entityType: "shipment", entityId: "{_id}")

Q: "show invoice INV-5678" / "view invoice INV-5678"
→ 1. query_invoices(invoiceNumber: "INV-5678") → get _id
→ 2. If found: navigate(route: "/invoices/{_id}", entityType: "invoice", entityId: "{_id}")

CRITICAL NAVIGATION RULES:
- For "show me X" / "open X" queries:
  → If query returns exactly 1 result AND user intent is to VIEW (not just list): use navigate with entityId
  → If query returns multiple results: return as cards (fetch_customer, fetch_shipment, etc.) for user to choose
  → If query returns 0 results: say "not found" and suggest alternatives
- For "go to page" / "navigate to" without a specific entity: use navigate with just the list page route

═══════════════════════════════════════════
EXAMPLES — ANALYTICS
═══════════════════════════════════════════

Q: "how many shipments total" / "shipment count"
→ aggregate_data(collection: "shipments", operation: "count")

Q: "how many pending shipments"
→ aggregate_data(collection: "shipments", operation: "count", filter: {status: "pending"})

Q: "total revenue" / "total customer payments"
→ aggregate_data(collection: "shipments", operation: "sum", field: "customerPayment")

Q: "total profit"
→ aggregate_data(collection: "shipments", operation: "sum", field: "companyProfit")

Q: "average profit margin"
→ aggregate_data(collection: "shipments", operation: "average", field: "profitMargin")

Q: "highest cost shipment" / "most expensive single shipment"
→ aggregate_data(collection: "shipments", operation: "max", field: "totalCost")

Q: "which customer has the most shipments"
→ aggregate_data(collection: "shipments", operation: "group_by", groupBy: "customerName")

Q: "which customer spends the most" / "top customers by revenue"
→ aggregate_data(collection: "shipments", operation: "group_by", groupBy: "customerName", field: "customerPayment")

Q: "shipments by status" / "how many per status"
→ aggregate_data(collection: "shipments", operation: "group_by", groupBy: "status")

Q: "shipments by carrier" / "which carrier is used most"
→ aggregate_data(collection: "shipments", operation: "group_by", groupBy: "carrier")

Q: "shipments by origin country"
→ aggregate_data(collection: "shipments", operation: "group_by", groupBy: "origin")

Q: "how many customers do we have"
→ aggregate_data(collection: "customers", operation: "count")

Q: "how many unpaid invoices"
→ aggregate_data(collection: "invoices", operation: "count", filter: {status: "unpaid"})

Q: "total unpaid invoice amount"
→ aggregate_data(collection: "invoices", operation: "sum", field: "totalAmount", filter: {status: "unpaid"})

═══════════════════════════════════════════
EXAMPLES — CUSTOMERS & SUPPLIERS
═══════════════════════════════════════════

Q: "find customer Ahmed" / "customer from Egypt"
→ query_customers(name: "Ahmed") or query_customers(country: "Egypt")

Q: "find supplier lolo" / "active suppliers"
→ query_suppliers(name: "lolo") or query_suppliers(isActive: true)

Q: "suppliers from China" / "supplier contact person John"
→ query_suppliers(country: "China") or query_suppliers(contactPerson: "John")

═══════════════════════════════════════════
EXAMPLES — INVOICES
═══════════════════════════════════════════

Q: "unpaid invoices" / "overdue invoices"
→ query_invoices(status: "unpaid") or query_invoices(status: "overdue")

Q: "invoices for Ahmed" / "find invoice INV-001"
→ query_invoices(customerName: "Ahmed") or query_invoices(invoiceNumber: "INV-001")

Q: "invoices over $5000"
→ query_invoices(minAmount: 5000)

═══════════════════════════════════════════
FALLBACK STRATEGY — CRITICAL
═══════════════════════════════════════════

If a query_* tool returns 0 results:
1. Try semantic_search as a fallback with the same keywords
2. If semantic_search also returns 0, tell the user clearly and suggest alternatives

Example:
  query_shipments(carrier: "DHL") → 0 results
  → fallback: semantic_search(query: "DHL shipments", type: "shipment")
  → if still 0: "No DHL shipments found. The carrier field may not be set. Try searching by tracking number instead."

═══════════════════════════════════════════
WRITE OPERATIONS — execute_db_operation
═══════════════════════════════════════════

Use execute_db_operation for any CREATE, UPDATE, or DELETE task.

SAFETY RULES (MANDATORY — never skip):
1. ALWAYS READ BEFORE WRITE — before any update/delete, call the matching query_* tool first
   to confirm the record exists and show the user what will change.
2. NO FILTER = REFUSE — never call execute_db_operation with operation=delete/update
   without at least one identifying filter. Refuse and ask for clarification.
3. DRY-RUN DELETES — for delete_overdue_shipments, first call aggregate_data to count
   and list affected records, tell the user what will be deleted, then proceed.
4. If a customer/supplier name is given for create_shipment, call query_customers /
   query_suppliers first to verify they exist before creating.
5. PROCEED WITH CONFIDENCE — If the user gives a clear command with specific filters
   (e.g., "mark all shipments arriving in 2027 as cancelled"), query first to find
   matching records, then execute the update WITHOUT asking for confirmation unless
   the count is 0 or the filter is ambiguous.

OPERATION EXAMPLES:

Q: "Update shipment SHP-001 status to delivered"
→ 1. query_shipments(shipmentId: "SHP-001")  ← confirm exists
→ 2. execute_db_operation(operation: "update_shipment", shipmentId: "SHP-001", updates: {status: "delivered"})

Q: "Mark all pending shipments as delivered"
→ 1. aggregate_data(collection: "shipments", operation: "count", filter: {status: "pending"})  ← dry-run count
→ 2. execute_db_operation(operation: "bulk_update_shipments", status: "pending", updates: {status: "delivered"})

Q: "Mark all shipments arriving in 2027 as cancelled" / "cancel shipments estimated to arrive in 2027"
→ 1. aggregate_data to count affected  ← dry-run
→ 2. execute_db_operation(operation: "bulk_update_shipments", estimatedArrivalFrom: "2027-01-01", estimatedArrivalTo: "2027-12-31", updates: {status: "cancelled"})

Q: "Mark all shipments NOT arriving in 2027 as delivered" / "shipments whose estimated arrival is not in 2027"
→ 1. aggregate_data to count affected  ← dry-run
→ 2. execute_db_operation(operation: "bulk_update_shipments", estimatedArrivalNotFrom: "2027-01-01", estimatedArrivalNotTo: "2027-12-31", updates: {status: "delivered"})

Q: "Mark all DHL shipments from China as in-transit"
→ execute_db_operation(operation: "bulk_update_shipments", carrier: "DHL", origin: "China", updates: {status: "in-transit"})

Q: "Update all shipments arriving before June 2025 to delivered"
→ execute_db_operation(operation: "bulk_update_shipments", estimatedArrivalTo: "2025-06-30", updates: {status: "delivered"})

Q: "Generate invoice for shipment SHP-002"
→ 1. query_shipments(shipmentId: "SHP-002")  ← get shipment details
→ 2. execute_db_operation(operation: "generate_invoice", shipmentId: "SHP-002")

Q: "Delete overdue shipments" / "Clean up old pending shipments"
→ 1. aggregate_data(collection: "shipments", operation: "count", filter: {status: "pending"})  ← dry-run count
→ 2. execute_db_operation(operation: "delete_overdue_shipments", olderThanDays: 30, statusFilter: "pending")

Q: "Create a shipment for customer Ahmed from China to Egypt"
→ 1. query_customers(name: "Ahmed")  ← verify customer exists
→ 2. execute_db_operation(operation: "create_shipment", customerName: "Ahmed", origin: "China", destination: "Egypt", ...)

═══════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════

1. ALWAYS use tools — never invent data
2. NEVER ask clarifying questions — if the user gives partial info, query with what you have and return results
3. If a filter field is unknown or vague (e.g. "West Coast"), ignore it and query with the other filters provided
4. Match the user's intent to the right tool using the examples above
5. Combine multiple filters in one query_shipments call when needed
6. Numbers in examples are just patterns — use whatever number the user says
7. Country/city names in examples are just patterns — use whatever the user says
8. If 0 results → always try semantic_search as fallback before giving up
9. Format numbers nicely: $12,450 not 12450
10. Be conversational — summarize results naturally, don't just dump raw data
11. For write operations: ALWAYS read-before-write, NEVER delete/update without a filter

Today's date: ${new Date().toISOString().split('T')[0]}
`;

// ── Function Declarations ─────────────────────────────────────────────────────
const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'semantic_search',
    description: 'Use semantic search for fuzzy name matching, natural language queries, or finding similar items.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query (e.g., "Lulu shipments", "expensive electronics")' },
        type: { type: 'string', description: 'Filter by type: shipment | customer | supplier | invoice | all' },
        topK: { type: 'number', description: 'Number of results (default 5, max 20)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'aggregate_data',
    description: 'Perform aggregations and analytics: count, sum, average, max, min, grouping. Use for "how many", "total", "average", "top X" questions.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        collection: { type: 'string', description: 'shipments | customers | suppliers | invoices' },
        operation: { type: 'string', description: 'count | sum | average | max | min | group_by' },
        field: { type: 'string', description: 'Field to aggregate (totalCost, companyProfit, customerPayment, profitMargin, etc.)' },
        groupBy: { type: 'string', description: 'Field to group by (customerName, status, supplierName, etc.)' },
        filter: { type: 'object', description: 'Optional filters (e.g., {status: "pending"})' },
      },
      required: ['collection', 'operation'],
    },
  },
  {
    name: 'query_shipments',
    description: 'Query shipments with exact filters. Use for specific lookups and filtering.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        shipmentId:       { type: 'string', description: 'Shipment ID partial match' },
        customerName:     { type: 'string', description: 'Customer name partial match' },
        supplierName:     { type: 'string', description: 'Supplier name partial match' },
        trackingNumber:   { type: 'string', description: 'Tracking number' },
        origin:           { type: 'string', description: 'Origin country/city partial match' },
        destination:      { type: 'string', description: 'Destination country/city partial match' },
        carrier:          { type: 'string', description: 'Carrier name' },
        status:           { type: 'string', description: 'pending | in-transit | customs | delivered | cancelled' },
        minCost:          { type: 'number', description: 'Minimum cost' },
        maxCost:          { type: 'number', description: 'Maximum cost' },
        minProfit:        { type: 'number', description: 'Minimum profit' },
        maxProfit:        { type: 'number', description: 'Maximum profit' },
        minPayment:       { type: 'number', description: 'Minimum customer payment' },
        maxPayment:       { type: 'number', description: 'Maximum customer payment' },
        shippingDateFrom: { type: 'string', description: 'Shipping date from ISO string' },
        shippingDateTo:   { type: 'string', description: 'Shipping date to ISO string' },
        estimatedArrivalFrom: { type: 'string', description: 'Estimated arrival date from ISO string (e.g. "2027-01-01")' },
        estimatedArrivalTo:   { type: 'string', description: 'Estimated arrival date to ISO string (e.g. "2027-12-31")' },
        createdFrom:      { type: 'string', description: 'Created date from ISO string' },
        createdTo:        { type: 'string', description: 'Created date to ISO string' },
        limit:            { type: 'number', description: 'Max results (default 10, max 50)' },
        sortBy:           { type: 'string', description: 'Sort field: createdAt | shippingDate | companyProfit | customerPayment | totalCost' },
        sortOrder:        { type: 'string', description: 'asc or desc (default desc)' },
      },
    },
  },
  {
    name: 'query_customers',
    description: 'Query customers with exact filters.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        name:    { type: 'string', description: 'Name partial match' },
        email:   { type: 'string', description: 'Email partial match' },
        country: { type: 'string', description: 'Country partial match' },
        limit:   { type: 'number', description: 'Max results (default 10)' },
      },
    },
  },
  {
    name: 'query_suppliers',
    description: 'Query suppliers with exact filters.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        name:          { type: 'string',  description: 'Name partial match' },
        contactPerson: { type: 'string',  description: 'Contact person partial match' },
        country:       { type: 'string',  description: 'Country partial match' },
        isActive:      { type: 'boolean', description: 'Filter by active status' },
        paymentTerms:  { type: 'string',  description: 'Payment terms' },
        limit:         { type: 'number',  description: 'Max results (default 10)' },
      },
    },
  },
  {
    name: 'query_invoices',
    description: 'Query invoices with exact filters.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        invoiceNumber: { type: 'string', description: 'Invoice number partial match' },
        customerName:  { type: 'string', description: 'Customer name partial match' },
        status:        { type: 'string', description: 'unpaid | paid | overdue | cancelled' },
        minAmount:     { type: 'number', description: 'Minimum total amount' },
        maxAmount:     { type: 'number', description: 'Maximum total amount' },
        dueDateFrom:   { type: 'string', description: 'Due date from ISO string' },
        dueDateTo:     { type: 'string', description: 'Due date to ISO string' },
        limit:         { type: 'number', description: 'Max results (default 10)' },
        sortBy:        { type: 'string', description: 'Sort field: dueDate | totalAmount | issueDate' },
        sortOrder:     { type: 'string', description: 'asc or desc' },
      },
    },
  },
  {
    name: 'navigate',
    description: 'Navigate the user to a list page or specific record detail page. Use when user explicitly wants to "go to", "show", "open", or "view" a page or record.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        route: { 
          type: 'string', 
          description: 'Route path. List pages: /shipments | /customers | /suppliers | /invoices | /analytics. Detail pages: /shipments/{id} | /customers/{id} | /suppliers/{id} | /invoices/{id}' 
        },
        entityType: {
          type: 'string',
          description: 'Type of entity when navigating to a detail page (shipment, customer, supplier, invoice)',
        },
        entityId: {
          type: 'string',
          description: 'MongoDB _id of the specific entity to navigate to',
        },
      },
      required: ['route'],
    },
  },
  {
    name: 'execute_db_operation',
    description: 'Perform write operations: create/update/delete on any collection. Always read-before-write using query_* tools first.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description: 'update_shipment | bulk_update_shipments | generate_invoice | delete_overdue_shipments | create_shipment',
        },
        // update_shipment
        shipmentId: { type: 'string', description: 'Shipment ID (e.g. SHP-001) — required for update_shipment and generate_invoice' },
        updates: {
          type: 'object',
          description: 'Fields to update on the shipment(s) (e.g. {status: "delivered", notes: "Arrived on time"})',
        },
        // bulk_update_shipments filters (at least one required)
        estimatedArrivalFrom:    { type: 'string', description: 'Filter: estimated arrival >= this ISO date' },
        estimatedArrivalTo:      { type: 'string', description: 'Filter: estimated arrival <= this ISO date' },
        estimatedArrivalNotFrom: { type: 'string', description: 'Exclude range start — e.g. "2027-01-01" to exclude shipments IN 2027' },
        estimatedArrivalNotTo:   { type: 'string', description: 'Exclude range end   — e.g. "2027-12-31" to exclude shipments IN 2027' },
        shippingDateFrom: { type: 'string', description: 'Filter: shipping date >= this ISO date' },
        shippingDateTo:   { type: 'string', description: 'Filter: shipping date <= this ISO date' },
        // generate_invoice — uses shipmentId above
        // delete_overdue_shipments
        olderThanDays: { type: 'number', description: 'Delete shipments older than this many days (default 30)' },
        statusFilter: { type: 'string', description: 'Only delete shipments with this status (e.g. "pending", "cancelled")' },
        // create_shipment
        customerName:     { type: 'string',  description: 'Customer name for new shipment' },
        supplierName:     { type: 'string',  description: 'Supplier name for new shipment' },
        origin:           { type: 'string',  description: 'Origin country/city' },
        destination:      { type: 'string',  description: 'Destination country/city' },
        carrier:          { type: 'string',  description: 'Carrier: FedEx | UPS | DHL | USPS | Maersk | Other' },
        shippingDate:     { type: 'string',  description: 'ISO date string for shipping date' },
        estimatedArrival: { type: 'string',  description: 'ISO date string for estimated arrival' },
        weight:           { type: 'number',  description: 'Weight in kg' },
        currency:         { type: 'string',  description: 'USD | EGP | EUR | GBP' },
        totalCost:        { type: 'number',  description: 'Total cost in the given currency' },
        customerPayment:  { type: 'number',  description: 'Customer payment amount' },
        notes:            { type: 'string',  description: 'Optional notes' },
      },
      required: ['operation'],
    },
  },
];

// ── SEMANTIC SEARCH HANDLER ───────────────────────────────────────────────────
async function executeSemanticSearch(args: any) {
  console.log('🔍 Semantic search:', args.query);
  
  try {
    const filter: any = {};
    if (args.type && args.type !== 'all') {
      filter.type = args.type;
    }
    
    const results = await semanticSearch(args.query, {
      topK: Math.min(args.topK || 5, 20),
      filter,
    });
    
    console.log(`✅ Found ${results.length} semantic results`);
    
    return {
      count: results.length,
      results: results.map(r => ({
        id: r.metadata.id,
        type: r.metadata.type,
        score: Math.round(r.score * 100) / 100,
        text: r.metadata.text,
        ...(r.metadata.shipmentId && { shipmentId: r.metadata.shipmentId }),
        ...(r.metadata.status && { status: r.metadata.status }),
        ...(r.metadata.customerName && { customerName: r.metadata.customerName }),
        ...(r.metadata.origin && { origin: r.metadata.origin }),
        ...(r.metadata.destination && { destination: r.metadata.destination }),
        ...(r.metadata.invoiceNumber && { invoiceNumber: r.metadata.invoiceNumber }),
        ...(r.metadata.amount && { amount: r.metadata.amount }),
      })),
    };
  } catch (error: any) {
    console.error('❌ Semantic search failed:', error);
    return { count: 0, results: [], error: 'Search failed' };
  }
}

// ── AGGREGATION HANDLER ───────────────────────────────────────────────────────
async function executeAggregateData(args: any, companyName: string, companyId: string) {
  console.log('📊 Aggregating:', args.operation, 'on', args.collection);
  
  try {
    let Model: any;
    const baseFilter: Record<string, any> = {};
    
    switch (args.collection) {
      case 'shipments':
        Model = Shipment;
        baseFilter.companyName = companyName;
        break;
      case 'customers':
        Model = Customer;
        baseFilter.companyName = companyName;
        break;
      case 'suppliers':
        Model = Supplier;
        baseFilter.companyId = companyId;
        break;
      case 'invoices':
        Model = Invoice;
        baseFilter.companyName = companyName;
        break;
      default:
        return { error: 'Unknown collection' };
    }
    
    const filter = { ...baseFilter, ...(args.filter || {}) };
    
    switch (args.operation) {
      case 'count':
        const count = await Model.countDocuments(filter);
        console.log(`✅ Count: ${count}`);
        return { count };
        
      case 'sum':
        if (!args.field) return { error: 'Field required for sum' };
        const sumData = await Model.find(filter).lean();
        const total = sumData.reduce((acc: number, doc: any) => {
          const value = args.field.includes('.') 
            ? args.field.split('.').reduce((obj: any, key: string) => obj?.[key], doc)
            : doc[args.field];
          return acc + (parseFloat(value) || 0);
        }, 0);
        console.log(`✅ Sum of ${args.field}: ${total}`);
        return { sum: total, field: args.field, count: sumData.length };
        
      case 'average':
        if (!args.field) return { error: 'Field required for average' };
        const avgData = await Model.find(filter).lean();
        const sum = avgData.reduce((acc: number, doc: any) => {
          const value = args.field.includes('.') 
            ? args.field.split('.').reduce((obj: any, key: string) => obj?.[key], doc)
            : doc[args.field];
          return acc + (parseFloat(value) || 0);
        }, 0);
        const avg = avgData.length > 0 ? sum / avgData.length : 0;
        console.log(`✅ Average of ${args.field}: ${avg}`);
        return { average: avg, field: args.field, count: avgData.length };
        
      case 'max':
        if (!args.field) return { error: 'Field required for max' };
        const maxData = await Model.find(filter).lean();
        const maxValue = Math.max(...maxData.map((doc: any) => {
          const value = args.field.includes('.') 
            ? args.field.split('.').reduce((obj: any, key: string) => obj?.[key], doc)
            : doc[args.field];
          return parseFloat(value) || 0;
        }));
        console.log(`✅ Max ${args.field}: ${maxValue}`);
        return { max: maxValue, field: args.field };
        
      case 'min':
        if (!args.field) return { error: 'Field required for min' };
        const minData = await Model.find(filter).lean();
        const minValue = Math.min(...minData.map((doc: any) => {
          const value = args.field.includes('.') 
            ? args.field.split('.').reduce((obj: any, key: string) => obj?.[key], doc)
            : doc[args.field];
          return parseFloat(value) || 0;
        }));
        console.log(`✅ Min ${args.field}: ${minValue}`);
        return { min: minValue, field: args.field };
        
      case 'group_by':
        if (!args.groupBy) return { error: 'groupBy field required' };
        const groupData = await Model.find(filter).lean();
        const grouped: Record<string, any> = {};
        
        groupData.forEach((doc: any) => {
          const key = doc[args.groupBy] || 'Unknown';
          if (!grouped[key]) {
            grouped[key] = { count: 0, items: [] };
            if (args.field) grouped[key].sum = 0;
          }
          grouped[key].count++;
          grouped[key].items.push(doc);
          
          if (args.field) {
            const value = args.field.includes('.') 
              ? args.field.split('.').reduce((obj: any, key: string) => obj?.[key], doc)
              : doc[args.field];
            grouped[key].sum += parseFloat(value) || 0;
          }
        });
        
        const groupedArray = Object.entries(grouped).map(([key, value]: [string, any]) => ({
          [args.groupBy]: key,
          count: value.count,
          ...(args.field && { total: value.sum }),
          ...(args.field && { average: value.sum / value.count }),
        })).sort((a, b) => b.count - a.count);
        
        console.log(`✅ Grouped by ${args.groupBy}: ${groupedArray.length} groups`);
        return { groups: groupedArray, groupBy: args.groupBy };
        
      default:
        return { error: 'Unknown operation' };
    }
    
  } catch (error: any) {
    console.error('❌ Aggregation failed:', error);
    return { error: error.message };
  }
}

// ── QUERY HANDLERS (TYPESCRIPT FIXED) ─────────────────────────────────────────
async function executeQueryShipments(args: any, companyName: string) {
  const filter: Record<string, any> = { companyName };

  if (args.shipmentId)     filter.shipmentId = new RegExp(String(args.shipmentId), 'i');
  if (args.customerName)   filter.customerName = new RegExp(String(args.customerName), 'i');
  if (args.supplierName)   filter.supplierName = new RegExp(String(args.supplierName), 'i');
  if (args.trackingNumber) filter.trackingNumber = new RegExp(String(args.trackingNumber), 'i');
  if (args.origin)         filter.origin = new RegExp(String(args.origin), 'i');
  if (args.destination)    filter.destination = new RegExp(String(args.destination), 'i');
  if (args.carrier)        filter.carrier = new RegExp(String(args.carrier), 'i');
  if (args.status)         filter.status = String(args.status);

  // Cost filtering — use costBreakdown.totalLandedCostEGP (always populated, all currencies unified in EGP)
  if (args.minCost || args.maxCost) {
    filter['costBreakdown.totalLandedCostEGP'] = {};
    if (args.minCost) filter['costBreakdown.totalLandedCostEGP'].$gte = Number(args.minCost);
    if (args.maxCost) filter['costBreakdown.totalLandedCostEGP'].$lte = Number(args.maxCost);
  }

  if (args.minProfit || args.maxProfit) {
    filter.companyProfit = {};
    if (args.minProfit) filter.companyProfit.$gte = args.minProfit;
    if (args.maxProfit) filter.companyProfit.$lte = args.maxProfit;
  }

  if (args.minPayment || args.maxPayment) {
    filter.customerPayment = {};
    if (args.minPayment) filter.customerPayment.$gte = args.minPayment;
    if (args.maxPayment) filter.customerPayment.$lte = args.maxPayment;
  }

  if (args.shippingDateFrom || args.shippingDateTo) {
    filter.shippingDate = {};
    if (args.shippingDateFrom) filter.shippingDate.$gte = new Date(args.shippingDateFrom);
    if (args.shippingDateTo)   filter.shippingDate.$lte = new Date(args.shippingDateTo);
  }

  if (args.estimatedArrivalFrom || args.estimatedArrivalTo) {
    filter.estimatedArrival = {};
    if (args.estimatedArrivalFrom) filter.estimatedArrival.$gte = new Date(args.estimatedArrivalFrom);
    if (args.estimatedArrivalTo)   filter.estimatedArrival.$lte = new Date(args.estimatedArrivalTo);
  }
  
  if (args.createdFrom || args.createdTo) {
    filter.createdAt = {};
    if (args.createdFrom) filter.createdAt.$gte = new Date(args.createdFrom);
    if (args.createdTo)   filter.createdAt.$lte = new Date(args.createdTo);
  }

  const limit     = Math.min(args.limit ?? 10, 50);
  const sortField = args.sortBy ?? 'createdAt';
  const sortDir   = args.sortOrder === 'asc' ? 1 : -1;

  console.log('🔍 Query Shipments:', JSON.stringify(filter, null, 2));

  const shipments = await Shipment.find(filter as any).sort({ [sortField]: sortDir }).limit(limit).lean();

  console.log(`✅ Found ${shipments.length} shipments`);
  if (shipments.length > 0) {
    console.log('💰 Cost fields sample:', shipments.slice(0, 3).map((s: any) => ({
      id: s.shipmentId,
      totalCost: s.totalCost,
      customerPayment: s.customerPayment,
      totalLandedCost: s.costBreakdown?.totalLandedCost,
      currency: s.currency,
    })));
  }

  return {
    count: shipments.length,
    shipments: shipments.map((s: any) => ({
      _id: s._id.toString(), shipmentId: s.shipmentId, status: s.status,
      origin: s.origin, destination: s.destination, customerName: s.customerName,
      supplierName: s.supplierName, trackingNumber: s.trackingNumber, carrier: s.carrier,
      shippingDate: s.shippingDate, estimatedArrival: s.estimatedArrival,
      currency: s.currency, shippingCost: s.shippingCost,
      customerPayment: s.customerPayment, companyProfit: s.companyProfit,
      profitMargin: s.profitMargin, totalCost: s.totalCost,
      totalLandedCost: s.costBreakdown?.totalLandedCost,
      totalDuty: s.costBreakdown?.totalDuty, vat: s.costBreakdown?.vat,
      weight: s.weight, notes: s.notes, createdAt: s.createdAt,
    })),
  };
}

async function executeQueryCustomers(args: any, companyName: string) {
  const filter: Record<string, any> = { companyName };
  if (args.name)    filter.name = new RegExp(args.name, 'i');
  if (args.email)   filter.email = new RegExp(args.email, 'i');
  if (args.country) filter.country = new RegExp(args.country, 'i');

  const customers = await Customer.find(filter as any).limit(args.limit ?? 10).lean();
  return {
    count: customers.length,
    customers: customers.map((c: any) => ({
      _id: c._id.toString(), name: c.name, email: c.email,
      phone: c.phone, address: c.address, country: c.country, notes: c.notes,
    })),
  };
}

async function executeQuerySuppliers(args: any, companyId: string) {
  const filter: Record<string, any> = { companyId };
  if (args.name)          filter.name = new RegExp(args.name, 'i');
  if (args.contactPerson) filter.contactPerson = new RegExp(args.contactPerson, 'i');
  if (args.country)       filter.country = new RegExp(args.country, 'i');
  if (args.paymentTerms)  filter.paymentTerms = args.paymentTerms;
  if (args.isActive !== undefined) filter.isActive = args.isActive;

  const suppliers = await Supplier.find(filter as any).limit(args.limit ?? 10).lean();
  return {
    count: suppliers.length,
    suppliers: suppliers.map((s: any) => ({
      _id: s._id.toString(), name: s.name, contactPerson: s.contactPerson,
      email: s.email, phone: s.phone, country: s.country,
      paymentTerms: s.paymentTerms, rating: s.rating, isActive: s.isActive, notes: s.notes,
    })),
  };
}

async function executeQueryInvoices(args: any, companyName: string) {
  const filter: Record<string, any> = { companyName };
  if (args.invoiceNumber) filter.invoiceNumber = new RegExp(args.invoiceNumber, 'i');
  if (args.customerName)  filter.customerName = new RegExp(args.customerName, 'i');
  if (args.status)        filter.status = args.status;
  
  if (args.minAmount || args.maxAmount) {
    filter.totalAmount = {};
    if (args.minAmount) filter.totalAmount.$gte = args.minAmount;
    if (args.maxAmount) filter.totalAmount.$lte = args.maxAmount;
  }
  
  if (args.dueDateFrom || args.dueDateTo) {
    filter.dueDate = {};
    if (args.dueDateFrom) filter.dueDate.$gte = new Date(args.dueDateFrom);
    if (args.dueDateTo)   filter.dueDate.$lte = new Date(args.dueDateTo);
  }

  const sortField = args.sortBy ?? 'issueDate';
  const sortDir   = args.sortOrder === 'asc' ? 1 : -1;

  const invoices = await Invoice.find(filter as any).sort({ [sortField]: sortDir }).limit(args.limit ?? 10).lean();
  return {
    count: invoices.length,
    invoices: invoices.map((inv: any) => ({
      id: inv._id.toString(), invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName, customerEmail: inv.customerEmail,
      status: inv.status, totalAmount: inv.totalAmount,
      totalAmountEGP: inv.totalAmountEGP, currency: inv.currency,
      issueDate: inv.issueDate, dueDate: inv.dueDate,
    })),
  };
}

// ── DB WRITE OPERATIONS HANDLER ───────────────────────────────────────────────
async function executeDbOperation(args: any, companyName: string, companyId: string, userId: string) {
  const { operation } = args;
  console.log('✏️ DB operation:', operation, args);

  // ── update_shipment ────────────────────────────────────────────────────────
  if (operation === 'update_shipment') {
    if (!args.shipmentId) return { error: 'shipmentId is required for update_shipment' };
    if (!args.updates || Object.keys(args.updates).length === 0) return { error: 'No updates provided' };

    const shipment = await Shipment.findOne({
      companyName,
      shipmentId: new RegExp(String(args.shipmentId), 'i'),
    });
    if (!shipment) return { error: `Shipment ${args.shipmentId} not found` };

    // Append to statusHistory if status is changing
    if (args.updates.status && args.updates.status !== shipment.status) {
      shipment.statusHistory = shipment.statusHistory || [];
      shipment.statusHistory.push({
        status: args.updates.status,
        changedBy: new mongoose.Types.ObjectId(userId) as any,
        changedAt: new Date(),
        notes: args.updates.notes || `Status updated by AI assistant`,
      });
    }

    Object.assign(shipment, args.updates);
    await shipment.save();

    console.log(`✅ Updated shipment ${shipment.shipmentId}`);
    return {
      success: true,
      shipmentId: shipment.shipmentId,
      updated: args.updates,
      message: `Shipment ${shipment.shipmentId} updated successfully`,
    };
  }

  // ── generate_invoice ───────────────────────────────────────────────────────
  if (operation === 'generate_invoice') {
    if (!args.shipmentId) return { error: 'shipmentId is required for generate_invoice' };

    const shipment = await Shipment.findOne({
      companyName,
      shipmentId: new RegExp(String(args.shipmentId), 'i'),
    }).lean() as any;
    if (!shipment) return { error: `Shipment ${args.shipmentId} not found` };

    // Check if invoice already exists
    const existing = await Invoice.findOne({ shipmentId: shipment._id, companyName });
    if (existing) {
      return {
        success: false,
        alreadyExists: true,
        invoiceNumber: existing.invoiceNumber,
        message: `Invoice ${existing.invoiceNumber} already exists for this shipment`,
      };
    }

    const invoiceNumber = await (Invoice as any).generateInvoiceNumber();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const lineItems = [
      {
        description: `Shipment ${shipment.shipmentId} — ${shipment.origin} → ${shipment.destination}`,
        quantity: 1,
        unitPrice: shipment.customerPayment || shipment.totalCost || 0,
        total: shipment.customerPayment || shipment.totalCost || 0,
        category: 'shipping',
      },
    ];

    const invoice = new Invoice({
      invoiceNumber,
      shipmentId: shipment._id,
      customerId: shipment.customerId,
      customerName: shipment.customerName,
      customerEmail: shipment.customerEmail,
      companyId,
      companyName,
      generatedBy: userId ? new mongoose.Types.ObjectId(userId) as any : undefined,
      status: 'unpaid',
      lineItems,
      totalAmount: shipment.customerPayment || shipment.totalCost || 0,
      totalAmountEGP: shipment.costBreakdown?.totalLandedCostEGP || 0,
      currency: shipment.currency || 'USD',
      issueDate: new Date(),
      dueDate,
      costBreakdown: shipment.costBreakdown,
    });

    await invoice.save();
    console.log(`✅ Generated invoice ${invoiceNumber} for ${shipment.shipmentId}`);
    return {
      success: true,
      invoiceNumber,
      customerName: shipment.customerName,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      message: `Invoice ${invoiceNumber} generated for ${shipment.customerName}`,
    };
  }

  // ── delete_overdue_shipments ───────────────────────────────────────────────
  if (operation === 'delete_overdue_shipments') {
    const days = args.olderThanDays ?? 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filter: Record<string, any> = {
      companyName,
      createdAt: { $lt: cutoff },
    };
    if (args.statusFilter) filter.status = args.statusFilter;

    // Safety: count first (dry-run already done by AI via aggregate_data, but double-check)
    const count = await Shipment.countDocuments(filter);
    if (count === 0) {
      return { success: true, deleted: 0, message: 'No matching shipments found to delete' };
    }

    const result = await Shipment.deleteMany(filter);
    console.log(`✅ Deleted ${result.deletedCount} shipments older than ${days} days`);
    return {
      success: true,
      deleted: result.deletedCount,
      filter: { olderThanDays: days, status: args.statusFilter || 'any' },
      message: `Deleted ${result.deletedCount} shipment${result.deletedCount !== 1 ? 's' : ''} older than ${days} days`,
    };
  }

  // ── bulk_update_shipments ──────────────────────────────────────────────────
  if (operation === 'bulk_update_shipments') {
    if (!args.updates || Object.keys(args.updates).length === 0) {
      return { error: 'No updates provided for bulk_update_shipments' };
    }

    const filter: Record<string, any> = { companyName };

    // At least one filter is required — safety rule
    let hasFilter = false;

    if (args.status)                  { filter.status = args.status; hasFilter = true; }
    if (args.origin)                  { filter.origin = new RegExp(String(args.origin), 'i'); hasFilter = true; }
    if (args.destination)             { filter.destination = new RegExp(String(args.destination), 'i'); hasFilter = true; }
    if (args.carrier)                 { filter.carrier = new RegExp(String(args.carrier), 'i'); hasFilter = true; }
    if (args.customerName)            { filter.customerName = new RegExp(String(args.customerName), 'i'); hasFilter = true; }

    if (args.estimatedArrivalFrom || args.estimatedArrivalTo) {
      filter.estimatedArrival = {};
      if (args.estimatedArrivalFrom) filter.estimatedArrival.$gte = new Date(args.estimatedArrivalFrom);
      if (args.estimatedArrivalTo)   filter.estimatedArrival.$lte = new Date(args.estimatedArrivalTo);
      hasFilter = true;
    }

    if (args.estimatedArrivalNotFrom || args.estimatedArrivalNotTo) {
      // "NOT in 2027" → estimatedArrival < 2027-01-01 OR estimatedArrival > 2027-12-31
      // Expressed as: NOT ($gte notFrom AND $lte notTo) → use $not with $gte/$lte
      filter.estimatedArrival = {
        $not: {
          $gte: new Date(args.estimatedArrivalNotFrom || '2027-01-01'),
          $lte: new Date(args.estimatedArrivalNotTo   || '2027-12-31'),
        },
      };
      hasFilter = true;
    }

    if (args.shippingDateFrom || args.shippingDateTo) {
      filter.shippingDate = {};
      if (args.shippingDateFrom) filter.shippingDate.$gte = new Date(args.shippingDateFrom);
      if (args.shippingDateTo)   filter.shippingDate.$lte = new Date(args.shippingDateTo);
      hasFilter = true;
    }

    if (!hasFilter) {
      return { error: 'bulk_update_shipments requires at least one filter. Refusing to update all shipments blindly.' };
    }

    // Dry-run: count affected records first
    const count = await Shipment.countDocuments(filter);
    if (count === 0) {
      return { success: true, updated: 0, message: 'No shipments matched the filter — nothing updated.' };
    }

    // Build the $set payload
    const setPayload: Record<string, any> = { ...args.updates };

    // If status is being set, we can't push statusHistory in a bulk op via updateMany,
    // so we handle it as a two-step: updateMany for the fields, then bulkWrite for history
    const newStatus = args.updates.status;

    const result = await Shipment.updateMany(filter, { $set: setPayload });

    // Append statusHistory entries if status changed
    if (newStatus && userId) {
      await Shipment.updateMany(
        { ...filter, ...setPayload },   // re-filter on already-updated docs
        {
          $push: {
            statusHistory: {
              status: newStatus,
              changedBy: new mongoose.Types.ObjectId(userId) as any,
              changedAt: new Date(),
              notes: `Bulk status update by AI assistant`,
            },
          },
        }
      );
    }

    console.log(`✅ Bulk updated ${result.modifiedCount} shipments`);
    return {
      success: true,
      matched: result.matchedCount,
      updated: result.modifiedCount,
      updates: args.updates,
      message: `Updated ${result.modifiedCount} shipment${result.modifiedCount !== 1 ? 's' : ''} successfully`,
    };
  }

  // ── create_shipment ────────────────────────────────────────────────────────
  if (operation === 'create_shipment') {
    if (!args.origin || !args.destination) {
      return { error: 'origin and destination are required to create a shipment' };
    }

    // Verify customer exists if provided
    if (args.customerName) {
      const customer = await Customer.findOne({
        companyName,
        name: new RegExp(String(args.customerName), 'i'),
      });
      if (!customer) {
        return {
          error: `Customer "${args.customerName}" not found. Please create the customer first or check the spelling.`,
        };
      }
    }

    // Verify supplier exists if provided
    if (args.supplierName) {
      const supplier = await Supplier.findOne({
        companyId,
        name: new RegExp(String(args.supplierName), 'i'),
      });
      if (!supplier) {
        return {
          error: `Supplier "${args.supplierName}" not found. Please create the supplier first or check the spelling.`,
        };
      }
    }

    // Generate unique shipment ID
    const count = await Shipment.countDocuments({ companyName });
    const shipmentId = `SHP-${String(count + 1).padStart(4, '0')}`;

    const shipment = new Shipment({
      companyName,
      companyId,
      shipmentId,
      origin: args.origin,
      destination: args.destination,
      customerName: args.customerName || '',
      supplierName: args.supplierName || '',
      carrier: args.carrier || 'Other',
      shippingDate: args.shippingDate ? new Date(args.shippingDate) : new Date(),
      estimatedArrival: args.estimatedArrival ? new Date(args.estimatedArrival) : (() => {
        const d = new Date(); d.setDate(d.getDate() + 14); return d;
      })(),
      status: 'pending',
      weight: args.weight || 0,
      currency: args.currency || 'USD',
      totalCost: args.totalCost || 0,
      customerPayment: args.customerPayment || 0,
      notes: args.notes || '',
      createdBy: userId ? new mongoose.Types.ObjectId(userId) as any : undefined,
      statusHistory: [{
        status: 'pending',
        changedBy: userId ? new mongoose.Types.ObjectId(userId) as any : undefined,
        changedAt: new Date(),
        notes: 'Created by AI assistant',
      }],
    });

    await shipment.save();
    console.log(`✅ Created shipment ${shipmentId}`);
    return {
      success: true,
      shipmentId,
      origin: shipment.origin,
      destination: shipment.destination,
      customerName: shipment.customerName,
      status: 'pending',
      message: `Shipment ${shipmentId} created successfully`,
    };
  }

  return { error: `Unknown operation: ${operation}` };
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();
    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const token = extractToken(request);
    let companyName = '';
    let companyId   = '';
    let userId      = '';
    if (token) {
      try {
        const user = verifyToken(token);
        companyName = user?.companyName ?? '';
        companyId   = user?.companyId   ?? '';
        userId      = user?.userId ?? '';
      } catch {}
    }

    await dbConnect();

    const contents: any[] = [
      ...history.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.text }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    let finalText        = '';
    let navigateTo: string | null = null;
    let allShipments:  any[] = [];
    let allCustomers:  any[] = [];
    let allSuppliers:  any[] = [];
    let allInvoices:   any[] = [];
    let semanticResults: any[] = [];
    let dbOperationResults: any[] = [];

    // Agentic loop
    for (let i = 0; i < 5; i++) {
      const response = await getAI().models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: SCHEMA_CONTEXT,
          tools: [{ functionDeclarations }],
        },
      });

      const text = response.text;
      if (text) finalText += text;

      const functionCalls = response.functionCalls;
      if (!functionCalls || functionCalls.length === 0) break;

      contents.push({
        role: 'model',
        parts: functionCalls.map((fc: any) => ({ functionCall: fc })),
      });

      const functionResponses: any[] = [];

      for (const fc of functionCalls) {
        const { name, args } = fc;
        console.log('🔧 Tool call:', name, args);
        let result: any;

        try {
          if (name === 'semantic_search') {
            result = await executeSemanticSearch(args);
            if (result.results?.length) semanticResults.push(...result.results);
          } else if (name === 'aggregate_data') {
            result = await executeAggregateData(args, companyName, companyId);
          } else if (name === 'query_shipments') {
            result = await executeQueryShipments(args, companyName);
            if (result.shipments?.length) allShipments.push(...result.shipments);
          } else if (name === 'query_customers') {
            result = await executeQueryCustomers(args, companyName);
            if (result.customers?.length) allCustomers.push(...result.customers);
          } else if (name === 'query_suppliers') {
            result = await executeQuerySuppliers(args, companyId);
            if (result.suppliers?.length) allSuppliers.push(...result.suppliers);
          } else if (name === 'query_invoices') {
            result = await executeQueryInvoices(args, companyName);
            if (result.invoices?.length) allInvoices.push(...result.invoices);
          } else if (name === 'navigate') {
            let route = (args?.route as string) ?? null;
            const entityType = args?.entityType as string;
            const entityId = args?.entityId as string;
            
            // Build dynamic route if entity info provided
            if (entityType && entityId) {
              route = `/${entityType}s/${entityId}`;
            }
            
            navigateTo = route;
            result = { success: true, route: navigateTo };
          } else if (name === 'execute_db_operation') {
            result = await executeDbOperation(args, companyName, companyId, userId);
            dbOperationResults.push(result);
          } else {
            result = { error: 'Unknown tool' };
          }
        } catch (err: any) {
          console.error('❌ Tool execution error:', err);
          result = { error: err.message };
        }

        functionResponses.push({
          functionResponse: { name, response: result },
        });
      }

      contents.push({ role: 'user', parts: functionResponses });
    }

    // Determine action — prefer 'db_operation' if writes occurred, otherwise
    // use 'data' when ANY entity type was fetched (not just the first one found)
    const hasData = allShipments.length || allCustomers.length || allSuppliers.length || allInvoices.length;
    let action = 'answer';
    if (navigateTo)                  action = 'navigate';
    else if (dbOperationResults.length) action = 'db_operation';
    else if (hasData)                action = 'fetch_data';
    else if (semanticResults.length) action = 'semantic_results';

    return NextResponse.json({
      action,
      message:   finalText || 'Done.',
      route:     navigateTo,
      shipments: allShipments.length ? allShipments : undefined,
      customers: allCustomers.length ? allCustomers : undefined,
      suppliers: allSuppliers.length ? allSuppliers : undefined,
      invoices:  allInvoices.length  ? allInvoices  : undefined,
      semanticResults: semanticResults.length ? semanticResults : undefined,
      dbOperationResults: dbOperationResults.length ? dbOperationResults : undefined,
      confidence: 1.0,
    });

  } catch (error: any) {
    console.error('[AI Command Error]', error);
    return NextResponse.json({
      action: 'unknown',
      message: 'Something went wrong. Please try again.',
      confidence: 0,
    }, { status: 500 });
  }
}