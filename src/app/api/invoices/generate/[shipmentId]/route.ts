// src/app/api/invoices/generate/[shipmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Shipment from '@/models/Shipment';
import Invoice, { IInvoiceLineItem } from '@/models/Invoice';
import Customer from '@/models/Customer';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ shipmentId: string }> }
) {
  try {
    const { shipmentId } = await context.params;

    // Auth — check both cookie and Authorization header
    const token =
      request.cookies.get('token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      null;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    if (!mongoose.Types.ObjectId.isValid(shipmentId)) {
      return NextResponse.json({ error: 'Invalid shipment ID' }, { status: 400 });
    }

    await dbConnect();

    const [shipment, existingInvoice] = await Promise.all([
      Shipment.findOne({ _id: shipmentId, companyName: decoded.companyName })
        .populate('products.productId'),
      Invoice.findOne({ shipmentId }),
    ]);

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found or access denied' }, { status: 404 });
    }

    if (existingInvoice) {
      return NextResponse.json(
        {
          error: 'Invoice already exists for this shipment',
          existingInvoice: {
            id: existingInvoice._id,
            invoiceNumber: existingInvoice.invoiceNumber,
            totalAmount: existingInvoice.totalAmount,
            status: existingInvoice.status,
          },
        },
        { status: 409 }
      );
    }

    const costBreakdown = shipment.costBreakdown;
    if (!costBreakdown) {
      return NextResponse.json({ error: 'Shipment is missing cost breakdown' }, { status: 400 });
    }

    // Resolve customer details
    let customerName = shipment.customerName || 'Unknown Customer';
    let customerEmail = '';
    if (shipment.customerId) {
      // ✅ FIXED: Removed .lean() to get proper Mongoose document typing
      const customer = await Customer.findById(shipment.customerId).select('name email');
      if (customer) {
        customerName = customer.name;
        customerEmail = customer.email || '';
      }
    }

    // Build line items
    const lineItems: IInvoiceLineItem[] = [
      { description: 'Products',            quantity: costBreakdown.totalQuantity,              unitPrice: costBreakdown.productCost / (costBreakdown.totalQuantity || 1), total: costBreakdown.productCost,   category: 'product'  },
      { description: 'Shipping & Freight',  quantity: 1,                                        unitPrice: costBreakdown.shippingCost,                                    total: costBreakdown.shippingCost,  category: 'shipping' },
      { description: `Insurance (${costBreakdown.insurancePercentage}%)`, quantity: 1,          unitPrice: costBreakdown.insuranceCost,                                   total: costBreakdown.insuranceCost, category: 'insurance'},
      { description: 'Customs Duties',      quantity: 1,                                        unitPrice: costBreakdown.totalDuty,                                       total: costBreakdown.totalDuty,     category: 'duty'     },
      { description: `VAT (${costBreakdown.vatPercentage}%)`, quantity: 1,                      unitPrice: costBreakdown.vat,                                             total: costBreakdown.vat,           category: 'tax'      },
    ];

    if (costBreakdown.products?.length) {
      for (const prod of costBreakdown.products) {
        lineItems.push({
          description:    `  └─ ${prod.productName} (HS: ${prod.hsCode})`,
          quantity:       prod.quantity,
          unitPrice:      prod.unitPrice,
          total:          prod.totalProductCost,
          category:       'product-detail',
          duty:           prod.dutyAmount,
          dutyPercentage: prod.dutyPercentage,
        });
      }
    }

    const invoiceCount  = await Invoice.countDocuments();
    const invoiceNumber = `INV-${Date.now()}-${invoiceCount + 1}`;

    const newInvoice = await Invoice.create({
      invoiceNumber,
      shipmentId,
      customerId:    shipment.customerId,
      customerName,
      customerEmail,
      companyId:     decoded.companyId,
      companyName:   decoded.companyName,
      generatedBy:   decoded.userId,
      generatedAt:   new Date(),
      dueDate:       new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal:      costBreakdown.productCost,
      taxRate:       costBreakdown.vatPercentage,
      taxAmount:     costBreakdown.vat,
      shippingCost:  costBreakdown.shippingCost,
      insuranceCost: costBreakdown.insuranceCost,
      dutyCost:      costBreakdown.totalDuty,
      discount:      0,
      totalAmount:   costBreakdown.totalLandedCost,
      totalAmountEGP: costBreakdown.totalLandedCostEGP,
      currency:      shipment.currency || 'USD',
      exchangeRate:  costBreakdown.exchangeRate,
      status:        'draft',
      lineItems,
      costBreakdown: {
        productCost:       costBreakdown.productCost,
        shippingCost:      costBreakdown.shippingCost,
        insuranceCost:     costBreakdown.insuranceCost,
        insurancePercentage: costBreakdown.insurancePercentage,
        totalDuty:         costBreakdown.totalDuty,
        vat:               costBreakdown.vat,
        vatPercentage:     costBreakdown.vatPercentage,
        totalLandedCost:   costBreakdown.totalLandedCost,
        totalLandedCostEGP: costBreakdown.totalLandedCostEGP,
        exchangeRate:      costBreakdown.exchangeRate,
      },
      pdfPath: 'available',
      terms: 'Payment due within 30 days',
      notes: `Exchange Rate: ${costBreakdown.exchangeRate} ${shipment.currency}/EGP`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Invoice generated successfully',
        invoice: {
          id: newInvoice._id,
          invoiceNumber: newInvoice.invoiceNumber,
          totalAmount:   newInvoice.totalAmount,
          totalAmountEGP: newInvoice.totalAmountEGP,
          status:        newInvoice.status,
          dueDate:       newInvoice.dueDate,
          customerName:  newInvoice.customerName,
          pdfAvailable:  true,
          createdAt:     newInvoice.createdAt,
        },
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('[POST /api/invoices/generate]', error.message);
    return NextResponse.json({ error: 'Invoice generation failed', message: error.message }, { status: 500 });
  }
}