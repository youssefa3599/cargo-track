// src/app/api/shipments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Shipment from '@/models/Shipment';
import Product from '@/models/Product';
import mongoose from 'mongoose';
import User from '@/models/User';
import { calculateShipmentCosts } from '@/lib/calculations';
import type { ICostBreakdown } from '@/models/Shipment';

// Ensure User model is registered for populate()
void User;

// ── GET /api/shipments ────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });

    const user = verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page   = parseInt(searchParams.get('page')  || '1');
    const limit  = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    await dbConnect();

    const query: any = { companyName: user.companyName };
    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { shipmentId:   { $regex: search, $options: 'i' } },
        { origin:       { $regex: search, $options: 'i' } },
        { destination:  { $regex: search, $options: 'i' } },
      ];
    }

    const [shipments, total] = await Promise.all([
      Shipment.find(query)
        .populate('products.productId', 'name hsCode unitPrice')
        .populate('createdBy', 'email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Shipment.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: shipments,
      shipments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });

  } catch (error: any) {
    console.error('[GET /api/shipments]', error.message);
    return NextResponse.json({ error: 'Failed to fetch shipments', details: error.message }, { status: 500 });
  }
}

// ── POST /api/shipments ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization'));
    if (!token) return NextResponse.json({ error: 'Authorization token required' }, { status: 401 });

    const user = verifyToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

    const body = await request.json();
    const {
      origin, destination, shippingDate, estimatedArrival,
      products, customerId, supplierId, carrier, trackingNumber,
      shippingCost, exchangeRate, currency, insurancePercentage,
      vatPercentage, weight, dimensions, notes, useWeightBased,
    } = body;

    if (!origin || !destination || !shippingDate || !estimatedArrival) {
      return NextResponse.json({ error: 'Missing required fields: origin, destination, shippingDate, estimatedArrival' }, { status: 400 });
    }
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'At least one product is required' }, { status: 400 });
    }
    if (shippingCost === undefined || shippingCost === null || shippingCost < 0) {
      return NextResponse.json({ error: useWeightBased ? 'Valid weight is required' : 'Valid shipping cost is required' }, { status: 400 });
    }
    if (!exchangeRate || exchangeRate <= 0) {
      return NextResponse.json({ error: 'Valid exchange rate is required' }, { status: 400 });
    }

    await dbConnect();

    const productIds = products.map((p: any) => p.productId);
    const validProducts = await Product.find({ _id: { $in: productIds }, companyName: user.companyName }).lean();

    if (validProducts.length !== productIds.length) {
      return NextResponse.json({ error: 'One or more products not found' }, { status: 400 });
    }

    const productsForCalc = products.map((p: any) => {
      const details = validProducts.find(vp => String(vp._id) === String(p.productId));
      if (!details) throw new Error(`Product ${p.productId} not found`);
      return {
        productId:      p.productId,
        productName:    details.name,
        hsCode:         details.hsCode,
        quantity:       p.quantity,
        unitPrice:      details.unitPrice,
        dutyPercentage: details.dutyPercentage || 0,
      };
    });

    const costBreakdown: ICostBreakdown = calculateShipmentCosts(
      productsForCalc, shippingCost, exchangeRate,
      insurancePercentage || 2, vatPercentage || 14,
      useWeightBased || false, dimensions || null
    );

    const shipmentId = `SHP-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const shipment = new Shipment({
      companyName:      user.companyName,
      companyId:        user.companyId,
      shipmentId,
      origin,
      destination,
      shippingDate:     new Date(shippingDate),
      estimatedArrival: new Date(estimatedArrival),
      products: products.map((p: any) => ({
        productId: new mongoose.Types.ObjectId(p.productId),
        quantity:  p.quantity,
      })),
      customerId:    customerId  ? new mongoose.Types.ObjectId(customerId)  : undefined,
      supplierId:    supplierId  ? new mongoose.Types.ObjectId(supplierId)  : undefined,
      carrier:       carrier     || undefined,
      trackingNumber: trackingNumber || undefined,
      status:        'pending',
      currency:      currency    || 'USD',
      exchangeRate,
      shippingCost:  costBreakdown.shippingCost,
      costBreakdown,
      weight:        weight || (useWeightBased ? shippingCost : undefined),
      dimensions:    dimensions  || undefined,
      notes:         notes       || undefined,
      createdBy:     new mongoose.Types.ObjectId(user.userId),
      statusHistory: [{
        status:    'pending',
        changedBy: new mongoose.Types.ObjectId(user.userId),
        changedAt: new Date(),
        notes:     'Shipment created',
      }],
    });

    await shipment.save();

    const populated = await Shipment.findById(shipment._id)
      .populate('products.productId', 'name hsCode unitPrice dutyPercentage')
      .populate('createdBy', 'email role')
      .populate('statusHistory.changedBy', 'email role')
      .lean();

    return NextResponse.json({ success: true, message: 'Shipment created successfully', data: populated, shipment: populated }, { status: 201 });

  } catch (error: any) {
    console.error('[POST /api/shipments]', error.message);
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: 'Validation failed', details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create shipment', details: error.message }, { status: 500 });
  }
}