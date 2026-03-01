// src/app/api/invoices/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import { verifyToken } from '@/lib/auth';
import { AppJWTPayload } from '@/types/jwt';

/**
 * GET /api/invoices
 * Get all invoices with optional filters
 * Query params: status, shipmentId, search, dateFrom, dateTo
 */
export async function GET(request: NextRequest) {
  try {
    const token =
      request.cookies.get('token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      null;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token) as AppJWTPayload | null;
    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const shipmentId = searchParams.get('shipmentId');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');


    // Build query - Use companyName instead of companyId
    const query: any = { companyName: decoded.companyName };

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by shipment ID
    if (shipmentId) {
      query.shipmentId = shipmentId;
    }

    // Search filter
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } }
      ];
    }

    // Date filters
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .lean();


    // Transform data for frontend with all required fields
    const transformedInvoices = invoices.map(invoice => ({
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      shipmentId: invoice.shipmentId?.toString(),
      customerId: invoice.customerId?.toString(),
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail || '',
      
      // Financial details
      subtotal: invoice.subtotal,
      totalAmount: invoice.totalAmount,
      totalAmountEGP: invoice.totalAmountEGP,
      taxAmount: invoice.taxAmount,
      shippingCost: invoice.shippingCost,
      insuranceCost: invoice.insuranceCost,
      dutyCost: invoice.dutyCost,
      discount: invoice.discount || 0,
      
      currency: invoice.currency,
      exchangeRate: invoice.exchangeRate,
      status: invoice.status,
      
      // Dates
      issueDate: invoice.createdAt || invoice.generatedAt,
      dueDate: invoice.dueDate,
      sentDate: invoice.sentDate,
      paidDate: invoice.paidDate,
      generatedAt: invoice.generatedAt,
      
      // Line items
      items: invoice.lineItems?.length || 0,
      lineItems: invoice.lineItems,
      
      // Cost breakdown
      costBreakdown: invoice.costBreakdown,
      
      // Additional info
      notes: invoice.notes,
      terms: invoice.terms,
      pdfPath: invoice.pdfPath,
      pdfAvailable: !!invoice.pdfPath,
      
      // Timestamps
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt
    }));

    return NextResponse.json({
      success: true,
      invoices: transformedInvoices,
      count: transformedInvoices.length
    });

  } catch (error: any) {
    console.error('❌ Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices', message: error.message },
      { status: 500 }
    );
  }
}