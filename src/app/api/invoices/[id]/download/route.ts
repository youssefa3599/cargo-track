// src/app/api/invoices/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import { generateInvoicePDF } from '@/lib/pdfGenerator';
import { Types } from 'mongoose';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  
  try {
    // Await params (Next.js 15 compatibility)
    const params = await context.params;
    const invoiceId = params.id;
    

    // Authenticate user
    
    // Get token from cookies
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }


    // Validate invoice ID format
    if (!Types.ObjectId.isValid(invoiceId)) {
      return NextResponse.json(
        { error: 'Invalid invoice ID format' },
        { status: 400 }
      );
    }


    // Connect to database
    await dbConnect();

    // Fetch invoice and verify ownership
    
    const invoice = await Invoice.findOne({
      _id: invoiceId,
      companyId: decoded.companyId
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or access denied' },
        { status: 404 }
      );
    }


    // Generate PDF on-the-fly
    
    const pdfData = {
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail || '',
      companyName: invoice.companyName,
      generatedAt: invoice.generatedAt || invoice.createdAt,
      dueDate: invoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lineItems: invoice.lineItems || [],
      subtotal: invoice.subtotal || 0,
      taxAmount: invoice.taxAmount || 0,
      shippingCost: invoice.shippingCost || 0,
      discount: invoice.discount || 0,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency || 'USD',
      terms: invoice.terms || 'Payment due within 30 days'
    };


    const pdfBuffer = await generateInvoicePDF(pdfData);


    // Return PDF as download
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('\n❌❌❌ DOWNLOAD FAILED ❌❌❌');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        message: error?.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error?.stack,
          type: error?.constructor?.name
        } : undefined
      },
      { status: 500 }
    );
  }
}