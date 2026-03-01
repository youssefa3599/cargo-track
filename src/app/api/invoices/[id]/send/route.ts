// src/app/api/invoices/[id]/send/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose'; // ✅ ADDED THIS IMPORT
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import { verifyToken } from '@/lib/auth';
import { AppJWTPayload } from '@/types/jwt';

/**
 * POST /api/invoices/[id]/send
 * Send invoice to customer (HYBRID APPROACH - Draft → Sent)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {

  try {
    const token = request.cookies.get('token')?.value;

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

    const { id } = params;

    await dbConnect();

    // Fetch invoice
    const invoice = await Invoice.findOne({
      _id: id,
      companyId: decoded.companyId
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }


    // Can only send draft invoices
    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'Invoice has already been sent or is not in draft status' },
        { status: 400 }
      );
    }


    // Update invoice status to 'sent'
    invoice.status = 'sent';
    invoice.sentDate = new Date();
    invoice.lastModifiedBy = new Types.ObjectId(decoded.userId); // ✅ FIXED THIS LINE

    await invoice.save();


    // TODO: In production, you would:
    // 1. Generate PDF
    // 2. Send email to customer with PDF attachment
    // 3. Log the email send event
    // 4. Update tracking/notifications


    // In a real system, you would send an actual email here:
    // await sendInvoiceEmail({
    //   to: invoice.customerEmail,
    //   invoiceNumber: invoice.invoiceNumber,
    //   amount: invoice.totalAmount,
    //   currency: invoice.currency,
    //   dueDate: invoice.dueDate,
    //   pdfUrl: `${process.env.BASE_URL}/api/invoices/${invoice._id}/download`
    // });

    return NextResponse.json({
      success: true,
      message: `Invoice sent successfully to ${invoice.customerEmail}`,
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        sentDate: invoice.sentDate,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        totalAmount: invoice.totalAmount,
        currency: invoice.currency
      }
    });

  } catch (error: any) {
    console.error('\n❌ ========================================');
    console.error('❌ ERROR SENDING INVOICE');
    console.error('❌ ========================================');
    console.error(error);
    
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    );
  }
}