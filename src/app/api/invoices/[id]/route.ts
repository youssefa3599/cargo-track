// src/app/api/invoices/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import { verifyToken } from '@/lib/auth';
import { AppJWTPayload } from '@/types/jwt';
import mongoose from 'mongoose'; // ✅ ADDED

/**
 * GET /api/invoices/[id]
 * Fetch single invoice details
 */
export async function GET(
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


    return NextResponse.json({
      success: true,
      invoice
    });

  } catch (error: any) {
    console.error('❌ Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invoices/[id]
 * Delete an invoice (only draft invoices can be deleted)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    await dbConnect();

    const invoice = await Invoice.findOne({
      _id: id,
      companyName: decoded.companyName,
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    await Invoice.deleteOne({ _id: id });

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully',
    });

  } catch (error: any) {
    console.error('❌ Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/invoices/[id]
 * Update invoice (edit discount, notes, etc.)
 */
export async function PATCH(
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
    const body = await request.json();


    await dbConnect();

    // Fetch current invoice
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

    // Only allow editing draft invoices
    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: 'Can only edit draft invoices' },
        { status: 400 }
      );
    }


    // Update allowed fields
    if (body.discount !== undefined) {
      invoice.discount = body.discount;
    }
    if (body.notes !== undefined) {
      invoice.notes = body.notes;
    }

    // Recalculate total amount
    invoice.totalAmount = invoice.subtotal + invoice.taxAmount - invoice.discount;

    // ✅ FIXED: Convert string userId to ObjectId
    invoice.lastModifiedBy = new mongoose.Types.ObjectId(decoded.userId);
    await invoice.save();


    return NextResponse.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice
    });

  } catch (error: any) {
    console.error('❌ Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}